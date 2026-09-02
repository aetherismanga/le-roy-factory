(() => {
  'use strict';
  const cutoff = new Date(2026, 8, 26, 0, 0, 0);
  if (Date.now() >= cutoff.getTime()) return;
  const style = document.createElement('style');
  style.textContent = `
    .cersaie26-btn{border:1px solid rgba(255,211,85,.92);background:linear-gradient(145deg,#06281e,#0c4a35 72%,#082d22);color:#fff;box-shadow:0 0 18px rgba(35,196,123,.26),0 0 10px rgba(255,205,48,.16);cursor:pointer;transition:.2s;font-family:inherit;z-index:20}
    .cersaie26-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 0 26px rgba(35,196,123,.38),0 0 15px rgba(255,205,48,.25)}
    .cersaie26-btn strong{display:block;color:#ffe06a;font:700 1.02rem Georgia,serif;line-height:1.05}.cersaie26-btn small{display:block;font-size:.7rem;line-height:1.25;margin-top:4px}
    .cersaie26-desktop{position:absolute;right:clamp(18px,5vw,72px);top:50%;width:195px;padding:12px 14px;border-radius:18px;text-align:left}
    .cersaie26-mobile{display:none;min-width:138px;max-width:154px;padding:7px 9px;border-radius:15px;text-align:center;margin-left:auto;margin-right:4px}
    .cersaie26-mobile strong{font-size:.9rem}.cersaie26-mobile small{font-size:.61rem;margin-top:3px}
    .cersaie26-modal{position:fixed;inset:0;z-index:10060;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.8);backdrop-filter:blur(8px)}.cersaie26-modal.open{display:flex}
    .cersaie26-box{position:relative;width:min(900px,96vw);max-height:92vh;overflow:auto;background:linear-gradient(160deg,#11120f,#080908);border:1px solid rgba(212,175,55,.72);border-radius:21px;padding:25px;color:#fff;box-shadow:0 25px 80px rgba(0,0,0,.75)}
    .cersaie26-close{position:absolute;right:14px;top:12px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,215,0,.55);background:#111;color:#fff;font-size:1.5rem;cursor:pointer}
    .cersaie26-box h2{text-align:center;color:#e5bc55;font:700 clamp(1.8rem,4vw,2.6rem) Georgia,serif;margin:0 45px 4px}.cersaie26-meta{text-align:center;color:#a8d8a8;font-weight:800;margin-bottom:12px}.cersaie26-copy{max-width:720px;margin:0 auto 18px;text-align:center;line-height:1.5;color:#eee}
    .cersaie26-images{display:grid;grid-template-columns:.78fr 1.22fr;gap:14px}.cersaie26-card{background:#f7f2e9;border-radius:13px;overflow:hidden;border:1px solid rgba(212,175,55,.45)}.cersaie26-card b{display:block;color:#222;text-align:center;padding:7px;font-size:.76rem;text-transform:uppercase}.cersaie26-card img{display:block;width:100%;height:320px;object-fit:contain;background:#f7f2e9}
    .cersaie26-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.cersaie26-actions button{border-radius:999px;padding:12px 16px;font-weight:900;text-transform:uppercase;cursor:pointer}.cersaie26-yes{background:linear-gradient(#ffe36e,#d5a728);border:1px solid #ffe783;color:#111}.cersaie26-no{background:#111;border:1px solid #c9a43c;color:#fff}.cersaie26-note{text-align:center;font-size:.78rem;color:#c9c9c9;margin:11px 0 0}
    body.cersaie26-lock{overflow:hidden}
    @media(max-width:900px){header .nav-container{gap:7px!important;padding-left:8px!important;padding-right:8px!important}.cersaie26-desktop{display:none}.cersaie26-mobile{display:block}.cersaie26-images{grid-template-columns:1fr}.cersaie26-card img{height:auto;max-height:52vh}.cersaie26-box{padding:21px 13px 17px}.cersaie26-actions{grid-template-columns:1fr;gap:8px}.cersaie26-copy{font-size:.91rem}}
    @media(max-width:390px){.cersaie26-mobile{min-width:124px;max-width:132px;padding:6px}.cersaie26-mobile strong{font-size:.8rem}.cersaie26-mobile small{font-size:.56rem}}
  `;
  document.head.appendChild(style);

  const mobile = document.createElement('button');
  mobile.type='button'; mobile.className='cersaie26-btn cersaie26-mobile';
  mobile.innerHTML='<strong>CERSAIE 2026</strong><small>21–25 septembre<br>● Bologne</small>';
  const nav = document.querySelector('header .nav-container');
  const burger = document.querySelector('header .burger-btn');
  if (nav && burger) nav.insertBefore(mobile, burger);

  const desktop = document.createElement('button');
  desktop.type='button'; desktop.className='cersaie26-btn cersaie26-desktop';
  desktop.innerHTML='<strong>CERSAIE 2026</strong><small>📅 21–25 septembre<br>● Bologne</small>';
  const hero = document.querySelector('.hero-video-section');
  if (hero) hero.appendChild(desktop);

  const modal = document.createElement('div');
  modal.className='cersaie26-modal'; modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="cersaie26-box" role="dialog" aria-modal="true" aria-labelledby="cersaie26-title"><button class="cersaie26-close" aria-label="Fermer">×</button><h2 id="cersaie26-title">CERSAIE 2026</h2><div class="cersaie26-meta">21–25 SEPTEMBRE · BOLOGNE, ITALIE</div><p class="cersaie26-copy">Le Cersaie est le salon international de la céramique pour l’architecture et l’aménagement de salle de bains. Retrouvez LE ROY FACTORY à Bologne du 21 au 25 septembre 2026 sur les stands de nos partenaires.</p><div class="cersaie26-images"><div class="cersaie26-card"><b>Plan du salon</b><img data-cersaie26-img="plan" alt="Plan CERSAIE 2026"></div><div class="cersaie26-card"><b>Nos partenaires</b><img data-cersaie26-img="partners" alt="Partenaires LE ROY FACTORY au CERSAIE 2026"></div></div><div class="cersaie26-actions"><button class="cersaie26-yes" data-answer="Je viens">Je viens</button><button class="cersaie26-no" data-answer="Je ne viens pas">Je ne viens pas</button></div><p class="cersaie26-note">✉ Réponse adressée à Coryne Le Roy et Jérôme Hugol.</p></div>`;
  document.body.appendChild(modal);

  Promise.all([
    fetch('assets/cersaie/plan-2026.b64?v=20260902').then(r=>r.text()),
    fetch('assets/cersaie/partners-2026.b64?v=20260902').then(r=>r.text())
  ]).then(([p1,p2])=>{
    const a=modal.querySelector('[data-cersaie26-img="plan"]'), b=modal.querySelector('[data-cersaie26-img="partners"]');
    if(a)a.src='data:image/webp;base64,'+p1.trim(); if(b)b.src='data:image/webp;base64,'+p2.trim();
  }).catch(()=>{});

  const open=()=>{modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('cersaie26-lock')};
  const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('cersaie26-lock')};
  mobile.addEventListener('click',open); desktop.addEventListener('click',open); modal.querySelector('.cersaie26-close').addEventListener('click',close); modal.addEventListener('click',e=>{if(e.target===modal)close()}); document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  modal.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{
    const answer=btn.dataset.answer;
    const subject=encodeURIComponent('CERSAIE 2026 — réponse visiteur : '+answer);
    const body=encodeURIComponent('Bonjour Coryne, bonjour Jérôme,\n\nRéponse depuis le site LE ROY FACTORY : '+answer+' au CERSAIE 2026.\n\nDate : '+new Date().toLocaleString('fr-FR')+'\n\nCordialement');
    location.href='mailto:coryneleroyfactory@gmail.com,jerome@leroyfactory.fr?subject='+subject+'&body='+body;
  }));
})();