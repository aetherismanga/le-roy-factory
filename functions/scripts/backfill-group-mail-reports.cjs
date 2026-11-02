'use strict';

const admin = require('firebase-admin');
const { clientEmails, normalizeEmail, parisDate, appendGroupMailReports } = require('../group-mail-history');

async function backfill(db, { date, subject, senderEmail, minRecipients, maxRecipients, attachment }) {
  const [history, clients] = await Promise.all([
    db.collection('historique_mails').where('objet', '==', subject).get(),
    db.collection('clients').get()
  ]);
  const successful = history.docs.map(doc => doc.data()).filter(item =>
    item.source === 'serveur' && item.messageId && /^succès/i.test(item.statut || '') &&
    item.expediteur === senderEmail && parisDate(item.date) === date
  ).sort((a, b) => new Date(a.date) - new Date(b.date));
  const seenMessages = new Set();
  const rows = successful.filter(row => !seenMessages.has(row.messageId) && seenMessages.add(row.messageId));
  const recipients = new Set(rows.flatMap(row => row.destinataires || []).map(normalizeEmail));
  if (recipients.size < minRecipients || recipients.size > maxRecipients) {
    throw new Error(`Périmètre inattendu : ${recipients.size} destinataires confirmés.`);
  }
  const owners = new Map();
  for (const snapshot of clients.docs) {
    const client = snapshot.data();
    const company = String(client.societe || client.nomSociete || client.entreprise || client.nom || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (client.archived === true || client.archive === true ||
      String(client.type || client.Type || 'client').toLowerCase().includes('prospect') ||
      /comptoir.*ceram/.test(company)) continue;
    for (const email of clientEmails(client)) {
      if (!owners.has(email)) owners.set(email, new Set());
      owners.get(email).add(snapshot.id);
    }
  }
  const unmatched = [...recipients].filter(email => !owners.has(email));
  if (unmatched.length) throw new Error(`${unmatched.length} adresse(s) sans fiche client certaine. Aucune écriture effectuée.`);
  const affected = new Set();
  const counts = { added: 0, updated: 0, unchanged: 0, missing: 0 };
  for (const row of rows) {
    const bccRecipients = [...new Set((row.destinataires || []).map(normalizeEmail))];
    const clientIds = [...new Set(bccRecipients.flatMap(email => [...(owners.get(email) || [])]))];
    clientIds.forEach(id => affected.add(id));
    const payload = {
      senderMode: senderEmail.startsWith('coryne@') ? 'coryne' : 'jerome',
      subject, bccRecipients, clientIds,
      attachments: attachment ? [{ filename: attachment }] : []
    };
    const result = await appendGroupMailReports(db, payload, {
      messageId: row.messageId, sentAt: new Date(row.date), programmed: row.typeEnvoi === 'programme'
    });
    for (const key of Object.keys(counts)) counts[key] += result[key];
  }
  let verifiedClients = 0;
  for (const id of affected) {
    const snapshot = await db.collection('clients').doc(id).get();
    const client = snapshot.data() || {};
    const list = Array.isArray(client.comptes_rendus) ? client.comptes_rendus : client.comptesRendus || [];
    const matching = list.filter(report => report.source === 'mail-groupe' && report.date === date && report.mailSubject === subject);
    if (matching.length !== 1) throw new Error('Le contrôle des comptes-rendus a échoué.');
    verifiedClients += 1;
  }
  // Public CI output intentionally contains counts only, never client identities.
  return { confirmedBatches: rows.length, confirmedRecipients: recipients.size, affectedClients: affected.size, verifiedClients, ...counts };
}

if (require.main === module) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (projectId !== 'le-roy-factory') throw new Error('Projet Firebase inattendu.');
  admin.initializeApp({ projectId });
  backfill(admin.firestore(), {
    date: process.env.CAMPAIGN_DATE,
    subject: process.env.CAMPAIGN_SUBJECT,
    senderEmail: process.env.CAMPAIGN_SENDER,
    minRecipients: Number(process.env.CAMPAIGN_MIN_RECIPIENTS),
    maxRecipients: Number(process.env.CAMPAIGN_MAX_RECIPIENTS),
    attachment: process.env.CAMPAIGN_ATTACHMENT
  }).then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error(error.message); process.exitCode = 1;
  });
}

module.exports = { backfill };
