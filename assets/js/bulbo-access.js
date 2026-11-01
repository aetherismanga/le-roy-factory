// A local profile only controls the UI; the private service verifies access.
(() => {
  'use strict';
  const ENDPOINT = 'https://gettariffpdf-5m3lsyu7bq-uc.a.run.app';
  const DOCUMENTS = Object.freeze({
    surfaces: {title:'BULBO · Surfaces p. 1 · Meubles AQUERELLE p. 2 · Tarif public HT 01/10/2026',filename:'BULBO-Surfaces-AQUERELLE-Tarifs-2026-10-01.pdf'},
    furniture: {title:'BULBO · Meubles AQUERELLE p. 2 · Surfaces p. 1 · Tarif public HT 01/10/2026',filename:'BULBO-Surfaces-AQUERELLE-Tarifs-2026-10-01.pdf'}
  });
  const ADMINS = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const session = () => { try { return window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } };
  let auth, authPromise, reader, readerPrincipal = '', readerStamp = '', epoch = 0, controller, pending;
  const isAgent = user => !!user && ADMINS.has(String(user.email || '').trim().toLowerCase());

  function clientSession() {
    const s = session();
    if (!s || s.isAdmin || s.admin || !/^LRF-\d{5}$/.test(String(s.codeClient || '').trim().toUpperCase()) || String(s.codeClient).toUpperCase() === 'LRF-00001' || !/^(?:\d{2,3}|2A|2B)$/.test(String(s.departement || '').trim().toUpperCase())) return null;
    return (Array.isArray(s.partenaires) ? s.partenaires : []).some(partner => norm(partner) === 'bulbo') ? s : null;
  }
  function identity() {
    if (isAgent(auth?.currentUser)) return {key:'agent:' + auth.currentUser.uid,user:auth.currentUser};
    const s = clientSession();
    return s ? {key:'client:' + String(s.codeClient).toUpperCase() + ':' + String(s.departement).toUpperCase() + ':' + String(s.sessionToken || ''),client:s} : {key:''};
  }
  function canAccess() {
    if (isAgent(auth?.currentUser) || clientSession()) return true;
    const s = session();
    return !!s && (s.isAdmin === true || s.admin === true) && ADMINS.has(String(s.email || s.adminEmail || '').trim().toLowerCase());
  }
  function reset() {
    ++epoch; controller?.abort(); controller = null; pending = null;
    reader?.close(); reader = null; readerPrincipal = ''; readerStamp = '';
    window.dispatchEvent(new CustomEvent('lrf-bulbo-access-changed'));
  }
  function checkReader() {
    if (reader && (identity().key !== readerPrincipal || JSON.stringify(session()) !== readerStamp)) reset();
  }
  async function ensureAuth() {
    if (!authPromise) authPromise = (async () => {
      const [apps, auths] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
      ]);
      const config = {apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
      const existing = apps.getApps();
      const app = existing.find(item => item.options.projectId === config.projectId) || apps.initializeApp(config,existing.length ? 'bulbo-tariff' : undefined);
      auth = auths.getAuth(app); await auth.authStateReady?.();
      auths.onIdTokenChanged?.(auth,() => { checkReader(); });
      return auth;
    })().catch(error => { authPromise = null; throw error; });
    return authPromise;
  }
  async function openTariff(trigger, kind = 'surfaces') {
    if (!Object.prototype.hasOwnProperty.call(DOCUMENTS,kind)) throw Error('Document BULBO inconnu.');
    if (pending) return pending;
    const job = (async () => {
      try { await ensureAuth(); }
      catch (error) { if (!clientSession()) throw Error('Reconnectez-vous à l’Espace Agent pour consulter le tarif BULBO.'); }
      const who = identity(), stamp = JSON.stringify(session());
      if (!who.key) throw Error('Reconnectez-vous à l’espace PRO pour consulter les tarifs BULBO.');
      const documentEpoch = ++epoch, abort = new AbortController(); controller = abort;
      const timeout = setTimeout(() => abort.abort(),30000);
      try {
        const headers = {'Content-Type':'application/json'}, body = {tariffId:'bulbo-2026'};
        if (who.user) headers.Authorization = 'Bearer ' + await who.user.getIdToken(true);
        else { body.codeClient = who.client.codeClient; body.departement = who.client.departement; }
        const response = await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:abort.signal});
        if (!response.ok) { const error = await response.json().catch(() => ({})); throw Error(error.error || 'Ce tarif BULBO est momentanément indisponible.'); }
        if (!(response.headers.get('Content-Type') || '').toLowerCase().includes('application/pdf')) throw Error('Le document tarifaire BULBO est indisponible.');
        const blob = await response.blob();
        const current = () => epoch === documentEpoch && identity().key === who.key && JSON.stringify(session()) === stamp;
        if (!current()) throw Error('Votre session a changé. Reconnectez-vous avant de consulter le document.');
        const {showSecurePdf} = await import('./secure-pdf-viewer.mjs?v=20261101-compact1');
        if (!current()) throw Error('Votre session a changé.');
        const opened = await showSecurePdf(blob,{...DOCUMENTS[kind],trigger});
        if (!current()) { opened.close(); throw Error('Votre session a changé.'); }
        reader = opened; readerPrincipal = who.key; readerStamp = stamp;
      } finally { clearTimeout(timeout); if (controller === abort) controller = null; }
    })();
    pending = job;
    try { return await job; } finally { if (pending === job) pending = null; }
  }
  window.LRF_BULBO_ACCESS = Object.freeze({canAccess,openTariff,reset});
  window.addEventListener('lrf-pro-session-changed',reset);
  window.addEventListener('storage',event => { if (['lrfProSession','lrfProSessionToken','lrfProRememberToken'].includes(event.key)) reset(); });
  window.addEventListener('focus',checkReader);
  window.addEventListener('pageshow',checkReader);
  document.addEventListener('visibilitychange',() => { if (document.visibilityState !== 'hidden') checkReader(); });
  document.addEventListener('click',async event => {
    const link = event.target.closest?.('[data-bulbo-tariff], #workspace-pro-link');
    if (!link || (!link.hasAttribute('data-bulbo-tariff') && norm(document.getElementById('workspace-title')?.textContent) !== 'bulbo')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (link.getAttribute('aria-busy') === 'true') return;
    link.setAttribute('aria-busy','true');
    try { await openTariff(link, link.dataset.bulboTariff || 'surfaces'); } catch (error) {
      const status = document.getElementById('bulbo-tariff-status');
      if (status) status.textContent = error.message; else alert(error.message);
    }
    finally { link.removeAttribute('aria-busy'); }
  },true);
})();
