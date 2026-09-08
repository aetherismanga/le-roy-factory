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

  /*
   * Stabilisation du sélecteur "Sélections" sur mobile.
   * Le panneau des fabricants pouvait rester ouvert après un changement
   * d'univers, ce qui affichait à la fois le bouton "Choisir une usine"
   * et l'ancienne/nouvelle carte fabricant. On ferme systématiquement les
   * panneaux mobiles avant le changement d'univers, puis on resynchronise
   * l'affichage après le rendu d'inspirations-v2.js.
   */
  function installSelectionMobileFix(){
    if(document.getElementById('lrf-selection-mobile-stability'))return;
    const style=document.createElement('style');
    style.id='lrf-selection-mobile-stability';
    style.textContent=`
      @media (max-width:900px){
        #partner-panel:not(.mobile-open) #partner-grid{display:none!important}
        #partner-panel.mobile-open #partner-grid{display:grid!important}
        #partner-panel:not(.mobile-open) #mobile-partner-trigger{display:block!important}
        #partner-grid .partner-card{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        #insp-categories .category-card{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      }
    `;
    document.head.appendChild(style);

    const categories=document.getElementById('insp-categories');
    const partnerPanel=document.getElementById('partner-panel');
    const partnerGrid=document.getElementById('partner-grid');
    const partnerTrigger=document.getElementById('mobile-partner-trigger');
    const filters=document.getElementById('v2-filters');
    if(!categories||!partnerPanel||!partnerGrid||!partnerTrigger)return;

    const closeMobilePanels=()=>{
      partnerPanel.classList.remove('mobile-open');
      filters?.classList.remove('mobile-open');
      partnerTrigger.setAttribute('aria-expanded','false');
      document.getElementById('mobile-filter-trigger')?.setAttribute('aria-expanded','false');
    };

    const sync=()=>{
      if(window.innerWidth>900){
        closeMobilePanels();
        return;
      }
      const activePartner=partnerGrid.querySelector('.partner-card.active[data-partner]');
      const firstPartner=partnerGrid.querySelector('.partner-card[data-partner]');
      const selected=activePartner||firstPartner;
      if(selected?.dataset.partner){
        partnerTrigger.textContent=`☰ Choisir une usine — ${selected.dataset.partner}`;
      }else{
        partnerTrigger.textContent='☰ Choisir une usine';
      }
      if(!partnerPanel.classList.contains('mobile-open')){
        partnerGrid.style.removeProperty('display');
      }
    };

    /* Capture = fermeture AVANT le gestionnaire principal qui change l'univers. */
    categories.addEventListener('click',e=>{
      if(!e.target.closest('[data-cat]'))return;
      closeMobilePanels();
      setTimeout(sync,0);
      setTimeout(sync,80);
      setTimeout(sync,220);
    },true);

    partnerGrid.addEventListener('click',e=>{
      if(!e.target.closest('[data-partner]'))return;
      setTimeout(()=>{
        partnerPanel.classList.remove('mobile-open');
        partnerTrigger.setAttribute('aria-expanded','false');
        sync();
      },0);
    },true);

    partnerTrigger.addEventListener('click',()=>{
      requestAnimationFrame(()=>{
        partnerTrigger.setAttribute('aria-expanded',partnerPanel.classList.contains('mobile-open')?'true':'false');
      });
    });

    document.getElementById('mobile-filter-trigger')?.addEventListener('click',()=>{
      requestAnimationFrame(()=>{
        document.getElementById('mobile-filter-trigger')?.setAttribute('aria-expanded',filters?.classList.contains('mobile-open')?'true':'false');
      });
    });

    let resizeTimer=0;
    window.addEventListener('resize',()=>{
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(sync,120);
    },{passive:true});

    const observer=new MutationObserver(()=>{
      clearTimeout(observer._t);
      observer._t=setTimeout(sync,20);
    });
    observer.observe(partnerGrid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});

    closeMobilePanels();
    sync();
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
  installSelectionMobileFix();
  const root=document.getElementById('partner-workspace');
  if(root)new MutationObserver(()=>setTimeout(patch,0)).observe(root,{childList:true,subtree:true,characterData:true});
  document.getElementById('insp-categories')?.addEventListener('click',()=>setTimeout(patch,30),true);
  window.addEventListener('lrf-pro-session-changed',()=>setTimeout(patch,0));
  setTimeout(patch,100);
})();
