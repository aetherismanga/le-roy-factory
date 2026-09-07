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

  async function installHomeSearch() {
    const start = async () => {
      const old=[...document.querySelectorAll('.hero-buttons a')].find(a => /partenaires\.html/i.test(a.getAttribute('href')||''));
      if (!old || document.getElementById('lrf-open-search')) return;
      const button=document.createElement('button');
      button.type='button';button.id='lrf-open-search';button.className=old.className;button.innerHTML='🔍 Rechercher';
      old.replaceWith(button);
      addCss('assets/css/site-search.css?v=20260907-search2','lrf-site-search-css');
      try {
        await loadScript('assets/js/inspirations-elios-data.js?v=20260907-search2','lrf-search-elios-data');
        await loadScript('assets/js/inspirations-neobath-data.js?v=20260907-search2','lrf-search-neobath-data');
        await loadScript('assets/js/site-search.js?v=20260907-search2','lrf-site-search-js');
      } catch (err) { console.warn('LRF search load',err); }
    };
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  }

  if (file==='index.html' || file==='') installHomeSearch();
  if (file==='univers.html') loadScript('assets/js/inspirations-search-bridge.js?v=20260907-search2','lrf-inspirations-search-bridge').catch(()=>{});
  if (file==='tarifs-pro.html') loadScript('assets/js/tarifs-search-bridge.js?v=20260907-search2','lrf-tarifs-search-bridge').catch(()=>{});
})();