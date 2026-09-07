const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp({ projectId: 'le-roy-factory' });
const db = admin.firestore();

const normalize = (v) => String(v || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const report = {
  date: '2026-09-07',
  author: 'Jérôme Hugol',
  text: `Bon contact avec Mme Mondy. Rendez-vous d’une durée de 1 h 20.

À vérifier : code client. Mme Mondy indique qu’un compte a été ouvert en 2008 puis actualisé en 2025, mais je ne retrouve rien dans la base clients.

CERSAIE : Mme Mondy prévoit de venir entre lundi et mardi et doit nous confirmer par mail le jour exact de sa venue. Intérêt marqué pour ELIOS et NEOBATH.

Elle fera son choix de carreaux en vrac au CERSAIE sur les séries : Pool, Segmento, Dust, Glow, Domus et Shell.

Condition vrac : ils prennent uniquement du vrac avec les étiquettes au dos, jamais sur la face avant.

À prévoir : une boîte de Skultura pour le magasin VOLUM.

Suivi documentation : elle disposait des catalogues 2025 remis lors du premier rendez-vous du 8 octobre 2025. Mise à jour effectuée aujourd’hui avec remise du catalogue 2026 ainsi que des échantillons Pool.`
};

(async () => {
  const snap = await db.collection('clients').get();
  let candidates = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => {
    const n = normalize(c.societe || c.nom || c.entreprise);
    return n.includes('union materiaux');
  });

  const montpellier = candidates.filter(c => {
    const hay = normalize([c.ville, c.adresse, c.adresse1, c.adresse2, c.codePostal, c.code_postal].filter(Boolean).join(' '));
    return hay.includes('montpellier') || /\b34000\b|\b34070\b|\b34080\b|\b34090\b/.test(hay);
  });
  if (montpellier.length === 1) candidates = montpellier;

  if (candidates.length !== 1) {
    console.error('CLIENT_MATCH_COUNT=' + candidates.length);
    for (const c of candidates) {
      console.error('CANDIDATE', c.id, c.societe || c.nom || '', c.ville || '', c.codePostal || c.code_postal || '');
    }
    process.exit(2);
  }

  const client = candidates[0];
  const ref = db.collection('clients').doc(client.id);
  const fresh = await ref.get();
  const data = fresh.data() || {};
  const existing = Array.isArray(data.comptes_rendus)
    ? data.comptes_rendus
    : (Array.isArray(data.comptesRendus) ? data.comptesRendus : []);

  const signature = normalize(report.text).slice(0, 140);
  const duplicate = existing.some(cr => cr && cr.date === report.date && normalize(cr.text || cr.texte || cr.notes).slice(0, 140) === signature);

  if (duplicate) {
    console.log('ALREADY_PRESENT client=' + client.id + ' societe=' + (client.societe || client.nom || ''));
    return;
  }

  await ref.update({ comptes_rendus: [report, ...existing] });
  console.log('REPORT_ADDED client=' + client.id + ' societe=' + (client.societe || client.nom || '') + ' total=' + (existing.length + 1));
})().catch(err => {
  console.error(err);
  process.exit(1);
});
