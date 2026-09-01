const admin = require('firebase-admin');

const AGENT_EMAILS = new Set([
  'jerome@leroyfactory.fr',
  'coryne@leroyfactory.fr'
]);

async function getAgentFromRequest(req) {
  const header = String(req.get?.('authorization') || req.headers?.authorization || '').trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(match[1], true);
    const email = String(decoded.email || '').trim().toLowerCase();
    if (!email || !AGENT_EMAILS.has(email)) return null;
    return { uid: decoded.uid, email, token: decoded };
  } catch (error) {
    console.warn('Jeton Firebase agent refusé :', error?.code || error?.message || error);
    return null;
  }
}

async function requireAgent(req, res) {
  const agent = await getAgentFromRequest(req);
  if (agent) return agent;
  res.status(401).json({
    success: false,
    error: 'Authentification agent requise.'
  });
  return null;
}

module.exports = { getAgentFromRequest, requireAgent, AGENT_EMAILS };
