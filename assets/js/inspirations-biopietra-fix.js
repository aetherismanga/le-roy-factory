(() => {
  'use strict';
  if(window.__LRF_BIOPIETRA_FIX_20260912__)return;
  window.__LRF_BIOPIETRA_FIX_20260912__=true;
  const $=(s,r=document)=>r.querySelector(s);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let lastBio=false,timer=0;
  function sync(){
    const host=$('#partner-products'),title=norm($('#workspace-title')?.textContent),input=$('#v2-search');
    const bio=title==='biopietra';
    if(host&&!bio&&lastBio) delete host.dataset.biopietra2026;
    lastBio=bio;
    if(!bio||!host)return;
    if(!host.querySelector('.bio-card')) delete host.dataset.biopietra2026;
    const q=norm(input?.value||'');
    host.querySelectorAll('.bio-card').forEach(card=>{
      card.style.display=!q||norm(card.textContent).includes(q)?'':'none';
    });
    const visible=[...host.querySelectorAll('.bio-card')].filter(c=>c.style.display!=='none').length;
    const count=$('#partner-count');if(count&&host.querySelector('.bio-card'))count.textContent=`${visible} produit${visible>1?'s':''}`;
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(sync,100)};
  document.addEventListener('input',e=>{if(e.target?.id==='v2-search')schedule()},true);
  document.addEventListener('click',schedule,true);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  schedule();
})();