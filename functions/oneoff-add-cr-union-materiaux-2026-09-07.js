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
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const exact = rows.filter(c => {
    const n = normalize(c.societe || c.nom || c.entreprise);
    return n.includes('union materiaux') && normalize(c.ville).includes('montpellier');
  });

  if (exact.length > 1) {
    console.error('MULTIPLE_EXACT_MATCHES=' + exact.length);
    process.exit(2);
  }

  if (exact.length === 1) {
    const client = exact[0];
    const ref = db.collection('clients').doc(client.id);
    const fresh = await ref.get();
    const data = fresh.data() || {};
    const existing = Array.isArray(data.comptes_rendus)
      ? data.comptes_rendus
      : (Array.isArray(data.comptesRendus) ? data.comptesRendus : []);
    const signature = normalize(report.text).slice(0, 140);
    const duplicate = existing.some(cr => cr && cr.date === report.date && normalize(cr.text || cr.texte || cr.notes).slice(0, 140) === signature);
    if (!duplicate) await ref.update({ comptes_rendus: [report, ...existing] });
    console.log((duplicate ? 'ALREADY_PRESENT' : 'REPORT_ADDED') + ' client=' + client.id + ' societe=' + (client.societe || ''));
    return;
  }

  const newClient = {
    type: 'client',
    societe: 'UNION MATÉRIAUX MONTPELLIER',
    adresse: '',
    codePostal: '',
    ville: 'Montpellier',
    contact: 'Mme Mondy',
    email: '',
    telephones: [],
    telephone: '',
    notes: 'Code client à vérifier : compte indiqué comme ouvert en 2008 puis actualisé en 2025.',
    documents: [],
    comptes_rendus: [report]
  };
  const created = await db.collection('clients').add(newClient);
  console.log('CLIENT_CREATED_AND_REPORT_ADDED client=' + created.id + ' societe=' + newClient.societe);
})().catch(err => { console.error(err); process.exit(1); });
