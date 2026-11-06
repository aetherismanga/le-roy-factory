'use strict';
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const origins = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr']);
function permitted(client) {
  if (!client || client.proAccessDisabled || !/^LRF-\d{5}$/.test(client.codeClient || '') || client.codeClient === 'LRF-00001') return false;
  if ([client.type, client.categorieActivite, client.activite].some(value => norm(value).includes('particulier'))) return false;
  return Array.isArray(client.partenaires) && client.partenaires.some(value => ['opal', 'opalhome'].includes(norm(value)));
}
function createOpalHandler({verifyAgent, verifySession, products, now = Date.now}) {
  return async (req, res) => {
    res.set('Cache-Control', 'private, no-store, max-age=0');res.set('Pragma', 'no-cache');res.set('Vary', 'Origin, Authorization');res.set('X-Content-Type-Options', 'nosniff');
    const origin = String(req.headers?.origin || '');
    if (origin && !origins.has(origin)) return res.status(403).json({success:false,error:'Origine non autorisée.'});
    if (origin) res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({success:false,error:'Méthode non autorisée.'});
    if (!req.body || req.body.action !== 'context' || JSON.stringify(req.body).length > 2048) return res.status(400).json({success:false,error:'Requête invalide.'});
    try {
      const agent = await verifyAgent(req);
      let expiresAt = now() + 300000;
      if (!agent) {
        const token = req.body.sessionToken;
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return res.status(401).json({success:false,error:'Connexion professionnelle requise.'});
        const session = await verifySession(token, {renew:false});
        if (!session || !Number.isFinite(session.expiresAt) || session.expiresAt <= now()) return res.status(401).json({success:false,error:'Session professionnelle expirée.'});
        if (!permitted(session.client)) return res.status(403).json({success:false,error:'Accès OPAL non autorisé pour ce compte.'});
        expiresAt = Math.min(expiresAt, session.expiresAt);
      }
      const prices = {};
      // Conditions OPAL/AQUAHOME, document commercial transmis le 12/02/2026:
      // OPAL remise standard 50 % sur le public HT. Aucune remise expo implicite.
      for (const row of products) if (typeof row.priceTtc === 'number' && row.priceTtc > 0 && /^[A-Z0-9-]{1,40}$/.test(row.code)) prices[row.code] = Math.round((row.priceTtc / 1.2) * .5 * 100) / 100;
      return res.json({success:true,partner:'opal',currency:'EUR',tax:'HT',expiresAt,prices});
    } catch { return res.status(503).json({success:false,error:'Vérification des tarifs momentanément indisponible.'}); }
  };
}
module.exports = {createOpalHandler, permitted};
