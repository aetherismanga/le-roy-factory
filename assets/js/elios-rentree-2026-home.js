(()=>{
  'use strict';

  const oldModal=document.querySelector('.elios-rentree-modal');
  const oldMobile=document.querySelector('.elios-rentree-mobile');
  const oldDesktop=document.querySelector('.elios-rentree-desktop');
  if(oldModal)oldModal.remove();
  if(oldMobile)oldMobile.remove();
  if(oldDesktop)oldDesktop.remove();

  const style=document.createElement('style');
  style.id='elios-rentree-2026-v2-style';
  style.textContent=`
    @keyframes eliosRentreeSweep{0%,20%{transform:translateX(-38%);opacity:0}48%{opacity:.55}78%,100%{transform:translateX(38%);opacity:0}}
    @keyframes eliosRentreeGlow{0%,100%{box-shadow:0 0 12px rgba(222,181,84,.18),0 12px 30px rgba(0,0,0,.24)}50%{box-shadow:0 0 26px rgba(222,181,84,.34),0 16px 38px rgba(0,0,0,.3)}}
    .elios-rentree-desktop,.elios-rentree-mobile{position:relative;overflow:hidden;text-decoration:none;color:#fff;border:1px solid rgba(232,194,92,.98);isolation:isolate;box-sizing:border-box;background:radial-gradient(circle at 88% 18%,rgba(255,226,142,.15),transparent 30%),linear-gradient(145deg,#54152b,#7a203c 58%,#421021)}
    .elios-rentree-desktop:before,.elios-rentree-mobile:before{content:"";position:absolute;inset:-90% -45%;background:linear-gradient(112deg,transparent 43%,rgba(255,244,205,.23) 49%,transparent 56%);animation:eliosRentreeSweep 8.4s ease-in-out infinite;pointer-events:none}
    .elios-rentree-desktop{position:absolute;right:clamp(28px,6vw,110px);top:43%;z-index:20;width:360px;min-height:142px;padding:20px 24px;border-radius:27px;display:grid;grid-template-columns:1fr 86px;gap:14px;align-items:center;text-align:left;animation:eliosRentreeGlow 4.8s ease-in-out infinite}
    .elios-rentree-copy{position:relative;z-index:2;min-width:0}.elios-rentree-kicker{font-size:.63rem;text-transform:uppercase;letter-spacing:.11em;color:#f5d27b;font-weight:900}.elios-rentree-title{font:800 1.42rem Georgia,serif;line-height:1.02;color:#fff;margin:4px 0 6px}.elios-rentree-sub{font-size:.69rem;line-height:1.3;color:#f7e9ed}.elios-rentree-cta{display:inline-flex;margin-top:7px;padding:6px 10px;border-radius:999px;background:#e5bd53;color:#15120a;font-size:.61rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.elios-rentree-logo{position:relative;z-index:2;height:66px;border-radius:13px;background:#fff;padding:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.18)}.elios-rentree-logo img{max-width:100%;max-height:100%;object-fit:contain}
    .elios-rentree-mobile{display:none;position:relative;z-index:8;width:calc(100% - 18px);min-height:46px;margin:7px auto 0;border-radius:13px;padding:7px 12px;align-items:center;justify-content:space-between;gap:10px;animation:eliosRentreeGlow 5.2s ease-in-out infinite;transition:opacity .16s ease,transform .16s ease,max-height .16s ease,margin .16s ease,padding .16s ease,border-width .16s ease}
    .elios-rentree-mobile strong{position:relative;z-index:2;font:800 .83rem Georgia,serif;color:#ffe08c}.elios-rentree-mobile span{position:relative;z-index:2;font-size:.63rem;font-weight:800;color:#fff;text-align:right}.elios-rentree-mobile b{color:#ffe174}.elios-rentree-mobile.is-hidden{opacity:0;transform:translateY(-8px);pointer-events:none;max-height:0!important;min-height:0!important;margin-top:0!important;margin-bottom:0!important;padding-top:0!important;padding-bottom:0!important;border-width:0!important}
    .elios-rentree-modal{position:fixed!important;inset:0!important;z-index:2147483000!important;display:none!important;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.88);backdrop-filter:blur(8px);width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;transform:none!important}
    .elios-rentree-modal.open{display:flex!important}.elios-rentree-box{position:relative;width:min(1280px,96vw);height:92dvh;overflow:hidden;background:#f7f5f0;border:1px solid rgba(212,175,55,.8);border-radius:21px;box-shadow:0 25px 80px rgba(0,0,0,.78)}
    .elios-rentree-close{position:fixed!important;right:max(14px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:2147483647!important;width:46px;height:46px;border-radius:50%;border:2px solid #e0b94f;background:#111;color:#fff;font-size:1.75rem;line-height:1;cursor:pointer;box-shadow:0 7px 20px rgba(0,0,0,.45);display:grid;place-items:center;padding:0}
    .elios-rentree-frame{display:block;width:100%;height:100%;border:0;background:#f7f5f0}.elios-rentree-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#72541f;font-weight:900;background:#f7f5f0;z-index:1}.elios-rentree-frame.ready+.elios-rentree-loading{display:none}body.elios-rentree-lock{overflow:hidden!important;touch-action:none}
    @media(max-width:1100px) and (min-width:901px){.elios-rentree-desktop{width:300px;min-height:126px;padding:18px 20px;right:28px;top:44%;grid-template-columns:1fr 66px}.elios-rentree-title{font-size:1.23rem}.elios-rentree-sub{font-size:.64rem}.elios-rentree-logo{height:55px}}
    @media(max-width:900px){.elios-rentree-desktop{display:none}.elios-rentree-mobile{display:flex}.elios-rentree-modal{padding:0!important}.elios-rentree-box{width:100vw!important;height:100dvh!important;border:0;border-radius:0}.elios-rentree-close{right:max(10px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));width:48px;height:48px;font-size:1.9rem}}
    @media(max-width:390px){.elios-rentree-mobile{width:calc(100% - 12px);padding:6px 9px;min-height:43px}.elios-rentree-mobile strong{font-size:.75rem}.elios-rentree-mobile span{font-size:.57rem}}
    @media(prefers-reduced-motion:reduce){.elios-rentree-desktop:before,.elios-rentree-mobile:before,.elios-rentree-desktop,.elios-rentree-mobile{animation:none!important}}
  `;
  document.head.appendChild(style);

  const modal=document.createElement('div');
  modal.className='elios-rentree-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="elios-rentree-box" role="dialog" aria-modal="true" aria-label="Promo rentrée Elios R11"><button class="elios-rentree-close" type="button" aria-label="Fermer">×</button><iframe class="elios-rentree-frame" title="Promo rentrée Elios R11" data-src="elios-rentree-r11-2026.html?v=20260904-mobile2" loading="lazy"></iframe><div class="elios-rentree-loading">Chargement de la promo ELIOS…</div></div>';
  document.body.appendChild(modal);
  const frame=modal.querySelector('.elios-rentree-frame');
  const burger=document.querySelector('header .burger-btn');
  let mobileBanner=null;

  const isMenuOpen=()=>!!burger?.classList.contains('active');
  const hideMobileBanner=()=>{if(mobileBanner)mobileBanner.classList.add('is-hidden')};
  const restoreMobileBanner=()=>{if(mobileBanner&&!modal.classList.contains('open')&&!isMenuOpen())mobileBanner.classList.remove('is-hidden')};

  function installPaletteControls(doc){
    const PALETTE_M2=61.92;
    const rows=[...doc.querySelectorAll('#lots-body tr')];
    rows.forEach(row=>{
      if(row.dataset.paletteEnhanced==='1')return;
      row.dataset.paletteEnhanced='1';
      const check=row.querySelector('.lot-check');
      const qtyCell=row.querySelector('.qty');
      const paletteCell=row.querySelector('.palette');
      if(!check||!qtyCell||!paletteCell)return;
      const stockRaw=(qtyCell.textContent||'').replace(/\s/g,'').replace(',','.').replace(/[^0-9.]/g,'');
      const stock=parseFloat(stockRaw)||0;
      const max=Math.max(1,Math.floor((stock+0.0001)/PALETTE_M2));
      const chooser=doc.createElement('div');
      chooser.className='palette-choice';
      chooser.hidden=!check.checked;
      chooser.dataset.max=String(max);
      chooser.innerHTML=`<div class="palette-choice-title">Nombre de palettes</div><div class="palette-stepper"><button type="button" class="palette-minus" aria-label="Retirer une palette">−</button><input class="palette-count" type="number" min="1" max="${max}" step="1" value="1" inputmode="numeric" aria-label="Nombre de palettes"><button type="button" class="palette-plus" aria-label="Ajouter une palette">+</button></div><div class="palette-selected-qty">Quantité choisie : <strong>61,92 m²</strong> · 1 palette</div><div class="palette-max">Maximum disponible : ${max} palette${max>1?'s':''}</div>`;
      paletteCell.appendChild(chooser);
      const input=chooser.querySelector('.palette-count');
      const minus=chooser.querySelector('.palette-minus');
      const plus=chooser.querySelector('.palette-plus');
      const qtyOut=chooser.querySelector('.palette-selected-qty');
      const format=n=>n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
      const refresh=()=>{
        let n=Math.round(Number(input.value)||1);n=Math.min(max,Math.max(1,n));input.value=String(n);row.dataset.selectedPalettes=String(n);row.dataset.selectedM2=(n*PALETTE_M2).toFixed(2);qtyOut.innerHTML=`Quantité choisie : <strong>${format(n*PALETTE_M2)} m²</strong> · ${n} palette${n>1?'s':''}`;
        minus.disabled=n<=1;plus.disabled=n>=max;
      };
      minus.addEventListener('click',()=>{input.value=String((Number(input.value)||1)-1);refresh()});
      plus.addEventListener('click',()=>{input.value=String((Number(input.value)||1)+1);refresh()});
      input.addEventListener('input',refresh);input.addEventListener('change',refresh);
      check.addEventListener('change',()=>{chooser.hidden=!check.checked;if(check.checked)refresh()});
      refresh();
    });
  }

  function injectFrameEnhancements(){
    let doc,win;
    try{doc=frame.contentDocument;win=frame.contentWindow;if(!doc||!win)return}catch(_){return}

    const header=doc.querySelector('header');if(header)header.style.display='none';
    const footer=doc.querySelector('footer');if(footer)footer.style.display='none';
    if(!doc.getElementById('elios-mobile-parent-fixes')){
      const injected=doc.createElement('style');
      injected.id='elios-mobile-parent-fixes';
      injected.textContent=`html,body{background:#f7f5f0!important}body{overflow-x:hidden!important}.hero-inner{min-height:285px!important;padding-top:28px!important;padding-bottom:48px!important}.content{padding-top:12px!important}.palette-choice{margin-top:10px;padding:11px;border:1px solid #d5b96b;border-radius:12px;background:#fffaf0;white-space:normal}.palette-choice[hidden]{display:none!important}.palette-choice-title{font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;font-weight:900;color:#71521b;margin-bottom:7px}.palette-stepper{display:grid;grid-template-columns:44px minmax(72px,1fr) 44px;gap:7px;max-width:210px}.palette-stepper button{height:42px;border:1px solid #b88f3b;border-radius:10px;background:#fff;color:#5b4218;font-size:1.25rem;font-weight:900}.palette-stepper button:disabled{opacity:.35}.palette-count{height:42px;border:1px solid #d0b56f;border-radius:10px;text-align:center;font-weight:900;font-size:1rem;width:100%;background:#fff}.palette-selected-qty{margin-top:8px;color:#433b31;font-size:.78rem}.palette-selected-qty strong{color:#7b5615;font-size:.92rem}.palette-max{margin-top:3px;color:#8b8174;font-size:.67rem}@media(max-width:680px){.hero-inner{padding-top:18px!important;padding-bottom:46px!important}.elios-logo{width:132px!important;height:70px!important}.hero h1{font-size:2.05rem!important}.content{padding-top:8px!important}.palette-choice{margin-top:10px;padding:12px}.palette-stepper{max-width:none;grid-template-columns:52px 1fr 52px}.palette-stepper button,.palette-count{height:46px}.palette-selected-qty{font-size:.82rem}.palette-selected-qty strong{font-size:1rem}}`;
      doc.head.appendChild(injected);
    }

    installPaletteControls(doc);
    const tbody=doc.getElementById('lots-body');
    if(tbody&&!tbody.dataset.paletteObserver){
      tbody.dataset.paletteObserver='1';
      new win.MutationObserver(()=>installPaletteControls(doc)).observe(tbody,{childList:true,subtree:false});
    }

    const selectAll=doc.getElementById('select-all');if(selectAll&&!selectAll.dataset.paletteSync){selectAll.dataset.paletteSync='1';selectAll.addEventListener('click',()=>win.setTimeout(()=>installPaletteControls(doc),0))}
    const clearAll=doc.getElementById('clear-all');if(clearAll&&!clearAll.dataset.paletteSync){clearAll.dataset.paletteSync='1';clearAll.addEventListener('click',()=>win.setTimeout(()=>installPaletteControls(doc),0))}
    const clearBottom=doc.getElementById('clear-bottom');if(clearBottom&&!clearBottom.dataset.paletteSync){clearBottom.dataset.paletteSync='1';clearBottom.addEventListener('click',()=>win.setTimeout(()=>installPaletteControls(doc),0))}

    const request=doc.getElementById('request-btn');
    if(request&&!request.dataset.paletteMail){
      request.dataset.paletteMail='1';
      request.addEventListener('click',e=>{
        const selected=[...doc.querySelectorAll('#lots-body tr')].filter(r=>r.querySelector('.lot-check')?.checked);
        if(!selected.length)return;
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        const lines=selected.map((row,i)=>{
          const product=(row.querySelector('.product strong')?.childNodes?.[0]?.textContent||row.querySelector('.product strong')?.textContent||'Lot ELIOS').trim();
          const ref=(row.querySelector('.product span')?.textContent||'').replace(/^Réf\. Elios\s*:\s*/i,'').trim();
          const format=(row.querySelector('.format')?.textContent||'').trim();
          const stock=(row.querySelector('.qty')?.textContent||'').trim();
          const n=Number(row.dataset.selectedPalettes||1);
          const m2=Number(row.dataset.selectedM2||61.92).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
          return `${i+1}. ${ref} — ${product} — ${format} — ${n} palette${n>1?'s':''} — quantité demandée : ${m2} m² — stock annoncé : ${stock}`;
        }).join('\n');
        const totalPalettes=selected.reduce((s,r)=>s+Number(r.dataset.selectedPalettes||1),0);
        const totalM2=selected.reduce((s,r)=>s+Number(r.dataset.selectedM2||61.92),0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
        const loginMsg=(doc.getElementById('login-msg')?.textContent||'').trim();
        const code=(doc.getElementById('client-code')?.value||'').trim();
        const dep=(doc.getElementById('client-dep')?.value||'').trim();
        const clientInfo=loginMsg||[code,dep&&`département ${dep}`].filter(Boolean).join(' — ')||'Client non identifié sur la page';
        const subject=encodeURIComponent(`Demande disponibilité ELIOS — ${totalPalettes} palette${totalPalettes>1?'s':''}`);
        const body=encodeURIComponent(`Bonjour Coryne, bonjour Jérôme,\n\nJe souhaite connaître la disponibilité des lots ELIOS suivants :\n\n${lines}\n\nTOTAL : ${totalPalettes} palette${totalPalettes>1?'s':''} — ${totalM2} m².\nCondition : palettes complètes uniquement.\n\nClient : ${clientInfo}\n\nMerci.\nCordialement`);
        const href=`mailto:coryne@leroyfactory.fr,jerome@leroyfactory.fr?subject=${subject}&body=${body}`;
        try{const a=document.createElement('a');a.href=href;a.style.display='none';document.body.appendChild(a);a.click();a.remove()}catch(_){location.href=href}
      },true);
    }
  }

  frame.addEventListener('load',()=>{
    frame.classList.add('ready');
    injectFrameEnhancements();
    setTimeout(injectFrameEnhancements,120);
    setTimeout(injectFrameEnhancements,500);
  });

  const ensureFrameLoaded=()=>{if(frame.getAttribute('src'))return;frame.classList.remove('ready');frame.setAttribute('src',frame.dataset.src)};
  const open=e=>{if(e)e.preventDefault();hideMobileBanner();ensureFrameLoaded();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('elios-rentree-lock')};
  const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('elios-rentree-lock');restoreMobileBanner()};
  modal.querySelector('.elios-rentree-close').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='lrf-elios-rentree-close')close()});

  const hero=document.querySelector('.hero-video-section');
  if(hero){
    const desktop=document.createElement('a');desktop.className='elios-rentree-desktop';desktop.href='elios-rentree-r11-2026.html';desktop.setAttribute('aria-label',"Découvrir la promo rentrée Elios R11");desktop.innerHTML='<div class="elios-rentree-copy"><div class="elios-rentree-kicker">Lots 1er choix · R11</div><div class="elios-rentree-title">C\'EST LA RENTRÉE<br>AVEC ELIOS !</div><div class="elios-rentree-sub">30,5×60,5 · palettes complètes · quantités limitées</div><span class="elios-rentree-cta">Voir les lots</span></div><div class="elios-rentree-logo"><img src="assets/img/elios.png" alt="ELIOS Ceramica" loading="lazy" decoding="async"></div>';desktop.addEventListener('click',open);hero.appendChild(desktop);
  }

  const header=document.querySelector('header');
  if(header){
    mobileBanner=document.createElement('a');mobileBanner.className='elios-rentree-mobile';mobileBanner.href='elios-rentree-r11-2026.html';mobileBanner.setAttribute('aria-label',"Découvrir la promo rentrée Elios R11");mobileBanner.innerHTML='<strong>C\'EST LA RENTRÉE AVEC ELIOS !</strong><span>R11 · 1er choix · <b>Voir les lots</b></span>';mobileBanner.addEventListener('click',open);header.appendChild(mobileBanner);
  }

  if(burger){
    burger.addEventListener('click',()=>{
      setTimeout(()=>{
        if(isMenuOpen())hideMobileBanner();else restoreMobileBanner();
      },0);
    });
  }
})();