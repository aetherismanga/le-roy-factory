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
      if (document.getElementById(id) || [...document.scripts].some(s => s.src && s.src.includes(src.split('?')[0]))) { resolve(); return; }
      const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;(document.head||document.documentElement).appendChild(s);
    });
  }

  function installViewInspirationsGuard(){
    if(window.__LRF_VIEW_EARLY_GUARD__)return;
    window.__LRF_VIEW_EARLY_GUARD__=true;
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

  async function bootstrapViewInspirations(){
    if(window.__LRF_VIEW_BOOTSTRAP_PROMISE__) return window.__LRF_VIEW_BOOTSTRAP_PROMISE__;
    window.__LRF_VIEW_BOOTSTRAP_PROMISE__=(async()=>{
      try{
        await loadScript('assets/js/inspirations-view-data.js?v=20260907-view-lot1-final','lrf-view-data-boot');
        await loadScript('assets/js/inspirations-view-elios-parity.js?v=20260907-view-parity3','lrf-view-parity-boot');
        await loadScript('assets/js/inspirations-view-data-lot2.js?v=20260907-view-lot2','lrf-view-data2-boot');
        await loadScript('assets/js/inspirations-view-data-lot3.js?v=20260907-view-lot3','lrf-view-data3-boot');
        await loadScript('assets/js/inspirations-view-accessories.js?v=20260911-view-accessories1','lrf-view-accessories-boot');
        await loadScript('assets/js/inspirations-view-hd.js?v=20260907-view-hd1','lrf-view-hd-boot');
        await loadScript('assets/js/inspirations-view-mobile-safe.js?v=20260911-view-safe-stable2','lrf-view-mobile-safe');
        await loadScript('assets/js/inspirations-view-pallet-info.js?v=20260912-pallet1','lrf-view-pallet-info');
        window.dispatchEvent(new CustomEvent('lrf-view-bootstrap-ready'));
      }catch(err){
        console.warn('LRF VIEW bootstrap',err);
        setTimeout(()=>{loadScript('assets/js/inspirations-view-mobile-safe.js?v=20260911-view-safe-stable2','lrf-view-mobile-safe-retry').catch(()=>{});},500);
      }
    })();
    return window.__LRF_VIEW_BOOTSTRAP_PROMISE__;
  }

  async function installHomeSearch() {
    const start = async () => {
      const old=[...document.querySelectorAll('.hero-buttons a')].find(a => /partenaires\.html/i.test(a.getAttribute('href')||''));
      if (!old || document.getElementById('lrf-open-search')) return;
      const button=document.createElement('button');
      button.type='button';button.id='lrf-open-search';button.className=old.className;
      button.setAttribute('aria-label','Rechercher sur LE ROY FACTORY');
      button.innerHTML='<svg class="lrf-search-trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Rechercher</span>';
      old.replaceWith(button);
      addCss('assets/css/site-search.css?v=20260907-search9','lrf-site-search-css');
      try {
        await loadScript('assets/js/inspirations-elios-data.js?v=20260907-search9','lrf-search-elios-data');
        await loadScript('assets/js/inspirations-view-data.js?v=20260907-view-lot1-final','lrf-search-view-data');
        await loadScript('assets/js/inspirations-view-elios-parity.js?v=20260907-view-parity3','lrf-search-view-parity');
        await loadScript('assets/js/inspirations-view-data-lot2.js?v=20260907-view-lot2','lrf-search-view-data-lot2');
        await loadScript('assets/js/inspirations-view-data-lot3.js?v=20260907-view-lot3','lrf-search-view-data-lot3');
        await loadScript('assets/js/inspirations-neobath-data.js?v=20260907-search9','lrf-search-neobath-data');
        await loadScript('assets/js/reviglass-search-index.js?v=20260911-ref1','lrf-search-reviglass-index');
        await loadScript('assets/js/site-search-v2.js?v=20260911-ref1','lrf-site-search-js-v2');
      } catch (err) { console.warn('LRF search load',err); }
    };
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  }

  if (file==='index.html' || file==='') installHomeSearch();
  if (file==='univers.html') {
    installViewInspirationsGuard();
    bootstrapViewInspirations();
    loadScript('assets/js/inspirations-biopietra-2026.js?v=20260912-bio2','lrf-biopietra-2026')
      .then(()=>loadScript('assets/js/inspirations-biopietra-fix.js?v=20260912-bio2','lrf-biopietra-fix'))
      .then(()=>loadScript('assets/js/inspirations-biopietra-actions.js?v=20260912-bio3','lrf-biopietra-actions'))
      .then(()=>loadScript('assets/js/inspirations-biopietra-search-v2.js?v=20260912-bio4','lrf-biopietra-search-v2'))
      .then(()=>loadScript('assets/js/inspirations-biopietra-gallery.js?v=20260912-bio4','lrf-biopietra-gallery'))
      .then(()=>loadScript('assets/js/inspirations-biopietra-stable.js?v=20260912-bio5','lrf-biopietra-stable'))
      .then(()=>loadScript('assets/js/inspirations-biopietra-product-details.js?v=20260912-bio5','lrf-biopietra-details'))
      .then(()=>loadScript('assets/js/inspirations-biopietra-overview-consumables.js?v=20260912-bio6','lrf-biopietra-overview-consumables'))
      .catch(()=>{});
    loadScript('assets/js/reviglass-search-index.js?v=20260911-ref1','lrf-univers-reviglass-index')
      .then(()=>loadScript('assets/js/inspirations-search-bridge-v2.js?v=20260911-ref1','lrf-inspirations-search-bridge-v2'))
      .catch(()=>{});
  }
  if (file==='tarifs-pro.html') loadScript('assets/js/tarifs-search-bridge.js?v=20260907-search9','lrf-tarifs-search-bridge').catch(()=>{});
})();