// Pont natif minimal LE ROY FACTORY pour Capacitor Android.
// L'application conserve exactement l'interface du site web et du CRM.
// Ce fichier ajoute uniquement les capacités natives utiles (GPS, bouton retour, réseau).

(async()=>{
  const isNative=!!window.Capacitor?.isNativePlatform?.();
  document.documentElement.classList.toggle('lrf-native-app',isNative);
  if(!isNative)return;

  // Dans l'application native, le contenu vient directement de l'APK.
  // On supprime les anciens service workers/caches PWA qui pourraient conserver
  // une ancienne version de firebase.js après une mise à jour Android.
  try{
    if('serviceWorker' in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r=>r.unregister().catch(()=>false)));
    }
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(key=>caches.delete(key)));
    }
  }catch(e){console.warn('Nettoyage cache Android',e)}

  try{
    const [{App},{Network},{StatusBar,Style},{Geolocation}]=await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/network'),
      import('@capacitor/status-bar'),
      import('@capacitor/geolocation')
    ]);

    await StatusBar.setStyle({style:Style.Dark}).catch(()=>{});

    // Géolocalisation Android native utilisée par les pages Carte / Clients / Tournées.
    const nativeGetPosition=async(success,error,options={})=>{
      try{
        let perm=await Geolocation.checkPermissions();
        if(perm.location!=='granted'&&perm.coarseLocation!=='granted'){
          perm=await Geolocation.requestPermissions();
        }
        if(perm.location!=='granted'&&perm.coarseLocation!=='granted'){
          throw new Error('Permission de localisation refusée');
        }
        const p=await Geolocation.getCurrentPosition({
          enableHighAccuracy:options.enableHighAccuracy!==false,
          timeout:options.timeout||15000,
          maximumAge:options.maximumAge||10000
        });
        success?.({
          coords:{
            latitude:p.coords.latitude,
            longitude:p.coords.longitude,
            accuracy:p.coords.accuracy,
            altitude:p.coords.altitude,
            heading:p.coords.heading,
            speed:p.coords.speed
          },
          timestamp:p.timestamp
        });
      }catch(e){
        console.error('GPS Android',e);
        error?.({code:1,message:e?.message||'Localisation indisponible'});
      }
    };

    try{navigator.geolocation.getCurrentPosition=nativeGetPosition;}catch(_){ }
    window.__lrfNativeGetPosition=nativeGetPosition;

    // Bouton retour Android : ferme d'abord les fenêtres/menu, puis revient à la page précédente.
    App.addListener('backButton',({canGoBack})=>{
      const visibleModal=[...document.querySelectorAll('.crm-modal,.modal-overlay,.realisation-lightbox')]
        .find(el=>{
          const s=getComputedStyle(el);
          return s.display!=='none'&&s.visibility!=='hidden'&&el.getAttribute('aria-hidden')!=='true';
        });
      if(visibleModal){
        visibleModal.querySelector('.modal-close,.realisation-lightbox-close,[id*="close"]')?.click();
        return;
      }

      const openMenu=document.querySelector('.crm-sidebar.mobile-open,.crm-sidebar.open,.mobile-open,.crm-menu-open');
      if(openMenu){
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        document.getElementById('crm-mobile-menu-btn')?.click();
        return;
      }

      if(canGoBack)history.back();
      else App.minimizeApp();
    });

    const applyNetwork=status=>{
      document.body?.classList.toggle('lrf-offline',!status.connected);
      let bar=document.getElementById('lrf-offline-banner');
      if(!status.connected){
        if(!bar){
          bar=document.createElement('div');
          bar.id='lrf-offline-banner';
          bar.textContent='Hors connexion — certaines données peuvent être indisponibles';
          bar.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#B42318;color:#fff;text-align:center;padding:7px 12px;font:700 12px Arial,sans-serif';
          document.body.appendChild(bar);
        }
      }else bar?.remove();
    };

    applyNetwork(await Network.getStatus());
    Network.addListener('networkStatusChange',applyNetwork);
  }catch(e){
    console.warn('Pont natif partiel',e);
  }
})();
