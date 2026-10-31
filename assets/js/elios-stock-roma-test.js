(() => {
  'use strict';
  const STYLE_ID='lrf-elios-stock-cta-style';
  const ACTIVE=new Set(['roma','lithos','mysterium','quercia','dolomiti','bavaria-stone','grand-place','harmony','millennium-quartz','sedimenti','slate','brooklyn','clay','creta','deco','d-esign-evo','domus','glow','golden-hour','hexagon','horizon','marechiaro','montreal','love-decors','manhattan','yosemite','shell','terre-etrusche','allure','dust','segmento','tropical','twist','venere']);
  const NAME_TO_SLUG=new Map([
    ['roma','roma'],['lithos','lithos'],['mysterium','mysterium'],['quercia','quercia'],['dolomiti','dolomiti'],
    ['bavaria stone','bavaria-stone'],['grand place','grand-place'],['harmony','harmony'],['millennium quartz','millennium-quartz'],['sedimenti','sedimenti'],['slate','slate'],
    ['brooklyn','brooklyn'],['clay','clay'],['creta','creta'],['deco','deco'],['d_esign evo','d-esign-evo'],['d-esign evo','d-esign-evo'],['design evo','d-esign-evo'],['domus','domus'],
    ['glow','glow'],['golden hour','golden-hour'],['hexagon','hexagon'],['horizon','horizon'],['marechiaro','marechiaro'],['montreal','montreal'],
    ['love&decors','love-decors'],['love & decors','love-decors'],['love decors','love-decors'],['manhattan','manhattan'],['yosemite','yosemite'],['shell','shell'],['terre etrusche','terre-etrusche'],['allure','allure'],
    ['dust','dust'],['segmento','segmento'],['tropical','tropical'],['twist','twist'],['venere','venere']
  ]);
  const norm=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const cleanSlug=v=>norm(String(v||'').replace(/^elios-/i,'')).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  function titleSlug(card){
    const title=norm(card?.querySelector('.modal-v2-info h2')?.textContent||'');
    const product=(window.ELIOS_CATALOGUE||[]).find(p=>[p.name,p.catalogueLabel,p.collection].some(name=>name && norm(name)===title));
    if(product){const slug=cleanSlug(product.slug||product.id);if(ACTIVE.has(slug))return slug;}
    return NAME_TO_SLUG.get(title)||'';
  }
  function isEliosModal(card){
    const partner=cleanSlug(document.getElementById('workspace-title')?.textContent||'');
    return ['elios','elios-ceramica'].includes(partner)
      && card.closest('#product-modal-v2')?.classList.contains('open')
      && !card.matches('.view-safe-modal,.view-modal-card')
      && !card.querySelector('.view-safe-info,[data-view-safe-gallery],[data-view-gallery]')
      && !!card.querySelector('.modal-v2-info h2');
  }
  function installStyle(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`.lrf-elios-stock-cta{margin:18px 0 4px;padding:15px;border:1px solid #b9dcc6;background:#f1faf4;border-radius:14px}.lrf-elios-stock-cta strong{display:block;color:#17623a;font-size:.92rem;margin-bottom:5px}.lrf-elios-stock-cta p{margin:0 0 11px;color:#536259;font-size:.78rem;line-height:1.45}.lrf-elios-stock-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:10px;padding:12px 15px;background:#17623a;color:#fff;font-weight:900;font-size:.92rem;cursor:pointer;box-shadow:0 5px 14px rgba(23,98,58,.18)}.lrf-elios-stock-btn:hover{background:#104d2d}`;document.head.appendChild(style)}
  function injectButton(){
    const card=document.getElementById('product-modal-v2-card');if(!card)return;
    const slug=isEliosModal(card)?titleSlug(card):'';
    const existing=card.querySelector('.lrf-elios-stock-cta');
    if(!ACTIVE.has(slug)){existing?.remove();return;}
    if(existing?.dataset.collection===slug)return;
    existing?.remove();
    const title=String(card.querySelector('.modal-v2-info h2')?.textContent||slug).trim();
    const cta=document.createElement('div');cta.className='lrf-elios-stock-cta';cta.dataset.collection=slug;
    cta.innerHTML='<strong>Disponibilités & commande ELIOS</strong><p></p><button type="button" class="lrf-elios-stock-btn">● Voir les stocks & commander</button>';
    cta.querySelector('p').textContent=`Voir toutes les références, conditionnements, stocks usine et pièces spéciales de ${title}.`;
    cta.querySelector('button').addEventListener('click',async()=>{
      if(!isEliosModal(card)||titleSlug(card)!==slug){injectButton();return;}
      if(slug==='roma'){window.location.href='disponibilites-elios.html?collection=ROMA';return;}
      try{await fetch('assets/js/elios-stock-bootstrap.js?v=20260907-lot6',{cache:'reload'});}catch(_){}
      if(isEliosModal(card)&&titleSlug(card)===slug)window.location.href=`disponibilites-elios-lot1.html?collection=${encodeURIComponent(slug)}`;
    });
    card.appendChild(cta);
  }
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;injectButton();},0);}
  function start(){
    installStyle();
    document.addEventListener('click',event=>{if(event.target.closest?.('.product-card-v2,[data-partner]'))schedule();},true);
    window.addEventListener('lrf-view-product-opened',schedule);
    window.addEventListener('lrf-pro-session-changed',schedule);
    const observe=card=>{new MutationObserver(schedule).observe(card,{childList:true,subtree:true,characterData:true});schedule();};
    const modal=document.getElementById('product-modal-v2-card');
    if(modal)observe(modal);
    else{const observer=new MutationObserver(()=>{const created=document.getElementById('product-modal-v2-card');if(created){observer.disconnect();observe(created);}});observer.observe(document.body,{childList:true,subtree:true});}
    const workspace=document.getElementById('workspace-title');
    if(workspace)new MutationObserver(schedule).observe(workspace,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
