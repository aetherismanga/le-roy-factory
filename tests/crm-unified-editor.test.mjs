import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {clientActivity} from '../assets/js/client-activity-core.mjs';

test('fiche, list and dashboard agree on the latest mail and retain both report schemas',()=>{
  const note={id:'visit-a',date:'2026-11-04',text:'Visite'};
  const client={societe:'PPC',comptes_rendus:[note],comptesRendus:[note,{id:'visit-b',date:'2026-11-05'}],historiqueMails:[{date:'06/11/2026',objet:'Ouverture',expediteur:'Jérôme'}]};
  const entries=clientActivity(client);
  assert.equal(entries.length,3);assert.equal(entries[0].kind,'Mail');assert.equal(entries[0].date.getDate(),6);
});

test('partner changes use the one fiche transaction and its one external form submit',async()=>{
  const html=await readFile(new URL('../clients.html',import.meta.url),'utf8');
  const editor=await readFile(new URL('../assets/js/crm-client-partner-access.js',import.meta.url),'utf8');
  assert.equal((html.match(/type="submit" form="client-form"/g)||[]).length,1);
  assert.ok(html.indexOf('</form>')<html.indexOf('id="btn-save-client"'));
  assert.doesNotMatch(editor,/runTransaction|Enregistrer les autorisations/);
  assert.match(editor,/Enregistrer la fiche/);
});

test('the client page owns one contact editor and one import action',async()=>{
  const html=await readFile(new URL('../clients.html',import.meta.url),'utf8');
  const loader=await readFile(new URL('../assets/js/firebase.js',import.meta.url),'utf8');
  const contacts=await readFile(new URL('../assets/js/crm-moovago.js',import.meta.url),'utf8');
  const integrity=await readFile(new URL('../assets/js/crm-client-integrity.js',import.meta.url),'utf8');
  assert.equal((html.match(/import "\.\/assets\/js\/crm-moovago\.js\?/g)||[]).length,1);
  assert.doesNotMatch(integrity,/dispatchEvent\(new CustomEvent\('lrf-client-opened'/);
  assert.doesNotMatch(loader,/crm-moovago\.js|client-contact-import\.js/);
  assert.doesNotMatch(html,/id="btn-import-contact-infos"/);
  assert.match(contacts,/button\.onclick=startImport/);
});

test('Infos and Interlocuteurs both enable the same editor without moving or replacing its fields',async()=>{
  const source=await readFile(new URL('../assets/js/crm-ui-modern.js',import.meta.url),'utf8');
  const start=source.indexOf('function activateTab(key)');
  const end=source.indexOf('function updateTabCounts()',start);
  const pane=(id,key)=>{
    const flags=new Set();
    return {id,dataset:{lrfPane:key},classList:{contains:name=>flags.has(name),toggle:(name,on)=>on?flags.add(name):flags.delete(name)}};
  };
  const infos=pane('infos','infos');
  const contacts=pane('crm-extra-contacts','contacts');
  const history=pane('history','history');
  const modal={dataset:{},querySelectorAll:selector=>selector==='.lrf-tab-pane'?[infos,contacts,history]:[]};
  const context=vm.createContext({document:{getElementById:()=>modal}});
  vm.runInContext(source.slice(start,end),context);

  for(const [tab, expected] of [['infos',[true,true,false]],['contacts',[false,true,false]],['history',[false,false,true]],['infos',[true,true,false]]]){
    context.activateTab(tab);
    assert.deepEqual([infos,contacts,history].map(element=>element.classList.contains('active')),expected);
    assert.equal(modal.dataset.activeTab,tab);
  }
});

test('typing a personalised opening message survives email lookup and live refresh',async()=>{
  const source=(await readFile(new URL('../assets/js/account-form-send.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  const fields=new Map(['account-send-subject','account-send-message','account-send-type','account-send-email'].map(id=>[id,{value:id==='account-send-type'?'ouverture':'',style:{}}]));
  const context=vm.createContext({window:{},document:{readyState:'loading',addEventListener(){},getElementById:id=>fields.get(id)},setTimeout,clearTimeout,console,URLSearchParams});
  vm.runInContext(source,context);vm.runInContext('fillMessage(null,true)',context);
  fields.get('account-send-subject').value='Mon objet';fields.get('account-send-message').value='Bonjour, mon texte personnalisé.';
  vm.runInContext('syncDialogClient()',context);
  assert.equal(fields.get('account-send-subject').value,'Mon objet');assert.equal(fields.get('account-send-message').value,'Bonjour, mon texte personnalisé.');
});

test('dashboard search renders one correctly labelled prospect when exact and smart results overlap',async()=>{
  const source=(await readFile(new URL('../assets/js/dashboard-commercial.js',import.meta.url),'utf8'));
  const block=source.slice(source.indexOf('function makeSearchIndex('),source.indexOf('async function googleEventsToday()'));
  const input={value:'DESTOCK',dataset:{},addEventListener(name,handler){this[name]=handler}};
  const box={innerHTML:'',classList:{add(){},remove(){}},querySelector(){return null}};
  const client={id:'ppc',societe:'DESTOCK CARRELAGE PPC',type:'prospect',ville:'Montpellier'};
  const context=vm.createContext({dashboardSearchIndex:[],PARTNER_CONTACTS:{},norm:v=>String(v).toLowerCase(),esc:String,
    document:{getElementById:id=>id==='crm-global-search'?input:box,addEventListener(){}},window:{LRFCRMSearch:{rankClients:()=>[{c:client,s:1}]},addEventListener(){}}});
  vm.runInContext(block,context);context.rows=[client];vm.runInContext('setupSearch(makeSearchIndex(rows,[],[]))',context);input.input();
  assert.equal((box.innerHTML.match(/clients.html\?edit=ppc/g)||[]).length,1);
  assert.match(box.innerHTML,/>Prospect</);
});
