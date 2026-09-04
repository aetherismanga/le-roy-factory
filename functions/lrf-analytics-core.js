const admin = require('firebase-admin');

const db = admin.firestore();
const EVENTS = 'lrf_client_events';
const SUMMARIES = 'lrf_client_analytics';

function clean(v, max = 180) {
  return String(v || '').trim().slice(0, max);
}

async function writeClientActivity(client, activity = {}) {
  if (!client?.id) return;
  const action = clean(activity.action || 'page_view', 40) || 'page_view';
  const page = clean(activity.page || '', 180) || 'inconnu';
  const title = clean(activity.title || '', 180);
  const device = ['mobile', 'desktop', 'tablet'].includes(activity.device) ? activity.device : 'unknown';
  const partner = clean(activity.partner || '', 80);
  const tariffId = clean(activity.tariffId || '', 80);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await Promise.all([
    db.collection(EVENTS).add({
      clientId: String(client.id),
      codeClient: clean(client.codeClient || '', 20).toUpperCase(),
      action,
      page,
      title,
      device,
      partner,
      tariffId,
      createdAt: now
    }),
    db.collection(SUMMARIES).doc(String(client.id)).set({
      clientId: String(client.id),
      codeClient: clean(client.codeClient || '', 20).toUpperCase(),
      lastSeenAt: now,
      lastAction: action,
      lastPage: page,
      viewCount: admin.firestore.FieldValue.increment(1),
      updatedAt: now
    }, { merge: true })
  ]);
}

module.exports = { writeClientActivity, EVENTS, SUMMARIES };
