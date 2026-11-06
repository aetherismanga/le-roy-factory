import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import * as rules from '../assets/js/client-form-core.mjs';
import { verifiedFacade } from '../assets/js/client-facade-sources.mjs';

async function editor({fresh=false,current={},draft={},baseline={}}={}) {
  const html=await readFile(new URL('../clients.html',import.meta.url),'utf8');
  const start=html.indexOf('document.getElementById("client-form")?.addEventListener("submit", async event => {');
  const end=html.indexOf('// 5. Synchronisation',start);
  const handler=html.slice(start,end).trim().replace(/;$/,'');
  const writes=[],alerts=[],events=[],store=new Map();
  if(!fresh)store.set('clients/a',current);
  const submit={textContent:'Enregistrer',disabled:false};
  const state={...rules,console:{error(){}},crypto:webcrypto,TextEncoder,Date,Uint8Array,
    currentEditingId:fresh?null:'a',draftClientRef:{id:'a',path:'clients/a'},saving:false,
    baselineClient:baseline,baselineForm:baseline,baselineDocuments:[],baselineReports:[],currentCRList:[],
    readForm:()=>({societe:'Magasin',codePostal:'34000',adresse:'1 Rue A',ville:'Montpellier',...draft}),
    prepareDocuments:async()=>[],profile:{email:'jerome@leroyfactory.fr'},db:{},
    getDocs:async()=>({docs:[]}),collection:(_db,name)=>({name}),
    doc:(_db,collection,id)=>({id,path:collection+'/'+id}),
    runTransaction:async(_db,callback)=>callback({
      get:async ref=>({exists:()=>store.has(ref.path),data:()=>store.get(ref.path)}),
      set:(ref,patch)=>{writes.push({path:ref.path,patch});store.set(ref.path,patch)},
      update:(ref,patch)=>{writes.push({path:ref.path,patch});store.set(ref.path,{...store.get(ref.path),...patch})}
    }),
    alert:message=>alerts.push(message),closeModal:()=>events.push('closed'),
    CustomEvent:class{constructor(name,options){this.type=name;this.detail=options.detail}},
    window:{LRFClientFacade:{prepareSave:async()=>({})},dispatchEvent:event=>events.push(event)},
    document:{getElementById:()=>({addEventListener:(_name,callback)=>{state.callback=callback}}),querySelectorAll:()=>[submit],querySelector:()=>submit}
  };
  const helperStart=html.indexOf('function serverForm(client)');
  const helperEnd=html.indexOf('// Modale',helperStart);
  vm.runInNewContext(html.slice(helperStart,helperEnd)+'\n'+handler,state);
  return {state,writes,alerts,events,save:()=>state.callback({preventDefault(){}})};
}

test('real new-client submit imports getDocs, reserves identity and creates only once',async()=>{
  const editorState=await editor({fresh:true});
  await Promise.all([editorState.save(),editorState.save()]);
  assert.equal(editorState.alerts.length,0);
  assert.equal(editorState.writes.filter(x=>x.path==='clients/a').length,1);
  assert.equal(editorState.writes.filter(x=>x.path.startsWith('crmClientIdentities/')).length,1);
  assert.equal(editorState.events.filter(e=>e.type==='lrf-client-saved').length,1);
  assert.equal(editorState.state.saving,false);
});
test('real existing-client save preserves remotely edited notes and hidden contacts when unchanged',async()=>{
  const baseline={societe:'Magasin',codePostal:'34000',adresse:'1 Rue A',ville:'Montpellier',notes:'Avant'};
  const client={...baseline,notes:'Ajout Coryne',contacts:[{nom:'Contact récent'}]};
  const e=await editor({current:client,baseline,draft:{notes:'Avant'}});await e.save();
  assert.equal(e.alerts.length,0);
  assert.equal('notes' in e.writes[0].patch,false);
  assert.equal('contacts' in e.writes[0].patch,false);
});
test('real existing-client save refuses a conflicting edit and keeps the editor open',async()=>{
  const baseline={societe:'Magasin',codePostal:'34000',adresse:'1 Rue A',ville:'Montpellier',notes:'Avant'};
  const e=await editor({current:{...baseline,notes:'Ajout Coryne'},baseline,draft:{notes:'Ajout Jérôme'}});await e.save();
  assert.equal(e.writes.length,0);assert.match(e.alerts[0],/modifiée ailleurs/);
  assert.equal(e.events.includes('closed'),false);
});
test('verified facade requires the actual company and town, with address guard for two La Garde shops',()=>{
  assert.ok(verifiedFacade({societe:'BONIFAY flassant',codePostal:'83340',ville:'Flassans sur issole'}));
  assert.ok(verifiedFacade({societe:'BONIFAY sanary',codePostal:'83110',ville:'Sanary sur mer'}));
  assert.equal(verifiedFacade({societe:'BONIFAY sanary',codePostal:'83170',ville:'Tourves'}),null);
  assert.ok(verifiedFacade({societe:'Mondial Carrelages',codePostal:'34740',ville:'Vendargues'}));
  assert.equal(verifiedFacade({societe:'Mondial Carrelages',codePostal:'13240',ville:'Septèmes-les-Vallons'}),null);
  assert.equal(verifiedFacade({societe:'BONIFAY la garde',codePostal:'83130',ville:'La garde'}),null);
  assert.match(verifiedFacade({societe:'BONIFAY la garde',codePostal:'83130',ville:'La garde',adresse:'964 Chemin des Plantades'}).sourceUrl,/showroom/);
  assert.match(verifiedFacade({societe:'BONIFAY la garde',codePostal:'83130',ville:'La garde',adresse:'873 Chemin des Plantades'}).sourceUrl,/agence/);
});


test('real client save retains reports from both schemas while adding a new visit',async()=>{
  const baseline={societe:'Magasin',codePostal:'34000',adresse:'1 Rue A',ville:'Montpellier'};
  const e=await editor({current:{...baseline,comptes_rendus:[{id:'modern'}],comptesRendus:[{id:'legacy'}]},baseline});
  e.state.baselineReports=[{id:'modern'},{id:'legacy'}];
  e.state.currentCRList=[...e.state.baselineReports,{id:'new'}];
  await e.save();
  assert.equal(e.alerts.length,0);
  assert.deepEqual(Array.from(e.writes[0].patch.comptes_rendus,report=>report.id),['modern','legacy','new']);
});


test('a successful explicit partner save becomes the baseline for the next fiche save',async()=>{
  const baseline={societe:'Magasin',codePostal:'34000',adresse:'1 Rue A',ville:'Montpellier',partenaires:['elios']};
  const e=await editor({current:{...baseline,partenaires:['elios','view']},baseline});
  e.state.window.LRFClientPartnerAccess={getPatch:()=>({partenaires:['elios','view','opal']}),getBaseline:()=>({partenaires:['elios','view']})};
  await e.save();assert.equal(e.alerts.length,0);
  assert.deepEqual(Array.from(e.writes[0].patch.partenaires),['elios','view','opal']);
});

test('the single fiche save refuses concurrent partner permission changes',async()=>{
  const baseline={societe:'Magasin',codePostal:'34000',adresse:'1 Rue A',ville:'Montpellier',partenaires:['elios']};
  const e=await editor({current:{...baseline,partenaires:['elios','opal']},baseline});
  e.state.window.LRFClientPartnerAccess={getPatch:()=>({partenaires:['elios','view']}),getBaseline:()=>({partenaires:['elios']})};
  await e.save();assert.equal(e.writes.length,0);assert.match(e.alerts[0],/modifiée ailleurs/);
});

test('a late direct-link request for the already open client never resets the draft',async()=>{
  const html=await readFile(new URL('../clients.html',import.meta.url),'utf8');
  const start=html.indexOf('function openModal(docId = null)');
  const end=html.indexOf('function closeModal()',start);
  const context={saving:false,currentEditingId:'a',canonicalId:id=>id,modal:{style:{display:'flex'}},document:{getElementById(){throw Error('Draft must not be reset')}}};
  vm.runInNewContext(html.slice(start,end)+';openModal("a")',context);
});


test('mobile creation shortcut is consumed only by the authenticated client controller',async()=>{
  const html=await readFile(new URL('../clients.html',import.meta.url),'utf8');
  const start=html.indexOf('function consumeNewClientShortcut()');
  const end=html.indexOf("window.addEventListener('hashchange'",start);
  let opened=0,changed=0,replaced='';const type={value:'',dispatchEvent(){changed++}};
  const context={URLSearchParams,saving:false,location:{hash:'#new-prospect',pathname:'/clients.html',search:'?filter=prospect'},openModal(){opened++},document:{getElementById(){return type}},Event:class{},history:{replaceState(_a,_b,url){replaced=url}}};
  vm.runInNewContext(html.slice(start,end)+';consumeNewClientShortcut()',context);
  assert.equal(opened,1);assert.equal(type.value,'prospect');assert.equal(changed,1);assert.equal(replaced,'/clients.html?filter=prospect');
  context.location.hash='';context.location.search='?action=new-client';
  vm.runInNewContext(html.slice(start,end)+';consumeNewClientShortcut()',context);
  assert.equal(opened,2);assert.equal(type.value,'client');assert.equal(replaced,'/clients.html');
});
