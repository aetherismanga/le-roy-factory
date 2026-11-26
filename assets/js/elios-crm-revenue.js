import { auth, db } from './firebase.js';
import { collection, getDocsFromServer } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { loadEliosCrmSales } from './elios-crm-sales.js';
import { reconcileEliosCrmSales } from './elios-crm-reconciliation.mjs';

let reconciliationSources;

function readCollection(name) {
  return getDocsFromServer(collection(db,name)).then(snapshot => snapshot.docs.map(row => ({...row.data(),id:row.id})));
}

export async function loadEliosCrmRevenue({clients} = {}) {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const sales = await loadEliosCrmSales();
  if (!sales || auth.currentUser?.uid !== uid) return null;
  if (reconciliationSources?.uid !== uid) {
    const sources = {uid,clients:null,mappings:readCollection('statistiques_lrf_mappings')};
    sources.mappings.catch(() => { if (reconciliationSources === sources) reconciliationSources = null; });
    reconciliationSources = sources;
  }
  const sources = reconciliationSources;
  if (!clients && !sources.clients) {
    sources.clients = readCollection('clients');
    sources.clients.catch(() => { sources.clients = null; });
  }
  const [population,mappings] = await Promise.all([clients || sources.clients,sources.mappings]);
  if (auth.currentUser?.uid !== uid) return null;
  return {...sales,...reconcileEliosCrmSales(sales.rows,population,mappings),uid};
}
