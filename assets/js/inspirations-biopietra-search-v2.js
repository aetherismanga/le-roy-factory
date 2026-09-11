(() => {
  'use strict';
  if(window.__LRF_BIOPIETRA_SEARCH_V2__)return;
  window.__LRF_BIOPIETRA_SEARCH_V2__=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isBio=()=>norm($('#workspace-title')?.textContent)==='biopietra';
  let timer=0;
  function cardName(card){return $('.bio-card-top strong',card)?.textContent?.trim()||card.dataset.bioName||''}
  function ensureDatalist(){const input=$('#bio-search');if(!input||!isBio())return;input.placeholder='Rechercher une référence produit (ex. Acropoli)…';input.setAttribute('autocomplete','off');input.setAttribute('list','bio-product-ref-list');let list=$('#bio-product-ref-list');if(!list){list=document.createElement('datalist');list.id='bio-product-ref-list';document.body.appendChild(list)}const names=[...new Set($$('.bio-card').map(cardName).filter(Boolean))];list.innerHTML=names.map(n=>`<option value="${n.replace(/"/g,'&quot;')}"></option>`).join('')}
  function apply(){if(!isBio())return;ensureDatalist();const input=$('#bio-search'),host=$('#partner-products');if(!input||!host)return;const q=norm(input.value);const type=norm($('#bio-filter-type')?.value||''),unit=norm($('#bio-filter-unit')?.value||''),special=$('#bio-filter-special')?.value||'';let exact=null,visible=0;$$('.bio-card',host).forEach(card=>{const name=norm(cardName(card));const ct=norm(card.dataset.bioType||''),units=norm(card.dataset.bioUnits||'').split(' '),sp=card.dataset.bioSpecial==='1';const okQ=!q||name.includes(q),okType=!type||ct===type,okUnit=!unit||units.includes(unit),okSpecial=!special||(special==='special'?sp:!sp);const show=okQ&&okType&&okUnit&&okSpecial;card.style.display=show?'':'none';if(show)visible++;if(q&&name===q)exact=card});const count=$('#partner-count');if(count)count.textContent=`${visible} produit${visible>1?'s':''}`;if(exact&&input.dataset.bioOpened!==q){input.dataset.bioOpened=q;setTimeout(()=>exact.click(),80)}if(!q)delete input.dataset.bioOpened}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,20)}
  document.addEventListener('input',e=>{if(e.target?.id==='bio-search')schedule()},true);document.addEventListener('change',e=>{if(['bio-search','bio-filter-type','bio-filter-unit','bio-filter-special'].includes(e.target?.id))schedule()},true);new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});setTimeout(schedule,300);
})();