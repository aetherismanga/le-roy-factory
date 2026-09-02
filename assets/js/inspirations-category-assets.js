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

/* Barre de défilement PC fiable pour la page Inspirations. */
(() => {
  if (!document.body.classList.contains('insp-v2') || !window.matchMedia('(min-width: 901px)').matches) return;
  if (document.getElementById('lrf-desktop-scrollbar')) return;

  const style=document.createElement('style');
  style.id='lrf-desktop-scrollbar-style';
  style.textContent=`
    @media(min-width:901px){
      html{scrollbar-width:none!important;overflow-y:scroll!important;scrollbar-gutter:auto!important}
      html::-webkit-scrollbar,body::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}
      body.insp-v2{overflow-y:visible!important;padding-right:22px!important;box-sizing:border-box!important}
      #lrf-desktop-scrollbar{position:fixed;right:0;top:0;bottom:0;width:22px;z-index:2147483000;background:#e4dccd;border-left:2px solid #bcae91;box-shadow:inset 2px 0 5px rgba(0,0,0,.16),-2px 0 8px rgba(0,0,0,.08);cursor:pointer;user-select:none}
      #lrf-desktop-scrollbar-thumb{position:absolute;left:3px;top:0;width:15px;min-height:80px;border-radius:10px;background:linear-gradient(180deg,#ffd85a 0%,#d4af37 42%,#8b6410 100%);border:2px solid #3a2a08;box-shadow:0 2px 8px rgba(0,0,0,.48),inset 0 0 0 1px rgba(255,255,255,.35);cursor:grab;opacity:1!important;visibility:visible!important}
      #lrf-desktop-scrollbar-thumb::after{content:'';position:absolute;left:50%;top:50%;width:7px;height:26px;transform:translate(-50%,-50%);border-top:2px solid rgba(40,28,4,.58);border-bottom:2px solid rgba(40,28,4,.58);box-shadow:0 -5px 0 rgba(40,28,4,.58),0 5px 0 rgba(40,28,4,.58)}
      #lrf-desktop-scrollbar-thumb:hover{background:linear-gradient(180deg,#ffe77c 0%,#e1bd46 42%,#76520a 100%);box-shadow:0 2px 11px rgba(0,0,0,.58),0 0 10px rgba(212,175,55,.42)}
      #lrf-desktop-scrollbar-thumb.dragging{cursor:grabbing;background:linear-gradient(180deg,#fff0a2 0%,#e8c85b 45%,#694707 100%)}
    }
  `;
  document.head.appendChild(style);

  const track=document.createElement('div');
  track.id='lrf-desktop-scrollbar';
  track.setAttribute('aria-hidden','true');
  const thumb=document.createElement('div');
  thumb.id='lrf-desktop-scrollbar-thumb';
  track.appendChild(thumb);
  document.body.appendChild(track);

  let thumbHeight=80;
  const metrics=()=>{
    const doc=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);
    const view=window.innerHeight;
    const maxScroll=Math.max(0,doc-view);
    const trackH=track.clientHeight||view;
    thumbHeight=maxScroll>0?Math.max(80,Math.round(trackH*(view/doc))):trackH;
    const travel=Math.max(0,trackH-thumbHeight);
    return {doc,view,maxScroll,trackH,travel,thumbHeight};
  };

  const sync=()=>{
    const m=metrics();
    thumb.style.height=m.thumbHeight+'px';
    const ratio=m.maxScroll?Math.min(1,Math.max(0,window.scrollY/m.maxScroll)):0;
    thumb.style.transform=`translateY(${Math.round(m.travel*ratio)}px)`;
    track.style.display=m.maxScroll>2?'block':'none';
  };

  let dragging=false,startY=0,startScroll=0;
  thumb.addEventListener('pointerdown',e=>{
    dragging=true;startY=e.clientY;startScroll=window.scrollY;
    thumb.classList.add('dragging');
    thumb.setPointerCapture?.(e.pointerId);
    e.preventDefault();e.stopPropagation();
  });
  window.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const m=metrics();
    if(!m.travel)return;
    const delta=e.clientY-startY;
    window.scrollTo(0,startScroll+(delta/m.travel)*m.maxScroll);
    e.preventDefault();
  },{passive:false});
  window.addEventListener('pointerup',()=>{dragging=false;thumb.classList.remove('dragging')});

  track.addEventListener('pointerdown',e=>{
    if(e.target===thumb)return;
    const m=metrics();
    const rect=track.getBoundingClientRect();
    const wanted=Math.max(0,Math.min(m.travel,e.clientY-rect.top-thumbHeight/2));
    window.scrollTo({top:m.travel?(wanted/m.travel)*m.maxScroll:0,behavior:'smooth'});
  });

  window.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',sync,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(sync).observe(document.documentElement);
  new MutationObserver(()=>requestAnimationFrame(sync)).observe(document.body,{childList:true,subtree:true});
  requestAnimationFrame(sync);
})();
