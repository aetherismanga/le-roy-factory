const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { requireAgent } = require('./auth');
const { clientFromSessionToken } = require('./pro-session');
const { writeClientActivity, EVENTS } = require('./lrf-analytics-core');

const db = admin.firestore();
const ALLOWED_ORIGINS = ['https://leroyfactory.fr', 'https://www.leroyfactory.fr'];

function cors(req, res, agent = false) {
  const origin = String(req.headers.origin || '');
  res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : 'https://leroyfactory.fr');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', agent ? 'Content-Type, Authorization' : 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
}

function clean(v, max = 180) { return String(v || '').trim().slice(0, max); }
function tsMs(v) { return v?.toMillis?.() || (v ? new Date(v).getTime() : 0) || 0; }
function dateKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function pageLabel(page, title) {
  const p = clean(page, 180);
  const labels = {
    '/':'Accueil', '/index.html':'Accueil', '/univers.html':'Inspirations & Produits', '/catalogues.html':'Catalogues',
    '/partenaires.html':'Partenaires', '/realisations.html':'Réalisations', '/tarifs-pro.html':'Accès PRO', '/contact.html':'Contact',
    '/configurateurs.html':'Configurateurs'
  };
  if (labels[p]) return labels[p];
  if (p.startsWith('tarif:')) return `Tarif ${p.slice(6).replace(/-/g,' ').toUpperCase()}`;
  return clean(title, 80) || p.replace(/^\//,'') || 'Page';
}

function scoreClient(stats, now) {
  if (!stats.lastSeen) return { score: 0, label: 'Froid', reasons: [] };
  const days = (now - stats.lastSeen) / 86400000;
  let score = days <= 1 ? 40 : days <= 3 ? 32 : days <= 7 ? 24 : days <= 14 ? 14 : days <= 30 ? 6 : 0;
  score += Math.min(25, stats.views30 * 2);
  score += Math.min(15, stats.pages.size * 3);
  score += Math.min(15, stats.tariffs30 * 5);
  score += Math.min(10, stats.activeDays.size * 2);
  score = Math.min(100, Math.round(score));
  const reasons = [];
  if (days <= 3) reasons.push('activité très récente');
  else if (days <= 7) reasons.push('activité cette semaine');
  if (stats.views30 >= 5) reasons.push(`${stats.views30} vues sur 30 j`);
  if (stats.tariffs30) reasons.push(`${stats.tariffs30} tarif${stats.tariffs30 > 1 ? 's' : ''} consulté${stats.tariffs30 > 1 ? 's' : ''}`);
  if (stats.pages.size >= 3) reasons.push(`${stats.pages.size} pages différentes`);
  return { score, label: score >= 65 ? 'Très chaud' : score >= 45 ? 'Chaud' : score >= 25 ? 'Tiède' : 'Froid', reasons };
}

const trackLrfActivity = onRequest({ timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  if (cors(req, res, false)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false });
  try {
    const result = await clientFromSessionToken(req.body?.sessionToken, { renew: false });
    if (!result?.client) return res.status(401).json({ success: false });
    const action = clean(req.body?.action || 'page_view', 40);
    if (!['page_view','partner_view','product_view'].includes(action)) return res.status(400).json({ success: false });
    await writeClientActivity(result.client, {
      action,
      page: clean(req.body?.page, 180),
      title: clean(req.body?.title, 180),
      device: clean(req.body?.device, 20),
      partner: clean(req.body?.partner, 80)
    });
    return res.json({ success: true });
  } catch (e) {
    console.error('trackLrfActivity', e);
    return res.status(500).json({ success: false });
  }
});

const getLrfAnalytics = onRequest({ timeoutSeconds: 60, memory: '512MiB' }, async (req, res) => {
  if (cors(req, res, true)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  const agent = await requireAgent(req, res);
  if (!agent) return;
  try {
    const now = Date.now();
    const d7 = now - 7 * 86400000, d30 = now - 30 * 86400000, d90 = now - 90 * 86400000;
    const [clientSnap, eventSnap] = await Promise.all([
      db.collection('clients').get(),
      db.collection(EVENTS).orderBy('createdAt', 'desc').limit(6000).get()
    ]);
    const clients = new Map();
    clientSnap.forEach(doc => clients.set(doc.id, { id: doc.id, ...doc.data() }));
    const byClient = new Map();
    const pageCounts30 = new Map();
    let views7 = 0, views30 = 0;

    eventSnap.forEach(doc => {
      const e = doc.data() || {}, ms = tsMs(e.createdAt);
      if (!ms || ms < d90 || !e.clientId) return;
      if (!byClient.has(e.clientId)) byClient.set(e.clientId, { lastSeen:0, views7:0, views30:0, views90:0, tariffs30:0, pages:new Map(), activeDays:new Set(), lastAction:'', lastPage:'' });
      const s = byClient.get(e.clientId);
      s.lastSeen = Math.max(s.lastSeen, ms); s.views90 += 1; s.lastAction = e.action || ''; s.lastPage = e.page || '';
      if (ms >= d30) {
        s.views30 += 1; views30 += 1; s.activeDays.add(dateKey(ms));
        const label = pageLabel(e.page, e.title); s.pages.set(label, (s.pages.get(label)||0)+1); pageCounts30.set(label, (pageCounts30.get(label)||0)+1);
        if (e.action === 'tariff_view') s.tariffs30 += 1;
      }
      if (ms >= d7) { s.views7 += 1; views7 += 1; }
    });

    const rows = [];
    for (const [clientId, stats] of byClient) {
      const c = clients.get(clientId) || {};
      const heat = scoreClient(stats, now);
      const topPage = [...stats.pages.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || pageLabel(stats.lastPage,'');
      rows.push({
        id: clientId,
        codeClient: String(c.codeClient || '').toUpperCase(),
        societe: c.societe || 'Client',
        departement: c.departement || '',
        ville: c.ville || '',
        contact: c.contact || c.interlocuteur || '',
        email: c.email || '',
        telephone: c.telephone || '',
        partenaires: Array.isArray(c.partenaires) ? c.partenaires : [],
        lastSeenAt: stats.lastSeen,
        views7: stats.views7,
        views30: stats.views30,
        views90: stats.views90,
        tariffViews30: stats.tariffs30,
        distinctPages30: stats.pages.size,
        topPage,
        heatScore: heat.score,
        heatLabel: heat.label,
        heatReasons: heat.reasons
      });
    }
    rows.sort((a,b)=>b.heatScore-a.heatScore || b.lastSeenAt-a.lastSeenAt);
    const hotClients = rows.filter(r=>r.heatScore>=45);
    const active7 = rows.filter(r=>r.lastSeenAt>=d7).length;
    const active30 = rows.filter(r=>r.lastSeenAt>=d30).length;
    const pages = [...pageCounts30.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,25);

    return res.json({
      success:true,
      generatedAt:now,
      agent:agent.email,
      general:{trackedClients:rows.length,active7,active30,views7,views30,hotClients:hotClients.length},
      clients:rows,
      pages,
      hotClients
    });
  } catch (e) {
    console.error('getLrfAnalytics', e);
    return res.status(500).json({ success:false, error:'Analyse LRF indisponible.' });
  }
});

module.exports = { trackLrfActivity, getLrfAnalytics };
