import { LocalNotifications } from '@capacitor/local-notifications';
import { registerPlugin } from '@capacitor/core';

const GoogleCalendarNative = registerPlugin('GoogleCalendarNative');
const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!native||page!=='agenda.html')return;

  const COLORS=['#039BE5','#1D4ED8','#F4511E','#0B8043','#D50000','#8E24AA'];
  const COLOR_IDS={'#039BE5':'7','#1D4ED8':'9','#F4511E':'6','#0B8043':'10','#D50000':'11','#8E24AA':'3'};
  const GOOGLE_COLORS={'1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73','5':'#F6BF26','6':'#F4511E','7':'#039BE5','8':'#616161','9':'#3F51B5','10':'#0B8043','11':'#D50000'};
  const STORAGE='lrfAgendaLocalEvents';
  let googleAccessToken=null;
  let googleConnected=false;

  const css=document.createElement('style');
  css.textContent=`
    html.lrf-native-app body[data-lrf-page="agenda"] .crm-topbar{margin-bottom:.28rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .agenda-card{padding:.35rem!important;min-height:0!important;border-radius:12px!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .agenda-toolbar{gap:.25rem!important;margin-bottom:.3rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] #btn-new-event{display:none!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-toolbar{gap:.3rem!important;margin-bottom:.38rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-toolbar-title{font-size:.96rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-button{font-size:.69rem!important;padding:.43rem .5rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-daygrid-day{min-height:62px!important;transition:none!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-daygrid-day-number{font-size:.75rem!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-event{border-radius:6px!important;padding:3px 5px!important;font-size:.69rem!important;box-shadow:0 2px 5px rgba(0,0,0,.12)!important;color:#fff!important}
    html.lrf-native-app body[data-lrf-page="agenda"] .fc-event *{color:#fff!important}
    #lrf-google-native-note,#lrf-agenda-tip{display:none!important}
    #lrf-quick-sheet{position:fixed;inset:0;z-index:300000;display:none;background:rgba(0,0,0,.42);align-items:flex-end}
    #lrf-quick-sheet.open{display:flex}
    #lrf-quick-panel{width:100%;background:#fff;border-radius:20px 20px 0 0;padding:14px 14px max(16px,env(safe-area-inset-bottom));box-shadow:0 -16px 38px rgba(0,0,0,.24)}
    #lrf-quick-panel h3{margin:0 0 8px;font-size:1rem}
    #lrf-quick-panel input,#lrf-quick-panel textarea,#lrf-quick-panel select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:10px;font:inherit;margin-bottom:8px;background:#fff}
    .lrf-color-row{display:flex;gap:11px;overflow-x:auto;margin:3px 0 11px;padding:4px 2px}
    .lrf-color{width:36px;height:36px;border-radius:50%;border:3px solid transparent;box-shadow:0 0 0 1px #bbb;flex:0 0 auto}
    .lrf-color.active{border-color:#fff;box-shadow:0 0 0 3px #111}
    .lrf-quick-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:9px}
    .lrf-quick-actions button{min-height:46px;border-radius:11px;border:1px solid #D4AF37;font-weight:800;font-size:.86rem}
    #lrf-quick-cancel{background:#fff;color:#222}#lrf-quick-save{background:#111;color:#FFD700}
    #lrf-agenda-mic{position:fixed;top:max(14px,env(safe-area-inset-top));right:16px;width:50px;height:50px;border-radius:50%;border:1px solid #D4AF37;background:#111;color:#fff;font-size:1.4rem;z-index:190000;box-shadow:0 7px 18px rgba(0,0,0,.2)}
    #lrf-agenda-mic.listening{background:#8B1E1E;animation:lrfAgendaMicPulse 1s infinite}
    #lrf-agenda-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:310000;background:#111;color:#fff;padding:10px 14px;border-radius:12px;font-size:.78rem;font-weight:800;box-shadow:0 8px 25px rgba(0,0,0,.3);max-width:82vw;text-align:center}
    @keyframes lrfAgendaMicPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  `;
  document.head.appendChild(css);

  function waitCalendar(){return new Promise(resolve=>{let n=0;const t=setInterval(()=>{n++;if(window.__lrfCalendar){clearInterval(t);resolve(window.__lrfCalendar)}else if(n>100){clearInterval(t);resolve(null)}},100)})}
  function readSaved(){try{return JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch{return []}}
  function saveCalendar(calendar){const rows=calendar.getEvents().filter(e=>String(e.id||'').startsWith('local_')).map(e=>({id:e.id,title:e.title,start:e.start?.toISOString(),end:e.end?.toISOString()||null,allDay:e.allDay,backgroundColor:e.backgroundColor||COLORS[1],borderColor:e.borderColor||e.backgroundColor||COLORS[1],textColor:'#fff',extendedProps:{description:e.extendedProps?.description||'',kind:e.extendedProps?.kind||'note'}}));localStorage.setItem(STORAGE,JSON.stringify(rows))}

  async function requestNotificationPermission(){try{let p=await LocalNotifications.checkPermissions();if(p.display!=='granted')p=await LocalNotifications.requestPermissions();return p.display==='granted'}catch(e){console.warn('Notifications',e);return false}}
  function reminderId(id){let h=2166136261;for(const ch of String(id)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)%2000000000+1000}
  async function scheduleReminder(event){try{if(!event?.start)return;const when=new Date(event.start);const at=new Date(when.getFullYear(),when.getMonth(),when.getDate()-1,8,0,0,0);if(at.getTime()<=Date.now())return;if(!(await requestNotificationPermission()))return;const id=reminderId(event.id);await LocalNotifications.cancel({notifications:[{id}]}).catch(()=>{});await LocalNotifications.schedule({notifications:[{id,title:'LE ROY FACTORY — demain',body:`${event.title}${event.start&&!event.allDay?' à '+new Date(event.start).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}`,schedule:{at},extra:{page:'agenda',eventId:event.id}}]})}catch(e){console.warn('Rappel agenda',e)}}
  async function scheduleAll(calendar){for(const e of calendar.getEvents())await scheduleReminder(e)}

  function setGoogleUi(state,text){const box=document.querySelector('.google-sync-status');const btn=document.getElementById('btn-auth-google');const txt=document.getElementById('sync-text');const icon=document.getElementById('sync-icon');if(txt)txt.textContent=text;if(btn){btn.textContent=state==='ok'?'Actualiser':'Se connecter';btn.disabled=state==='loading'}if(icon)icon.textContent=state==='ok'?'🟢':state==='loading'?'🟡':'🔴';if(box){box.style.borderColor=state==='ok'?'#10B981':state==='error'?'#DC2626':'#D4AF37';box.style.background=state==='ok'?'#F0FDF4':''}}

  async function authorizeGoogle(){setGoogleUi('loading','Google Calendar…');try{const result=await GoogleCalendarNative.authorize();if(!result?.accessToken)throw new Error('Jeton Google absent');googleAccessToken=result.accessToken;googleConnected=true;setGoogleUi('ok','Google Calendar : Connectée');return googleAccessToken}catch(e){googleConnected=false;googleAccessToken=null;setGoogleUi('error','Google Calendar : Non connectée');throw e}}
  async function googleFetch(path,options={}){if(!googleAccessToken)await authorizeGoogle();const res=await fetch(`https://www.googleapis.com/calendar/v3${path}`,{...options,headers:{'Authorization':`Bearer ${googleAccessToken}`,'Content-Type':'application/json',...(options.headers||{})}});if(res.status===401){googleAccessToken=null;await authorizeGoogle();return googleFetch(path,options)}if(!res.ok)throw new Error(`Google Calendar ${res.status}`);return res.status===204?null:res.json()}
  function googleEventToFullCalendar(item){const allDay=!!item.start?.date;const start=item.start?.dateTime||item.start?.date;const end=item.end?.dateTime||item.end?.date;const color=GOOGLE_COLORS[item.colorId]||COLORS[1];return{id:`google_${item.id}`,title:item.summary||'(Sans titre)',start,end,allDay,backgroundColor:color,borderColor:color,textColor:'#fff',extendedProps:{googleId:item.id,description:item.description||'',kind:'google'}}}
  async function loadGoogleEvents(calendar){const min=new Date();min.setDate(min.getDate()-60);const max=new Date();max.setFullYear(max.getFullYear()+1);const data=await googleFetch(`/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(min.toISOString())}&timeMax=${encodeURIComponent(max.toISOString())}&maxResults=2500`);for(const item of data.items||[]){const id=`google_${item.id}`;calendar.getEventById(id)?.remove();calendar.addEvent(googleEventToFullCalendar(item))}setGoogleUi('ok','Google Calendar : Connectée')}
  async function createGoogleEvent({title,start,end,allDay,description,color}){const body={summary:title,description:description||'',colorId:COLOR_IDS[color]||'9'};if(allDay){const startDate=start.toISOString().slice(0,10);const endDate=new Date(start);endDate.setDate(endDate.getDate()+1);body.start={date:startDate};body.end={date:endDate.toISOString().slice(0,10)}}else{body.start={dateTime:start.toISOString()};body.end={dateTime:(end||new Date(start.getTime()+3600000)).toISOString()}}return googleFetch('/calendars/primary/events',{method:'POST',body:JSON.stringify(body)})}
  function markDay(event,el){try{const cell=el.closest('.fc-daygrid-day');if(!cell)return;const color=event.backgroundColor||COLORS[1];cell.style.boxShadow=`inset 0 0 0 2px ${color}`;cell.dataset.lrfHasEvent='1'}catch{}}

  function prepareGoogleStatus(calendar){const box=document.querySelector('.google-sync-status');const btn=document.getElementById('btn-auth-google');if(!box||!btn)return;document.getElementById('lrf-google-native-note')?.remove();document.getElementById('lrf-agenda-tip')?.remove();btn.onclick=async e=>{e.preventDefault();try{await authorizeGoogle();await loadGoogleEvents(calendar);await scheduleAll(calendar)}catch(err){alert(err?.message||'Connexion Google impossible')}}}

  function toast(text){document.getElementById('lrf-agenda-toast')?.remove();const el=document.createElement('div');el.id='lrf-agenda-toast';el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}
  function stripAccents(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function nextWeekday(base,target){const d=new Date(base);let diff=(target-d.getDay()+7)%7;if(diff===0)diff=7;d.setDate(d.getDate()+diff);return d}
  function parseVoice(text){
    const original=String(text||'').trim();let t=stripAccents(original);let date=new Date();date.setSeconds(0,0);let dateFound=false;
    if(/apres[- ]demain/.test(t)){date.setDate(date.getDate()+2);dateFound=true}
    else if(/\bdemain\b/.test(t)){date.setDate(date.getDate()+1);dateFound=true}
    else if(/\baujourd/.test(t)){dateFound=true}
    const weekdays={dimanche:0,lundi:1,mardi:2,mercredi:3,jeudi:4,vendredi:5,samedi:6};
    if(!dateFound){for(const [name,num] of Object.entries(weekdays)){if(new RegExp(`\\b${name}\\b`).test(t)){date=nextWeekday(date,num);dateFound=true;break}}}
    const months={janvier:0,fevrier:1,mars:2,avril:3,mai:4,juin:5,juillet:6,aout:7,septembre:8,octobre:9,novembre:10,decembre:11};
    const dm=t.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/);
    if(dm){date.setMonth(months[dm[2]],Number(dm[1]));if(date<new Date()&&!/\b20\d{2}\b/.test(t))date.setFullYear(date.getFullYear()+1);dateFound=true}
    let hour=null,minute=0;const hm=t.match(/(?:\ba\s*)?(\d{1,2})\s*h(?:\s*(\d{1,2}))?\b/)||t.match(/\ba\s+(\d{1,2})(?::(\d{2}))?\b/);
    if(hm){hour=Math.min(23,Number(hm[1]));minute=Math.min(59,Number(hm[2]||0));date.setHours(hour,minute,0,0)}else date.setHours(0,0,0,0);
    let title=original.replace(/après[- ]demain|apres[- ]demain|demain|aujourd['’]?hui|dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi/gi,' ').replace(/\b\d{1,2}\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b/gi,' ').replace(/\b(?:à|a)?\s*\d{1,2}\s*h\s*\d{0,2}\b/gi,' ').replace(/\b(?:à|a)\s+\d{1,2}:\d{2}\b/gi,' ').replace(/^(ajoute|ajouter|mets|mettre|note|rendez[- ]vous|rdv)\s+/i,' ').replace(/\s+/g,' ').trim();
    if(!title)title='Note vocale';
    return{title,start:date,end:hour===null?null:new Date(date.getTime()+3600000),allDay:hour===null,color:COLORS[1],description:'Ajout vocal'};
  }
  async function addVoiceEvent(calendar,text){const data=parseVoice(text);try{if(!googleConnected)await authorizeGoogle();const remote=await createGoogleEvent(data);const ev=calendar.addEvent(googleEventToFullCalendar(remote));await scheduleReminder(ev);toast(`Ajouté : ${data.title}`)}catch(e){const ev=calendar.addEvent({id:'local_'+Date.now(),title:data.title,start:data.start,end:data.end,allDay:data.allDay,backgroundColor:data.color,borderColor:data.color,textColor:'#fff',extendedProps:{description:data.description,kind:'voice'}});saveCalendar(calendar);await scheduleReminder(ev);toast(`Ajouté hors ligne : ${data.title}`)}}
  function prepareVoiceMic(calendar){if(document.getElementById('lrf-agenda-mic'))return;const b=document.createElement('button');b.id='lrf-agenda-mic';b.type='button';b.innerHTML='🎙️';b.title='Ajouter à l’agenda par la voix';b.setAttribute('aria-label','Ajouter à l’agenda par la voix');b.onclick=async()=>{try{b.classList.add('listening');const out=await VoiceNative.listen({language:'fr-FR'});const text=String(out?.text||'').trim();if(text)await addVoiceEvent(calendar,text)}catch(e){if(!String(e?.message||e).includes('annul'))alert(e?.message||'Commande vocale impossible')}finally{b.classList.remove('listening')}};document.body.appendChild(b)}

  function makeSheet(calendar){
    document.getElementById('lrf-agenda-tip')?.remove();
    const wrap=document.createElement('div');wrap.id='lrf-quick-sheet';wrap.innerHTML=`<div id="lrf-quick-panel"><h3>Ajouter rapidement</h3><input id="lrf-quick-title" placeholder="Note, visite, rappel, rendez-vous…"><select id="lrf-quick-type"><option value="note">Note / rappel</option><option value="rdv">Rendez-vous</option></select><input id="lrf-quick-time" type="time"><textarea id="lrf-quick-desc" rows="2" placeholder="Détail facultatif"></textarea><div class="lrf-color-row">${COLORS.map((c,i)=>`<button class="lrf-color ${i===1?'active':''}" type="button" data-color="${c}" style="background:${c}"></button>`).join('')}</div><div class="lrf-quick-actions"><button id="lrf-quick-cancel" type="button">Annuler</button><button id="lrf-quick-save" type="button">Enregistrer</button></div></div>`;document.body.appendChild(wrap);
    let selectedDate=null,selectedColor=COLORS[1];wrap.querySelectorAll('.lrf-color').forEach(b=>b.onclick=()=>{selectedColor=b.dataset.color;wrap.querySelectorAll('.lrf-color').forEach(x=>x.classList.toggle('active',x===b))});const close=()=>wrap.classList.remove('open');wrap.querySelector('#lrf-quick-cancel').onclick=close;wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
    const open=date=>{selectedDate=new Date(date);wrap.querySelector('#lrf-quick-title').value='';wrap.querySelector('#lrf-quick-desc').value='';wrap.querySelector('#lrf-quick-type').value='note';wrap.querySelector('#lrf-quick-time').value=selectedDate.getHours()?`${String(selectedDate.getHours()).padStart(2,'0')}:${String(selectedDate.getMinutes()).padStart(2,'0')}`:'';wrap.classList.add('open');setTimeout(()=>wrap.querySelector('#lrf-quick-title').focus(),100)};
    wrap.querySelector('#lrf-quick-save').onclick=async()=>{const title=wrap.querySelector('#lrf-quick-title').value.trim();if(!title)return;const time=wrap.querySelector('#lrf-quick-time').value;const type=wrap.querySelector('#lrf-quick-type').value;const desc=wrap.querySelector('#lrf-quick-desc').value.trim();const start=new Date(selectedDate||new Date());let allDay=true,end=null;if(time){const [h,m]=time.split(':').map(Number);start.setHours(h,m,0,0);allDay=false;end=new Date(start.getTime()+3600000)}else start.setHours(0,0,0,0);
      try{if(!googleConnected)await authorizeGoogle();const remote=await createGoogleEvent({title,start,end,allDay,description:desc,color:selectedColor});const ev=calendar.addEvent(googleEventToFullCalendar(remote));await scheduleReminder(ev)}catch(e){const ev=calendar.addEvent({id:'local_'+Date.now(),title,start,end,allDay,backgroundColor:selectedColor,borderColor:selectedColor,textColor:'#fff',extendedProps:{description:desc,kind:type}});saveCalendar(calendar);await scheduleReminder(ev)}close()};
    calendar.setOption('dateClick',info=>open(info.date));
  }

  (async()=>{
    const calendar=await waitCalendar();if(!calendar)return;
    for(const e of readSaved())if(!calendar.getEventById(e.id))calendar.addEvent(e);
    calendar.setOption('eventAdd',info=>{saveCalendar(calendar);scheduleReminder(info.event)});
    calendar.setOption('eventChange',info=>{saveCalendar(calendar);scheduleReminder(info.event)});
    calendar.setOption('eventRemove',info=>{saveCalendar(calendar);LocalNotifications.cancel({notifications:[{id:reminderId(info.event.id)}]}).catch(()=>{})});
    calendar.setOption('eventDidMount',info=>markDay(info.event,info.el));
    prepareGoogleStatus(calendar);
    prepareVoiceMic(calendar);
    makeSheet(calendar);
    try{await authorizeGoogle();await loadGoogleEvents(calendar)}catch(e){console.info('Google Calendar attend la première autorisation utilisateur')}
    setTimeout(()=>scheduleAll(calendar),1200);
    setInterval(async()=>{try{await authorizeGoogle();await loadGoogleEvents(calendar)}catch{}await scheduleAll(calendar)},6*60*60*1000);
  })();
})();
