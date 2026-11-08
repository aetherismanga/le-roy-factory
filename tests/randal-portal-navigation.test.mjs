import test from 'node:test';
import assert from 'node:assert/strict';
import {PORTAL_ORIGIN,PORTAL_URL,isRandalPortal,portalRoute,returnToRandalPortal,mountRandalPortalNavigation,portalCompositionRequest,openRandalPortalComposition} from '../shared/lrf-3d/randal-portal-context.js';
import {demoRoute,isRandalDemo,scopedDemoStorage} from '../shared/lrf-3d/demo-session.js';
import {returnToRandal,RANDAL_RETURN_URL} from '../shared/lrf-3d/commerce/navigation.js';
import {navigatePublicComposition,publicCompositionURL} from '../shared/lrf-3d/public-composition-routes.js';
import {createPartnerContext,mountPartnerReturn} from '../studio-one/src/commerce/partner-context.js';
import {isRandalPresentation} from '../shared/lrf-3d/randal-client-access.js';

const entry=PORTAL_ORIGIN+'/index.html?entry=randal&standalone=1';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function browser({href=entry,referrer=PORTAL_URL,embedded=true}={}){
 const messages=[],assigned=[],events=[],listeners=new Map(),document={referrer,addEventListener(type,listener,capture){assert.equal(capture,true);listeners.set(type,listener);}};
 const view={location:{href,assign:url=>assigned.push(url)},Event:class{constructor(type){this.type=type;}},dispatchEvent:event=>events.push(event.type)};view.parent=embedded?{postMessage:(data,origin)=>messages.push({data,origin})}:view;view.top={location:{}};
 return {view,document,messages,assigned,events,listeners};
}
function anchor(href,{id='',download=false}={}){
 const link={id,href,target:'_top',getAttribute:name=>name==='href'?href:null,hasAttribute:name=>name==='download'&&download};
 link.closest=selector=>selector==='a[href]'||selector.split(',').some(s=>s==='#'+id)?link:null;return link;
}
function click(target){return {target,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};}
function globals(values,callback){const previous=Object.fromEntries(Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});try{return callback();}finally{for(const [key,descriptor]of Object.entries(previous))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}

test('the complete portal URL context is navigation only and cannot enable anonymous demo or RANDAL permissions',()=>{
 assert.equal(isRandalPortal(entry),true);for(const url of [PORTAL_URL,PORTAL_ORIGIN+'/?entry=randal',PORTAL_ORIGIN+'/?standalone=1',PORTAL_ORIGIN+'/?entry=other&standalone=1','bad URL'])assert.equal(isRandalPortal(url),false);
 assert.equal(isRandalDemo(entry+'&demo=randal'),false);assert.equal(isRandalDemo(PORTAL_ORIGIN+'/?demo=randal'),true);
 assert.equal(isRandalPresentation({known:true,client:null}),false);assert.equal(isRandalPresentation({known:true,client:{codeClient:'LRF-00321'}}),false);
 const store={getItem(){return 'original';}};assert.equal(scopedDemoStorage(store,{demo:isRandalDemo(entry)}),store);
});

test('only known local application routes retain portal context; hostile, house and cross-origin routes return the fixed portal',()=>{
 const route=new URL(portalRoute('atelier.html?guided=1&demo=randal#projet=saved',entry));assert.equal(route.origin,PORTAL_ORIGIN);assert.equal(route.pathname,'/atelier.html');assert.equal(route.searchParams.get('entry'),'randal');assert.equal(route.searchParams.get('standalone'),'1');assert.equal(route.searchParams.get('guided'),'1');assert.equal(route.searchParams.has('demo'),false);assert.equal(route.hash,'#projet=saved');
 assert.equal(demoRoute('index.html?view=quote',entry),portalRoute('index.html?view=quote',entry));
 for(const target of ['https://leroyfactory.fr/','https://evil.example/index.html','//evil.example/index.html','https://user@studio-one-beta-test-v2.vercel.app/index.html','javascript:alert(1)','data:text/html,test','maison.html?project=secret','unknown.html','/%2e%2e/maison.html'])assert.equal(portalRoute(target,entry),PORTAL_URL,target);
 assert.equal(portalRoute('atelier.html','https://ordinary.example/index.html'),'atelier.html');assert.equal(demoRoute('atelier.html','https://ordinary.example/index.html'),'atelier.html');
 const general='https://randal-catalogue-general-3d.vercel.app/index.html?entry=randal&standalone=1';assert.equal(new URL(portalRoute('index.html?view=quote',general)).origin,'https://randal-catalogue-general-3d.vercel.app');assert.equal(portalRoute(PORTAL_ORIGIN+'/index.html',general),PORTAL_URL);
});

test('portal exit messages go only to the trusted Studio parent; all other embedding states use the fixed local fallback',()=>{
 const trusted=browser();returnToRandalPortal(trusted);assert.deepEqual(trusted.messages,[{data:{type:'lrf-portal-exit'},origin:PORTAL_ORIGIN}]);assert.deepEqual(trusted.assigned,[]);
 for(const options of [{embedded:false},{referrer:''},{referrer:'https://studio-one-beta-test-v2.vercel.app.evil.example/randal.html'},{referrer:'https://user@studio-one-beta-test-v2.vercel.app/randal.html'},{referrer:'https://leroyfactory.fr/'}]){const f=browser(options);returnToRandalPortal(f);assert.deepEqual(f.messages,[]);assert.deepEqual(f.assigned,[PORTAL_URL]);assert.equal(f.view.top.location.href,undefined);}
 const broken=browser();broken.view.parent.postMessage=()=>{throw Error('closed parent');};returnToRandalPortal(broken);assert.deepEqual(broken.assigned,[PORTAL_URL]);
});

test('early click capture blocks UI escapes, preserves checkpoints and keeps allowed app links in the iframe',async()=>{
 const f=browser();let resume;f.view.LRF_PROJECT_WORKSPACE={flush:()=>new Promise(resolve=>resume=resolve)};assert.equal(mountRandalPortalNavigation(f),true);assert.equal(mountRandalPortalNavigation(f),false);
 const quit=click(anchor('https://leroyfactory.fr/',{id:'quit-configurator'}));f.listeners.get('click')(quit);assert.equal(quit.prevented,true);assert.equal(quit.stopped,true);assert.deepEqual(f.events,['lrf-project-checkpoint']);assert.deepEqual(f.messages,[]);resume();await flush();assert.equal(f.messages.length,1);
 delete f.view.LRF_PROJECT_WORKSPACE;
 for(const href of ['https://leroyfactory.fr/configurateurs-randal.html','https://www.cera-stone.fr/','https://cera-stone-atelier.ccjacou.chatgpt.site/','javascript:alert(1)','maison.html','https://evil.example/']){const event=click(anchor(href));f.listeners.get('click')(event);assert.equal(event.prevented,true,href);assert.equal(event.stopped,true,href);}
 await flush();assert(f.messages.every(m=>m.origin===PORTAL_ORIGIN&&m.data.type==='lrf-portal-exit'));
 const local=anchor('index.html?view=quote'),allowed=click(local);f.listeners.get('click')(allowed);assert.equal(allowed.prevented,false);assert.equal(new URL(local.href).searchParams.get('entry'),'randal');assert.equal(local.target,'_self');
 const download=click(anchor('blob:https://studio-one-beta-test-v2.vercel.app/id',{download:true}));f.listeners.get('click')(download);assert.equal(download.prevented,false);
 const falseDownload=click(anchor('https://leroyfactory.fr/',{download:true}));f.listeners.get('click')(falseDownload);assert.equal(falseDownload.prevented,true);
});

test('public composition switching sends typed identifiers to the current trusted portal, never arbitrary destinations',()=>{
 const composition={variant:'randal-general',id:'lrf-expo-general'},f=browser();const url=openRandalPortalComposition(composition,'copy',f);
 assert.deepEqual(f.messages,[{origin:PORTAL_ORIGIN,data:{type:'lrf-portal-open',variant:'randal-general',compositionId:'lrf-expo-general',mode:'copy'}}]);assert.equal(new URL(url).origin,PORTAL_ORIGIN);assert.equal(new URL(url).pathname,'/randal.html');assert.deepEqual(f.assigned,[]);
 for(const value of [{variant:'https://evil.example/',id:'lrf-expo-general'},{variant:'studio-one',id:'https://evil.example/'},{variant:'studio-one',id:'../index.html'},{variant:'studio-one',id:''}])assert.throws(()=>portalCompositionRequest(value),/inconnue/);
 assert.throws(()=>portalCompositionRequest(composition,'https://evil.example/'),/inconnue/);
 const untrusted=browser({referrer:'https://evil.example/'});openRandalPortalComposition(composition,'preview',untrusted);assert.deepEqual(untrusted.messages,[]);assert.equal(new URL(untrusted.assigned[0]).origin,PORTAL_ORIGIN);
 globals({document:f.document},()=>{navigatePublicComposition(composition,'preview',f.view);});assert.equal(f.messages.at(-1).data.mode,'preview');assert.equal(f.view.top.location.href,undefined);
});

test('portal exit takes precedence over partner overrides while standard navigation and public routes remain unchanged',()=>{
 const f=browser(),back={href:'unchanged'},storage={getItem:()=>JSON.stringify({id:'cerastone',enteredAt:100}),setItem(){throw Error('portal context must not rewrite standard partner storage');}};
 assert.equal(createPartnerContext({url:entry+'&partner=cerastone',storage,now:()=>100}),null);
 assert.equal(mountPartnerReturn({request(){throw Error('partner redirect must not run');}},{partner:{id:'cerastone'},document:{getElementById:()=>back},window:f.view}),false);assert.equal(back.href,'unchanged');
 globals({location:f.view.location,window:f.view,parent:f.view.parent,document:f.document},()=>returnToRandal());assert.equal(f.messages.at(-1).data.type,'lrf-portal-exit');
 const standard=browser({href:PORTAL_ORIGIN+'/index.html',referrer:'https://leroyfactory.fr/studio-one-configurateur.html'});globals({location:standard.view.location,window:standard.view,parent:standard.view.parent,document:standard.document},()=>returnToRandal());assert.deepEqual(standard.messages,[{origin:'https://leroyfactory.fr',data:{type:'lrf-configurator-exit'}}]);
 globals({location:standard.view.location},()=>{const url=new URL(publicCompositionURL({variant:'studio-one',id:'lrf-expo-studio-one'}));assert.equal(url.origin,'https://leroyfactory.fr');assert.equal(url.pathname,'/studio-one-configurateur.html');});assert.equal(RANDAL_RETURN_URL,'https://leroyfactory.fr/configurateurs-randal.html');
});

test('a restricted direct workshop visit returns to the quotation without losing portal isolation',async()=>{
 const {mountRandalWorkshopAccess}=await import('../shared/lrf-3d/randal-workshop-access.js');
 const f=browser(),redirected=[],listeners=new Map(),state={known:true,pending:false,client:{codeClient:'LRF-00321'},isAdmin:false,configuratorAccess:{mode:'presentation',allowWorkshop:false}};
 const previous=new Map(),values={window:f.view,parent:f.view.parent,location:{href:entry,replace:url=>redirected.push(url)},addEventListener:(name,fn)=>listeners.set(name,fn),document:{body:{append(){}},createElement:()=>({setAttribute(){},addEventListener(){},showModal(){},close(){},remove(){},append(){}})}};
 for(const [key,value]of Object.entries(values)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
 try{
  mountRandalWorkshopAccess(()=>({load:async()=>state,dispose(){}}));await flush();listeners.get('lrf-identity')({detail:state});
  assert.equal(redirected.length,2);
  for(const target of redirected){const url=new URL(target);assert.equal(url.origin,PORTAL_ORIGIN);assert.equal(url.pathname,'/index.html');assert.equal(url.searchParams.get('view'),'quote');assert.equal(url.searchParams.get('entry'),'randal');assert.equal(url.searchParams.get('standalone'),'1');}
 }finally{for(const [key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
