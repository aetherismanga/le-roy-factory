import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = name => readFileSync(new URL('../assets/js/'+name,import.meta.url),'utf8');
const storage = () => {
  const values = new Map();
  return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
};

test('selection badges and ELIOS price gate track live manufacturer rights rather than stale local partner lists',()=>{
  const allowed=new Set(),sessionStorage=storage();
  sessionStorage.setItem('lrfProSession',JSON.stringify({partenaires:['elios-ceramica','view-ceramica','la-fenice']}));
  const window={LRF_AGENT_TARIFFS:{canAccess:partner=>allowed.has(partner)}};
  const context={window,document:{querySelector(){return null;}},sessionStorage};vm.createContext(context);
  const code=source('inspirations-v2.js'),stop=code.indexOf('  const COLOR_RULES=');
  vm.runInContext(code.slice(0,stop)+'window.testAccess=hasAccess;})();',context);
  assert.equal(window.testAccess('elios-ceramica'),false);assert.equal(window.testAccess('view-ceramica'),false);
  assert.equal(window.testAccess('la-fenice'),true,'Existing PDF access badge behavior stays unchanged');
  sessionStorage.removeItem('lrfProSession');allowed.add('elios-ceramica');
  assert.equal(window.testAccess('elios-ceramica'),true,'Live ELIOS rights work even if the local partner snapshot is stale');
  assert.equal(window.testAccess('view-ceramica'),false);allowed.add('view-ceramica');assert.equal(window.testAccess('view-ceramica'),true);
  allowed.clear();assert.equal(window.testAccess('elios-ceramica'),false);
});

for (const filename of ['inspirations-view-v1.js','inspirations-view-mobile-safe.js']) test(filename+' uses VIEW rights independently of an established ELIOS identity',()=>{
  const allowed = new Set(['elios-ceramica']);
  const window = {VIEW_CATALOGUE:[{id:'test',variants:[]}],LRF_AGENT_TARIFFS:{verified:true,canAccess:partner=>allowed.has(partner)},addEventListener(){}};
  const document = {readyState:'loading',addEventListener(){},querySelector(){return null;}};
  const code = source(filename),end=code.lastIndexOf('})();');
  const context = {window,document,sessionStorage:storage()};vm.createContext(context);
  vm.runInContext(code.slice(0,end)+'window.testAccess=hasViewAccess;'+code.slice(end),context);
  assert.equal(window.testAccess(),false);
  allowed.add('view-ceramica');assert.equal(window.testAccess(),true);
  allowed.clear();assert.equal(window.testAccess(),false);
});

test('ELIOS consumer uses only ELIOS server rights and keeps format-specific quotes',()=>{
  const allowed = new Set(['view-ceramica']);
  const quotes = {'5x15':{label:'Synthetic format A'},'10x10':{label:'Synthetic format B'}};
  const window = {LRF_AGENT_TARIFFS:{verified:true,canAccess:partner=>allowed.has(partner),eliosPrice:(_product,format)=>quotes[format]||{unavailable:true}}};
  const context = {window,document:{readyState:'loading',addEventListener(){}},sessionStorage:storage()};vm.createContext(context);vm.runInContext(source('inspirations-elios-pricing.js'),context);
  const api = window.LRF_INSPIRATIONS_PRICING;
  assert.equal(api.canAccess('elios'),false);assert.equal(api.getPrice('elios',{},'5x15').locked,true);
  allowed.add('elios-ceramica');
  assert.equal(api.canAccess('elios-ceramica'),true);
  assert.equal(api.getPrice('elios-ceramica',{},'5x15'),quotes['5x15']);
  assert.equal(api.getPrice('elios-ceramica',{},'10x10'),quotes['10x10']);
  assert.equal(api.getPrice('elios',{},'missing').unavailable,true);
  assert.equal(api.getPrice('view-ceramica',{},'5x15'),null);
  allowed.clear();assert.equal(api.getPrice('elios',{},'10x10').locked,true);
});

test('session bridge cannot turn local admin fields into tariff rights and broadcasts explicit logout',()=>{
  let permitted=false;
  const events=[],sessionStorage=storage(),localStorage=storage();
  const window={location:{pathname:'/tarifs-pro.html'},dispatchEvent:event=>events.push(event),LRF_INSPIRATIONS_PRICING:{canAccess:()=>permitted,getPrice:()=>permitted?{label:'Synthetic quote'}:{locked:true}}};
  const document={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {};},head:{appendChild(){}}};
  const context={window,document,sessionStorage,localStorage,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},console};vm.createContext(context);
  const code=source('pro-session-bridge.js'),end=code.lastIndexOf('})();');
  vm.runInContext(code.slice(0,end)+'patchPricingApi();'+code.slice(end),context);
  const api=window.LRF_INSPIRATIONS_PRICING;
  window.LRF_PRO_SESSION.writeAdmin({email:'jerome@leroyfactory.fr'});
  assert.equal(api.canAccess('elios-ceramica'),false);assert.equal(api.getPrice('elios',{},'5x15').locked,true);
  window.LRF_PRO_SESSION.clear();
  assert.equal(sessionStorage.getItem('lrfProSession'),null);assert.equal(sessionStorage.getItem('lrfProSession1h'),null);
  assert.equal(events.at(-1).type,'lrf-pro-session-changed');assert.equal(events.at(-1).detail,null);
  permitted=true;assert.equal(api.canAccess('elios-ceramica'),true,'Server-authorized tariff identity does not depend on local UI session fields');
});

test('PRO page logout clears both catalogue session copies and saved device tokens',()=>{
  const events=[],sessionStorage=storage(),localStorage=storage();
  sessionStorage.setItem('lrfProSession','old');sessionStorage.setItem('lrfProSession1h','old');sessionStorage.setItem('lrfProSessionToken','synthetic');localStorage.setItem('lrfProRememberToken','synthetic');
  const context={window:{LRF_PRO_CONTEXT:{},dispatchEvent:event=>events.push(event)},document:{readyState:'loading',addEventListener(){}},sessionStorage,localStorage,getApps:()=>[{}],getApp:()=>({}),getAuth:()=>({}),CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}};
  vm.createContext(context);vm.runInContext(source('tarifs-pro-client-access.js').replace(/^import .*;\n/gm,'')+'\nglobalThis.testClear=clearSession;',context);
  context.testClear({forgetDevice:true});
  for(const key of ['lrfProSession','lrfProSession1h','lrfProSessionToken'])assert.equal(sessionStorage.getItem(key),null);
  assert.equal(localStorage.getItem('lrfProRememberToken'),null);assert.equal(context.window.LRF_PRO_CONTEXT,null);assert.equal(events.at(-1).detail,null);
});
