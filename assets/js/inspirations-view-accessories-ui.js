(() => {
  'use strict';
  if (window.__LRF_VIEW_ACCESSORIES_UI__) return;
  window.__LRF_VIEW_ACCESSORIES_UI__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const isView=()=>norm($('#workspace-title')?.textContent)==='viewceramica';
  const catalogue=()=>Array.isArray(window.VIEW_CATALOGUE)?window.VIEW_CATALOGUE:[];
  const productByName=name=>catalogue().find(p=>norm(p.name)===norm(name)||norm(p.collection)===norm(name));

  function installStyle(){
    if($('#lrf-view-accessories-ui-style'))return;
    const st=document.createElement('style');
    st.id='lrf-view-accessories-ui-style';
    st.textContent=`
      .view-extra-badge{display:inline-flex;align-items:center;gap:.35rem;margin-top:.55rem;padding:.35rem .55rem;border-radius:999px;background:#fff8df;border:1px solid #dfc46a;color:#6c5310;font-size:.72rem;font-weight:900}
      .view-accessories-panel{margin-top:1.05rem;padding:1rem;border:1px solid #dfd6c4;border-radius:14px;background:#fffdf8}
      .view-accessories-panel h4{margin:0 0 .4rem!important}
      .view-accessory-note{margin:0 0 .75rem!important;color:#736b60;font-size:.78rem;line-height:1.4}
      .view-accessory-list{display:grid;gap:.45rem}
      .view-accessory-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:center;padding:.58rem .65rem;border-radius:10px;background:#f7f3ea;border:1px solid #ebe2d2;font-size:.79rem}
      .view-accessory-row strong{color:#2b2925;overflow-wrap:anywhere}.view-accessory-row span{color:#735a18;font-weight:900;white-space:nowrap}
      @media(max-width:600px){.view-accessory-row{grid-template-columns:1fr}.view-accessory-row span{white-space:normal}}
    `;
    document.head.appendChild(st);
  }

  function groupLabel(a){
    const kind=String(a.kind||'Pièce spéciale');
    const name=String(a.name||'');
    return name&&norm(name)!==norm(kind)?`${kind} · ${name}`:kind;
  }

  function decorateCards(){
    if(!isView())return;
    $$('#partner-products .product-card-v2').forEach(card=>{
      if(card.dataset.viewAccessoriesDecorated==='1')return;
      const p=productByName($('h3',card)?.textContent||'');
      if(!p?.accessories?.length)return;
      const body=$('.body',card)||card;
      body.insertAdjacentHTML('beforeend','<div class="view-extra-badge">＋ Plinthes & pièces spéciales</div>');
      card.dataset.viewAccessoriesDecorated='1';
    });
  }

  function decorateModal(){
    if(!isView())return;
    const info=$('#product-modal-v2-card .view-safe-info');
    if(!info||$('[data-view-accessories-panel]',info))return;
    const p=productByName($('h2',info)?.textContent||'');
    if(!p?.accessories?.length)return;
    const panel=document.createElement('section');
    panel.className='view-accessories-panel';
    panel.dataset.viewAccessoriesPanel='1';
    panel.innerHTML=`<h4>Plinthes & pièces spéciales</h4><p class="view-accessory-note">Éléments disponibles pour cette collection VIEW. Les références, tarifs et conditionnements sont confirmés lors de la commande ou de la demande de disponibilité.</p><div class="view-accessory-list">${p.accessories.map(a=>`<div class="view-accessory-row"><strong>${esc(groupLabel(a))}</strong><span>${esc(a.format||'Format à confirmer')}</span></div>`).join('')}</div>`;
    const tariffHeading=$$('h4',info).find(h=>norm(h.textContent).includes('tarifsprofessionnels'));
    if(tariffHeading) info.insertBefore(panel,tariffHeading);
    else info.appendChild(panel);
  }

  function refresh(){installStyle();decorateCards();decorateModal();}
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});};
  const observer=new MutationObserver(schedule);
  const start=()=>{refresh();observer.observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('lrf-view-accessories-ready',schedule);
  window.addEventListener('lrf-selections-view-ready',schedule);
})();