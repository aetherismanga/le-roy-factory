'use strict';

const { createHash } = require('node:crypto');

const normalizeEmail = value => String(value || '').trim().replace(/^mailto:/i, '').toLowerCase();
const unique = values => [...new Set(values.filter(Boolean))].sort();

function clientEmails(client) {
  const emails = [client.email, client.eMail, client.mail, client.Email, client.Mail];
  for (const key of ['emails', 'emails_contact']) emails.push(...(Array.isArray(client[key]) ? client[key] : []));
  for (const key of ['interlocuteurs', 'contacts']) {
    for (const person of Array.isArray(client[key]) ? client[key] : []) {
      emails.push(typeof person === 'string' ? person : person?.email || person?.mail || person?.eMail);
    }
  }
  return unique(emails.map(normalizeEmail).filter(email => /^[^\s@<>:,;]+@[^\s@<>:,;]+\.[^\s@<>:,;]+$/.test(email)));
}

function parisDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Date d’envoi invalide.');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function campaignKey(payload, sentAt) {
  const signature = [parisDate(sentAt), payload.senderMode || 'jerome', String(payload.subject || '').normalize('NFC').trim().toLowerCase()];
  return 'mail-groupe-' + createHash('sha256').update(JSON.stringify(signature)).digest('hex').slice(0, 24);
}

function buildReport(payload, client, { sentAt = new Date(), messageId = null, programmed = false } = {}) {
  const sender = payload.senderMode || 'jerome';
  const author = sender === 'coryne' ? 'Coryne' : sender === 'both' ? 'Jérôme & Coryne' : 'Jérôme Hugol';
  const recipients = new Set((payload.bccRecipients || []).map(normalizeEmail));
  const attachments = unique((payload.attachments || []).filter(file => !file.inline).map(file => file.filename));
  const studioOne = /studio\s+one/i.test(payload.subject || '');
  const type = recipients.size > 1 ? 'Mail groupé' : 'E-mail';
  const lines = [
    studioOne ? 'Mail groupé RANDAL STUDIO ONE adressé à l’ensemble de nos clients.' : `${type} envoyé par ${author}.`,
    `Objet : ${String(payload.subject || '').trim()}`,
    ...(studioOne ? ['Présentation de STUDIO ONE et explication du choix et de la commande du meuble en 4 étapes.'] : []),
    ...(attachments.length ? [`Pièce${attachments.length > 1 ? 's' : ''} jointe${attachments.length > 1 ? 's' : ''} : ${attachments.join(', ')}`] : []),
    'Envoi en CCI. Les autres destinataires ne sont pas visibles.'
  ];
  return {
    date: parisDate(sentAt), author, type, ...(studioOne ? { usine: 'RANDAL' } : {}),
    text: lines.join('\n'), createdAt: new Date(sentAt).toISOString(),
    source: 'mail-groupe', mailCampaignId: campaignKey(payload, sentAt),
    mailSubject: String(payload.subject || '').trim(), mailStatus: 'envoye',
    mailRecipients: clientEmails(client).filter(email => recipients.has(email)),
    mailMessageIds: messageId ? [String(messageId)] : [],
    mailAttachments: attachments, mailScheduled: programmed === true
  };
}

// Read-modify-write transactions preserve existing notes and merge separate lots
// of the same daily campaign into one commercial report per client.
async function appendGroupMailReports(db, payload, options = {}) {
  const ids = unique((Array.isArray(payload.clientIds) ? payload.clientIds : [])
    .filter(id => typeof id === 'string' && id.trim() && !id.includes('/')));
  const result = { added: 0, updated: 0, unchanged: 0, missing: 0 };
  for (let offset = 0; offset < ids.length; offset += 10) {
    await Promise.all(ids.slice(offset, offset + 10).map(async id => {
      const status = await db.runTransaction(async transaction => {
        const ref = db.collection('clients').doc(id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return 'missing';
        const client = snapshot.data() || {};
        const field = Array.isArray(client.comptes_rendus) ? 'comptes_rendus'
          : Array.isArray(client.comptesRendus) ? 'comptesRendus' : 'comptes_rendus';
        const list = [...(client[field] || [])];
        const report = buildReport(payload, client, options);
        const index = list.findIndex(item => item?.mailCampaignId === report.mailCampaignId);
        if (index < 0) {
          transaction.update(ref, { [field]: [report, ...list] });
          return 'added';
        }
        const previous = list[index];
        const merged = {
          ...previous,
          mailRecipients: unique([...(previous.mailRecipients || []), ...report.mailRecipients]),
          mailMessageIds: unique([...(previous.mailMessageIds || []), ...report.mailMessageIds]),
          mailAttachments: unique([...(previous.mailAttachments || []), ...report.mailAttachments]),
          mailScheduled: previous.mailScheduled === true || report.mailScheduled
        };
        if (JSON.stringify(previous) === JSON.stringify(merged)) return 'unchanged';
        list[index] = merged;
        transaction.update(ref, { [field]: list });
        return 'updated';
      });
      result[status] += 1;
    }));
  }
  return result;
}

module.exports = { normalizeEmail, clientEmails, parisDate, campaignKey, buildReport, appendGroupMailReports };
