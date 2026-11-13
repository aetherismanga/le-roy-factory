/* Presentation only: keep the catalogue's native controls, URLs and access rules. */
(() => {
  'use strict';
  const panel=document.getElementById('partner-panel');
  const partnerButton=document.getElementById('mobile-partner-trigger');
  const filters=document.getElementById('v2-filters');
  const filterButton=document.getElementById('mobile-filter-trigger');
  const count=document.getElementById('partner-count');
  if(!panel||!partnerButton||!filters||!filterButton)return;
  const mobile=window.matchMedia('(max-width:900px)');
  const selectIds=['v2-format','v2-color','v2-effect','v2-finish'];
  const fullLabels=new WeakMap();
  function label(element,short){
    if(!element)return;
    const current=element.textContent;
    if(current!==short)fullLabels.set(element,current);
    const full=fullLabels.get(element)||current;
    const next=mobile.matches?short:full;
    if(current!==next)element.textContent=next;
    if(mobile.matches)element.setAttribute('aria-label',full);
    else element.removeAttribute('aria-label');
  }
  function sync(){
    const name=document.getElementById('workspace-title')?.textContent||'';
    const search=document.getElementById('v2-search');
    if(search&&mobile.matches&&name!=='Biopietra')search.placeholder='Rechercher…';
    partnerButton.setAttribute('aria-expanded',String(panel.classList.contains('mobile-open')));
    partnerButton.setAttribute('aria-label',`Changer de fabricant${name?' · '+name:''}`);
    const active=selectIds.filter(id=>{const value=document.getElementById(id)?.value;return value&&value!=='Tous';}).length;
    const filterLabel=mobile.matches?(filters.classList.contains('mobile-open')?'Fermer':`Filtres${active?' · '+active:''}`):'☰ Produits, formats et filtres';
    if(filterButton.textContent!==filterLabel)filterButton.textContent=filterLabel;
    filterButton.setAttribute('aria-expanded',String(filters.classList.contains('mobile-open')));
    label(document.getElementById('workspace-pro-link'),name==='Bilt'?'Commander':'Tarif PRO');
    label(document.querySelector('#partner-workspace [data-elios-samples-entry]'),'Échantillons');
    const resultButton=document.getElementById('selection-show-results');
    if(resultButton&&resultButton.textContent!=='Voir les résultats')resultButton.textContent='Voir les résultats';
    const reset=document.getElementById('selection-reset-filters');
    if(reset)reset.disabled=!active&&!search?.value;
    for(const id of selectIds){const select=document.getElementById(id);const caption=select?.closest('.selection-filter-field')?.querySelector('span');if(caption){const text=(select.options[0]?.textContent||'').replace(/^(Tous les |Toutes les )/,'');const next=text.charAt(0).toUpperCase()+text.slice(1);if(caption.textContent!==next)caption.textContent=next;}}
  }
  function closeFilters(){filters.classList.remove('mobile-open');sync();filterButton.focus({preventScroll:true});}
  partnerButton.addEventListener('click',sync);
  filterButton.addEventListener('click',sync);
  filters.addEventListener('input',sync);
  filters.addEventListener('change',sync);
  filters.addEventListener('click',event=>{
    if(event.target.closest('#selection-show-results')){closeFilters();return;}
    if(!event.target.closest('#selection-reset-filters'))return;
    const search=document.getElementById('v2-search');
    if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
    for(const id of selectIds){const select=document.getElementById(id);if(select&&select.value!=='Tous'){select.value='Tous';select.dispatchEvent(new Event('change',{bubbles:true}));}}
    sync();
  });
  filters.addEventListener('keydown',event=>{if(event.key==='Escape'&&filters.classList.contains('mobile-open'))closeFilters();});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('mobile-open')){panel.classList.remove('mobile-open');sync();partnerButton.focus({preventScroll:true});}});
  const observer=new MutationObserver(sync);
  observer.observe(panel,{attributes:true,attributeFilter:['class']});
  observer.observe(filters,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  for(const target of [document.getElementById('workspace-title'),document.querySelector('#partner-workspace .pro-state')])if(target)observer.observe(target,{childList:true,subtree:true,characterData:true});
  window.addEventListener('lrf-selection-ready',sync);
  window.addEventListener('pageshow',sync,{passive:true});
  if(mobile.addEventListener)mobile.addEventListener('change',sync);else mobile.addListener(sync);
  if(count){count.setAttribute('role','status');count.setAttribute('aria-live','polite');}
  sync();
})();
