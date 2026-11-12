'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../elios-samples-core.cjs');
const catalogue={budgetYear:2027,products:[{key:'ELIOS|synthetic',reference:'synthetic',collection:'Exemple',color:'Beige',format:'60x60',finish:'R10',packVerified:true,packArea:1.44,packPieces:4,vrac:true},{key:'ELIOS|other',reference:'other',collection:'Exemple',packVerified:false,vrac:false}],merchandising:[{id:'kit-synthetic',reference:'KIT',collection:'Exemple',description:'Kit exemple',valueUnitHT:170},{id:'kit-unpriced',reference:'UNKNOWN',collection:'Exemple',description:'Prix non confirmé'}]};
test('exhibition is 50% of the current net HT, rounded to full boxes and line cents',()=>{
 const q=C.buildQuote([{type:'box',key:'ELIOS|synthetic',quantity:2}],catalogue,{'ELIOS|synthetic':{purchaseHT:12}});
 assert.equal(q.rows[0].boxes,2);assert.equal(q.rows[0].quantity,2.88);assert.equal(q.rows[0].unitHT,6);assert.equal(q.totalHT,17.28);
 const changed=C.buildQuote([{type:'box',key:'ELIOS|synthetic',quantity:1.44}],catalogue,{'ELIOS|synthetic':{purchaseHT:22}});assert.equal(changed.rows[0].unitHT,11);assert.equal(changed.totalHT,15.84);
});
test('client amounts, discounts and reference names never override the canonical catalogue',()=>{
 const q=C.buildQuote([{type:'box',key:'ELIOS|synthetic',quantity:1.44,totalHT:0,netHT:1,discount:100,reference:'forged'}],catalogue,{'ELIOS|synthetic':{purchaseHT:12}});assert.equal(q.rows[0].reference,'synthetic');assert.equal(q.totalHT,8.64);assert.equal(q.rows[0].discount,50);
});
test('live existing HT tariffs update ordinary SKUs without substituting a base price for a decor',()=>{
 const c={products:[{key:'base',slug:'azuli-mood',format:'5x15',finish:'8,5 mm',color:'Chalk'},{key:'decor',slug:'allure',format:'60x120',color:'Fenix Blueberry'},{key:'outdoor',slug:'shell',format:'60x60',finish:'20 mm'}]};
 const prices=C.currentPrices(c,{base:{purchaseHT:10},decor:{purchaseHT:22}},{'azulimood|5x15|standard':{amount:12,label:'12 € net/m²'},'allure|60x120|standard':{amount:12},'shell|60x60|20':{amount:20}});
 assert.equal(prices.base.purchaseHT,12);assert.equal(prices.decor.purchaseHT,22);assert.equal(prices.outdoor.purchaseHT,20);
});
test('vrac permits exactly one labelled piece on the supplier allowlist',()=>{
 assert.equal(C.buildQuote([{type:'vrac',key:'ELIOS|synthetic',quantity:1,label:false}],catalogue).totalHT,0);
 assert.equal(C.buildQuote([{type:'vrac',key:'ELIOS|synthetic',quantity:1}],catalogue).rows[0].label,true);
 for(const input of [{type:'vrac',key:'ELIOS|synthetic',quantity:2},{type:'vrac',key:'ELIOS|other',quantity:1},{type:'vrac',key:'unknown',quantity:1}])assert.throws(()=>C.buildQuote([input],catalogue));
});
test('missing box rates and profile costs keep the payable total incomplete',()=>{
 const q=C.buildQuote([{type:'box',key:'ELIOS|synthetic',quantity:1}],catalogue,{});assert.equal(q.totalHT,null);assert.equal(q.incomplete,true);
 const m=C.buildQuote([{type:'merchandising',key:'kit-synthetic',quantity:2}],catalogue);assert.equal(m.totalHT,0);assert.equal(m.rows[0].totalHT,0);assert.equal(m.incomplete,false);
 const p=C.buildQuote([{type:'vrac',key:'ELIOS|synthetic',quantity:1}],catalogue,{},2.5);assert.equal(p.totalHT,null);assert.equal(p.profiles,2.5);
});
test('merchandising canonical value is displayed separately and never billed or approved by the browser',()=>{
 const rows=[{type:'merchandising',key:'kit-synthetic',quantity:2,valueUnitHT:1,unitHT:100,totalHT:200,factoryApproved:true},{type:'box',key:'ELIOS|synthetic',quantity:1.44}];
 const q=C.buildQuote(rows,catalogue,{'ELIOS|synthetic':{purchaseHT:12}});
 assert.equal(q.totalHT,8.64);assert.equal(q.merchandisingValueHT,340);assert.equal(q.merchandisingValueIncomplete,false);assert.equal(q.budgetYear,2027);
 assert.equal(q.rows[0].valueUnitHT,170);assert.equal(q.rows[0].valueTotalHT,340);assert.equal(q.rows[0].payable,false);assert.equal(q.rows[0].factoryApprovalRequired,true);assert.equal(q.rows[0].factoryApproved,undefined);
 const html=C.mailHTML({reference:'TEST',account:{societe:'Test'},contact:{name:'Test',email:'test@example.invalid',address:'Test'},quote:q,title:'Test'});
 assert(html.includes('340,00'));assert(html.includes('Hors montant à payer'));assert(html.includes('Montant à payer HT'));assert(!html.includes('7 %'));
});
test('unknown indicative merchandising values never become zero valuations or incomplete customer charges',()=>{
 const q=C.buildQuote([{type:'merchandising',key:'kit-unpriced',quantity:1}],catalogue);
 assert.equal(q.rows[0].valueTotalHT,null);assert.equal(q.merchandisingValueIncomplete,true);assert.equal(q.totalHT,0);assert.equal(q.incomplete,false);
});
test('unknown packaging, repeated references and non-finite quantities are rejected',()=>{
 for(const rows of [[{type:'box',key:'ELIOS|other',quantity:1}],[{type:'box',key:'ELIOS|synthetic',quantity:NaN}],[{type:'merchandising',key:'kit-synthetic',quantity:1.5}],[{type:'vrac',key:'ELIOS|synthetic',quantity:1},{type:'vrac',key:'ELIOS|synthetic',quantity:1}]])assert.throws(()=>C.buildQuote(rows,catalogue));
});
test('visual validation rejects small, corrupted and missing images',()=>{
 for(const visual of ['',null,'data:image/jpeg;base64,aGVsbG8=','data:image/png;base64,'+Buffer.alloc(80).toString('base64')])assert.throws(()=>C.pngAttachment(visual));
});
test('project exports remove credentials and amounts while keeping geometry',()=>{
 const p=C.checkedProject({version:2,room:{points:[[0,0],[240,0],[240,240],[0,240]]},walls:[],items:[],token:'private',nested:{purchaseHT:12,reference:'synthetic'},title:'Mon box'});assert.equal(p.token,undefined);assert.deepEqual(p.nested,{reference:'synthetic'});assert.equal(p.room.points.length,4);
});
test('request identity binds content, contact and project while ignoring browser recipients',()=>{
 const body={items:[{type:'vrac',key:'ELIOS|synthetic',quantity:1}],contact:{name:'Exemple'}};const account={owner:'client:synthetic'};
 assert.equal(C.requestFingerprint(body,account),C.requestFingerprint({...body,to:['attacker@example.invalid']},account));assert.notEqual(C.requestFingerprint(body,account),C.requestFingerprint({...body,contact:{name:'Other'}},account));assert.deepEqual(C.RECIPIENTS,['glebreton@eliosceramica.it','ctoni@eliosceramica.it','jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
});

function endpointFixture(){
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),values=new Map(),stored=new Map(),mails=[];
 const ref=key=>({id:key.split('/').at(-1),get:async()=>({data:()=>values.get(key)}),set:async value=>{values.set(key,value);},update:async value=>{values.set(key,{...values.get(key),...value});}});
 const db={collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction:async callback=>callback({get:r=>r.get(),set:(r,v)=>r.set(v)})};
 const firestore=()=>db;firestore.Timestamp={fromMillis:ms=>ms};firestore.FieldValue={serverTimestamp:()=>Date.now()};
 const bucket={file:key=>({getMetadata:async()=>[{size:200}],download:async()=>[Buffer.from(JSON.stringify({version:1,variant:'studio-one',products:[{key:'ELIOS|synthetic',purchaseHT:12}],plinths:[]}))],save:async(bytes,options)=>{stored.set(key,{bytes,options});}})};
 const module={exports:{}},source=fs.readFileSync(path.join(__dirname,'../elios-samples.js'),'utf8');let valid=true,failMail=false;
 const client={id:'synthetic-client',societe:'Magasin test',codeClient:'LRF-12345',partenaires:['Elios'],contact:'Contact test',email:'contact@example.invalid',adresse:'1 rue Exemple',codePostal:'34000',ville:'Montpellier'};
 const req=name=>name==='firebase-functions/v2/https'?{onRequest:(options,handler)=>({options,handler})}:name==='firebase-admin'?{firestore,storage:()=>({bucket:()=>bucket})}:name==='nodemailer'?{createTransport:()=>({sendMail:async mail=>{mails.push(mail);if(failMail)throw Error('SMTP uncertain');return {accepted:[...C.RECIPIENTS],messageId:'synthetic-message'};}})}:name==='./pro-session'?{clientFromSessionToken:async token=>valid&&token==='synthetic-token'?{client}:null}:name==='./auth'?{getAgentFromRequest:async()=>null}:name==='./elios-samples-catalogue.json'?catalogue:name==='./elios-samples-core.cjs'?C:name.startsWith('./')?require(path.join(__dirname,'..',name)):require(name);
 vm.runInNewContext(source,{exports:module.exports,module,require:req,Buffer,console,Date,process:{env:{SMTP_PASSWORD_JEROME:'synthetic-secret'}},AbortSignal,fetch:async(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.sessionToken,'synthetic-token');return {ok:true,json:async()=>({success:true,allowedPartners:['elios-ceramica'],expiresAt:Date.now()+60000,elios:{}})};}},{filename:'elios-samples.js'});
 const request=async body=>{const response={headers:{},statusCode:200,set(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;},send(value){this.body=value;return this;}};await module.exports.eliosSamples.handler({method:'POST',headers:{origin:'https://leroyfactory.fr'},body},response);return response;};
 return {request,mails,stored,values,revoke(){valid=false;},failMail(){failMail=true;}};
}
test('the complete request handler revalidates access and never sends during quote or anonymous calls',async()=>{
 const f=endpointFixture(),items=[{type:'vrac',key:'ELIOS|synthetic',quantity:1}];let r=await f.request({action:'send',items,isAdmin:true});assert.equal(r.statusCode,401);assert.equal(f.mails.length,0);
 r=await f.request({action:'quote',items,sessionToken:'synthetic-token'});assert.equal(r.statusCode,200);assert.equal(r.body.quote.totalHT,0);assert.equal(f.mails.length,0);assert.equal(f.values.size,0);
 f.revoke();r=await f.request({action:'quote',items,sessionToken:'synthetic-token'});assert.equal(r.statusCode,401);
});
test('SMTP is addressed to exactly the four requested people and retrying a sent request is idempotent',async()=>{
 const f=endpointFixture(),payload={action:'send',sessionToken:'synthetic-token',requestId:'synthetic-request-id-123456',items:[{type:'vrac',key:'ELIOS|synthetic',quantity:1}],contact:{name:'Contact test',email:'contact@example.invalid',address:'1 rue Exemple'},to:['attacker@example.invalid']};
 let r=await f.request(payload);assert.equal(r.statusCode,200);assert.equal(r.body.delivered,true);assert.equal(f.mails.length,1);assert.deepEqual(f.mails[0].to,C.RECIPIENTS);assert.equal(f.mails[0].attachments.length,0);
 const stored=[...f.values].find(([key])=>key.startsWith('elios_sample_requests/'))[1];assert.equal(stored.budgetYear,2027);assert.equal(stored.factoryApproved,undefined);
 r=await f.request(payload);assert.equal(r.statusCode,200);assert.equal(f.mails.length,1);
 r=await f.request({...payload,contact:{...payload.contact,name:'Changed'}});assert.equal(r.statusCode,409);assert.equal(f.mails.length,1);
});
test('an ambiguous SMTP failure is recorded and cannot be blindly retried',async()=>{
 const f=endpointFixture();f.failMail();const payload={action:'send',sessionToken:'synthetic-token',requestId:'synthetic-request-id-123456',items:[{type:'vrac',key:'ELIOS|synthetic',quantity:1}],contact:{name:'Contact test',email:'contact@example.invalid',address:'1 rue Exemple'}};
 let r=await f.request(payload);assert.equal(r.statusCode,503);assert.equal(f.mails.length,1);r=await f.request(payload);assert.equal(r.statusCode,409);assert.equal(f.mails.length,1);
});
test('a box saves and attaches the same HD PNG plus an importable configuration without credentials',async()=>{
 const chunk=(name,data)=>{const type=Buffer.from(name),header=Buffer.alloc(4);header.writeUInt32BE(data.length);const input=Buffer.concat([type,data]);let crc=0xffffffff;for(const b of input){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const checksum=Buffer.alloc(4);checksum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([header,input,checksum]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1920);ihdr.writeUInt32BE(1080,4);ihdr[8]=8;ihdr[9]=2;
 const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',require('node:zlib').deflateSync(Buffer.alloc((1920*3+1)*1080))),chunk('IEND',Buffer.alloc(0))]);
 const f=endpointFixture(),payload={action:'send',sessionToken:'synthetic-token',requestId:'synthetic-box-request-123456',items:[{type:'box',key:'ELIOS|synthetic',quantity:1.44,unitHT:0}],project:{version:2,room:{points:[[0,0],[240,0],[240,200],[0,200]]},items:[],token:'do-not-export'},visual:'data:image/png;base64,'+png.toString('base64'),contact:{name:'Contact test',email:'contact@example.invalid',address:'1 rue Exemple'}};
 const response=await f.request(payload);assert.equal(response.statusCode,200);assert.equal(response.body.delivered,true);assert.equal(f.mails.length,1);assert.equal(f.mails[0].attachments.length,2);
 assert.deepEqual(f.mails[0].attachments[0].content,png);const configuration=JSON.parse(f.mails[0].attachments[1].content);assert.equal(configuration.format,'lrf-elios-box');assert.equal(configuration.project.token,undefined);assert.equal(configuration.project.room.points.length,4);
 assert.equal(f.stored.size,2);assert([...f.stored.values()].some(row=>Buffer.isBuffer(row.bytes)&&row.bytes.equals(png)));assert(f.mails[0].html.includes('8,64'));
});
