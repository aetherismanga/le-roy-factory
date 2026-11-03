(() => {
  'use strict';
  if (window.__LRF_ORDER_ANALYTICS_ACCURACY__) return;
  window.__LRF_ORDER_ANALYTICS_ACCURACY__ = true;

  // Old navigation modules may still be cached on mobile. This page loads its
  // current revenue module explicitly and must not revive legacy DOM patches.
  if (typeof document !== 'undefined' && document.body?.dataset.lrfReports === '2') {
    window.__LRF_CLIENT_CA_LOADER__ = true;
    window.__LRF_ANALYSIS_FIX_LOADER__ = true;
  }

  const ANALYTICS_ENDPOINT = 'getLrfAnalytics';
  const originalFetch = window.fetch.bind(window);
  const confirmedSources = new Set(['order-confirmed','order-sent','order-success','commande-envoyee','confirmed','sent','success','envoye','envoyee']);
  const sourceOk = source => confirmedSources.has(String(source || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  const isConfirmedOrder = e => e?.action !== 'order_view' || sourceOk(e?.source);

  function fixClient(c, counts) {
    if (!c) return c;
    const confirmed = counts.get(String(c.id || c.clientId || '')) || 0;
    const old = Number(c.orderViews || 0);
    c.orderViews = confirmed;
    if (Array.isArray(c.heatReasons)) c.heatReasons = c.heatReasons.filter(x => !/commande/i.test(String(x)));
    if (old > confirmed && Number.isFinite(Number(c.heatScore))) {
      c.heatScore = Math.max(0, Number(c.heatScore) - ((old - confirmed) * 40));
      c.heatLabel = c.heatScore >= 75 ? 'Très chaud' : c.heatScore >= 50 ? 'Chaud' : c.heatScore >= 25 ? 'Tiède' : 'Froid';
    }
    return c;
  }

  function sanitize(json) {
    if (!json || !json.success) return json;
    const timeline = Array.isArray(json.timeline) ? json.timeline : [];
    const cleanTimeline = timeline.filter(isConfirmedOrder);
    json.timeline = cleanTimeline;
    if (json.orderAnalytics?.version === 2) {
      // The API counts all matching events before truncating its chronology.
      // Never overwrite these totals with a recount of just the visible 1,200.
      json.orders = Array.isArray(json.orders) ? json.orders.filter(e => e.action === 'order_view' && sourceOk(e.source)) : cleanTimeline.filter(e => e.action === 'order_view');
      return json;
    }
    const counts = new Map();
    cleanTimeline.forEach(e => {
      if (e.action !== 'order_view') return;
      const id = String(e.clientId || '');
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    json.orders = cleanTimeline.filter(e => e.action === 'order_view');
    json.orderAnalytics = {version:1,coverage:'tracked-client-events',incomplete:true,reason:'legacy-timeline-only'};
    if (json.general) json.general.orders = [...counts.values()].reduce((a,b)=>a+b,0);
    if (Array.isArray(json.clients)) json.clients.forEach(c => fixClient(c, counts));
    if (Array.isArray(json.hotClients)) json.hotClients.forEach(c => fixClient(c, counts));
    if (Array.isArray(json.connectedRecent)) json.connectedRecent.forEach(c => fixClient(c, counts));
    return json;
  }

  window.fetch = async function(input, init) {
    const response = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (!String(url).includes(ANALYTICS_ENDPOINT)) return response;
    try {
      const json = sanitize(await response.clone().json());
      return new Response(JSON.stringify(json), {
        status: response.status,
        statusText: response.statusText,
        headers: {'Content-Type':'application/json','Cache-Control':'no-store'}
      });
    } catch (_) { return response; }
  };
})();
