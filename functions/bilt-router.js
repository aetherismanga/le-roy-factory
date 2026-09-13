'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const original = require('./bilt-order');
const { publicCatalog, productByRef } = require('./bilt-catalog');

const ADMIN_EMAILS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr']);

function cartonLabel(product, packQty, packUnit) {
  const unit = String(packUnit || '').toLowerCase();
  const format = String(product?.format || '').trim();
  const name = String(product?.name || '');

  if (unit === 'sacs' || unit === 'sac') {
    return `carton de ${packQty} sachet${packQty > 1 ? 's' : ''}`;
  }
  if (unit === 'uds' || unit === 'ud') {
    return `carton de ${packQty} unité${packQty > 1 ? 's' : ''}`;
  }
  if (unit === 'boites' || unit === 'boite' || unit === 'boîtes' || unit === 'boîte') {
    return `carton de ${packQty} boîte${packQty > 1 ? 's' : ''}`;
  }
  if (unit === 'cartons' || unit === 'carton') {
    const m = format.match(/([0-9\s.,+]+)\s*uds?/i);
    if (m) {
      const qty = m[1].trim();
      if (/NOX\s*CLIP/i.test(name)) return `carton de ${qty} croisillons`;
      return `carton de ${qty} pièce${Number(String(qty).replace(/\s/g, '').replace(',', '.')) > 1 ? 's' : ''}`;
    }
    return format ? `carton · ${format}` : 'carton';
  }
  return 'carton';
}

function cartonizeCatalog() {
  const snapshot = publicCatalog();
  for (const item of snapshot.products || []) {
    const product = productByRef(item.ref);
    if (!product || product.__lrfCartonized) continue;

    const oldMinQty = Math.max(1, Number(product.minQty) || 1);
    const oldMinUnit = String(product.minUnit || '');
    const alreadyCarton = /^cartons?$/i.test(oldMinUnit);
    const priceFactor = alreadyCarton ? 1 : oldMinQty;

    product.packQty = alreadyCarton ? 1 : oldMinQty;
    product.packUnit = oldMinUnit;
    product.unitNet = Number(product.net);
    product.net = Number((Number(product.net) * priceFactor).toFixed(4));
    product.minQty = 1;
    product.minUnit = cartonLabel(product, oldMinQty, oldMinUnit);

    Object.defineProperty(product, '__lrfCartonized', {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false
    });
  }
}

// Toutes les commandes BILT sont désormais exprimées en nombre de cartons :
// 1, 2, 3... Le prix et le conditionnement du carton sont calculés ici afin
// que l'ancienne logique de validation, les totaux et les e-mails restent cohérents.
cartonizeCatalog();

function clean(value, max = 6000) {
  return String(value ?? '').trim().slice(0, max);
}

function adminCors(req, res) {
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

async function verifyAdminToken(token) {
  const raw = clean(token);
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

async function handleAdminPreview(req, res) {
  if (adminCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  const payload = req.body || {};
  const adminUser = await verifyAdminToken(payload.adminToken);
  if (!adminUser) return res.status(401).json({ success: false, error: 'Session administrateur non reconnue.' });

  const action = clean(payload.action, 40).toLowerCase();
  if (action !== 'context') {
    return res.status(403).json({
      success: false,
      mailBlocked: true,
      error: 'Mode administrateur : envoi de commande et e-mails BILT bloqués. Le catalogue et le panier restent disponibles pour les tests et présentations.'
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
}

exports.biltOrder = onRequest({
  region: 'us-central1',
  timeoutSeconds: 90,
  memory: '256MiB',
  secrets: ['SMTP_PASSWORD_JEROME']
}, async (req, res) => {
  if (req?.body?.adminToken) return handleAdminPreview(req, res);
  return original.biltOrder(req, res);
});

exports.biltDecision = original.biltDecision;
exports.biltAutoRelease = original.biltAutoRelease;
