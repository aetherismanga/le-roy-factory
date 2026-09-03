const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');

const db = admin.firestore();
const SESSION_COLLECTION = 'pro_sessions';
// Session d'appareil persistante : 180 jours glissants, revérifiée côté serveur à chaque reprise.
const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function clean(v, max = 120) {
  return String(v || '').trim().slice(0, max);
}

function depFromCp(cp) {
  const s = String(cp || '').replace(/\s/g, '');
  if (!/^\d{5}$/.test(s)) return '';
  if (s.startsWith('97') || s.startsWith('98')) return s.slice(0, 3);
  if (s.startsWith('20')) return Number(s) >= 20200 ? '2B' : '2A';
  return s.slice(0, 2);
}

function cors(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = ['https://leroyfactory.fr', 'https://www.leroyfactory.fr'];
  res.set('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : 'https://leroyfactory.fr');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

async function findClient(codeRaw, depRaw) {
  const code = clean(codeRaw, 20).toUpperCase();
  const dep = clean(depRaw, 3).toUpperCase();
  if (!/^LRF-\d{5}$/.test(code) || !dep) return null;

  const snap = await db.collection('clients').where('codeClient', '==', code).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  const actualDep = String(data.departement || depFromCp(data.codePostal || data.code_postal) || '').trim().toUpperCase();
  if (actualDep !== dep) return null;
  if (data.proAccessDisabled === true) return null;

  return { id: doc.id, ...data, codeClient: code, departement: actualDep };
}

function safeClient(client) {
  const partners = Array.isArray(client.partenaires) ? [...new Set(client.partenaires.filter(Boolean))] : [];
  const activity = client.categorieActivite || client.activite || client.sousCategorie || client.segmentation || 'Professionnel';
  return {
    id: client.id,
    codeClient: String(client.codeClient || '').toUpperCase(),
    societe: client.societe || 'Client professionnel',
    departement: String(client.departement || depFromCp(client.codePostal || client.code_postal) || '').toUpperCase(),
    categorieActivite: activity,
    activite: activity,
    partenaires: partners,
    type: client.type || 'client'
  };
}

async function clientFromSessionToken(rawToken, { renew = true } = {}) {
  const token = clean(rawToken, 256);
  if (token.length < 32) return null;

  const ref = db.collection(SESSION_COLLECTION).doc(tokenHash(token));
  const snap = await ref.get();
  if (!snap.exists) return null;

  const session = snap.data() || {};
  const expiresAt = session.expiresAt?.toMillis?.() || 0;
  if (!expiresAt || expiresAt <= Date.now() || session.revoked === true || !session.clientId) {
    await ref.delete().catch(() => {});
    return null;
  }

  const clientSnap = await db.collection('clients').doc(String(session.clientId)).get();
  if (!clientSnap.exists) {
    await ref.delete().catch(() => {});
    return null;
  }

  const clientData = clientSnap.data() || {};
  if (clientData.proAccessDisabled === true) {
    await ref.delete().catch(() => {});
    return null;
  }

  const actualDep = String(clientData.departement || depFromCp(clientData.codePostal || clientData.code_postal) || '').trim().toUpperCase();
  const actualCode = String(clientData.codeClient || '').trim().toUpperCase();
  if (!/^LRF-\d{5}$/.test(actualCode) || actualDep !== String(session.departement || '').toUpperCase()) {
    await ref.delete().catch(() => {});
    return null;
  }

  const now = Date.now();
  const renewedExpiresAt = now + SESSION_TTL_MS;
  if (renew) {
    await ref.set({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(renewedExpiresAt)
    }, { merge: true }).catch(() => {});
  }

  return {
    client: { id: clientSnap.id, ...clientData, codeClient: actualCode, departement: actualDep },
    expiresAt: renew ? renewedExpiresAt : expiresAt,
    ref
  };
}

const createProSession = onRequest({ timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  try {
    const { codeClient, departement } = req.body || {};
    const client = await findClient(codeClient, departement);
    if (!client) return res.status(403).json({ success: false, error: 'Identifiant client ou département incorrect.' });

    const token = newToken();
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;
    const ref = db.collection(SESSION_COLLECTION).doc(tokenHash(token));

    await ref.set({
      clientId: client.id,
      departement: client.departement,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
      revoked: false
    });

    return res.json({ success: true, sessionToken: token, expiresAt, client: safeClient(client) });
  } catch (error) {
    console.error('createProSession', error);
    return res.status(500).json({ success: false, error: 'Impossible de créer la session de cet appareil.' });
  }
});

const validateProSession = onRequest({ timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  try {
    const result = await clientFromSessionToken(req.body?.sessionToken, { renew: true });
    if (!result) return res.status(401).json({ success: false, error: 'Session expirée ou révoquée.' });
    return res.json({ success: true, expiresAt: result.expiresAt, client: safeClient(result.client) });
  } catch (error) {
    console.error('validateProSession', error);
    return res.status(500).json({ success: false, error: 'Impossible de vérifier la session.' });
  }
});

const revokeProSession = onRequest({ timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  try {
    const token = clean(req.body?.sessionToken, 256);
    if (token.length >= 32) await db.collection(SESSION_COLLECTION).doc(tokenHash(token)).delete().catch(() => {});
    return res.json({ success: true });
  } catch (error) {
    console.error('revokeProSession', error);
    return res.status(500).json({ success: false, error: 'Impossible de fermer la session.' });
  }
});

module.exports = {
  createProSession,
  validateProSession,
  revokeProSession,
  clientFromSessionToken
};