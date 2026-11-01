import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createAgentTariffsHandler,verifyClientToken,readFeniceTariffs} from '../shared/lrf-server/agent-tariffs.mjs';

// Every identity, token and monetary value in this fixture is synthetic.
const token='synthetic_fenice_session_'.padEnd(43,'x');
const row={collection:'SYNTHETIC',description:'SYNTHETIC',detail:'Test finish',format:'20x20',amount:12.34,unit:'m²',condition:'Test condition',page:1,source:'Synthetic fixture'};
const feniceData={version:1,view:[],elios:{},fenice:[row],documents:{internalOnly:'must not leak'}};
const otherData={version:1,view:[{productId:'synthetic',proDetail:4.56}],elios:{synthetic:{amount:7.89}},fenice:[row],documents:{'randal-studio-one-basins':Buffer.from('%PDF-1.4\nSynthetic agent document').toString('base64')}};
const valid=(partenaires=['La Fenice'],expiresAt=Date.now()+3600000)=>({success:true,expiresAt,client:{codeClient:'LRF-12345',departement:'34',partenaires}});
const upstream=(getData=()=>valid(),status=200)=>async()=>({ok:status>=200&&status<300,status,json:async()=>getData()});
const realClientVerifier=(getData=()=>valid(),status=200)=>(value,options)=>verifyClientToken(value,{...options,request:upstream(getData,status)});
function response(){return {statusCode:200,headers:{},setHeader(key,value){this.headers[key]=value;},status(status){this.statusCode=status;return this;},json(body){this.body=body;return this;},send(body){this.body=body;return this;}};}
function request(body={action:'fenice',sessionToken:token},headers={}){return {method:'POST',headers:{host:'randal-catalogue-general-3d.vercel.app',origin:'https://leroyfactory.fr',...headers},body};}
const invoke=async(handler,body,headers)=>{const result=response();await handler(request(body,headers),result);return result;};
function service({verify=async()=>null,verifyClient=realClientVerifier(),read=async()=>otherData,readFenice=async()=>feniceData}={}){return createAgentTariffsHandler({verify,verifyClient,read,readFenice});}

test('Fenice permission is enabled only for the dedicated scope and exact canonical aliases',async()=>{
 for(const alias of ['La Fenice','LA-FENICE','la-fenice']){
  const base={request:upstream(()=>valid([alias]))};
  assert.deepEqual((await verifyClientToken(token,base)).allowedPartners,[],'Legacy verifier scope remains unchanged');
  assert.deepEqual((await verifyClientToken(token,{...base,includeFenice:true})).allowedPartners,['la-fenice']);
 }
 for(const alias of ['*','fenice','la-fenice-admin','lafenice-other']){
  assert.deepEqual((await verifyClientToken(token,{request:upstream(()=>valid([alias])),includeFenice:true})).allowedPartners,[]);
 }
});

test('authorized Fenice clients receive only requested rows with a five-minute maximum lifetime',async()=>{
 let legacyReads=0,feniceReads=0;
 const handler=service({read:async()=>{legacyReads++;return otherData;},readFenice:async()=>{feniceReads++;return {...feniceData,fenice:[{...row,internalSecret:'must not export'}]};}});
 const before=Date.now(),res=await invoke(handler);
 assert.equal(res.statusCode,200);assert.deepEqual(res.body.fenice,[row]);assert.equal(res.body.accessType,'client');assert.deepEqual(res.body.allowedPartners,['la-fenice']);
 assert(res.body.expiresAt>=before+299000&&res.body.expiresAt<=Date.now()+300000);
 for(const field of ['view','elios','documents','sessionToken','client'])assert.equal(res.body[field],undefined);
 assert.equal(legacyReads,0);assert.equal(feniceReads,1);assert.match(res.headers['Cache-Control'],/private.*no-store/);assert.equal(res.headers['Access-Control-Allow-Origin'],'https://leroyfactory.fr');
});

test('Fenice response cannot outlive the verified professional session',async()=>{
 const expiresAt=Date.now()+15000;
 const res=await invoke(service({verifyClient:realClientVerifier(()=>valid(['la-fenice'],expiresAt))}));
 assert.equal(res.statusCode,200);assert.equal(res.body.expiresAt,expiresAt);
});

test('verified Firebase agents can read Fenice without borrowing a client identity',async()=>{
 let clientChecks=0;
 const res=await invoke(service({verify:async()=>({uid:'synthetic-agent'}),verifyClient:async()=>{clientChecks++;throw Error();}}),{action:'fenice'});
 assert.equal(res.statusCode,200);assert.equal(res.body.accessType,'agent');assert.deepEqual(res.body.fenice,[row]);assert.deepEqual(res.body.allowedPartners,['la-fenice']);assert.equal(clientChecks,0);
});

test('forged browser roles and unrelated manufacturers cannot read Fenice',async()=>{
 let privateReads=0;
 for(const partenaires of [[],['Elios'],['View'],['fenice'],['la-fenice-admin']]){
  const handler=service({verifyClient:realClientVerifier(()=>valid(partenaires)),readFenice:async()=>{privateReads++;return feniceData;}});
  const res=await invoke(handler,{action:'fenice',sessionToken:token,isAdmin:true,email:'jerome@leroyfactory.fr',allowedPartners:['la-fenice'],partenaires:['la-fenice']});
  assert.equal(res.statusCode,403);assert.equal(res.body.fenice,undefined);
 }
 for(const badToken of [undefined,'forged-token','x'.repeat(42)]){
  const res=await invoke(service({readFenice:async()=>{privateReads++;return feniceData;}}),{action:'fenice',sessionToken:badToken,isAdmin:true});
  assert.equal(res.statusCode,401);assert.equal(res.body.fenice,undefined);
 }
 assert.equal(privateReads,0);
});

test('live partner removal, expiry and revoked sessions are applied on every Fenice request',async()=>{
 let data=valid(),status=200,reads=0,checks=0;
 const handler=service({verifyClient:(value,options)=>verifyClientToken(value,{...options,request:async()=>{checks++;return upstream(()=>data,status)();}}),readFenice:async()=>{reads++;return feniceData;}});
 assert.equal((await invoke(handler)).statusCode,200);
 data=valid(['Elios']);assert.equal((await invoke(handler)).statusCode,403);
 data=valid(['La Fenice'],Date.now()-1);assert.equal((await invoke(handler)).statusCode,401);
 data=valid();status=403;assert.equal((await invoke(handler)).statusCode,401);
 assert.equal(checks,4);assert.equal(reads,1);
});

test('temporary identity or tariff failures return unavailable without an accidental fallback grid',async()=>{
 let oldReads=0;
 for(const options of [{verifyClient:realClientVerifier(()=>({}),503)},{readFenice:async()=>null},{readFenice:undefined},{readFenice:async()=>{throw Error('private-internal-path');}}]){
  const config={verify:async()=>null,verifyClient:realClientVerifier(),read:async()=>{oldReads++;return otherData;},readFenice:async()=>feniceData,...options};
  const res=await invoke(createAgentTariffsHandler(config));
  assert.equal(res.statusCode,503);assert.equal(res.body.fenice,undefined);assert(!JSON.stringify(res.body).includes('private-internal-path'));
 }
 assert.equal(oldReads,0);
});

test('malformed or excessive Fenice commercial rows are rejected instead of partially exported',async()=>{
 for(const fenice of [null,[],{},new Array(10001).fill(row),[{...row,amount:'12.34'}],[{...row,amount:Infinity}],[{...row,page:0}],[{...row,format:''}],[{...row,detail:{secret:true}}]]){
  const res=await invoke(service({readFenice:async()=>({...feniceData,fenice})}));
  assert.equal(res.statusCode,503);assert.equal(res.body.fenice,undefined);
 }
});

test('Fenice-only accounts cannot use bootstrap or private Randal documents; old responses exclude Fenice',async()=>{
 let oldReads=0;
 const handler=service({read:async()=>{oldReads++;return otherData;}});
 assert.equal((await invoke(handler,{action:'bootstrap',sessionToken:token})).statusCode,403);
 assert.equal((await invoke(handler,{action:'document',id:'randal-studio-one-basins',sessionToken:token})).statusCode,401);
 assert.equal(oldReads,0);
 for(const agent of [false,true]){
  const mixed=service({verify:async()=>agent?{uid:'synthetic-agent'}:null,verifyClient:realClientVerifier(()=>valid(['Elios','View','La Fenice']))});
  const res=await invoke(mixed,{action:'bootstrap',sessionToken:token});
  assert.equal(res.statusCode,200);assert.deepEqual(res.body.allowedPartners,['elios-ceramica','view-ceramica']);assert.deepEqual(res.body.elios,otherData.elios);assert.deepEqual(res.body.view,otherData.view);assert.equal(res.body.fenice,undefined);assert.equal(res.body.documents,undefined);
 }
 const admin=service({verify:async()=>({uid:'synthetic-agent'})});
 const pdf=await invoke(admin,{action:'document',id:'randal-studio-one-basins'});assert.equal(pdf.statusCode,200);assert.equal(pdf.headers['Content-Type'],'application/pdf');
});

test('Fenice applies exact origin restrictions and rejects requests before verification and private reads',async()=>{
 let checks=0,reads=0;
 const handler=service({verify:async()=>{checks++;return {};},readFenice:async()=>{reads++;return feniceData;}});
 const res=await invoke(handler,undefined,{origin:'https://leroyfactory.fr.attacker.invalid'});assert.equal(res.statusCode,403);assert.equal(checks,0);assert.equal(reads,0);assert.equal(res.body.fenice,undefined);
 const req=request();req.method='OPTIONS';const preflight=response();await handler(req,preflight);assert.equal(preflight.statusCode,204);assert.equal(checks,0);assert.equal(reads,0);
});

test('separate Fenice envelope requires its dedicated key and never uses the old tariff key',()=>{
 const directory=mkdtempSync(join(tmpdir(),'lrf-fenice-encrypted-')),path=join(directory,'fixture.enc.json');
 const oldFenice=process.env.LRF_FENICE_TARIFFS_KEY,oldGeneral=process.env.LRF_AGENT_TARIFFS_KEY;
 const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('lrf-agent-tariffs/v1'));
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify(feniceData)),cipher.final()]);
 const envelope={version:1,algorithm:'A256GCM',variant:'site-agent-tariffs',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
 try{
  writeFileSync(path,JSON.stringify(envelope));delete process.env.LRF_FENICE_TARIFFS_KEY;process.env.LRF_AGENT_TARIFFS_KEY=key.toString('hex');assert.equal(readFeniceTariffs(path),null);
  process.env.LRF_FENICE_TARIFFS_KEY=randomBytes(32).toString('hex');assert.equal(readFeniceTariffs(path),null);
  process.env.LRF_FENICE_TARIFFS_KEY=key.toString('hex');assert.deepEqual(readFeniceTariffs(path),feniceData);
  delete process.env.LRF_FENICE_TARIFFS_KEY;assert.equal(readFeniceTariffs(path),null);
 }finally{
  if(oldFenice===undefined)delete process.env.LRF_FENICE_TARIFFS_KEY;else process.env.LRF_FENICE_TARIFFS_KEY=oldFenice;
  if(oldGeneral===undefined)delete process.env.LRF_AGENT_TARIFFS_KEY;else process.env.LRF_AGENT_TARIFFS_KEY=oldGeneral;
  rmSync(directory,{recursive:true,force:true});
 }
});
