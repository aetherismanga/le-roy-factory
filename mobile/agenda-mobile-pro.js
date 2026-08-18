import { LocalNotifications } from '@capacitor/local-notifications';

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!native||page!=='agenda.html')return;

  const COLORS=['#111111','#D4AF37','#047857','#1D4ED8','#DC2626','#D97706','#7C3AED'];
  const STORAGE='lrfAgendaLocalEvents';

  const css=document.createElement('style');
  css.textContent=`
    html.lrf-native-app body[data-lrf-page="agenda"] .crm-topbar{margin-bottom:.6rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .agenda-card{padding:.65rem!important;min-height:0!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .agenda-toolbar{gap:.55rem!important;margin-bottom:.65rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #btn-new-event{display:none!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .google-sync-status{font-size:.78rem!important;padding:.55rem .6rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-toolbar{gap:.45rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-toolbar-title{font-size:1rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-button{font-size:.72rem!important;padding:.48rem .56rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-daygrid-day{min-height:68px!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-daygrid-day-number{font-size:.78rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-event{border-radius:7px!important;padding:3px 5px!important;font-size:.72rem!important;box-shadow:0 2px 6px rgba(0,0,0,.12)!important}
    #lrf-agenda-tip{margin:.2rem 0 .65rem;padding:.65rem .75rem;border-radius:12px;background:#fff9e7;border:1px solid #e4cf7a;color:#5a4700;font-size:.76rem;font-weight:700}
    #lrf-quick-sheet{position:fixed;inset:0;z-index:300000;display:none;background:rgba(0,0,0,.42);align-items:flex-end}
    #lrf-quick-sheet.open{display:flex}
    #lrf-quick-panel{width:100%;background:#fff;border-radius:20px 20px 0 0;padding:16px 16px max(18px,env(safe-area-inset-bottom));box-shadow:0 -16px 38px rgba(0,0,0,.24)}
    #lrf-quick-panel h3{margin:0 0 10px;font-size:1rem}
    #lrf-quick-panel input,#lrf-quick-panel textarea,#lrf-quick-panel select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:11px;font:inherit;margin-bottom:9px;background:#fff}
    .lrf-color-row{display:flex;gap:10px;overflow-x:auto;margin:4px 0 12px;padding:3px 1px}
    .lrf-color{width:34px;height:34px;border-radius:50%;border:3px solid transparent;box-shadow:0 0 0 1px #bbb;flex:0 0 auto}
    .lrf-color.active{border-color:#fff;box-shadow:0 0 0 3px #111}
    .lrf-quick-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:9px}
    .lrf-quick-actions button{min-height:48px;border-radius:11px;border:1px solid #D4AF37;font-weight:800;font-size:.88rem}
    #lrf-quick-cancel{background:#fff;color:#222}#lrf-quick-save{background:#111;color:#FFD700}
  `;
  document.head.appendChild(css);

  function waitCalendar(){
    return new Promise(resolve=>{
      let n=0;const t=setInterval(()=>{n++;if(window.__lrfCalendar){clearInterval(t);resolve(window.__lrfCalendar)}else if(n>100){clearInterval(t);resolve(null)}},100);
    });
  }

  function readSaved(){try{return JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch{return []}}
  function saveCalendar(calendar){
    const rows=calendar.getEvents().filter(e=>String(e.id||'').startsWith('local_')).map(e=>({
      id:e.id,title:e.title,start:e.start?.toISOString(),end:e.end?.toISOString()||null,allDay:e.allDay,
      backgroundColor:e.backgroundColor||'#D4AF37',borderColor:e.borderColor||e.backgroundColor||'#D4AF37',textColor:e.textColor||'#fff',
      extendedProps:{description:e.extendedProps?.description||'',kind:e.extendedProps?.kind||'note'}
    }));
    localStorage.setItem(STORAGE,JSON.stringify(rows));
  }

  async function requestNotificationPermission(){
    try{
      let p=await LocalNotifications.checkPermissions();
      if(p.display!=='granted')p=await LocalNotifications.requestPermissions();
      return p.display==='granted';
    }catch(e){console.warn('Notifications',e);return false}
  }

  function reminderId(id){
    let h=2166136261;for(const ch of String(id)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
    return Math.abs(h)%2000000000+1000;
  }

  async function scheduleReminder(event){
    try{
      if(!event?.start)return;
      const when=new Date(event.start);
      const at=new Date(when.getFullYear(),when.getMonth(),when.getDate()-1,8,0,0,0);
      if(at.getTime()<=Date.now())return;
      if(!(await requestNotificationPermission()))return;
      const id=reminderId(event.id);
      await LocalNotifications.cancel({notifications:[{id}]}).catch(()=>{});
      await LocalNotifications.schedule({notifications:[{
        id,
        title:'LE ROY FACTORY — demain',
        body:`${event.title}${event.start&&!event.allDay?' à '+new Date(event.start).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}`,
        schedule:{at},
        extra:{page:'agenda',eventId:event.id}
      }]});
    }catch(e){console.warn('Rappel agenda',e)}
  }

  async function scheduleAll(calendar){
    for(const e of calendar.getEvents())await scheduleReminder(e);
  }

  function makeSheet(calendar){
    const tip=document.createElement('div');tip.id='lrf-agenda-tip';tip.textContent='Touchez directement un jour ou une heure pour écrire une note ou ajouter un rendez-vous. Un rappel Android est prévu à 8h la veille.';
    document.querySelector('.agenda-toolbar')?.insertAdjacentElement('afterend',tip);

    const wrap=document.createElement('div');wrap.id='lrf-quick-sheet';wrap.innerHTML=`<div id="lrf-quick-panel"><h3>Ajouter rapidement</h3><input id="lrf-quick-title" placeholder="Note, visite, rappel, rendez-vous…"><select id="lrf-quick-type"><option value="note">Note / rappel</option><option value="rdv">Rendez-vous</option></select><input id="lrf-quick-time" type="time"><textarea id="lrf-quick-desc" rows="2" placeholder="Détail facultatif"></textarea><div class="lrf-color-row">${COLORS.map((c,i)=>`<button class="lrf-color ${i===1?'active':''}" type="button" data-color="${c}" style="background:${c}"></button>`).join('')}</div><div class="lrf-quick-actions"><button id="lrf-quick-cancel" type="button">Annuler</button><button id="lrf-quick-save" type="button">Enregistrer</button></div></div>`;
    document.body.appendChild(wrap);
    let selectedDate=null,selectedColor='#D4AF37';
    wrap.querySelectorAll('.lrf-color').forEach(b=>b.onclick=()=>{selectedColor=b.dataset.color;wrap.querySelectorAll('.lrf-color').forEach(x=>x.classList.toggle('active',x===b))});
    const close=()=>wrap.classList.remove('open');
    wrap.querySelector('#lrf-quick-cancel').onclick=close;
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});

    const open=date=>{
      selectedDate=new Date(date);
      wrap.querySelector('#lrf-quick-title').value='';
      wrap.querySelector('#lrf-quick-desc').value='';
      wrap.querySelector('#lrf-quick-type').value='note';
      wrap.querySelector('#lrf-quick-time').value=selectedDate.getHours()?`${String(selectedDate.getHours()).padStart(2,'0')}:${String(selectedDate.getMinutes()).padStart(2,'0')}`:'';
      wrap.classList.add('open');setTimeout(()=>wrap.querySelector('#lrf-quick-title').focus(),100);
    };

    wrap.querySelector('#lrf-quick-save').onclick=async()=>{
      const title=wrap.querySelector('#lrf-quick-title').value.trim();if(!title)return;
      const time=wrap.querySelector('#lrf-quick-time').value;
      const type=wrap.querySelector('#lrf-quick-type').value;
      const desc=wrap.querySelector('#lrf-quick-desc').value.trim();
      const start=new Date(selectedDate||new Date());
      let allDay=true,end=null;
      if(time){const [h,m]=time.split(':').map(Number);start.setHours(h,m,0,0);allDay=false;end=new Date(start.getTime()+60*60*1000)}else start.setHours(0,0,0,0);
      const ev=calendar.addEvent({id:'local_'+Date.now(),title,start,end,allDay,backgroundColor:selectedColor,borderColor:selectedColor,textColor:selectedColor==='#D4AF37'?'#111':'#fff',extendedProps:{description:desc,kind:type}});
      saveCalendar(calendar);await scheduleReminder(ev);close();
    };

    calendar.setOption('dateClick',info=>open(info.date));
  }

  (async()=>{
    const calendar=await waitCalendar();if(!calendar)return;
    for(const e of readSaved())if(!calendar.getEventById(e.id))calendar.addEvent(e);
    calendar.setOption('eventAdd',info=>{saveCalendar(calendar);scheduleReminder(info.event)});
    calendar.setOption('eventChange',info=>{saveCalendar(calendar);scheduleReminder(info.event)});
    calendar.setOption('eventRemove',info=>{saveCalendar(calendar);LocalNotifications.cancel({notifications:[{id:reminderId(info.event.id)}]}).catch(()=>{})});
    makeSheet(calendar);
    setTimeout(()=>scheduleAll(calendar),1200);
    setInterval(()=>scheduleAll(calendar),6*60*60*1000);
  })();
})();
