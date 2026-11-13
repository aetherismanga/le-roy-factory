import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnrealSessionHandler} from '../shared/lrf-server/unreal-session.mjs';
const endpoint='https://example-release.trycloudflare.com';
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(d){this.data=d;return this;},end(){}});
const req=(over={})=>({method:'POST',headers:{host:'studio-one-beta-test-v2.vercel.app',origin:'https://studio-one-beta-test-v2.vercel.app'},body:{app:'studio-one',aspect:16/9},...over});
test('An absent account and a foreign origin cannot start the PC',async()=>{
 let calls=0;const handler=createUnrealSessionHandler('studio-one',{endpoint,request:async()=>{calls++;throw Error();}});
 const a=res();await handler(req(),a);assert.equal(a.statusCode,401);
 const b=res();await handler(req({headers:{origin:'https://evil.example',host:'studio-one-beta-test-v2.vercel.app'}}),b);assert.equal(b.statusCode,403);assert.equal(calls,0);
});
test('Only app and aspect are sent to the PC; project details and pricing never enter the gateway',async()=>{
 const token='test-token';let sent;
 const response={session:'a'.repeat(32),accessToken:'b'.repeat(64),apiBase:endpoint,bridgeUrl:endpoint.replace('https:','wss:')+'/control/a',signallingUrl:endpoint.replace('https:','wss:')+'/video/a',protocol:2};
 const handler=createUnrealSessionHandler('studio-one',{endpoint,request:async(url,options)=>{sent={url:String(url),...options};return {ok:true,json:async()=>response};}});
 const result=res();await handler(req({headers:{host:'studio-one-beta-test-v2.vercel.app',authorization:'Bearer '+token},body:{app:'studio-one',aspect:1.5,project:{client:'must-not-be-forwarded'},prices:[1,2]}}),result);
 assert.equal(result.statusCode,201);assert.deepEqual(JSON.parse(sent.body),{app:'studio-one',aspect:1.5});assert.equal(sent.headers.Authorization,'Bearer '+token);
});
test('Anima uses its own verified credential, never the Randal cookie',async()=>{
 let calls=0;const handler=createUnrealSessionHandler('studio-one',{endpoint,request:async()=>{calls++;throw Error();}});
 const result=res();await handler(req({headers:{host:'studio-one-beta-test-v2.vercel.app',origin:'https://leroyfactory.fr',cookie:'studio_one_admin=not-an-anima-credential'},body:{app:'neobath-anima',aspect:1}}),result);
 assert.equal(result.statusCode,401);assert.equal(calls,0);
});
test('A stopped PC fails cleanly without changing any saved project',async()=>{
 const handler=createUnrealSessionHandler('studio-one',{endpoint,request:async()=>{throw Error('offline');}}),result=res();await handler(req({headers:{host:'studio-one-beta-test-v2.vercel.app',authorization:'Bearer test-token'}}),result);
 assert.equal(result.statusCode,503);assert.match(result.data.error,/autres qualités/);
});
