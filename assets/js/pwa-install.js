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