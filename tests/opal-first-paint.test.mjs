import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('OPAL retains the parsed hero until BOTH its products and isolated CSS are ready',async()=>{
 let dataReady,cssReady,attached=0,requests=0;
 const source=read('assets/js/opal-catalogue.js').replace(/^import .*\n/,'').replace(/export /g,'')+'\nglobalThis.render=renderOpalCatalogue;';
 const context={createOpalPriceState:()=>({snapshot:()=>({})}),window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem:()=>null},fetch:url=>{requests++;return new Promise(resolve=>{if(url.includes('.json'))dataReady=()=>resolve({ok:true,json:async()=>[]});else cssReady=()=>resolve({ok:true,text:async()=>'.oh-catalogue{}'});});},WeakMap,URLSearchParams,Set,Map,Promise,AbortSignal};vm.createContext(context);vm.runInContext(source,context);
 const host={isConnected:false,innerHTML:'Parsed OPAL presentation',attachShadow(){attached++;return {};}};
 const first=context.render(host),again=context.render(host);assert.equal(first,again);assert.equal(requests,2);assert.equal(attached,0);assert.equal(host.innerHTML,'Parsed OPAL presentation');dataReady();await Promise.resolve();assert.equal(attached,0);cssReady();await first;assert.equal(attached,0);assert.equal(host.innerHTML,'Parsed OPAL presentation');
});
test('requested OPAL is identified before body parsing without consulting a stored account',()=>{
 const source=read('assets/js/selection-first-paint.js');for(const query of ['?partner=Opal','?partner=opal-home','?partner=Opal%20Home']){const dataset={},links=[];vm.runInNewContext(source,{location:{search:query},URLSearchParams,document:{documentElement:{dataset},createElement:()=>({}),head:{appendChild:link=>links.push(link)}}});assert.equal(dataset.lrfSelectionPartner,'opal');assert.equal(dataset.lrfSelectionCategory,'robinetterie');assert.equal(links.length,4);}
});
function initialRoute(query){const dataset={};vm.runInNewContext(read('assets/js/selection-first-paint.js'),{location:{search:query},URLSearchParams,document:{documentElement:{dataset},createElement:()=>({}),head:{appendChild(){}}}});return [dataset.lrfSelectionCategory,dataset.lrfSelectionPartner];}
test('category-only links paint the same first manufacturer the controller selects',()=>{
 for(const [query,expected] of [
  ['?category=carrelage',['carrelage','elios-ceramica']],['?category=exception',['exception','petracers']],
  ['?cat=mosaique',['mosaique','reviglass']],['?category=parement',['parement','biopietra']],
  ['?category=meubles',['meubles','randal-pro']],['?category=robinetterie',['robinetterie','aquahome']],
  ['?category=sanitaire',['sanitaire','petracers']],['?category=outillages',['outillages','bilt']],
  ['?category=piscine',['carrelage','elios-ceramica']],['?category=meubles&partner=unknown',['meubles','randal-pro']]
 ])assert.deepEqual(initialRoute(query),expected,query);
});
test('a manufacturer can only paint in one of its valid categories',()=>{
 for(const [query,expected] of [
  ['?partner=bulbo&category=sanitaire',['exception','bulbo']],['?partner=bulbo&cat=robinetterie',['exception','bulbo']],
  ['?partner=bulbo&category=meubles',['meubles','bulbo']],['?partner=petracer&category=sanitaire',['sanitaire','petracers']],
  ['?partner=opal-home&category=meubles',['robinetterie','opal']],['?partner=pecchioli&category=meubles',['exception','pecchioli-firenze']]
 ])assert.deepEqual(initialRoute(query),expected,query);
});
test('no asynchronous shadow stylesheet link can paint an unstyled OPAL grid',()=>{const source=read('assets/js/opal-catalogue.js');assert.doesNotMatch(source,/<link rel="stylesheet"/);assert.match(source,/root\.innerHTML=`<style>\$\{css\}<\/style>/);for(const page of ['univers.html','univers-ios.html','opal-catalogue-interactif.html']){const html=read(page);assert.match(html,/opal-initial-hero/);assert.match(html,/Chargement des collections/);}});
