'use strict';

const AGENTS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const ORIGINS = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr']);

const PROJECT_ACTIONS = new Set(['projects-list', 'projects-save', 'projects-delete']);

function createNeobathAnimaHandler({getAgent, loadApplication, projectStore}) {
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
      // getAgent verifies the Firebase token with revocation checking. Neither
      // PRO sessions nor client-supplied roles/email addresses grant access.
      const agent = await getAgent(req);
      if (!agent) return res.status(401).json({success: false, error: 'Connectez-vous à votre espace agent.'});
      if (!AGENTS.has(agent.email)) return res.status(403).json({success: false, error: 'Atelier réservé à Jérôme et Coryne.'});
      if (Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8') > 1048576) return res.status(413).json({success: false, error: 'Le projet dépasse la taille autorisée.'});
      const action = req.body?.action || 'application';
      if (action === 'authorize') return res.json({success: true});
      if (PROJECT_ACTIONS.has(action)) {
        if (!projectStore || typeof projectStore[action] !== 'function') throw Error('Project store unavailable');
        try {
          return res.json(await projectStore[action](req.body, agent));
        } catch (error) {
          const code = Number(error?.status);
          if ([400, 404, 409, 410, 413].includes(code)) return res.status(code).json({success: false, error: error.message});
          throw error;
        }
      }
      if (action !== 'application') return res.status(400).json({success: false, error: 'Action inconnue.'});
      const application = await loadApplication();
      return res.json({success: true, html: application.html, css: application.css, module: application.module, catalogue: application.catalogue, release: application.release || null, identity: {uid: agent.uid, email: agent.email}});
    } catch (_) {
      return res.status(503).json({success: false, error: 'Atelier momentanément indisponible. Réessayez dans un instant.'});
    }
  };
}

module.exports = {createNeobathAnimaHandler};
