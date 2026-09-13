(()=>{
  if(window.__LRF_PWA_INSTALL__)return;window.__LRF_PWA_INSTALL__=true;
  const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='/manifest.webmanifest?v=20260903-logo-fix';document.head.appendChild(manifest);
  const theme=document.createElement('meta');theme.name='theme-color';theme.content='#0b0b0b';document.head.appendChild(theme);
  const apple=document.createElement('meta');apple.name='apple-mobile-web-app-capable';apple.content='yes';document.head.appendChild(apple);
  const appleStatus=document.createElement('meta');appleStatus.name='apple-mobile-web-app-status-bar-style';appleStatus.content='black-translucent';document.head.appendChild(appleStatus);
  const appleTitle=document.createElement('meta');appleTitle.name='apple-mobile-web-app-title';appleTitle.content='Leroy Factory';document.head.appendChild(appleTitle);
  const icon=document.createElement('link');icon.rel='apple-touch-icon';icon.href='/assets/img/logo03lrf.png';document.head.appendChild(icon);

  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js?v=20260903-logo-fix',{updateViaCache:'none'}).then(reg=>reg.update()).catch(console.warn));}

  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(standalone)return;
  let deferredPrompt=null;

  const btn=document.createElement('button');
  btn.id='lrf-install-app';btn.type='button';btn.textContent='📲 Installer l’app';
  btn.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99998;background:#0b0b0b;color:#FFD700;border:1px solid #D4AF37;border-radius:999px;padding:12px 16px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer;display:none;font-family:inherit';
  document.body.appendChild(btn);

  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMobile=/android|iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isIOS){btn.style.display='block';btn.onclick=()=>alert('Sur iPhone : appuyez sur le bouton Partager de Safari, puis « Sur l’écran d’accueil » pour installer Leroy Factory.');}

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(isMobile)btn.style.display='block';});
  btn.addEventListener('click',async()=>{
    if(!deferredPrompt)return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(()=>{});
    deferredPrompt=null;btn.style.display='none';
  });
  window.addEventListener('appinstalled',()=>{btn.style.display='none';deferredPrompt=null;});
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
    row.innerHTML='<div><strong>Pool Surfaces 2026</strong><span>Catalogue piscine ELIOS — 12 collections, format principal 15×15 cm.</span></div><a href="assets/pdf/ELIOS_CATALOGO%20PISCINE_2026.pdf" target="_blank" rel="noopener" class="catalogue-link">PDF</a>';

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
      link.href='assets/pdf/aquahome2026.pdf';
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
    scripts.push(['lrf-uptrend-catalogues-loader','assets/js/uptrend-catalogues.js?v=20260914-pdf1']);
  }else if(path.endsWith('tarifs-pro.html')){
    scripts.push(['lrf-uptrend-tarifs-loader','assets/js/uptrend-tarifs.js?v=20260913-secure3']);
  }else if(path.endsWith('univers.html')){
    scripts.push(['lrf-uptrend-selection-loader','assets/js/uptrend-selection.js?v=20260914-cart1']);
  }
  scripts.forEach(([id,src])=>{
    if(document.getElementById(id))return;
    const script=document.createElement('script');
    script.id=id;
    script.src=src;
    script.defer=true;
    (document.head||document.documentElement).appendChild(script);
  });
})();

/* Routeur de recherche publique LE ROY FACTORY. */
(()=>{
  if(document.getElementById('lrf-global-search-router-loader'))return;
  const script=document.createElement('script');
  script.id='lrf-global-search-router-loader';
  script.src='assets/js/global-search-router.js?v=20260907-search3';
  script.async=false;
  (document.head||document.documentElement).appendChild(script);
})();
