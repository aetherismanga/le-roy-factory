'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PDFDocument}=require('pdf-lib');
const {prepareOrder,crmCustomer,checkedId,customerDetails,destinations}=require('../saxso-order-core.cjs');
const {createOrderPdf}=require('../saxso-order-pdf.cjs');
const book=new Map([['a',{label:'A · Dalles adoucies',unit:'m²',perPallet:12.3,weightPerUnit:20,cents:2365}],['b',{label:'B · Margelle',unit:'ml',perPallet:12.35,weightPerUnit:15,cents:578}]]);
const customer={store:'Négoce du Sud',email:'vendeuse@example.invalid',address:'10 rue du Port\n34000 Montpellier',contact:'Anaïs Test',phone:'06 01 02 03 04'};
const body=()=>({requestId:randomUUID(),customer,lines:[{variantId:'a',palettes:2,cents:1},{variantId:'b',palettes:2,cents:0}],comment:'Accès dépôt à droite.'});
test('mixed full pallets priced only by server and rounded per line',()=>{
  const order=prepareOrder(body(),book,true);
  assert.equal(order.pallets,4);assert.equal(order.lines[0].quantity,24.6);assert.equal(order.lines[1].quantity,24.7);
  assert.equal(order.lines[0].cents,58179);assert.equal(order.lines[1].cents,14277);
  assert.equal(order.cents,72456);assert.equal(order.lines[0].weightKg,492);
  assert.deepEqual(destinations,['export@saxso.it','jerome@leroyfactory.fr']);
});
test('refuse fewer than four, unknown variants, unsupported counts, stale totals and duplicate lines',()=>{
  const run=b=>prepareOrder({...body(),...b},book,true);
  for (const palettes of [0,-4,0.5,'4',1000]) assert.throws(()=>run({lines:[{variantId:'a',palettes}]}));
  assert.throws(()=>run({lines:[{variantId:'a',palettes:3}]}),/4 palettes/);
  assert.throws(()=>run({lines:[{variantId:'unknown',palettes:5}]}),/confirmer/);
  assert.throws(()=>run({expectedTotalCents:1}),/changé/);
  assert.throws(()=>run({lines:[{variantId:'a',palettes:2},{variantId:'a',palettes:2}]}),/dupliquées/);
});
test('validate order contacts and retain independent CRM delivery address',()=>{
  assert.throws(()=>checkedId('../clients'));
  assert.throws(()=>customerDetails({...customer,email:'a@example.org,xyz@evil.com'}));
  assert.throws(()=>customerDetails({...customer,phone:'hello'}));
  const c=crmCustomer({societe:'S',email:'test@example.invalid',adresseLivraison:'Livraison',villeLivraison:'Lyon',codePostalLivraison:'69000',contacts:[{prenom:'A',nom:'B',telephone:'0102030405'}]});
  assert.equal(c.address,'Livraison\n69000 Lyon');assert.equal(c.contact,'A B');assert.equal(c.phone,'0102030405');
});
test('draft PDF below threshold, long descriptions, seller and comment paginate',async()=>{
  const draft=prepareOrder({...body(),lines:[{variantId:'a',palettes:1}]},book,false);
  const draftBytes=await createOrderPdf(draft,{draft:true});
  assert.equal((await PDFDocument.load(draftBytes)).getPageCount(),1);
  const lines=Array.from({length:53},()=>({...draft.lines[0],label:'Dallage naturel en finition adoucie avec chants et côtés vieillis · format 40,6 × 61 cm'}));
  const bytes=await createOrderPdf({...draft,lines,comment:'Texte de livraison répété. '.repeat(65)});
  assert.ok((await PDFDocument.load(bytes)).getPageCount()>4);
});

function endpointHarness(){
  const path=require('node:path'), fs=require('node:fs'), vm=require('node:vm');
  const sourcePath=path.resolve(__dirname,'../saxso-order.js');
  const requireLocal=require('node:module').createRequire(sourcePath);
  const version=requireLocal('./data/saxso-order-version.json');
  const sampleRows=Array.from({length:53},(_,index)=>({...book.get(index===0?'a':'b'),variantIds:[index===0?'a':index===1?'b':'test-'+index]}));
  const matrix=Buffer.from(JSON.stringify({...version,rows:sampleRows}));
  const docs=new Map(),messages=[];
  const db={
    collection(){return {doc(key){return {id:key,update:async patch=>docs.set(key,{...docs.get(key),...patch})};}};},
    runTransaction(fn){return fn({get:async ref=>({data:()=>docs.get(ref.id)}),set:(ref,data)=>docs.set(ref.id,data)});}
  };
  const state={client:{id:'acct',partenaires:['saxso'],codeClient:'LRF-55555',departement:'34'},partial:false};
  const mocks={
    'firebase-functions/v2/https':{onRequest:(_,handler)=>handler},
    'firebase-admin':{firestore:()=>db,storage:()=>({bucket:()=>({file:()=>({download:async()=>[matrix]})})})},
    nodemailer:{createTransport:()=>({sendMail:async message=>{
      messages.push(message);
      return {accepted:state.partial?[destinations[0]]:message.envelope.to};
    }})},
    './auth':{getAgentFromRequest:async()=>null},
    './pro-session':{clientFromSessionToken:async()=>null},
    './pro-client-access.cjs':{findEligibleProClient:async()=>state.client}
  };
  const context={module:{exports:{}},process:{env:{SMTP_PASSWORD_JEROME:'synthetic'}},Buffer,console,require:name=>mocks[name]||requireLocal(name)};
  context.exports=context.module.exports;
  vm.runInNewContext(fs.readFileSync(sourcePath,'utf8'),context);
  async function post(data){
    const res={statusCode:200,set(){},status(code){this.statusCode=code;return this;},json(result){this.body=result;},send(result){this.body=result;}};
    await context.exports.saxsoOrder({headers:{origin:'https://leroyfactory.fr'},body:data,method:'POST'},res);
    return res;
  }
  return {state,docs,messages,post};
}
test('live partner access required even with a known product; three pallets cannot send',async()=>{
  const h=endpointHarness(), data={action:'send',...body()};
  h.state.client.partenaires=[];
  assert.equal((await h.post(data)).statusCode,403);
  h.state.client.partenaires=['saxso'];
  assert.equal((await h.post({...data,lines:[{variantId:'b',palettes:3}]})).statusCode,400);
  assert.equal(h.messages.length,0);assert.equal(h.docs.size,0);
});
test('actual handler attaches a readable PDF; repeats use the same order and cannot redirect recipients',async()=>{
  const h=endpointHarness(),data={action:'send',...body(),to:'customer@example.invalid'};
  const first=await h.post(data);
  assert.equal(first.statusCode,200);assert.equal(first.body.orderId,'SAX-'+data.requestId.toUpperCase());
  assert.equal((await h.post(data)).statusCode,200);assert.equal(h.messages.length,1);
  const message=h.messages[0];
  assert.deepEqual([...message.envelope.to],destinations);
  assert.equal(message.replyTo.address,customer.email);
  assert.equal((await PDFDocument.load(message.attachments[0].content)).getPageCount(),1);
  assert.equal((await h.post({...data,comment:'changed'})).statusCode,409);assert.equal(h.messages.length,1);
});
test('retry after partial SMTP acceptance reaches only outstanding recipient',async()=>{
  const h=endpointHarness(),data={action:'send',...body()};
  h.state.partial=true;assert.equal((await h.post(data)).statusCode,503);
  h.state.partial=false;assert.equal((await h.post(data)).statusCode,200);
  assert.deepEqual([...h.messages[1].envelope.to],[destinations[1]]);
  assert.equal((await h.post(data)).statusCode,200);assert.equal(h.messages.length,2);
});
