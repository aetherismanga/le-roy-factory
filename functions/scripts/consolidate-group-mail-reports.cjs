'use strict';

const { createHash } = require('node:crypto');
const admin = require('firebase-admin');
const { campaignKey } = require('../group-mail-history');
const { backfill } = require('./backfill-group-mail-reports.cjs');
const DATE = '2026-11-02';
const SUBJECT = 'Comment configurer votre meuble STUDIO ONE en 4 étapes';
const CAMPAIGN = campaignKey({ subject: SUBJECT, senderMode: 'jerome' }, new Date(DATE + 'T12:00:00Z'));
const matches = report => report?.source === 'mail-groupe' && report.mailCampaignId === CAMPAIGN && report.date === DATE && report.mailSubject === SUBJECT;

async function consolidate(db, limits = { minRecipients: 195, maxRecipients: 333 }) {
  // Reconstruct only from confirmed server sends, then retire the old per-client notes.
  const summary = await backfill(db, { date: DATE, subject: SUBJECT, senderEmail: 'jerome@leroyfactory.fr', attachment: 'STUDIO_ONE_Flyer_FR_Corrige.pdf', ...limits });
  const clients = await db.collection('clients').get();
  let removed = 0, affectedClients = 0;
  for (const snapshot of clients.docs) {
    const result = await db.runTransaction(async tx => {
      const ref = db.collection('clients').doc(snapshot.id);
      const fresh = await tx.get(ref);
      if (!fresh.exists) return 0;
      const data = fresh.data(), changes = {}, archived = {};
      let count = 0;
      for (const field of ['comptes_rendus', 'comptesRendus']) {
        if (!Array.isArray(data[field])) continue;
        const old = data[field].filter(matches);
        if (!old.length) continue;
        archived[field] = old;
        changes[field] = data[field].filter(report => !matches(report));
        count += old.length;
      }
      if (!count) return 0;
      const archiveId = CAMPAIGN + '-' + createHash('sha256').update(snapshot.id).digest('hex');
      // A private recovery copy is written atomically before removing visible notes.
      tx.set(db.collection('crm_report_archives').doc(archiveId), {
        clientId: snapshot.id, campaignId: CAMPAIGN, retiredAt: new Date().toISOString(), reports: archived
      });
      tx.update(ref, changes);
      return count;
    });
    removed += result;
    if (result) affectedClients += 1;
  }
  const verified = await db.collection('clients').get();
  let remaining = 0;
  for (const client of verified.docs) for (const field of ['comptes_rendus', 'comptesRendus']) {
    remaining += (Array.isArray(client.data()[field]) ? client.data()[field] : []).filter(matches).length;
  }
  if (remaining) throw new Error('Des comptes-rendus individuels de la campagne subsistent.');
  const note = await db.collection('comptes_rendus').doc(CAMPAIGN).get();
  if (!note.exists || note.data().text !== 'Envoi d’un mail groupé à l’ensemble des clients concernant RANDAL Studio One.') throw new Error('Compte-rendu global manquant ou inattendu.');
  return { ...summary, retiredClientReports: removed, cleanedClients: affectedClients, remainingClientReports: remaining, globalCampaignReports: 1 };
}

if (require.main === module) {
  if (process.env.GOOGLE_CLOUD_PROJECT !== 'le-roy-factory') throw new Error('Unexpected project.');
  admin.initializeApp({ projectId: 'le-roy-factory' });
  consolidate(admin.firestore()).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { consolidate, matches, CAMPAIGN };
