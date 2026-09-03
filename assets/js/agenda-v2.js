import { db, auth, getAgentProfile } from './firebase.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const CLIENT_ID = '226219482076-kc5gofed3hr09qs62349mbdshlgk88u8.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAZwTSbyDjzQ_eNMd57UImmjxz-h-6JqQA';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const KNOWN_CALENDARS = [
  { id: 'jerome@leroyfactory.fr', label: 'Jérôme', ownerKey: 'jerome', color: '#d3a62d' },
  { id: 'coryne@leroyfactory.fr', label: 'Coryne', ownerKey: 'coryne', color: '#19a79f' }
];
const EXTRA_COLORS = ['#5271c4', '#9b59b6', '#d97706', '#3f8f68', '#b64b4b', '#51606d'];
const $ = s => document.querySelector(s);
const clean = v => String(v ?? '').trim();
const lower = v => clean(v).toLowerCase();
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

let agent=null, calendar=null, tokenClient=null, tokenRenewTimer=null, googleReady=false, googleConnected=false;
let googleCalendars=[], visibleCalendarIds=new Set(), activeEvent=null, tourUnsubscribe=null, localAgendaUnsubscribe=null;
let resizeTimer=null, lastRange=null, googleLoadSerial=0;

function ownerKeyFrom(value){
  const s=lower(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(s.includes('jerome')) return 'jerome';
  if(s.includes('coryne')) return 'coryne';
  return 'other';
}
function ownerColor(key){ return key==='jerome'?'#d3a62d':key==='coryne'?'#19a79f':'#6b7280'; }
function bestTextColor(hex){
  const h=String(hex||'').replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(h)) return '#fff';
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (r*299+g*587+b*114)/1000>160?'#151515':'#fff';
}
function dateOnly(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function timeOnly(date){ return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`; }
function combineDateTime(date,time){ return new Date(`${date}T${time}:00`); }
function waitFor(test,timeout=12000){
  return new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      try{
        const value=test();
        if(value){clearInterval(timer);resolve(value);}
        else if(Date.now()-started>timeout){clearInterval(timer);reject(new Error('Délai de chargement dépassé'));}
      }catch(err){clearInterval(timer);reject(err);}
    },80);
  });
}
function getAgent(){
  const profile=getAgentProfile(auth.currentUser);
  if(profile) return Promise.resolve(profile);
  return new Promise(resolve=>{
    const fallback=setTimeout(()=>resolve({email:lower(localStorage.getItem('agentEmail')),name:clean(localStorage.getItem('agentName'))||'Agent',uid:clean(localStorage.getItem('agentUid'))}),2500);
    window.addEventListener('lrf-agent-auth-ready',event=>{clearTimeout(fallback);resolve(event.detail);},{once:true});
  });
}
function tokenStorageKey(){return `lrf-google-session:${agent?.email||'agent'}`;}
function calendarStorageKey(){return `lrf-google-calendars:${agent?.email||'agent'}`;}
function readStoredToken(){
  try{const parsed=JSON.parse(localStorage.getItem(tokenStorageKey())||'null');return parsed?.accessToken&&parsed?.expiresAt?parsed:null;}catch{return null;}
}
function storeToken(accessToken,expiresIn=3600){
  const expiresAt=Date.now()+Math.max(300,Number(expiresIn)||3600)*1000;
  localStorage.setItem(tokenStorageKey(),JSON.stringify({accessToken,expiresAt}));
  return expiresAt;
}
function setSyncState(state,text,buttonText=''){
  const host=$('#google-sync'),label=$('#sync-text'),btn=$('#btn-auth-google');
  if(!host||!label||!btn)return;
  host.classList.remove('connected','working');
  if(state==='connected')host.classList.add('connected');
  if(state==='working')host.classList.add('working');
  label.textContent=text;
  if(buttonText){btn.textContent=buttonText;btn.style.display='';}else btn.style.display='none';
}
function currentViewForWidth(){return window.innerWidth<=760?'listWeek':'timeGridWeek';}
function updateDateTime(){
  const now=new Date(),dateEl=$('#current-date'),timeEl=$('#current-time');
  if(dateEl){let formatted=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});dateEl.textContent=formatted.charAt(0).toUpperCase()+formatted.slice(1);}
  if(timeEl)timeEl.textContent=now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function initCalendar(){
  calendar=new FullCalendar.Calendar($('#calendar'),{
    initialView:currentViewForWidth(),locale:'fr',firstDay:1,nowIndicator:true,allDaySlot:true,
    slotMinTime:'07:00:00',slotMaxTime:'20:00:00',scrollTime:'07:00:00',scrollTimeReset:false,
    slotDuration:'00:30:00',slotLabelInterval:'01:00:00',expandRows:false,height:'auto',dayMaxEvents:true,navLinks:true,
    selectable:true,selectMirror:true,
    headerToolbar:{left:'prev,next today',center:'title',right:window.innerWidth<=760?'listWeek,timeGridDay':'dayGridMonth,timeGridWeek,timeGridDay'},
    buttonText:{today:"Aujourd'hui",month:'Mois',week:'Semaine',day:'Jour',list:'Liste'},
    views:{
      timeGridWeek:{dayHeaderFormat:{weekday:'short',day:'2-digit',month:'2-digit'}},
      listWeek:{listDayFormat:{weekday:'long',day:'numeric',month:'long'},noEventsContent:'Aucun rendez-vous cette semaine.'}
    },
    select:info=>{
      const start=info.start||new Date(),end=info.end&&info.end>start?info.end:new Date(start.getTime()+3600000);
      openCreateModal(dateOnly(start),timeOnly(start),dateOnly(end),timeOnly(end));calendar.unselect();
    },
    dateClick:info=>{if(calendar.view.type==='dayGridMonth')openCreateModal(info.dateStr,'09:00',info.dateStr,'10:00');},
    eventClick:info=>openEvent(info.event),
    datesSet:info=>{lastRange={start:info.start,end:info.end};if(googleConnected)refreshGoogleEvents(info.start,info.end);},
    eventClassNames:arg=>arg.event.extendedProps.sourceType==='tour'?['tour-event']:[]
  });
  calendar.render();
}
function updateResponsiveCalendar(){
  if(!calendar)return;
  const mobile=window.innerWidth<=760;
  calendar.setOption('headerToolbar',{left:'prev,next today',center:'title',right:mobile?'listWeek,timeGridDay':'dayGridMonth,timeGridWeek,timeGridDay'});
  if(mobile&&!['listWeek','timeGridDay'].includes(calendar.view.type))calendar.changeView('listWeek');
  if(!mobile&&calendar.view.type==='listWeek')calendar.changeView('timeGridWeek');
}
function canWriteCalendar(c){return c&&c.available!==false&&(c.primary||['owner','writer'].includes(c.accessRole)||lower(c.id)===agent.email);}
function preferredCalendarId(){
  const own=googleCalendars.find(c=>lower(c.id)===agent.email&&canWriteCalendar(c));if(own)return own.id;
  const primary=googleCalendars.find(c=>c.primary&&canWriteCalendar(c));return primary?.id||googleCalendars.find(canWriteCalendar)?.id||'primary';
}
function renderCalendarSelect(){
  const select=$('#event-calendar');if(!select)return;
  const available=googleCalendars.filter(canWriteCalendar);
  if(!googleConnected||!available.length){select.innerHTML='<option value="crm">Agenda partagé LE ROY FACTORY</option>';select.value='crm';return;}
  select.innerHTML=available.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');select.value=preferredCalendarId();
}
function renderLegend(){
  const box=$('#calendar-legend');if(!box)return;
  const tourChip='<span class="calendar-chip tour-chip"><span class="calendar-chip-dot" style="background:#6b7280"></span>🧭 Tournées Jérôme + Coryne</span>';
  if(!googleCalendars.length){box.innerHTML=tourChip+'<span class="calendar-chip"><span class="calendar-chip-dot" style="background:#6b7280"></span>Agenda partagé CRM</span>';renderCalendarSelect();return;}
  box.innerHTML=googleCalendars.map(c=>{
    const checked=visibleCalendarIds.has(c.id)&&c.available!==false;
    if(c.available===false)return `<span class="calendar-chip unavailable" title="Ce calendrier doit être partagé avec le compte Google connecté"><span class="calendar-chip-dot" style="background:${c.color}"></span>${esc(c.label)} · accès à partager</span>`;
    return `<label class="calendar-chip"><input type="checkbox" data-calendar-id="${esc(c.id)}" ${checked?'checked':''}><span class="calendar-chip-dot" style="background:${c.color}"></span>${esc(c.label)}</label>`;
  }).join('')+tourChip;
  box.querySelectorAll('input[data-calendar-id]').forEach(input=>input.addEventListener('change',()=>{
    const id=input.dataset.calendarId;if(input.checked)visibleCalendarIds.add(id);else visibleCalendarIds.delete(id);
    localStorage.setItem(calendarStorageKey(),JSON.stringify([...visibleCalendarIds]));renderCalendarSelect();
    if(lastRange&&googleConnected)refreshGoogleEvents(lastRange.start,lastRange.end);
  }));
  renderCalendarSelect();
}
function mergeCalendarMeta(listItems){
  const byId=new Map();let saved;try{saved=new Set(JSON.parse(localStorage.getItem(calendarStorageKey())||'[]'));}catch{saved=new Set();}
  let extraIndex=0;
  for(const item of listItems){
    const id=item.id;if(!id||String(id).includes('#holiday@')||String(id).includes('#contacts@'))continue;
    const known=KNOWN_CALENDARS.find(k=>lower(k.id)===lower(id));
    const ownerKey=known?.ownerKey||ownerKeyFrom(`${item.summaryOverride||item.summary||''} ${id}`);
    const color=known?.color||item.backgroundColor||(ownerKey==='other'?EXTRA_COLORS[extraIndex++%EXTRA_COLORS.length]:ownerColor(ownerKey));
    byId.set(id,{id,label:known?.label||item.summaryOverride||item.summary||id,ownerKey,color,primary:!!item.primary,accessRole:item.accessRole,available:true});
  }
  for(const known of KNOWN_CALENDARS){if(![...byId.values()].some(c=>lower(c.id)===lower(known.id)))byId.set(known.id,{...known,primary:false,accessRole:null,available:null});}
  googleCalendars=[...byId.values()].sort((a,b)=>{
    const rank=c=>c.ownerKey==='jerome'?0:c.ownerKey==='coryne'?1:c.primary?2:3;return rank(a)-rank(b)||a.label.localeCompare(b.label,'fr');
  });
  if(saved.size)visibleCalendarIds=new Set(googleCalendars.filter(c=>saved.has(c.id)&&c.available!==false).map(c=>c.id));
  else visibleCalendarIds=new Set(googleCalendars.filter(c=>c.available!==false&&(c.ownerKey==='jerome'||c.ownerKey==='coryne'||c.primary||['owner','writer'].includes(c.accessRole))).map(c=>c.id));
}

async function initGoogleApi(){
  setSyncState('working','Google Calendar : initialisation…','Connexion');
  try{
    await waitFor(()=>window.gapi?.load&&window.google?.accounts?.oauth2);
    await new Promise((resolve,reject)=>gapi.load('client',async()=>{try{await gapi.client.init({apiKey:API_KEY,discoveryDocs:[DISCOVERY_DOC]});resolve();}catch(err){reject(err);}}));
    tokenClient=google.accounts.oauth2.initTokenClient({
      client_id:CLIENT_ID,scope:SCOPES,hint:agent.email,include_granted_scopes:true,
      callback:async resp=>{
        if(resp.error||!resp.access_token){googleConnected=false;setSyncState('idle','Google Calendar : reconnexion nécessaire','Reconnecter');return;}
        const expiresAt=storeToken(resp.access_token,resp.expires_in);gapi.client.setToken({access_token:resp.access_token});await onGoogleConnected(expiresAt);
      }
    });
    googleReady=true;
    const stored=readStoredToken();
    if(stored&&stored.expiresAt>Date.now()+60000){gapi.client.setToken({access_token:stored.accessToken});await onGoogleConnected(stored.expiresAt);}
    else{try{tokenClient.requestAccessToken({prompt:''});}catch{setSyncState('idle','Google Calendar : connexion à mémoriser','Connecter');}}
  }catch(err){console.error('[Agenda] Google API indisponible',err);setSyncState('idle','Google Calendar : indisponible','Réessayer');}
}
function scheduleTokenRenew(expiresAt){
  clearTimeout(tokenRenewTimer);const delay=Math.max(60000,expiresAt-Date.now()-300000);
  tokenRenewTimer=setTimeout(()=>{try{tokenClient?.requestAccessToken({prompt:''});}catch{setSyncState('idle','Google Calendar : reconnexion nécessaire','Reconnecter');}},delay);
}
async function onGoogleConnected(expiresAt){
  googleConnected=true;setSyncState('working','Google Calendar : chargement des calendriers…');
  try{
    const response=await gapi.client.calendar.calendarList.list({showHidden:false,minAccessRole:'reader'});
    mergeCalendarMeta(response.result.items||[]);await probeKnownCalendars();renderLegend();
    const count=googleCalendars.filter(c=>c.available!==false&&visibleCalendarIds.has(c.id)).length;
    setSyncState('connected',`Google Calendar : ${count||1} calendrier${count>1?'s':''} synchronisé${count>1?'s':''}`);scheduleTokenRenew(expiresAt);
    const range=lastRange||{start:calendar.view.activeStart,end:calendar.view.activeEnd};await refreshGoogleEvents(range.start,range.end);
  }catch(err){
    console.error('[Agenda] Impossible de lire la liste des calendriers',err);
    if(isAuthError(err))handleAuthExpired();else setSyncState('idle','Google Calendar : autorisation calendrier requise','Autoriser');
  }
}
async function probeKnownCalendars(){
  const now=new Date(),later=new Date(now.getTime()+60000);
  for(const known of KNOWN_CALENDARS){
    let meta=googleCalendars.find(c=>lower(c.id)===lower(known.id));
    if(!meta){meta={...known,primary:false,accessRole:null,available:null};googleCalendars.push(meta);}
    if(meta.available===true)continue;
    try{await gapi.client.calendar.events.list({calendarId:known.id,timeMin:now.toISOString(),timeMax:later.toISOString(),maxResults:1,singleEvents:true});meta.available=true;if(!localStorage.getItem(calendarStorageKey()))visibleCalendarIds.add(meta.id);}catch{meta.available=false;}
  }
}
function isAuthError(err){return err?.status===401||err?.result?.error?.code===401||(err?.status===403&&String(err?.result?.error?.message||'').toLowerCase().includes('credential'));}
function handleAuthExpired(){
  googleConnected=false;if(readStoredToken())localStorage.removeItem(tokenStorageKey());setSyncState('working','Google Calendar : renouvellement automatique…');
  try{tokenClient?.requestAccessToken({prompt:''});}catch{setSyncState('idle','Google Calendar : reconnexion nécessaire','Reconnecter');}
}
async function refreshGoogleEvents(start,end){
  if(!googleConnected||!calendar)return;const serial=++googleLoadSerial;
  calendar.getEvents().filter(e=>e.extendedProps.sourceType==='google').forEach(e=>e.remove());
  const targets=googleCalendars.filter(c=>c.available!==false&&visibleCalendarIds.has(c.id));
  for(const meta of targets){
    if(serial!==googleLoadSerial)return;
    try{
      const response=await gapi.client.calendar.events.list({calendarId:meta.id,timeMin:start.toISOString(),timeMax:end.toISOString(),showDeleted:false,singleEvents:true,orderBy:'startTime',maxResults:2500});
      for(const event of response.result.items||[]){
        if(!event.start)continue;
        calendar.addEvent({
          id:`google:${meta.id}:${event.id}`,title:event.summary||'(Sans titre)',start:event.start.dateTime||event.start.date,end:event.end?.dateTime||event.end?.date,
          allDay:!!event.start.date,backgroundColor:meta.color,borderColor:meta.color,textColor:bestTextColor(meta.color),
          extendedProps:{sourceType:'google',googleEventId:event.id,calendarId:meta.id,calendarLabel:meta.label,description:event.description||'',location:event.location||'',ownerKey:meta.ownerKey,htmlLink:event.htmlLink||''}
        });
      }
    }catch(err){
      console.warn('[Agenda] Calendrier inaccessible',meta.id,err);if(isAuthError(err)){handleAuthExpired();return;}
      meta.available=false;visibleCalendarIds.delete(meta.id);renderLegend();
    }
  }
}

function subscribeTours(){
  if(tourUnsubscribe)tourUnsubscribe();
  tourUnsubscribe=onSnapshot(collection(db,'tournees'),snap=>{
    calendar.getEvents().filter(e=>e.extendedProps.sourceType==='tour').forEach(e=>e.remove());
    snap.docs.forEach(tourDoc=>{
      const tour={id:tourDoc.id,...tourDoc.data()},ownerKey=ownerKeyFrom(`${tour.createdBy||''} ${tour.createdByEmail||''}`),color=ownerColor(ownerKey);
      (tour.days||[]).forEach((day,index)=>{
        const stops=Array.isArray(day.stops)?day.stops:[],first=stops[0],last=stops[stops.length-1];
        const startTime=first?.arrival||tour.startTime||'08:00',endTime=last?.departure||tour.endTime||'18:00';
        const ownerLabel=ownerKey==='jerome'?'Jérôme':ownerKey==='coryne'?'Coryne':clean(tour.createdBy)||'Agent';
        const title=`🧭 Tournée ${ownerLabel} · ${stops.length} visite${stops.length>1?'s':''}`,details=stops.map(s=>`${s.arrival||''} ${s.societe||''}`.trim()).join(' · ');
        calendar.addEvent({
          id:`tour:${tour.id}:${index}`,title,start:`${day.date}T${startTime}:00`,end:`${day.date}T${endTime}:00`,backgroundColor:color,
          borderColor:ownerKey==='jerome'?'#795c07':ownerKey==='coryne'?'#08736d':'#4b5563',textColor:bestTextColor(color),
          extendedProps:{sourceType:'tour',tourId:tour.id,ownerKey,ownerLabel,details,stops}
        });
      });
    });
  },err=>console.error('[Agenda] Tournées Firestore',err));
}
function subscribeSharedAgenda(){
  if(localAgendaUnsubscribe)localAgendaUnsubscribe();
  localAgendaUnsubscribe=onSnapshot(collection(db,'agenda_events'),snap=>{
    calendar.getEvents().filter(e=>e.extendedProps.sourceType==='crm').forEach(e=>e.remove());
    snap.docs.forEach(eventDoc=>{
      const data=eventDoc.data();if(!data.start||!data.end)return;
      const ownerKey=ownerKeyFrom(`${data.ownerName||''} ${data.ownerEmail||''}`),color=ownerColor(ownerKey);
      calendar.addEvent({
        id:`crm:${eventDoc.id}`,title:data.title||'(Sans titre)',start:data.start,end:data.end,backgroundColor:color,borderColor:color,textColor:bestTextColor(color),
        extendedProps:{sourceType:'crm',firestoreId:eventDoc.id,description:data.description||'',ownerKey,ownerName:data.ownerName||'',ownerEmail:data.ownerEmail||''}
      });
    });
  },err=>console.error('[Agenda] Événements partagés Firestore',err));
}

function resetModal(readOnly=false){
  const form=$('#event-form');form.classList.toggle('event-readonly',readOnly);
  form.querySelectorAll('input,textarea,select').forEach(el=>{if(el.type!=='hidden')el.disabled=readOnly;});
  $('#btn-submit-text').style.display=readOnly?'none':'';$('#btn-delete-event').style.display='none';$('#event-source-note').style.display='none';
}
function openCreateModal(startDate='',startTime='09:00',endDate='',endTime='10:00'){
  activeEvent=null;resetModal(false);$('#event-edit-id').value='';$('#modal-main-title').textContent='Planifier un rendez-vous';$('#btn-submit-text').textContent='💾 Enregistrer';
  const today=dateOnly(new Date());$('#event-title').value='';$('#event-start-date').value=startDate||today;$('#event-start-time').value=startTime||'09:00';
  $('#event-end-date').value=endDate||startDate||today;$('#event-end-time').value=endTime||'10:00';$('#event-description').value='';renderCalendarSelect();$('#event-modal').style.display='flex';
}
function openEvent(event){
  activeEvent=event;const type=event.extendedProps.sourceType;
  if(type==='tour'){
    resetModal(true);$('#modal-main-title').textContent='Tournée commerciale';$('#event-title').value=event.title;$('#event-start-date').value=dateOnly(event.start);$('#event-start-time').value=timeOnly(event.start);
    $('#event-end-date').value=dateOnly(event.end||event.start);$('#event-end-time').value=timeOnly(event.end||event.start);$('#event-description').value=event.extendedProps.details||'';
    $('#event-calendar').innerHTML=`<option>${esc(event.extendedProps.ownerLabel||'Tournée')}</option>`;const note=$('#event-source-note');note.innerHTML='🧭 Cette entrée vient automatiquement du module <strong>Tournées</strong>. Modifiez-la depuis la page Tournées.';note.style.display='';$('#event-modal').style.display='flex';return;
  }
  resetModal(false);$('#event-edit-id').value=event.id;$('#modal-main-title').textContent='Modifier le rendez-vous';$('#btn-submit-text').textContent='💾 Mettre à jour';$('#btn-delete-event').style.display='';
  $('#event-title').value=event.title||'';const start=event.start,end=event.end||new Date(start.getTime()+3600000);
  $('#event-start-date').value=dateOnly(start);$('#event-start-time').value=timeOnly(start);$('#event-end-date').value=dateOnly(end);$('#event-end-time').value=timeOnly(end);$('#event-description').value=event.extendedProps.description||'';
  if(type==='google'){
    const meta=googleCalendars.find(c=>c.id===event.extendedProps.calendarId),readOnly=!canWriteCalendar(meta);resetModal(readOnly);
    $('#modal-main-title').textContent=readOnly?'Rendez-vous Google (lecture seule)':'Modifier le rendez-vous';renderCalendarSelect();
    if(!readOnly&&[...$('#event-calendar').options].some(o=>o.value===event.extendedProps.calendarId))$('#event-calendar').value=event.extendedProps.calendarId;
    else $('#event-calendar').innerHTML=`<option>${esc(event.extendedProps.calendarLabel||event.extendedProps.calendarId)}</option>`;
    $('#event-calendar').disabled=true;const note=$('#event-source-note');note.innerHTML=`Google Calendar · <strong>${esc(event.extendedProps.calendarLabel||event.extendedProps.calendarId)}</strong>`;note.style.display='';
  }else{$('#event-calendar').innerHTML='<option value="crm">Agenda partagé LE ROY FACTORY</option>';$('#event-calendar').value='crm';}
  $('#event-modal').style.display='flex';
}
function closeModal(){$('#event-modal').style.display='none';activeEvent=null;}
async function submitEvent(event){
  event.preventDefault();const editId=$('#event-edit-id').value,title=clean($('#event-title').value),start=combineDateTime($('#event-start-date').value,$('#event-start-time').value),end=combineDateTime($('#event-end-date').value,$('#event-end-time').value),description=clean($('#event-description').value);
  if(!title)return alert('Indiquez un titre de rendez-vous.');if(!(end>start))return alert("L'heure de fin doit être après l'heure de début.");const targetCalendar=$('#event-calendar').value;
  try{
    if(editId&&activeEvent?.extendedProps.sourceType==='google'){
      await gapi.client.calendar.events.patch({calendarId:activeEvent.extendedProps.calendarId,eventId:activeEvent.extendedProps.googleEventId,resource:{summary:title,description,start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()}}});
    }else if(editId&&activeEvent?.extendedProps.sourceType==='crm'){
      await updateDoc(doc(db,'agenda_events',activeEvent.extendedProps.firestoreId),{title,description,start:start.toISOString(),end:end.toISOString(),updatedAt:serverTimestamp()});
    }else if(googleConnected&&targetCalendar&&targetCalendar!=='crm'){
      await gapi.client.calendar.events.insert({calendarId:targetCalendar,resource:{summary:title,description,start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()}}});
    }else{
      await addDoc(collection(db,'agenda_events'),{title,description,start:start.toISOString(),end:end.toISOString(),ownerName:agent.name,ownerEmail:agent.email,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }
    closeModal();if(googleConnected&&lastRange)await refreshGoogleEvents(lastRange.start,lastRange.end);
  }catch(err){console.error('[Agenda] Enregistrement impossible',err);if(isAuthError(err))handleAuthExpired();alert('Impossible d’enregistrer ce rendez-vous pour le moment.');}
}
async function deleteActiveEvent(){
  if(!activeEvent||!confirm('Supprimer définitivement ce rendez-vous ?'))return;
  try{
    if(activeEvent.extendedProps.sourceType==='google')await gapi.client.calendar.events.delete({calendarId:activeEvent.extendedProps.calendarId,eventId:activeEvent.extendedProps.googleEventId});
    else if(activeEvent.extendedProps.sourceType==='crm')await deleteDoc(doc(db,'agenda_events',activeEvent.extendedProps.firestoreId));
    closeModal();if(googleConnected&&lastRange)await refreshGoogleEvents(lastRange.start,lastRange.end);
  }catch(err){console.error('[Agenda] Suppression impossible',err);alert('Impossible de supprimer ce rendez-vous.');}
}
function bindUi(){
  $('#btn-new-event')?.addEventListener('click',()=>openCreateModal());$('#modal-event-close')?.addEventListener('click',closeModal);$('#btn-cancel-event')?.addEventListener('click',closeModal);
  $('#event-form')?.addEventListener('submit',submitEvent);$('#btn-delete-event')?.addEventListener('click',deleteActiveEvent);$('#event-modal')?.addEventListener('click',event=>{if(event.target.id==='event-modal')closeModal();});
  $('#btn-auth-google')?.addEventListener('click',()=>{if(!googleReady||!tokenClient){initGoogleApi();return;}setSyncState('working','Google Calendar : autorisation…');try{tokenClient.requestAccessToken({prompt:'consent'});}catch(err){console.error(err);setSyncState('idle','Google Calendar : connexion impossible','Réessayer');}});
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(updateResponsiveCalendar,180);});
}
async function init(){
  agent=await getAgent();if(!agent?.email)return;const firstName=clean(agent.name).split(' ')[0]||'Agent';$('#user-greeting').textContent=`Agenda partagé de ${firstName} — LE ROY FACTORY`;
  updateDateTime();setInterval(updateDateTime,30000);initCalendar();bindUi();subscribeTours();subscribeSharedAgenda();renderLegend();initGoogleApi();
}
init().catch(err=>{console.error('[Agenda] Erreur d’initialisation',err);const text=$('#sync-text');if(text)text.textContent='Agenda : erreur de chargement';});
