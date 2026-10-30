import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../assets/js/client-direct-email.js',import.meta.url),'utf8');
const actualFunction=source.slice(source.indexOf('async function sendDirectMail()'),source.indexOf('\nfunction setupEvents()'));
function fixture({historyId='server-history',archiveFailure=false,delayToken=false}={}){
  const button={disabled:false,textContent:''},requests=[],writes=[],alerts=[];
  let closed=0,releaseToken;
  const deferred=delayToken?new Promise(resolve=>{releaseToken=resolve}):Promise.resolve('test-token');
  const fields={'client-mail-sender':{value:'jerome'},'client-mail-subject':{value:'Objet fictif'},'client-mail-body':{value:'Message fictif'},'client-mail-send':button};
  const context={
    currentMailClient:{id:'actual-client-a',societe:'Client fictif A'},mailAttachments:[{filename:'fictif.txt',content:'fixture'}],
    document:{getElementById:id=>fields[id],querySelectorAll:()=>[{value:'test@example.com'},{value:'TEST@example.com'}]},
    norm:s=>s.trim().toLowerCase(),esc:s=>s,SIGNATURES:{jerome:'signature'},SEND_URL:'https://example.com/fake-mail',
    waitForAgent:async()=>({name:'Test'}),auth:{currentUser:{getIdToken:()=>deferred}},
    async fetch(url,options){requests.push({url,options});return {ok:true,json:async()=>({success:true,historyId})};},
    db:{},doc:(_db,collection,id)=>`${collection}/${id}`,collection:(_db,name)=>name,arrayUnion:entry=>entry,
    async updateDoc(ref,data){if(archiveFailure)throw new Error('Simulated archive failure');writes.push({ref,data});},
    async addDoc(ref,data){writes.push({ref,data});},
    alert:value=>alerts.push(value),closeMailModal:()=>{closed++},console:{warn:()=>{},error:()=>{}},Date,Map,Array,Error
  };
  vm.runInNewContext(actualFunction,context);
  return {context,button,requests,writes,alerts,closed:()=>closed,releaseToken:()=>releaseToken?.('test-token')};
}
test('accepted direct mail uses explicit auth and server history without duplicate writes',async()=>{
  const f=fixture();await f.context.sendDirectMail();
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].options.headers.Authorization,'Bearer test-token');
  const payload=JSON.parse(f.requests[0].options.body);
  assert.deepEqual(payload.clientIds,['actual-client-a']);assert.equal(payload.bccRecipients.length,1);
  assert.equal(f.writes.length,0);assert.equal(f.closed(),1);assert.match(f.alerts[0],/succès/);
});
test('in-flight direct mail keeps original client and attachments, and leaves a newly opened draft intact',async()=>{
  const f=fixture({delayToken:true});
  const first=f.context.sendDirectMail();
  f.context.currentMailClient={id:'actual-client-b',societe:'Client fictif B'};
  f.context.mailAttachments=[{filename:'other.txt',content:'other'}];
  await f.context.sendDirectMail();
  f.releaseToken();await first;
  assert.equal(f.requests.length,1);
  const payload=JSON.parse(f.requests[0].options.body);
  assert.deepEqual(payload.clientIds,['actual-client-a']);assert.equal(payload.attachments[0].filename,'fictif.txt');
  assert.equal(f.closed(),0);assert.equal(f.context.currentMailClient.id,'actual-client-b');assert.equal(f.button.disabled,false);
});
test('legacy fallback writes only the client captured before authentication',async()=>{
  const f=fixture({historyId:null,delayToken:true});
  const sending=f.context.sendDirectMail();f.context.currentMailClient={id:'actual-client-b',societe:'Client fictif B'};
  f.releaseToken();await sending;
  assert.equal(f.writes[0].ref,'clients/actual-client-a');
  assert.equal(f.writes[1].data.clientId,'actual-client-a');assert.equal(f.writes[1].data.client,'Client fictif A');
});
test('failed archival after an accepted direct send still reports success and resets the guard',async()=>{
  const f=fixture({historyId:null,archiveFailure:true});await f.context.sendDirectMail();
  assert.equal(f.requests.length,1);assert.match(f.alerts[0],/succès/);
  assert.equal(f.context.sendDirectMail.sending,false);assert.equal(f.button.disabled,false);
});
