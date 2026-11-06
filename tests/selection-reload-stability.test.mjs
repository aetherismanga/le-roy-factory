import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const original=readFileSync(new URL('../assets/js/inspirations-v2.js',import.meta.url),'utf8');
// Mock only the network/module transport; the real controller, URL/history
// handling, event subscriptions and DOM replacement decisions run unchanged.
const source=original.replace(/import\('\.\/opal-catalogue\.js\?[^']+'\)/,'loadOpal()');
assert.notEqual(source,original,'OPAL module-loading seam must be present');
function harness(initial='https://leroyfactory.fr/univers.html?partner=Opal',{initialShell=false}={}){
  let current=new URL(initial),imports=0;const windows=new Map(),nodes=new Map(),writes=[],ready=[];
  class Node{
    constructor(id){this.id=id;this.dataset={};this.style={};this.value='';this.hidden=false;this.isConnected=true;this.handlers=new Map();this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c),toggle:c=>this.classes.has(c)?this.classes.delete(c):this.classes.add(c)};}
    set innerHTML(value){this.html=value;writes.push({id:this.id,html:value});if(this.opal)this.opal.isConnected=false;this.opal=value.includes('data-opal-catalogue-content')?new Node('opal-target'):null;}
    get innerHTML(){return this.html||'';}
    set textContent(value){this.text=value;writes.push({id:this.id,text:value});}
    get textContent(){return this.text||'';}
    querySelector(selector){if(selector==='[data-opal-catalogue-content]')return this.opal||null;if(selector==='span')return get('count-hint');return null;}
    setAttribute(name,value){this[name]=String(value);}
    addEventListener(name,handler){if(!this.handlers.has(name))this.handlers.set(name,[]);this.handlers.get(name).push(handler);}
    scrollIntoView(){throw Error('Selection restoration must not force scroll');}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
  get('partner-count').parentElement=get('count-parent');
  if(initialShell)get('partner-products').opal=new Node('initial-opal-target');
  const location={get href(){return current.href;},get search(){return current.search;},get pathname(){return current.pathname;},get hash(){return current.hash;}};
  const entries=[{url:current.href,state:null}];let index=0;
  const history={get state(){return entries[index].state;},pushState(state,unused,url){current=new URL(url,current);entries.splice(++index);entries.push({url:current.href,state});},replaceState(state,unused,url){current=new URL(url,current);entries[index]={url:current.href,state};}};
  const document={documentElement:{dataset:{}},body:{style:{}},getElementById:get,querySelector:selector=>selector.startsWith('#')?get(selector.slice(1)):null};
  const window={LRF_PRO_SESSION:{read:()=>({})},ELIOS_CATALOGUE:[{slug:'roma',name:'Roma',category:'Carrelage',formats:['60x60'],colors:['White']}],LRF_ELIOS_SELECTION_MODEL:{groupPools:items=>items,isPool:()=>false},addEventListener(name,fn){if(!windows.has(name))windows.set(name,[]);windows.get(name).push(fn);},dispatchEvent(event){if(event.type==='lrf-selection-ready')ready.push(event.detail);for(const fn of windows.get(event.type)||[])fn(event);}};
  const loadOpal=()=>{imports++;return new Promise(()=>{});};
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  vm.runInNewContext(source,{window,document,location,history,URL,URLSearchParams,CustomEvent,loadOpal,console},{filename:'inspirations-v2.js'});
  const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
  const click=(id,data)=>{for(const fn of get(id).handlers.get('click')||[])fn({target:{closest:()=>({dataset:data})}});};
  const back=()=>{if(index>0){index--;current=new URL(entries[index].url);emit('popstate');}};
  const forward=()=>{if(index+1<entries.length){index++;current=new URL(entries[index].url);emit('popstate');}};
  const filter=(id,value)=>{get(id).value=value;for(const fn of get(id).handlers.get(id==='v2-search'?'input':'change')||[])fn({target:{value}});};
  return {window,document,get,writes,ready,entries,back,forward,click,emit,filter,read:()=>window.LRF_SELECTION_NAVIGATION.read(),url:()=>current,get imports(){return imports;}};
}

test('an OPAL deep link commits its requested state first, preserving the initial shell',()=>{
  const h=harness('https://leroyfactory.fr/univers.html?cat=robinetterie&partner=opal-home&collection=aixa&utm_source=client',{initialShell:true});
  assert.equal(h.read().category,'robinetterie');assert.equal(h.read().partner,'Opal');
  assert.equal(h.document.documentElement.dataset.lrfSelectionPartner,'opal');assert.equal(h.document.documentElement.dataset.lrfSelectionReady,'true');
  assert.equal(h.ready[0].partner,'Opal');assert.equal(h.imports,1);assert.equal(h.get('partner-products').opal.id,'initial-opal-target');
  assert.deepEqual(h.writes.filter(x=>x.id==='workspace-title').map(x=>x.text),['Opal']);
  assert.equal(h.url().searchParams.get('collection'),'aixa');assert.equal(h.url().searchParams.get('utm_source'),'client');
});

test('session restore, verified tariff events, pageshow and duplicate choices never remount OPAL',()=>{
  const h=harness(undefined,{initialShell:true});const mounted=h.get('partner-products').opal;
  h.emit('lrf-pro-session-changed');h.emit('lrf-agent-tariffs-ready');h.emit('pageshow');
  h.click('partner-grid',{partner:'Opal'});h.click('insp-categories',{cat:'robinetterie'});
  assert.equal(h.imports,1);assert.equal(h.get('partner-products').opal,mounted);assert.equal(mounted.isConnected,true);
  assert.equal(h.entries.length,1,'access refresh and redundant clicks create no history entries');
  assert.equal(h.writes.filter(x=>x.id==='partner-products').length,0,'the static/live shell stays mounted');
});

test('explicit choices update the URL; Back/Forward restore the correct manufacturer directly',()=>{
  const h=harness('https://leroyfactory.fr/univers.html?partner=Opal&collection=aixa&utm_source=client');
  h.click('insp-categories',{cat:'carrelage'});assert.equal(h.url().searchParams.get('partner'),'elios-ceramica');assert.equal(h.url().searchParams.get('collection'),null);
  h.click('partner-grid',{partner:'View Ceramica'});assert.equal(h.url().searchParams.get('partner'),'view-ceramica');assert.equal(h.read().partner,'View Ceramica');
  h.back();assert.equal(h.read().partner,'Elios Ceramica');
  const start=h.writes.length;h.back();assert.equal(h.read().partner,'Opal');assert.equal(h.url().searchParams.get('collection'),'aixa');
  assert.deepEqual(h.writes.slice(start).filter(x=>x.id==='workspace-title').map(x=>x.text),['Opal']);
  h.forward();assert.equal(h.read().partner,'Elios Ceramica');assert.equal(h.url().searchParams.get('utm_source'),'client');
});

test('valid URL filters survive initial rendering, access refreshes and history snapshots',()=>{
  const h=harness('https://leroyfactory.fr/univers.html?partner=elios&format=60x60&q=Roma&collection=roma');
  assert.equal(h.read().format,'60x60');assert.equal(h.get('v2-format').value,'60x60');assert.equal(h.get('v2-search').value,'Roma');
  h.emit('lrf-pro-session-changed');assert.equal(h.get('v2-format').value,'60x60');
  h.filter('v2-search','Roma Natural');assert.equal(h.url().searchParams.get('q'),'Roma Natural');assert.equal(h.url().searchParams.get('collection'),'roma');
  h.click('insp-categories',{cat:'robinetterie'});h.back();assert.equal(h.read().q,'Roma Natural');assert.equal(h.read().format,'60x60');
});

test('route normalization rejects unknown manufacturers/categories without mixing an invalid pair',()=>{
  for(const [query,category,partner] of [
    ['?category=meubles&partner=Opal','robinetterie','Opal'],
    ['?category=meubles&partner=petracers','meubles',"Petracer's"],
    ['?category=piscine','carrelage','Elios Ceramica'],
    ['?category=unknown&partner=unknown','carrelage','Elios Ceramica'],
    ['?category=meubles','meubles','Randal Pro'],
    ['?partner=Aquahome','robinetterie','Aquahome']
  ]){const h=harness('https://leroyfactory.fr/univers.html'+query);assert.equal(h.read().category,category);assert.equal(h.read().partner,partner);}
});
