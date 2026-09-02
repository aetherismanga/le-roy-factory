(()=>{
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
    .viewlots26-home{position:absolute;right:clamp(28px,6vw,110px);top:17%;z-index:22;width:420px;min-height:180px;border-radius:30px;border:1px solid rgba(255,213,85,.94);background:radial-gradient(circle at 85% 18%,rgba(255,227,123,.22),transparent 30%),linear-gradient(145deg,#10100f,#1b1710 58%,#073326);box-shadow:0 0 38px rgba(255,199,46,.28),0 20px 48px rgba(0,0,0,.32);color:#fff;text-decoration:none;padding:22px 25px;display:grid;grid-template-columns:1fr 105px;gap:18px;align-items:center;overflow:hidden;transition:.22s}
    .viewlots26-home:before{content:"";position:absolute;inset:-70% -25%;background:linear-gradient(112deg,transparent 42%,rgba(255,232,150,.16) 49%,transparent 56%);animation:viewLotsSweep 8s ease-in-out infinite;pointer-events:none}.viewlots26-home:hover{transform:translateY(-3px) scale(1.015);box-shadow:0 0 50px rgba(255,199,46,.4),0 24px 54px rgba(0,0,0,.38)}
    .viewlots26-copy,.viewlots26-logo{position:relative;z-index:1}.viewlots26-kicker{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#f4d566;font-weight:900}.viewlots26-title{font:800 1.72rem Georgia,serif;line-height:1.02;margin:6px 0 8px;color:#fff}.viewlots26-sub{font-size:.86rem;line-height:1.38;color:#f0f0f0}.viewlots26-cta{display:inline-flex;margin-top:12px;padding:7px 11px;border-radius:999px;background:#ffd95d;color:#111;font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.viewlots26-logo{height:82px;background:#fff;border-radius:16px;padding:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,.2)}.viewlots26-logo img{max-width:100%;max-height:100%;object-fit:contain}
    @keyframes viewLotsSweep{0%,24%{transform:translateX(-30%);opacity:0}48%{opacity:.6}72%,100%{transform:translateX(30%);opacity:0}}
    @media(max-width:1100px) and (min-width:901px){.viewlots26-home{width:340px;right:28px;min-height:160px;padding:18px 20px;grid-template-columns:1fr 86px}.viewlots26-title{font-size:1.45rem}.viewlots26-logo{height:68px}}
    @media(max-width:900px){.viewlots26-home{left:12px;right:12px;top:5.5%;width:auto;min-height:0;padding:12px 14px;border-radius:19px;grid-template-columns:1fr 82px}.viewlots26-title{font-size:1.25rem;margin:3px 0 5px}.viewlots26-sub{font-size:.73rem;line-height:1.3}.viewlots26-cta{margin-top:7px;font-size:.64rem;padding:5px 9px}.viewlots26-logo{height:58px;border-radius:12px;padding:8px}.viewlots26-kicker{font-size:.61rem}}
    @media(prefers-reduced-motion:reduce){.viewlots26-home:before{animation:none}}
  `;
  document.head.appendChild(style);
  const hero=document.querySelector('.hero-video-section');
  if(!hero)return;
  const card=document.createElement('a');
  card.className='viewlots26-home';
  card.href='view-lots-septembre-2026.html';
  card.setAttribute('aria-label','Découvrir les lots VIEW Septembre 2026');
  card.innerHTML=`<div class="viewlots26-copy"><div class="viewlots26-kicker">Nouveauté · Septembre 2026</div><div class="viewlots26-title">LOTS VIEW<br>CHOIX MS</div><div class="viewlots26-sub">Quantités disponibles · tarifs réservés aux clients identifiés</div><span class="viewlots26-cta">Voir les 22 lots</span></div><div class="viewlots26-logo"><img src="assets/img/view.png" alt="VIEW Ceramiche"></div>`;
  hero.appendChild(card);
})();