(() => {
  const grid=document.getElementById('insp-categories');
  if(!grid)return;
  const partnerPanel=document.getElementById('partner-panel');
  const partnerGrid=document.getElementById('partner-grid');
  const partnerTrigger=document.getElementById('mobile-partner-trigger');
  const workspace=document.getElementById('partner-workspace');
  const products=document.getElementById('partner-products');
  const count=document.getElementById('partner-count');
  const filters=document.getElementById('v2-filters');
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const session=()=>{try{return JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch{return null}};
  const hasBilt=()=>{const s=session();return !!(s&&Array.isArray(s.partenaires)&&s.partenaires.some(p=>norm(p)==='bilt'))};

  function renamePierre(){
    const card=grid.querySelector('[data-cat="parement"]');
    if(card){card.setAttribute('aria-label','Pierre · Biopietra');card.title='Pierre · Biopietra';}
  }

  function ensureOutillages(){
    if(grid.querySelector('[data-custom-cat="outillages"]'))return;
    const b=document.createElement('button');
    b.type='button';b.className='category-card';b.dataset.customCat='outillages';
    b.setAttribute('aria-label','Outillages / divers · Bilt');b.title='Outillages / divers · Bilt';
    b.innerHTML='<span class="category-name">Outillages / divers</span>';
    grid.appendChild(b);
  }

  function restoreStandard(){if(filters)filters.style.display='';}

  function openOutillages(){
    grid.querySelectorAll('.category-card').forEach(c=>c.classList.remove('active'));
    const card=grid.querySelector('[data-custom-cat="outillages"]');if(card)card.classList.add('active');
    if(document.getElementById('partner-panel-title'))document.getElementById('partner-panel-title').textContent='Outillages / divers';
    if(partnerTrigger)partnerTrigger.textContent='☰ Choisir une usine — Bilt';
    const allowed=hasBilt();
    if(partnerGrid)partnerGrid.innerHTML=`<div class="partner-card active"><img src="assets/img/bilt.png" alt="Bilt"><span><strong>Bilt</strong><small>Outillage & systèmes de pose</small><span class="access ${allowed?'':'locked'}">${allowed?'✓ Tarif PRO autorisé':'🔒 Tarif PRO selon compte'}</span></span></div>`;
    if(partnerPanel)partnerPanel.classList.remove('mobile-open');
    if(workspace){workspace.classList.add('open');const logo=document.getElementById('workspace-logo'),title=document.getElementById('workspace-title'),sub=document.getElementById('workspace-sub'),badge=document.getElementById('workspace-pro-badge'),link=document.getElementById('workspace-pro-link');if(logo)logo.src='assets/img/bilt.png';if(title)title.textContent='Bilt';if(sub)sub.textContent='Outillage & systèmes de pose · espace produits dédié';if(badge){badge.textContent=allowed?'✓ Tarif PRO accessible':'🔒 Tarif PRO non associé à ce compte';badge.className=`pro-badge${allowed?' allowed':''}`;}if(link){link.style.display=allowed?'inline-flex':'none';link.href='tarifs-pro.html';link.textContent='Voir tarif PRO Bilt';}}
    if(filters)filters.style.display='none';
    if(count)count.textContent='Catalogue produits à intégrer';
    if(products)products.innerHTML=`<div class="empty-partner"><img src="assets/img/bilt.png" alt="Bilt"><strong>Bilt est maintenant dans Outillages / divers.</strong><p>Cette rubrique accueillera les systèmes de pose, croisillons, accessoires et autres produits techniques.</p>${allowed?'<a class="pro-link" href="tarifs-pro.html">Voir mon tarif PRO Bilt</a>':''}</div>`;
  }

  grid.addEventListener('click',e=>{
    const custom=e.target.closest('[data-custom-cat="outillages"]');
    if(custom){e.preventDefault();e.stopPropagation();openOutillages();return;}
    if(e.target.closest('[data-cat]'))restoreStandard();
  },true);

  const observer=new MutationObserver(()=>{renamePierre();ensureOutillages();});
  observer.observe(grid,{childList:true});
  renamePierre();ensureOutillages();
})();
