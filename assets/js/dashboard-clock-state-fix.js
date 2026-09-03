(()=>{
  'use strict';
  if(window.__LRF_CLOCK_STATE_FIX__)return;
  window.__LRF_CLOCK_STATE_FIX__=true;

  const ACTIVE='is-active';
  const $=id=>document.getElementById(id);
  let suppressNativeCancel=false;

  function installCss(){
    if(document.getElementById('lrf-clock-state-fix-css'))return;
    const style=document.createElement('style');
    style.id='lrf-clock-state-fix-css';
    style.textContent=`
      html body.crm-body :is(#lrf-alarm-set,#lrf-sw-start,#lrf-timer-start){
        background:linear-gradient(180deg,#fffefb,#f7f1e7)!important;
        border-color:#d7c8ae!important;
        color:#393229!important;
        box-shadow:inset 0 1px 0 #fff,0 3px 8px rgba(70,48,20,.08)!important;
      }
      html body.crm-body :is(#lrf-alarm-set,#lrf-sw-start,#lrf-timer-start):hover{
        background:linear-gradient(180deg,#fff9e8,#f6e5b9)!important;
        border-color:#d6a633!important;
        box-shadow:inset 0 1px 0 #fff,0 6px 14px rgba(151,101,13,.14)!important;
      }
      html body.crm-body :is(#lrf-alarm-set,#lrf-sw-start,#lrf-timer-start).${ACTIVE}{
        background:linear-gradient(180deg,#ffdd77,#e2aa2d)!important;
        border-color:#b47b0d!important;
        color:#2a1b05!important;
        box-shadow:inset 0 1px 0 #fff4c8,0 5px 14px rgba(124,80,0,.20)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function setActive(id,on){$(id)?.classList.toggle(ACTIVE,!!on)}

  function targetFromInput(){
    const value=$('lrf-alarm-time')?.value;
    if(!value)return null;
    const [h,m]=value.split(':').map(Number);
    const now=new Date(),target=new Date(now);
    target.setHours(h,m,0,0);
    if(target<=now)target.setDate(target.getDate()+1);
    return target;
  }

  function updateNote(){
    const note=document.querySelector('[data-panel="alarm"] .lrf-tool-note');
    if(!note)return;
    if(window.__lrfNativeAlarm?.available){
      note.textContent='Application Android : l’alarme est programmée par le téléphone et peut se déclencher écran verrouillé ou application fermée. Le son système Android est utilisé en arrière-plan.';
    }else{
      note.textContent='Navigateur : l’alarme sonore nécessite que le CRM reste ouvert. Pour une alarme écran verrouillé / application fermée, utilise l’application Android LE ROY FACTORY.';
    }
  }

  async function restoreNativeAlarm(){
    if(!window.__lrfNativeAlarm?.available)return;
    try{
      const pending=await window.__lrfNativeAlarm.status();
      if(!pending?.scheduled)return;
      setActive('lrf-alarm-set',true);
      const status=$('lrf-alarm-status');
      const trigger=pending.triggerAt?new Date(pending.triggerAt):null;
      if(status&&trigger&&!Number.isNaN(trigger.getTime())){
        status.textContent=`Alarme Android active pour ${trigger.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} — même application fermée.`;
      }
    }catch(e){console.warn('Restauration alarme Android',e)}
  }

  function syncAlarmButton(){
    const text=$('lrf-alarm-status')?.textContent||'';
    setActive('lrf-alarm-set',/réglée|active pour/i.test(text));
  }

  function watchUi(){
    installCss();updateNote();syncAlarmButton();
    const status=$('lrf-alarm-status');
    if(status&&!status.dataset.lrfStateWatched){
      status.dataset.lrfStateWatched='1';
      new MutationObserver(syncAlarmButton).observe(status,{childList:true,subtree:true,characterData:true});
    }
  }

  // Une fois l'alarme Android programmée, on supprime le setTimeout du navigateur
  // afin de ne pas entendre deux sonneries si le CRM est encore ouvert.
  function clearWebAlarmOnly(){
    const cancel=$('lrf-alarm-cancel');
    if(!cancel)return;
    suppressNativeCancel=true;
    try{cancel.click();}finally{suppressNativeCancel=false;}
  }

  document.addEventListener('click',async e=>{
    if(e.target.closest('#lrf-alarm-set')){
      setTimeout(syncAlarmButton,0);
      const target=targetFromInput();
      if(target&&window.__lrfNativeAlarm?.available){
        const status=$('lrf-alarm-status');
        try{
          const result=await window.__lrfNativeAlarm.schedule({at:target.getTime(),label:`Alarme ${target.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`});
          if(result?.scheduled){
            clearWebAlarmOnly();
            setActive('lrf-alarm-set',true);
            if(status)status.textContent=`Alarme Android active pour ${target.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} — même application fermée.`;
          }else if(result?.needsExactPermission){
            if(status)status.textContent='Autorise « Alarmes et rappels » dans Android, puis appuie à nouveau sur Activer l’alarme.';
          }else if(result?.needsNotificationPermission){
            if(status)status.textContent='Autorise les notifications LE ROY FACTORY, puis appuie à nouveau sur Activer l’alarme.';
          }
        }catch(err){
          console.error('Programmation alarme Android',err);
          if(status)status.textContent=`Alarme web active, mais programmation Android impossible : ${err?.message||'erreur inconnue'}`;
        }
      }
      return;
    }
    if(e.target.closest('#lrf-alarm-cancel')){
      if(suppressNativeCancel)return;
      setActive('lrf-alarm-set',false);
      if(window.__lrfNativeAlarm?.available)window.__lrfNativeAlarm.cancel().catch(err=>console.warn('Annulation alarme Android',err));
      return;
    }
    if(e.target.closest('#lrf-sw-start')){setActive('lrf-sw-start',true);return;}
    if(e.target.closest('#lrf-sw-pause')||e.target.closest('#lrf-sw-reset')){setActive('lrf-sw-start',false);return;}
    if(e.target.closest('#lrf-timer-start')){setActive('lrf-timer-start',true);return;}
    if(e.target.closest('#lrf-timer-pause')||e.target.closest('#lrf-timer-reset')){setActive('lrf-timer-start',false);return;}
  });

  setInterval(()=>{
    watchUi();
    if($('lrf-timer-start')?.classList.contains(ACTIVE)&&$('lrf-timer-display')?.textContent?.trim()==='00:00:00')setActive('lrf-timer-start',false);
  },500);
  document.addEventListener('lrf-native-alarm-ready',()=>{updateNote();restoreNativeAlarm();});
  setTimeout(()=>{watchUi();restoreNativeAlarm();},350);
  setTimeout(()=>{watchUi();restoreNativeAlarm();},1400);
})();