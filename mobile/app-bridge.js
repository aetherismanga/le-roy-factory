// Pont natif LE ROY FACTORY pour Capacitor Android.
// Ce fichier est copié dans mobile/www par le script de préparation.

(async()=>{
  const isNative=!!window.Capacitor?.isNativePlatform?.();
  document.documentElement.classList.toggle('lrf-native-app',isNative);
  if(!isNative)return;

  const page=(location.pathname.split('/').pop()||'').toLowerCase();

  const style=document.createElement('style');
  style.id='lrf-native-pro-style';
  style.textContent=`
    html.lrf-native-app,html.lrf-native-app body{overscroll-behavior-y:none}
    html.lrf-native-app body.crm-body{padding-bottom:92px!important}
    html.lrf-native-app body.crm-body .crm-main-content{padding-top:76px!important;padding-left:12px!important;padding-right:12px!important}

    /* Accueil : orienté actions terrain */
    html.lrf-native-app .comdash{gap:.8rem!important}
    html.lrf-native-app .dash-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:.65rem!important;order:-2}
    html.lrf-native-app .dash-actions .dash-action{min-height:68px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;padding:.8rem!important;border-radius:14px!important;background:#111!important;color:#FFD700!important;border:1px solid #D4AF37!important;font-size:.9rem!important;box-shadow:0 6px 18px rgba(0,0,0,.09)!important}
    html.lrf-native-app .dash-actions .dash-action.lrf-main-action{grid-column:1/-1;min-height:82px!important;font-size:1.12rem!important;background:linear-gradient(135deg,#111,#25200d)!important;border-width:2px!important}
    html.lrf-native-app .dash-alert{order:-1;margin:0!important;font-size:.78rem!important}
    html.lrf-native-app .dash-kpis{grid-template-columns:1fr 1fr!important;gap:.6rem!important}
    html.lrf-native-app .dash-kpis .dash-card{padding:.8rem!important;min-height:92px!important}
    html.lrf-native-app .dash-kpi-value{font-size:1.55rem!important}
    html.lrf-native-app .dash-kpi-sub{font-size:.7rem!important}
    html.lrf-native-app .dash-grid{grid-template-columns:1fr!important;gap:.75rem!important}
    html.lrf-native-app .dash-card{padding:.9rem!important;border-radius:14px!important}

    /* Fiche client : vrai plein écran scrollable */
    html.lrf-native-app body.lrf-client-modal-open{overflow:hidden!important}
    html.lrf-native-app body.lrf-client-modal-open #crm-mobile-menu-btn{display:none!important}
    html.lrf-native-app body.lrf-client-modal-open #lrf-mobile-fab{display:none!important}
    html.lrf-native-app .crm-modal,
    html.lrf-native-app .modal-overlay{padding:0!important;align-items:stretch!important;overflow:hidden!important}
    html.lrf-native-app .crm-modal .modal-content,
    html.lrf-native-app .modal-overlay .modal-content{width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border-radius:0!important;border-left:0!important;border-right:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;padding:18px 14px 150px!important;box-sizing:border-box!important;-webkit-overflow-scrolling:touch!important}
    html.lrf-native-app .crm-modal .modal-header,
    html.lrf-native-app .modal-overlay .modal-header{position:relative!important;min-height:auto!important;padding-top:6px!important}
    html.lrf-native-app .crm-modal .modal-close,
    html.lrf-native-app .modal-overlay .modal-close{position:sticky!important;top:0!important;float:right!important;z-index:20!important;width:48px!important;height:48px!important;border-radius:50%!important;background:#f2f2f2!important}
    html.lrf-native-app .crm-modal .modal-footer,
    html.lrf-native-app .modal-overlay .modal-footer{position:sticky!important;bottom:-135px!important;z-index:12!important;background:rgba(251,249,245,.97)!important;backdrop-filter:blur(8px)!important;padding:10px 0 max(10px,env(safe-area-inset-bottom))!important}
    html.lrf-native-app .modal-grid-edit{grid-template-columns:1fr!important}
    html.lrf-native-app .modal-grid-edit .full-width{grid-column:1!important}

    /* Agenda mobile : liste lisible, commandes compactes */
    html.lrf-native-app body[data-lrf-page="agenda"] .agenda-card{min-height:0!important;padding:.75rem!important;border-radius:14px!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .agenda-toolbar{display:grid!important;grid-template-columns:1fr!important;gap:.6rem!important;margin-bottom:.8rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #btn-new-event{width:100%!important;min-height:52px!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .google-sync-status{width:100%!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:auto 1fr auto!important;padding:.65rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc .fc-toolbar{display:grid!important;grid-template-columns:1fr!important;gap:.65rem!important;margin-bottom:.7rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc .fc-toolbar-chunk{display:flex!important;justify-content:center!important;flex-wrap:wrap!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc .fc-toolbar-title{font-size:1.05rem!important;text-align:center!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc .fc-button{padding:.55rem .65rem!important;font-size:.78rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-list{border:0!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-list-day-cushion{background:#f6f1df!important;padding:.55rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-list-event td{padding:.65rem .45rem!important}

    /* Carte : dialogues et barre d'actions plus nets */
    html.lrf-native-app body[data-lrf-page="carte"] .map-mobile-toolbar{overflow-x:auto!important;scrollbar-width:none!important}
    html.lrf-native-app body[data-lrf-page="carte"] .map-mobile-toolbar::-webkit-scrollbar{display:none!important}
  `;
  document.head.appendChild(style);
  document.body.dataset.lrfPage=page.replace('.html','');

  try{
    const [{App},{Network},{StatusBar,Style},{Geolocation}]=await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/network'),
      import('@capacitor/status-bar'),
      import('@capacitor/geolocation')
    ]);

    await StatusBar.setStyle({style:Style.Dark}).catch(()=>{});

    // Géolocalisation native Android : remplace l'appel navigateur du CRM.
    const nativeGetPosition=async(success,error,options={})=>{
      try{
        let perm=await Geolocation.checkPermissions();
        if(perm.location!=='granted'&&perm.coarseLocation!=='granted')perm=await Geolocation.requestPermissions();
        if(perm.location!=='granted'&&perm.coarseLocation!=='granted')throw new Error('Permission de localisation refusée');
        const p=await Geolocation.getCurrentPosition({
          enableHighAccuracy:options.enableHighAccuracy!==false,
          timeout:options.timeout||15000,
          maximumAge:options.maximumAge||10000
        });
        success?.({coords:{latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,altitude:p.coords.altitude,heading:p.coords.heading,speed:p.coords.speed},timestamp:p.timestamp});
      }catch(e){
        console.error('GPS Android',e);
        error?.({code:1,message:e?.message||'Localisation indisponible'});
      }
    };
    try{
      navigator.geolocation.getCurrentPosition=nativeGetPosition;
    }catch(e){console.warn('Remplacement geolocation impossible',e)}
    window.__lrfNativeGetPosition=nativeGetPosition;

    App.addListener('backButton',({canGoBack})=>{
      const visibleModal=[...document.querySelectorAll('.crm-modal,.modal-overlay')].find(x=>getComputedStyle(x).display!=='none');
      if(visibleModal){
        visibleModal.querySelector('.modal-close,[id*="close"],.lrf-near-close')?.click();
        return;
      }
      if(document.querySelector('.mobile-open,.open')){
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        return;
      }
      if(canGoBack)history.back(); else App.minimizeApp();
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

  function enhanceDashboard(){
    const actions=document.querySelector('.dash-actions');
    if(!actions||actions.dataset.lrfNative)return false;
    actions.dataset.lrfNative='1';
    actions.innerHTML=`
      <a class="dash-action lrf-main-action" href="clients.html">👥 Liste clients</a>
      <a class="dash-action" href="comptes-rendus.html">📝 Compte-rendu</a>
      <a class="dash-action" href="agenda.html">📅 Agenda</a>
      <a class="dash-action" href="carte.html">🗺️ Carte / Autour de moi</a>
      <a class="dash-action" href="mails-groupes.html">✉️ Mails groupés</a>
      <a class="dash-action" href="statistiques.html">📊 Statistiques</a>`;
    return true;
  }

  function watchModals(){
    const update=()=>{
      const open=[...document.querySelectorAll('.crm-modal,.modal-overlay')].some(el=>{
        const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';
      });
      document.body.classList.toggle('lrf-client-modal-open',open&&page==='clients.html');
    };
    new MutationObserver(update).observe(document.body,{attributes:true,subtree:true,attributeFilter:['style','class']});
    document.addEventListener('click',()=>setTimeout(update,30),true);
    update();
  }

  if(page==='dashboard.html'){
    let tries=0;const t=setInterval(()=>{tries++;if(enhanceDashboard()||tries>50)clearInterval(t)},100);
  }
  if(page==='clients.html')watchModals();
})();
