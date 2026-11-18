'use strict';

const { clientEmails, normalizeEmail } = require('./group-mail-history');

function isPisciniste(client) {
  const value = String(client.categorieActivite || client.sousCategorie || client.activite || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return value.includes('piscin');
}

async function excludePiscinistes(db, payload) {
  const snapshot = await db.collection('clients').get();
  const blockedIds = new Set();
  const blockedEmails = new Set();
  snapshot.forEach(doc => {
    const client = doc.data();
    if (!isPisciniste(client)) return;
    blockedIds.add(doc.id);
    clientEmails(client).forEach(email => blockedEmails.add(email));
  });
  const recipients = [...new Map((payload.bccRecipients || [])
    .filter(email => !blockedEmails.has(normalizeEmail(email)))
    .map(email => [normalizeEmail(email), email])).values()];
  return {
    ...payload,
    bccRecipients: recipients,
    clientIds: (payload.clientIds || []).filter(id => !blockedIds.has(id))
  };
}

module.exports = { isPisciniste, excludePiscinistes };
