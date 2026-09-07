'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { publicCatalog } = require('./bilt-catalog');

const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr']);
const ADMIN_EMAILS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);

function cors(req, res) {
  const origin = String(req.headers.origin || '');
  res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.has(origin) ? origin : 'https://leroyfactory.fr');
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

function clean(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

async function verifyAdminToken(token) {
  const raw = clean(token, 6000);
  if (!raw) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(raw);
    const email = clean(decoded?.email, 180).toLowerCase();
    if (!ADMIN_EMAILS.has(email)) return null;
    return { email, name: email.startsWith('coryne@') ? 'Coryne' : 'Jérôme' };
  } catch (error) {
    console.warn('BILT admin preview token refusé', error?.message || error);
    return null;
  }
}

exports.biltAdminPreview = onRequest({
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '256MiB'
}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  const payload = req.body || {};
  const adminUser = await verifyAdminToken(payload.adminToken);
  if (!adminUser) {
    return res.status(401).json({ success: false, error: 'Session administrateur non reconnue.' });
  }

  const action = clean(payload.action, 40).toLowerCase();
  if (action !== 'context') {
    return res.status(403).json({
      success: false,
      mailBlocked: true,
      error: 'Mode administrateur : envoi de commande et e-mails BILT bloqués. Utilisez ce mode uniquement pour tester et présenter le catalogue.'
    });
  }

  return res.status(200).json({
    success: true,
    adminPreview: true,
    mailBlocked: true,
    customer: {
      clientId: `admin:${adminUser.email}`,
      codeClient: 'ADMIN-BILT',
      societe: 'LE ROY FACTORY — MODE ADMINISTRATEUR',
      emails: ['ENVOI E-MAIL BLOQUÉ — MODE ADMIN'],
      phones: [],
      contacts: [{
        id: 'admin-demo',
        name: `${adminUser.name} — Présentation BILT`,
        fonction: 'Administrateur LE ROY FACTORY',
        email: '',
        telephone: ''
      }],
      adresse: ''
    },
    catalog: publicCatalog(),
    discount: { percent: 0, expiresAt: null },
    pendingFirstOrder: null,
    history: []
  });
});
