import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadRandalActivity,fetchRandalLegacy} from '../assets/js/randal-activity-loader.mjs';
import * as model from '../assets/js/randal-activity-model.mjs';

const row={codeClient:'LRF-00321',source:'studio-one',visitId:'test-visit',startedMs:1000,updatedAt:2000,foregroundMs:1000,activeMs:500};
const good=async()=>({rows:[row]});
const denied=async()=>{throw Object.assign(new Error('Denied'),{code:'permission-denied'});};

test('a denied legacy source no longer hides measured RANDAL sessions',async()=>{
 const result=await loadRandalActivity({readSessions:good,readEvents:async()=>({rows:[]}),readLegacy:denied});
 assert.equal(result.data.sessions.length,1);
 assert.deepEqual(result.failures,[{key:'legacy',code:'permission-denied'}]);
 assert.equal(model.buildRandalReport(result.data).activeMs,500);
});
test('each failed source is reported separately, even when all reads fail',async()=>{
 const result=await loadRandalActivity({readSessions:denied,readEvents:denied,readLegacy:denied});
 assert.deepEqual(result.failures.map(f=>f.key),['sessions','events','legacy']);
});
test('a stalled source times out while other readings and their coverage survive',async()=>{
 const result=await loadRandalActivity({readSessions:()=>new Promise(()=>{}),readEvents:good,readLegacy:async()=>({rows:[],incomplete:true}),timeoutMs:10});
 assert.deepEqual(result.failures,[{key:'sessions',code:'deadline-exceeded'}]);
 assert.equal(result.data.events.length,1);
 assert.equal(result.incomplete,true);
});
test('all data sources exclude other accounts and do not manufacture missing durations',async()=>{
 const read=async()=>({rows:[row,{...row,codeClient:'LRF-99999',activeMs:999999}]});
 const result=await loadRandalActivity({readSessions:denied,readEvents:read,readLegacy:read});
 assert.equal(result.data.events.length,1);
 assert.equal(result.data.legacy.length,1);
 assert.deepEqual(result.data.sessions,[]);
});

const user={getIdToken:async()=> 'synthetic-token'};
const reply=(body,status=200)=>({ok:status===200,status,json:async()=>body});
test('legacy history uses the existing authenticated API with an exact client and time filter',async()=>{
 let called=0;
 const result=await fetchRandalLegacy({clientIds:['randal-id'],user,since:1000,until:3000,fetchImpl:async(url,options)=>{
  called++;assert.equal(url,'https://us-central1-le-roy-factory.cloudfunctions.net/getLrfAnalytics');
  assert.equal(options.headers.Authorization,'Bearer synthetic-token');
  assert.equal(options.method,'POST');assert.equal(options.cache,'no-store');
  const body=JSON.parse(options.body);assert.equal(body.clientId,'randal-id');assert.equal(body.period,'custom');
  return reply({success:true,timeline:[
   {clientId:'randal-id',codeClient:'LRF-00321',at:2000,action:'login'},
   {clientId:'other-id',codeClient:'LRF-00321',at:2000},
   {clientId:'randal-id',codeClient:'LRF-99999',at:2000},
   {clientId:'randal-id',codeClient:'LRF-00321',at:900},
   {clientId:'randal-id',codeClient:'LRF-00321',at:3001}
  ],orderAnalytics:{timelineTruncated:true}});
 }});
 assert.equal(called,1);assert.equal(result.rows.length,1);assert.equal(result.rows[0].createdAt,2000);
 assert.equal(model.buildRandalReport({legacy:result.rows}).lastSeen,2000);
 assert.equal(result.incomplete,true);
});
test('a stale token is refreshed once, and a rejected refresh never loops',async()=>{
 const refresh=[],tokens=[],fixtureUser={getIdToken:async(force=false)=>{refresh.push(force);return force?'renewed':'old';}};
 let calls=0;
 const options={clientIds:['randal-id'],user:fixtureUser,since:1000,until:3000};
 await fetchRandalLegacy({...options,fetchImpl:async(_,options)=>{tokens.push(options.headers.Authorization);return ++calls===1?reply({},401):reply({success:true,timeline:[]});}});
 assert.deepEqual(refresh,[false,true]);assert.deepEqual(tokens,['Bearer old','Bearer renewed']);
 calls=0;await assert.rejects(fetchRandalLegacy({...options,fetchImpl:async()=>{calls++;return reply({},401);}}),{code:'unauthenticated'});
 assert.equal(calls,2);
});
test('missing client, refused server, malformed response and aborted request never masquerade as empty activity',async()=>{
 assert.deepEqual(await fetchRandalLegacy({clientIds:[],user,since:0,fetchImpl:()=>assert.fail('No unfiltered request')}),{rows:[],incomplete:false});
 const options={clientIds:['randal-id'],user,since:1000,until:3000};
 await assert.rejects(fetchRandalLegacy({...options,fetchImpl:async()=>reply({},403)}),{code:'permission-denied'});
 await assert.rejects(fetchRandalLegacy({...options,fetchImpl:async()=>reply({success:true})}),{code:'invalid-response'});
 await assert.rejects(fetchRandalLegacy({...options,timeoutMs:10,fetchImpl:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('Aborted'),{name:'AbortError'}))))}),{name:'AbortError'});
});

function pageFixture({verify=async()=>({uid:'agent'}),reports=[]}={}){
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,textContent:'',innerHTML:'',value:id==='period'?'30':''});return elements.get(id);};
 let authenticate;
 const source=readFileSync(new URL('../assets/js/randal-activity-page.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInNewContext(source,{
  ...model,auth:{},db:{},verifiedAgentProfile:verify,
  onAuthStateChanged:(_,callback)=>{authenticate=callback;},
  loadRandalActivity:async()=>reports.shift(),fetchRandalLegacy,
  document:{getElementById:element,querySelectorAll:()=>[]},
  Date,console,collection(){},query(){},where(){},orderBy(){},limit(){},getDocs(){},Timestamp:{}
 });
 return {element,authenticate,async flush(){await new Promise(resolve=>setImmediate(resolve));}};
}
test('an email without the verified agent role triggers no activity reads',async()=>{
 let reads=0;const f=pageFixture({verify:async()=>null,reports:{shift(){reads++;}}});
 await f.authenticate({email:'jerome@leroyfactory.fr'});await f.flush();
 assert.equal(reads,0);assert.equal(f.element('content').hidden,true);assert.equal(f.element('refresh').disabled,true);
});
test('the page renders surviving sessions and labels the unavailable history',async()=>{
 const f=pageFixture({reports:[{data:{sessions:[row],events:[],legacy:[]},failures:[{key:'legacy',code:'permission-denied'}],incomplete:false}]});
 await f.authenticate({email:'jerome@leroyfactory.fr'});await f.flush();
 assert.equal(f.element('content').hidden,false);assert.match(f.element('sessions').innerHTML,/STUDIO ONE/);
 assert.match(f.element('status').textContent,/Suivi partiel.*historique du site/);assert.equal(f.element('refresh').disabled,false);
});
test('unavailable session counters are unknown, not zero or no presence',async()=>{
 const f=pageFixture({reports:[{data:{sessions:[],events:[],legacy:[]},failures:[{key:'sessions',code:'unavailable'}],incomplete:false}]});
 await f.authenticate({email:'jerome@leroyfactory.fr'});await f.flush();
 assert.match(f.element('kpis').innerHTML,/Sessions mesurées<\/span><strong>—/);
 assert.match(f.element('kpis').innerHTML,/Présence récente<\/span><strong>Indisponible/);
 assert.match(f.element('sessions').innerHTML,/momentanément indisponibles/);
});
test('refresh failure retains the last good report and signing out hides it immediately',async()=>{
 const f=pageFixture({reports:[{data:{sessions:[row],events:[],legacy:[]},failures:[],incomplete:false},{data:{sessions:[],events:[],legacy:[]},failures:[{key:'sessions',code:'permission-denied'},{key:'events',code:'permission-denied'},{key:'legacy',code:'permission-denied'}]}]});
 await f.authenticate({email:'jerome@leroyfactory.fr'});await f.flush();
 const rendered=f.element('sessions').innerHTML;
 f.element('period').value='90';
 await f.element('refresh').onclick();
 assert.equal(f.element('sessions').innerHTML,rendered);assert.match(f.element('status').textContent,/derniers résultats chargés restent affichés/);
 assert.equal(f.element('period').value,'30');
 assert.equal(f.element('reconnect').hidden,false);
 await f.authenticate(null);assert.equal(f.element('content').hidden,true);
});
test('a result arriving after sign-out cannot reveal the private report',async()=>{
 let finish;
 const f=pageFixture({reports:[new Promise(resolve=>{finish=resolve;})]});
 await f.authenticate({email:'jerome@leroyfactory.fr'});
 await f.authenticate(null);
 finish({data:{sessions:[row],events:[],legacy:[]},failures:[],incomplete:false});await f.flush();
 assert.equal(f.element('content').hidden,true);assert.equal(f.element('sessions').innerHTML,'');
});
