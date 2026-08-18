const isCartePage = (location.pathname.split('/').pop() || '').toLowerCase() === 'carte.html';

if (isCartePage) {
  let mapInstance = null;

  // Capture propre de l'instance Leaflet créée par carte.html.
  if (window.L?.map && !window.L.map.__lrfWrapped) {
    const originalMap = window.L.map;
    const wrappedMap = function (...args) {
      const map = originalMap.apply(this, args);
      mapInstance = map;
      window.__lrfCarteMap = map;
      return map;
    };
    Object.assign(wrappedMap, originalMap);
    wrappedMap.__lrfWrapped = true;
    window.L.map = wrappedMap;
  }

  function injectStyles() {
    if (document.getElementById('lrf-carte-mobile-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-carte-mobile-style';
    style.textContent = `
      .map-mobile-toolbar{display:none}
      .map-filter-backdrop{display:none}
      .map-filter-sheet-head{display:none}
      @media(max-width:900px){
        body.crm-body.map-mobile-optimized{overflow-x:hidden!important}
        body.map-mobile-optimized .crm-topbar{display:none!important}
        body.map-mobile-optimized .crm-main-content{padding-top:78px!important;padding-left:0!important;padding-right:0!important;padding-bottom:92px!important}
        body.map-mobile-optimized .map-card{margin:0!important;padding:.55rem!important;border-radius:0!important;border-left:0!important;border-right:0!important;box-shadow:none!important;background:#FBF9F5!important}
        body.map-mobile-optimized #map{height:calc(100dvh - 205px)!important;min-height:540px!important;border-radius:14px!important;border:1px solid #e4ded2!important}
        body.map-mobile-optimized .map-mobile-toolbar{display:flex;align-items:center;gap:.45rem;margin:0 0 .55rem;padding:0 .1rem;position:relative;z-index:4}
        body.map-mobile-optimized .map-count-pill{display:inline-flex;align-items:center;min-height:42px;padding:.5rem .75rem;border-radius:12px;background:#111;color:#FFD700;border:1px solid #D4AF37;font-weight:900;font-size:.82rem;white-space:nowrap;max-width:42vw;overflow:hidden;text-overflow:ellipsis}
        body.map-mobile-optimized .map-tool-btn{width:43px;height:43px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;border:1px solid #D4AF37;background:#111;color:#FFD700;font-size:1.12rem;font-weight:900;cursor:pointer;flex:0 0 auto}
        body.map-mobile-optimized .map-tool-btn.filters{width:auto;padding:0 .75rem;gap:.35rem;font-size:.78rem;margin-left:auto}
        body.map-mobile-optimized #btn-fullscreen-toggle{margin:0!important;width:43px!important;height:43px!important;padding:0!important;border-radius:12px!important;display:inline-flex!important;justify-content:center!important}
        body.map-mobile-optimized #btn-fullscreen-toggle #fs-text{display:none!important}
        body.map-mobile-optimized .map-card>div[style*="margin-bottom"]{display:none!important}
        body.map-mobile-optimized .filter-bar{position:fixed!important;left:0;right:0;bottom:0;z-index:12050!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:.55rem!important;margin:0!important;padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom))!important;background:#fff!important;border-radius:20px 20px 0 0!important;border:1px solid #D4AF37!important;box-shadow:0 -18px 50px rgba(0,0,0,.25)!important;transform:translateY(110%);transition:transform .22s ease;max-height:78vh;overflow:auto}
        body.map-mobile-optimized .filter-bar.mobile-open{transform:translateY(0)}
        body.map-mobile-optimized .map-filter-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem}
        body.map-mobile-optimized .map-filter-sheet-head strong{font-size:1.05rem}
        body.map-mobile-optimized .map-filter-close{width:38px;height:38px;border-radius:10px;border:0;background:#f0eee9;font-size:1.1rem;cursor:pointer}
        body.map-mobile-optimized .filter-bar .btn-filter{width:100%!important;min-height:48px!important;padding:.65rem .8rem!important;border-radius:11px!important;font-size:.82rem!important;text-align:left!important}
        body.map-mobile-optimized .filter-bar .select-dept{width:100%!important;min-height:48px!important;padding:.65rem .8rem!important;border-radius:11px!important;font-size:.84rem!important}
        body.map-mobile-optimized .filter-bar #btn-fullscreen-toggle{display:none!important}
        body.map-mobile-optimized .map-filter-backdrop{position:fixed;inset:0;z-index:12040;background:rgba(0,0,0,.45);backdrop-filter:blur(2px)}
        body.map-mobile-optimized .map-filter-backdrop.open{display:block}
        body.map-mobile-optimized .leaflet-control-zoom{margin-top:12px!important;margin-left:12px!important}
        body.map-mobile-optimized .leaflet-popup-content{margin:10px 12px!important}
        body.map-mobile-optimized .map-card.fullscreen{padding:.45rem!important;background:#FBF9F5!important}
        body.map-mobile-optimized .map-card.fullscreen #map{height:auto!important;min-height:0!important;border-radius:10px!important}
        body.map-mobile-optimized .map-card.fullscreen .map-mobile-toolbar{padding-top:env(safe-area-inset-top)}
      }
      @media(max-width:390px){
        body.map-mobile-optimized .map-count-pill{max-width:36vw;font-size:.75rem;padding:.45rem .55rem}
        body.map-mobile-optimized .map-tool-btn.filters{padding:0 .55rem}
      }
    `;
    document.head.appendChild(style);
  }

  function visibleMarkerBounds() {
    const map = mapInstance || window.__lrfCarteMap;
    if (!map || !window.L) return null;
    const points = [];
    map.eachLayer(layer => {
      if (layer instanceof L.Marker && typeof layer.getLatLng === 'function') {
        const ll = layer.getLatLng();
        if (ll && Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) points.push(ll);
      }
    });
    return points.length ? L.latLngBounds(points) : null;
  }

  function fitVisibleMarkers() {
    const map = mapInstance || window.__lrfCarteMap;
    const bounds = visibleMarkerBounds();
    if (!map || !bounds) return;
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) map.setView(bounds.getCenter(), 12);
    else map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
  }

  function initMobileMapUi() {
    if (!window.matchMedia('(max-width:900px)').matches) return;
    const card = document.getElementById('map-card-container');
    const mapEl = document.getElementById('map');
    const filterBar = card?.querySelector('.filter-bar');
    const counter = document.getElementById('map-counter');
    const fsBtn = document.getElementById('btn-fullscreen-toggle');
    if (!card || !mapEl || !filterBar || !counter || document.querySelector('.map-mobile-toolbar')) return;

    document.body.classList.add('map-mobile-optimized');
    injectStyles();

    const toolbar = document.createElement('div');
    toolbar.className = 'map-mobile-toolbar';
    toolbar.innerHTML = `
      <span class="map-count-pill" id="map-mobile-count">Clients...</span>
      <button type="button" class="map-tool-btn filters" id="map-mobile-filter" aria-label="Ouvrir les filtres">⚙ Filtres</button>
      <button type="button" class="map-tool-btn" id="map-mobile-locate" aria-label="Ma position" title="Ma position">📍</button>
    `;
    card.insertBefore(toolbar, filterBar);

    if (fsBtn) {
      toolbar.appendChild(fsBtn);
      fsBtn.classList.add('map-tool-btn');
      fsBtn.setAttribute('aria-label', 'Plein écran');
    }

    const head = document.createElement('div');
    head.className = 'map-filter-sheet-head';
    head.innerHTML = '<strong>Filtres de la carte</strong><button type="button" class="map-filter-close" aria-label="Fermer">✕</button>';
    filterBar.prepend(head);

    const backdrop = document.createElement('div');
    backdrop.className = 'map-filter-backdrop';
    document.body.appendChild(backdrop);

    const openFilters = () => { filterBar.classList.add('mobile-open'); backdrop.classList.add('open'); };
    const closeFilters = () => { filterBar.classList.remove('mobile-open'); backdrop.classList.remove('open'); };
    document.getElementById('map-mobile-filter')?.addEventListener('click', openFilters);
    head.querySelector('.map-filter-close')?.addEventListener('click', closeFilters);
    backdrop.addEventListener('click', closeFilters);

    filterBar.querySelectorAll('.btn-filter').forEach(btn => btn.addEventListener('click', () => {
      closeFilters();
      setTimeout(fitVisibleMarkers, 120);
    }));
    document.getElementById('dept-select')?.addEventListener('change', () => {
      closeFilters();
      setTimeout(fitVisibleMarkers, 120);
    });

    document.getElementById('map-mobile-locate')?.addEventListener('click', () => {
      const map = mapInstance || window.__lrfCarteMap;
      if (!map) return;
      const btn = document.getElementById('map-mobile-locate');
      btn.textContent = '…';
      map.once('locationfound', e => {
        btn.textContent = '📍';
        map.setView(e.latlng, Math.max(map.getZoom(), 12));
      });
      map.once('locationerror', () => {
        btn.textContent = '📍';
        alert('Impossible d’obtenir ta position. Vérifie que la géolocalisation est autorisée.');
      });
      map.locate({ setView: true, maxZoom: 13, enableHighAccuracy: true });
    });

    const updateCounter = () => {
      const n = (counter.textContent.match(/\d+/) || [])[0];
      document.getElementById('map-mobile-count').textContent = n ? `${n} clients / prospects` : 'Chargement...';
    };
    updateCounter();
    new MutationObserver(updateCounter).observe(counter, { childList: true, characterData: true, subtree: true });

    setTimeout(() => {
      const map = mapInstance || window.__lrfCarteMap;
      map?.invalidateSize();
      fitVisibleMarkers();
    }, 400);
  }

  injectStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(initMobileMapUi, 50), { once: true });
  else setTimeout(initMobileMapUi, 50);
  window.addEventListener('resize', () => {
    if (window.matchMedia('(max-width:900px)').matches) initMobileMapUi();
    setTimeout(() => (mapInstance || window.__lrfCarteMap)?.invalidateSize(), 100);
  });
}
