(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!native||page!=='agenda.html')return;

  const style=document.createElement('style');
  style.textContent=`
    #lrf-google-native-note{display:none!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .google-sync-status{padding:.55rem .7rem!important;gap:.55rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #sync-text{font-size:.82rem!important;font-weight:800!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #sync-icon{font-size:1rem!important}
  `;
  document.head.appendChild(style);

  function clean(){
    document.getElementById('lrf-google-native-note')?.remove();
    const txt=document.getElementById('sync-text');
    const icon=document.getElementById('sync-icon');
    const btn=document.getElementById('btn-auth-google');
    const box=document.querySelector('.google-sync-status');
    const tip=document.getElementById('lrf-agenda-tip');

    if(tip) tip.textContent='Touchez un jour ou une heure pour ajouter une note ou un RDV. Rappel à 8h la veille.';
    if(!txt)return;

    const value=(txt.textContent||'').toLowerCase();
    const connected=value.includes('connecté')&&!value.includes('non connecté')&&!value.includes('impossible');
    const loading=value.includes('connexion');

    if(connected){
      txt.textContent='Google Calendar : Connectée';
      if(icon) icon.textContent='🟢';
      if(btn) btn.textContent='Actualiser';
      if(box){box.style.borderColor='#10B981';box.style.background='#F0FDF4'}
    }else if(loading){
      if(icon) icon.textContent='🟡';
    }else{
      if(icon) icon.textContent='🔴';
      if(btn) btn.textContent='Se connecter';
    }
  }

  clean();
  const obs=new MutationObserver(clean);
  obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  setInterval(clean,1200);
})();
