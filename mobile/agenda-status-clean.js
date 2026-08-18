(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!native||page!=='agenda.html')return;

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

  function clean(){
    document.getElementById('lrf-google-native-note')?.remove();
    document.getElementById('lrf-agenda-tip')?.remove();
    const txt=document.getElementById('sync-text');
    const icon=document.getElementById('sync-icon');
    const btn=document.getElementById('btn-auth-google');
    const box=document.querySelector('.google-sync-status');
    if(!txt)return;

    const value=(txt.textContent||'').toLowerCase();
    const connected=value.includes('connecté')&&!value.includes('non connecté')&&!value.includes('impossible');
    const loading=value.includes('connexion');
    if(connected){
      txt.textContent='Google Calendar : Connectée';
      if(icon)icon.textContent='🟢';
      if(btn)btn.textContent='Actualiser';
      if(box){box.style.borderColor='#10B981';box.style.background='#F0FDF4'}
    }else if(loading){
      if(icon)icon.textContent='🟡';
    }else{
      if(icon)icon.textContent='🔴';
      if(btn)btn.textContent='Se connecter';
    }
  }

  clean();
  new MutationObserver(clean).observe(document.body,{subtree:true,childList:true,characterData:true});
})();
