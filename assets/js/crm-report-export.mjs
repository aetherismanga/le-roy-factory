import { buildReportExport, reportPeriodLabel } from './crm-report-export-core.mjs?v=20261110-export1';
import { createReportPDF } from './crm-report-pdf.mjs?v=20261110-export1';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function initReportExport({ getRows, getFilters, auth, getAgentProfile }) {
  const $ = id => document.getElementById(id);
  const dialog = $('cr-export-dialog'), status = $('cr-export-status'), form = $('cr-export-mail');
  let prepared = null, sending = false, lastFocus = null;
  function close() { if (sending) return; dialog.close(); prepared = null; lastFocus?.focus(); }
  $('cr-export-close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
  dialog.addEventListener('close', () => { if (!sending) prepared = null; });
  $('cr-export-open').addEventListener('click', () => {
    try {
      if (!getAgentProfile()) throw new Error('Reconnectez-vous au CRM pour préparer un export.');
      const model = buildReportExport(getRows(), getFilters());
      const pdf = createReportPDF(model);
      prepared = { model, pdf };
      lastFocus = document.activeElement;
      $('cr-export-summary').textContent = `${model.filters.usine || 'Toutes les usines'} · ${reportPeriodLabel(model.filters)} · ${model.clients.length} client(s) · ${model.count} compte(s)-rendu(s)`;
      $('cr-export-filename').textContent = model.filename;
      $('cr-export-clients').replaceChildren(...model.clients.map(client => {
        const li = document.createElement('li');
        li.textContent = `${client.societe} — ${[client.codePostal, client.ville].filter(Boolean).join(' ')} — ${client.reports.length} compte(s)-rendu(s)`;
        return li;
      }));
      if (model.campaigns.length) {
        const li = document.createElement('li'); li.textContent = `${model.campaigns.length} action(s) générale(s) / campagne(s)`; $('cr-export-clients').append(li);
      }
      form.reset();
      $('cr-export-subject').value = `Comptes-rendus ${model.filters.usine || 'toutes usines'} — ${reportPeriodLabel(model.filters)}`;
      $('cr-export-message').value = `Bonjour,\n\nVous trouverez en pièce jointe le récapitulatif et les comptes rendus ${model.filters.usine ? `concernant ${model.filters.usine} ` : ''}pour la période sélectionnée.\n\nBien cordialement,\n${getAgentProfile().name}\nLE ROY FACTORY`;
      $('cr-export-sender').textContent = getAgentProfile().email;
      status.textContent = '';
      dialog.showModal();
    } catch (error) { $('cr-export-feedback').textContent = error.message; }
  });
  $('cr-export-download').addEventListener('click', () => {
    if (!prepared) return;
    try { prepared.pdf.save(prepared.model.filename); status.textContent = 'PDF téléchargé.'; }
    catch (error) { status.textContent = error.message; }
  });
  function openPDF(print = false) {
    if (!prepared) return;
    const win = window.open('', '_blank');
    if (!win) { status.textContent = 'Autorisez l’ouverture du PDF ou utilisez Télécharger le PDF.'; return; }
    try {
      // Generate a separate instance so autoPrint never affects the mailed PDF.
      const pdf = print ? createReportPDF(prepared.model) : prepared.pdf;
      if (print) pdf.autoPrint();
      const url = URL.createObjectURL(pdf.output('blob'));
      win.opener = null; win.location.replace(url);
      setTimeout(() => URL.revokeObjectURL(url), 300000);
      status.textContent = print ? 'PDF ouvert pour impression. Utilisez le bouton Imprimer du lecteur PDF si nécessaire.' : 'PDF ouvert dans un nouvel onglet.';
    } catch (error) { win.close(); status.textContent = error.message; }
  }
  $('cr-export-preview').addEventListener('click', () => openPDF());
  $('cr-export-print').addEventListener('click', () => openPDF(true));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || $('cr-export-send').disabled || !prepared || !form.reportValidity()) return;
    sending = true;
    const button = $('cr-export-send'); button.disabled = true;
    $('cr-export-close').disabled = true; status.textContent = 'Envoi en cours…';
    const snapshot = prepared;
    try {
      const profile = getAgentProfile(), token = profile && await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Votre session a expiré. Reconnectez-vous au CRM avant l’envoi.');
      const content = snapshot.pdf.output('datauristring').split(',')[1];
      const payload = {
        mailKind: 'client-direct', senderMode: profile.email === 'coryne@leroyfactory.fr' ? 'coryne' : 'jerome',
        bccRecipients: [$('cr-export-recipient').value.trim()], clientIds: [],
        subject: $('cr-export-subject').value.trim(), textContent: $('cr-export-message').value,
        htmlContent: `<div style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHTML($('cr-export-message').value)}</div>`,
        attachments: [{ filename: snapshot.model.filename, content, contentType: 'application/pdf', encoding: 'base64' }]
      };
      const response = await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) throw new Error('Session non autorisée. Reconnectez-vous au CRM.');
      if (!response.ok || !result.success) throw new Error(result.error || 'L’envoi n’a pas été confirmé par le serveur.');
      status.textContent = `E-mail pris en charge par la messagerie pour ${payload.bccRecipients[0]}, avec le PDF joint.${result.sentCopy?.status === 'failed' ? ' La copie dans les messages envoyés n’a pas pu être enregistrée.' : ''}`;
      // Explicitly reopen the export to send again; no accidental duplicate click.
      button.textContent = 'E-mail envoyé';
    } catch (error) {
      status.textContent = `Envoi non confirmé : ${error.message} Vérifiez vos messages envoyés avant de réessayer.`;
      button.disabled = false;
    } finally { sending = false; $('cr-export-close').disabled = false; }
  });
  dialog.addEventListener('close', () => { $('cr-export-send').disabled = false; $('cr-export-send').textContent = 'Envoyer avec le PDF joint'; });
}
