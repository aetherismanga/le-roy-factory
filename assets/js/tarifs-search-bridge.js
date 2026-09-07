(() => {
  'use strict';
  const wanted=(new URLSearchParams(location.search).get('partner')||'').trim();
  if(!wanted)return;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const compact=v=>norm(v).replace(/\s+/g,'');
  let applied=false;
  function apply(){
    if(applied)return true;
    const cards=[...document.querySelectorAll('#grid-tarifs .card-premium')];
    if(!cards.length)return false;
    const target=cards.find(card=>compact(card.querySelector('h3')?.textContent||'')===compact(wanted));
    if(!target)return false;
    target.style.border='2px solid #D4AF37';
    target.style.boxShadow='0 10px 34px rgba(212,175,55,.24)';
    target.style.scrollMarginTop='110px';
    const visible=target.offsetParent!==null;
    if(visible){target.scrollIntoView({behavior:'smooth',block:'start'});applied=true;}
    return applied;
  }
  const grid=document.getElementById('grid-tarifs');
  if(grid)new MutationObserver(()=>setTimeout(apply,30)).observe(grid,{childList:true,subtree:true});
  const content=document.getElementById('pro-content');
  if(content)new MutationObserver(()=>setTimeout(apply,30)).observe(content,{attributes:true,attributeFilter:['style','class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120),{once:true});else setTimeout(apply,120);
})();