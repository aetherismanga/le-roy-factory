(() => {
  'use strict';
  if (window.__LRF_IOS_FULL_PARITY__) return;
  window.__LRF_IOS_FULL_PARITY__ = true;

  const loaded = new Map();
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));

  function load(src) {
    const key = src.split('?')[0];
    if ([...document.scripts].some(s => s.src && s.src.includes(key))) return Promise.resolve();
    if (loaded.has(key)) return loaded.get(key);
    const p = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.dataset.lrfIosParity = '1';
      s.onload = resolve;
      s.onerror = resolve;
      (document.body || document.head || document.documentElement).appendChild(s);
    });
    loaded.set(key, p);
    return p;
  }

  async function loadSeries(list) {
    for (const src of list) {
      await load(src);
      await frame();
      await pause(28);
    }
  }

  const BIO = [
    'assets/js/inspirations-biopietra-series-media.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-2026.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-fix.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-actions.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-search-v2.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-gallery.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-stable.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-product-details.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-overview-consumables.js?v=20260924-bio-about2',
    'assets/js/inspirations-biopietra-modal-safety.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-batch2.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-stability-hotfix.js?v=20260923-ios-parity1',
    'assets/js/biopietra-product-options.js?v=20260923-ios-parity1',
    'assets/js/inspirations-biopietra-colors.js?v=20260923-ios-parity1',
    'assets/js/biopietra-ui-hotfix-20260913.js?v=20260924-bio-about2'
  ];

  const REV = [
    'assets/js/reviglass-search-index.js?v=20260923-ios-parity1',
    'assets/js/inspirations-search-bridge-v2.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-pool-2026.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-palette-qty.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-reset.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-action-bridge.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-flow-fix.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-ps-gallery.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-ab-fast-gallery.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-mixiris-fast-gallery.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-paradise-gallery-v2.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-all-series-gallery.js?v=20260923-ios-parity1',
    'assets/js/inspirations-reviglass-ref-swipe.js?v=20260923-ios-parity1'
  ];

  let bioPromise = null;
  let revPromise = null;

  function currentPartner() {
    return norm(document.getElementById('workspace-title')?.textContent || '');
  }

  async function ensureForPartner(name) {
    const n = norm(name || currentPartner());
    if (n === 'biopietra' && !bioPromise) bioPromise = loadSeries(BIO);
    if (n === 'reviglass' && !revPromise) revPromise = loadSeries(REV);
    return n === 'biopietra' ? bioPromise : n === 'reviglass' ? revPromise : Promise.resolve();
  }

  async function bootLight() {
    await loadSeries([
      'assets/js/selections-stability.js?v=20260923-ios-parity1',
      'assets/js/inspirations-bilt-order-link.js?v=20260923-ios-parity1',
      'assets/js/fenice-lexicon-data.js?v=20260923-ios-parity1',
      'assets/js/products-alphabetical-order.js?v=20260923-ios-parity1',
      'assets/js/selections-lazy-enhancements.js?v=20260923-ios-parity1'
    ]);
  }

  document.addEventListener('pointerdown', e => {
    const p = e.target.closest?.('[data-partner]');
    if (p) ensureForPartner(p.dataset.partner);
  }, {capture:true, passive:true});

  document.addEventListener('click', e => {
    if (!e.target.closest?.('[data-cat],[data-partner],[data-custom-cat]')) return;
    setTimeout(() => ensureForPartner(), 0);
    setTimeout(() => ensureForPartner(), 120);
  }, true);

  window.addEventListener('pageshow', () => setTimeout(() => ensureForPartner(), 80), {passive:true});

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootLight(), {once:true});
  } else {
    bootLight();
  }
})();