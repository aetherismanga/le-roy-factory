import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {installVisualDOM} from './helpers/visual-choice-dom.mjs';
import {createRandalPortalIdentity,trustedRandalPortalParent,mountRandalPortalGate} from '../shared/lrf-3d/randal-portal-gate.js';
import {PORTAL_ORIGIN,PORTAL_URL} from '../shared/lrf-3d/randal-portal-context.js';
const token='t'.repeat(43),otherToken='u'.repeat(43);
const restricted=()=>({client:{codeClient:'LRF-00321',societe:'RANDAL'},isAdmin:false,configuratorAccess:{mode:'presentation',allowWorkshop:false}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture({origin='https://randal-catalogue-general-3d.vercel.app',query='?entry=randal&standalone=1',referrer=PORTAL_URL,topLevel=false,request=async action=>action==='logout'?{client:null}:restricted()}={}){
 const dom=installVisualDOM(),messages=[],redirects=[],calls=[],listeners=new Map(),updates=[];let cleared=0;
 const parent={postMessage:(data,origin)=>messages.push({data,origin})};
 const view={location:{href:origin+'/index.html'+query,replace:url=>redirects.push(url)},addEventListener(type,fn){const entries=listeners.get(type)||[];entries.push(fn);listeners.set(type,entries);},removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(f=>f!==fn));}};view.parent=topLevel?view:parent;dom.document.referrer=referrer;
 const identity=createRandalPortalIdentity({getProject:()=>null,getKey:()=>'',request:async(action,payload)=>{calls.push({action,payload});return request(action,payload);},clearCredential:()=>cleared++,changed:state=>updates.push(state),view,document:dom.document});
 const send=(data,{source=parent,origin=PORTAL_ORIGIN}={})=>Promise.all((listeners.get('message')||[]).map(fn=>fn({source,origin,data})));
 return {dom,identity,view,parent,messages,redirects,calls,updates,send,get cleared(){return cleared;},get verified(){return dom.document.documentElement.dataset.randalPortalVerified;},close(){identity.dispose();mountRandalPortalGate({document:dom.document}).dispose();dom.restore();}};
}
test('portal children never load stale local identities before a genuine parent exchange',async()=>{
 for(const origin of [PORTAL_ORIGIN,'https://randal-catalogue-general-3d.vercel.app']){
  const f=fixture({origin});try{
   assert.equal(f.verified,'false');assert.ok(f.dom.document.querySelector('#randal-portal-gate'));await f.identity.refresh();await f.identity.resync();f.identity.schedule();assert.deepEqual(f.calls,[]);
   const load=f.identity.load();assert.ok(f.messages.some(m=>m.data.type==='lrf-configurator-session-needed'));
   await f.send({type:'lrf-configurator-session',sessionToken:token},{origin:'https://attacker.example'});await f.send({type:'lrf-configurator-session',sessionToken:token},{source:{}});await f.send({type:'lrf-configurator-session',idToken:'administrator-token'});assert.deepEqual(f.calls,[]);assert.equal(f.verified,'false');
   await f.send({type:'lrf-configurator-session',sessionToken:token});await load;assert.deepEqual(f.calls.map(c=>c.action),['exchange']);assert.equal(f.verified,'true');assert.equal(f.identity.state.client.codeClient,'LRF-00321');assert.equal(f.dom.document.querySelector('#randal-portal-gate').hidden,true);
  }finally{f.close();}
 }
});
test('duplicate ready and session-needed responses share one exchange and stay unlocked after repeat messages',async()=>{
 const response=deferred(),f=fixture({request:()=>response.promise});try{
  const first=f.send({type:'lrf-configurator-session',sessionToken:token}),second=f.send({type:'lrf-configurator-session',sessionToken:token});await Promise.resolve();assert.equal(f.calls.length,1);assert.equal(f.verified,'false');
  response.resolve(restricted());await Promise.all([first,second]);assert.equal(f.verified,'true');assert.equal(f.messages.some(m=>m.data.type==='lrf-portal-auth-required'),false);
  await f.send({type:'lrf-configurator-session',sessionToken:token});assert.equal(f.calls.length,1);assert.equal(f.verified,'true');
 }finally{f.close();}
});
test('only the exact customer capability unlocks the child, never an admin or another existing LRF account',async()=>{
 for(const denied of [{client:{codeClient:'LRF-00321'},isAdmin:true,configuratorAccess:{mode:'presentation',allowWorkshop:false}},{client:{codeClient:'LRF-00322'},isAdmin:false,configuratorAccess:{mode:'presentation',allowWorkshop:false}},{client:{codeClient:'LRF-00321'},isAdmin:false,configuratorAccess:{mode:'standard',allowWorkshop:true}},{client:null}]){
  const f=fixture({request:async()=>denied});try{await f.send({type:'lrf-configurator-session',sessionToken:token});assert.equal(f.verified,'false');assert.equal(f.identity.state.client,null);assert.equal(f.identity.state.known,true);assert.ok(f.cleared>0);assert.ok(f.messages.some(m=>m.data.type==='lrf-portal-auth-required'));}finally{f.close();}
 }
});
test('unsupported portal queries, origins and parents redirect to the fixed chooser',()=>{
 for(const options of [{topLevel:true},{referrer:'https://attacker.example/randal.html'},{query:'?entry=randal'},{origin:'https://attacker.example'}]){
  const f=fixture(options);try{assert.equal(trustedRandalPortalParent({view:f.view,document:f.dom.document}),false);assert.deepEqual(f.redirects,[PORTAL_URL]);assert.equal(f.verified,'false');assert.deepEqual(f.calls,[]);assert.deepEqual(f.messages,[]);}finally{f.close();}
 }
});
test('parent logout clears local credentials and acknowledges even when its network logout fails',async()=>{
 const f=fixture({request:async action=>{if(action==='logout')throw Error('offline');return restricted();}});try{
  await f.send({type:'lrf-configurator-session',sessionToken:token});assert.equal(f.verified,'true');await f.send({type:'lrf-portal-end-session',requestId:'fixture-request'});assert.equal(f.verified,'false');assert.equal(f.identity.state.client,null);assert.ok(f.cleared>=2);assert.ok(f.messages.some(m=>m.data.type==='lrf-portal-session-ended'&&m.data.requestId==='fixture-request'));
  const count=f.calls.length;await f.send({type:'lrf-configurator-session',sessionToken:token});assert.equal(f.calls.length,count);assert.equal(f.verified,'false');
 }finally{f.close();}
});
test('user logout notifies the portal and a late exchange cannot unlock the child again',async()=>{
 const response=deferred(),f=fixture({request:action=>action==='exchange'?response.promise:Promise.resolve({client:null})});try{
  const exchange=f.send({type:'lrf-configurator-session',sessionToken:token});await Promise.resolve();await f.identity.logout();assert.ok(f.messages.some(m=>m.data.type==='lrf-portal-logout'));assert.equal(f.verified,'false');response.resolve(restricted());await exchange;assert.equal(f.verified,'false');assert.equal(f.identity.state.client,null);
 }finally{f.close();}
});
test('a parent session-absent message invalidates an in-flight exchange and a verified refresh failure locks the child',async()=>{
 const response=deferred(),f=fixture({request:action=>action==='exchange'?response.promise:Promise.resolve({client:null})});try{
  const exchange=f.send({type:'lrf-configurator-session',sessionToken:token});await Promise.resolve();await f.send({type:'lrf-configurator-session-absent'});response.resolve(restricted());await exchange;assert.equal(f.verified,'false');assert.equal(f.identity.state.client,null);
 }finally{f.close();}
 const g=fixture({request:async action=>{if(action==='quote')throw Object.assign(Error('Session expirée'),{status:401});return restricted();}});try{await g.send({type:'lrf-configurator-session',sessionToken:token});await g.identity.refresh();assert.equal(g.verified,'false');assert.ok(g.messages.some(m=>m.data.type==='lrf-portal-auth-required'));}finally{g.close();}
});
test('newer parent exchange wins when two different session replies arrive out of order',async()=>{
 const first=deferred(),second=deferred(),f=fixture({request:(_action,payload)=>payload.sessionToken===token?first.promise:second.promise});try{
  const older=f.send({type:'lrf-configurator-session',sessionToken:token}),newer=f.send({type:'lrf-configurator-session',sessionToken:otherToken});second.resolve(restricted());await newer;assert.equal(f.verified,'true');first.resolve({client:null});await older;assert.equal(f.verified,'true');assert.equal(f.identity.state.client.codeClient,'LRF-00321');
 }finally{f.close();}
});
test('both API clients expose only their module credential and clear it immediately on a failed logout',async()=>{
 const prior=Object.fromEntries(['sessionStorage','localStorage','fetch','location'].map(key=>[key,globalThis[key]]));
 try{
  delete globalThis.location;
  const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};globalThis.sessionStorage=globalThis.localStorage=storage;
  let accessToken='verified-fixture-token',offline=false;globalThis.fetch=async()=>{if(offline)throw Error('offline');return {ok:true,json:async()=>({accessToken,client:{codeClient:'LRF-00321'}})};};
  for(const variant of ['studio-one','randal-general']){
   const client=await import(pathToFileURL(resolve(variant,'src/commerce/client.js')).href+'?portal-auth-contract');const result=await client.commercialRequest('exchange',{sessionToken:token});assert.equal(result.accessToken,undefined);assert.equal(client.getSessionCredential(),accessToken);assert.equal(globalThis.getSessionCredential,undefined);offline=true;await assert.rejects(client.commercialRequest('logout'),/offline/);assert.equal(client.getSessionCredential(),'');assert.equal(saved.get(variant+'-session'),undefined);offline=false;
  }
 }finally{for(const [key,value]of Object.entries(prior))value===undefined?delete globalThis[key]:globalThis[key]=value;}
});
test('API credential revisions reject stale exchanges and preserve a newer login after a late failed logout',async()=>{
 const priorFetch=globalThis.fetch;
 try{
  for(const variant of ['studio-one','randal-general']){
   const pending=[];globalThis.fetch=(url,options)=>new Promise((resolve,reject)=>pending.push({options,reject,reply:data=>resolve({ok:true,json:async()=>data})}));
   const client=await import(pathToFileURL(resolve(variant,'src/commerce/client.js')).href+'?portal-credential-revisions');client.clearSessionCredential();
   const older=client.commercialRequest('exchange',{sessionToken:token}),newer=client.commercialRequest('exchange',{sessionToken:otherToken});pending[1].reply({accessToken:'newer-verified-fixture'});await newer;pending[0].reply({accessToken:'older-verified-fixture'});await older;assert.equal(client.getSessionCredential(),'newer-verified-fixture');
   const logout=client.commercialRequest('logout');assert.equal(client.getSessionCredential(),'');const latest=client.commercialRequest('exchange',{sessionToken:token});pending[3].reply({accessToken:'latest-verified-fixture'});await latest;pending[2].reject(Error('late network failure'));await assert.rejects(logout,/late network failure/);assert.equal(client.getSessionCredential(),'latest-verified-fixture');
  }
 }finally{globalThis.fetch=priorFetch;}
});
