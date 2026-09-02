(() => {
  'use strict';
  if (window.__LRF_PRO_SESSION_BRIDGE__) return;
  window.__LRF_PRO_SESSION_BRIDGE__ = true;

  const KEY = 'lrfProSession';
  const BACKUP_KEY = 'lrfProSession1h';
  const MAX_AGE = 60 * 60 * 1000;

  function purgeLegacy() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  function parse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }

  function sanitize(session) {
    if (!session || typeof session !== 'object') return null;
    const codeClient = String(session.codeClient || '').trim().toUpperCase();
    const departement = String(session.departement || '').trim().toUpperCase();
    if (!/^LRF-\d{5}$/.test(codeClient) || !departement) return null;
    const partenaires = Array.isArray(session.partenaires)
      ? [...new Set(session.partenaires.filter(p => p && p !== '*'))]
      : [];
    return {
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

    // Répare automatiquement la clé principale si une ancienne page l'a effacée.
    store(session);
    return session;
  }

  function write(session, emit = true) {
    purgeLegacy();
    const safe = sanitize({ ...session, verifiedAt: Date.now() });
    if (!safe) return null;
    store(safe);
    if (emit) window.dispatchEvent(new CustomEvent('lrf-pro-session-changed', { detail: safe }));
    return safe;
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

  function init() {
    purgeLegacy();
    const session = read();
    if (!session) clear();
    if (!patchPricingApi()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (patchPricingApi() || tries > 40) clearInterval(timer);
      }, 100);
    }
  }

  window.LRF_PRO_SESSION = {
    key: KEY,
    backupKey: BACKUP_KEY,
    maxAge: MAX_AGE,
    read,
    write,
    clear,
    unlockLegacy,
    sync
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
