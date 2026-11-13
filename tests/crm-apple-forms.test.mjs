import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
async function picker(){
  const source=await read('assets/js/comptes-rendus-simple.js');
  const functions=source.slice(source.indexOf('    const options=()=>'),source.indexOf("    function render(q='')"));
  const state={
    select:{value:'',disabled:false,options:[{value:'a',textContent:'Inoutlet (34740 Vendargues)'},{value:'b',textContent:'Même enseigne (Montpellier)'},{value:'c',textContent:'Même enseigne (Nîmes)'},{value:'__global__',disabled:true,textContent:'Tous les clients'}]},
    search:{value:'',setCustomValidity(value){this.error=value}},selectedLabel:{},changeBtn:{},
    selected:{classList:{toggle(_name,value){this.visible=value}}},
    norm:value=>String(value).toLowerCase().trim()
  };
  vm.createContext(state);vm.runInContext(functions+'\nglobalThis.api={syncChoice,resolveTypedChoice};',state);
  return {state,api:state.api,source};
}
test('typing an exact unique client selects its real ID; ambiguous names require a choice',async()=>{
  const {state,api}=await picker();state.search.value='Inoutlet';api.resolveTypedChoice();
  assert.equal(state.select.value,'a');assert.equal(state.search.error,'');
  state.search.value='Même enseigne';api.resolveTypedChoice();assert.equal(state.select.value,'');
  assert.match(state.search.error,/Choisissez un client/);assert.equal(state.search.required,true);
});
test('opening an existing report or deep link displays its canonical selected client',async()=>{
  const {state,api,source}=await picker();state.select.value='a';api.syncChoice();api.syncChoice();
  assert.equal(state.select.value,'a');assert.equal(state.search.value,'Inoutlet (34740 Vendargues)');
  assert.equal(state.search.error,'');assert.doesNotMatch(source,/setTimeout\(\(\)=>\{resetChoice/);
  assert.match(source,/select.required=false/);
});
test('a global report disables client validation and disabled campaign options are excluded from search',async()=>{
  const {state,api}=await picker();state.select.value='__global__';state.select.disabled=true;api.syncChoice();
  assert.equal(state.search.disabled,true);assert.equal(state.search.error,'');
  state.select.disabled=false;state.search.value='Tous les clients';api.resolveTypedChoice();assert.equal(state.select.value,'');
});
test('report startup waits for restored verified identity before subscribing',async()=>{
  const html=await read('comptes-rendus.html');
  const start=html.indexOf('const profile = await new Promise');
  const end=html.indexOf('      const $=id=>',start);
  let verify,stopCount=0;
  const state={auth:{},onAuthStateChanged(_auth,callback){queueMicrotask(()=>callback({uid:'coryne'}));return()=>stopCount++},
    verifiedAgentProfile:()=>new Promise(resolve=>{verify=resolve})};
  vm.createContext(state);
  const pending=vm.runInContext('(async()=>{'+html.slice(start,end)+'return profile})()',state);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(stopCount,0);
  verify({name:'Coryne'});assert.equal((await pending).name,'Coryne');assert.equal(stopCount,1);
  assert.doesNotMatch(html,/ville=await villeFromCP/);
});

async function reportEditor({failure=false}={}){
  const {withReportPartners,reportPartners}=await import('../assets/js/crm-report-partners.mjs');
  const {reportField,reportFingerprint,unchangedReportIndex}=await import('../assets/js/crm-report-core.mjs');
  const html=await read('comptes-rendus.html');
  const handler=html.slice(html.indexOf('      form.addEventListener("submit",async e=>{'),html.indexOf('      [searchInput,filterDate,filterEnd]'));
  const state={console:{error(){}},withReportPartners,reportPartners,reportField,reportFingerprint,unchangedReportIndex,Date,
    db:{},saving:false,editing:null,clientSelect:{value:'a'},dateInput:{value:'2026-11-13'},authorSelect:{value:'Coryne'},textInput:{value:'Visite BILT'},usineInput:{value:'BILT'},
    button:{disabled:false,textContent:'Enregistrer'},closed:false,alerts:[],writes:[],data:{comptes_rendus:[{id:'earlier',text:'Conserver'}]},
    form:{addEventListener(_event,callback){state.submit=callback}},$:()=>state.button,
    doc:(_db,name,id)=>({name,id}),alert:message=>state.alerts.push(message),
    closeModal:()=>{if(!state.saving)state.closed=true},
    runTransaction:async(_db,fn)=>{await Promise.resolve();if(failure)throw Error('Connexion interrompue');await fn({get:async()=>({exists:()=>true,data:()=>state.data}),update:(_ref,patch)=>state.writes.push(patch)})}
  };
  vm.createContext(state);vm.runInContext(handler,state);return state;
}
test('a report is saved once, retains previous visits and closes only after success',async()=>{
  const state=await reportEditor();await Promise.all([state.submit({preventDefault(){}}),state.submit({preventDefault(){}})]);
  assert.equal(state.writes.length,1);assert.equal(state.writes[0].comptes_rendus.length,2);
  assert.equal(state.writes[0].comptes_rendus[1].id,'earlier');assert.equal(state.closed,true);assert.equal(state.saving,false);
});
test('a failed report transaction leaves the entered visit available for retry',async()=>{
  const state=await reportEditor({failure:true});await state.submit({preventDefault(){}});
  assert.equal(state.writes.length,0);assert.equal(state.closed,false);assert.equal(state.textInput.value,'Visite BILT');
  assert.equal(state.saving,false);assert.equal(state.button.disabled,false);assert.equal(state.alerts[0],'Connexion interrompue');
});
