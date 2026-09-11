(() => {
  'use strict';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const restore=()=>{
    const title=document.getElementById('workspace-title');
    if(norm(title?.textContent)==='reviglass') return;
    const host=document.getElementById('partner-products');
    if(host?.classList.contains('reviglass-grid')) host.className='product-grid-v2';
    const search=document.getElementById('v2-search');
    if(search) search.placeholder='Rechercher une collection ou un produit…';
    const finish=document.getElementById('v2-finish');
    if(finish) finish.disabled=false;
  };
  const title=document.getElementById('workspace-title');
  if(title) new MutationObserver(()=>setTimeout(restore,0)).observe(title,{childList:true,subtree:true,characterData:true});
})();
