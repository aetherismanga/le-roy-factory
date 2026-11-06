import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function server({ historyFails=false, smtpFails=false, authorized=true }={}) {
  const histories=[],contents=[],smtp=[],logs=[],reports=[],clientUpdates=[];
  const db={collection:name=>({add:async data=>{if(name==='historique_mail_content'){contents.push(data);return{id:'content-A'}}histories.push(data);if(historyFails)throw new Error('History offline');return{id:'history-A'};},doc:id=>({id})}),batch:()=>({update:(ref,data)=>clientUpdates.push({ref,data}),commit:async()=>{}})};
  const firestore=()=>db;
  firestore.FieldValue={serverTimestamp:()=>42,arrayUnion:value=>value};
  const modules={
    'firebase-functions/v2/https':{onRequest:(_options,handler)=>handler},
    'firebase-functions/v2/scheduler':{onSchedule:(_options,handler)=>handler},
    'firebase-admin':{initializeApp(){},firestore,storage:()=>({bucket:()=>({})})},
    nodemailer:{createTransport:()=>({sendMail:async payload=>{smtp.push(payload);if(smtpFails)throw new Error('SMTP refused');return{messageId:'message-A'};}})},
    './auth':{requireAgent:async(_req,res)=>{if(authorized)return{email:'jerome@leroyfactory.fr'};res.status(401).json({success:false,error:'Authentification agent requise.'});return null;}},
    './group-mail-history':{appendGroupMailReports:async(_db,payload)=>reports.push(payload)},
    './account-requests':{},'./jarvis-ai':{}
  };
  const context=vm.createContext({require:name=>{if(!(name in modules))throw new Error('Unexpected module '+name);return modules[name];},exports:{},Buffer,Date,process:{env:{SMTP_PASSWORD_JEROME:'mock-only'}},console:{warn:(...args)=>logs.push(args),error:(...args)=>logs.push(args)}});
  vm.runInContext(readFileSync(new URL('../functions/index.js',import.meta.url),'utf8'),context);
  const response={code:0,body:null,set(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  const request={method:'POST',body:{senderMode:'jerome',bccRecipients:['client@example.test'],subject:'Nouveauté',htmlContent:'<p>Bonjour</p>',attachments:[],clientIds:['client-A']}};
  return{run:()=>context.exports.sendGroupEmail(request,response),response,histories,contents,smtp,logs,reports,clientUpdates};
}

test('SMTP acceptance remains successful if only its global history write fails',async()=>{
  const h=server({historyFails:true});await h.run();
  assert.equal(h.smtp.length,1);assert.equal(h.histories.length,1);
  assert.equal(h.response.code,200);assert.equal(h.response.body.success,true);
  assert.equal(h.response.body.historyRecorded,false);assert.equal(h.response.body.historyId,null);
  assert.equal(h.response.body.messageId,'message-A');assert.equal(h.reports.length,1);assert.equal(h.clientUpdates.length,1);
  assert.match(h.logs.map(args=>args.join(' ')).join(' '),/accepté par SMTP/);
});

test('successful mail records exactly one global and one per-client history',async()=>{
  const h=server();await h.run();
  assert.equal(h.smtp.length,1);assert.equal(h.histories.length,1);assert.equal(h.histories[0].statut,'Succès');
  assert.equal(h.response.code,200);assert.equal(h.response.body.historyRecorded,true);assert.equal(h.response.body.historyId,'history-A');
  assert.equal(h.clientUpdates.length,1);assert.equal(h.reports.length,1);
  assert.equal(h.contents.length,1);assert.equal(h.contents[0].htmlContent,'<p>Bonjour</p>');
  assert.equal(h.response.body.contentRecorded,true);
});

test('a real SMTP failure stays an explicit error and writes no success report',async()=>{
  const h=server({smtpFails:true});await h.run();
  assert.equal(h.smtp.length,1);assert.equal(h.response.code,500);assert.equal(h.response.body.success,false);
  assert.equal(h.histories.length,1);assert.equal(h.histories[0].statut,'Erreur');
  assert.equal(h.reports.length,0);assert.equal(h.clientUpdates.length,0);
});

test('unauthenticated mail never invokes SMTP or writes a history',async()=>{
  const h=server({authorized:false});await h.run();
  assert.equal(h.response.code,401);assert.equal(h.smtp.length,0);assert.equal(h.histories.length,0);
});
