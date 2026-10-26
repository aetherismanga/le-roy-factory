import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyClientToken,createAgentTariffsHandler} from '../shared/lrf-server/agent-tariffs.mjs';

// Synthetic session and amounts only; these are never production credentials.
const token='synthetic_session_'.padEnd(43,'x');
const now=Date.now();
const validated=(partners=['elios-ceramica','view-ceramica'])=>({success:true,expiresAt:now+60000,client:{id:'synthetic',codeClient:'LRF-12345',departement:'34',partenaires:partners}});
const grid={view:[{productId:'synthetic-view',variantKey:'60x60',proDetail:12.34}],elios:{'synthetic-azuli|5x15|standard':{amount:4.56,label:'Synthetic 5x15'},'synthetic-azuli|10x10|standard':{amount:7.89,label:'Synthetic 10x10'}},documents:{'randal-studio-one-basins':Buffer.from('%PDF-1.4\nSynthetic agent document').toString('base64')}};
function response(){return{headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};}
function request(body={action:'bootstrap',sessionToken:token},headers={}){return{method:'POST',headers:{host:'randal-catalogue-general-3d.vercel.app',origin:'https://leroyfactory.fr',...headers},body};}
const upstream=(data=validated(),status=200)=>async()=>({ok:status>=200&&status<300,status,json:async()=>data});

test('client token is verified only with the existing fixed Firebase authority',async()=>{
 let calls=0;
 const identity=await verifyClientToken(token,{now,request:async(url,options)=>{
  calls++;assert.equal(url,'https://us-central1-le-roy-factory.cloudfunctions.net/validateProSession');
  assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{sessionToken:token});
  assert.equal(options.headers['Content-Type'],'application/json');assert(options.signal instanceof AbortSignal);
  return upstream(validated(['ELIOS CERAMICA','View']))();
 }});
 assert.equal(calls,1);assert.deepEqual(identity,{allowedPartners:['elios-ceramica','view-ceramica'],expiresAt:now+60000});
});

test('malformed tokens do not trigger any upstream request',async()=>{
 let calls=0;
 for(const value of [undefined,null,{},'',token+'x','Bearer '+token,'x'.repeat(42),'.'.repeat(43)]){
  assert.equal(await verifyClientToken(value,{request:async()=>{calls++;throw Error('must not call');}}),null);
 }
 assert.equal(calls,0);
});

test('expired, revoked and malformed validation responses fail closed',async()=>{
 const good=validated();
 for(const data of [{...good,success:false},{...good,expiresAt:now},{...good,expiresAt:String(now+60000)},{...good,client:null},{...good,client:{...good.client,codeClient:'LRF-00001'}},{...good,client:{...good.client,codeClient:'ADMIN'}},{...good,client:{...good.client,departement:'34-admin'}},{...good,client:{...good.client,partenaires:['*',{}]}}]){
  assert.equal(await verifyClientToken(token,{now,request:upstream(data)}),null);
 }
 for(const status of [401,403,404])assert.equal(await verifyClientToken(token,{now,request:upstream(good,status)}),null);
});

test('only explicit canonical manufacturer aliases grant tariff rights',async()=>{
 for(const [partners,wanted] of [[['Elios'],['elios-ceramica']],[['view-ceramica'],['view-ceramica']],[['*','elios-other','view-admin','la-fenice'],[]]]){
  assert.deepEqual((await verifyClientToken(token,{now,request:upstream(validated(partners))})).allowedPartners,wanted);
 }
});

test('client bootstrap transmits only the manufacturers validated server-side',async()=>{
 for(const [partners,elios,view] of [[['elios-ceramica'],true,false],[['view-ceramica'],false,true],[['elios-ceramica','view-ceramica'],true,true]]){
  const handler=createAgentTariffsHandler({verify:async()=>null,verifyClient:t=>verifyClientToken(t,{now,request:upstream(validated(partners))}),read:async()=>grid});
  const res=response();
  await handler(request({action:'bootstrap',sessionToken:token,isAdmin:true,partenaires:['elios-ceramica','view-ceramica','la-fenice']}),res);
  assert.equal(res.statusCode,200);assert.equal(res.body.accessType,'client');assert.deepEqual(res.body.allowedPartners,partners);
  assert.deepEqual(res.body.elios,elios?grid.elios:{});assert.deepEqual(res.body.view,view?grid.view:[]);
  assert.equal(res.body.documents,undefined);assert.equal(res.body.client,undefined);assert.equal(res.body.sessionToken,undefined);
  assert.match(res.headers['Cache-Control'],/no-store/);assert.equal(res.body.expiresAt,now+60000);
 }
});

test('live partner revocation takes effect on the next bootstrap without caching identity',async()=>{
 let partners=['elios-ceramica','view-ceramica'];
 const handler=createAgentTariffsHandler({verify:async()=>null,verifyClient:t=>verifyClientToken(t,{now,request:async()=>upstream(validated(partners))()}),read:async()=>grid});
 let res=response();await handler(request(),res);assert.equal(res.body.view.length,1);
 partners=['elios-ceramica'];res=response();await handler(request(),res);assert.deepEqual(res.body.view,[]);assert.deepEqual(res.body.allowedPartners,partners);
 partners=[];res=response();await handler(request(),res);assert.equal(res.statusCode,403);assert.equal(res.body.elios,undefined);
});

test('anonymous, forged roles, expired tokens and unsupported manufacturers never read private grids',async()=>{
 let reads=0;
 const handler=createAgentTariffsHandler({verify:async()=>null,verifyClient:t=>verifyClientToken(t,{now,request:upstream(validated([]))}),read:async()=>{reads++;return grid;}});
 for(const body of [{action:'bootstrap'},{action:'bootstrap',isAdmin:true,email:'jerome@leroyfactory.fr',allowedPartners:['elios-ceramica']},{action:'bootstrap',sessionToken:'forged'},{action:'bootstrap',sessionToken:token}]){
  const res=response();await handler(request(body),res);assert([401,403].includes(res.statusCode));assert.equal(res.body.elios,undefined);assert.equal(res.body.view,undefined);
 }
 assert.equal(reads,0);
 const expired=createAgentTariffsHandler({verify:async()=>null,verifyClient:t=>verifyClientToken(t,{now,request:upstream({...validated(),expiresAt:now-1})}),read:async()=>{reads++;return grid;}});
 const res=response();await expired(request(),res);assert.equal(res.statusCode,401);assert.equal(reads,0);
});

test('client tokens cannot obtain agent documents, even with Randal permission claims',async()=>{
 let checks=0,reads=0;
 const handler=createAgentTariffsHandler({verify:async()=>null,verifyClient:async()=>{checks++;return{allowedPartners:['elios-ceramica','view-ceramica'],expiresAt:now+60000};},read:async()=>{reads++;return grid;}});
 const res=response();await handler(request({action:'document',id:'randal-studio-one-basins',sessionToken:token,isAdmin:true,partenaires:['randal-pro']}),res);
 assert.equal(res.statusCode,401);assert.equal(reads,0);assert.equal(checks,0);assert.equal(res.body.documents,undefined);
});

test('temporary authority failures return unavailable without exposing grids or claiming session expiry',async()=>{
 for(const requestUpstream of [upstream({},503),async()=>{throw Error('upstream transport');}]){
  await assert.rejects(verifyClientToken(token,{now,request:requestUpstream}),/unavailable/);
  let reads=0;
  const handler=createAgentTariffsHandler({verify:async()=>null,verifyClient:t=>verifyClientToken(t,{now,request:requestUpstream}),read:async()=>{reads++;return grid;}});
  const res=response();await handler(request(),res);assert.equal(res.statusCode,503);assert.equal(reads,0);assert.equal(res.body.elios,undefined);assert(!JSON.stringify(res.body).includes('upstream transport'));
 }
});

test('verified agent bootstrap and private PDF remain available with no client token',async()=>{
 let checks=0;
 const handler=createAgentTariffsHandler({verify:async()=>({uid:'synthetic-agent'}),verifyClient:async()=>{checks++;throw Error();},read:async()=>grid});
 let res=response();await handler(request({action:'bootstrap'}),res);
 assert.equal(res.statusCode,200);assert.equal(res.body.accessType,'agent');assert.deepEqual(res.body.elios,grid.elios);assert.deepEqual(res.body.view,grid.view);assert.equal(res.body.documents,undefined);
 res=response();await handler(request({action:'document',id:'randal-studio-one-basins'}),res);assert.equal(res.statusCode,200);assert.equal(res.body.subarray(0,5).toString(),'%PDF-');assert.equal(checks,0);
});
