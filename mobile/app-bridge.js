// Pont natif LE ROY FACTORY pour Capacitor Android.
// Ce fichier est copié dans mobile/www par le script de préparation.

(async()=>{
  const isNative=!!window.Capacitor?.isNativePlatform?.();
  document.documentElement.classList.toggle('lrf-native-app',isNative);
  if(!isNative)return;

  try{
    const [{App},{Network},{StatusBar,Style}]=await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/network'),
      import('@capacitor/status-bar')
    ]);

    await StatusBar.setStyle({style:Style.Dark}).catch(()=>{});

    App.addListener('backButton',({canGoBack})=>{
      if(document.querySelector('.modal-overlay[style*="flex"], .mobile-open, .open')){
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        return;
      }
      if(canGoBack)history.back();
      else App.minimizeApp();
    });

    const applyNetwork=status=>{
      document.body?.classList.toggle('lrf-offline',!status.connected);
      let bar=document.getElementById('lrf-offline-banner');
      if(!status.connected){
        if(!bar){bar=document.createElement('div');bar.id='lrf-offline-banner';bar.textContent='Hors connexion — certaines données peuvent être indisponibles';bar.style.cssText='position:fixed;top:0;left:0;right:0;z-index:200000;background:#B42318;color:#fff;text-align:center;padding:7px 12px;font:700 12px Arial,sans-serif';document.body.appendChild(bar)}
      }else bar?.remove();
    };
    applyNetwork(await Network.getStatus());
    Network.addListener('networkStatusChange',applyNetwork);
  }catch(e){console.warn('Pont natif partiel',e)}
})();
