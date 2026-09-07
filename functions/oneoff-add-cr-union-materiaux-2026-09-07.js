const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp({ projectId: 'le-roy-factory' });
const db = admin.firestore();

const normalize = (v) => String(v || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

(async () => {
  const snap = await db.collection('clients').get();
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const terms = ['union', 'materiaux', 'mondy', 'volum', 'montpellier'];
  const hits = rows.map(c => {
    const scalars = Object.entries(c)
      .filter(([,v]) => ['string','number'].includes(typeof v))
      .map(([k,v]) => `${k}:${v}`).join(' | ');
    const n = normalize(scalars);
    const matched = terms.filter(t => n.includes(normalize(t)));
    return { c, matched };
  }).filter(x => x.matched.length > 0)
    .sort((a,b) => b.matched.length - a.matched.length);

  console.log('DISCOVERY_HITS=' + hits.length);
  for (const {c, matched} of hits.slice(0, 40)) {
    console.log('HIT', matched.join(','), '|', c.id, '|', c.societe || c.nom || c.entreprise || '', '|', c.ville || '', '|', c.codePostal || c.code_postal || '', '|', c.adresse || c.adresse1 || '');
  }
  process.exit(2);
})().catch(err => { console.error(err); process.exit(1); });
