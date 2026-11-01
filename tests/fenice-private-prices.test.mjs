import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as priceModule from '../assets/js/fenice-price-lookup.mjs';

const record = (description,format,amount,extra={}) => ({description,format,amount,unit:'m²',condition:'',...extra});
const catalogue = [{name:'Stone'},{name:'Prime Stone'},{name:'Touch'},{name:'Touch Evo'},{name:'Allure'},{name:'Aspen'}];
test('dimension matching accepts decimal commas, rotated formats and multiplication symbols',() => {
 assert.equal(priceModule.normaliseFormat('60 × 7,5 cm'),'7.5x60');
 assert.equal(priceModule.normaliseFormat('7.5x60'),'7.5x60');
 assert.equal(priceModule.normaliseFormat('sur demande'),'');
 assert.notEqual(priceModule.normaliseFormat('30x30 + 5x5'),priceModule.normaliseFormat('30x30'));
});
test('long collection names cannot leak into short collection names',() => {
 const rows=[record('PRIME STONE - TOUCH EVO','60x60',12.34)];
 assert.equal(priceModule.lookupPrice(rows,{name:'Stone'},'60x60',catalogue).unavailable,true);
 assert.equal(priceModule.lookupPrice(rows,{name:'Touch'},'60x60',catalogue).unavailable,true);
 assert.equal(priceModule.lookupPrice(rows,{name:'Prime Stone'},'60x60',catalogue).amount,12.34);
});
test('new collection matches are exact and a standard tile does not use its decor or Grip price',() => {
 const rows=[record('ALLURE','60x60',12.34,{collection:'ALLURE',detail:'White, Grey'}),record('ALLURE','60x60',98.76,{collection:'ALLURE',detail:'Decoro Test'}),record('OYKOS FOSSIL','60x60',45.67,{collection:'OYKOS FOSSIL'})];
 assert.equal(priceModule.lookupPrice(rows,{name:'Allure'},'60x60').amount,12.34);
 assert.equal(priceModule.lookupPrice(rows,{name:'Oykos'},'60x60').unavailable,true);
 assert.equal(priceModule.lookupPrice([record('TEST GRIP','60x60',98.76)],{name:'Test'},'60x60').unavailable,true);
});
test('all-quantity price stays primary and stock conditions remain explicit',() => {
 const rows=[record('ASPEN','20x120',12.34,{collection:'ASPEN',condition:'Toutes quantités'}),record('ASPEN','20x120',9.87,{collection:'ASPEN',condition:'Stock > 5 palettes'})];
 const quote=priceModule.lookupPrice(rows,{name:'Aspen'},'20x120');
 assert.equal(quote.amount,12.34);assert.match(quote.label,/12,34/);assert.match(quote.label,/Stock > 5 palettes/);assert.equal(quote.options.length,2);
});
test('different color-group prices show a range instead of selecting an arbitrary group',() => {
 const rows=[record('ALLURE','60x60',12.34,{collection:'ALLURE',detail:'White'}),record('ALLURE','60x60',23.45,{collection:'ALLURE',detail:'Black'})];
 const quote=priceModule.lookupPrice(rows,{name:'Allure'},'60x60');
 assert.equal(quote.amount,null);assert.match(quote.label,/12,34 à 23,45/);
 assert.equal(priceModule.lookupPrice(rows,{name:'Allure'},'120x120').unavailable,true);
});
test('piece units, named spelling aliases and malformed record rejection are preserved',() => {
 assert.match(priceModule.lookupPrice([record('HOLLY WOOD','7.5x60',12.34,{unit:'pièce'})],{name:'Hollywood'},'7,5x60').label,/HT\/pièce/);
 assert.equal(priceModule.validPriceRecords([record('Test','60x60',12.34)]),true);
 assert.equal(priceModule.validPriceRecords([record('Test','60x60',NaN)]),false);
 assert.equal(priceModule.validPriceRecords([record('Test','unknown',12.34)]),false);
});

const source=readFileSync(new URL('../assets/js/fenice-access.js',import.meta.url),'utf8');
function harness({admin=null,forgedAdmin=false,serverStatus=200,gate=null,expiresIn=300000}={}) {
 let now=100000, s=forgedAdmin?{isAdmin:true,email:'jerome@leroyfactory.fr'}:{codeClient:'LRF-99998',departement:'34',partenaires:['LA FENICE'],sessionToken:'A'.repeat(43)};
 const requests=[],listeners=new Map(),events=[],timers=new Map();let timerId=0,authChange;
 const user=admin?{email:admin,uid:'synthetic-admin',getIdToken:async()=> 'synthetic-bearer'}:null;
 const auth={currentUser:user,authStateReady:async()=>{}};
 const app={options:{projectId:'le-roy-factory'}};
 const window={LRF_PRO_SESSION:{read:()=>s},FENICE_CATALOGUE:catalogue,
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
  dispatchEvent:event=>{events.push(event);for(const fn of listeners.get(event.type)||[])fn(event);}};
 const context={window,document:{addEventListener(){},visibilityState:'visible'},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},Date:class extends Date{static now(){return now;}},AbortController,AbortSignal,JSON,Set,
  setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id),
  loadModule:async url=>url.includes('firebase-app')?{getApps:()=>[app],initializeApp:()=>app}:url.includes('firebase-auth')?{getAuth:()=>auth,onIdTokenChanged:(a,fn)=>{authChange=fn;fn(user);}}:priceModule,
  fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body),headers:options.headers});if(gate)await gate;return {ok:serverStatus===200,status:serverStatus,json:async()=>({success:true,fenice:[record('ASPEN','20x120',12.34,{collection:'ASPEN'})],expiresAt:now+expiresIn,allowedPartners:['la-fenice']})};}
 };
 vm.runInNewContext(source.replaceAll('import(','loadModule('),context);
 const api=window.LRF_FENICE_ACCESS;
 return {api,requests,events,window,timers,auth,get session(){return s;},logout(){s=null;window.dispatchEvent({type:'lrf-pro-session-changed'});},setNow:value=>{now=value;},changeAuth(value){auth.currentUser=value;authChange?.(value);}};
}
test('pro amounts load only from the authenticated private endpoint and remain memory-only',async()=>{
 const h=harness();assert.equal(h.api.getPrice({name:'Aspen'},'20x120').locked,true);
 await h.api.loadPrices();assert.equal(h.requests.length,1);assert.deepEqual(h.requests[0].body,{action:'fenice',sessionToken:'A'.repeat(43)});assert.equal(h.requests[0].headers.Authorization,undefined);
 assert.equal(h.api.getState(),'ready');assert.equal(h.api.getPrice({name:'Aspen'},'20x120').amount,12.34);
 await h.api.loadPrices();assert.equal(h.requests.length,1,'current authenticated response is reused only inside its short TTL');
 h.logout();assert.equal(h.api.getState(),'idle');assert.equal(h.api.getPrice({name:'Aspen'},'20x120').locked,true);
});
test('admin requests use a fresh Firebase token and forged local admin flags send no request',async()=>{
 const h=harness({admin:'jerome@leroyfactory.fr'});await h.api.loadPrices();assert.equal(h.requests[0].headers.Authorization,'Bearer synthetic-bearer');assert.deepEqual(h.requests[0].body,{action:'fenice'});
 h.changeAuth(null);assert.equal(h.api.getState(),'idle');assert.equal(h.api.getPrice({name:'Aspen'},'20x120').locked,true);
 const forged=harness({forgedAdmin:true});await assert.rejects(()=>forged.api.loadPrices(),/Reconnectez/);assert.equal(forged.requests.length,0);
});
test('a server refusal never reveals rows and never falls back to PDF or public prices',async()=>{
 const h=harness({serverStatus:403});await assert.rejects(()=>h.api.loadPrices(),/accès/);assert.equal(h.api.getState(),'error');assert.equal(h.api.getPrice({name:'Aspen'},'20x120').locked,true);assert.equal(h.requests.length,1);
});
test('a response arriving after logout is discarded',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const h=harness({gate});
 const pending=h.api.loadPrices();for(let i=0;i<30&&h.requests.length===0;i++)await Promise.resolve();assert.equal(h.requests.length,1);
 h.logout();release();await assert.rejects(()=>pending,/session a changé/);assert.equal(h.api.getState(),'idle');assert.equal(h.api.getPrice({name:'Aspen'},'20x120').locked,true);
});
test('expired cached amounts are purged synchronously even if the timer was suspended',async()=>{
 const h=harness();await h.api.loadPrices();h.setNow(160001);assert.equal(h.api.getPrice({name:'Aspen'},'20x120').locked,true);assert.equal(h.api.getState(),'idle');
});
test('two simultaneous reveals share one server request',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const h=harness({gate});
 const a=h.api.loadPrices(),b=h.api.loadPrices();for(let i=0;i<30&&h.requests.length===0;i++)await Promise.resolve();assert.equal(h.requests.length,1);release();await Promise.all([a,b]);assert.equal(h.api.getState(),'ready');
});
