const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'le-roy-factory' });
const db = admin.firestore();

(async () => {
  const collections = await db.listCollections();
  const hits = [];
  for (const col of collections) {
    const snap = await col.get();
    for (const d of snap.docs) {
      const data = d.data() || {};
      for (const [k,v] of Object.entries(data)) {
        if (typeof v !== 'string') continue;
        const m = v.match(/LRF[-\s]?(\d{5})[-\s]?(\d{2})/i);
        if (m) hits.push({collection: col.id, id:d.id, field:k, value:v, seq:Number(m[1]), dep:m[2]});
      }
    }
  }
  hits.sort((a,b)=>a.seq-b.seq || a.dep.localeCompare(b.dep));
  console.log('LRF_HITS=' + hits.length);
  for (const h of hits.slice(-80)) console.log('LRF', JSON.stringify(h));
  const h34 = hits.filter(h=>h.dep==='34');
  const used = new Set(h34.map(h=>h.seq));
  let next = h34.length ? Math.max(...h34.map(h=>h.seq))+1 : 1;
  while (used.has(next)) next++;
  console.log('NEXT_34=' + String(next).padStart(5,'0'));

  const cs = await db.collection('clients').get();
  const matches = cs.docs.filter(d => {
    const x=d.data()||{}; const s=String(x.societe||'').toLowerCase(); const c=String(x.contact||'').toLowerCase();
    return s.includes('union') && s.includes('mat') && (s.includes('montpellier') || c.includes('mondy'));
  });
  console.log('MONDY_MATCHES=' + matches.length);
  for (const d of matches) console.log('MONDY', d.id, JSON.stringify(d.data()));
})().catch(e=>{console.error(e); process.exit(1);});