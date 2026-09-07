(() => {
  'use strict';
  if (window.__LRF_GLOBAL_SEARCH_ROUTER__) return;
  window.__LRF_GLOBAL_SEARCH_ROUTER__ = true;

  const path = (location.pathname || '/').toLowerCase();
  const file = path.split('/').pop() || 'index.html';

  function addCss(href,id) {
    if (document.getElementById(id)) return;
    const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  }
  function loadScript(src,id) {
    return new Promise((resolve,reject) => {
      if (document.getElementById(id)) { resolve(); return; }
      const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;(document.head||document.documentElement).appendChild(s);
    });
  }

  function installViewInspirationsGuard(){
    if(window.__LRF_VIEW_EARLY_GUARD__)return;
    window.__LRF_VIEW_EARLY_GUARD__=true;

    /* Neutralise l'ancien contrôleur VIEW instable : le contrôleur mobile safe prend la main. */
    window.__LRF_VIEW_INSPIRATIONS_V2__=true;

    const compact=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const filter=value=>Array.isArray(value)?value.filter(p=>{
      const name=compact(p?.name),collection=compact(p?.collection),source=compact(p?.sourceLabel);
      return name!=='lux'&&name!=='rovereforte'&&!collection.includes('ilegni')&&!source.includes('catalogueilegni');
    }):value;
    const d=Object.getOwnPropertyDescriptor(window,'VIEW_CATALOGUE');
    if(Array.isArray(window.VIEW_CATALOGUE))window.VIEW_CATALOGUE=filter(window.VIEW_CATALOGUE);
    else if(!d||d.configurable){let catalogue=window.VIEW_CATALOGUE;Object.defineProperty(window,'VIEW_CATALOGUE',{configurable:true,enumerable:true,get(){return catalogue},set(value){catalogue=filter(value)}})}
    const style=document.createElement('style');style.id='lrf-view-early-parity-style';style.textContent='.view-product-card .view-card-note,.view-product-card .view-card-price{display:none!important}.view-product-card,.view-safe-card{cursor:pointer;touch-action:manipulation}';document.head.appendChild(style);
  }

  async function installHomeSearch() {
    const start = async () => {
      const old=[...document.querySelectorAll('.hero-buttons a')].find(a => /partenaires\.html/i.test(a.getAttribute('href')||''));
      if (!old || document.getElementById('lrf-open-search')) return;
      const button=document.createElement('button');
      button.type='button';button.id='lrf-open-search';button.className=old.className;button.innerHTML='🔍 Rechercher';
      old.replaceWith(button);
      addCss('assets/css/site-search.css?v=20260907-search9','lrf-site-search-css');
      try {
        await loadScript('assets/js/inspirations-elios-data.js?v=20260907-search9','lrf-search-elios-data');
        await loadScript('assets/js/inspirations-view-data.js?v=20260907-view-lot1-final','lrf-search-view-data');
        await loadScript('assets/js/inspirations-view-elios-parity.js?v=20260907-view-parity3','lrf-search-view-parity');
        await loadScript('assets/js/inspirations-view-data-lot2.js?v=20260907-view-lot2','lrf-search-view-data-lot2');
        await loadScript('assets/js/inspirations-view-data-lot3.js?v=20260907-view-lot3','lrf-search-view-data-lot3');
        await loadScript('assets/js/inspirations-neobath-data.js?v=20260907-search9','lrf-search-neobath-data');
        await loadScript('assets/js/site-search.js?v=20260907-search9','lrf-site-search-js');
      } catch (err) { console.warn('LRF search load',err); }
    };
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  }

  if (file==='index.html' || file==='') installHomeSearch();
  if (file==='univers.html') {
    installViewInspirationsGuard();
    loadScript('assets/js/inspirations-view-mobile-safe.js?v=20260907-view-safe1','lrf-view-mobile-safe').catch(()=>{});
    loadScript('assets/js/inspirations-search-bridge.js?v=20260907-search9','lrf-inspirations-search-bridge').catch(()=>{});
  }
  if (file==='tarifs-pro.html') loadScript('assets/js/tarifs-search-bridge.js?v=20260907-search9','lrf-tarifs-search-bridge').catch(()=>{});
})();