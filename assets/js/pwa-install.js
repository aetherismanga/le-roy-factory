(()=>{
  if(window.__LRF_PWA_INSTALL__)return;window.__LRF_PWA_INSTALL__=true;
  const VERSION='20260915-brand-final6';
  const ua=navigator.userAgent||'';
  const isIOS=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isMobile=/android|iphone|ipad|ipod/i.test(ua)||isIOS;

  const ensureHead=()=>{
    let manifest=document.querySelector('link[rel="manifest"]');
    if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';document.head.appendChild(manifest);}
    manifest.href='/manifest.webmanifest?v='+VERSION;

    let theme=document.querySelector('meta[name="theme-color"]');
    if(!theme){theme=document.createElement('meta');theme.name='theme-color';document.head.appendChild(theme);}
    theme.content='#0b0b0b';

    const metas={
      'apple-mobile-web-app-capable':'yes',
      'mobile-web-app-capable':'yes',
      'apple-mobile-web-app-status-bar-style':'black-translucent',
      'apple-mobile-web-app-title':'LE ROY FACTORY'
    };
    Object.entries(metas).forEach(([name,content])=>{
      let meta=document.querySelector(`meta[name="${name}"]`);
      if(!meta){meta=document.createElement('meta');meta.name=name;document.head.appendChild(meta);}
      meta.content=content;
    });

    let apple=document.querySelector('link[rel="apple-touch-icon"]');
    if(!apple){apple=document.createElement('link');apple.rel='apple-touch-icon';document.head.appendChild(apple);}
    apple.href='/apple-touch-icon.png?v='+VERSION;

    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';icon.type='image/png';document.head.appendChild(icon);}
    icon.href='/assets/icons/lrf-192.png?v='+VERSION;
  };
  ensureHead();

  const clearLegacyCaches=async()=>{
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>/^lrf-pwa-/i.test(k)).map(k=>caches.delete(k)));
      }
    }catch(e){console.warn('Nettoyage cache LRF',e)}
  };

  // Sur iPhone/iPad, le site installé sur l'écran d'accueil reste plus fiable sans
  // service worker persistant : Safari peut conserver un ancien shell après mise à jour.
  // On supprime donc les anciens SW/caches iOS et on laisse le site fonctionner en réseau direct.
  if(isIOS){
    (async()=>{
      try{
        if('serviceWorker' in navigator){
          const regs=await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r=>r.unregister().catch(()=>false)));
        }
        await clearLegacyCaches();
        if(navigator.serviceWorker?.controller&&!sessionStorage.getItem('lrf-ios-sw-reset-'+VERSION)){
          sessionStorage.setItem('lrf-ios-sw-reset-'+VERSION,'1');
          setTimeout(()=>location.reload(),80);
        }
      }catch(e){console.warn('Réinitialisation PWA iOS',e)}
    })();
  }else if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js?v='+VERSION,{updateViaCache:'none'})
      .then(async reg=>{await reg.update().catch(()=>{});})
      .catch(console.warn));
  }

  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(standalone)return;
  let deferredPrompt=null;

  const btn=document.createElement('button');
  btn.id='lrf-install-app';btn.type='button';btn.textContent='📲 Installer l’app';
  btn.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99998;background:#0b0b0b;color:#FFD700;border:1px solid #D4AF37;border-radius:999px;padding:12px 16px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer;display:none;font-family:inherit';
  document.body.appendChild(btn);

  if(isIOS){
    btn.style.display='block';
    btn.onclick=()=>alert('Sur iPhone ou iPad : ouvrez le site dans Safari, appuyez sur Partager, puis « Sur l’écran d’accueil ».');
  }

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
    scripts.push(['lrf-aquahome-selection-loader','assets/js/aquahome-selection.js?v=20260914-2']);
    scripts.push(['lrf-reitano-selection-loader','assets/js/reitano-selection.js?v=20260914-1']);
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
