(() => {
  'use strict';
  if (window.__LRF_PRO_SESSION_BRIDGE__) return;
  window.__LRF_PRO_SESSION_BRIDGE__ = true;

  const KEY = 'lrfProSession';
  const BACKUP_KEY = 'lrfProSession1h';
  const MAX_AGE = 60 * 60 * 1000;
  const ADMINS = new Map([
    ['jerome@leroyfactory.fr', 'Jérôme Hugol'],
    ['coryne@leroyfactory.fr', 'Coryne']
  ]);
  const ALL_PARTNERS = [
    'elios-ceramica', 'view-ceramica', 'la-fenice', 'reviglass', 'biopietra',
    'petracers', 'pecchioli-firenze', 'bulbo', 'randal-pro', 'neobath',
    'koibath', 'aquahome', 'opal', 'bilt'
  ];
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',
    authDomain: 'le-roy-factory.firebaseapp.com',
    projectId: 'le-roy-factory',
    storageBucket: 'le-roy-factory.firebasestorage.app',
    messagingSenderId: '249878619253',
    appId: '1:249878619253:web:05f051710b6251dbfa843c'
  };

  function purgeLegacy() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  function parse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }

  function sanitize(session) {
    if (!session || typeof session !== 'object') return null;

    if (session.isAdmin === true || session.admin === true) {
      const email = String(session.email || session.adminEmail || '').trim().toLowerCase();
      if (!ADMINS.has(email)) return null;
      return {
        isAdmin: true,
        admin: true,
        email,
        name: String(session.name || ADMINS.get(email)),
        societe: String(session.societe || ADMINS.get(email)),
        activite: 'Administrateur LE ROY FACTORY',
        codeClient: '',
        clientId: String(session.clientId || ''),
        departement: 'ADMIN',
        partenaires: ALL_PARTNERS.slice(),
        verifiedAt: Number(session.verifiedAt || session.unlockedAt || Date.now())
      };
    }

    const codeClient = String(session.codeClient || '').trim().toUpperCase();
    const departement = String(session.departement || '').trim().toUpperCase();
    if (!/^LRF-\d{5}$/.test(codeClient) || !departement) return null;
    const partenaires = Array.isArray(session.partenaires)
      ? [...new Set(session.partenaires.filter(p => p && p !== '*'))]
      : [];
    return {
      isAdmin: false,
      admin: false,
      codeClient,
      clientId: String(session.clientId || ''),
      societe: String(session.societe || 'Client professionnel'),
      departement,
      activite: String(session.activite || 'Professionnel'),
      partenaires,
      verifiedAt: Number(session.verifiedAt || session.unlockedAt || Date.now())
    };
  }

  function expired(session) {
    return !session || !Number.isFinite(session.verifiedAt) || Date.now() - session.verifiedAt >= MAX_AGE;
  }

  function removeStored() {
    try {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(BACKUP_KEY);
    } catch (_) {}
  }

  function store(session) {
    try {
      const raw = JSON.stringify(session);
      sessionStorage.setItem(KEY, raw);
      sessionStorage.setItem(BACKUP_KEY, raw);
    } catch (_) {}
  }

  function read() {
    purgeLegacy();
    let session = null;
    try {
      session = sanitize(parse(sessionStorage.getItem(KEY)));
      if (!session) session = sanitize(parse(sessionStorage.getItem(BACKUP_KEY)));
    } catch (_) {}

    if (!session || expired(session)) {
      removeStored();
      window.LRF_PRO_CONTEXT = null;
      return null;
    }

    store(session);
    window.LRF_PRO_CONTEXT = session;
    return session;
  }

  function refreshConsumers() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('univers.html') || path === '/' || path.endsWith('/')) {
      requestAnimationFrame(() => {
        const active = document.querySelector('#partner-grid .partner-card.active');
        if (active) active.click();
      });
    }
  }

  function write(session, emit = true) {
    purgeLegacy();
    const safe = sanitize({ ...session, verifiedAt: Date.now() });
    if (!safe) return null;
    store(safe);
    window.LRF_PRO_CONTEXT = safe;
    if (emit) {
      window.dispatchEvent(new CustomEvent('lrf-pro-session-changed', { detail: safe }));
      refreshConsumers();
    }
    return safe;
  }

  function writeAdmin(profile, emit = true) {
    return write({
      isAdmin: true,
      admin: true,
      email: profile?.email,
      name: profile?.name,
      partenaires: ALL_PARTNERS
    }, emit);
  }

  function clear() {
    removeStored();
    purgeLegacy();
    window.LRF_PRO_CONTEXT = null;
  }

  function sync() {
    return read();
  }

  function unlockLegacy() {
    clear();
    return false;
  }

  function patchPricingApi() {
    const api = window.LRF_INSPIRATIONS_PRICING;
    if (!api || api.__sessionBridgePatched) return false;
    const originalCanAccess = api.canAccess?.bind(api);
    const originalGetPrice = api.getPrice?.bind(api);
    api.getSession = read;
    api.canAccess = partner => {
      const session = read();
      if (!session) return false;
      if (session.isAdmin) return true;
      return originalCanAccess ? originalCanAccess(partner) : session.partenaires.includes(partner);
    };
    api.getPrice = (partner, product, format) => {
      const session = read();
      if (!session) return null;
      return originalGetPrice ? originalGetPrice(partner, product, format) : null;
    };
    api.__sessionBridgePatched = true;
    return true;
  }

  async function watchFirebaseAdmin() {
    if (window.__LRF_FIREBASE_ADMIN_WATCH__) return;
    window.__LRF_FIREBASE_ADMIN_WATCH__ = true;
    try {
      const [appModule, authModule] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
      ]);
      const firebaseApp = appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(FIREBASE_CONFIG);
      const auth = authModule.getAuth(firebaseApp);
      authModule.onAuthStateChanged(auth, user => {
        const email = String(user?.email || '').trim().toLowerCase();
        if (email && ADMINS.has(email)) {
          writeAdmin({ email, name: ADMINS.get(email) });
          return;
        }
        const current = read();
        if (current?.isAdmin) clear();
      });
    } catch (error) {
      console.warn('Synchronisation administrateur PRO indisponible :', error);
    }
  }

  function init() {
    purgeLegacy();
    read();
    if (!patchPricingApi()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (patchPricingApi() || tries > 40) clearInterval(timer);
      }, 100);
    }
    watchFirebaseAdmin();
  }

  window.LRF_PRO_SESSION = {
    key: KEY,
    backupKey: BACKUP_KEY,
    maxAge: MAX_AGE,
    read,
    write,
    writeAdmin,
    clear,
    unlockLegacy,
    sync
  };

  // Lit immédiatement une session déjà validée avant le rendu des pages Inspirations.
  read();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();