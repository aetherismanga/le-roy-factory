(() => {
  'use strict';
  if(window.__LRF_BIOPIETRA_STABLE__) return;
  window.__LRF_BIOPIETRA_STABLE__=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const money=v=>Number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  function isBio(){return norm($('#workspace-title')?.textContent)==='biopietra'}
  function render(){
    if(!isBio()) return;
    const api=window.BIOPIETRA_2026,host=$('#partner-products'),count=$('#partner-count');
    if(!api||!Array.isArray(api.products)||!host||!count) return;
    const placeholder=/maintenant séparé|catalogue produits à intégrer/i.test(host.textContent||'');
    const cards=$$('.bio-card',host);
    if(cards.length===api.products.length && !placeholder) return;
    host.className='bio-grid'; host.dataset.biopietra2026='1';
    const allowed=true;
    host.innerHTML=api.products.map((p,i)=>{
      const vals=(p.lines||[]).map(x=>api.prices?.[x.code]).filter(Number.isFinite);const min=vals.length?Math.min(...vals):null;
      return `<button type="button" class="bio-card" data-bio-index="${i}" data-bio-name="${p.name}"><div class="bio-card-top"><img src="assets/img/biopietra.png" alt=""><div><small>${p.type||'Produit'}</small><strong>${p.name}</strong></div></div><div class="bio-card-body"><p>${(p.lines||[]).length} tarif${(p.lines||[]).length>1?'s':''} / configuration${(p.lines||[]).length>1?'s':''}</p><div class="bio-card-price">${min!=null?'À partir de '+money(min):'Voir les références et tarifs'}</div>${p.note?`<p class="bio-card-note">${p.note}</p>`:''}</div></button>`;
    }).join('');
    count.textContent=`${api.products.length} produits`;
    window.dispatchEvent(new CustomEvent('lrf-biopietra-rerendered'));
  }
  let t=0;const schedule=()=>{clearTimeout(t);t=setTimeout(render,40)};
  document.addEventListener('click',schedule,true);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('load',schedule);setTimeout(schedule,250);
})();