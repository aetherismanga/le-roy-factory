import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyClientToken} from '../shared/lrf-server/agent-tariffs.mjs';
import {fixture,localServices} from './fixtures/pro-client-session.mjs';
const hash=token=>createHash('sha256').update(token).digest('hex');

test('created local LRF session reaches the real validation authority and only its authorized grids',async()=>{
  const h=localServices(),login=await h.login();
  assert.equal(login.statusCode,200);assert.equal(login.body.success,true);
  const token=login.body.sessionToken;assert.match(token,/^[A-Za-z0-9_-]{43}$/);
  assert.equal(h.records.get('pro_sessions').has(token),false,'The store contains a digest, never the bearer token');
  assert.equal(h.records.get('pro_sessions').has(hash(token)),true);
  const identity=await verifyClientToken(token,{request:h.request});
  assert.deepEqual(identity.allowedPartners,['elios-ceramica','view-ceramica']);
  const result=await h.bootstrap(token);assert.equal(result.statusCode,200);assert.equal(result.body.accessType,'client');
  assert.deepEqual(result.body.elios,fixture.elios);assert.deepEqual(result.body.view,fixture.view);
  assert.equal(result.body.documents,undefined);assert.equal(result.body.client,undefined);assert.equal(result.body.sessionToken,undefined);
  assert.match(result.headers['Cache-Control'],/private.*no-store/);
});

test('live manufacturer changes override cached and forged browser permissions',async()=>{
  const h=localServices(['ELIOS']),token=(await h.login()).body.sessionToken;
  let result=await h.bootstrap(token,{partenaires:['ELIOS','VIEW','LA FENICE'],allowedPartners:['view-ceramica'],isAdmin:true,email:'jerome@leroyfactory.fr'});
  assert.equal(result.statusCode,200);assert.deepEqual(result.body.elios,fixture.elios);assert.deepEqual(result.body.view,[]);
  h.setPartners(['VIEW']);result=await h.bootstrap(token,{partenaires:['ELIOS']});
  assert.equal(result.statusCode,200);assert.deepEqual(result.body.elios,{});assert.deepEqual(result.body.view,fixture.view);
  h.setPartners(['LA FENICE']);const previousReads=h.reads;result=await h.bootstrap(token,{isAdmin:true,allowedPartners:['elios-ceramica']});
  assert.equal(result.statusCode,403);assert.equal(h.reads,previousReads,'No private grid is read for an unrelated manufacturer');
  assert.equal(result.body.elios,undefined);assert.equal(result.body.view,undefined);
});

test('logout, expiry, disabled account and changed identity invalidate legitimate sessions',async()=>{
  for(const condition of ['logout','expiry','disabled','department','blocked-code','missing-client']){
    const h=localServices(),token=(await h.login()).body.sessionToken;
    assert.equal((await h.bootstrap(token)).statusCode,200);
    const sessions=h.records.get('pro_sessions'),client=h.records.get('clients').get('local-client');
    if(condition==='logout')await h.call(h.sessions.revokeProSession,{sessionToken:token});
    if(condition==='expiry')sessions.get(hash(token)).expiresAt={toMillis:()=>Date.now()-1};
    if(condition==='disabled')client.proAccessDisabled=true;
    if(condition==='department')client.departement='13';
    if(condition==='blocked-code')client.codeClient='LRF-00001';
    if(condition==='missing-client')h.records.get('clients').delete('local-client');
    const reads=h.reads,result=await h.bootstrap(token,{isAdmin:true,partenaires:['ELIOS','VIEW']});
    assert.equal(result.statusCode,401,condition);assert.equal(h.reads,reads,condition);assert.equal(result.body.elios,undefined,condition);assert.equal(result.body.view,undefined,condition);
  }
});

test('reconnection issues a new valid session without restoring a revoked bearer',async()=>{
  const h=localServices(),first=(await h.login()).body.sessionToken;
  await h.call(h.sessions.revokeProSession,{sessionToken:first});
  const second=(await h.login()).body.sessionToken;assert.notEqual(first,second);
  assert.equal((await h.bootstrap(first)).statusCode,401);assert.equal((await h.bootstrap(second)).statusCode,200);
});

test('invalid credentials, unknown tokens, anonymous visitors and client document requests fail closed',async()=>{
  const h=localServices();
  for(const input of [{codeClient:'LRF-99998',departement:'13'},{codeClient:'LRF-00001',departement:'34'},{codeClient:'LRF-99997',departement:'34'}])assert.equal((await h.login(input)).statusCode,403);
  for(const token of [undefined,'','forged-session','x'.repeat(43)])assert.equal((await h.bootstrap(token,{isAdmin:true,codeClient:'LRF-99998',departement:'34'})).statusCode,401);
  assert.equal(h.reads,0);
  const token=(await h.login()).body.sessionToken,result=await h.document(token);assert.equal(result.statusCode,401);assert.equal(h.reads,0);
});

test('existing protected PDF path enforces ELIOS, VIEW and LA FENICE rights with local accounts',async()=>{
  const definitions=[['ELIOS CERAMICA','elios-2026','private-tariffs/elios/elios2026.pdf'],['VIEW CERAMICA','view-2026','private-tariffs/view/view2026.pdf'],['LA FENICE','lafenice-2026','private-tariffs/lafenice/lafenice2026.pdf']];
  for(const [partner,tariffId,path] of definitions){
    const h=localServices([partner]);
    const result=await h.call(h.tariffs.getTariffPdf,{codeClient:'LRF-99998',departement:'34',tariffId});
    assert.equal(result.statusCode,200,partner);assert.equal(result.headers['Content-Type'],'application/pdf');assert.equal(result.body.subarray(0,5).toString(),'%PDF-');assert.deepEqual(h.streamed,[path]);
    for(const other of definitions.filter(row=>row[1]!==tariffId))assert.equal((await h.call(h.tariffs.getTariffPdf,{codeClient:'LRF-99998',departement:'34',tariffId:other[1]})).statusCode,403,partner+' must not read '+other[0]);
    assert.equal((await h.call(h.tariffs.getTariffPdf,{tariffId})).statusCode,403);
    assert.equal((await h.call(h.tariffs.getTariffPdf,{codeClient:'LRF-99998',departement:'13',tariffId})).statusCode,403);
  }
});
