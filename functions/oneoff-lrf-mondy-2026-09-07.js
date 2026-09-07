const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'le-roy-factory' });
const db = admin.firestore();

(async () => {
  const lrf = 'LRF-00001-34';
  const collections = await db.listCollections();
  const duplicates = [];
  for (const col of collections) {
    const snap = await col.get();
    for (const d of snap.docs) {
      const data = d.data() || {};
      for (const [k,v] of Object.entries(data)) {
        if (typeof v === 'string' && v.trim().toUpperCase() === lrf) {
          duplicates.push({collection: col.id, id:d.id, field:k});
        }
      }
    }
  }
  if (duplicates.length) {
    console.error('LRF_DUPLICATE', JSON.stringify(duplicates));
    process.exit(2);
  }

  const cs = await db.collection('clients').get();
  const matches = cs.docs.filter(d => {
    const x=d.data()||{};
    const s=String(x.societe||'').toLowerCase();
    const c=String(x.contact||'').toLowerCase();
    return s.includes('union') && s.includes('mat') && (s.includes('montpellier') || c.includes('mondy'));
  });
  if (matches.length !== 1) {
    console.error('MONDY_MATCHES=' + matches.length);
    process.exit(3);
  }

  const ref = matches[0].ref;
  const snap = await ref.get();
  const current = snap.data() || {};
  const baseNote = String(current.notes || '').trim();
  const extra = [
    'N° client LRF : ' + lrf,
    'Contact : Marie-Claire MONDY — Cheffe produit Carrelage et revêtement de sol.',
    'Portable : 06 18 36 25 29 — Fixe : 04 67 20 92 26.'
  ].join('\n');
  const notes = baseNote.includes('N° client LRF :') ? baseNote : [baseNote, extra].filter(Boolean).join('\n\n');

  await ref.update({
    numeroClientLRF: lrf,
    codeClientLRF: lrf,
    adresse: '287 Avenue de Boirargues, CS 19001',
    codePostal: '34965',
    ville: 'Montpellier Cedex 2',
    contact: 'Marie-Claire MONDY',
    fonction: 'Cheffe produit Carrelage et revêtement de sol',
    email: 'mc.mondy@union-materiaux.fr',
    telephones: ['06 18 36 25 29', '04 67 20 92 26'],
    telephone: '06 18 36 25 29',
    telephoneFixe: '04 67 20 92 26',
    notes
  });

  const verify = (await ref.get()).data() || {};
  console.log('UPDATED_CLIENT=' + ref.id);
  console.log('LRF=' + verify.numeroClientLRF);
  console.log('ADDRESS=' + verify.adresse + ' | ' + verify.codePostal + ' ' + verify.ville);
  console.log('CONTACT=' + verify.contact + ' | ' + verify.fonction);
  console.log('EMAIL=' + verify.email);
  console.log('PHONES=' + (verify.telephones || []).join(' / '));
})().catch(e=>{console.error(e); process.exit(1);});