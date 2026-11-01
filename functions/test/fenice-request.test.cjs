'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const core = require('../fenice-request-core');
const item = () => ({collectionSlug:'heritage',name:'Heritage',kind:'tile',format:'60x60',color:'Calacatta Cardinale',reference:'',requestedQuantity:58,requestedUnit:'m²',packaging:{status:'known',boxes:999999}});
const body = () => ({requestId:'fenice-12345678901234567890',profile:'private',nom:'Exemple',prenom:'Camille',email:'camille@example.com',telephone:'0612345678',codePostal:'34740',ville:'Vendargues',secteur:'Montpellier Est',company:'',message:'Conseil revendeur',items:[item()],societe_web:''});
const packing = async line => ({status:'known',boxes:41,pieces:164,quantity:59.04,unit:'m²',packaging:{piecesPerBox:4,areaPerBox:1.44}});
test('real manufacturer data rounds tile and plinth needs in the delivered recap',async()=>{
  const module=await import('../fenice-packaging.mjs');
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../fenice-packaging.json'),'utf8'));
  const h=harness({calculatePackaging:async line=>{
    const found=module.packagingLookup(data,line);
    assert.equal(found.status,'known');
    return {...module.convertQuantity(found.packaging,line.requestedQuantity,line.requestedUnit),packaging:found.packaging};
  }});
  const payload=body();
  payload.items.push({...item(),kind:'plinth',format:'7,5x60',requestedQuantity:58,requestedUnit:'ml'});
  const result=await h.call(payload);
  assert.equal(result.status,200);assert.equal(result.body.delivered,true);
  const message=h.messages[0];
  assert.equal(message.to,'jerome@leroyfactory.fr');assert.equal(message.cc,undefined);
  assert.match(message.text,/41 boîtes · 59,04 m² · 164 pièces/);
  assert.match(message.text,/10 boîtes · 60 ml · 100 pièces/);
  assert.doesNotMatch(message.text,/999999/,'Browser box counts are never authoritative');
});
function harness({verifyIdentity=async()=>null,calculatePackaging=packing}={}) {
  const requests = new Map(), messages=[]; let sendError=false, accepted=['jerome@leroyfactory.fr'], reservations=0, completingFailure=false;
  const reserve=async(id,hash)=>{
    const existing=requests.get(id);
    if(existing?.hash!==undefined&&existing.hash!==hash)throw core.failure('Référence réutilisée pour une autre demande.',409);
    if(existing?.state==='sent')return 'sent';
    if(existing?.state==='sending')throw core.failure('Envoi en cours.',409);
    requests.set(id,{hash,state:'sending'});reservations++;return 'reserved';
  };
  const handler=core.createFeniceRequestHandler({verifyIdentity,reserve,complete:async id=>{if(completingFailure)throw Error('DB unavailable');requests.get(id).state='sent';},fail:async id=>{requests.get(id).state='failed';},send:async mail=>{if(sendError)throw Error('SMTP unavailable');messages.push(mail);return {accepted,messageId:'synthetic-id'};},calculatePackaging});
  async function call(payload=body(),{method='POST',origin='https://leroyfactory.fr',headers={}}={}) {
    const result={status:200,headers:{},body:null};
    const res={set(k,v){result.headers[k]=v;return this;},status(code){result.status=code;return this;},json(value){result.body=value;return this;},send(value){result.body=value;return this;}};
    await handler({method,headers:{...headers,...(origin?{origin}:{})},body:payload,ip:'192.0.2.20'},res);return result;
  }
  return {call,messages,requests,get reservations(){return reservations;},setSendError(value){sendError=value;},setAccepted(value){accepted=value;},setCompleteError(value){completingFailure=value;}};
}
test('public dealer inquiry sends only to Jérôme, with location/contact and server-recomputed box rounding',async()=>{
  const h=harness(),r=await h.call({...body(),to:'attacker@example.com',cc:'attacker@example.com'});
  assert.equal(r.status,200);assert.equal(r.body.delivered,true);assert.equal(h.messages.length,1);
  const mail=h.messages[0];assert.equal(mail.to,'jerome@leroyfactory.fr');assert.equal(mail.cc,undefined);assert.equal(mail.bcc,undefined);assert.equal(mail.replyTo,'camille@example.com');
  for(const text of ['Camille Exemple','34740','Vendargues','Montpellier Est','06','41 boîtes','59,04 m²','164 pièces'])assert(mail.text.includes(text),text);
  assert(!mail.text.includes('999999'));assert(!mail.text.includes('attacker@example.com'));
  assert.match(mail.text,/ne constitue pas une commande validée/);
});
test('individual contact details and geographic routing fields are mandatory',async()=>{
  for(const key of ['nom','prenom','email','telephone','codePostal','ville']){
    const h=harness(),b=body();b[key]='';assert.equal((await h.call(b)).status,400,key);assert.equal(h.messages.length,0);
  }
  const h=harness();assert.equal((await h.call({...body(),codePostal:'3400X'})).status,400);assert.equal((await h.call({...body(),telephone:'call me'})).status,400);
});
test('professional company, contact, quantity and format are required; a public LRF claim grants no verified identity',async()=>{
  const h=harness(),b={...body(),profile:'professional',company:'Magasin exemple',contact:'Camille Exemple',nom:'',prenom:'',codeClient:'LRF-00123'};
  assert.equal((await h.call({...b,company:''})).status,400);
  assert.equal((await h.call({...b,items:[{...item(),requestedQuantity:null}]})).status,400);
  assert.equal((await h.call({...b,items:[{...item(),format:''}]})).status,400);
  assert.equal((await h.call(b)).status,200);assert.match(h.messages[0].text,/Professionnel non connecté/);assert(!h.messages[0].text.includes('LRF-00123'));
});
test('verified professional uses the live account code and company, not a browser claim',async()=>{
  const h=harness({verifyIdentity:async()=>({client:{codeClient:'LRF-00987',societe:'Compte vivant'}})});
  const r=await h.call({...body(),profile:'professional',company:'Faux magasin',contact:'Camille Exemple',codeClient:'LRF-00001'});
  assert.equal(r.status,200);assert.match(h.messages[0].text,/Code LRF vérifié : LRF-00987/);assert.match(h.messages[0].text,/Société : Compte vivant/);assert(!h.messages[0].text.includes('Faux magasin'));assert(!h.messages[0].text.includes('LRF-00001'));
});
test('revoked/malformed authentication cannot silently downgrade to a public inquiry',async()=>{
  const h=harness({verifyIdentity:async()=>{throw core.failure('Session expirée.',401);}});
  assert.equal((await h.call(body())).status,401);assert.equal(h.messages.length,0);assert.equal(h.reservations,0);
});
test('individual may ask for advice without an invented quantity or format',async()=>{
  const h=harness({calculatePackaging:async()=>{throw Error('Should not calculate absent quantities');}});
  const r=await h.call({...body(),items:[{...item(),requestedQuantity:null,format:''}]});assert.equal(r.status,200);assert.match(h.messages[0].text,/Quantité à préciser/);
});
test('plinths use linear metres and whole boxes; unsupported units and fractional pieces/boxes are rejected',async()=>{
  const h=harness({calculatePackaging:async line=>{assert.equal(line.kind,'plinth');assert.equal(line.requestedUnit,'ml');return {status:'known',boxes:3,pieces:30,quantity:18,unit:'ml',packaging:{piecesPerBox:10,linearMetresPerBox:6}};}});
  assert.equal((await h.call({...body(),items:[{...item(),kind:'plinth',format:'7x60',requestedQuantity:17,requestedUnit:'ml'}]})).status,200);assert.match(h.messages[0].text,/3 boîtes · 18 ml · 30 pièces/);
  for(const line of [{...item(),kind:'plinth',requestedUnit:'m²'},{...item(),requestedUnit:'pièces',requestedQuantity:1.5},{...item(),requestedUnit:'boîtes',requestedQuantity:.5},{...item(),requestedQuantity:Infinity}])assert.equal((await h.call({...body(),items:[line]})).status,400);
});
test('unconfirmed packaging stays explicit and never copies a fake browser box total',async()=>{
  const h=harness({calculatePackaging:async()=>({status:'ambiguous'})});await h.call(body());assert.match(h.messages[0].text,/Conditionnement à confirmer/);assert(!h.messages[0].text.includes('999999'));assert(!h.messages[0].text.includes('Boîtage fabricant :'));
});
test('HTML and headers are escaped/validated; multiline messages preserve safe content',async()=>{
  const h=harness();await h.call({...body(),nom:'<img src=x>',message:'<script>bad()</script>\nDeuxième ligne'});assert(!h.messages[0].html.includes('<script>'));assert(h.messages[0].html.includes('&lt;script&gt;'));assert(h.messages[0].text.includes('\nDeuxième ligne'));
  for(const patch of [{email:'a@example.com\r\nBcc:attacker@example.com'},{nom:'Exemple\nBcc:attacker@example.com'},{company:'x'.repeat(181)},{requestId:'../unsafe'}])assert.equal((await harness().call({...body(),...patch})).status,400);
});
test('CORS, method, honeypot and payload bounds fail before sending',async()=>{
  const h=harness();assert.equal((await h.call(body(),{origin:'https://attacker.example'})).status,403);assert.equal((await h.call(body(),{origin:''})).status,403);assert.equal((await h.call(body(),{method:'GET'})).status,405);assert.equal((await h.call(body(),{method:'OPTIONS'})).status,204);
  assert.equal((await h.call({...body(),societe_web:'spam'})).status,429);assert.equal((await h.call({...body(),items:Array.from({length:31},item)})).status,400);assert.equal(h.messages.length,0);assert.equal((await h.call('{invalid JSON')).status,400);
});
test('repeat of the same accepted request is idempotent; changed content with same ID conflicts',async()=>{
  const h=harness();assert.equal((await h.call(body())).body.delivered,true);assert.equal((await h.call(body())).body.duplicate,true);assert.equal(h.messages.length,1);assert.equal((await h.call({...body(),message:'changed'})).status,409);
});
test('SMTP error/refusal cannot produce a success and permits retry using the same reference',async()=>{
  const h=harness();h.setSendError(true);assert.equal((await h.call(body())).status,503);assert.equal(h.requests.get(body().requestId).state,'failed');h.setSendError(false);h.setAccepted(undefined);assert.equal((await h.call(body())).status,503);h.setAccepted([]);assert.equal((await h.call(body())).status,503);h.setAccepted(['jerome@leroyfactory.fr']);assert.equal((await h.call(body())).body.delivered,true);
});
test('SMTP accepted but database status unavailable does not invite duplicate delivery',async()=>{
  const h=harness();h.setCompleteError(true);assert.equal((await h.call(body())).body.delivered,true);assert.equal((await h.call(body())).status,409);assert.equal(h.messages.length,1);
});
function wrapperHarness(){
  const records=new Map();let captured,authUser=null,client=null;
  const ref=key=>({key,get:async()=>({data:()=>records.get(key)}),set:async(value,options)=>records.set(key,options?.merge?{...records.get(key),...value}:value)});
  const db={collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction:async cb=>cb({get:r=>r.get(),set:(r,v)=>records.set(r.key,v)})};
  const firestore=()=>db;firestore.Timestamp={fromMillis:value=>value};
  const mockRequire=name=>name==='firebase-functions/v2/https'?{onRequest:(config,handler)=>({config,handler})}:name==='firebase-admin'?{firestore}:name==='nodemailer'?{createTransport:()=>({sendMail:async()=>({accepted:['jerome@leroyfactory.fr']})})}:name==='./pro-session'?{clientFromSessionToken:async()=>client}:name==='./auth'?{getAgentFromRequest:async()=>authUser}:name==='./fenice-request-core'?{...core,createFeniceRequestHandler:options=>{captured=options;return ()=>{};}}:require(name);
  const exports={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../fenice-request.js'),'utf8'),{require:mockRequire,exports,__dirname:path.join(__dirname,'..'),process:{env:{SMTP_PASSWORD_JEROME:'SYNTHETIC_ONLY'}},console,Buffer,Date,Set,Map,Promise},{filename:'fenice-request.js'});
  return {records,captured,config:exports.feniceRequest.config,setAgent:value=>{authUser=value;},setClient:value=>{client=value;}};
}
test('Firebase wrapper uses its existing SMTP secret and verifies provided credentials',async()=>{
  const h=wrapperHarness();assert.deepEqual(Array.from(h.config.secrets),['SMTP_PASSWORD_JEROME']);assert.equal(h.config.region,'us-central1');
  assert.equal(await h.captured.verifyIdentity({headers:{}},{}),null);
  await assert.rejects(()=>h.captured.verifyIdentity({headers:{authorization:'Bearer fake'}},{}),e=>e.status===401);
  await assert.rejects(()=>h.captured.verifyIdentity({headers:{}},{sessionToken:'x'}),e=>e.status===401);
  h.setClient({client:{codeClient:'LRF-00987'}});assert.equal((await h.captured.verifyIdentity({headers:{}},{sessionToken:'x'.repeat(43)})).client.codeClient,'LRF-00987');
  h.setAgent({email:'jerome@leroyfactory.fr'});assert.equal((await h.captured.verifyIdentity({headers:{authorization:'Bearer actual'}},{})).agent.email,'jerome@leroyfactory.fr');
});
test('persistent rate limiting permits eight fresh requests but keeps accepted replay idempotent',async()=>{
  const h=wrapperHarness(),req={ip:'192.0.2.99'};
  for(let i=0;i<8;i++)assert.equal(await h.captured.reserve('fenice-'+i,'hash-'+i,req),'reserved');
  await assert.rejects(()=>h.captured.reserve('fenice-nine','hash-nine',req),e=>e.status===429);
  await h.captured.complete('fenice-0','synthetic-message-id');assert.equal(await h.captured.reserve('fenice-0','hash-0',req),'sent');
  await assert.rejects(()=>h.captured.reserve('fenice-0','other-hash',req),e=>e.status===409);
  assert(!JSON.stringify([...h.records.keys()]).includes('192.0.2.99'));
});
