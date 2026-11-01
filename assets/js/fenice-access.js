// UI hints never authorize a tariff: the existing service verifies every request.
(() => {
  'use strict';
  const ENDPOINT = 'https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs';
  const MAX_CACHE_AGE = 60 * 1000;
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const admins = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
  const session = () => { try { return window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } };
  let auth, authPromise, lookup, rows = [], state = 'idle', validUntil = 0, principal = '', epoch = 0, pending, controller, expiryTimer, reader, readerEpoch = 0, readerPrincipal = '';
  const emit = () => window.dispatchEvent(new CustomEvent('lrf-fenice-prices-changed',{detail:{state}}));
  const isAgent = user => user && admins.has(String(user.email || '').trim().toLowerCase());
  function clientToken() {
    const s = session();
    if (!s || s.isAdmin || s.admin) return '';
    try { return String(s.sessionToken || sessionStorage.getItem('lrfProSessionToken') || localStorage.getItem('lrfProRememberToken') || ''); } catch { return ''; }
  }
  function identity() {
    const user = auth?.currentUser;
    if (isAgent(user)) return {key:'agent:' + user.uid,user};
    const token = clientToken();
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? {key:'client:' + token,token} : {key:''};
  }
  function canAccess() {
    if (isAgent(auth?.currentUser)) return true;
    const s = session();
    return !!s && (((s.isAdmin === true || s.admin === true) && admins.has(String(s.email || s.adminEmail || '').trim().toLowerCase())) ||
      /^LRF-\d{5}$/.test(String(s.codeClient || '').trim().toUpperCase()) && !!s.departement && (Array.isArray(s.partenaires)?s.partenaires:[]).some(p => norm(p) === 'lafenice'));
  }
  function reset() {
    ++epoch; controller?.abort(); controller = null; pending = null;
    clearTimeout(expiryTimer); expiryTimer = null; rows = []; validUntil = 0; principal = ''; state = 'idle'; emit();
  }
  function invalidateSession() { ++readerEpoch; reader?.close(); reader = null; readerPrincipal = ''; reset(); }
  function usable() {
    const ok = state === 'ready' && Date.now() < validUntil && !!principal && identity().key === principal;
    if (!ok && state === 'ready') reset();
    return ok;
  }
  async function ensureAuth() {
    if (!authPromise) authPromise = (async () => {
      const [apps,auths] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
      ]);
      const config = {apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
      const existing = apps.getApps();
      const app = existing.find(a => a.options.projectId === config.projectId) || apps.initializeApp(config,existing.length ? 'fenice-tariff' : undefined);
      auth = auths.getAuth(app); await auth.authStateReady?.();
      auths.onIdTokenChanged?.(auth,() => { if ((principal && identity().key !== principal) || (reader && identity().key !== readerPrincipal)) invalidateSession(); });
      return auth;
    })().catch(error => { authPromise = null; throw error; });
    return authPromise;
  }
  async function loadPrices({force = false} = {}) {
    const initialSession = JSON.stringify(session());
    try { await ensureAuth(); }
    catch (error) { if (!clientToken() || session()?.isAdmin || session()?.admin) throw Error('Reconnectez-vous à l’Espace Agent pour consulter les tarifs.'); }
    if (JSON.stringify(session()) !== initialSession) throw Error('Votre session a changé. Cliquez de nouveau sur Voir.');
    const who = identity();
    if (!who.key) { reset(); throw Error('Reconnectez-vous à l’espace PRO pour consulter les tarifs La Fenice.'); }
    if (principal === who.key && pending) return pending;
    if (principal === who.key && !force && usable()) return;
    const id = ++epoch;
    controller?.abort(); clearTimeout(expiryTimer); rows = []; validUntil = 0;
    principal = who.key; state = 'loading'; emit();
    const abort = new AbortController(); controller = abort;
    const job = (async () => {
      const timeout = setTimeout(() => abort.abort(),20000);
      try {
        const headers = {'Content-Type':'application/json'},body = {action:'fenice'};
        if (who.user) headers.Authorization = 'Bearer ' + await who.user.getIdToken(true);
        else body.sessionToken = who.token;
        const response = await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:abort.signal});
        const data = await response.json().catch(() => ({}));
        if (id !== epoch || identity().key !== who.key) throw Error('Votre session a changé.');
        if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'Votre compte n’a pas accès au tarif La Fenice. Reconnectez-vous à l’espace PRO.' : 'Les tarifs La Fenice sont momentanément indisponibles. Réessayez.');
        const module = await import('./fenice-price-lookup.mjs?v=20261101-colors-prices2');
        if (id !== epoch || identity().key !== who.key) throw Error('Votre session a changé.');
        if (data.success !== true || !Array.isArray(data.allowedPartners) || !data.allowedPartners.some(p => norm(p) === 'lafenice') || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now() || !module.validPriceRecords(data.fenice)) throw Error('Les tarifs La Fenice n’ont pas pu être vérifiés. Réessayez.');
        lookup = module.lookupPrice; rows = data.fenice; validUntil = Math.min(data.expiresAt,Date.now() + MAX_CACHE_AGE); state = 'ready';
        expiryTimer = setTimeout(reset,Math.max(1,validUntil-Date.now())); emit();
      } catch (error) {
        if (id === epoch) { rows = []; validUntil = 0; state = 'error'; emit(); }
        throw error;
      } finally { clearTimeout(timeout); if (controller === abort) controller = null; }
    })();
    pending = job;
    try { await job; } finally { if (pending === job) pending = null; }
  }
  function getPrice(product,format) {
    if (!usable()) return {locked:true,label:'Accès PRO requis'};
    return lookup(rows,product,format,window.FENICE_CATALOGUE || []);
  }
  async function openTariff(trigger) {
    await ensureAuth();
    const s = session(), headers = {'Content-Type':'application/json'}, body = {tariffId:'lafenice-2026'},who = identity();
    const stamp = JSON.stringify(s), documentEpoch = ++readerEpoch;
    if (who.user) headers.Authorization = 'Bearer ' + await who.user.getIdToken(true);
    else {
      if (!s || !canAccess() || s.isAdmin || s.admin) throw Error('Reconnectez-vous à l’espace PRO pour consulter le tarif La Fenice.');
      body.codeClient = s.codeClient; body.departement = s.departement;
    }
    const response = await fetch('https://gettariffpdf-5m3lsyu7bq-uc.a.run.app',{method:'POST',headers,body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(30000)});
    if (!response.ok) { const error = await response.json().catch(() => ({})); throw Error(error.error || 'Le tarif La Fenice n’est pas disponible pour ce compte.'); }
    if (!(response.headers.get('Content-Type') || '').includes('application/pdf')) throw Error('Le document tarifaire est indisponible.');
    const blob = await response.blob();
    if (identity().key !== who.key || JSON.stringify(session()) !== stamp) throw Error('Votre session a changé. Reconnectez-vous avant de consulter le document.');
    const {showSecurePdf} = await import('./secure-pdf-viewer.mjs?v=20261101-compact1');
    if (identity().key !== who.key || JSON.stringify(session()) !== stamp) throw Error('Votre session a changé.');
    const opened = await showSecurePdf(blob,{title:'La Fenice · Tarif professionnel',filename:'LA-FENICE-Tarifs-2026.pdf',trigger});
    if (readerEpoch !== documentEpoch || identity().key !== who.key || JSON.stringify(session()) !== stamp) { opened.close(); throw Error('Votre session a changé.'); }
    reader = opened; readerPrincipal = who.key;
  }
  window.LRF_FENICE_ACCESS = Object.freeze({canAccess,openTariff,loadPrices,getPrice,reset,getState:() => { usable(); return state; }});
  window.addEventListener('lrf-pro-session-changed',invalidateSession);
  window.addEventListener('storage',event => {
    if (['lrfProSession','lrfProSessionToken','lrfProRememberToken'].includes(event.key)) invalidateSession();
  });
  window.addEventListener('focus',() => usable());
  window.addEventListener('pageshow',() => usable());
  document.addEventListener('visibilitychange',() => { if (document.visibilityState !== 'hidden') usable(); });
  document.addEventListener('click',async event => {
    const link = event.target.closest?.('#workspace-pro-link');
    if (!link || norm(document.getElementById('workspace-title')?.textContent) !== 'lafenice') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (link.getAttribute('aria-busy') === 'true') return;
    link.setAttribute('aria-busy','true');
    try { await openTariff(link); } catch (error) { alert(error.message); }
    finally { link.removeAttribute('aria-busy'); }
  },true);
})();
