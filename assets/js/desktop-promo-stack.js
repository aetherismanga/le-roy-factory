(()=>{
  'use strict';
  if(window.__LRF_DESKTOP_PROMO_STACK__)return;
  window.__LRF_DESKTOP_PROMO_STACK__=true;

  const DESKTOP='(min-width: 901px)';
  const SELECTORS=['.viewlots26-desktop','.cersaie26-desktop','.elios-rentree-desktop'];

  const style=document.createElement('style');
  style.id='lrf-desktop-promo-stack-style';
  style.textContent=`
    @keyframes lrfDesktopPromoSway{0%,100%{translate:-5px 0}50%{translate:5px 0}}

    /*
      ACCUEIL PC ADAPTATIF
      Les actualités ne doivent jamais recouvrir le logo LE ROY FACTORY.
      - PC moyens / grands : colonne à droite + espace réellement réservé au contenu.
      - petits portables / fenêtre réduite : bandeau horizontal en bas.
      - faible hauteur : cartes compactées automatiquement.
    */
    @media (min-width:901px){
      .hero-video-section{
        --lrf-promo-w:clamp(280px,23vw,360px);
        --lrf-promo-right:clamp(18px,3.5vw,56px);
        --lrf-promo-safe-gap:clamp(18px,2.2vw,34px);
      }

      .lrf-desktop-promo-stack{
        position:absolute;
        right:var(--lrf-promo-right);
        top:50%;
        transform:translateY(-50%);
        z-index:22;
        display:flex;
        flex-direction:column;
        align-items:stretch;
        gap:clamp(8px,1.45vh,14px);
        width:var(--lrf-promo-w);
        max-height:calc(100% - 28px);
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
        width:100%!important;
        height:clamp(108px,17.5vh,150px)!important;
        min-height:clamp(108px,17.5vh,150px)!important;
        margin:0!important;
        flex:0 0 clamp(108px,17.5vh,150px)!important;
        box-sizing:border-box!important;
        -webkit-backdrop-filter:blur(5px) saturate(1.06)!important;
        backdrop-filter:blur(5px) saturate(1.06)!important;
      }

      /* Le centre de l'accueil possède désormais sa propre zone sûre. */
      .hero-video-section>.hero-content{
        width:100%!important;
        box-sizing:border-box!important;
        padding-left:clamp(24px,4vw,68px)!important;
        padding-right:calc(var(--lrf-promo-w) + var(--lrf-promo-right) + var(--lrf-promo-safe-gap))!important;
      }
      .hero-video-section>.hero-content .hero-logo-wrapper{
        width:min(820px,100%)!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }
      .hero-video-section>.hero-content .hero-logo{
        display:block!important;
        width:100%!important;
        max-width:100%!important;
        height:auto!important;
      }
      .hero-video-section>.hero-content>h2,
      .hero-video-section>.hero-content>p,
      .hero-video-section>.hero-content>.hero-buttons{
        max-width:100%!important;
        box-sizing:border-box!important;
      }

      /* Fond translucide uniquement : contenu, texte, logos et boutons restent opaques. */
      .lrf-desktop-promo-stack>.viewlots26-desktop{
        background:
          radial-gradient(circle at 88% 18%,rgba(255,214,120,.15),transparent 31%),
          linear-gradient(145deg,rgba(111,59,18,.82),rgba(139,80,27,.84) 58%,rgba(92,46,13,.82))!important;
      }
      .lrf-desktop-promo-stack>.cersaie26-desktop{
        background:linear-gradient(145deg,rgba(6,40,30,.82),rgba(12,74,53,.84) 72%,rgba(8,45,34,.82))!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        background:
          radial-gradient(circle at 88% 18%,rgba(255,226,142,.12),transparent 31%),
          linear-gradient(145deg,rgba(84,21,43,.82),rgba(122,32,60,.84) 58%,rgba(66,16,33,.82))!important;
        padding:clamp(16px,2.5vh,24px) clamp(18px,2vw,28px)!important;
        border-radius:clamp(20px,2vw,28px)!important;
        grid-template-columns:minmax(0,1fr) clamp(54px,5.2vw,82px)!important;
        gap:clamp(9px,1vw,14px)!important;
        animation:lrfDesktopPromoSway 5.4s ease-in-out infinite,eliosRentreeGlow 4.8s ease-in-out infinite!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop>*,
      .lrf-desktop-promo-stack>.cersaie26-desktop>*,
      .lrf-desktop-promo-stack>.elios-rentree-desktop>*{
        opacity:1!important;
      }
    }

    /* Portable / fenêtre PC étroite : les 3 bannières passent en bas au lieu de rogner le logo. */
    @media (min-width:901px) and (max-width:1199px){
      .hero-video-section{
        --lrf-promo-w:0px;
        --lrf-promo-right:0px;
        --lrf-promo-safe-gap:0px;
      }
      .lrf-desktop-promo-stack{
        left:clamp(14px,2vw,24px)!important;
        right:clamp(14px,2vw,24px)!important;
        top:auto!important;
        bottom:clamp(12px,2vh,20px)!important;
        transform:none!important;
        width:auto!important;
        max-height:none!important;
        display:flex!important;
        flex-direction:row!important;
        align-items:stretch!important;
        gap:clamp(8px,1.2vw,12px)!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.cersaie26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        width:auto!important;
        min-width:0!important;
        height:110px!important;
        min-height:110px!important;
        flex:1 1 0!important;
        padding:14px 16px!important;
        border-radius:18px!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        grid-template-columns:minmax(0,1fr) 54px!important;
        gap:9px!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-title{font-size:1.05rem!important;line-height:1.02!important;margin:3px 0 4px!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-kicker{font-size:.53rem!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-sub{font-size:.58rem!important;line-height:1.15!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-cta{font-size:.52rem!important;padding:4px 7px!important;margin-top:4px!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-logo{height:48px!important;padding:6px!important}

      .lrf-desktop-promo-stack>.cersaie26-desktop{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;text-align:left!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop strong{font-size:1.28rem!important;line-height:1!important;margin:0 0 5px!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop small{font-size:.72rem!important;line-height:1.25!important;margin:0!important}

      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-kicker{font-size:.52rem!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-title{font-size:1.02rem!important;line-height:1.02!important;margin:3px 0 4px!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-sub{font-size:.56rem!important;line-height:1.16!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-cta{font-size:.51rem!important;padding:4px 7px!important;margin-top:4px!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-logo{height:47px!important;padding:6px!important}

      .hero-video-section>.hero-content{
        padding-left:clamp(18px,3vw,34px)!important;
        padding-right:clamp(18px,3vw,34px)!important;
        padding-bottom:145px!important;
      }
      .hero-video-section>.hero-content .hero-logo-wrapper{
        width:min(720px,88vw)!important;
      }
      .hero-video-section>.hero-content>h2{font-size:clamp(1.35rem,2.5vw,1.85rem)!important}
      .hero-video-section>.hero-content>p{max-width:min(680px,92vw)!important;font-size:clamp(.84rem,1.35vw,1rem)!important;line-height:1.42!important}
      .hero-video-section>.hero-content>.hero-buttons{margin-top:.65rem!important}
    }

    /* Portable très bas : on gagne encore de la hauteur sans supprimer les actualités. */
    @media (min-width:901px) and (max-width:1199px) and (max-height:700px){
      .lrf-desktop-promo-stack{bottom:9px!important;gap:7px!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.cersaie26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        height:92px!important;
        min-height:92px!important;
        padding:11px 13px!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-sub,
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-sub{display:none!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop strong{font-size:1.12rem!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop small{font-size:.65rem!important}
      .hero-video-section>.hero-content{padding-bottom:116px!important}
      .hero-video-section>.hero-content .hero-logo-wrapper{width:min(640px,78vw)!important}
      .hero-video-section>.hero-content>p{margin-bottom:.55rem!important}
    }

    /* PC 1200–1499 px : colonne droite plus étroite, espace central protégé. */
    @media (min-width:1200px) and (max-width:1499px){
      .hero-video-section{
        --lrf-promo-w:clamp(280px,22.5vw,330px);
        --lrf-promo-right:clamp(18px,2.8vw,42px);
        --lrf-promo-safe-gap:clamp(20px,2vw,30px);
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        grid-template-columns:minmax(0,1fr) clamp(56px,5vw,72px)!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop{padding:clamp(16px,2.2vh,22px) clamp(18px,1.8vw,24px)!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-title{font-size:clamp(1.18rem,1.45vw,1.42rem)!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-sub{font-size:clamp(.61rem,.72vw,.69rem)!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-logo{height:clamp(52px,7vh,64px)!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop{padding:clamp(16px,2.2vh,22px) clamp(18px,1.8vw,24px)!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop strong{font-size:clamp(1.45rem,1.8vw,1.8rem)!important;margin-bottom:6px!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop small{font-size:clamp(.78rem,.9vw,.98rem)!important;line-height:1.3!important;margin-top:3px!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-title{font-size:clamp(1.1rem,1.4vw,1.32rem)!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-sub{font-size:clamp(.58rem,.7vw,.66rem)!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-logo{height:clamp(50px,7vh,62px)!important;padding:7px!important}
    }

    /* Écrans larges : on conserve le confort visuel sans dépasser la zone disponible. */
    @media (min-width:1500px){
      .hero-video-section{
        --lrf-promo-w:clamp(360px,25vw,420px);
        --lrf-promo-right:clamp(34px,5vw,96px);
        --lrf-promo-safe-gap:clamp(28px,2vw,40px);
      }
      .lrf-desktop-promo-stack{gap:16px}
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.cersaie26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        height:clamp(145px,17.5vh,170px)!important;
        min-height:clamp(145px,17.5vh,170px)!important;
        flex-basis:clamp(145px,17.5vh,170px)!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        grid-template-columns:minmax(0,1fr) 94px!important;
      }
      .lrf-desktop-promo-stack>.elios-rentree-desktop{padding:28px 32px!important;border-radius:30px!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-title{font-size:1.62rem!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-sub{font-size:.76rem!important}
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-logo{height:78px!important;padding:9px!important}
    }

    /* Écrans courts (portable 1366x768, 1280x720, etc.) : colonne compacte. */
    @media (min-width:1200px) and (max-height:720px){
      .lrf-desktop-promo-stack{gap:8px!important}
      .lrf-desktop-promo-stack>.viewlots26-desktop,
      .lrf-desktop-promo-stack>.cersaie26-desktop,
      .lrf-desktop-promo-stack>.elios-rentree-desktop{
        height:104px!important;
        min-height:104px!important;
        flex-basis:104px!important;
        padding-top:13px!important;
        padding-bottom:13px!important;
      }
      .lrf-desktop-promo-stack>.viewlots26-desktop .viewlots26-desktop-sub,
      .lrf-desktop-promo-stack>.elios-rentree-desktop .elios-rentree-sub{display:none!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop strong{font-size:1.38rem!important;margin-bottom:3px!important}
      .lrf-desktop-promo-stack>.cersaie26-desktop small{font-size:.75rem!important;line-height:1.2!important;margin-top:1px!important}
      .hero-video-section>.hero-content .hero-logo-wrapper{width:min(740px,100%)!important}
      .hero-video-section>.hero-content>p{margin-bottom:.6rem!important}
      .hero-video-section>.hero-content>.hero-buttons{margin-top:.55rem!important}
    }

    @media (max-width:900px){
      .lrf-desktop-promo-stack{display:none!important}
    }

    @media(prefers-reduced-motion:reduce){
      .lrf-desktop-promo-stack>.elios-rentree-desktop{animation:none!important;translate:0 0!important}
    }
  `;
  document.head.appendChild(style);

  function install(){
    const hero=document.querySelector('.hero-video-section');
    if(!hero)return;

    if(!window.matchMedia(DESKTOP).matches){
      const existing=hero.querySelector('.lrf-desktop-promo-stack');
      if(existing)existing.style.display='none';
      return;
    }

    let stack=hero.querySelector('.lrf-desktop-promo-stack');
    if(!stack){
      stack=document.createElement('div');
      stack.className='lrf-desktop-promo-stack';
      stack.setAttribute('aria-label','Actualités et offres LE ROY FACTORY');
      hero.appendChild(stack);
    }
    stack.style.removeProperty('display');

    SELECTORS.forEach(selector=>{
      const card=hero.querySelector(selector) || document.querySelector(selector);
      if(card && card.parentElement!==stack)stack.appendChild(card);
    });

    if(!stack.children.length)stack.remove();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
  window.addEventListener('resize',()=>requestAnimationFrame(install),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(install,120),{passive:true});
})();