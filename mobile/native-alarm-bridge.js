// Alarme système Android pour LE ROY FACTORY.
// Ce fichier est bundlé par mobile/scripts/sync-web.mjs.
(async()=>{
  const isNative=!!window.Capacitor?.isNativePlatform?.();
  if(!isNative)return;
  try{
    const {LocalNotifications}=await import('@capacitor/local-notifications');
    const ALARM_ID=26090301;

    async function ensureNotificationPermission(){
      let p=await LocalNotifications.checkPermissions();
      if(p.display!=='granted')p=await LocalNotifications.requestPermissions();
      return p.display==='granted';
    }

    async function ensureExactPermission(){
      try{
        let s=await LocalNotifications.checkExactNotificationSetting();
        if(s.exact_alarm==='granted')return true;
        await LocalNotifications.changeExactNotificationSetting();
        s=await LocalNotifications.checkExactNotificationSetting().catch(()=>s);
        return s.exact_alarm==='granted';
      }catch(error){
        // Android < 12 ou plateforme ne nécessitant pas ce réglage.
        console.warn('Réglage alarme exacte indisponible',error);
        return true;
      }
    }

    async function cancel(){
      await LocalNotifications.cancel({notifications:[{id:ALARM_ID}]}).catch(()=>{});
      return {cancelled:true};
    }

    async function schedule({at,label}={}){
      const when=new Date(Number(at));
      if(Number.isNaN(when.getTime())||when.getTime()<=Date.now())throw new Error('Heure d’alarme invalide');
      if(!await ensureNotificationPermission())return {scheduled:false,needsNotificationPermission:true};
      if(!await ensureExactPermission())return {scheduled:false,needsExactPermission:true};
      await cancel();
      await LocalNotifications.schedule({notifications:[{
        id:ALARM_ID,
        title:'⏰ Alarme LE ROY FACTORY',
        body:label||'Votre alarme programmée se déclenche maintenant.',
        schedule:{at:when,allowWhileIdle:true},
        autoCancel:true,
        ongoing:false,
        extra:{lrfAlarm:true,triggerAt:when.getTime()}
      }]});
      return {scheduled:true,triggerAt:when.getTime()};
    }

    async function status(){
      const pending=await LocalNotifications.getPending();
      const alarm=(pending.notifications||[]).find(n=>Number(n.id)===ALARM_ID);
      if(!alarm)return {scheduled:false};
      let triggerAt=Number(alarm.extra?.triggerAt)||0;
      if(!triggerAt&&alarm.schedule?.at)triggerAt=new Date(alarm.schedule.at).getTime();
      return {scheduled:true,triggerAt:triggerAt||null};
    }

    window.__lrfNativeAlarm={available:true,schedule,cancel,status};
    document.dispatchEvent(new CustomEvent('lrf-native-alarm-ready'));
  }catch(error){
    console.error('Alarme Android native indisponible',error);
    window.__lrfNativeAlarm={available:false,error:String(error?.message||error)};
    document.dispatchEvent(new CustomEvent('lrf-native-alarm-ready'));
  }
})();
