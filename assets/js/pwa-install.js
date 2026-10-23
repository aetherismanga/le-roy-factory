(()=>{
  if(window.__LRF_PWA_INSTALL__)return;window.__LRF_PWA_INSTALL__=true;
  const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='/manifest.webmanifest?v=20260903-logo-fix';document.head.appendChild(manifest);
  const theme=document.createElement('meta');theme.name='theme-color';theme.content='#0b0b0b';document.head.appendChild(theme);
  const apple=document.createElement('meta');apple.name='apple-mobile-web-app-capable';apple.content='yes';document.head.appendChild(apple);
  const appleStatus=document.createElement('meta');appleStatus.name='apple-mobile-web-app-status-bar-style';appleStatus.content='black-translucent';document.head.appendChild(appleStatus);
  const appleTitle=document.createElement('meta');appleTitle.name='apple-mobile-web-app-title';appleTitle.content='Leroy Factory';document.head.appendChild(appleTitle);
  const icon=document.createElement('link');icon.rel='apple-touch-icon';icon.href='https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/logo03lrf.png';document.head.appendChild(icon);

  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js?v=20260924-catalogues-fallback2',{updateViaCache:'none'}).then(reg=>reg.update()).catch(console.warn));}

  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(standalone)return;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMobile=/android|iphone|ipad|ipod/i.test(navigator.userAgent);
  const isDesktop=!isMobile;
  let deferredPrompt=null,installed=false,helper=null;

  const btn=document.createElement('button');
  btn.id='lrf-install-app';btn.type='button';
  btn.textContent=isDesktop?'↓ Installer l’application':'📲 Installer l’app';
  btn.setAttribute('aria-label','Installer LE ROY FACTORY sur cet appareil');
  btn.title='Installer LE ROY FACTORY';
  // Desktop: deliberately compact and low-profile. Preserve the former mobile button.
  btn.style.cssText=isDesktop
    ?'position:fixed;right:14px;bottom:14px;z-index:9998;display:inline-flex;align-items:center;justify-content:center;gap:5px;max-width:calc(100vw - 28px);min-height:34px;box-sizing:border-box;padding:7px 12px;background:#152620;color:#f5ebca;border:1px solid #b4a57b;border-radius:999px;font:600 12px/1.3 Arial,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.13);cursor:pointer'
    :'position:fixed;right:18px;bottom:18px;z-index:9998;background:#0b0b0b;color:#FFD700;border:1px solid #D4AF37;border-radius:999px;padding:12px 16px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer;display:none;font-family:inherit';
  document.body.appendChild(btn);

  function closeHelp(){helper?.remove();helper=null;}
  function updateVisibility(){
    btn.style.display=!installed&&(isDesktop||isIOS||!!deferredPrompt)?'inline-flex':'none';
    if(installed)closeHelp();
  }
  // Fallback for PC browsers that do not expose the native install prompt.
  function showDesktopHelp(){
    closeHelp();
    helper=document.createElement('section');
    helper.setAttribute('role','status');
    helper.setAttribute('aria-label','Installer LE ROY FACTORY');
    helper.style.cssText='position:fixed;right:14px;bottom:58px;z-index:9999;width:285px;max-width:calc(100vw - 28px);box-sizing:border-box;background:#fffdf7;color:#26342c;border:1px solid #d2cbbb;border-radius:11px;padding:13px 15px;box-shadow:0 10px 28px rgba(0,0,0,.17);font:13px/1.5 Arial,sans-serif';
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Fermer l’aide');
    close.style.cssText='float:right;border:0;background:transparent;color:#26342c;font:20px Arial,sans-serif;cursor:pointer;padding:0 0 5px 8px';
    close.addEventListener('click',closeHelp);
    const message=document.createElement('p');message.style.margin='0';
    const edge=navigator.userAgent.includes('Edg/');
    message.textContent=edge?'Dans Microsoft Edge : menu ⋯ → Applications → Installer ce site en tant qu’application.':'Dans Google Chrome : menu ⋮ → Caster, enregistrer et partager → Installer la page en tant qu’application. Avec Edge : menu ⋯ → Applications.';
    helper.append(close,message);document.body.appendChild(helper);
  }

  if(isIOS){btn.addEventListener('click',()=>alert('Sur iPhone : appuyez sur le bouton Partager de Safari, puis « Sur l’écran d’accueil » pour installer Leroy Factory.'));}
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();deferredPrompt=event;updateVisibility();closeHelp();
  });
  btn.addEventListener('click',async()=>{
    if(isIOS)return;
    if(!deferredPrompt){if(isDesktop)showDesktopHelp();return;}
    const prompt=deferredPrompt;deferredPrompt=null;
    try{
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice?.outcome==='accepted')installed=true;
    }catch(error){if(isDesktop)showDesktopHelp();}
    updateVisibility();
  });
  window.addEventListener('appinstalled',()=>{installed=true;deferredPrompt=null;updateVisibility();});
  updateVisibility();
})();

/* Ajoute le catalogue ELIOS Pool Surfaces 2026 dans la page Catalogues. */
(()=>{
  const path=window.location.pathname.toLowerCase();
  if(!path.endsWith('catalogues.html'))return;

  let tries=0;
  const patch=()=>{
    const grid=document.getElementById('grid-catalogues');
    if(!grid){if(tries++<40)setTimeout(patch,100);return;}

    const cards=[...grid.querySelectorAll('.card-premium')];
    const eliosCard=cards.find(card=>/elios ceramica/i.test(card.querySelector('h3')?.textContent||''));
    if(!eliosCard){if(tries++<40)setTimeout(patch,100);return;}
    if(eliosCard.querySelector('[data-elios-pool-catalogue]'))return;

    const row=document.createElement('div');
    row.className='catalogue-row';
    row.dataset.eliosPoolCatalogue='1';
    row.innerHTML='<div><strong>Pool Surfaces 2026</strong><span>Catalogue piscine ELIOS — 12 collections, format principal 15×15 cm.</span></div><a href="https://firebasestorage.googleapis.com/v0/b/le-roy-factory.firebasestorage.app/o/public-site-assets%2Fle-roy-factory%2F85d5f6bd3f78%2Fassets%2Fpdf%2FELIOS_Pool_Surfaces_2026_INTERACTIF.pdf?alt=media&token=690214a6-9929-41a9-af87-f82e1fb8c2bf" target="_blank" rel="noopener" class="catalogue-link">PDF</a>';

    const menu=eliosCard.querySelector('.catalogue-menu');
    if(menu){
      menu.appendChild(row);
      const count=eliosCard.querySelector('.catalogue-picker summary span');
      if(count)count.textContent=String(menu.querySelectorAll('.catalogue-row').length);
    }else{
      const holder=eliosCard.querySelector(':scope > div:last-child')||eliosCard;
      holder.appendChild(row);
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(patch,0),{once:true});
  else setTimeout(patch,0);
})();

/* Relie Aquahome au catalogue PDF 2026 présent dans le dépôt. */
(()=>{
  const path=window.location.pathname.toLowerCase();
  if(!path.endsWith('catalogues.html'))return;

  let tries=0;
  const patchAquahome=()=>{
    const grid=document.getElementById('grid-catalogues');
    if(!grid){if(tries++<50)setTimeout(patchAquahome,100);return;}

    const cards=[...grid.querySelectorAll('.card-premium')];
    const card=cards.find(item=>/^aquahome$/i.test((item.querySelector('h3')?.textContent||'').trim()));
    if(!card){if(tries++<50)setTimeout(patchAquahome,100);return;}

    const rows=[...card.querySelectorAll('.catalogue-row')];
    const row=rows.find(item=>/catalogue robinetterie/i.test(item.querySelector('strong')?.textContent||''))||rows[0];
    if(!row)return;

    const title=row.querySelector('strong');
    const desc=row.querySelector('span');
    const link=row.querySelector('a.catalogue-link, a');
    if(title)title.textContent='Catalogue Aquahome 2026';
    if(desc)desc.textContent='Catalogue officiel Aquahome 2026 — robinetterie.';
    if(link){
      link.href='https://firebasestorage.googleapis.com/v0/b/le-roy-factory.firebasestorage.app/o/public-site-assets%2Fle-roy-factory%2F85d5f6bd3f78%2Fassets%2Fpdf%2Faquahome2026.pdf?alt=media&token=70b1b113-0f0e-4cec-ad43-ddb81021590c';
      link.target='_blank';
      link.rel='noopener';
      link.textContent='PDF';
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(patchAquahome,0),{once:true});
  else setTimeout(patchAquahome,0);
})();

/* Intégration UPTREND : catalogues, tarifs PRO et sanitaire. Reitano est intégré directement aux pages concernées. */
(()=>{
  const path=window.location.pathname.toLowerCase();
  const scripts=[];
  if(path.endsWith('catalogues.html')){
    scripts.push(['lrf-catalogues-renderer-loader','assets/js/catalogues-renderer.js?v=20260924-fallback2&media=20261018']);
    scripts.push(['lrf-uptrend-catalogues-loader','assets/js/uptrend-catalogues.js?v=20260924-fallback2&media=20261018']);
  }else if(path.endsWith('tarifs-pro.html')){
    scripts.push(['lrf-uptrend-tarifs-loader','assets/js/uptrend-tarifs.js?v=20260913-secure3&media=20261018']);
  }else if(path.endsWith('univers.html')){
    scripts.push(['lrf-uptrend-selection-loader','assets/js/uptrend-selection.js?v=20260914-cart1&media=20261018']);
    scripts.push(['lrf-aquahome-selection-loader','assets/js/aquahome-selection.js?v=20260914-2&media=20261018']);
    scripts.push(['lrf-reitano-selection-loader','assets/js/reitano-selection.js?v=20260914-1&media=20261018']);
  }
  scripts.forEach(([id,src])=>{
    if(document.getElementById(id))return;
    const script=document.createElement('script');
    script.id=id;
    script.src=src;
    script.async=false;
    script.defer=true;
    (document.head||document.documentElement).appendChild(script);
  });
})();

/* Routeur de recherche publique LE ROY FACTORY. */
(()=>{
  if(document.getElementById('lrf-global-search-router-loader'))return;
  const script=document.createElement('script');
  script.id='lrf-global-search-router-loader';
  script.src='assets/js/global-search-router.js?v=20261023-crm-audit1';
  script.async=false;
  (document.head||document.documentElement).appendChild(script);
})();
