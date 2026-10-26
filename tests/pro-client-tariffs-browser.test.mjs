import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/agent-tariffs.js',import.meta.url),'utf8').replace('refresh();\nconnect().catch(() => refresh());','');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
function browser(request){
 const events=new Map(),emitted=[],timers=new Map(),sessionStorage=storage(),localStorage=storage();let time=100000,id=0;
 const window={VIEW_CATALOGUE:[{id:'view-test',variants:[{key:'60x60',publicPrice:99}]}],ELIOS_CATALOGUE:[],addEventListener:(name,fn)=>events.set(name,fn),dispatchEvent:e=>{emitted.push(e.type);events.get(e.type)?.(e);}};
 const document={visibilityState:'visible',addEventListener(){},querySelectorAll:()=>[],getElementById:()=>null,body:{style:{}}};
 const context={window,document,sessionStorage,localStorage,fetch:request,AbortSignal,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},Date:class extends Date{static now(){return time;}},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key)};
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.testApi={refresh,identity,clear,agent(user){currentAuth={currentUser:user};}};',context);
 return {...context,events,emitted,timers,api:context.testApi,setTime:v=>{time=v;},login(token='x'.repeat(43)){window.LRF_PRO_CONTEXT={sessionToken:token,partenaires:['ELIOS','VIEW']};},logout(){window.LRF_PRO_CONTEXT=null;sessionStorage.removeItem('lrfProSession');sessionStorage.removeItem('lrfProSessionToken');localStorage.removeItem('lrfProRememberToken');},quote:()=>window.LRF_AGENT_TARIFFS};
}
const data=(partners=['elios-ceramica','view-ceramica'],expiresAt=1000000)=>({success:true,version:1,accessType:'client',allowedPartners:partners,expiresAt,elios:{'azulimood|5x15|standard':{label:'Synthetic A'},'azulimood|10x10|standard':{label:'Synthetic B'}},view:[{productId:'view-test',variantKey:'60x60',proDetail:12.34}]});
const ok=body=>({ok:true,json:async()=>body});

test('client cache loads once per identity, refreshes separate Azuli formats and never writes rates into storage',async()=>{
 let requests=0;const h=browser(async(url,options)=>{requests++;assert.equal(url,'https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs');assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,undefined);assert.equal(JSON.parse(options.body).sessionToken,'x'.repeat(43));return ok(data());});h.login();
 await h.api.refresh();await h.api.refresh();assert.equal(requests,1,'Readiness must not cause a session refresh loop');
 assert.equal(h.quote().canAccess('ELIOS'),true);assert.equal(h.quote().canAccess('view-ceramica'),true);assert.equal(h.quote().canAccess('la-fenice'),false);
 assert.equal(h.quote().eliosPrice({slug:'azuli-mood'},'5 × 15').label,'Synthetic A');assert.equal(h.quote().eliosPrice({slug:'azuli-mood'},'10x10').label,'Synthetic B');assert.equal(h.quote().eliosPrice({slug:'azuli-mood'},'60x60').unavailable,true);
 assert.equal(h.window.VIEW_CATALOGUE[0].variants[0].proDetail,12.34);
 assert.equal(h.sessionStorage.getItem('lrfProSession'),null);assert.equal(h.localStorage.getItem('lrfProSession'),null);assert.equal(h.emitted.includes('lrf-pro-session-changed'),false);
});

test('anonymous, stale local roles and no session cannot load confidential data',async()=>{
 let calls=0;const h=browser(async()=>{calls++;return ok(data());});
 await h.api.refresh();h.window.LRF_PRO_CONTEXT={isAdmin:true,email:'jerome@leroyfactory.fr',partenaires:['ELIOS','VIEW']};await h.api.refresh();
 assert.equal(calls,0);assert.equal(h.quote().verified,false);assert.equal(h.quote().eliosPrice({},'5x15').locked,true);
});

test('logout clears cache immediately and a delayed response cannot reintroduce prices',async()=>{
 let resolve;const h=browser(()=>new Promise(r=>resolve=r));h.login();const pending=h.api.refresh();h.logout();await h.api.refresh();resolve(ok(data()));await pending;
 assert.equal(h.quote().verified,false);assert.equal(h.window.VIEW_CATALOGUE[0].variants[0].proDetail,undefined);assert.equal(h.timers.size,0);
});

test('logout and reconnect discard prior manufacturer rights without retaining VIEW purchases',async()=>{
 let partners=['view-ceramica'];const h=browser(async()=>ok(data(partners)));h.login();await h.api.refresh();assert.equal(h.quote().canAccess('view'),true);
 h.logout();await h.api.refresh();assert.equal(h.quote().verified,false);assert.equal(h.window.VIEW_CATALOGUE[0].variants[0].proDetail,undefined);
 partners=['elios-ceramica'];h.login('y'.repeat(43));await h.api.refresh();assert.equal(h.quote().canAccess('elios'),true);assert.equal(h.quote().canAccess('view'),false);assert.equal(h.window.VIEW_CATALOGUE[0].variants[0].proDetail,undefined);
});

test('expired tab cache fails closed even before a throttled browser timer runs, and refresh revokes permissions',async()=>{
 let allowed=true;const h=browser(async()=>allowed?ok(data(['elios-ceramica'],100100)):({ok:false,json:async()=>({success:false})}));h.login();await h.api.refresh();assert.equal(h.quote().verified,true);
 h.setTime(100101);assert.equal(h.quote().verified,false);assert.equal(h.quote().eliosPrice({slug:'azuli-mood'},'5x15').locked,true);
 allowed=false;await h.api.refresh();assert.equal(h.quote().verified,false);assert.equal(h.timers.size,0);
});

test('verified agent keeps bearer verification with no client token and no local admin trust',async()=>{
 const h=browser(async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer synthetic-agent-id-token');assert.equal(JSON.parse(options.body).sessionToken,undefined);return ok({...data(),accessType:'agent'});});
 h.api.agent({uid:'local-agent',email:'jerome@leroyfactory.fr',emailVerified:true,getIdToken:async()=>'synthetic-agent-id-token'});await h.api.refresh();assert.equal(h.quote().canAccess('elios'),true);assert.equal(h.quote().canAccess('view'),true);
});

test('pre-expiry renewal preserves the current price view and real session events recheck rights once',async()=>{
 let calls=0;const h=browser(async()=>{calls++;return ok(data());});h.login();await h.api.refresh();
 const timer=[...h.timers.values()].find(t=>t.ms===45000);assert(timer);
 h.setTime(145000);const before=h.emitted.length;timer.fn();await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(h.quote().canAccess('view'),true,'The authorized view remains active while refreshing');
 await h.api.refresh();assert.equal(h.emitted.slice(before).length,1,'Renewal redraws only the successful authorized state');
 assert.equal(calls,2);await h.events.get('lrf-pro-session-changed')({});assert.equal(calls,3);
});

test('remembered-device logout in another tab clears local copies before starting any request',async()=>{
 let calls=0;const h=browser(async()=>{calls++;return ok(data());});h.login();await h.api.refresh();
 h.sessionStorage.setItem('lrfProSession',JSON.stringify(h.window.LRF_PRO_CONTEXT));h.sessionStorage.setItem('lrfProSession1h',JSON.stringify(h.window.LRF_PRO_CONTEXT));h.localStorage.setItem('lrfProRememberToken','x'.repeat(43));
 h.localStorage.removeItem('lrfProRememberToken');h.events.get('storage')({key:'lrfProRememberToken',newValue:null});await h.api.refresh();
 assert.equal(calls,1);assert.equal(h.quote().verified,false);assert.equal(h.sessionStorage.getItem('lrfProSession'),null);assert.equal(h.sessionStorage.getItem('lrfProSession1h'),null);assert.equal(h.window.VIEW_CATALOGUE[0].variants[0].proDetail,undefined);
});
