(()=>{
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
    @keyframes lrfPromoSway{0%,100%{translate:-7px 0}50%{translate:7px 0}}
    @keyframes viewLotsSweep{0%,24%{transform:translateX(-30%);opacity:0}48%{opacity:.62}72%,100%{transform:translateX(30%);opacity:0}}

    .viewlots26-header,.viewlots26-desktop{position:relative;overflow:hidden;text-decoration:none;color:#fff;border:1px solid rgba(255,211,85,.96);box-shadow:0 0 18px rgba(255,163,55,.24),0 0 12px rgba(255,205,48,.18),0 16px 38px rgba(0,0,0,.25);font-family:inherit;transition:transform .2s,box-shadow .2s;isolation:isolate;box-sizing:border-box}
    .viewlots26-header:before,.viewlots26-desktop:before{content:"";position:absolute;inset:-80% -40%;background:linear-gradient(112deg,transparent 43%,rgba(255,239,190,.20) 49%,transparent 56%);animation:viewLotsSweep 8s ease-in-out infinite;pointer-events:none}
    .viewlots26-header:hover,.viewlots26-desktop:hover{transform:scale(1.015);box-shadow:0 0 30px rgba(255,167,60,.34),0 0 18px rgba(255,205,48,.25),0 20px 44px rgba(0,0,0,.3)}

    .viewlots26-desktop{position:absolute;right:clamp(28px,6vw,110px);top:20%;z-index:21;width:360px;height:150px;padding:24px 28px;border-radius:28px;background:radial-gradient(circle at 88% 18%,rgba(255,214,120,.20),transparent 30%),linear-gradient(145deg,#6f3b12,#8b501b 58%,#5c2e0d);display:grid;grid-template-columns:1fr 82px;gap:14px;align-items:center;text-align:left;animation:lrfPromoSway 5.2s ease-in-out infinite}
    .viewlots26-desktop-copy{position:relative;z-index:2;min-width:0}.viewlots26-desktop-kicker{font-size:.64rem;text-transform:uppercase;letter-spacing:.12em;color:#ffd776;font-weight:900}.viewlots26-desktop-title{font:800 1.55rem Georgia,serif;line-height:1.0;color:#fff;margin:5px 0 6px}.viewlots26-desktop-sub{font-size:.72rem;line-height:1.28;color:#fff3df}.viewlots26-desktop-cta{display:inline-flex;margin-top:8px;padding:6px 10px;border-radius:999px;background:#ffd45a;color:#17120b;font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.viewlots26-desktop-logo{position:relative;z-index:2;height:68px;border-radius:13px;background:#fff;padding:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.17)}.viewlots26-desktop-logo img{max-width:100%;max-height:100%;object-fit:contain}

    .viewlots26-header{display:none;border-radius:16px;background:linear-gradient(145deg,#6f3b12,#8b501b 58%,#5c2e0d);align-items:center;justify-content:center;text-align:center;animation:lrfPromoSway 4.8s ease-in-out infinite}.viewlots26-header-inner{position:relative;z-index:1;line-height:1.02}.viewlots26-header b{display:block;color:#ffd95d;font:800 .92rem Georgia,serif;letter-spacing:.03em}.viewlots26-header small{display:block;color:#fff;font-size:.58rem;font-weight:800;letter-spacing:.05em;margin-top:3px;text-transform:uppercase}

    .viewlots26-modal{position:fixed;inset:0;z-index:10070;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}.viewlots26-modal.open{display:flex}.viewlots26-box{position:relative;width:min(1280px,96vw);height:92vh;overflow:hidden;background:#f7f5f0;border:1px solid rgba(212,175,55,.78);border-radius:21px;box-shadow:0 25px 80px rgba(0,0,0,.78)}.viewlots26-close{position:absolute;right:14px;top:12px;z-index:5;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,215,0,.72);background:#111;color:#fff;font-size:1.55rem;line-height:1;cursor:pointer;box-shadow:0 7px 20px rgba(0,0,0,.28)}.viewlots26-frame{display:block;width:100%;height:100%;border:0;background:#f7f5f0}.viewlots26-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#72541f;font-weight:900;background:#f7f5f0;z-index:1}.viewlots26-frame.ready+.viewlots26-loading{display:none}body.viewlots26-lock{overflow:hidden}

    @media(min-width:1500px){.viewlots26-desktop{width:420px;height:170px;padding:28px 32px;border-radius:30px;grid-template-columns:1fr 94px}.viewlots26-desktop-title{font-size:1.72rem}.viewlots26-desktop-sub{font-size:.78rem}.viewlots26-desktop-logo{height:78px}}
    @media(max-width:1100px) and (min-width:901px){.viewlots26-desktop{width:300px;height:130px;padding:20px 22px;right:28px;top:18%;grid-template-columns:1fr 64px}.viewlots26-desktop-title{font-size:1.32rem}.viewlots26-desktop-sub{font-size:.66rem}.viewlots26-desktop-logo{height:56px}.viewlots26-desktop-cta{margin-top:6px}}
    @media(max-width:900px){
      .viewlots26-desktop{display:none}
      .viewlots26-header{display:flex;width:92px;min-width:92px;height:64px;padding:6px 7px;margin-left:auto}
      header .nav-container{gap:7px!important}
      header .nav-container>a.logo img{width:58px!important;height:58px!important}
      .cersaie26-mobile{width:150px!important;min-width:150px!important;max-width:150px!important;min-height:64px!important;padding:8px 9px!important;margin-left:0!important;margin-right:0!important;animation:lrfPromoSway 5.4s ease-in-out infinite!important}
      .cersaie26-mobile strong{font-size:.96rem!important}.cersaie26-mobile small{font-size:.67rem!important;line-height:1.22!important}
      header .burger-btn{width:58px!important;min-width:58px!important;height:58px!important;padding:13px!important}
      .viewlots26-modal{padding:8px}.viewlots26-box{width:100%;height:96vh;border-radius:17px}.viewlots26-close{right:9px;top:8px;width:38px;height:38px}
    }
    @media(max-width:410px){
      .viewlots26-header{width:82px;min-width:82px;height:58px;padding:5px}.viewlots26-header b{font-size:.82rem}.viewlots26-header small{font-size:.52rem}
      .cersaie26-mobile{width:132px!important;min-width:132px!important;max-width:132px!important;min-height:58px!important;padding:7px!important}.cersaie26-mobile strong{font-size:.86rem!important}.cersaie26-mobile small{font-size:.61rem!important}
      header .nav-container>a.logo img{width:52px!important;height:52px!important}header .burger-btn{width:52px!important;min-width:52px!important;height:52px!important;padding:11px!important}
    }
    @media(max-width:365px){
      .viewlots26-header{width:74px;min-width:74px}.viewlots26-header b{font-size:.76rem}.viewlots26-header small{font-size:.47rem}
      .cersaie26-mobile{width:118px!important;min-width:118px!important;max-width:118px!important}.cersaie26-mobile strong{font-size:.78rem!important}.cersaie26-mobile small{font-size:.56rem!important}
      header .nav-container{gap:5px!important;padding-left:5px!important;padding-right:5px!important}
    }
    @media(prefers-reduced-motion:reduce){.viewlots26-header:before,.viewlots26-desktop:before{animation:none}.viewlots26-header,.viewlots26-desktop,.cersaie26-mobile{animation:none!important}}
  `;
  document.head.appendChild(style);

  const modal=document.createElement('div');
  modal.className='viewlots26-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="viewlots26-box" role="dialog" aria-modal="true" aria-label="Lots VIEW Septembre 2026"><button class="viewlots26-close" type="button" aria-label="Fermer">×</button><iframe class="viewlots26-frame" title="Lots VIEW Septembre 2026" src="view-lots-septembre-2026.html?v=20260902-modal1"></iframe><div class="viewlots26-loading">Chargement des lots VIEW…</div></div>';
  document.body.appendChild(modal);
  const frame=modal.querySelector('.viewlots26-frame');
  frame.addEventListener('load',()=>{
    frame.classList.add('ready');
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      const header=doc.querySelector('header'); if(header)header.style.display='none';
      const footer=doc.querySelector('footer'); if(footer)footer.style.display='none';
      const injected=doc.createElement('style');
      injected.textContent='html,body{background:#f7f5f0!important}body{overflow-x:hidden!important}.hero-inner{min-height:260px!important;padding-top:30px!important;padding-bottom:30px!important}.content{padding-top:20px!important}@media(max-width:680px){.hero-inner{padding-top:20px!important;padding-bottom:22px!important}.view-logo{width:130px!important;height:72px!important}.hero h1{font-size:2rem!important}.content{padding-top:14px!important}}';
      doc.head.appendChild(injected);
    }catch(_){ }
  });

  const open=(e)=>{if(e)e.preventDefault();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('viewlots26-lock')};
  const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('viewlots26-lock')};
  modal.querySelector('.viewlots26-close').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});

  const nav=document.querySelector('header .nav-container');
  const burger=document.querySelector('header .burger-btn');
  if(nav&&burger){
    const promo=document.createElement('a');
    promo.className='viewlots26-header';
    promo.href='view-lots-septembre-2026.html';
    promo.setAttribute('aria-label','Découvrir les lots VIEW Septembre 2026');
    promo.innerHTML='<span class="viewlots26-header-inner"><b>VIEW</b><small>LOTS SEPT. 26</small></span>';
    promo.addEventListener('click',open);
    nav.insertBefore(promo,burger);
  }

  const hero=document.querySelector('.hero-video-section');
  if(hero){
    const desktop=document.createElement('a');
    desktop.className='viewlots26-desktop';
    desktop.href='view-lots-septembre-2026.html';
    desktop.setAttribute('aria-label','Découvrir les lots VIEW Septembre 2026');
    desktop.innerHTML='<div class="viewlots26-desktop-copy"><div class="viewlots26-desktop-kicker">Offre pro · Septembre 2026</div><div class="viewlots26-desktop-title">LOTS VIEW<br>CHOIX MS</div><div class="viewlots26-desktop-sub">22 lots disponibles · tarifs réservés aux clients identifiés</div><span class="viewlots26-desktop-cta">Voir les lots</span></div><div class="viewlots26-desktop-logo"><img src="assets/img/view.png" alt="VIEW Ceramiche"></div>';
    desktop.addEventListener('click',open);
    hero.appendChild(desktop);
  }
})();