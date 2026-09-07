const { onRequest } = require('firebase-functions/v2/https');
const base = require('./index');
const tariffAccess = require('./tariff-access');
const proSession = require('./pro-session');
const lrfAnalytics = require('./lrf-analytics');
const eliosStock = require('./elios-stock');
const eliosOrder = require('./elios-order');
const eliosCatalog = require('./elios-catalog-api');

Object.assign(exports, base, tariffAccess, proSession, lrfAnalytics, eliosStock, eliosOrder, eliosCatalog);

// La migration vers Storage privé est terminée. Cet endpoint temporaire reste
// présent uniquement pour éviter une suppression de fonction lors du déploiement,
// mais il ne peut plus lancer ni relancer une migration.
exports.initializeTariffStorage = onRequest({ timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  const origin = String(req.headers.origin || '');
  const allowed = ['https://leroyfactory.fr', 'https://www.leroyfactory.fr'];
  res.set('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : 'https://leroyfactory.fr');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  return res.status(410).json({ success: false, complete: true, error: 'Migration des tarifs terminée et verrouillée.' });
});
