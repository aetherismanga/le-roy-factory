'use strict';

const OWNER_EMAIL = 'jerome@leroyfactory.fr';
const ORIGINS = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr']);

// Blob modules need absolute imports and the original URL for workers/assets.
function browserModule(source, origin) {
  if (!ORIGINS.has(origin)) throw new Error('Origine non autorisée.');
  const base = origin + '/assets/js/lrf-plan-pose/app.mjs';
  return source.replace(/^(import\b[^\n]+?\bfrom\s*)(['"])(\.[^'"]+)\2/gm,
    (_, prefix, quote, path) => prefix + quote + new URL(path, base).href + quote)
    .replace(/\bimport\.meta\.url\b/g, JSON.stringify(base));
}

function createPlanPoseHandler({getAgent, loadApplication}) {
  return async (req, res) => {
    const origin = String(req.headers?.origin || '');
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Vary', 'Origin, Authorization');
    if (origin && !ORIGINS.has(origin)) return res.status(403).json({success: false, error: 'Origine non autorisée.'});
    if (origin) res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({success: false, error: 'Méthode non autorisée.'});
    try {
      // Verifies Firebase token and revocation. PRO flags never grant access.
      const agent = await getAgent(req);
      if (!agent) return res.status(401).json({success: false, error: 'Authentification administrateur requise.'});
      if (agent.email !== OWNER_EMAIL) return res.status(403).json({success: false, error: 'Application réservée à son administrateur.'});
      const {html, source} = await loadApplication();
      return res.json({success: true, html, module: browserModule(source, origin || 'https://leroyfactory.fr')});
    } catch (_) {
      return res.status(503).json({success: false, error: 'Application momentanément indisponible.'});
    }
  };
}

module.exports = {createPlanPoseHandler, browserModule};
