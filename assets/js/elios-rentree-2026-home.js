(()=>{
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
    @keyframes eliosRentreeSweep{0%,20%{transform:translateX(-38%);opacity:0}48%{opacity:.55}78%,100%{transform:translateX(38%);opacity:0}}
    @keyframes eliosRentreeGlow{0%,100%{box-shadow:0 0 12px rgba(222,181,84,.18),0 12px 30px rgba(0,0,0,.24)}50%{box-shadow:0 0 26px rgba(222,181,84,.34),0 16px 38px rgba(0,0,0,.3)}}
    .elios-rentree-desktop,.elios-rentree-mobile{position:relative;overflow:hidden;text-decoration:none;color:#fff;border:1px solid rgba(225,190,93,.96);isolation:isolate;box-sizing:border-box;background:radial-gradient(circle at 88% 18%,rgba(255,226,142,.16),transparent 30%),linear-gradient(145deg,#083c30,#0c5a44 58%,#073228)}
    .elios-rentree-desktop:before,.elios-rentree-mobile:before{content:"";position:absolute;inset:-90% -45%;background:linear-gradient(112deg,transparent 43%,rgba(255,244,205,.22) 49%,transparent 56%);animation:eliosRentreeSweep 8.4s ease-in-out infinite;pointer-events:none}
    .elios-rentree-desktop{position:absolute;right:clamp(28px,6vw,110px);top:43%;z-index:20;width:360px;min-height:142px;padding:20px 24px;border-radius:27px;display:grid;grid-template-columns:1fr 86px;gap:14px;align-items:center;text-align:left;animation:eliosRentreeGlow 4.8s ease-in-out infinite}
    .elios-rentree-copy{position:relative;z-index:2;min-width:0}.elios-rentree-kicker{font-size:.63rem;text-transform:uppercase;letter-spacing:.11em;color:#f3cf75;font-weight:900}.elios-rentree-title{font:800 1.42rem Georgia,serif;line-height:1.02;color:#fff;margin:4px 0 6px}.elios-rentree-sub{font-size:.69rem;line-height:1.3;color:#e9f2ed}.elios-rentree-cta{display:inline-flex;margin-top:7px;padding:6px 10px;border-radius:999px;background:#e0b94f;color:#15120a;font-size:.61rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.elios-rentree-logo{position:relative;z-index:2;height:66px;border-radius:13px;background:#fff;padding:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.18)}.elios-rentree-logo img{max-width:100%;max-height:100%;object-fit:contain}
    .elios-rentree-mobile{display:none;position:relative;z-index:8;width:calc(100% - 18px);min-height:46px;margin:7px auto 0;border-radius:13px;padding:7px 12px;align-items:center;justify-content:space-between;gap:10px;animation:eliosRentreeGlow 5.2s ease-in-out infinite}.elios-rentree-mobile strong{position:relative;z-index:2;font:800 .83rem Georgia,serif;color:#ffe08c}.elios-rentree-mobile span{position:relative;z-index:2;font-size:.63rem;font-weight:800;color:#fff;text-align:right}.elios-rentree-mobile b{color:#ffe174}
    .elios-rentree-modal{position:fixed;inset:0;z-index:10080;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.84);backdrop-filter:blur(8px)}.elios-rentree-modal.open{display:flex}.elios-rentree-box{position:relative;width:min(1280px,96vw);height:92vh;overflow:hidden;background:#f7f5f0;border:1px solid rgba(212,175,55,.8);border-radius:21px;box-shadow:0 25px 80px rgba(0,0,0,.78)}.elios-rentree-close{position:absolute;right:14px;top:12px;z-index:5;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,215,0,.72);background:#111;color:#fff;font-size:1.55rem;line-height:1;cursor:pointer;box-shadow:0 7px 20px rgba(0,0,0,.28)}.elios-rentree-frame{display:block;width:100%;height:100%;border:0;background:#f7f5f0}.elios-rentree-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#72541f;font-weight:900;background:#f7f5f0;z-index:1}.elios-rentree-frame.ready+.elios-rentree-loading{display:none}body.elios-rentree-lock{overflow:hidden}
    @media(max-width:1100px) and (min-width:901px){.elios-rentree-desktop{width:300px;min-height:126px;padding:18px 20px;right:28px;top:44%;grid-template-columns:1fr 66px}.elios-rentree-title{font-size:1.23rem}.elios-rentree-sub{font-size:.64rem}.elios-rentree-logo{height:55px}}
    @media(max-width:900px){.elios-rentree-desktop{display:none}.elios-rentree-mobile{display:flex}.elios-rentree-modal{padding:8px}.elios-rentree-box{width:100%;height:96vh;border-radius:17px}.elios-rentree-close{right:9px;top:8px;width:38px;height:38px}}
    @media(max-width:390px){.elios-rentree-mobile{width:calc(100% - 12px);padding:6px 9px;min-height:43px}.elios-rentree-mobile strong{font-size:.75rem}.elios-rentree-mobile span{font-size:.57rem}}
    @media(prefers-reduced-motion:reduce){.elios-rentree-desktop:before,.elios-rentree-mobile:before,.elios-rentree-desktop,.elios-rentree-mobile{animation:none!important}}
  `;
  document.head.appendChild(style);

  const modal=document.createElement('div');
  modal.className='elios-rentree-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="elios-rentree-box" role="dialog" aria-modal="true" aria-label="Promo rentrée Elios R11"><button class="elios-rentree-close" type="button" aria-label="Fermer">×</button><iframe class="elios-rentree-frame" title="Promo rentrée Elios R11" data-src="elios-rentree-r11-2026.html?v=20260904-1" loading="lazy"></iframe><div class="elios-rentree-loading">Chargement de la promo ELIOS…</div></div>';
  document.body.appendChild(modal);
  const frame=modal.querySelector('.elios-rentree-frame');
  frame.addEventListener('load',()=>{
    frame.classList.add('ready');
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const header=doc.querySelector('header');if(header)header.style.display='none';
      const footer=doc.querySelector('footer');if(footer)footer.style.display='none';
      const injected=doc.createElement('style');
      injected.textContent='html,body{background:#f7f5f0!important}body{overflow-x:hidden!important}.hero-inner{min-height:285px!important;padding-top:28px!important;padding-bottom:48px!important}.content{padding-top:12px!important}@media(max-width:680px){.hero-inner{padding-top:18px!important;padding-bottom:46px!important}.elios-logo{width:132px!important;height:70px!important}.hero h1{font-size:2.05rem!important}.content{padding-top:8px!important}}';
      doc.head.appendChild(injected);
    }catch(_){ }
  });
  const ensureFrameLoaded=()=>{if(frame.getAttribute('src'))return;frame.classList.remove('ready');frame.setAttribute('src',frame.dataset.src)};
  const open=e=>{if(e)e.preventDefault();ensureFrameLoaded();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('elios-rentree-lock')};
  const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('elios-rentree-lock')};
  modal.querySelector('.elios-rentree-close').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});

  const hero=document.querySelector('.hero-video-section');
  if(hero){
    const desktop=document.createElement('a');desktop.className='elios-rentree-desktop';desktop.href='elios-rentree-r11-2026.html';desktop.setAttribute('aria-label',"Découvrir la promo rentrée Elios R11");desktop.innerHTML='<div class="elios-rentree-copy"><div class="elios-rentree-kicker">Lots 1er choix · R11</div><div class="elios-rentree-title">C\'EST LA RENTRÉE<br>AVEC ELIOS !</div><div class="elios-rentree-sub">30,5×60,5 · palettes complètes · quantités limitées</div><span class="elios-rentree-cta">Voir les lots</span></div><div class="elios-rentree-logo"><img src="assets/img/elios.png" alt="ELIOS Ceramica" loading="lazy" decoding="async"></div>';desktop.addEventListener('click',open);hero.appendChild(desktop);
  }

  const header=document.querySelector('header');
  if(header){
    const mobile=document.createElement('a');mobile.className='elios-rentree-mobile';mobile.href='elios-rentree-r11-2026.html';mobile.setAttribute('aria-label',"Découvrir la promo rentrée Elios R11");mobile.innerHTML='<strong>C\'EST LA RENTRÉE AVEC ELIOS !</strong><span>R11 · 1er choix · <b>Voir les lots</b></span>';mobile.addEventListener('click',open);header.appendChild(mobile);
  }
})();