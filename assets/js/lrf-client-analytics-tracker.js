(() => {
  'use strict';
  if (window.__LRF_CLIENT_ANALYTICS_TRACKER__) return;
  window.__LRF_CLIENT_ANALYTICS_TRACKER__ = true;

  const ENDPOINT = 'https://us-central1-le-roy-factory.cloudfunctions.net/trackLrfActivity';
  const sent = new Set();
  const clean = (v, max = 180) => String(v || '').trim().slice(0, max);

  function deviceType() {
    const w = Math.min(window.innerWidth || 0, window.screen?.width || 9999);
    if (w <= 520) return 'mobile';
    if (w <= 900) return 'tablet';
    return 'desktop';
  }

  function currentSession() {
    try { return window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || null; }
    catch (_) { return null; }
  }

  async function send(action = 'page_view', extras = {}) {
    const session = currentSession();
    if (!session || session.isAdmin || !session.sessionToken || !/^LRF-\d{5}$/i.test(session.codeClient || '')) return;
    const page = clean(location.pathname || '/');
    const key = `${action}:${page}:${clean(extras.partner, 80)}`;
    if (sent.has(key)) return;
    sent.add(key);
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          sessionToken: session.sessionToken,
          action,
          page,
          title: clean(document.title),
          device: deviceType(),
          partner: clean(extras.partner, 80)
        })
      });
    } catch (_) {}
  }

  function trackPartnerClicks() {
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-partner], .partner-card, [data-usine]');
      if (!target) return;
      const partner = clean(target.dataset.partner || target.dataset.usine || target.getAttribute('data-id') || target.textContent, 80);
      if (partner) send('partner_view', { partner });
    }, { passive: true, capture: true });
  }

  function boot() {
    setTimeout(() => send('page_view'), 700);
    setTimeout(() => send('page_view'), 2200);
    trackPartnerClicks();
    window.addEventListener('lrf-pro-session-changed', () => setTimeout(() => send('page_view'), 150));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
