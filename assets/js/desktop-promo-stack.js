(()=>{
  'use strict';
  if(window.__LRF_DESKTOP_PROMO_STACK__)return;
  window.__LRF_DESKTOP_PROMO_STACK__=true;

  const DESKTOP='(min-width: 901px)';
  const SELECTORS=['.viewlots26-desktop','.cersaie26-desktop','.elios-rentree-desktop'];

  const style=document.createElement('style');
  style.id='lrf-desktop-promo-stack-style';
  style.textContent=`
    @media (min-width:901px){
      .lrf-desktop-promo-stack{
        position:absolute;
        right:clamp(28px,6vw,110px);
        top:50%;
        transform:translateY(-50%);
        z-index:22;
        display:flex;
        flex-direction:column;
        align-items:stretch;
        gap:14px;
        width:360px;
        max-height:calc(100% - 36px);
        box-sizing:border-box;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.cersaie26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        position:relative!important;
        top:auto!important;
        right:auto!important;
        left:auto!important;
        bottom:auto!important;
        width:360px!important;
        height:150px!important;
        min-height:150px!important;
        margin:0!important;
        flex:0 0 150px!important;
        box-sizing:border-box!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        padding:24px 28px!important;
        border-radius:28px!important;
        grid-template-columns:1fr 82px!important;
        gap:14px!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-logo{height:68px!important;padding:8px!important}
    }
    @media (max-width:1100px) and (min-width:901px){
      .lrf-desktop-promo-stack{right:28px;width:300px;gap:12px}
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.cersaie26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        width:300px!important;
        height:130px!important;
        min-height:130px!important;
        flex-basis:130px!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        padding:20px 22px!important;
        border-radius:24px!important;
        grid-template-columns:1fr 64px!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-title{font-size:1.23rem!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-sub{font-size:.64rem!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-logo{height:56px!important;padding:8px!important}
    }
    @media (min-width:1500px){
      .lrf-desktop-promo-stack{width:420px;gap:16px}
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.cersaie26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        width:420px!important;
        height:170px!important;
        min-height:170px!important;
        flex-basis:170px!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        padding:28px 32px!important;
        border-radius:30px!important;
        grid-template-columns:1fr 94px!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-title{font-size:1.62rem!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-sub{font-size:.76rem!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-logo{height:78px!important;padding:9px!important}
    }
  `;
  document.head.appendChild(style);

  function install(){
    if(!window.matchMedia(DESKTOP).matches)return;
    const hero=document.querySelector('.hero-video-section');
    if(!hero)return;

    let stack=hero.querySelector('.lrf-desktop-promo-stack');
    if(!stack){
      stack=document.createElement('div');
      stack.className='lrf-desktop-promo-stack';
      stack.setAttribute('aria-label','Actualités et offres LE ROY FACTORY');
      hero.appendChild(stack);
    }

    SELECTORS.forEach(selector=>{
      const card=hero.querySelector(selector) || document.querySelector(selector);
      if(card && card.parentElement!==stack)stack.appendChild(card);
    });

    if(!stack.children.length)stack.remove();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
  window.addEventListener('resize',install,{passive:true});
})();
