import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { cloneExtra, extraPatch, assertImportUnchanged } from '../assets/js/crm-extra-save-core.mjs';

test('import analysis does not mutate contacts or reports in its saved baseline', () => {
  const original={id:'a',contacts:[{nom:'Martin',fixe:'0467000000',custom:{role:'responsable'}}],comptes_rendus:[{text:'Visite'}]};
  const planned=cloneExtra(original);
  planned.contacts[0].nom='Durand';
  planned.comptes_rendus.push({text:'Nouvelle visite'});
  assert.equal(original.contacts[0].nom,'Martin');
  assert.equal(original.comptes_rendus.length,1);
  assert.deepEqual(Object.keys(extraPatch(original,planned)).sort(),['comptes_rendus','contacts']);
});

test('an import patch preserves unrelated new fields and rejects concurrent changes to the same field', () => {
  const before={societe:'Magasin',contacts:[{nom:'Martin'}],photoFacade:{url:'https://example.org/facade.jpg'}};
  const planned={...before,contacts:[{nom:'Martin',mobile:'0600000000'}]};
  const patch=extraPatch(before,planned);
  assert.deepEqual(Object.keys(patch),['contacts']);
  const current={...before,photoFacade:{url:'https://example.org/nouvelle.jpg'}};
  assert.doesNotThrow(()=>assertImportUnchanged(current,before,patch));
  const result={...current,...patch};
  assert.equal(result.photoFacade.url,'https://example.org/nouvelle.jpg');
  assert.throws(()=>assertImportUnchanged({...current,contacts:[{nom:'Coryne a modifié'}]},before,patch),/fiche a changé/);
  assert.doesNotThrow(()=>assertImportUnchanged(result,before,patch)); // idempotent retry
});

test('unchanged import records generate no write and special Firestore values keep their type', () => {
  class Timestamp { constructor(seconds){this.seconds=seconds;} }
  const before={id:'a',createdAt:new Timestamp(10),contacts:[]};
  const after=cloneExtra(before);
  assert.equal(after.createdAt,before.createdAt);
  assert.deepEqual(extraPatch(before,after),{});
});

async function sandboxModule(file,exposed){
  const core=(await readFile(new URL('../assets/js/crm-extra-save-core.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
  const source=(await readFile(new URL(`../assets/js/${file}`,import.meta.url),'utf8'))
    .replace(/^import .*;\s*$/gm,'')
    .replace(/^if\s*\(document\.readyState[\s\S]*$/m,'');
  const context=vm.createContext({console});
  vm.runInContext(`
    const elements={
      'client-modal':{dataset:{clientId:'a'},querySelector(){return null}},
      'crm-contacts-list':{innerHTML:'',querySelectorAll(){return []}},
      'crm-history-list':{innerHTML:''},
      'edit-activity':{value:''},
      'edit-pro-access-key':{value:''},
      'edit-email':{value:'',closest(){return null}},
      'extra-emails-wrap':{},
      'extra-emails-container':{innerHTML:''}
    };
    const handlers={};
    const window={addEventListener(name,fn){(handlers[name]??=[]).push(fn)}};
    const document={readyState:'loading',getElementById(id){return elements[id]||null},querySelectorAll(){return []},addEventListener(){}};
    const sessionStorage={setItem(){},removeItem(){},getItem(){return ''}};
    class MutationObserver{observe(){}}
    function getComputedStyle(){return {display:'flex'}};
    ${core}\n${source}\nconst exposed={${exposed}};
  `,context);
  return {run:code=>vm.runInContext(code,context)};
}

test('contacts draft keeps hidden fields and a simple fiche save produces no contacts patch', async()=>{
  const module=await sandboxModule('crm-moovago.js','populateExtras');
  assert.equal(module.run(`
    exposed.populateExtras({id:'a',contacts:[{nom:'Martin',fixe:'0467000000',privateTag:'keep'}]},true);
    JSON.stringify(window.LRFClientExtras.getPatch());
  `),'{}');
  assert.equal(module.run(`
    contactDraft[0].nom='Durand';
    exposed.populateExtras({id:'a',contacts:[{nom:'Autre valeur serveur'}]});
    JSON.stringify(window.LRFClientExtras.getPatch());
  `),'{'+'"contacts":[{"nom":"Durand","fixe":"0467000000","privateTag":"keep"}]'+'}');
  assert.equal(module.run(`JSON.stringify(window.LRFClientExtras.getBaseline())`),'{"contacts":[{"nom":"Martin","fixe":"0467000000","privateTag":"keep"}]}');
  assert.equal(module.run(`elements['client-modal'].dataset.clientId='b';JSON.stringify(window.LRFClientExtras.getPatch())`),'{}');
});

test('Apple autofill without input events is read at save time and keeps historic fields',async()=>{
  const module=await sandboxModule('crm-moovago.js','populateExtras');
  const patch=module.run(`
    exposed.populateExtras({id:'a',contacts:[{nom:'Martin',fixe:'0467000000',privateTag:'keep'}]},true);
    document.querySelectorAll=()=>[{value:'Durand',dataset:{k:'nom'},closest:()=>({dataset:{ci:'0'}})}];
    JSON.stringify(window.LRFClientExtras.getPatch());
  `);
  assert.deepEqual(JSON.parse(patch),{contacts:[{nom:'Durand',fixe:'0467000000',privateTag:'keep'}]});
});

test('activity draft survives snapshots and cannot be saved against a different client', async()=>{
  const module=await sandboxModule('crm-client-enhancements.js','refreshOpenClient');
  assert.equal(module.run(`exposed.refreshOpenClient({id:'a',categorieActivite:'architecte'},true);JSON.stringify(window.LRFClientEnhancements.getPatch())`),'{}');
  assert.equal(module.run(`elements['edit-activity'].value='cuisiniste';exposed.refreshOpenClient({id:'a',categorieActivite:'plombier'});JSON.stringify(window.LRFClientEnhancements.getPatch())`),'{"categorieActivite":"cuisiniste"}');
  assert.equal(module.run(`elements['client-modal'].dataset.clientId='b';JSON.stringify(window.LRFClientEnhancements.getPatch())`),'{}');
});

test('email edits are captured once by the main save and stay attached to the exact client',async()=>{
  const module=await sandboxModule('client-direct-email.js','setupEvents');
  assert.equal(module.run(`clients=[{id:'a',email:'contact@magasin.fr',emails:[]}];exposed.setupEvents();JSON.stringify(window.LRFClientEmail.getPatch())`),'{}');
  assert.equal(module.run(`elements['edit-email'].value='nouveau@magasin.fr';window.LRFClientEmail.initializeOpenDraft();JSON.stringify(window.LRFClientEmail.getPatch())`),'{"emails":["nouveau@magasin.fr"]}');
  assert.equal(module.run(`JSON.stringify(window.LRFClientEmail.getBaseline())`),'{"emails":[]}');
  assert.equal(module.run(`elements['client-modal'].dataset.clientId='b';JSON.stringify(window.LRFClientEmail.getPatch())`),'{}');
});

test('import refuses ambiguous agencies and ignores archived matches',async()=>{
  const module=await sandboxModule('crm-moovago.js','findExisting,contactKey,crKey');
  assert.throws(()=>module.run(`exposed.findExisting([
    {id:'a',societe:'Magasin',codePostal:'34000',ville:'Montpellier'},
    {id:'b',societe:'Magasin',codePostal:'34000',ville:'Montpellier'}
  ],{societe:'Magasin',codePostal:'34000',ville:'Montpellier'})`),/ambiguë/);
  assert.equal(module.run(`exposed.findExisting([
    {id:'old',archived:true,moovagoId:'m',societe:'Magasin'},
    {id:'current',moovagoId:'m',societe:'Magasin'}
  ],{moovagoId:'m',societe:'Magasin'}).id`),'current');
  assert.equal(module.run(`exposed.contactKey({email:'accueil@magasin.fr',prenom:'Anne'})===exposed.contactKey({email:'accueil@magasin.fr',prenom:'Luc'})`),false);
  assert.equal(module.run(`exposed.crKey({date:'2026-11-05',text:'Prix 10 €'})===exposed.crKey({date:'2026-11-05',text:'Prix 1.0 €'})`),false);
});

test('direct mail uses the authenticated token and server history once without sending real mail',async()=>{
  const module=await sandboxModule('client-direct-email.js','sendDirectMail');
  const result=await module.run(`(async()=>{
    const requests=[];const notices=[];
    globalThis.auth={currentUser:{async getIdToken(){return 'test-token'}}};
    globalThis.fetch=async(url,init)=>{requests.push({url,headers:init.headers,body:JSON.parse(init.body)});return {ok:true,async json(){return {success:true}}}};
    globalThis.alert=message=>notices.push(message);
    elements['client-mail-sender']={value:'jerome'};
    elements['client-mail-subject']={value:'Test interne'};
    elements['client-mail-body']={value:'Message de test'};
    elements['client-mail-send']={disabled:false,textContent:''};
    document.querySelectorAll=selector=>selector==='.client-mail-recipient:checked'?[{value:'test@example.org'}]:[];
    currentMailClient={id:'client-exact',societe:'Test'};
    await Promise.all([exposed.sendDirectMail(),exposed.sendDirectMail()]);
    return JSON.stringify({requests,notices,busy:sendingMail});
  })()`);
  const data=JSON.parse(result);
  assert.equal(data.requests.length,1);
  assert.equal(data.requests[0].headers.Authorization,'Bearer test-token');
  assert.deepEqual(data.requests[0].body.clientIds,['client-exact']);
  assert.equal(data.notices.length,1);
  assert.match(data.notices[0],/pris en charge/);
  assert.equal(data.busy,false);
});
