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

  function trackConfirmedOrder(partner, extras = {}) {
    const api = window.LRF_ANALYTICS;
    const session = window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || null;
    if (!api?.track || !session || session.isAdmin || !session.sessionToken) return;

    const payload = {
      partner: clean(partner || extras.partner || partnerFromPage(), 80),
      productRef: clean(extras.productRef, 80),
      productName: clean(extras.productName, 180),
      collection: clean(extras.collection, 120),
      orderId: clean(extras.orderId, 120),
      source: clean(extras.source || 'order-confirmed', 50)
    };

    const key = [session.codeClient, payload.partner, payload.orderId, payload.productRef, payload.productName].join('|');
    if (sent.has(key)) return;
    sent.set(key, Date.now());
    api.track('order_view', payload);
  }

  // IMPORTANT : aucune commande n'est déduite d'un clic, d'un formulaire ouvert,
  // d'un aperçu ou d'un simple submit. Le suivi n'est déclenché qu'après confirmation
  // explicite du code métier qu'une commande a réellement été envoyée/enregistrée.
  window.addEventListener('lrf-order-sent', event => {
    const detail = event?.detail || {};
    trackConfirmedOrder(detail.partner, detail);
  });

  window.LRF_ORDER_ANALYTICS = {
    trackConfirmed: (partner, extras = {}) => trackConfirmedOrder(partner, extras),
    // Compatibilité : track() reste disponible mais exige une source explicitement confirmée.
    track: (partner, extras = {}) => {
      const source = clean(extras.source, 50).toLowerCase();
      if (!/(confirmed|sent|success|envoy)/.test(source)) return;
      trackConfirmedOrder(partner, extras);
    }
  };
})();
