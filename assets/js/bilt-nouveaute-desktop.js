(()=>{
  'use strict';
  if(window.__LRF_BILT_NOUVEAUTE_DESKTOP__)return;
  window.__LRF_BILT_NOUVEAUTE_DESKTOP__=true;

  const style=document.createElement('style');
  style.textContent=`
    .lrf-bilt-new{display:none}
    @media(min-width:1200px){
      .lrf-bilt-new{position:absolute;z-index:24;left:clamp(18px,3.5vw,56px);top:50%;transform:translateY(-50%);display:flex;width:clamp(245px,19vw,315px);min-height:128px;box-sizing:border-box;padding:22px 24px;border:1px solid rgba(255,255,255,.22);border-radius:25px;background:linear-gradient(145deg,rgba(14,79,45,.93),rgba(24,126,72,.92) 58%,rgba(8,58,32,.94));box-shadow:0 18px 42px rgba(0,0,0,.30),0 0 22px rgba(44,190,105,.15);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff;text-decoration:none;flex-direction:column;justify-content:center;align-items:flex-start;overflow:hidden;transition:transform .22s ease,box-shadow .22s ease}
      .lrf-bilt-new:before{content:'';position:absolute;inset:-40% -30%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.13) 50%,transparent 60%);transform:translateX(-45%);animation:lrfBiltSweep 6s ease-in-out infinite;pointer-events:none}
      .lrf-bilt-new:hover{transform:translateY(-50%) scale(1.025);box-shadow:0 22px 48px rgba(0,0,0,.36),0 0 28px rgba(44,190,105,.24)}
      .lrf-bilt-new-kicker{position:relative;font-size:.67rem;font-weight:900;letter-spacing:2.1px;text-transform:uppercase;color:#d9ffe8;margin-bottom:8px}
      .lrf-bilt-new-title{position:relative;font-size:clamp(1.45rem,1.75vw,1.9rem);line-height:1;font-weight:950;letter-spacing:.3px;margin:0 0 8px}
      .lrf-bilt-new-sub{position:relative;font-size:.76rem;line-height:1.35;color:rgba(255,255,255,.88);font-weight:650}
      .lrf-bilt-new-cta{position:relative;margin-top:12px;padding:6px 11px;border-radius:999px;background:#fff;color:#126d3e;font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.7px}
      @keyframes lrfBiltSweep{0%,25%{transform:translateX(-55%);opacity:0}45%{opacity:1}70%,100%{transform:translateX(55%);opacity:0}}
    }
    @media(min-width:1200px) and (max-width:1499px){.lrf-bilt-new{width:clamp(225px,18vw,270px);left:18px;padding:18px 20px}.lrf-bilt-new-title{font-size:1.35rem}}
    @media(max-width:1199px){.lrf-bilt-new{display:none!important}}
    @media(prefers-reduced-motion:reduce){.lrf-bilt-new:before{animation:none}}
  `;
  document.head.appendChild(style);

  function install(){
    if(!matchMedia('(min-width:1200px)').matches)return;
    const hero=document.querySelector('.hero-video-section');
    if(!hero||hero.querySelector('.lrf-bilt-new'))return;
    const card=document.createElement('a');
    card.className='lrf-bilt-new';
    card.href='partenaires.html';
    card.setAttribute('aria-label','Découvrir la nouveauté BILT');
    card.innerHTML=`<span class="lrf-bilt-new-kicker">Nouveauté</span><strong class="lrf-bilt-new-title">Nouveauté BILT</strong><span class="lrf-bilt-new-sub">Découvrez la nouvelle solution BILT pour les professionnels du carrelage.</span><span class="lrf-bilt-new-cta">Découvrir</span>`;
    hero.appendChild(card);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
