(() => {
  'use strict';
  if (window.__LRF_SELECTIONS_LAZY_ENHANCEMENTS__) return;
  window.__LRF_SELECTIONS_LAZY_ENHANCEMENTS__ = true;

  const GROUPS = {
    elios: [
      'assets/js/inspirations-elios-pricing.js?v=20260902-20mm1',
      'assets/js/inspirations-elios-pool-integrated.js?v=20260907-pool2',
      'assets/js/inspirations-elios-official-galleries.js?v=20260902-batch2',
      'assets/js/inspirations-elios-official-galleries-2.js?v=20260902-batch3',
      'assets/js/inspirations-elios-official-galleries-3.js?v=20260902-batch4',
      'assets/js/inspirations-elios-official-galleries-4.js?v=20260902-batch5',
      'assets/js/inspirations-elios-official-galleries-5.js?v=20260902-stones1',
      'assets/js/inspirations-elios-official-galleries-6.js?v=20260902-stones2',
      'assets/js/inspirations-elios-fix-bavaria-dolomiti-harmony.js?v=20260902-fix4',
      'assets/js/inspirations-elios-pass1-hd.js?v=20260902-pass1hd2',
      'assets/js/inspirations-elios-lot1-hd.js?v=20260902-lot1hd2',
      'assets/js/inspirations-elios-slate-hd.js?v=20260902-slatehq1',
      'assets/js/inspirations-elios-azuli-hd.js?v=20260911-azuli-hd2',
      'assets/js/inspirations-elios-gallery-v2.js?v=20260902-lot1hd2'
    ],
    view: [
      'assets/js/inspirations-view-data.js?v=20260907-view-lot1-final',
      'assets/js/inspirations-view-elios-parity.js?v=20260907-view-parity3',
      'assets/js/inspirations-view-data-lot2.js?v=20260907-view-lot2',
      'assets/js/inspirations-view-data-lot3.js?v=20260907-view-lot3',
      'assets/js/inspirations-view-accessories.js?v=20260911-view-accessories1',
      'assets/js/inspirations-view-hd.js?v=20260907-view-hd1',
      'assets/js/inspirations-view-mobile-safe.js?v=20260907-view-safe1',
      'assets/js/inspirations-view-accessories-ui.js?v=20260911-view-accessories-ui1',
      'assets/js/inspirations-view-order-v4.js?v=20260911-view-order-v4',
      'assets/js/inspirations-view-order-v5-polish.js?v=20260911-view-order-v5',
      'assets/js/inspirations-view-order-email-recap-fix.js?v=20260911-view-mail-recap2'
    ]
  };

  const states = new Map();
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function loadScript(src) {
    if ([...document.scripts].some(s => s.src && s.src.includes(src.split('?')[0]))) return Promise.resolve();
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.lrfLazySelection = '1';
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  }

  async function loadGroup(name, urgent = false) {
    if (states.has(name)) return states.get(name);
    const promise = (async () => {
      const list = GROUPS[name] || [];
      for (const src of list) {
        await loadScript(src);
        if (urgent) await nextFrame();
        else await wait(45);
      }
      window.dispatchEvent(new CustomEvent(`lrf-selections-${name}-ready`));
    })();
    states.set(name, promise);
    return promise;
  }

  function idle(callback, timeout = 1200) {
    if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
    return setTimeout(callback, 260);
  }

  document.addEventListener('pointerdown', e => {
    const partner = e.target.closest?.('[data-partner]');
    if (partner && /view/i.test(partner.dataset.partner || '')) loadGroup('view', true);
    const card = e.target.closest?.('.product-card-v2');
    const title = document.getElementById('workspace-title')?.textContent || '';
    if (card && /elios/i.test(title)) loadGroup('elios', true);
  }, { capture: true, passive: true });

  const startBackgroundLoad = () => {
    idle(() => {
      loadGroup('elios').finally(() => { idle(() => loadGroup('view'), 1800); });
    }, 1000);
  };

  if (document.readyState === 'complete') startBackgroundLoad();
  else window.addEventListener('load', startBackgroundLoad, { once: true, passive: true });
})();