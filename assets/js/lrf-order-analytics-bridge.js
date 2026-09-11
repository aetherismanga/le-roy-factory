(() => {
  'use strict';
  if (window.__LRF_ORDER_ANALYTICS_BRIDGE__) return;
  window.__LRF_ORDER_ANALYTICS_BRIDGE__ = true;

  const clean = (v, max = 180) => String(v ?? '').trim().slice(0, max);
  const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sent = new Map();

  function partnerFromPage() {
    const p = norm(location.pathname + ' ' + document.title);
    if (p.includes('view')) return 'view-ceramica';
    if (p.includes('elios')) return 'elios-ceramica';
    if (p.includes('bilt')) return 'bilt';
    if (p.includes('reviglass')) return 'reviglass';
    if (p.includes('randal')) return 'randal-pro';
    if (p.includes('neobath')) return 'neobath';
    if (p.includes('koibath')) return 'koibath';
    if (p.includes('aquahome')) return 'aquahome';
    if (p.includes('opal')) return 'opal';
    if (p.includes('bulbo')) return 'bulbo';
    if (p.includes('fenice')) return 'la-fenice';
    if (p.includes('biopietra')) return 'biopietra';
    if (p.includes('petracers')) return 'petracers';
    if (p.includes('pecchioli')) return 'pecchioli-firenze';
    return '';
  }

  function readProduct(target) {
    const scope = target?.closest?.('[data-product-ref],[data-ref],[data-product],[data-collection],form,.modal,.dialog') || document;
    const ref = clean(scope.querySelector?.('[data-product-ref],[data-ref]')?.dataset?.productRef || scope.querySelector?.('[data-ref]')?.dataset?.ref || '');
    const name = clean(scope.querySelector?.('[data-product-name],[data-product]')?.dataset?.productName || scope.querySelector?.('[data-product]')?.dataset?.product || scope.querySelector?.('h2,h3,.product-name,.pname')?.textContent || '');
    const collection = clean(scope.querySelector?.('[data-collection]')?.dataset?.collection || '');
    return { productRef: ref, productName: name, collection };
  }

  function trackOrder(partner, target, source) {
    const api = window.LRF_ANALYTICS;
    const session = window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || null;
    if (!api?.track || !session || session.isAdmin || !session.sessionToken) return;
    const extras = readProduct(target);
    extras.partner = partner || partnerFromPage();
    extras.source = source || 'order-confirmation';
    const key = [session.codeClient, extras.partner, extras.productRef, extras.productName, Math.floor(Date.now()/10000)].join('|');
    if (sent.has(key)) return;
    sent.set(key, Date.now());
    api.track('order_view', extras);
  }

  function looksLikeOrder(text) {
    const t = norm(text);
    return t.includes('commande') && !t.includes('disponibilite');
  }

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const text = `${form.id} ${form.className} ${form.textContent || ''} ${document.querySelector('#view-order-title')?.textContent || ''}`;
    if (!looksLikeOrder(text)) return;
    trackOrder(partnerFromPage(), form, `submit:${form.id || 'order-form'}`);
  }, true);

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button,a,[role="button"]') : null;
    if (!target) return;
    const text = `${target.id} ${target.className} ${target.getAttribute('aria-label') || ''} ${target.textContent || ''}`;
    const id = String(target.id || '');
    const known = ['order-review-confirm','submit-order','rev-prepare','view-order-submit'].includes(id);
    if (!known && !looksLikeOrder(text)) return;
    if (/modifier|retour|historique|annuler|disponibilit/i.test(text)) return;
    const partner = id === 'submit-order' ? 'bilt' : id.startsWith('rev-') ? 'reviglass' : partnerFromPage();
    setTimeout(() => trackOrder(partner, target, `click:${id || 'order-button'}`), 0);
  }, true);

  window.LRF_ORDER_ANALYTICS = { track: (partner, extras = {}) => {
    const api = window.LRF_ANALYTICS;
    if (!api?.track) return;
    api.track('order_view', { partner: clean(partner, 80), ...extras, source: extras.source || 'explicit-order' });
  }};
})();
