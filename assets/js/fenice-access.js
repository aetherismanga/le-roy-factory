/* The browser only chooses which controls to show. Every PDF request is checked by the existing server. */
(() => {
  'use strict';
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const admins = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
  const session = () => { try { return window.LRF_PRO_SESSION?.read?.() || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } };
  function canAccess() {
    const s = session();
    return !!s && ((s.isAdmin === true || s.admin === true) && admins.has(String(s.email || s.adminEmail || '').toLowerCase()) ||
      /^LRF-\d{5}$/.test(String(s.codeClient || '').toUpperCase()) && !!s.departement && (Array.isArray(s.partenaires)?s.partenaires:[]).some(p => norm(p) === 'lafenice'));
  }
  async function openTariff(trigger) {
    const s = session(), headers = {'Content-Type':'application/json'}, body = {tariffId:'lafenice-2026'};
    const [apps, auths] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
    ]);
    const app = apps.getApps().find(a => a.options.projectId === 'le-roy-factory') || apps.initializeApp({apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'}, 'fenice-tariff');
    const auth = auths.getAuth(app);
    await auth.authStateReady();
    const user = auth.currentUser;
    if (user && admins.has(String(user.email || '').toLowerCase())) headers.Authorization = 'Bearer ' + await user.getIdToken(true);
    else {
      if (!s || !canAccess() || s.isAdmin || s.admin) throw Error('Reconnectez-vous à l’espace PRO pour consulter le tarif La Fenice.');
      body.codeClient = s.codeClient; body.departement = s.departement;
    }
    const response = await fetch('https://gettariffpdf-5m3lsyu7bq-uc.a.run.app', {method:'POST',headers,body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(30000)});
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw Error(error.error || 'Le tarif La Fenice n’est pas disponible pour ce compte.');
    }
    if (!(response.headers.get('Content-Type') || '').includes('application/pdf')) throw Error('Le document tarifaire est indisponible.');
    const {showSecurePdf} = await import('./secure-pdf-viewer.mjs?v=20261101-compact1');
    await showSecurePdf(await response.blob(), {title:'La Fenice · Tarif professionnel',filename:'LA-FENICE-Tarifs-2026.pdf',trigger});
  }
  window.LRF_FENICE_ACCESS = Object.freeze({canAccess,openTariff});
  document.addEventListener('click', async e => {
    const link = e.target.closest?.('#workspace-pro-link');
    if (!link || norm(document.getElementById('workspace-title')?.textContent) !== 'lafenice') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (link.getAttribute('aria-busy') === 'true') return;
    link.setAttribute('aria-busy','true');
    try { await openTariff(link); } catch (error) { alert(error.message); }
    finally { link.removeAttribute('aria-busy'); }
  },true);
})();
