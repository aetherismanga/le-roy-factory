'use strict';

const VARIANTS = Object.freeze(['plan-pose', 'studio-one', 'randal-general']);
const ORIGINS = new Set([
  'https://leroyfactory.fr', 'https://www.leroyfactory.fr',
  'https://studio-one-beta-test-v2.vercel.app',
  'https://randal-catalogue-general-3d.vercel.app'
]);
const AGENT_EMAILS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const PRIVATE_PREFIX = 'private-tariffs/configurators/';

function storagePath(variant) {
  if (!VARIANTS.includes(variant)) throw new Error('Unknown configurator');
  return PRIVATE_PREFIX + variant + '-v1.json';
}

// Only these two fields leave private storage, indexed by catalogue reference.
// No source file, download URL or caller-provided identity is returned.
function priceMap(rows) {
  if (!Array.isArray(rows) || rows.length > 10000) throw new Error('Invalid price catalogue');
  const result = Object.create(null);
  for (const row of rows) {
    if (!row || typeof row.key !== 'string' || !row.key || row.key.length > 240 || ['__proto__', 'prototype', 'constructor'].includes(row.key)) throw new Error('Invalid price reference');
    const prices = {};
    for (const field of ['purchaseHT', 'purchasePaletteHT']) {
      const value = row[field];
      if (value == null) prices[field] = null;
      else if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000) prices[field] = value;
      else throw new Error('Invalid purchase amount');
    }
    if (Object.hasOwn(result, row.key) && JSON.stringify(result[row.key]) !== JSON.stringify(prices)) throw new Error('Conflicting price reference');
    result[row.key] = prices;
  }
  return result;
}

function normalizePrices(input, variant) {
  if (!input || input.version !== 1 || input.variant !== variant) throw new Error('Invalid private catalogue version');
  return {success: true, version: 1, variant, products: priceMap(input.products), plinths: priceMap(input.plinths)};
}

function verifiedAgent(agent) {
  return !!agent?.uid && AGENT_EMAILS.has(String(agent.email || '').toLowerCase()) && agent.token?.email_verified === true;
}

function createPurchasePricesHandler({getAgentFromRequest, readPrices}) {
  return async (req, res) => {
    const origin = String(req.headers?.origin || '');
    if (ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin, Authorization');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('X-Content-Type-Options', 'nosniff');
    if (origin && !ORIGINS.has(origin)) return res.status(403).json({success: false, error: 'Origine non autorisée.'});
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({success: false, error: 'Méthode non autorisée.'});
    try {
      const agent = await getAgentFromRequest(req);
      if (!agent) return res.status(401).json({success: false, error: 'Connexion à un compte agent LRF requise.'});
      if (!verifiedAgent(agent)) return res.status(403).json({success: false, error: 'Compte agent LRF vérifié requis.'});
      const variant = req.body?.variant;
      if (!VARIANTS.includes(variant) || JSON.stringify(req.body).length > 2048) return res.status(400).json({success: false, error: 'Configurateur non reconnu.'});
      const payload = normalizePrices(await readPrices(variant), variant);
      return res.status(200).json(payload);
    } catch (_) {
      // Never log bearer tokens, catalogue bytes, purchase amounts or storage errors.
      return res.status(503).json({success: false, error: 'Tarifs agent temporairement indisponibles.'});
    }
  };
}

module.exports = {VARIANTS, storagePath, priceMap, normalizePrices, verifiedAgent, createPurchasePricesHandler};
