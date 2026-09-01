(() => {
  'use strict';
  if (window.__LRF_PRO_SESSION_BRIDGE__) return;
  window.__LRF_PRO_SESSION_BRIDGE__ = true;

  const KEY = 'lrfProSession';
  const MAX_AGE = 2 * 60 * 60 * 1000;
  const isTariffPage = window.location.pathname.toLowerCase().endsWith('tarifs-pro.html');

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

  function read() {
    purgeLegacy();
    let session = null;
    try { session = parse(sessionStorage.getItem(KEY)); } catch (_) {}
    session = sanitize(session);
    if (!session) {
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      return null;
    }
    if (Date.now() - session.verifiedAt > MAX_AGE) {
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      return null;
    }
    return session;
  }

  function write(session, emit = true) {
    purgeLegacy();
    const safe = sanitize({ ...session, verifiedAt: Date.now() });
    if (!safe) return null;
    try { sessionStorage.setItem(KEY, JSON.stringify(safe)); } catch (_) {}
    if (emit) window.dispatchEvent(new CustomEvent('lrf-pro-session-changed', { detail: safe }));
    return safe;
  }

  function clear() {
    try { sessionStorage.removeItem(KEY); } catch (_) {}
    purgeLegacy();
    window.LRF_PRO_CONTEXT = null;
  }

  function sync() {
    return read();
  }

  // Ancien code universel définitivement désactivé.
  function unlockLegacy() {
    clear();
    return false;
  }

  function neutralizeLegacyTariffLogin() {
    if (!isTariffPage) return;
    clear();
    const box = document.getElementById('login-section');
    const content = document.getElementById('pro-content');
    if (content) content.style.display = 'none';
    if (box) {
      box.style.display = 'block';
      box.innerHTML = '<h2 style="font-size:1.75rem;margin-bottom:.6rem;color:#1A2530">Accès professionnel</h2><p style="color:#666;font-size:.95rem">Chargement du contrôle sécurisé…</p>';
    }
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
    if (isTariffPage) {
      // Sur Accès PRO : aucune restauration automatique. LRF + département obligatoires à chaque entrée.
      neutralizeLegacyTariffLogin();
    } else {
      const session = read();
      if (!session) clear();
    }
    if (!patchPricingApi()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (patchPricingApi() || tries > 40) clearInterval(timer);
      }, 100);
    }
  }

  window.LRF_PRO_SESSION = { key: KEY, read, write, clear, unlockLegacy, sync };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
