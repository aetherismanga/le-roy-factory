import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../assets/js/mails-groupes.js',import.meta.url),'utf8');
const functionSource=source.slice(source.indexOf('async function executeEmailSending()'),source.indexOf('\nasync function loadHistory()'));
function fixture({historyId='server-record',archiveFailure=false}={}){
  const button={disabled:false,textContent:''},alerts=[],requests=[],writes=[];
  const fields={'btn-confirm-send':button,'select-sender':{value:'jerome'},'email-subject':{value:'Essai fictif'}};
  const context={
    document:{getElementById:id=>fields[id]},
    selectedContacts:new Map([['one',{clientId:'a',email:'test@example.com'}],['two',{clientId:'a',email:'TEST@example.com'}]]),
    norm:s=>s.toLowerCase(),getMessageHtml:()=>'<p>Test fictif</p>',SIGNATURES:{jerome:'signature'},attachedFiles:[],inlineImages:[],
    waitForAgent:async()=>({name:'Test'}),auth:{currentUser:{getIdToken:async()=>'fictitious-token'}},
    async fetch(url,options){requests.push({url,options});return {ok:true,json:async()=>({success:true,historyId})};},
    db:{},collection:(_db,name)=>name,doc:(_db,collection,id)=>`${collection}/${id}`,arrayUnion:value=>value,
    async addDoc(ref,data){if(archiveFailure)throw new Error('Test archival failure');writes.push({ref,data});},
    async updateDoc(ref,data){writes.push({ref,data});},
    alert:value=>alerts.push(value),closeModal:()=>{},location:{reload:()=>{}},console:{warn:()=>{},error:()=>{}},Date,Map,Set,Error
  };
  vm.runInNewContext(functionSource,context);
  return {...context,button,alerts,requests,writes};
}
test('server historyId prevents duplicate mail/client history writes',async()=>{
  const f=fixture();await f.executeEmailSending();
  assert.equal(f.requests.length,1);
  const request=f.requests[0].options;
  assert.equal(request.headers.Authorization,'Bearer fictitious-token');
  assert.deepEqual(JSON.parse(request.body).clientIds,['a']);
  assert.equal(JSON.parse(request.body).bccRecipients.length,1);
  assert.equal(f.writes.length,0);
  assert.match(f.alerts[0],/succès/);
});
test('legacy server uses one fallback history and one unique client update',async()=>{
  const f=fixture({historyId:null});await f.executeEmailSending();
  assert.equal(f.writes.filter(write=>write.ref==='historique_mails').length,1);
  assert.equal(f.writes.filter(write=>write.ref==='clients/a').length,1);
});
test('archive failure after accepted send is not reported as a send failure',async()=>{
  const f=fixture({historyId:null,archiveFailure:true});await f.executeEmailSending();
  assert.equal(f.requests.length,1);assert.match(f.alerts[0],/succès/);
  assert.equal(f.button.disabled,false);
});
test('second click while send is active does not start another request',async()=>{
  const f=fixture();await Promise.all([f.executeEmailSending(),f.executeEmailSending()]);
  assert.equal(f.requests.length,1);
});
