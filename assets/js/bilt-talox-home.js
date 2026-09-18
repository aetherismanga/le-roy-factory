(()=>{
  'use strict';
  if(window.__LRF_BILT_TALOX_HOME__)return;
  window.__LRF_BILT_TALOX_HOME__=true;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const readSession=()=>{try{return window.LRF_PRO_SESSION?.read?.()||JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch(_){return null}};
  const hasBilt=()=>{const s=readSession();return !!(s&&(s.isAdmin||s.admin||(Array.isArray(s.partenaires)&&s.partenaires.some(p=>norm(p)==='bilt'))))};

  const style=document.createElement('style');
  style.textContent=`
    .bilt-talox-desktop{position:absolute;right:clamp(28px,6vw,110px);top:38%;z-index:21;width:360px;height:150px;padding:18px 18px 18px 20px;border-radius:28px;overflow:hidden;text-decoration:none;color:#fff;border:1px solid rgba(148,198,153,.90);background:radial-gradient(circle at 88% 12%,rgba(199,235,188,.22),transparent 32%),linear-gradient(145deg,#0f4f2e,#16703f 58%,#0b3e24);box-shadow:0 0 22px rgba(44,138,74,.24),0 16px 38px rgba(0,0,0,.24);display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:12px;align-items:center;transition:transform .2s,box-shadow .2s;isolation:isolate}
    .bilt-talox-desktop:before{content:"";position:absolute;inset:-80% -40%;background:linear-gradient(112deg,transparent 43%,rgba(226,246,220,.20) 49%,transparent 56%);animation:biltTaloxSweep 8s ease-in-out infinite;pointer-events:none}
    .bilt-talox-desktop:hover{transform:scale(1.015);box-shadow:0 0 32px rgba(56,153,82,.34),0 20px 44px rgba(0,0,0,.28)}
    @keyframes biltTaloxSweep{0%,24%{transform:translateX(-30%);opacity:0}48%{opacity:.65}72%,100%{transform:translateX(30%);opacity:0}}
    .bilt-talox-copy{position:relative;z-index:2;min-width:0}.bilt-talox-kicker{font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:#cfe8c8;font-weight:950}.bilt-talox-title{font:900 1.42rem Georgia,serif;line-height:1;color:#fff;margin:4px 0}.bilt-talox-sub{font-size:.68rem;line-height:1.22;color:#eef8ea}.bilt-talox-price{display:inline-flex;margin-top:7px;padding:5px 8px;border-radius:999px;background:#eef8ea;color:#16542d;font-size:.61rem;font-weight:950}.bilt-talox-fair{display:block;margin-top:4px;color:#dfeeda;font-size:.57rem;font-weight:850}
    .bilt-talox-visual{position:relative;z-index:2;height:104px;border-radius:14px;overflow:hidden;background:#fff;border:1px solid rgba(255,255,255,.7);box-shadow:0 8px 20px rgba(0,0,0,.16)}.bilt-talox-visual img.product{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .22s ease}.bilt-talox-logo{position:absolute;left:7px;top:7px;width:34px;height:16px;object-fit:contain;background:rgba(255,255,255,.94);border-radius:5px;padding:2px;box-shadow:0 2px 7px rgba(0,0,0,.12);z-index:3}.bilt-talox-dots{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);display:flex;gap:4px;z-index:3}.bilt-talox-dots i{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 1px 3px rgba(0,0,0,.2)}.bilt-talox-dots i.active{background:#fff}
    @media(max-width:900px){.bilt-talox-desktop{display:none!important}}
    @media(prefers-reduced-motion:reduce){.bilt-talox-desktop:before{animation:none}}
  `;
  document.head.appendChild(style);

  const install=()=>{
    const hero=document.querySelector('.hero-video-section');
    if(!hero||hero.querySelector('.bilt-talox-desktop'))return;
    const a=document.createElement('a');
    a.className='bilt-talox-desktop';
    a.href='bilt-talox-kit.html';
    a.setAttribute('aria-label','Découvrir la nouveauté BILT Talox Kit');
    a.innerHTML=`<div class="bilt-talox-copy"><div class="bilt-talox-kicker">Nouveauté BILT</div><div class="bilt-talox-title">TALOX KIT · 5 EN 1</div><div class="bilt-talox-sub">Lames interchangeables · changement rapide · mallette pro</div><span class="bilt-talox-price"></span><span class="bilt-talox-fair">Remise foire sur consultation</span></div><div class="bilt-talox-visual"><img class="product" src="assets/img/talofix01.jpeg" alt="Talox Kit BILT" data-talox-slide="0"><img class="bilt-talox-logo" src="assets/img/bilt.png" alt="BILT"><span class="bilt-talox-dots"><i class="active"></i><i></i><i></i></span></div>`;
    hero.appendChild(a);
    const slideImages=['assets/img/talofix01.jpeg','assets/img/talofix02.jpeg','assets/img/talofix03.jpeg'];
    const productImg=a.querySelector('.bilt-talox-visual img.product');
    const dots=[...a.querySelectorAll('.bilt-talox-dots i')];
    let slide=0;
    setInterval(()=>{
      slide=(slide+1)%slideImages.length;
      if(!productImg)return;
      productImg.style.opacity='0';
      setTimeout(()=>{
        productImg.src=slideImages[slide];
        productImg.dataset.taloxSlide=String(slide);
        dots.forEach((d,i)=>d.classList.toggle('active',i===slide));
        productImg.style.opacity='1';
      },160);
    },3400);
    const refresh=()=>{const p=a.querySelector('.bilt-talox-price');p.textContent=hasBilt()?'49,85 € / mallette':'🔒 Tarif PRO masqué';};
    refresh();
    window.addEventListener('lrf-pro-session-changed',refresh);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();