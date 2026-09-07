(() => {
  'use strict';
  const ACTIVE = new Set(['roma','lithos','mysterium','quercia','dolomiti','bavaria-stone','grand-place','harmony','millennium-quartz','sedimenti','slate','brooklyn','clay','creta','deco','d-esign-evo','domus','glow','golden-hour','hexagon','horizon','marechiaro','montreal']);
  const MANUAL_STOCK = new Set(['horizon','montreal']);
  const CATALOG_API = 'https://us-central1-le-roy-factory.cloudfunctions.net/eliosCatalog';
  const params = new URLSearchParams(location.search);
  const slug = String(params.get('collection') || 'roma').trim().toLowerCase();
  const originalFetch = window.fetch.bind(window);
  window.ELIOS_MANUAL_STOCK = MANUAL_STOCK.has(slug);

  function injectMain() {
    const script = document.createElement('script');
    script.src = 'assets/js/elios-stock-page.js?v=20260907-manual1';
    script.defer = false;
    document.body.appendChild(script);
  }

  function injectManualGuardThenMain() {
    if (!window.ELIOS_MANUAL_STOCK) { injectMain(); return; }
    const guard = document.createElement('script');
    guard.src = 'assets/js/elios-manual-stock.js?v=20260907-manual1';
    guard.defer = false;
    guard.onload = injectMain;
    guard.onerror = injectMain;
    document.body.appendChild(guard);
  }

  function installFetchBridge() {
    window.fetch = function(input, init = {}) {
      let target = input;
      const rawUrl = typeof input === 'string' ? input : (input?.url || '');
      if (rawUrl.includes('/eliosStock')) {
        const url = new URL(rawUrl, location.href);
        url.searchParams.set('collection', slug);
        target = typeof input === 'string' ? url.toString() : new Request(url.toString(), input);
      }
      if (rawUrl.includes('/eliosOrder') && init?.body) {
        try {
          const payload = JSON.parse(init.body);
          if (String(payload.action || '').toLowerCase() === 'submit') {
            payload.collection = slug;
            init = { ...init, body: JSON.stringify(payload) };
          }
        } catch (_) {}
      }
      return originalFetch(target, init);
    };
  }

  function updateMeta(source) {
    const name = source?.collection || 'ELIOS';
    document.title = `Disponibilités ELIOS — ${name} | LE ROY FACTORY`;
    const foot = document.querySelector('.footnote');
    if (foot) foot.textContent = source?.source || `Données techniques : Catalogue Général ELIOS 2026 · ${name}.`;
  }

  async function start() {
    if (!ACTIVE.has(slug)) {
      const empty = document.getElementById('stock-empty');
      if (empty) { empty.hidden = false; empty.textContent = 'Cette série ELIOS sera activée dans un prochain lot.'; }
      return;
    }
    installFetchBridge();
    if (slug === 'roma') {
      updateMeta(window.ELIOS_ROMA_STOCK_DATA);
      injectManualGuardThenMain();
      return;
    }
    try {
      const response = await originalFetch(`${CATALOG_API}?collection=${encodeURIComponent(slug)}`, { cache:'no-store' });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.collection) throw new Error(data?.error || 'Catalogue indisponible.');
      window.ELIOS_ROMA_STOCK_DATA = data.collection;
      updateMeta(data.collection);
      injectManualGuardThenMain();
    } catch (error) {
      const empty = document.getElementById('stock-empty');
      if (empty) { empty.hidden = false; empty.textContent = 'Impossible de charger cette série ELIOS pour le moment.'; }
      console.error('ELIOS CATALOGUE BOOTSTRAP', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
