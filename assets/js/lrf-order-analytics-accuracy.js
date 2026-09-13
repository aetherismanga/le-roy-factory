(() => {
  'use strict';
  if (window.__LRF_ORDER_ANALYTICS_ACCURACY__) return;
  window.__LRF_ORDER_ANALYTICS_ACCURACY__ = true;

  const ANALYTICS_ENDPOINT = 'getLrfAnalytics';
  const originalFetch = window.fetch.bind(window);
  const sourceOk = source => /(confirmed|sent|success|envoy)/i.test(String(source || ''));
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
    const counts = new Map();
    cleanTimeline.forEach(e => {
      if (e.action !== 'order_view') return;
      const id = String(e.clientId || '');
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    json.timeline = cleanTimeline;
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
