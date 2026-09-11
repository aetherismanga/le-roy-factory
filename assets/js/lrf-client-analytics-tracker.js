(() => {
  'use strict';
  if (window.__LRF_CLIENT_ANALYTICS_TRACKER__) return;
  window.__LRF_CLIENT_ANALYTICS_TRACKER__ = true;

  const ENDPOINT = 'https://us-central1-le-roy-factory.cloudfunctions.net/trackLrfActivity';
  const recent = new Map();
  const clean = (v, max = 180) => String(v ?? '').trim().slice(0, max);
  const norm = v => clean(v, 180).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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

  function eventKey(action, extras = {}) {
    return [action, location.pathname, extras.partner, extras.productRef, extras.productName, extras.collection].map(v => clean(v, 80)).join('|');
  }

  async function send(action = 'page_view', extras = {}) {
    const session = currentSession();
    if (!session || session.isAdmin || !session.sessionToken || !/^LRF-\d{5}$/i.test(session.codeClient || '')) return;
    const key = eventKey(action, extras), now = Date.now(), previous = recent.get(key) || 0;
    if (now - previous < 2500) return;
    recent.set(key, now);
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        keepalive: true,
        body: JSON.stringify({
          sessionToken: session.sessionToken,
          action,
          page: clean(location.pathname || '/'),
          title: clean(document.title),
          device: deviceType(),
          partner: clean(extras.partner, 80),
          productRef: clean(extras.productRef, 80),
          productName: clean(extras.productName, 180),
          collection: clean(extras.collection, 120),
          stock: Number.isFinite(Number(extras.stock)) ? Number(extras.stock) : null,
          stockUnit: clean(extras.stockUnit, 20),
          sessionId: clean(extras.sessionId || sessionStorage.getItem('lrfAnalyticsSessionId') || '', 80),
          source: clean(extras.source || 'site-public', 50)
        })
      });
    } catch (_) {}
  }

  function ensureSessionStart() {
    const session = currentSession();
    if (!session || session.isAdmin || !session.sessionToken || !session.codeClient) return;
    const now = Date.now();
    let state = null;
    try { state = JSON.parse(sessionStorage.getItem('lrfAnalyticsSession') || 'null'); } catch (_) {}
    const fresh = state && state.codeClient === session.codeClient && now - Number(state.lastAt || 0) < 30 * 60 * 1000;
    if (!fresh) {
      const sessionId = `${session.codeClient}-${now}-${Math.random().toString(36).slice(2,8)}`;
      state = { codeClient: session.codeClient, sessionId, startedAt: now, lastAt: now };
      try { sessionStorage.setItem('lrfAnalyticsSession', JSON.stringify(state)); sessionStorage.setItem('lrfAnalyticsSessionId', sessionId); } catch (_) {}
      send('session_start', { sessionId });
    } else {
      state.lastAt = now;
      try { sessionStorage.setItem('lrfAnalyticsSession', JSON.stringify(state)); sessionStorage.setItem('lrfAnalyticsSessionId', state.sessionId || ''); } catch (_) {}
    }
  }

  function productInfo(target) {
    const card = target.closest('[data-product-ref],[data-ref],[data-product],.insp-product-card,.product-card,.product-item,.product-tile,[data-collection]');
    if (!card) return null;
    const ref = clean(card.dataset.productRef || card.dataset.ref || card.getAttribute('data-reference') || '', 80);
    const collection = clean(card.dataset.collection || card.getAttribute('data-collection') || '', 120);
    let name = clean(card.dataset.product || card.dataset.productName || card.getAttribute('data-name') || '', 180);
    if (!name) name = clean(card.querySelector('h2,h3,h4,.product-name,.pname,.title,strong')?.textContent || '', 180);
    if (!ref && !name && !collection) return null;
    return { productRef: ref, productName: name || collection || ref, collection };
  }

  function installClickTracking() {
    document.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const partnerEl = target.closest('[data-partner],.partner-card,[data-usine]');
      if (partnerEl) {
        const partner = clean(partnerEl.dataset.partner || partnerEl.dataset.usine || partnerEl.getAttribute('data-id') || partnerEl.querySelector('strong,h3')?.textContent || '', 80);
        if (partner) send('partner_view', { partner });
      }
      const info = productInfo(target);
      if (info) send('product_view', info);
    }, { passive:true, capture:true });
  }

  function installOrderTracking() {
    document.addEventListener('submit', event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.id !== 'view-order-form') return;
      const title = clean(document.querySelector('#view-order-title')?.textContent || '', 120);
      if (!norm(title).startsWith('commande view')) return;
      const first = document.querySelector('#view-order-lines .view-order-line');
      const productName = clean(first?.querySelector('[data-field="product"] option:checked')?.textContent || 'Commande VIEW', 180);
      const productRef = clean(first?.querySelector('input[readonly]')?.value || '', 80);
      send('order_view', { partner:'view-ceramica', productName, productRef, source:'view-order' });
    }, { capture:true });
  }

  function installStockTracking() {
    const original = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      const raw = typeof input === 'string' ? input : (input?.url || '');
      const response = await original(input, init);
      if (raw.includes('/eliosStock')) {
        try {
          const url = new URL(raw, location.href);
          const json = await response.clone().json();
          if (response.ok && json?.success) {
            const product = json.product || {};
            send('stock_view', {
              partner: 'elios-ceramica',
              productRef: clean(url.searchParams.get('ref') || product.ref || '', 80),
              productName: clean(product.description || json.collection || '', 180),
              collection: clean(url.searchParams.get('collection') || json.collection || '', 120),
              stock: product.stock,
              stockUnit: product.stockUnit || '',
              source: 'elios-stock'
            });
          }
        } catch (_) {}
      }
      return response;
    };
  }

  function boot() {
    ensureSessionStart();
    setTimeout(() => send('page_view'), 450);
    installClickTracking();
    installOrderTracking();
    installStockTracking();
    window.addEventListener('lrf-pro-session-changed', () => { setTimeout(ensureSessionStart, 80); setTimeout(() => send('page_view'), 180); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ensureSessionStart(); });
  }

  window.LRF_ANALYTICS = { track: send, session: ensureSessionStart };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
