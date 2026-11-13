import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {validOrigin,validLease,leaseMessage,proofMessage,verifyLiveHost,resolveGateway,REGISTRY} from '../functions/unreal-host/protocol.mjs';
import {createRegistry,mayReplace} from '../functions/unreal-host/registry-core.mjs';
import {createUnrealSessionHandler} from '../shared/lrf-server/unreal-session.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const key={host:'test-pc',publicKey},origin='https://lrf-test-host.trycloudflare.com';
function lease(over={}){const now=Date.now(),d={host:key.host,origin,issuedAt:now,expiresAt:now+180000,nonce:'a'.repeat(32),...over};return {...d,signature:sign(null,leaseMessage(d),privateKey).toString('base64')};}
function proofRequest(url){const u=new URL(url),challenge=u.searchParams.get('challenge');return Promise.resolve({ok:true,json:async()=>({origin:u.origin,challenge,signature:sign(null,proofMessage(u.origin,challenge),privateKey).toString('base64')})});}
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(d){this.data=d;return this;}});
test('Only an exact HTTPS tunnel origin is accepted',()=>{
 assert.ok(validOrigin(origin));
 for(const value of ['http://lrf-test.trycloudflare.com','https://example.com','https://127.0.0.1','https://lrf-test.trycloudflare.com:443','https://lrf-test.trycloudflare.com/path','https://user:secret@lrf-test.trycloudflare.com','https://lrf-test.trycloudflare.com.evil.example','https://lrf-test.trycloudflare.com/'])assert.equal(validOrigin(value),false,value);
});
test('Leases are signed, short lived, host bound and cannot be altered',()=>{
 const good=lease();assert.ok(validLease(good,key));
 for(const d of [{...good,origin:'https://attacker.trycloudflare.com'},{...good,signature:'a'.repeat(88)},lease({host:'other-pc'}),lease({issuedAt:Date.now()+60000}),lease({expiresAt:Date.now()-1}),lease({expiresAt:Date.now()+600000}),lease({nonce:'wrong'})])assert.equal(validLease(d,key),false);
});
test('Each host proof uses a fresh challenge and does not follow redirects',async()=>{
 const challenges=[];
 const request=async(url,options)=>{assert.equal(options.redirect,'error');challenges.push(new URL(url).searchParams.get('challenge'));return proofRequest(url);};
 await verifyLiveHost(origin,key,request);await verifyLiveHost(origin,key,request);assert.notEqual(challenges[0],challenges[1]);
 await assert.rejects(verifyLiveHost(origin,key,async()=>({ok:true,json:async()=>({origin,challenge:'a'.repeat(64),signature:lease().signature})})));
});
test('The stable registry resolves a changed tunnel without changing application URLs',async()=>{
 for(const host of ['first-host','second-host']){
  const record=lease({origin:`https://${host}.trycloudflare.com`});
  const request=(url,options)=>url===REGISTRY?Promise.resolve({ok:true,json:async()=>record}):proofRequest(url,options);
  assert.equal(await resolveGateway(key,request),record.origin);
 }
 await assert.rejects(resolveGateway(key,async()=>({ok:true,json:async()=>lease({expiresAt:Date.now()-1000})})));
});
test('Invalid registration never reads, writes or contacts a supplied host',async()=>{
 let calls=0;const forbidden=async()=>{calls++;throw Error();};
 const handler=createRegistry({key,read:forbidden,replace:forbidden,request:forbidden}),result=res();
 await handler({method:'POST',headers:{'content-type':'application/json'},body:{origin:'http://127.0.0.1'}},result);
 assert.equal(result.statusCode,401);assert.equal(calls,0);assert.equal(result.headers['Cache-Control'],'no-store');
});
test('Verified registration stores only routing data and rejects a replay',async()=>{
 let stored;const record=lease();
 const handler=createRegistry({key,read:async()=>stored,request:proofRequest,replace:async next=>{if(!mayReplace(stored,next))return false;stored=next;return true;}});
 const a=res();await handler({method:'POST',headers:{'content-type':'application/json'},body:{...record,extra:'discard'}},a);assert.equal(a.statusCode,200);assert.deepEqual(stored,record);
 const b=res();await handler({method:'POST',headers:{'content-type':'application/json'},body:lease({issuedAt:record.issuedAt-1,expiresAt:record.expiresAt-1})},b);assert.equal(b.statusCode,409);
 const c=res();await handler({method:'GET',headers:{}},c);assert.equal(c.statusCode,200);
 const offline=createRegistry({key,read:async()=>stored,now:()=>record.expiresAt+1}),d=res();await offline({method:'GET',headers:{}},d);assert.equal(d.statusCode,503);
});
for(const app of ['studio-one','randal-general','neobath-anima'])test(`${app}: identity is required before discovery; only the discovered PC receives the token`,async()=>{
 let resolved=0,calls=0;const variant=app==='randal-general'?app:'studio-one';
 const handler=createUnrealSessionHandler(variant,{resolve:async()=>{resolved++;return origin;},request:async(url,options)=>{calls++;assert.equal(String(url),origin+'/session');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-account');assert.deepEqual(JSON.parse(options.body),{app,aspect:1});return {ok:true,json:async()=>({session:'a'.repeat(32),apiBase:origin,bridgeUrl:origin.replace('https:','wss:')+'/control/a',signallingUrl:origin.replace('https:','wss:')+'/video/a'})};}});
 const request={method:'POST',headers:{host:'test.vercel.app'},body:{app,aspect:1}};
 const a=res();await handler(request,a);assert.equal(a.statusCode,401);assert.equal(resolved,0);
 const b=res();await handler({...request,headers:{...request.headers,authorization:'Bearer test-account'}},b);assert.equal(b.statusCode,201);assert.equal(resolved,1);assert.equal(calls,1);
});
