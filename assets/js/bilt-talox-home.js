(()=>{
  'use strict';
  if(window.__LRF_BILT_TALOX_HOME__)return;
  window.__LRF_BILT_TALOX_HOME__=true;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function install(){
    document.querySelectorAll('[data-bilt-black-friday]').forEach(card=>{
      if(card.dataset.biltReady)return;
      card.dataset.biltReady='true';
      const slides=[...card.querySelectorAll('.bilt-bf-slide')];
      const dots=[...card.querySelectorAll('[data-bilt-slide]')];
      const pause=card.querySelector('.bilt-bf-pause');
      let active=0,paused=false,timer=null;
      const show=index=>{
        active=(index+slides.length)%slides.length;
        slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===active);slide.setAttribute('aria-hidden',String(i!==active));});
        dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===active)));
      };
      const stop=()=>{clearInterval(timer);timer=null;};
      const start=()=>{stop();if(!paused&&!document.hidden&&!reduced.matches)timer=setInterval(()=>show(active+1),4800);};
      dots.forEach(dot=>dot.addEventListener('click',()=>{show(Number(dot.dataset.biltSlide));start();}));
      pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Lire':'Pause';pause.setAttribute('aria-label',paused?'Reprendre le défilement BILT':'Mettre le défilement BILT en pause');start();});
      card.addEventListener('mouseenter',stop);card.addEventListener('mouseleave',start);
      card.addEventListener('focusin',stop);card.addEventListener('focusout',event=>{if(!card.contains(event.relatedTarget))start();});
      document.addEventListener('visibilitychange',start);
      reduced.addEventListener?.('change',start);
      show(0);start();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
