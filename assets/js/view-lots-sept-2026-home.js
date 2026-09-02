(()=>{
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
    .viewlots26-header{display:none;text-decoration:none;color:#fff;border:1px solid rgba(255,211,85,.92);background:linear-gradient(145deg,#17130d,#262015 62%,#073326);box-shadow:0 0 18px rgba(255,199,46,.2);border-radius:16px;align-items:center;justify-content:center;text-align:center;font-family:inherit;transition:.2s;overflow:hidden;position:relative}
    .viewlots26-header:before{content:"";position:absolute;inset:-80% -40%;background:linear-gradient(112deg,transparent 43%,rgba(255,232,150,.18) 49%,transparent 56%);animation:viewLotsSweep 8s ease-in-out infinite;pointer-events:none}
    .viewlots26-header-inner{position:relative;z-index:1;line-height:1.02}.viewlots26-header b{display:block;color:#ffd95d;font:800 .92rem Georgia,serif;letter-spacing:.03em}.viewlots26-header small{display:block;color:#fff;font-size:.58rem;font-weight:800;letter-spacing:.05em;margin-top:3px;text-transform:uppercase}
    .viewlots26-header:hover{transform:translateY(-1px);box-shadow:0 0 24px rgba(255,199,46,.32)}
    @keyframes viewLotsSweep{0%,24%{transform:translateX(-30%);opacity:0}48%{opacity:.6}72%,100%{transform:translateX(30%);opacity:0}}
    @media(max-width:900px){
      .viewlots26-header{display:flex;width:92px;min-width:92px;height:64px;padding:6px 7px;margin-left:auto}
      header .nav-container{gap:7px!important}
      header .nav-container>a.logo img{width:58px!important;height:58px!important}
      .cersaie26-mobile{width:150px!important;min-width:150px!important;max-width:150px!important;min-height:64px!important;padding:8px 9px!important;margin-left:0!important;margin-right:0!important}
      .cersaie26-mobile strong{font-size:.96rem!important}.cersaie26-mobile small{font-size:.67rem!important;line-height:1.22!important}
      header .burger-btn{width:58px!important;min-width:58px!important;height:58px!important;padding:13px!important}
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
    @media(prefers-reduced-motion:reduce){.viewlots26-header:before{animation:none}}
  `;
  document.head.appendChild(style);

  const nav=document.querySelector('header .nav-container');
  const burger=document.querySelector('header .burger-btn');
  if(!nav||!burger)return;

  const promo=document.createElement('a');
  promo.className='viewlots26-header';
  promo.href='view-lots-septembre-2026.html';
  promo.setAttribute('aria-label','Découvrir les lots VIEW Septembre 2026');
  promo.innerHTML='<span class="viewlots26-header-inner"><b>VIEW</b><small>LOTS SEPT. 26</small></span>';
  nav.insertBefore(promo,burger);
})();