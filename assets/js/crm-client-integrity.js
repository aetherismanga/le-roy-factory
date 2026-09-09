import { db } from './firebase.js';
import {
  collection, doc, getDocs, getDoc, onSnapshot, updateDoc, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Répare les doublons de fiches clients sans supprimer de document :
// - fusion des données sur une fiche canonique ;
// - archivage des doublons détectés de façon conservatrice ;
// - conservation des anciens IDs/codes comme alias ;
// - synchronisation de la fiche réellement ouverte pour éviter les mélanges de partenaires.

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const cp = v => clean(v).replace(/\D/g, '').padStart(5, '0');
const normPhone = v => clean(v).replace(/[^+\d]/g, '').replace(/^0033/, '+33').replace(/^0/, '+33');
const normEmail = v => clean(v).toLowerCase();
const array = v => Array.isArray(v) ? v : [];
const nowIso = () => new Date().toISOString();

let latestClients = [];
let activeCanonicalId = null;
let repairing = false;
let repaired = false;
const aliasToCanonical = new Map();
const canonicalToAliases = new Map();

function active(c) { return c && c.archived !== true && c.archive !== true; }
function lrfNumber(v) { const m = clean(v).match(/^LRF-(\d{5})$/i); return m ? Number(m[1]) : Number.POSITIVE_INFINITY; }
function phones(c) {
  return [...new Set([...array(c?.telephones), c?.telephone, c?.mobile, c?.portable].map(normPhone).filter(Boolean))];
}
function emails(c) {
  return [...new Set([...array(c?.emails), c?.email, c?.mail, c?.eMail].map(normEmail).filter(Boolean))];
}
function address(c) { return norm(c?.adresse || c?.address || ''); }
function locality(c) { return `${cp(c?.codePostal || c?.code_postal)}|${norm(c?.ville)}`; }
function identityRichness(c) {
  return [address(c), phones(c).length ? 'p' : '', emails(c).length ? 'e' : '', norm(c?.contact)].filter(Boolean).length;
}
function score(c) {
  return (clean(c?.codeClient) ? 8 : 0)
    + (clean(c?.moovagoId) ? 9 : 0)
    + Math.min(8, array(c?.partenaires).length * 2)
    + Math.min(8, array(c?.contacts).length * 2)
    + Math.min(8, array(c?.comptes_rendus || c?.comptesRendus).length)
    + Math.min(5, array(c?.historiqueMails).length)
    + (address(c) ? 3 : 0) + (phones(c).length ? 3 : 0) + (emails(c).length ? 3 : 0)
    + (clean(c?.notes) ? 2 : 0) + (clean(c?.categorieActivite || c?.sousCategorie) ? 2 : 0);
}

function intersects(a, b) { const s = new Set(a); return b.some(v => s.has(v)); }
function safeDuplicate(a, b) {
  if (!a || !b || a.id === b.id || norm(a.societe) !== norm(b.societe) || !norm(a.societe)) return false;

  const ma = clean(a.moovagoId), mb = clean(b.moovagoId);
  if (ma && mb) return ma === mb;
  const ca = clean(a.codeClient).toUpperCase(), cb = clean(b.codeClient).toUpperCase();
  if (ca && cb && ca === cb) return true;

  const pa = phones(a), pb = phones(b), ea = emails(a), eb = emails(b);
  if (pa.length && pb.length && intersects(pa, pb)) return true;
  if (ea.length && eb.length && intersects(ea, eb)) return true;
  if (address(a) && address(b) && address(a) === address(b) && locality(a) === locality(b)) return true;

  const sameLocality = locality(a) !== '00000|' && locality(a) === locality(b);
  if (!sameLocality) return false;

  const conflictingAddress = address(a) && address(b) && address(a) !== address(b);
  const conflictingPhone = pa.length && pb.length && !intersects(pa, pb);
  const conflictingEmail = ea.length && eb.length && !intersects(ea, eb);
  if (conflictingAddress || conflictingPhone || conflictingEmail) return false;

  // Cas typique du doublon observé : même enseigne + même ville/CP,
  // avec une fiche riche et une seconde fiche partiellement vide.
  return identityRichness(a) <= 1 || identityRichness(b) <= 1;
}

function uniquePrimitive(values, key = v => clean(v)) {
  const out = [], seen = new Set();
  values.forEach(v => { const k = key(v); if (k && !seen.has(k)) { seen.add(k); out.push(v); } });
  return out;
}
function uniqueObjects(values, keyFn) {
  const out = [], seen = new Set();
  values.forEach(v => {
    if (!v || typeof v !== 'object') return;
    const k = keyFn(v) || JSON.stringify(v);
    if (!seen.has(k)) { seen.add(k); out.push(v); }
  });
  return out;
}
function contactKey(c) {
  return clean(c?.moovagoId) ? `m:${clean(c.moovagoId)}`
    : normEmail(c?.email) ? `e:${normEmail(c.email)}`
      : normPhone(c?.mobile || c?.telephone || c?.fixe) ? `p:${normPhone(c.mobile || c.telephone || c.fixe)}`
        : `n:${norm(c?.prenom)}:${norm(c?.nom)}:${norm(c?.fonction)}`;
}
function crKey(x) {
  return clean(x?.moovagoId) ? `m:${clean(x.moovagoId)}` : `${clean(x?.date || x?.dateCreation)}|${norm(x?.type)}|${norm(x?.text || x?.note)}`;
}
function mailKey(x) { return `${clean(x?.date)}|${norm(x?.objet)}|${norm(x?.expediteur)}|${array(x?.destinataires).map(normEmail).sort().join(',')}`; }
function docKey(x) { return `${clean(x?.url)}|${norm(x?.nom || x?.name)}`; }

function chooseCanonical(records) {
  const withCode = records.filter(c => Number.isFinite(lrfNumber(c.codeClient))).sort((a, b) => lrfNumber(a.codeClient) - lrfNumber(b.codeClient));
  if (withCode.length) return withCode[0];
  return [...records].sort((a, b) => score(b) - score(a))[0];
}

function mergedPayload(records, canonical) {
  const richest = [...records].sort((a, b) => score(b) - score(a));
  const pick = (...keys) => {
    for (const r of richest) for (const k of keys) if (clean(r?.[k])) return r[k];
    return '';
  };
  const allPhones = uniquePrimitive(records.flatMap(phones), normPhone);
  const allEmails = uniquePrimitive(records.flatMap(emails), normEmail);
  const allCodes = uniquePrimitive(records.flatMap(r => [r.codeClient, ...array(r.codesLRF)]).filter(Boolean), v => clean(v).toUpperCase());
  const notes = uniquePrimitive(records.map(r => clean(r.notes)).filter(Boolean), norm).join('\n\n---\n');

  return {
    type: records.some(r => norm(r.type) === 'client') ? 'client' : pick('type') || 'client',
    societe: pick('societe'),
    adresse: pick('adresse', 'address'),
    codePostal: pick('codePostal', 'code_postal'),
    ville: pick('ville'),
    departement: pick('departement', 'Dept'),
    region: pick('region'), pays: pick('pays') || 'FR', site: pick('site'),
    contact: pick('contact'),
    telephone: allPhones[0] || pick('telephone'), telephones: allPhones,
    email: allEmails[0] || pick('email', 'mail', 'eMail'), emails: allEmails,
    notes,
    agent: pick('agent'),
    categorieActivite: pick('categorieActivite', 'sousCategorie'),
    sousCategorie: pick('sousCategorie', 'categorieActivite'),
    segmentation: pick('segmentation'), motsCles: pick('motsCles'),
    moovagoId: pick('moovagoId'), moovagoPseudo: pick('moovagoPseudo'),
    moovagoDernierSuivi: pick('moovagoDernierSuivi'), moovagoCarte: pick('moovagoCarte'),
    partenaires: uniquePrimitive(records.flatMap(r => array(r.partenaires))),
    contacts: uniqueObjects(records.flatMap(r => array(r.contacts)), contactKey),
    comptes_rendus: uniqueObjects(records.flatMap(r => array(r.comptes_rendus || r.comptesRendus)), crKey),
    historiqueMails: uniqueObjects(records.flatMap(r => array(r.historiqueMails)), mailKey),
    documents: uniqueObjects(records.flatMap(r => array(r.documents)), docKey),
    codeClient: clean(canonical.codeClient) || allCodes[0] || '',
    codesLRF: allCodes,
    integrityMergedAt: nowIso(),
    archived: false,
    archive: false
  };
}

function rebuildAliasMaps(rows) {
  aliasToCanonical.clear(); canonicalToAliases.clear();
  rows.forEach(c => {
    const canonical = clean(c.canonicalClientId || c.duplicateOf);
    if (!canonical || !c.id || canonical === c.id) return;
    aliasToCanonical.set(c.id, canonical);
    if (!canonicalToAliases.has(canonical)) canonicalToAliases.set(canonical, []);
    canonicalToAliases.get(canonical).push(c.id);
  });
}
function canonicalId(id) { return aliasToCanonical.get(id) || id || null; }

async function repairDuplicates() {
  if (repairing || repaired) return;
  repairing = true;
  try {
    const snap = await getDocs(collection(db, 'clients'));
    const all = [];
    snap.forEach(d => all.push({ id: d.id, ...d.data() }));
    rebuildAliasMaps(all);

    const activeRows = all.filter(active);
    const byName = new Map();
    activeRows.forEach(c => {
      const k = norm(c.societe);
      if (!k) return;
      if (!byName.has(k)) byName.set(k, []);
      byName.get(k).push(c);
    });

    let repairedGroups = 0;
    for (const group of byName.values()) {
      if (group.length < 2) continue;
      const remaining = [...group];
      while (remaining.length > 1) {
        const seed = remaining.shift();
        const component = [seed];
        for (let i = remaining.length - 1; i >= 0; i -= 1) {
          if (component.some(x => safeDuplicate(x, remaining[i]))) component.push(remaining.splice(i, 1)[0]);
        }
        if (component.length < 2) continue;

        const canonical = chooseCanonical(component);
        const merged = mergedPayload(component, canonical);
        const aliases = component.filter(c => c.id !== canonical.id);
        const batch = writeBatch(db);
        batch.set(doc(db, 'clients', canonical.id), {
          ...merged,
          canonicalClientId: canonical.id,
          duplicateAliasIds: uniquePrimitive([...(canonical.duplicateAliasIds || []), ...aliases.map(x => x.id)])
        }, { merge: true });
        aliases.forEach(alias => {
          const mirror = { ...merged };
          // L'ancien code client reste valide et unique sur l'alias archivé.
          if (clean(alias.codeClient)) mirror.codeClient = alias.codeClient;
          mirror.archived = true;
          mirror.archive = true;
          mirror.canonicalClientId = canonical.id;
          mirror.duplicateOf = canonical.id;
          mirror.duplicateArchivedAt = nowIso();
          mirror.duplicateReason = 'doublon CRM fusionné automatiquement';
          batch.set(doc(db, 'clients', alias.id), mirror, { merge: true });
          aliasToCanonical.set(alias.id, canonical.id);
        });
        await batch.commit();
        repairedGroups += 1;
      }
    }
    if (repairedGroups) console.info(`CRM : ${repairedGroups} groupe(s) de doublons fusionné(s).`);
    repaired = true;
  } catch (error) {
    console.error('Réparation intégrité fiches clients', error);
  } finally {
    repairing = false;
  }
}

function rowCompany(row) { return clean(row?.querySelector('td:nth-child(2) strong')?.textContent || row?.querySelector('td:nth-child(2)')?.childNodes?.[0]?.textContent); }
function rowCp(row) { const m = clean(row?.querySelector('td:nth-child(3)')?.textContent).match(/\b\d{5}\b/); return m ? m[0] : ''; }
function rowPhone(row) { return normPhone(row?.querySelector('td:nth-child(5)')?.textContent); }

function decorateRows() {
  const activeRows = latestClients.filter(active);
  document.querySelectorAll('#clients-table-body tr').forEach(row => {
    if (row.querySelectorAll('td').length < 7) return;
    const existing = clean(row.dataset.clientId);
    if (existing && activeRows.some(c => c.id === existing)) return;
    const name = norm(rowCompany(row)), postal = rowCp(row), phone = rowPhone(row);
    let candidates = activeRows.filter(c => norm(c.societe) === name);
    if (postal) {
      const narrowed = candidates.filter(c => cp(c.codePostal || c.code_postal) === postal);
      if (narrowed.length) candidates = narrowed;
    }
    if (phone && candidates.length > 1) {
      const narrowed = candidates.filter(c => phones(c).includes(phone));
      if (narrowed.length) candidates = narrowed;
    }
    if (candidates.length === 1) row.dataset.clientId = candidates[0].id;
  });
}

function dispatchOpened(id) {
  const canonical = canonicalId(id);
  if (!canonical) return;
  activeCanonicalId = canonical;
  window.dispatchEvent(new CustomEvent('lrf-client-opened', { detail: { clientId: canonical } }));
}

async function mirrorPatch(canonical, patch) {
  if (!canonical || !patch || typeof patch !== 'object') return;
  const aliases = canonicalToAliases.get(canonical) || [];
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'clients', canonical), patch, { merge: true });
    aliases.forEach(id => batch.set(doc(db, 'clients', id), patch, { merge: true }));
    await batch.commit();
  } catch (error) {
    console.warn('Synchronisation des alias client', error);
  }
}

function readContactsFromModal() {
  return [...document.querySelectorAll('#crm-contacts-list .contact-card')].map(row => {
    const out = {};
    row.querySelectorAll('input[data-k]').forEach(input => { out[input.dataset.k] = input.value.trim(); });
    return out;
  }).filter(c => Object.values(c).some(Boolean));
}

function formPatch() {
  const val = id => clean(document.getElementById(id)?.value);
  const phoneValues = [...document.querySelectorAll('#phones-container .phone-input')].map(x => clean(x.value)).filter(Boolean);
  const patch = {
    type: val('edit-type') || 'client', societe: val('edit-societe'), adresse: val('edit-adresse'),
    codePostal: val('edit-code-postal'), ville: val('edit-ville'), contact: val('edit-contact'),
    email: val('edit-email'), telephone: phoneValues[0] || '', telephones: uniquePrimitive(phoneValues, normPhone),
    notes: val('edit-notes'), integrityUpdatedAt: nowIso()
  };
  // Ne jamais écraser les e-mails secondaires fusionnés par le réparateur.
  // Les champs injectés ne sont copiés que s'ils sont réellement présents dans la modale.
  if (document.getElementById('edit-activity')) patch.categorieActivite = val('edit-activity');
  if (document.getElementById('crm-contacts-list')) patch.contacts = readContactsFromModal();
  const partnerGrid = document.getElementById('crm-partner-grid');
  if (partnerGrid) patch.partenaires = uniquePrimitive([...partnerGrid.querySelectorAll('.partner-card-mini.active[data-pid]')].map(x => clean(x.dataset.pid)).filter(Boolean));
  return patch;
}

function installUiGuards() {
  const tbody = document.getElementById('clients-table-body');
  if (tbody) new MutationObserver(() => setTimeout(decorateRows, 0)).observe(tbody, { childList: true, subtree: true });
  decorateRows();

  document.addEventListener('click', event => {
    const row = event.target.closest('#clients-table-body tr');
    if (row) {
      decorateRows();
      const id = clean(row.dataset.clientId);
      if (id) dispatchOpened(id);
    }
    if (event.target.closest('#btn-add-client')) activeCanonicalId = null;
  }, true);

  const modal = document.getElementById('client-modal');
  if (modal) new MutationObserver(() => {
    if (getComputedStyle(modal).display === 'none') return;
    const qid = clean(new URLSearchParams(location.search).get('edit'));
    if (qid) dispatchOpened(qid);
    else if (activeCanonicalId) dispatchOpened(activeCanonicalId);
  }).observe(modal, { attributes: true, attributeFilter: ['style'] });

  document.getElementById('client-form')?.addEventListener('submit', () => {
    const id = canonicalId(activeCanonicalId);
    if (!id) return;
    const patch = formPatch();
    setTimeout(() => mirrorPatch(id, patch), 180);
  }, true);

  window.addEventListener('lrf-client-partners-saved', event => {
    const id = canonicalId(clean(event.detail?.clientId));
    if (!id) return;
    const partenaires = uniquePrimitive(array(event.detail?.partenaires));
    mirrorPatch(id, { partenaires, partenairesUpdatedAt: nowIso() });
  });
}

async function redirectArchivedEditAlias() {
  const params = new URLSearchParams(location.search);
  const id = clean(params.get('edit'));
  const canonical = canonicalId(id);
  if (!id || !canonical || id === canonical) return;
  params.set('edit', canonical);
  const qs = params.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash || ''}`);
  activeCanonicalId = canonical;
}

async function boot() {
  await repairDuplicates();
  const snap = await getDocs(collection(db, 'clients')).catch(() => null);
  if (snap) {
    latestClients = [];
    snap.forEach(d => latestClients.push({ id: d.id, ...d.data() }));
    rebuildAliasMaps(latestClients);
  }
  await redirectArchivedEditAlias();
  installUiGuards();

  onSnapshot(collection(db, 'clients'), snap2 => {
    latestClients = [];
    snap2.forEach(d => latestClients.push({ id: d.id, ...d.data() }));
    rebuildAliasMaps(latestClients);
    setTimeout(decorateRows, 0);
  }, error => console.warn('Suivi intégrité clients', error));
}

let resolveReady;
export const ready = new Promise(resolve => { resolveReady = resolve; });
if (!window.__LRF_CRM_CLIENT_INTEGRITY__) {
  window.__LRF_CRM_CLIENT_INTEGRITY__ = true;
  const start = () => boot().finally(() => resolveReady());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
} else {
  resolveReady();
}
