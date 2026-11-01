// Private catalogue rates stay in memory after live server authentication.
// Client partner lists stored in the browser never grant tariff access.
const ADMINS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const ENDPOINT = 'https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs';
const MAX_CACHE_AGE = 60 * 1000;
let verified = false, elios = Object.create(null), view = [], epoch = 0, currentAuth = null;
let accessStatus = 'signed-out';
const accessMessage = () => accessStatus === 'loading' ? 'Vérification de votre accès aux tarifs…' : accessStatus === 'error' ? 'Les tarifs n’ont pas pu être chargés. Réessayez.' : accessStatus === 'denied' ? 'Votre accès aux tarifs n’a pas été validé. Reconnectez-vous à l’espace PRO.' : 'Connectez-vous à l’espace PRO pour afficher vos tarifs.';
let allowedPartners = new Set(), validUntil = 0, principal = '', pending = null, refreshTimer = null, expiryTimer = null;
const normalise = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const partnerKey = v => ({elios:'elios-ceramica',eliosceramica:'elios-ceramica',view:'view-ceramica',viewceramica:'view-ceramica'})[normalise(v)] || '';
const keyFor = (p, f) => {
 const value = String(f || '').replaceAll(',', '.').replace(/[×*]/g, 'x'), m = value.match(/\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?/i);
 return normalise(p?.slug || p?.id) + '|' + (m ? m[0].replace(/\s/g, '').toLowerCase() : normalise(value)) + '|' + (/20\s*mm/i.test(value) ? '20' : 'standard');
};
const safeKey = v => typeof v === 'string' && v && v.length < 240 && !['__proto__', 'constructor', 'prototype'].includes(v);
const canAccess = partner => verified && Date.now() < validUntil && allowedPartners.has(partnerKey(partner));
function clear() {
 verified = false; elios = Object.create(null); view = []; allowedPartners = new Set(); validUntil = 0;
 clearTimeout(refreshTimer); clearTimeout(expiryTimer); refreshTimer = null; expiryTimer = null;
 for (const p of window.VIEW_CATALOGUE || []) for (const v of p.variants || []) for (const k of ['proPrice', 'proDetail', 'proPalette']) delete v[k];
}
function enrich() {
 if (!canAccess('view')) return;
 const rows = new Map(view.map(r => [r.productId + '|' + r.variantKey, r]));
 for (const p of window.VIEW_CATALOGUE || []) for (const v of p.variants || []) {
  const row = rows.get(p.id + '|' + v.key);
  if (row) for (const k of ['proPrice', 'proDetail', 'proPalette']) if (Number.isFinite(row[k])) v[k] = row[k];
 }
}
function redraw() {
 enrich();
 if (!canAccess('view')) {
  for (const node of document.querySelectorAll('.view-safe-price')) node.textContent = 'Connexion professionnelle requise';
  const box = document.getElementById('product-modal-v2-card');
  if (box?.querySelector('[data-view-gallery],.view-safe-stage')) {
   document.getElementById('product-modal-v2')?.classList.remove('open'); box.innerHTML = ''; document.body.style.overflow = '';
  }
 }
 // Keep session events for actual session changes: using them here causes reload loops.
 window.dispatchEvent(new CustomEvent('lrf-agent-tariffs-ready', {detail:{verified, allowedPartners:[...allowedPartners]}}));
 for (const id of ['product-modal-v2-card', 'product-dialog']) {
  const modal = document.getElementById(id), title = modal?.querySelector('h2')?.textContent;
  const product = (window.ELIOS_CATALOGUE || []).find(p => p.name === title); if (!product) continue;
  for (const row of modal.querySelectorAll('.formats-table tbody tr')) {
   const cells = row.querySelectorAll('td'); if (cells.length < 2) continue;
   const q = window.LRF_AGENT_TARIFFS.eliosPrice(product, cells[0].textContent);
   cells[1].textContent = q.locked ? 'Connexion professionnelle requise' : q.label || 'Sur demande';
  }
  const notice = modal.querySelector('[data-tariff-status]');
  if (notice) {
   notice.hidden = canAccess('elios');
   const message = notice.querySelector('[data-tariff-message]');
   if (message) message.textContent = accessMessage();
  }
 }
}
Object.defineProperty(window, 'LRF_AGENT_TARIFFS', {value:Object.freeze({
 get verified() { return verified && Date.now() < validUntil; },
 get status() { return accessStatus; },
 get message() { return accessMessage(); },
 retry() { return refresh({force:true}); },
 canAccess,
 eliosPrice(product, format) {
  if (!canAccess('elios')) return {locked:true};
  const k = keyFor(product, format); return safeKey(k) && Object.hasOwn(elios, k) ? elios[k] : {unavailable:true};
 }
}), configurable:false, writable:false});
function clientToken() {
 try {
  const session = window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
  // A retained device token alone must not reopen prices after an explicit logout.
  return session && !session.isAdmin && !session.admin ? String(session.sessionToken || sessionStorage.getItem('lrfProSessionToken') || localStorage.getItem('lrfProRememberToken') || '') : '';
 } catch { return ''; }
}
function identity() {
 const user = currentAuth?.currentUser;
 // Match the existing Firebase agent policy (functions/auth.js). The server
 // still validates the live account, token and revocation before sending prices.
 if (user && ADMINS.has(String(user.email || '').trim().toLowerCase())) return {key:'agent:' + user.uid, user};
 const token = clientToken(); return /^[A-Za-z0-9_-]{43}$/.test(token) ? {key:'client:' + token, token} : {key:''};
}
async function refresh({force = false} = {}) {
 const who = identity();
 if (who.key === principal && pending) return pending;
 if (who.key === principal && !force && verified && Date.now() < validUntil) return;
 const changed = who.key !== principal, id = ++epoch; principal = who.key;
 accessStatus = who.key ? 'loading' : 'signed-out';
 if (changed || !who.key || Date.now() >= validUntil) { clear(); redraw(); }
 if (!who.key) return;
 const job = (async () => {
  try {
   const headers = {'Content-Type':'application/json'}, body = {action:'bootstrap'};
   if (who.user) headers.Authorization = 'Bearer ' + await who.user.getIdToken(true);
   else body.sessionToken = who.token;
   const response = await fetch(ENDPOINT, {method:'POST', credentials:'omit', cache:'no-store', headers, body:JSON.stringify(body), signal:AbortSignal.timeout(15000)});
   const data = await response.json();
   if (id !== epoch || identity().key !== who.key) return;
   if (response.status === 401 || response.status === 403) accessStatus = 'denied';
   if (!response.ok || data.success !== true || data.version !== 1 || !Array.isArray(data.view) || !data.elios || typeof data.elios !== 'object' || Array.isArray(data.elios) || !Array.isArray(data.allowedPartners) || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) throw Error('Tariffs unavailable');
   clear();
   allowedPartners = new Set(data.allowedPartners.filter(p => ['elios-ceramica', 'view-ceramica'].includes(p)));
   elios = allowedPartners.has('elios-ceramica') ? Object.assign(Object.create(null), data.elios) : Object.create(null);
   view = allowedPartners.has('view-ceramica') ? data.view : [];
   validUntil = Math.min(data.expiresAt, Date.now() + MAX_CACHE_AGE); verified = allowedPartners.size > 0;
   accessStatus = verified ? 'ready' : 'denied';
   redraw();
   const remaining = Math.max(1, validUntil - Date.now());
   // Renew before expiry so a VIEW product stays open during normal use.
   refreshTimer = setTimeout(() => { if (document.visibilityState !== 'hidden') refresh({force:true}); }, Math.max(1, Math.floor(remaining * .75)));
   expiryTimer = setTimeout(() => { clear(); redraw(); }, remaining);
  } catch { if (id === epoch) { if (accessStatus !== 'denied') accessStatus = 'error'; clear(); redraw(); } }
 })();
 pending = job;
 try { await job; } finally { if (pending === job) pending = null; }
}
const config = {apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
async function connect() {
 const [apps, auths] = await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'), import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
 const existing = apps.getApps();
 currentAuth = auths.getAuth(existing.find(app => app.options?.projectId === config.projectId) || apps.initializeApp(config, existing.length ? 'lrf-pro-tariffs' : undefined));
 await currentAuth.authStateReady?.();
 auths.onIdTokenChanged(currentAuth, () => refresh({force:true}));
}
window.addEventListener('lrf-view-tariff-updated', enrich);
window.addEventListener('lrf-pro-session-changed', () => refresh({force:true}));
window.addEventListener('storage', event => {
 if (!['lrfProRememberToken', 'lrfProSessionToken', 'lrfProSession'].includes(event.key)) return;
 if (event.key === 'lrfProRememberToken' && !event.newValue) {
  for (const key of ['lrfProSession', 'lrfProSession1h', 'lrfProSessionToken']) sessionStorage.removeItem(key);
  window.LRF_PRO_CONTEXT = null;
 }
 ++epoch; principal = ''; pending = null; clear(); redraw(); refresh();
});
window.addEventListener('focus', () => refresh());
window.addEventListener('pageshow', () => refresh());
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'hidden') refresh(); });
document.addEventListener('click', async event => {
 const retry = event.target.closest?.('[data-tariff-retry]');
 if (retry) { event.preventDefault(); await refresh({force:true}); return; }
 const anchor = event.target.closest?.('a[href]'); if (!anchor) return;
 let path; try { path = decodeURIComponent(new URL(anchor.href, location.href).pathname); } catch { return; }
 if (!path.endsWith('/assets/pdf/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf')) return;
 event.preventDefault(); event.stopImmediatePropagation();
 const user = currentAuth?.currentUser;
 if (!user || !ADMINS.has(String(user.email || '').trim().toLowerCase())) { alert('Ce tarif d’achat est réservé aux agents. Connectez-vous à l’Espace Agent.'); return; }
 if (anchor.getAttribute('aria-busy') === 'true') return;
 anchor.setAttribute('aria-busy', 'true');
 try {
  const token = await user.getIdToken(true), response = await fetch(ENDPOINT, {method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'document',id:'randal-studio-one-basins'}),signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw Error('Le document agent n’est pas disponible. Réessayez après connexion.');
  const {showSecurePdf} = await import('./secure-pdf-viewer.mjs?v=20261101-compact1');
  await showSecurePdf(await response.blob(), {title:'RANDAL · Vasques STUDIO ONE', filename:'RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf', trigger:anchor});
 } catch (error) { alert(error.message || 'Le document agent n’est pas disponible.'); }
 finally { anchor.removeAttribute('aria-busy'); }
}, true);
refresh();
connect().catch(() => refresh());
