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
  const text = studioOne
    ? 'Envoi d’un mail groupé à l’ensemble des clients concernant RANDAL Studio One.'
    : `${type} envoyé : ${String(payload.subject || '').trim()}.`;
  return {
    date: parisDate(sentAt), author, type, ...(studioOne ? { usine: 'RANDAL' } : {}),
    text, createdAt: new Date(sentAt).toISOString(),
    source: 'mail-groupe', scope: 'campagne', societe: 'Tous les clients', mailCampaignId: campaignKey(payload, sentAt),
    mailSubject: String(payload.subject || '').trim(), mailStatus: 'envoye',
    mailRecipients: unique([...recipients]),
    mailMessageIds: messageId ? [String(messageId)] : [],
    mailAttachments: attachments, mailScheduled: programmed === true
  };
}

// One concise shared report per daily campaign, including all of its lots.
async function appendGroupMailReports(db, payload, options = {}) {
  const report = buildReport(payload, {}, options);
  const ref = db.collection('comptes_rendus').doc(report.mailCampaignId);
  const status = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      transaction.set(ref, report);
      return 'added';
    }
    const previous = snapshot.data();
    const merged = {
      ...previous,
      mailRecipients: unique([...(previous.mailRecipients || []), ...report.mailRecipients]),
      mailMessageIds: unique([...(previous.mailMessageIds || []), ...report.mailMessageIds]),
      mailAttachments: unique([...(previous.mailAttachments || []), ...report.mailAttachments]),
      mailScheduled: previous.mailScheduled === true || report.mailScheduled
    };
    if (JSON.stringify(previous) === JSON.stringify(merged)) return 'unchanged';
    transaction.set(ref, merged);
    return 'updated';
  });
  return { added: 0, updated: 0, unchanged: 0, missing: 0, [status]: 1 };
}

module.exports = { normalizeEmail, clientEmails, parisDate, campaignKey, buildReport, appendGroupMailReports };
