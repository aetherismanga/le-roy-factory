(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_RECOVERY_20260912__) return;
  window.__LRF_BIOPIETRA_RECOVERY_20260912__ = true;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let t=0;
  function recover(){
    clearTimeout(t); t=setTimeout(()=>{
      const title=document.querySelector('#workspace-title');
      const host=document.querySelector('#partner-products');
      if(!title||!host||norm(title.textContent)!=='biopietra') return;
      if(host.querySelector('.bio-card')) return;
      delete host.dataset.biopietra2026;
      document.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:false,view:window}));
    },120);
  }
  new MutationObserver(recover).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',recover);
  document.addEventListener('click',recover,true);
  recover();
})();