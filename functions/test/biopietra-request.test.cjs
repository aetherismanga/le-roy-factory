'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../biopietra-request-core');
const {createBiopietraRequestHandler,calculateBoxes}=core;
const catalogue={collections:[
  {slug:'listello-toscana',name:'Listello Toscana',swatches:[{id:'bianco',name:'Bianco'},{id:'rosso',name:'Rosso'}],variants:[
    {id:'fondo-15',label:'Plaques 1,5 cm',component:'fondo',unit:'m²',packQuantity:1,dimensions:'24 × 5,5 cm',thickness:'1,5 cm'},
    {id:'fondo-3',label:'Plaques 3 cm',component:'fondo',unit:'m²',packQuantity:.5,thickness:'3 cm'},
    {id:'angle-3',label:'Angles 3 cm',component:'angle',unit:'ml',packQuantity:.5,thickness:'3 cm'},
    {id:'limited',label:'Variante rouge',component:'fondo',unit:'m²',packQuantity:.8,colorIds:['rosso']}]},
  {slug:'aosta',name:'Aosta',swatches:[],variants:[{id:'fondo',label:'Plaques / fond',component:'fondo',unit:'m²',packQuantity:null}]},
  {slug:'finitions',name:'Finitions',swatches:[],variants:[{id:'cornice',label:'Cornice',component:'piece',unit:'pièce',packQuantity:50}]},
  {slug:'ecokoll',name:'Ecokoll',swatches:[],variants:[{id:'sac',label:'Sac 25 kg',component:'accessory',unit:'kg',packQuantity:25,packLabel:'sac'}]},
  {slug:'bergamo',name:'Bergamo',swatches:[{id:'c58',name:'C58'}],variants:[{id:'angle',label:'Angles Acropoli',component:'angle',unit:'ml',packQuantity:1,relatedCollectionSlug:'acropoli'}]}
]};
const item=()=>({collectionSlug:'listello-toscana',colorId:'bianco',variantId:'fondo-3',requestedQuantity:2.1,requestedUnit:'m²',reference:'Référence à confirmer',packaging:{boxes:999999},name:'FAUX PRODUIT',price:999999});
const body=()=>({requestId:'00000000-0000-4000-8000-000000000001',profile:'private',nom:'Exemple',prenom:'Camille',contact:'Camille Exemple',company:'',email:'camille@example.test',telephone:'0600000000',codePostal:'34740',ville:'Vendargues',secteur:'Vendargues',message:'Un projet de parement',items:[item()]});
function harness(overrides={}) {
  const messages=[],requests=new Map();let identity=null,sendError=false,accepted=['jerome@leroyfactory.fr'],reservations=0;
  const handler=createBiopietraRequestHandler({catalogue,verifyIdentity:async()=>identity,
    async reserve(id,hash){reservations++;const previous=requests.get(id);if(previous){if(previous.hash!==hash)throw Object.assign(Error('changed'),{status:409});if(previous.state==='sent')return 'sent';if(previous.state==='sending')throw Object.assign(Error('pending'),{status:409});}requests.set(id,{hash,state:'sending'});return 'reserved';},
    async complete(id){requests.get(id).state='sent';},async fail(id){requests.get(id).state='failed';},
    async send(message){if(sendError)throw Error('smtp unavailable');messages.push(message);return {accepted,messageId:'fake-transport-id'};},...overrides});
  return {messages,requests,get reservations(){return reservations;},setIdentity(value){identity=value;},setSendError(value){sendError=value;},setAccepted(value){accepted=value;},
    async call(payload=body(),{method='POST',origin='https://leroyfactory.fr'}={}){let status=200,result;const headers={};const res={set(key,value){headers[key]=value;return this;},status(value){status=value;return this;},json(value){result=value;return this;},send(value){result=value;return this;}};await handler({method,headers:{origin},body:payload,ip:'192.0.2.1'},res);return {status,body:result,headers};}};
}
test('canonical references and server box conversion replace every browser name, price and box total',async()=>{
  const h=harness(),result=await h.call();assert.equal(result.status,200);assert.equal(result.body.delivered,true);assert.equal(h.messages.length,1);
  const mail=h.messages[0];assert.equal(mail.to,'jerome@leroyfactory.fr');assert.equal(mail.replyTo,'camille@example.test');assert.equal('cc' in mail,false);assert.equal('bcc' in mail,false);
  assert.match(mail.text,/Listello Toscana/);assert.match(mail.text,/5 boîtes · 2,5 m²/);assert.match(mail.text,/0,5 m²\/boîte/);assert.doesNotMatch(mail.text,/FAUX PRODUIT|999999/);
});
test('angles use their linear-metre carton and exact decimal boundaries do not add another carton',async()=>{
  const h=harness();assert.equal((await h.call({...body(),items:[{...item(),variantId:'angle-3',requestedQuantity:2.1,requestedUnit:'ml'}]})).status,200);assert.match(h.messages[0].text,/5 boîtes · 2,5 ml/);
  assert.deepEqual(calculateBoxes({unit:'m²',packQuantity:.1},.3,'m²'),{status:'known',boxes:3,quantity:.3,unit:'m²',perBox:.1,packLabel:'boîte'});
});
test('sacks retain their actual package label and are recalculated from kilograms',async()=>{
  const h=harness();assert.equal((await h.call({...body(),items:[{collectionSlug:'ecokoll',variantId:'sac',requestedQuantity:58,requestedUnit:'kg'}]})).status,200);assert.match(h.messages[0].text,/3 sacs · 75 kg/);assert.match(h.messages[0].text,/25 kg\/sac/);
});
test('a colour from a parent series cannot be assigned to an associated angle series',async()=>{
  const h=harness();assert.equal((await h.call({...body(),items:[{collectionSlug:'bergamo',colorId:'c58',variantId:'angle',requestedQuantity:3,requestedUnit:'ml'}]})).status,400);assert.equal(h.reservations,0);assert.equal(h.messages.length,0);
});
test('unknown packaging remains explicit and never permits a made-up number of boxes',async()=>{
  const h=harness();assert.equal((await h.call({...body(),items:[{collectionSlug:'aosta',variantId:'fondo',requestedQuantity:8,requestedUnit:'m²',packaging:{boxes:5}}]})).status,200);assert.match(h.messages[0].text,/Conditionnement à confirmer/);assert.doesNotMatch(h.messages[0].text,/5 boîtes/);
  assert.equal((await harness().call({...body(),items:[{collectionSlug:'aosta',variantId:'fondo',requestedQuantity:5,requestedUnit:'boîtes'}]})).status,400);
});
test('a private user may request advice about a known collection without invented variant or quantity',async()=>{
  const h=harness();const result=await h.call({...body(),items:[{collectionSlug:'aosta',colorId:'',variantId:'',requestedQuantity:null,requestedUnit:''}]});assert.equal(result.status,200);assert.match(h.messages[0].text,/Quantité à préciser/);assert.match(h.messages[0].text,/orientation vers un magasin revendeur/);
});
test('forged collection, colour, component variant and incompatible unit all fail before reservation',async()=>{
  for(const patch of [{collectionSlug:'fake'},{colorId:'not-found'},{variantId:'fake'},{variantId:'limited',colorId:'bianco'},{requestedUnit:'ml'},{variantId:'',requestedQuantity:1},{variantId:'',requestedQuantity:null,requestedUnit:'m²'}]){const h=harness();assert.equal((await h.call({...body(),items:[{...item(),...patch}]})).status,400);assert.equal(h.messages.length,0);assert.equal(h.reservations,0);}
});
test('quantity bounds, fractions of boxes and fractions of pieces are rejected',async()=>{
  for(const patch of [{requestedQuantity:0},{requestedQuantity:-1},{requestedQuantity:100001},{requestedQuantity:Infinity},{requestedQuantity:1.5,requestedUnit:'boîtes'},{collectionSlug:'finitions',colorId:'',variantId:'cornice',requestedQuantity:1.5,requestedUnit:'pièce'}])assert.equal((await harness().call({...body(),items:[{...item(),...patch}]})).status,400);
});
test('verified LRF account wins over a browser profile and supplies the canonical account code',async()=>{
  const h=harness();h.setIdentity({client:{codeClient:'LRF-00317',societe:'Magasin réel'}});const result=await h.call({...body(),profile:'professional',company:'Nom inventé',codeClient:'LRF-99999',isAdmin:true});assert.equal(result.status,200);assert.match(h.messages[0].text,/Code LRF vérifié : LRF-00317/);assert.match(h.messages[0].text,/Société : Magasin réel/);assert.doesNotMatch(h.messages[0].text,/LRF-99999|Administrateur vérifié/);
});
test('server account promotion rechecks all professional requirements',async()=>{
  for(const patch of [{items:[{...item(),colorId:''}]},{items:[{collectionSlug:'aosta',variantId:'',requestedQuantity:null,requestedUnit:''}]},{items:[{...item(),requestedQuantity:null}]}]){const h=harness();h.setIdentity({client:{codeClient:'LRF-00317',societe:'Magasin'}});assert.equal((await h.call({...body(),...patch})).status,400);assert.equal(h.reservations,0);}
  const h=harness();h.setIdentity({agent:{email:'jerome@leroyfactory.fr'}});assert.equal((await h.call({...body(),company:'Agence'})).status,200);assert.match(h.messages[0].text,/Administrateur vérifié/);
});
test('unverified professional requests remain labelled unverified and forged browser roles grant nothing',async()=>{
  const h=harness();assert.equal((await h.call({...body(),profile:'professional',company:'Entreprise',isAdmin:true,account:{type:'agent'}})).status,200);assert.match(h.messages[0].text,/Professionnel non connecté — identité à confirmer/);assert.doesNotMatch(h.messages[0].text,/Administrateur vérifié/);
});
test('invalid live identity is rejected before an email can be queued',async()=>{
  const h=harness({verifyIdentity:async()=>{throw Object.assign(Error('session expirée'),{status:401});}});assert.equal((await h.call()).status,401);assert.equal(h.messages.length,0);assert.equal(h.reservations,0);
});
test('CORS, method, honeypot, invalid JSON and payload bounds fail without sending',async()=>{
  const h=harness();assert.equal((await h.call(body(),{origin:'https://attacker.example'})).status,403);assert.equal((await h.call(body(),{origin:''})).status,403);assert.equal((await h.call(body(),{method:'GET'})).status,405);assert.equal((await h.call(body(),{method:'OPTIONS'})).status,204);
  for(const payload of [{...body(),societe_web:'spam'},{...body(),items:Array.from({length:31},item)},{...body(),message:'x'.repeat(50001)},'{invalid'])assert.ok([400,429].includes((await h.call(payload)).status));assert.equal(h.messages.length,0);
});
test('headers and HTML are validated or escaped while safe multiline messages remain readable',async()=>{
  const h=harness();await h.call({...body(),nom:'<img src=x>',message:'<script>bad()</script>\nQuestion suivante'});assert.doesNotMatch(h.messages[0].html,/<script>/);assert.match(h.messages[0].html,/&lt;script&gt;/);assert.match(h.messages[0].text,/\nQuestion suivante/);
  for(const patch of [{email:'a@example.test\r\nBcc:x@example.test'},{contact:'x\nBcc:x@example.test'},{telephone:'email@example.test'},{codePostal:'123456'},{requestId:'../unsafe'}])assert.equal((await harness().call({...body(),...patch})).status,400);
});
test('repeat accepted request is idempotent and changed content with the same ID conflicts',async()=>{
  const h=harness();assert.equal((await h.call()).body.delivered,true);assert.equal((await h.call()).body.duplicate,true);assert.equal(h.messages.length,1);assert.equal((await h.call({...body(),message:'Modifié'})).status,409);
});
test('SMTP refusal cannot claim delivery and retry preserves the request reference',async()=>{
  const h=harness();h.setSendError(true);assert.equal((await h.call()).status,503);h.setSendError(false);h.setAccepted([]);assert.equal((await h.call()).status,503);h.setAccepted(['jerome@leroyfactory.fr']);assert.equal((await h.call()).body.delivered,true);
});
test('SMTP acceptance remains authoritative if the delivery-status write fails',async()=>{
  const h=harness({complete:async()=>{throw Error('transient write');}});assert.equal((await h.call()).body.delivered,true);assert.equal(h.requests.get(body().requestId).state,'sending');assert.equal((await h.call()).status,409);assert.equal(h.messages.length,1);
});
test('deployment exports only the new handler and keeps its document-validation snapshot private',()=>{
  const root=path.resolve(__dirname,'../..');
  const entry=readFileSync(path.join(root,'functions/entry.js'),'utf8');assert.match(entry,/require\('\.\/biopietra-request'\)/);
  const wrapper=readFileSync(path.join(root,'functions/biopietra-request.js'),'utf8');assert.match(wrapper,/SMTP_PASSWORD_JEROME/);assert.match(wrapper,/clientFromSessionToken\(body.sessionToken,\{renew:false\}\)/);assert.match(wrapper,/getAgentFromRequest\(req\)/);
});
test('server ordering facts match every public collection, colour and documented variant',()=>{
  const root=path.resolve(__dirname,'../..');
  const data=JSON.parse(readFileSync(path.join(root,'assets/data/biopietra-catalogue.json'),'utf8'));
  const snapshot=JSON.parse(readFileSync(path.join(root,'functions/biopietra-catalogue.json'),'utf8'));
  assert.equal(snapshot.version,data.version);
  assert.deepEqual(snapshot.collections,data.collections.map(product=>({slug:product.slug,name:product.name,swatches:(product.swatches || []).map(color=>({id:color.id,name:color.name})),variants:product.variants || []})));
});
function wrapperHarness() {
  const records=new Map();let captured,authUser=null,client=null;
  const ref=key=>({key,get:async()=>({data:()=>records.get(key)}),set:async(value,options)=>records.set(key,options?.merge?{...records.get(key),...value}:value)});
  const db={collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction:async callback=>callback({get:r=>r.get(),set:(r,v)=>records.set(r.key,v)})};
  const firestore=()=>db;firestore.Timestamp={fromMillis:value=>value};
  const mockRequire=name=>name==='firebase-functions/v2/https'?{onRequest:(config,handler)=>({config,handler})}:name==='firebase-admin'?{firestore}:name==='nodemailer'?{createTransport:()=>({sendMail:async()=>({accepted:['jerome@leroyfactory.fr']})})}:name==='./pro-session'?{clientFromSessionToken:async()=>client}:name==='./auth'?{getAgentFromRequest:async()=>authUser}:name==='./fenice-request-core'?require('../fenice-request-core'):name==='./biopietra-request-core'?{...core,createBiopietraRequestHandler:options=>{captured=options;return ()=>{};}}:require(name);
  const exports={};vm.runInNewContext(readFileSync(path.join(__dirname,'../biopietra-request.js'),'utf8'),{require:mockRequire,exports,__dirname:path.join(__dirname,'..'),process:{env:{SMTP_PASSWORD_JEROME:'SYNTHETIC_ONLY'}},console,Buffer,Date,Set,Map,Promise},{filename:'biopietra-request.js'});
  return {records,captured,config:exports.biopietraRequest.config,setAgent:value=>{authUser=value;},setClient:value=>{client=value;}};
}
test('Firebase wrapper rejects invalid credentials instead of downgrading to an anonymous inquiry',async()=>{
  const h=wrapperHarness();assert.deepEqual(Array.from(h.config.secrets),['SMTP_PASSWORD_JEROME']);assert.equal(h.config.region,'us-central1');
  assert.equal(await h.captured.verifyIdentity({headers:{}},{}),null);
  await assert.rejects(()=>h.captured.verifyIdentity({headers:{authorization:'Bearer fake'}},{}),error=>error.status===401);
  await assert.rejects(()=>h.captured.verifyIdentity({headers:{}},{sessionToken:'x'}),error=>error.status===401);
  h.setClient({client:{codeClient:'LRF-00987'}});assert.equal((await h.captured.verifyIdentity({headers:{}},{sessionToken:'x'.repeat(43)})).client.codeClient,'LRF-00987');
  h.setAgent({email:'jerome@leroyfactory.fr'});assert.equal((await h.captured.verifyIdentity({headers:{authorization:'Bearer actual'}},{})).agent.email,'jerome@leroyfactory.fr');
});
test('persistent Biopietra rate limits allow eight fresh requests and retain accepted replay idempotence',async()=>{
  const h=wrapperHarness(),req={ip:'192.0.2.99'};
  for(let i=0;i<8;i++)assert.equal(await h.captured.reserve('biopietra-'+i,'hash-'+i,req),'reserved');
  await assert.rejects(()=>h.captured.reserve('biopietra-nine','hash-nine',req),error=>error.status===429);
  await h.captured.complete('biopietra-0','synthetic-message-id');assert.equal(await h.captured.reserve('biopietra-0','hash-0',req),'sent');
  await assert.rejects(()=>h.captured.reserve('biopietra-0','other-hash',req),error=>error.status===409);
  assert.ok(!JSON.stringify([...h.records.keys()]).includes('192.0.2.99'));
});
