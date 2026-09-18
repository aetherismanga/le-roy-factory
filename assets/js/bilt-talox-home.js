(()=>{
  'use strict';
  if(window.__LRF_BILT_TALOX_HOME__)return;
  window.__LRF_BILT_TALOX_HOME__=true;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const readSession=()=>{try{return window.LRF_PRO_SESSION?.read?.()||JSON.parse(sessionStorage.getItem('lrfProSession')||'null')}catch(_){return null}};
  const hasBilt=()=>{const s=readSession();return !!(s&&(s.isAdmin||s.admin||(Array.isArray(s.partenaires)&&s.partenaires.some(p=>norm(p)==='bilt'))))};

  const style=document.createElement('style');
  style.textContent=`
    .bilt-talox-desktop{position:absolute;right:clamp(28px,6vw,110px);top:38%;z-index:21;width:360px;height:150px;padding:18px 18px 18px 20px;border-radius:28px;overflow:hidden;text-decoration:none;color:#fff;border:1px solid rgba(123,215,255,.88);background:radial-gradient(circle at 88% 12%,rgba(99,205,255,.28),transparent 32%),linear-gradient(145deg,#063d6d,#0b64a0 58%,#063456);box-shadow:0 0 22px rgba(38,159,225,.24),0 16px 38px rgba(0,0,0,.24);display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:12px;align-items:center;transition:transform .2s,box-shadow .2s;isolation:isolate}
    .bilt-talox-desktop:before{content:"";position:absolute;inset:-80% -40%;background:linear-gradient(112deg,transparent 43%,rgba(219,246,255,.20) 49%,transparent 56%);animation:biltTaloxSweep 8s ease-in-out infinite;pointer-events:none}
    .bilt-talox-desktop:hover{transform:scale(1.015);box-shadow:0 0 32px rgba(45,177,240,.34),0 20px 44px rgba(0,0,0,.28)}
    @keyframes biltTaloxSweep{0%,24%{transform:translateX(-30%);opacity:0}48%{opacity:.65}72%,100%{transform:translateX(30%);opacity:0}}
    .bilt-talox-copy{position:relative;z-index:2;min-width:0}.bilt-talox-kicker{font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:#9ce6ff;font-weight:950}.bilt-talox-title{font:900 1.42rem Georgia,serif;line-height:1;color:#fff;margin:4px 0}.bilt-talox-sub{font-size:.68rem;line-height:1.22;color:#e9f8ff}.bilt-talox-price{display:inline-flex;margin-top:7px;padding:5px 8px;border-radius:999px;background:#e9f8ff;color:#074a77;font-size:.61rem;font-weight:950}.bilt-talox-fair{display:block;margin-top:4px;color:#d8f1ff;font-size:.57rem;font-weight:850}
    .bilt-talox-visual{position:relative;z-index:2;height:104px;border-radius:14px;overflow:hidden;background:#fff;border:1px solid rgba(255,255,255,.7);box-shadow:0 8px 20px rgba(0,0,0,.16)}.bilt-talox-visual img.product{width:100%;height:100%;object-fit:cover;display:block}.bilt-talox-logo{position:absolute;left:6px;top:6px;width:54px;height:25px;object-fit:contain;background:#fff;border-radius:6px;padding:3px}
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
    a.innerHTML=`<div class="bilt-talox-copy"><div class="bilt-talox-kicker">Nouveauté BILT</div><div class="bilt-talox-title">TALOX KIT · 5 EN 1</div><div class="bilt-talox-sub">Lames interchangeables · changement rapide · mallette pro</div><span class="bilt-talox-price"></span><span class="bilt-talox-fair">Remise foire sur consultation</span></div><div class="bilt-talox-visual"><img class="product" src="assets/img/bilt-talox-kit-main.svg" alt="Talox Kit BILT"><img class="bilt-talox-logo" src="assets/img/bilt.png" alt="BILT"></div>`;
    hero.appendChild(a);
    const refresh=()=>{const p=a.querySelector('.bilt-talox-price');p.textContent=hasBilt()?'49,85 € / mallette':'🔒 Tarif PRO masqué';};
    refresh();
    window.addEventListener('lrf-pro-session-changed',refresh);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();