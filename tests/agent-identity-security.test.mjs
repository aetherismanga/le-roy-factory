import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {verifiedAgentProfile,cachedAgentProfile} from '../assets/js/agent-identity.mjs';
import {verifyAgentToken} from '../shared/lrf-server/agent-tariffs.mjs';
const require=createRequire(import.meta.url);
const {verifiedAgentClaims}=require('../functions/agent-policy.cjs');
const identity={uid:'test-agent',email:'jerome@leroyfactory.fr',email_verified:true,lrfAgentUid:'test-agent'};
test('agent role cannot be inferred from email, verification alone, boolean role or another UID',()=>{
 assert.equal(verifiedAgentClaims(identity),true);
 for(const claims of [{...identity,email_verified:false},{...identity,lrfAgentUid:undefined},{...identity,lrfAgentUid:true},{...identity,lrfAgentUid:'other'},{...identity,email:'client@example.invalid'},{email:identity.email,isAdmin:true}])assert.equal(verifiedAgentClaims(claims),false);
});
test('browser profile requires the signed UID-bound role and clears cache on refusal',async()=>{
 let claims={...identity};const user={uid:identity.uid,email:identity.email,emailVerified:true,getIdTokenResult:async()=>({claims,expirationTime:new Date(Date.now()+60000).toISOString()})};
 assert.equal(cachedAgentProfile(user),null);assert.equal((await verifiedAgentProfile(user)).uid,identity.uid);assert.ok(cachedAgentProfile(user));
 claims={...identity,lrfAgentUid:'other'};assert.equal(await verifiedAgentProfile(user,true),null);assert.equal(cachedAgentProfile(user),null);
 user.emailVerified=false;assert.equal(await verifiedAgentProfile(user),null);
});
test('Vercel rejects missing or mismatched live custom claims before returning private data',async()=>{
 const claims={...identity,sub:identity.uid,aud:'le-roy-factory',iss:'https://securetoken.google.com/le-roy-factory',exp:Date.now()/1000+600,auth_time:Date.now()/1000};
 const token='test.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.signature';
 const live={localId:identity.uid,email:identity.email,emailVerified:true,validSince:0,customAttributes:JSON.stringify({lrfAgentUid:identity.uid})};
 const request=user=>async()=>({ok:true,json:async()=>({users:[user]})});
 assert.ok(await verifyAgentToken('Bearer '+token,{request:request(live)}));
 for(const user of [{...live,customAttributes:'{}'},{...live,customAttributes:JSON.stringify({lrfAgentUid:'other'})},{...live,emailVerified:false},{...live,disabled:true}])assert.equal(await verifyAgentToken('Bearer '+token,{request:request(user)}),null);
});
test('Firebase releases require manual dispatch, confirmation and protected environment; no IAM mutations',()=>{
 for(const file of ['deploy-firebase-functions.yml','deploy-firebase-storage-rules.yml']){
  const source=readFileSync(new URL('../.github/workflows/'+file,import.meta.url),'utf8');
  assert.match(source,/workflow_dispatch:/);assert.doesNotMatch(source,/^  (push|pull_request|schedule|workflow_run|repository_dispatch):/m);
  assert.match(source,/inputs\.confirm_production == 'CONFIRMER-PRODUCTION'/);assert.match(source,/environment: firebase-production/);
  assert.doesNotMatch(source,/add-iam-policy-binding|set-iam-policy/);
 }
});
