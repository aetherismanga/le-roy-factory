(() => {
  'use strict';
  if(window.__LRF_BIOPIETRA_FIX_20260912_V2__)return;
  window.__LRF_BIOPIETRA_FIX_20260912_V2__=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  
  const META={
    'acropoli':{type:'revetement',refs:'c64 c51',units:'m2 ml',special:false},
    'bergamo mix ber':{type:'revetement',refs:'c64 c51',units:'m2 ml',special:false},
    'brick design':{type:'revetement',refs:'c79 c83',units:'m2',special:true},
    'ciottolo river mix cio':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'credaro mix cre':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'listello liguria':{type:'listello',refs:'c57 c36 c60 c41',units:'m2 ml',special:true},
    'listello mattone antico':{type:'listello',refs:'c57 c36 c60 c41',units:'m2 ml',special:true},
    'listello toscana 1 5 cm':{type:'listello',refs:'c40 c35 c60 c41',units:'m2 ml',special:true},
    'listello toscana 3 cm':{type:'listello',refs:'c59 c42 c60 c41',units:'m2 ml',special:true},
    'composizioni':{type:'composition',refs:'c64 c51',units:'m2 ml',special:false},
    'ortisei mix ort':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'roccia mix roc':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'roma':{type:'revetement',refs:'c64 c66',units:'m2',special:true},
    'scaglia carsica':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'scaglia marmolada':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'scaglia montebello':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'sierra nevada mix sie':{type:'revetement',refs:'c64 c51 c66 c58',units:'m2 ml',special:true},
    'spaccatello mix spc':{type:'revetement',refs:'c79',units:'m2',special:false},
    'stelvio mix ste':{type:'revetement',refs:'c64 c51',units:'m2 ml',special:false},
    'travertino':{type:'revetement',refs:'c64 c66',units:'m2',special:true},
    'inserti pour ort ste roc mix':{type:'piece speciale',refs:'c81',units:'boite',special:false},
    'cornici di finitura':{type:'piece speciale',refs:'c4 c5',units:'piece',special:true},
    'ecokoll 25 kg':{type:'accessoire pose',refs:'c20',units:'sac',special:false},
    'multikoll 25 kg':{type:'accessoire pose',refs:'c20 c22',units:'sac',special:false},
    'biostucco 25 kg':{type:'accessoire pose',refs:'c23',units:'sac',special:true},
    'biofin':{type:'accessoire pose',refs:'c17 c56 c84',units:'piece',special:false}
  };

  let lastBio=false,timer=0;

  function isBio(){ return norm($('#workspace-title')?.textContent)==='biopietra'; }
  function metaForCard(card){
    const name=norm($('.bio-card-top strong',card)?.textContent || card.dataset.bioName || '');
    return META[name]||null;
  }

  function installStyle(){
    if($('#lrf-biopietra-fix-v2-style'))return;
    const st=document.createElement('style');
    st.id='lrf-biopietra-fix-v2-style';
    st.textContent=`
      body.lrf-biopietra-active #v2-filters{position:static!important;top:auto!important;z-index:auto!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:.35rem 0 .65rem!important}
      body.lrf-biopietra-active #v2-filters>.filters-inner{display:none!important}
      body.lrf-biopietra-active #mobile-filter-trigger{display:none!important}
      .bio-filter-panel{display:grid;grid-template-columns:minmax(220px,1.8fr) repeat(3,minmax(135px,1fr)) auto;gap:.55rem;align-items:center}
      .bio-filter-panel input,.bio-filter-panel select{width:100%;box-sizing:border-box;border:1px solid #d9d2c5;background:#fff;border-radius:12px;padding:.72rem .78rem;font:inherit;min-height:46px}
      .bio-filter-panel input:focus,.bio-filter-panel select:focus{outline:none;border-color:#c7a33b;box-shadow:0 0 0 2px rgba(199,163,59,.08)}
      .bio-head{position:relative!important;padding-right:84px!important}
      .bio-close{position:absolute!important;top:16px!important;right:16px!important;margin:0!important;z-index:3!important}
      @media(max-width:900px){
        .bio-filter-panel{grid-template-columns:1fr 1fr;gap:.5rem}
        .bio-filter-panel .bio-search-wrap{grid-column:1/-1;display:grid;grid-template-columns:1fr 46px;gap:.5rem}
        .bio-filter-panel .bio-search-wrap input{min-width:0}
        .bio-filter-panel .bio-filter-type{grid-column:1/2}.bio-filter-panel .bio-filter-unit{grid-column:2/3}.bio-filter-panel .bio-filter-special{grid-column:1/-1}
        .bio-modal{padding:0!important;background:#fbfaf7!important}
        .bio-shell{margin:0!important;width:100%!important;min-height:100dvh!important;border-radius:0!important;border-left:0!important;border-right:0!important;box-shadow:none!important}
        .bio-head{padding:18px 78px 18px 18px!important;min-height:92px!important}
        .bio-head h2{font-size:clamp(1.45rem,7vw,2rem)!important;overflow-wrap:anywhere}
        .bio-close{width:52px!important;height:52px!important;right:14px!important;top:14px!important;flex-basis:52px!important}
      }
      @media(max-width:520px){
        .bio-filter-panel{grid-template-columns:1fr 1fr}
        .bio-filter-panel select{font-size:.86rem;padding:.65rem .6rem}
      }
    `;
    document.head.appendChild(st);
  }

  function ensureFilters(){
    const bar=$('#v2-filters'); if(!bar||!isBio())return null;
    let panel=$('#bio-filter-panel');
    if(!panel){
      panel=document.createElement('div');
      panel.id='bio-filter-panel';panel.className='bio-filter-panel';
      panel.innerHTML=`
        <div class="bio-search-wrap"><input id="bio-search" type="search" placeholder="Rechercher produit ou référence (ex. C64)…" autocomplete="off"></div>
        <select id="bio-filter-type" class="bio-filter-type" aria-label="Filtrer par famille"><option value="">Toutes les familles</option><option value="revetement">Revêtements</option><option value="listello">Listello</option><option value="composition">Compositions</option><option value="piece speciale">Pièces spéciales</option><option value="accessoire pose">Accessoires de pose</option></select>
        <select id="bio-filter-unit" class="bio-filter-unit" aria-label="Filtrer par unité"><option value="">Toutes les unités</option><option value="m2">Unité m²</option><option value="ml">Unité ml</option><option value="piece">Unité pièce</option><option value="sac">Unité sac</option><option value="boite">Unité boîte</option></select>
        <select id="bio-filter-special" class="bio-filter-special" aria-label="Filtrer les coloris"><option value="">Tous les coloris</option><option value="standard">Coloris standards</option><option value="special">Avec coloris spéciaux</option></select>`;
      bar.appendChild(panel);
      ['bio-search','bio-filter-type','bio-filter-unit','bio-filter-special'].forEach(id=>$('#'+id)?.addEventListener(id==='bio-search'?'input':'change',filterCards));
    }
    return panel;
  }

  function filterCards(){
    if(!isBio())return;
    const host=$('#partner-products');if(!host)return;
    const q=norm($('#bio-search')?.value||'');
    const type=norm($('#bio-filter-type')?.value||'');
    const unit=norm($('#bio-filter-unit')?.value||'');
    const special=$('#bio-filter-special')?.value||'';
    $$('.bio-card',host).forEach(card=>{
      const m=metaForCard(card);const text=norm(card.textContent+' '+(m?.refs||''));
      const okQ=!q||text.includes(q);
      const okType=!type||norm(m?.type)===type;
      const okUnit=!unit||norm(m?.units).split(' ').includes(unit);
      const okSpecial=!special||(special==='special'?!!m?.special:!m?.special);
      card.style.display=okQ&&okType&&okUnit&&okSpecial?'':'none';
    });
    const visible=$$('.bio-card',host).filter(c=>c.style.display!=='none').length;
    const count=$('#partner-count');if(count)count.textContent=`${visible} produit${visible>1?'s':''}`;
  }

  function cleanSource(){ $$('.bio-source').forEach(x=>x.remove()); }

  function tagCards(){
    $$('.bio-card').forEach(card=>{
      const m=metaForCard(card);if(!m)return;
      card.dataset.bioRefs=m.refs;card.dataset.bioType=m.type;card.dataset.bioUnits=m.units;card.dataset.bioSpecial=m.special?'1':'0';
    });
  }

  function sync(){
    const bio=isBio();
    document.body.classList.toggle('lrf-biopietra-active',bio);
    if(!bio){lastBio=false;return}
    installStyle();ensureFilters();cleanSource();tagCards();filterCards();lastBio=true;
  }

  const schedule=()=>{clearTimeout(timer);timer=setTimeout(sync,80)};
  document.addEventListener('click',schedule,true);
  document.addEventListener('input',e=>{if(e.target?.id==='v2-search')schedule()},true);
  new MutationObserver(muts=>{
    let useful=false;
    for(const m of muts){for(const n of m.addedNodes){if(n.nodeType===1&&(n.matches?.('.bio-card,.bio-modal,.bio-source')||n.querySelector?.('.bio-card,.bio-modal,.bio-source'))){useful=true;break}}if(useful)break}
    if(useful)schedule();
  }).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();