import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const noop=()=>{};
const quiet={log:noop,error:noop,warn:noop};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const routes=[
  {file:'mails-groupes.js',fn:'executeEmailSending',endpoint:'sendGroupEmail',button:'btn-confirm-send',attachment:true,clientIds:true},
  {file:'mails-groupes-programmation.js',fn:'scheduleMail',endpoint:'scheduleGroupEmail',button:'btn-schedule-mail',attachment:true,clientIds:true,schedule:true},
  {file:'account-form-send.js',fn:'sendForm',endpoint:'sendGroupEmail',button:'account-send-submit'}
];
const attachment={filename:'catalogue.pdf',size:12,content:'UEZERg==',encoding:'base64',contentType:'application/pdf'};
const inline={filename:'image.png',size:8,content:'SU1BR0U=',encoding:'base64',contentType:'image/png',cid:'photo@lrf',inline:true};
function element(value=''){return {value,style:{},disabled:false,textContent:'',innerHTML:'',innerText:'',dataset:{},addEventListener:noop,querySelectorAll:()=>[]};}
function harness(route,{user={getIdToken:async()=> 'verified-token'},response}={}){
  const elements=new Map(),calls=[],history=[],alerts=[],tokens=[];
  const getElement=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
  getElement('select-sender').value='coryne';getElement('email-subject').value='NOUVEAUTÉ RANDAL';
  getElement('email-body-editor').innerHTML='<p>Bonjour</p><img src="cid:photo@lrf">';getElement('email-body-editor').innerText='Bonjour';
  getElement('scheduled-mail-datetime').value='2999-11-05T09:00';getElement('account-send-email').value='alpha@example.test';getElement('account-send-subject').value='Ouverture de compte';getElement('account-send-message').value='Bonjour\nVotre formulaire.';
  const checkbox=(id,email)=>({dataset:{key:id+'|'+email},closest:()=>({querySelectorAll:()=>[null,null,null,null,null,{textContent:email}]})});
  const document={readyState:'loading',addEventListener:noop,getElementById:getElement,querySelector:()=>null,querySelectorAll:selector=>{
    if(selector==='#recipients-tbody .contact-checkbox:checked')return [checkbox('A','alpha@example.test'),checkbox('A','ALPHA@example.test'),checkbox('B','beta@example.test')];
    if(selector==='#file-preview-info .file-chip strong')return [{textContent:'catalogue.pdf'}];
    if(selector.includes('img[src^="cid:"]'))return [{getAttribute:()=> 'cid:photo@lrf'}];
    return [];
  }};
  const wrappedUser=user&&{...user,getIdToken:async(...args)=>{tokens.push(args);return user.getIdToken(...args)}};
  let source=readFileSync(new URL('../assets/js/'+route.file,import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*$/gm,'').replace(/^export /gm,'');
  const context=vm.createContext({console:quiet,document,auth:{currentUser:wrappedUser},mailCompositionSnapshot:()=>({senderMode:'coryne',subject:'NOUVEAUTÉ RANDAL',bodyHtml:'<p>Bonjour</p><img src="cid:photo@lrf">',bodyText:'Bonjour',emails:['alpha@example.test','beta@example.test'],clientIds:['A','B'],attachments:[attachment,inline]}),db:{},Date,Math,URLSearchParams,Set,Map,Promise,
    window:{addEventListener:noop},localStorage:{getItem:()=> 'true',setItem:noop,removeItem:noop},setTimeout:()=>0,clearTimeout:noop,setInterval:()=>0,clearInterval:noop,
    alert:message=>alerts.push(message),confirm:()=>true,location:{reload:noop},
    collection:()=>({}),doc:()=>({}),arrayUnion:()=>({}),addDoc:async(...args)=>history.push(['addDoc',args]),updateDoc:async(...args)=>history.push(['updateDoc',args]),onSnapshot:noop,
    fetch:async(url,options)=>{calls.push({url,headers:options.headers,body:JSON.parse(options.body)});return response?response(url,options):{ok:true,status:200,json:async()=>({success:true})}}
  });
  vm.runInContext(source,context,{filename:route.file});
  const run=code=>vm.runInContext(code,context);
  if(route.file==='mails-groupes.js'){
    run(`selectedContacts=new Map([['A|alpha',{clientId:'A',email:'alpha@example.test'}],['A|duplicate',{clientId:'A',email:'ALPHA@example.test'}],['B|beta',{clientId:'B',email:'beta@example.test'}]]);`);
    context.attachment=attachment;context.inline=inline;run('attachedFiles=[attachment];inlineImages=[inline];');
  }
  
  return {run,invoke:()=>run(route.fn+'()'),context,elements,calls,history,alerts,tokens};
}

for(const route of routes){
  test(`${route.file}: authenticated delivery preserves recipients and payload`,async()=>{
    const h=harness(route);await h.invoke();
    assert.equal(h.tokens.length,1);assert.equal(h.calls.length,1);assert.ok(h.calls[0].url.endsWith('/'+route.endpoint));assert.equal(h.calls[0].headers.Authorization,'Bearer verified-token');assert.equal(h.calls[0].headers['Content-Type'],'application/json');
    const payload=h.calls[0].body;
    assert.equal(payload.senderMode,route.attachment?'coryne':'both');
    assert.deepEqual(payload.bccRecipients.map(x=>x.toLowerCase()),route.attachment?['alpha@example.test','beta@example.test']:['alpha@example.test']);
    assert.equal(payload.subject,route.attachment?'NOUVEAUTÉ RANDAL':'Ouverture de compte');
    if(route.attachment){assert.deepEqual(payload.attachments,[attachment,inline]);assert.match(payload.htmlContent,/<p>Bonjour<\/p>/);assert.match(payload.htmlContent,/cid:photo@lrf/);}else assert.deepEqual(payload.attachments,[]);
    if(route.clientIds)assert.deepEqual(payload.clientIds,['A','B']);
    if(route.schedule)assert.equal(payload.scheduledAt,new Date('2999-11-05T09:00').toISOString());
    assert.equal(h.history.length,0,'server owns sent-email history');assert.equal(h.elements.get(route.button).disabled,false);
  });
  test(`${route.file}: absent user or token never sends a request`,async()=>{
    for(const user of [null,{getIdToken:async()=> ''},{getIdToken:async()=>{throw new Error('Expired credential')}}]){
      const h=harness(route,{user});await h.invoke();assert.equal(h.calls.length,0);assert.equal(h.history.length,0);assert.ok(h.alerts.some(message=>/session|connect|expir|credential/i.test(message)),'display an actionable authentication error');assert.equal(h.elements.get(route.button).disabled,false);
    }
  });
  test(`${route.file}: a 401 is explicit, with no retry or success history`,async()=>{
    const h=harness(route,{response:async()=>({ok:false,status:401,json:async()=>({success:false,error:'Unauthorized'})})});await h.invoke();
    assert.equal(h.calls.length,1);assert.equal(h.tokens.length,1);assert.equal(h.history.length,0);assert.ok(h.alerts.some(message=>/session|connect/i.test(message)),'401 should ask for reconnection');assert.equal(h.elements.get(route.button).disabled,false);
  });
  test(`${route.file}: a double click produces only one request`,async()=>{
    const token=deferred(),delivery=deferred();
    const h=harness(route,{user:{getIdToken:()=>token.promise},response:()=>delivery.promise});
    const first=h.invoke(),second=h.invoke();await second;assert.equal(h.tokens.length,1);
    token.resolve('verified-token');await new Promise(resolve=>setImmediate(resolve));assert.equal(h.calls.length,1);
    delivery.resolve({ok:true,status:200,json:async()=>({success:true})});await first;assert.equal(h.calls.length,1);assert.equal(h.history.length,0);
  });
}

test('scheduled mail uses the canonical selection and attachments even when recipient rows are hidden',async()=>{
  const compose=harness(routes[0]);
  compose.run("filteredContacts=[selectedContacts.values().next().value];");
  const snapshot=compose.run('mailCompositionSnapshot()');
  assert.deepEqual(Array.from(snapshot.emails,email=>email.toLowerCase()),['alpha@example.test','beta@example.test']);
  assert.deepEqual(Array.from(snapshot.clientIds),['A','B']);
  const schedule=harness(routes[1]);
  schedule.context.document.querySelectorAll=()=>[];
  schedule.context.mailCompositionSnapshot=()=>snapshot;
  await schedule.invoke();
  assert.equal(schedule.calls.length,1);
  assert.deepEqual(schedule.calls[0].body.bccRecipients.map(email=>email.toLowerCase()),['alpha@example.test','beta@example.test']);
  assert.deepEqual(schedule.calls[0].body.attachments,[attachment,inline]);
});

test('composition converts preview images back to CID without changing the editor and omits removed inline images',()=>{
  const h=harness(routes[0]),editor=h.elements.get('email-body-editor');
  editor.innerHTML='<p>Bonjour</p><img src="data:image/png;base64,preview" data-email-cid="photo@lrf">';
  const original=editor.innerHTML,node={dataset:{emailCid:'photo@lrf'},src:'data:image/png;base64,preview',setAttribute(_key,value){this.src=value;}};
  editor.cloneNode=()=>({querySelectorAll:()=>[node],get innerHTML(){return `<p>Bonjour</p><img src="${node.src}">`;}});
  const withImage=h.run('mailCompositionSnapshot()');
  assert.match(withImage.bodyHtml,/cid:photo@lrf/);assert.equal(editor.innerHTML,original);assert.equal(withImage.attachments.length,2);
  editor.cloneNode=()=>({querySelectorAll:()=>[],innerHTML:'<p>Bonjour</p>'});
  const removed=h.run('mailCompositionSnapshot()');assert.equal(removed.attachments.length,1);assert.equal(removed.attachments[0].filename,'catalogue.pdf');
});

test('account form uses the open client ID and refuses ambiguous shared emails',()=>{
  const h=harness(routes[2]);
  h.run("clients=[{id:'A',societe:'Même enseigne',email:'shared@example.test'},{id:'B',societe:'Même enseigne',email:'shared@example.test'},{id:'archived',email:'unique@example.test',archived:true}];");
  h.context.document.getElementById('client-modal').dataset.clientId='B';
  assert.equal(h.run('currentClient().id'),'B');
  assert.equal(h.run("findClientByEmail('shared@example.test')"),null);
  assert.equal(h.run("findClientByEmail('unique@example.test')"),null);
});
