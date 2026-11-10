import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { localDate, reportField, reportFingerprint, unchangedReportIndex } from '../assets/js/crm-report-core.mjs';
import { withReportPartners } from '../assets/js/crm-report-partners.mjs';

const quiet = { log(){}, warn(){}, error(){} };
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const noop = () => {};
function element(value='') {
  return { value, style:{}, dataset:{}, disabled:false, hidden:false, textContent:'', innerHTML:'', options:[],
    classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
    querySelectorAll:()=>[], querySelector:()=>null, addEventListener:noop, scrollIntoView:noop,
    appendChild:noop, insertAdjacentElement:noop, remove:noop };
}
function script(file, globals={}) {
  let source=readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8');
  source=source.replace(/^import[\s\S]*?;\s*$/gm,'');
  source=source.replace(/^init\(\)\.catch[\s\S]*$/m,'');
  const context=vm.createContext({console:quiet,Date,URLSearchParams,Set,Map,Promise,Number,
    setTimeout:()=>0,clearTimeout:noop,setInterval:()=>0,clearInterval:noop,
    document:{readyState:'loading',addEventListener:noop,querySelector:()=>null},
    auth:{currentUser:{getIdToken:async()=> 'mock-agent-token'}},window:{addEventListener:noop},localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},
    ...globals});
  vm.runInContext(source,context,{filename:file});
  return {context,run:(code,timeout=1000)=>vm.runInContext(code,context,{timeout})};
}

test('local visit date follows calendar getters rather than UTC',()=>{
  assert.equal(localDate({getFullYear:()=>2026,getMonth:()=>10,getDate:()=>5,toISOString:()=> '2026-11-04T23:15:00Z'}),'2026-11-05');
});
test('report writer keeps legacy field and stable report identity despite inserted visits',()=>{
  assert.equal(reportField({comptesRendus:[]}), 'comptesRendus');
  assert.equal(reportField({comptes_rendus:[]}), 'comptes_rendus');
  assert.equal(reportField({comptes_rendus:[],comptesRendus:[]},'comptesRendus'), 'comptesRendus');
  const original={date:'2026-11-04',text:'Visite',source:'tournee',tourId:'tour-A',extra:{b:2,a:1}};
  const moved={extra:{a:1,b:2},tourId:'tour-A',source:'tournee',text:'Visite',date:'2026-11-04'};
  assert.equal(reportFingerprint(original),reportFingerprint(moved));
  assert.equal(unchangedReportIndex([{text:'Nouvelle visite'},moved],original),1);
  assert.throws(()=>unchangedReportIndex([{...original,text:'Modifié par Coryne'}],original));
  assert.throws(()=>unchangedReportIndex([original,original],original));
});

test('tour rejects absent and invalid coordinates instead of silently using 0,0',()=>{
  const {run}=script('tournees-v6.js');
  for(const input of ['{}','{lat:null,lng:null}','{lat:"",lng:""}','{lat:91,lng:3}','{lat:43,lng:181}']) {
    assert.equal(run(`storedCoords(${input})`),null,input);
  }
  assert.equal(JSON.stringify(run('storedCoords({latitude:"43.6",longitude:"3.9"})')),JSON.stringify({lat:43.6,lng:3.9}));
  assert.equal(JSON.stringify(run('storedCoords({lat:0,lng:0})')),JSON.stringify({lat:0,lng:0}));
});
test('unreachable optimized route terminates without bogus stop indices',()=>{
  const {run}=script('tournees-v6.js');
  assert.equal(JSON.stringify(run('optimizedOrder({durations:[[0,30,10],[30,0,20],[10,20,0]]},2)')),'[2,1]');
  for(const durations of ['[[0,Infinity],[Infinity,0]]','[[0,null],[null,0]]']){
    assert.throws(()=>run(`optimizedOrder({durations:${durations}},1)`,100), error=>{
      assert.notEqual(error.code,'ERR_SCRIPT_EXECUTION_TIMEOUT','unreachable stop must never freeze the CRM');
      return true;
    }, 'an unreachable stop must be reported rather than silently routed');
  }
});

test('agenda ignores an older Google refresh completed after the latest one',async()=>{
  const pending=[],entries=[];
  const {context,run}=script('agenda-v2.js',{
    gapi:{client:{calendar:{events:{list:()=>{const p=deferred();pending.push(p);return p.promise}}}}},
    calendarMock:{getEvents:()=>entries.slice(),addEvent:entry=>{const result={...entry,remove(){entries.splice(entries.indexOf(result),1)}};entries.push(result);return result;}}
  });
  run(`googleConnected=true;calendar=calendarMock;googleCalendars=[{id:'one',available:true,color:'#123456'}];visibleCalendarIds=new Set(['one']);`);
  context.from=new Date('2026-11-01');context.to=new Date('2026-11-08');
  const old=run('refreshGoogleEvents(from,to)'),recent=run('refreshGoogleEvents(from,to)');
  const response=id=>({result:{items:[{id,start:{dateTime:'2026-11-05T09:00:00Z'},end:{dateTime:'2026-11-05T10:00:00Z'}}]}});
  pending[1].resolve(response('new'));await recent;
  pending[0].resolve(response('old'));await old;
  assert.deepEqual(entries.map(e=>e.id),['google:one:new']);
});

function agendaForm() {
  const fields=new Map();
  for(const id of ['event-form','event-edit-id','event-title','event-start-date','event-start-time','event-end-date','event-end-time','event-description','event-calendar','event-modal','modal-main-title','btn-submit-text','btn-delete-event','event-source-note'])fields.set('#'+id,element());
  fields.get('#event-title').value='Visite client';fields.get('#event-start-date').value='2026-11-05';fields.get('#event-end-date').value='2026-11-05';fields.get('#event-start-time').value='09:00';fields.get('#event-end-time').value='10:00';fields.get('#event-calendar').value='crm';
  fields.get('#event-form').querySelectorAll=()=>[fields.get('#event-title'),fields.get('#event-calendar')];
  return {fields,document:{readyState:'loading',addEventListener:noop,querySelector:selector=>fields.get(selector)||null}};
}
test('agenda double submission creates only one shared appointment',async()=>{
  const {fields,document}=agendaForm(),pending=deferred();let writes=0;
  const {context,run}=script('agenda-v2.js',{document,db:{},doc:()=>({}),collection:()=>({}),serverTimestamp:()=>0,
    addDoc:()=>{writes++;return pending.promise},alert:message=>{throw new Error(message)}});
  run(`agent={name:'Jérôme',email:'jerome@leroyfactory.fr'};`);
  context.submit={preventDefault:noop};
  const first=run('submitEvent(submit)'),second=run('submitEvent(submit)');
  await second;assert.equal(writes,1);assert.equal(fields.get('#btn-submit-text').disabled,true);
  pending.resolve({id:'event-A'});await first;
});
test('agenda writable Google appointment retains deletion while read-only hides it',()=>{
  const {fields,document}=agendaForm();fields.get('#event-calendar').options=[{value:'writable'}];
  const {context,run}=script('agenda-v2.js',{document});
  run(`agent={email:'jerome@leroyfactory.fr'};googleConnected=true;googleCalendars=[{id:'writable',label:'Mon agenda',accessRole:'writer',available:true}];`);
  context.googleEvent={id:'google:A',title:'Visite',start:new Date('2026-11-05T09:00:00Z'),end:new Date('2026-11-05T10:00:00Z'),extendedProps:{sourceType:'google',calendarId:'writable'}};
  run('openEvent(googleEvent)');assert.notEqual(fields.get('#btn-delete-event').style.display,'none');
  run(`googleCalendars[0].accessRole='reader';openEvent(googleEvent)`);assert.equal(fields.get('#btn-delete-event').style.display,'none');
});

test('tour owner decoration and deletion use row ID even when query order differs',async()=>{
  const deleteButton=element(),actions={querySelector:s=>s==='.tour-delete-btn'?deleteButton:null};
  const row={dataset:{tourId:'A'},classList:{remove:noop,add:noop},firstElementChild:null,querySelector:s=>s==='.tour-saved-actions'?actions:null,remove:noop};
  const box={querySelectorAll:()=>[row]};const deleted=[];
  const {run}=script('tournees-owner-actions.js',{document:{readyState:'loading',addEventListener:noop,querySelector:s=>s==='#tour-saved-list'?box:null},
    window:{confirm:()=>true},db:{},collection:()=>({}),orderBy:()=>({}),limit:()=>({}),query:()=>({}),doc:(_db,_collection,id)=>({id}),deleteDoc:async ref=>deleted.push(ref.id),getDocs:async()=>({docs:[]})});
  run(`cachedTours=[{id:'B',createdBy:'Coryne',createdByEmail:'coryne@leroyfactory.fr'},{id:'A',createdBy:'Jérôme',createdByEmail:'jerome@leroyfactory.fr'}];decorateSavedList();`);
  assert.equal(row.dataset.tourId,'A');assert.equal(deleteButton.dataset.tourId,'A');
  await deleteButton.onclick();assert.deepEqual(deleted,['A']);
});

function reportForm() {
  const fields=new Map();
  for(const id of ['textarea-notes','input-date','input-author','lrf-partner-select','lrf-save-report','lrf-save-send-report','lrf-mail-status'])fields.set('#'+id,element());
  fields.get('#textarea-notes').value='Présentation du configurateur';fields.get('#input-date').value='2026-11-05';fields.get('#input-author').value='Jérôme';fields.get('#lrf-partner-select').value='Elios';
  const recipients=[{value:'contact@elios.example',dataset:{name:'Contact Elios'}}];
  return {fields,recipients,document:{readyState:'loading',addEventListener:noop,querySelector:s=>fields.get(s)||null,querySelectorAll:()=>recipients}};
}
test('new report keeps the chosen client, partner and recipients while its save is pending',async()=>{
  const {fields,recipients,document}=reportForm(),read=deferred(),updates=[],mails=[];
  const {context,run}=script('nouveau-cr-client-mail.js',{document,localDate,reportField,reportFingerprint,db:{},doc:(_db,_collection,id)=>({id}),
    runTransaction:async(_db,callback)=>callback({get:()=>read.promise,update:(ref,payload)=>updates.push({ref,payload})}),
    fetch:async(_url,options)=>{mails.push(JSON.parse(options.body));return {ok:true,json:async()=>({success:true})}}});
  run(`selectedClientId='A';selectedClient={id:'A',societe:'Magasin Alpha'};`);
  const save=run('saveFlow(true)');
  // A second client can be selected while the first transaction is in flight.
  run(`selectedClientId='B';selectedClient={id:'B',societe:'Magasin Beta'};`);
  fields.get('#lrf-partner-select').value='View';recipients[0]={value:'view@example.test',dataset:{name:'Contact View'}};
  read.resolve({exists:()=>true,data:()=>({comptesRendus:[{text:'Ancienne visite'}]})});await save;
  assert.equal(updates.length,1);assert.equal(updates[0].ref.id,'A');
  assert.equal(updates[0].payload.comptesRendus.length,2);
  assert.equal(mails.length,1);assert.match(mails[0].subject,/Magasin Alpha/);assert.doesNotMatch(mails[0].subject,/Magasin Beta/);
  assert.deepEqual(mails[0].bccRecipients,['contact@elios.example']);assert.match(mails[0].htmlContent,/Elios/);assert.doesNotMatch(mails[0].htmlContent,/Magasin Beta/);
});
test('mail retry reuses an already saved report rather than creating a duplicate visit',async()=>{
  const {document}=reportForm(),updates=[];let deliveries=0;
  const {run}=script('nouveau-cr-client-mail.js',{document,localDate,reportField,reportFingerprint,db:{},doc:(_db,_collection,id)=>({id}),
    runTransaction:async(_db,callback)=>callback({get:async()=>({exists:()=>true,data:()=>({comptes_rendus:[]})}),update:(ref,payload)=>updates.push({ref,payload})}),
    fetch:async()=>{deliveries++;if(deliveries===1)throw new Error('Network unavailable');return {ok:true,json:async()=>({success:true})}}});
  run(`selectedClientId='A';selectedClient={id:'A',societe:'Magasin Alpha'};`);
  await run('saveFlow(true)');await run('saveFlow(true)');
  assert.equal(deliveries,2);assert.equal(updates.length,1);assert.equal(updates[0].payload.comptes_rendus.length,1);
});
test('missing report mail recipients are rejected before storing a visit',async()=>{
  const {document,recipients}=reportForm();recipients.length=0;let writes=0;
  const {run}=script('nouveau-cr-client-mail.js',{document,localDate,reportField,reportFingerprint,runTransaction:async()=>{writes++}});
  run(`selectedClientId='A';selectedClient={id:'A',societe:'Magasin Alpha'};`);await run('saveFlow(true)');assert.equal(writes,0);
});

function reportSubmitHarness({editing=null,target='A',data=new Map(),failRead=''}) {
  const html=readFileSync(new URL('../comptes-rendus.html',import.meta.url),'utf8');
  const start=html.indexOf('      form.addEventListener("submit",async e=>{');
  const end=html.indexOf('      [searchInput,filterDate,filterEnd]',start);
  assert.ok(start>=0&&end>start,'active report form submit handler found');
  const writes=[],alerts=[];
  const button=element();
  const context=vm.createContext({console:quiet,Date,Math,localDate,reportField,reportFingerprint,unchangedReportIndex,withReportPartners,
    saving:false,editing,clientSelect:{value:target},dateInput:{value:'2026-11-05'},authorSelect:{value:'Jérôme'},textInput:{value:'Compte-rendu corrigé'},usineInput:{value:''},
    db:{},doc:(_db,collection,id)=>({collection,id}),$:()=>button,closeModal:noop,alert:message=>alerts.push(message),
    form:{addEventListener(_event,callback){context.submitReport=callback}},
    runTransaction:async(_db,callback)=>{
      const staged=[];
      await callback({get:async ref=>{if(ref.id===failRead)throw new Error('Lecture impossible');return {exists:()=>data.has(ref.id),data:()=>data.get(ref.id)}},update:(ref,payload)=>staged.push({ref,payload})});
      writes.push(...staged);
    }
  });
  vm.runInContext(html.slice(start,end),context);
  return {submit:()=>context.submitReport({preventDefault:noop}),writes,alerts,context};
}
test('editing a visit finds the unchanged original after another visit has been inserted and keeps metadata',async()=>{
  const raw={id:'cr-old',date:'2026-11-04',text:'Texte initial',source:'tournee',tourId:'tour-X',custom:{followUp:true},usine:'View'};
  const incoming={id:'cr-new',date:'2026-11-05',text:'Ajout Coryne'};
  const data=new Map([['A',{comptesRendus:[incoming,raw]}]]);
  const h=reportSubmitHarness({editing:{clientId:'A',crIndex:0,crField:'comptesRendus',raw},data});await h.submit();
  assert.deepEqual(h.alerts,[]);assert.equal(h.writes.length,1);
  const visits=h.writes[0].payload.comptesRendus;
  assert.equal(visits.length,2);assert.equal(visits[0].id,'cr-new');assert.equal(visits[1].id,'cr-old');
  assert.equal(visits[1].text,'Compte-rendu corrigé');assert.equal(visits[1].source,'tournee');assert.equal(visits[1].tourId,'tour-X');assert.equal(visits[1].custom.followUp,true);assert.equal(visits[1].usine,'');
});
test('active editor saves canonical partners in both legacy report mirrors without duplicating visits',async()=>{
  const raw={id:'cr-randal',date:'2026-11-04',text:'Texte conservé',factory:'RANDALL PRO',partenaires:['randal-pro'],tourId:'tour-X'};
  const h=reportSubmitHarness({editing:{clientId:'A',crField:'comptes_rendus',raw},data:new Map([['A',{comptes_rendus:[raw],comptesRendus:[raw]}]])});
  h.context.usineInput.value='RANDAL, Randal Pro, View';h.context.textInput.value=raw.text;
  await h.submit();
  assert.deepEqual(h.alerts,[]);assert.equal(h.writes.length,1);
  for(const field of ['comptes_rendus','comptesRendus']){
    const visits=h.writes[0].payload[field];assert.equal(visits.length,1);
    assert.equal(visits[0].usine,'Randal, View Ceramica');assert.equal(visits[0].factory,'Randal, View Ceramica');
    assert.deepEqual(visits[0].partenaires,['Randal','View Ceramica']);assert.equal(visits[0].id,raw.id);
    assert.equal(visits[0].text,raw.text);assert.equal(visits[0].tourId,raw.tourId);
  }
});
test('moving a visit is atomic and refuses to overwrite a concurrently edited original',async()=>{
  const raw={id:'cr-A',text:'Visite initiale',date:'2026-11-04'};
  const edit={clientId:'A',crIndex:0,crField:'comptes_rendus',raw};
  const changed=reportSubmitHarness({editing:edit,target:'B',data:new Map([['A',{comptes_rendus:[{...raw,text:'Coryne a corrigé'}]}],['B',{comptes_rendus:[]}]])});
  await changed.submit();assert.equal(changed.writes.length,0);assert.equal(changed.alerts.length,1);
  const readFailed=reportSubmitHarness({editing:edit,target:'B',data:new Map([['A',{comptes_rendus:[raw]}],['B',{comptes_rendus:[]}]]),failRead:'B'});
  await readFailed.submit();assert.equal(readFailed.writes.length,0);assert.equal(readFailed.alerts.length,1);
  const good=reportSubmitHarness({editing:edit,target:'B',data:new Map([['A',{comptes_rendus:[raw]}],['B',{comptesRendus:[{text:'Ancienne visite B'}]}]])});
  await good.submit();assert.equal(good.writes.length,2);assert.equal(good.writes[0].payload.comptes_rendus.length,0);assert.equal(good.writes[1].payload.comptesRendus.length,2);assert.equal(good.writes[1].payload.comptesRendus[0].id,'cr-A');
});

test('navigation save keeps the full calculated tour and updates its ID without duplicate saves',async()=>{
  const handlers=new Map(),window={addEventListener:(name,callback)=>handlers.set(name,callback),dispatchEvent:event=>handlers.get(event.type)?.(event)};
  const ready=deferred(),created=[],updated=[],fields=new Map();
  for(const id of ['tour-route','tour-start-navigation','tour-save','tour-status'])fields.set('#'+id,element());
  fields.get('#tour-route').querySelector=()=>({});
  const document={readyState:'loading',addEventListener:noop,querySelector:s=>fields.get(s)||null,querySelectorAll:()=>[]};
  const {context,run}=script('tournees-save-nav-fix.js',{document,window,db:{},serverTimestamp:()=>42,collection:()=>({}),doc:(_db,_collection,id)=>({id}),
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},MutationObserver:class {constructor(callback){this.callback=callback}observe(){this.callback()}},
    addDoc:async(_ref,payload)=>{created.push(payload);return ready.promise},updateDoc:async(ref,payload)=>updated.push({ref,payload})});
  const plan={name:'Tournée du jeudi',dateStart:'2026-11-05',dateEnd:'2026-11-05',totalDistance:12340,totalDrive:1200,start:{lat:43.6,lng:3.9},days:[{date:'2026-11-05',stops:[{clientId:'A',societe:'Magasin Alpha',arrival:'09:15',departure:'10:45',travelSeconds:1200,distanceMeters:12340,lat:43.7,lng:3.8,note:'Voir le responsable'}]}]};
  window.dispatchEvent({type:'lrf-tour-plan-ready',detail:plan});
  run('detectPlan()');context.button=fields.get('#tour-save');
  const first=run('reliableSave(button)'),second=run('reliableSave(button)');await second;
  assert.equal(created.length,1);assert.equal(created[0].totalDistance,12340);assert.equal(created[0].days[0].stops[0].arrival,'09:15');assert.equal(created[0].days[0].stops[0].travelSeconds,1200);assert.equal(created[0].days[0].stops[0].lat,43.7);
  ready.resolve({id:'tour-saved'});await first;await run('reliableSave(button)');
  assert.equal(created.length,1);assert.equal(updated.length,1);assert.equal(updated[0].ref.id,'tour-saved');assert.equal(updated[0].payload.days[0].stops[0].note,'Voir le responsable');assert.equal(Object.hasOwn(updated[0].payload,'id'),false);
});

function requestHarness({readClient,initialRequest}={}) {
  const fields=new Map(),data=new Map(),writes=[],alerts=[],mails=[];
  const getElement=s=>{if(!fields.has(s))fields.set(s,element());return fields.get(s)};
  const document={readyState:'loading',addEventListener:noop,querySelector:getElement,querySelectorAll:()=>[]};
  const store={getItem:key=>key==='agentLoggedIn'?'true':key==='agentName'?'Jérôme':null,setItem:noop,removeItem:noop};
  const snapshot=(ref)=>({id:ref.id,exists:()=>data.has(ref.collection+'/'+ref.id),data:()=>data.get(ref.collection+'/'+ref.id)});
  const {context,run}=script('demandes-clients.js',{document,localStorage:store,db:{},collection:(_db,name)=>({name}),doc:(_db,collection,id)=>({collection,id}),query:()=>({}),where:()=>({}),limit:()=>({}),onSnapshot:noop,
    getDoc:readClient|| (async ref=>snapshot(ref)),getDocs:async()=>({empty:true,docs:[]}),partnerOpeningEmail:()=>'',serverTimestamp:()=>42,alert:message=>alerts.push(message),
    fetch:async(_url,options)=>{mails.push(JSON.parse(options.body));return {ok:true,json:async()=>({success:true})}},
    runTransaction:async(_db,callback)=>{
      const staged=[];
      const result=await callback({get:async ref=>snapshot(ref),set:(ref,payload,options)=>staged.push({ref,payload,merge:options?.merge}),update:(ref,payload)=>staged.push({ref,payload,merge:true})});
      for(const write of staged){const key=write.ref.collection+'/'+write.ref.id;data.set(key,{...(write.merge?data.get(key):{}),...write.payload});writes.push(write)}
      return result;
    }
  });
  getElement('#f-societe').value='Magasin Alpha';getElement('#f-email').value='alpha@example.test';getElement('#f-cp').value='34740';
  if(initialRequest){context.request=initialRequest;run('current=request;currentClient=null;');data.set('account_requests/'+initialRequest.id,{...initialRequest});}
  return {fields,data,writes,alerts,mails,context,run};
}
test('client request validation atomically creates one client and its status, and is idempotent on stale retry',async()=>{
  const initialRequest={id:'req-A',requestType:'ouverture',status:'attente',partenaires:[],attachments:[{role:'rib',filename:'rib.pdf'},{role:'kbis',filename:'kbis.pdf'}]};
  const h=requestHarness({initialRequest});h.data.set('crm_meta/client_codes',{lastNumber:31});
  await h.run('validateRequest()');
  assert.equal(h.writes.length,3);assert.equal(h.data.get('clients/request-req-A').codeClient,'LRF-00032');assert.equal(h.data.get('account_requests/req-A').status,'validee');assert.equal(h.data.get('account_requests/req-A').clientId,'request-req-A');assert.equal(h.mails.length,1);
  // Simulate a second browser that still has the old status but sees committed data.
  h.run(`current={...request,status:'attente'};`);await h.run('validateRequest()');
  assert.equal(h.writes.length,3);assert.equal(h.mails.length,1);assert.equal([...h.data.keys()].filter(key=>key.startsWith('clients/')).length,1);assert.match(h.alerts.at(-1),/déjà été validée/);
});
test('opening two client requests cannot show the stale first client after the second opens',async()=>{
  const a=deferred(),b=deferred();
  const h=requestHarness({readClient:ref=>ref.id==='client-A'?a.promise:b.promise});
  h.run(`requests=[{id:'A',requestType:'mise_a_jour',existingClientId:'client-A',societe:'Magasin Alpha'},{id:'B',requestType:'mise_a_jour',existingClientId:'client-B',societe:'Magasin Beta'}];`);
  const first=h.run(`openRequest('A')`),second=h.run(`openRequest('B')`);
  b.resolve({id:'client-B',exists:()=>true,data:()=>({societe:'Magasin Beta'})});await second;
  a.resolve({id:'client-A',exists:()=>true,data:()=>({societe:'Magasin Alpha'})});await first;
  assert.equal(h.run('current.id'),'B');assert.equal(h.run('currentClient.id'),'client-B');assert.match(h.fields.get('#panel-title').textContent,/Magasin Beta/);
});
