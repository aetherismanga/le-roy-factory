(() => {
  'use strict';

  const KEY = 'lrfProSession';
  const LEGACY_CODE = '2026';
  const MAX_AGE = 12 * 60 * 60 * 1000;
  let lastSessionRaw = '';

  function parse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }

  function read() {
    let session = parse(sessionStorage.getItem(KEY));
    if (!session) session = parse(localStorage.getItem(KEY));
    if (!session) return null;
    if (session.unlockedAt && Date.now() - Number(session.unlockedAt) > MAX_AGE) {
      try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (_) {}
      return null;
    }
    return session;
  }

  function write(session, emit = true) {
    const next = { ...session, unlockedAt: Number(session.unlockedAt || Date.now()) };
    const raw = JSON.stringify(next);
    try { sessionStorage.setItem(KEY, raw); } catch (_) {}
    try { localStorage.setItem(KEY, raw); } catch (_) {}
    lastSessionRaw = raw;
    if (emit) window.dispatchEvent(new CustomEvent('lrf-pro-session-changed', { detail: next }));
    return next;
  }

  function sync() {
    const session = read();
    if (session) write(session, false);
    return session;
  }

  function unlockLegacy(code) {
    if (String(code || '').trim() !== LEGACY_CODE) return false;
    write({ legacyPro: true, societe: 'Accès PRO LE ROY FACTORY', partenaires: ['*'] });
    return true;
  }

  function wildcard(session) {
    return !!session && (session.legacyPro || (Array.isArray(session.partenaires) && session.partenaires.includes('*')));
  }

  function patchPricingApi() {
    const api = window.LRF_INSPIRATIONS_PRICING;
    if (!api || api.__sessionBridgePatched) return false;
    const originalCanAccess = api.canAccess?.bind(api);
    const originalGetPrice = api.getPrice?.bind(api);
    api.getSession = read;
    api.canAccess = partner => {
      const session = sync();
      if (wildcard(session)) return true;
      return originalCanAccess ? originalCanAccess(partner) : !!session;
    };
    api.getPrice = (partner, product, format) => {
      const session = sync();
      if (wildcard(session)) {
        try { sessionStorage.setItem(KEY, JSON.stringify(session)); } catch (_) {}
      }
      return originalGetPrice ? originalGetPrice(partner, product, format) : null;
    };
    api.__sessionBridgePatched = true;
    return true;
  }

  function bindLegacyTariffPage() {
    const input = document.getElementById('password-input');
    const button = document.getElementById('login-btn');
    if (!input || !button || button.dataset.proBridgeBound) return;
    button.dataset.proBridgeBound = '1';
    button.addEventListener('click', () => unlockLegacy(input.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') unlockLegacy(input.value);
    });
  }

  function watchOtherLoginSystems() {
    // The client-code login used by Inspirations writes directly to sessionStorage.
    // Mirror it to localStorage so the same valid session survives navigation/tabs.
    setInterval(() => {
      let raw = '';
      try { raw = sessionStorage.getItem(KEY) || ''; } catch (_) {}
      if (!raw || raw === lastSessionRaw) return;
      const session = parse(raw);
      if (!session) return;
      write(session);
    }, 700);
  }

  function init() {
    const initial = sync();
    lastSessionRaw = initial ? JSON.stringify(initial) : '';
    bindLegacyTariffPage();
    watchOtherLoginSystems();
    if (!patchPricingApi()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (patchPricingApi() || tries > 40) clearInterval(timer);
      }, 100);
    }
  }

  window.LRF_PRO_SESSION = { key: KEY, read, write, unlockLegacy, sync };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
