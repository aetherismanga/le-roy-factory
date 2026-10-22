'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=require('../configurator-projects-core');
function harness(){
 const documents=new Map(),messages=[];let failSend=false;
 const snapshot=k=>({exists:documents.has(k),data:()=>documents.get(k)&&structuredClone(documents.get(k))});
 const ref=k=>({key:k,get:async()=>snapshot(k),set:async v=>documents.set(k,structuredClone(v)),delete:async()=>documents.delete(k),update:async v=>{const next={...documents.get(k)};for(const [key,value]of Object.entries(v))if(value==='DELETE_FIELD')delete next[key];else next[key]=value;documents.set(k,next);}});
 const db={
  collection:name=>({
   doc:id=>ref(name+'/'+id),
   where:(field,op,value)=>({limit:()=>({get:async()=>({docs:[...documents].filter(([k,v])=>k.startsWith(name+'/')&&v[field]===value).map(([,v])=>({data:()=>structuredClone(v)}))})})})
  }),
  runTransaction:async callback=>callback({get:r=>r.get(),set:(r,v)=>documents.set(r.key,structuredClone(v)),delete:r=>documents.delete(r.key)})
 };
 const firestore=()=>db;firestore.FieldValue={delete:()=> 'DELETE_FIELD'};firestore.Timestamp={fromMillis:ms=>ms};
 const app={exports:{}};
 const reqModule=name=>name==='firebase-functions/v2/https'?{onRequest:(options,handler)=>handler}:name==='firebase-admin'?{firestore}:name==='nodemailer'?{createTransport:()=>({sendMail:async message=>{if(failSend)throw Object.assign(Error('SMTP refused'),{code:'EAUTH'});messages.push(message);return {accepted:['receiver'],messageId:'test-message-'+messages.length};}})}:name==='./pro-session'?{clientFromSessionToken:async token=>token==='valid-a'||token==='valid-b'?{client:{id:token,societe:'Magasin '+token,codeClient:token==='valid-a'?'LRF-00003':'LRF-00004',partenaires:['Randal'],email:'client@example.com'}}:null}:name==='./auth'?{getAgentFromRequest:async()=>null}:name==='./configurator-projects-core'?core:require(name);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../configurator-projects.js'),'utf8'),{require:reqModule,exports:app.exports,process:{env:{SMTP_PASSWORD_JEROME:'TEST_ONLY'}},console,Buffer,Date,Set},{filename:'configurator-projects.js'});
 const call=async(body,token='valid-a')=>{let status=200,response;const res={set(){return this;},status(n){status=n;return this;},json(data){response=data;return this;},send(data){response=data;return this;}};await app.exports.randalProjects({method:'POST',headers:{authorization:'Bearer '+token},body:{variant:'studio-one',...body}},res);return {status,...JSON.parse(JSON.stringify(response))};};
 return {call,documents,messages,setFail:v=>failSend=v};
}
const record=()=>({id:'project-aaaaaaaa-bbbb-cccc',kind:'bathroom',title:'Salle de bains',revision:0,customer:{name:'Mme Exemple',email:'test@example.com'},data:{version:2,room:{points:[[0,0],[300,0],[300,250],[0,250]],height:260},items:[]}});
test('server validates bounded portable projects and forbids embedded credentials',()=>{assert.throws(()=>core.checkedInput({...record(),data:{...record().data,sessionToken:'secret'}}));assert.throws(()=>core.checkedInput({...record(),id:'../unsafe'}));assert.throws(()=>core.checkedInput({...record(),customer:{email:'bad\nBcc:test@example.com'}}));assert.throws(()=>core.assertEditable({status:'validated'}),/dupliquez/);assert.throws(()=>core.assertRevision({revision:3},2),/autre poste/);assert.notEqual(core.keyFor('a','studio-one','id'),core.keyFor('b','studio-one','id'));});
test('owner isolation, authoritative number, save revisions and irreversible draft deletion',async()=>{const h=harness();const s=await h.call({action:'save',record:record()});assert.equal(s.status,200);assert.match(s.record.number,/^LRF-\d{4}-\d{6}$/);assert.equal(s.record.status,'draft');assert.equal(s.record.revision,1);assert.equal(s.record.account.code,'LRF-00003');assert.equal(s.record.owner,undefined);
 const conflict=await h.call({action:'save',record:record()});assert.equal(conflict.status,409);
 const other=await h.call({action:'delete',id:s.record.id,revision:1},'valid-b');assert.equal(other.status,200);assert.equal((await h.call({action:'list'})).projects.length,1);
 const denied=await h.call({action:'list'},'fake');assert.equal(denied.status,401);
 const list=await h.call({action:'list'});assert.equal(list.projects.length,1);const removed=await h.call({action:'delete',id:s.record.id,revision:1});assert.equal(removed.status,200);assert.equal((await h.call({action:'list'})).projects.length,0);assert.equal((await h.call({action:'save',record:record()})).status,410);assert.deepEqual((await h.call({action:'list'})).deletedIds,[s.record.id]);
});
test('administrator/transfer sends carry store and LRF header plus portable project, without validation',async()=>{const h=harness(),s=await h.call({action:'save',record:record()});assert.equal((await h.call({action:'administrator',id:s.record.id})).delivered,true);assert.equal(h.messages[0].to,'jerome@leroyfactory.fr');assert.match(h.messages[0].subject,/Magasin valid-a · LRF-00003/);assert.match(h.messages[0].attachments[0].filename,/\.lrf3d.json$/);const attachment=JSON.parse(h.messages[0].attachments[0].content);assert.equal(attachment.record.status,'draft');assert.equal(attachment.record.owner,undefined);assert.equal((await h.call({action:'list'})).projects[0].status,'draft');assert.equal((await h.call({action:'email',id:s.record.id,recipient:'bad\nBcc:evil@example.com'})).status,400);});
test('accepted order becomes immutable, repeated order is idempotent, duplication gets a new number',async()=>{const h=harness(),s=await h.call({action:'save',record:record()});const order=await h.call({action:'order',id:s.record.id,revision:s.record.revision});assert.equal(order.record.status,'validated');assert.equal(h.messages.length,1);assert.equal((await h.call({action:'order',id:s.record.id,revision:1})).status,200);assert.equal(h.messages.length,1);assert.equal((await h.call({action:'delete',id:s.record.id,revision:2})).status,409);assert.equal((await h.call({action:'save',record:{...s.record,revision:2}})).status,409);const duplicate=await h.call({action:'save',record:{...record(),id:'project-duplicate-123456'}});assert.equal(duplicate.record.status,'draft');assert.notEqual(duplicate.record.number,s.record.number);});
test('SMTP rejection cannot mark the project validated',async()=>{const h=harness(),s=await h.call({action:'save',record:record()});h.setFail(true);assert.equal((await h.call({action:'order',id:s.record.id,revision:1})).status,503);assert.equal((await h.call({action:'list'})).projects[0].status,'draft');assert.equal(h.messages.length,0);});
test('bounded project images survive cloud synchronization, older clients and transfer files',async()=>{const h=harness(),thumbnail='data:image/webp;base64,UklGRg==';const saved=await h.call({action:'save',record:{...record(),thumbnail}});assert.equal(saved.record.thumbnail,thumbnail);assert.equal((await h.call({action:'list'})).projects[0].thumbnail,thumbnail);const updated=await h.call({action:'save',record:{...record(),revision:1}});assert.equal(updated.record.thumbnail,thumbnail);await h.call({action:'email',id:saved.record.id,recipient:'test@example.com'});assert.equal(JSON.parse(h.messages[0].attachments[0].content).record.thumbnail,thumbnail);assert.equal((await h.call({action:'save',record:{...record(),id:'project-unsafe-image-123',thumbnail:'data:image/svg+xml;base64,PHN2Zz4='}})).status,400);});


test('local-only projects are sent and ordered without project storage in Firestore',async()=>{
 const h=harness(),local={...record(),number:'LOCAL-20261022-AB12CD34'};
 const sent=await h.call({action:'local-administrator',record:local});
 assert.equal(sent.status,200);assert.equal(sent.delivered,true);
 assert.equal(h.messages[0].to,'jerome@leroyfactory.fr');
 assert.match(h.messages[0].subject,/LOCAL-20261022-AB12CD34/);
 assert.equal(JSON.parse(h.messages[0].attachments[0].content).record.number,local.number);
 assert.equal((await h.call({action:'list'})).projects.length,0);
 const forwarded=await h.call({action:'local-email',record:local,recipient:'recipient@example.com'});
 assert.equal(forwarded.delivered,true);assert.equal(h.messages[1].to,'recipient@example.com');
 const order=await h.call({action:'local-order',record:local});
 assert.equal(order.delivered,true);assert.match(h.messages[2].subject,/COMMANDE/);
 assert.equal((await h.call({action:'list'})).projects.length,0);
 assert.equal([...h.documents.keys()].some(k=>k.startsWith('configurator_projects/')),false);
 assert.equal((await h.call({action:'local-email',record:local,recipient:'bad\nBcc:evil@example.com'})).status,400);
 assert.equal((await h.call({action:'local-order',record:{...local,customer:{}}})).status,400);
});
