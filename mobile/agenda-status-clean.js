(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!native||page!=='agenda.html')return;

  // Compatibilité avec une ancienne version déjà copiée dans l'app.
  // Aucun MutationObserver : le statut Google est géré directement
  // par agenda-mobile-pro.js afin d'éviter toute boucle de rendu.
  const style=document.createElement('style');
  style.textContent=`
    #lrf-google-native-note,#lrf-agenda-tip{display:none!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .agenda-toolbar{margin:0 0 .35rem!important;gap:.25rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .google-sync-status{padding:.38rem .5rem!important;gap:.42rem!important;min-height:42px!important;border-radius:10px!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #sync-text{font-size:.76rem!important;font-weight:800!important;line-height:1.05!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #sync-icon{font-size:.88rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #btn-auth-google{padding:.35rem .55rem!important;font-size:.7rem!important}
  `;
  document.head.appendChild(style);

  document.getElementById('lrf-google-native-note')?.remove();
  document.getElementById('lrf-agenda-tip')?.remove();
})();
