(() => {
  'use strict';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const session=()=>window.LRF_PRO_SESSION?.read?.()||(()=>{try{return JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}})();
  const allowed=()=>{const s=session();return !!(s&&(s.isAdmin||Array.isArray(s.partenaires)&&s.partenaires.some(p=>norm(p)==='bilt')))};

  function loadSelectionScrollbarFix(){
    if(document.getElementById('lrf-selection-scrollbar-fix'))return;
    const link=document.createElement('link');
    link.id='lrf-selection-scrollbar-fix';
    link.rel='stylesheet';
    link.href='assets/css/selection-scrollbar-fix.css?v=20260908-1';
    document.head.appendChild(link);
  }

  function patch(){
    const title=document.getElementById('workspace-title');
    if(norm(title?.textContent)!=='bilt')return;
    const products=document.getElementById('partner-products'),count=document.getElementById('partner-count'),filters=document.getElementById('v2-filters'),link=document.getElementById('workspace-pro-link'),badge=document.getElementById('workspace-pro-badge');
    const ok=allowed();
    if(filters)filters.style.display='none';
    if(count)count.textContent=ok?'Catalogue & commande BILT':'Accès BILT requis';
    if(link){link.style.display='inline-flex';link.href=ok?'commande-bilt.html':'tarifs-pro.html';link.textContent=ok?'Commander BILT':'Accès PRO BILT';}
    if(badge){badge.textContent=ok?'✓ Tarif PRO accessible':'🔒 Tarif PRO non associé à ce compte';badge.className=`pro-badge${ok?' allowed':''}`;}
    if(products){
      const key=ok?'ready':'locked';if(products.dataset.biltOrderState===key)return;products.dataset.biltOrderState=key;
      products.innerHTML=ok?`<div class="empty-partner" style="border-style:solid"><img src="assets/img/bilt.png" alt="Bilt"><strong>Catalogue BILT 2026 prêt à commander</strong><p>Choisissez vos produits, quantités et minimums de livraison. Seuls les tarifs NET HT sont affichés. Retrouvez aussi votre remise exceptionnelle LRF et tout votre historique BILT.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="pro-link" href="commande-bilt.html">Ouvrir le catalogue & commander</a><a class="pro-link" href="commande-bilt.html#historique" style="background:#fff;color:#111">Historique BILT</a></div></div>`:`<div class="empty-partner"><img src="assets/img/bilt.png" alt="Bilt"><strong>Accès BILT non associé à ce LRF.</strong><p>Demandez l’activation du partenaire BILT sur votre compte professionnel.</p><a class="pro-link" href="tarifs-pro.html">Retour à l’Accès PRO</a></div>`;
    }
  }

  loadSelectionScrollbarFix();
  const root=document.getElementById('partner-workspace');
  if(root)new MutationObserver(()=>setTimeout(patch,0)).observe(root,{childList:true,subtree:true,characterData:true});
  document.getElementById('insp-categories')?.addEventListener('click',()=>setTimeout(patch,30),true);
  window.addEventListener('lrf-pro-session-changed',()=>setTimeout(patch,0));
  setTimeout(patch,100);
})();
