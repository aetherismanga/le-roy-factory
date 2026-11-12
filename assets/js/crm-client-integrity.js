import { db, auth, verifiedAgentProfile } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, doc, getDocs, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { clean, active, norm, postal, phones, normPhone, safeDuplicate, duplicateGroups, chooseCanonical, mergedPayload, resolveCanonical } from './crm-client-integrity-core.mjs?v=20261105-audit1';

// Single audit engine. Ambiguous names, codes and towns never trigger a merge.
// Transactions re-read every source; archived aliases retain their original
// content and historic IDs so reports, files and authentication references survive.
let latestClients = [];
let activeCanonicalId = null;
const aliasToCanonical = new Map();

function rebuildAliasMaps(rows) {
  aliasToCanonical.clear();
  const existing = new Set(rows.map(row => row.id));
  rows.forEach(row => {
    const canonical = clean(row.canonicalClientId || row.duplicateOf);
    if (canonical && canonical !== row.id && existing.has(canonical)) aliasToCanonical.set(row.id, canonical);
  });
}
export const canonicalId = id => resolveCanonical(id, aliasToCanonical);

export async function repairDuplicates() {
  const snapshot = await getDocs(collection(db, 'clients'));
  const all = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
  const groups = duplicateGroups(all);
  let mergedGroups = 0;
  for (const group of groups) {
    // Keep transactions bounded. Huge clusters require a manual investigation.
    if (group.length > 50) { console.warn('CRM : groupe de doublons trop large, laissé intact.', group.map(row => row.id)); continue; }
    const changed = await runTransaction(db, async transaction => {
      const refs = group.map(row => doc(db, 'clients', row.id));
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      if (snapshots.some(item => !item.exists())) return false;
      const current = snapshots.map(item => ({ ...item.data(), id: item.id }));
      if (!current.every((left, index) => current.slice(index + 1).every(right => safeDuplicate(left, right)))) return false;
      const canonical = chooseCanonical(current);
      const now = new Date().toISOString();
      transaction.set(doc(db, 'clients', canonical.id), mergedPayload(current, canonical, now), { merge: true });
      current.filter(row => row.id !== canonical.id).forEach(alias => {
        // Do not overwrite the original fields on aliases, even on the first merge.
        transaction.update(doc(db, 'clients', alias.id), {
          archived: true, archive: true, canonicalClientId: canonical.id, duplicateOf: canonical.id,
          duplicateArchivedAt: now, duplicateReason: 'doublon confirmé par identité et coordonnées du magasin'
        });
      });
      return true;
    });
    if (changed) mergedGroups += 1;
  }
  window.dispatchEvent(new CustomEvent('lrf-client-dedupe-complete', { detail: { groups: mergedGroups } }));
  return mergedGroups;
}

function decorateRows() {
  const rows = latestClients.filter(active);
  document.querySelectorAll('#clients-table-body tr').forEach(row => {
    if (row.querySelectorAll('td').length < 7) return;
    const id = clean(row.dataset.clientId || row.dataset.id);
    if (id && rows.some(client => client.id === id)) { row.dataset.clientId = id; return; }
    const company = norm(row.querySelector('td:nth-child(2) strong')?.textContent);
    const code = clean(row.querySelector('td:nth-child(3)')?.textContent).match(/\b\d{5}\b/)?.[0];
    const phone = normPhone(row.querySelector('td:nth-child(5)')?.textContent);
    const candidates = rows.filter(client => norm(client.societe) === company && (!code || postal(client.codePostal || client.code_postal) === code) && (!phone || phones(client).includes(phone)));
    // Never select an arbitrary member of a chain with the same company name.
    if (candidates.length === 1) row.dataset.clientId = candidates[0].id;
  });
}
function dispatchOpened(id) {
  const canonical = canonicalId(id);
  if (!canonical || activeCanonicalId === canonical) return;
  activeCanonicalId = canonical;
  window.dispatchEvent(new CustomEvent('lrf-client-opened', { detail: { clientId: canonical } }));
}
function installUiGuards() {
  const tbody = document.getElementById('clients-table-body');
  if (tbody) new MutationObserver(decorateRows).observe(tbody, { childList: true });
  document.addEventListener('click', event => {
    const row = event.target.closest('#clients-table-body tr');
    if (row) { decorateRows(); dispatchOpened(clean(row.dataset.clientId)); }
    if (event.target.closest('#btn-add-client')) activeCanonicalId = null;
  }, true);
  window.addEventListener('lrf-client-opened', event => { activeCanonicalId = canonicalId(event.detail?.clientId); });
  window.addEventListener('lrf-client-closed', () => { activeCanonicalId = null; });
  // Form saves are owned by clients.html. No delayed duplicate write: a failed
  // save must not be silently committed by a different script 180 ms later.
}
async function boot() {
  installUiGuards();
  // Opening the page never merges or archives clients. Repairs are explicit maintenance.
  const snapshot = await getDocs(collection(db, 'clients')).catch(() => null);
  if (snapshot) latestClients = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
  rebuildAliasMaps(latestClients);
  const params = new URLSearchParams(location.search);
  const id = clean(params.get('edit'));
  const canonical = canonicalId(id);
  if (id && canonical && id !== canonical) {
    params.set('edit', canonical);
    history.replaceState(null, '', `${location.pathname}?${params}${location.hash || ''}`);
  }
  onSnapshot(collection(db, 'clients'), current => {
    latestClients = current.docs.map(item => ({ ...item.data(), id: item.id }));
    rebuildAliasMaps(latestClients);
    decorateRows();
  }, error => console.warn('Suivi intégrité clients', error));
}
let resolveReady;
export const ready = new Promise(resolve => { resolveReady = resolve; });
if (!window.__LRF_CRM_CLIENT_INTEGRITY__) {
  window.__LRF_CRM_CLIENT_INTEGRITY__ = ready;
  const start = () => {
    const stop = onAuthStateChanged(auth,async user=>{
      if(!await verifiedAgentProfile(user))return;
      stop(); boot().finally(resolveReady);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
} else {
  Promise.resolve(window.__LRF_CRM_CLIENT_INTEGRITY__).finally(resolveReady);
}
