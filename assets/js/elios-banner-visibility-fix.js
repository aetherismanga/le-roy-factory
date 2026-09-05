(()=>{
  'use strict';
  if(window.__LRF_ELIOS_BANNER_VISIBILITY_FIX__)return;
  window.__LRF_ELIOS_BANNER_VISIBILITY_FIX__=true;

  const getBanner=()=>document.querySelector('.elios-rentree-mobile');
  const isOpen=sel=>document.querySelector(sel)?.classList.contains('open');
  const menuOpen=()=>document.querySelector('header .burger-btn')?.classList.contains('active');
  const eliosOpen=()=>isOpen('.elios-rentree-modal');
  const foreignModalOpen=()=>isOpen('.viewlots26-modal')||isOpen('.cersaie26-modal');

  function sync(){
    const banner=getBanner();
    if(!banner)return;
    const hide=foreignModalOpen()||menuOpen()||eliosOpen();
    banner.classList.toggle('is-hidden',hide);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('.viewlots26-header,.viewlots26-desktop,.cersaie26-mobile,.cersaie26-desktop,header .burger-btn')){
      const banner=getBanner();
      if(banner)banner.classList.add('is-hidden');
      setTimeout(sync,0);
    }
    if(e.target.closest('.viewlots26-close,.cersaie26-close,.elios-rentree-close')){
      setTimeout(sync,0);
    }
  },true);

  const observer=new MutationObserver(sync);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
  window.addEventListener('pageshow',sync);
  window.addEventListener('resize',sync);
  setTimeout(sync,0);
})();