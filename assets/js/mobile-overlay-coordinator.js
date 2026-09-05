(()=>{
  'use strict';
  if(window.__LRF_MOBILE_OVERLAY_COORDINATOR__) return;
  window.__LRF_MOBILE_OVERLAY_COORDINATOR__=true;

  const isMobile=()=>window.matchMedia('(max-width: 900px)').matches;
  if(!isMobile()) return;

  const style=document.createElement('style');
  style.id='lrf-mobile-overlay-coordinator-style';
  style.textContent=`
    @media(max-width:900px){
      html,body,a,button,input,label,[role="button"],.logo,.viewlots26-header,.cersaie26-mobile,.elios-rentree-mobile{-webkit-tap-highlight-color:transparent!important}
      a:focus:not(:focus-visible),button:focus:not(:focus-visible),input:focus:not(:focus-visible),[role="button"]:focus:not(:focus-visible){outline:none!important;box-shadow:none}
      header{position:relative!important;z-index:2147482500!important}
      .viewlots26-modal,.cersaie26-modal,.elios-rentree-modal{
        position:fixed!important;
        left:0!important;right:0!important;bottom:0!important;
        top:var(--lrf-overlay-top,98px)!important;
        width:100vw!important;
        height:auto!important;
        max-width:none!important;
        max-height:none!important;
        padding:0!important;
        transform:none!important;
      }
      .viewlots26-box,.elios-rentree-box{
        width:100vw!important;height:100%!important;max-width:none!important;max-height:none!important;
        border-radius:0!important;border-left:0!important;border-right:0!important;border-bottom:0!important;
      }
      .cersaie26-box{
        width:100vw!important;height:100%!important;max-width:none!important;max-height:none!important;
        border-radius:0!important;border-left:0!important;border-right:0!important;border-bottom:0!important;
        overflow:auto!important;padding-top:20px!important;
      }
      .viewlots26-close,.cersaie26-close,.elios-rentree-close{z-index:2147483600!important}
    }
  `;
  document.head.appendChild(style);

  const navContainer=()=>document.querySelector('header .nav-container');
  const updateOverlayTop=()=>{
    const nav=navContainer();
    const top=Math.max(0,Math.round(nav?.getBoundingClientRect().bottom||98));
    document.documentElement.style.setProperty('--lrf-overlay-top',top+'px');
  };

  const getView=()=>document.querySelector('.viewlots26-modal');
  const getCersaie=()=>document.querySelector('.cersaie26-modal');
  const getElios=()=>document.querySelector('.elios-rentree-modal');

  function closeView(){
    const m=getView(); if(!m) return;
    m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.classList.remove('viewlots26-lock');
  }
  function closeCersaie(){
    const m=getCersaie(); if(!m) return;
    m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.classList.remove('cersaie26-lock');
  }
  function closeElios(){
    const m=getElios(); if(!m) return;
    m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.classList.remove('elios-rentree-lock');
  }

  function resetViewTop(){
    const frame=document.querySelector('.viewlots26-frame');
    try{frame?.contentWindow?.scrollTo(0,0)}catch(_){ }
    try{
      const doc=frame?.contentDocument;
      if(doc){doc.documentElement.scrollTop=0;doc.body.scrollTop=0}
    }catch(_){ }
  }
  function resetCersaieTop(){
    const box=document.querySelector('.cersaie26-box');
    if(box) box.scrollTop=0;
    const modal=getCersaie(); if(modal) modal.scrollTop=0;
  }

  // Le bandeau ELIOS ne doit jamais recouvrir VIEW, CERSAIE ou le menu.
  const hideEliosBanner=()=>document.querySelector('.elios-rentree-mobile')?.classList.add('is-hidden');
  const maybeRestoreElios=()=>{
    const banner=document.querySelector('.elios-rentree-mobile');if(!banner)return;
    const burger=document.querySelector('header .burger-btn');
    const busy=getView()?.classList.contains('open')||getCersaie()?.classList.contains('open')||getElios()?.classList.contains('open')||burger?.classList.contains('active');
    if(!busy)banner.classList.remove('is-hidden');
  };

  // Capture au niveau document : on ferme l'autre fenêtre AVANT que son bouton ouvre la nouvelle.
  document.addEventListener('click',e=>{
    const cersaie=e.target.closest?.('.cersaie26-mobile');
    const view=e.target.closest?.('.viewlots26-header');
    const elios=e.target.closest?.('.elios-rentree-mobile');
    const burger=e.target.closest?.('header .burger-btn');
    if(cersaie){
      closeView();closeElios();hideEliosBanner();updateOverlayTop();
      requestAnimationFrame(()=>{updateOverlayTop();resetCersaieTop()});
      setTimeout(resetCersaieTop,60);
    }else if(view){
      closeCersaie();closeElios();hideEliosBanner();updateOverlayTop();
      requestAnimationFrame(()=>{updateOverlayTop();resetViewTop()});
      setTimeout(resetViewTop,80);
    }else if(elios){
      closeView();closeCersaie();hideEliosBanner();updateOverlayTop();
    }else if(burger){
      closeView();closeCersaie();closeElios();hideEliosBanner();
      setTimeout(maybeRestoreElios,120);
    }
  },true);

  // Après ouverture, remonter systématiquement les contenus en haut.
  const observer=new MutationObserver(mutations=>{
    for(const m of mutations){
      if(m.type!=='attributes'||m.attributeName!=='class')continue;
      const el=m.target;
      if(el.classList.contains('viewlots26-modal')&&el.classList.contains('open')){
        updateOverlayTop();hideEliosBanner();requestAnimationFrame(resetViewTop);setTimeout(resetViewTop,100);
      }
      if(el.classList.contains('cersaie26-modal')&&el.classList.contains('open')){
        updateOverlayTop();hideEliosBanner();requestAnimationFrame(resetCersaieTop);setTimeout(resetCersaieTop,60);
      }
      if(el.classList.contains('elios-rentree-modal')&&el.classList.contains('open')){
        updateOverlayTop();hideEliosBanner();
      }
      if((el.classList.contains('viewlots26-modal')||el.classList.contains('cersaie26-modal')||el.classList.contains('elios-rentree-modal'))&&!el.classList.contains('open')){
        setTimeout(maybeRestoreElios,50);
      }
    }
  });

  function bind(){
    updateOverlayTop();
    [getView(),getCersaie(),getElios()].filter(Boolean).forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
    const vf=document.querySelector('.viewlots26-frame');if(vf&&!vf.dataset.lrfTopReset){vf.dataset.lrfTopReset='1';vf.addEventListener('load',()=>setTimeout(resetViewTop,0))}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,80),{once:true});else setTimeout(bind,80);
  window.addEventListener('resize',updateOverlayTop,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(updateOverlayTop,150),{passive:true});
})();