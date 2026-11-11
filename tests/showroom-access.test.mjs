import assert from 'node:assert/strict';
import {randomBytes,createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createShowroomAccessHandler,SHOWROOM_SESSION_TTL_SECONDS} from '../shared/lrf-server/showroom-access.mjs';

function fixture(){
 let time=Date.UTC(2026,10,11,12),env={LRF_SHOWROOM_PASSWORD:randomBytes(18).toString('base64url'),LRF_SHOWROOM_SESSION_SECRET:randomBytes(32).toString('base64url')};
 const handler=createShowroomAccessHandler({getEnv:()=>env,now:()=>time});
 async function request(body,overrides={}){
  const headers={'content-type':'application/json',origin:'https://studio-one-beta-test-v2.vercel.app','x-forwarded-for':'192.0.2.10',...overrides.headers};
  const response={headers:{},statusCode:0,setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;},end(){return this;}};
  await handler({method:'POST',body,...overrides,headers},response);return response;
 }
 return {request,get password(){return env.LRF_SHOWROOM_PASSWORD;},get secret(){return env.LRF_SHOWROOM_SESSION_SECRET;},get time(){return time;},advance:ms=>time+=ms,setEnv:value=>env=value};
}

test('password is checked on the server and creates an eight-hour signed session',async()=>{
 const f=fixture(),r=await f.request({password:f.password});assert.equal(r.statusCode,200);assert.equal(r.body.allowed,true);assert.equal(r.body.expiresAt,f.time+SHOWROOM_SESSION_TTL_SECONDS*1000);assert.equal(r.headers['cache-control'],'private, no-store, max-age=0');assert.equal(r.headers['access-control-allow-origin'],'https://studio-one-beta-test-v2.vercel.app');assert.equal(r.headers['access-control-allow-credentials'],undefined);
 assert.ok(!JSON.stringify(r.body).includes(f.password));assert.ok(!JSON.stringify(r.body).includes(f.secret));
 const [payload]=r.body.token.split('.');assert.deepEqual(Object.keys(JSON.parse(Buffer.from(payload,'base64url'))).sort(),['exp','iat','nonce','scope','v']);
 f.advance(1000);const verified=await f.request({token:r.body.token});assert.equal(verified.statusCode,200);assert.deepEqual(verified.body,r.body,'verification does not extend the session');
 const second=await f.request({password:f.password});assert.notEqual(second.body.token,r.body.token,'sessions use independent random nonces');
});

test('incorrect passwords, forged signatures, expired sessions and changed signing keys are rejected',async()=>{
 const f=fixture(),wrong=await f.request({password:randomBytes(12).toString('hex')});assert.equal(wrong.statusCode,401);assert.equal(wrong.body.allowed,false);
 const {body:{token}}=await f.request({password:f.password});
 for(const value of ['invalid',token+'.extra',token.slice(0,-3)+'abc'])assert.equal((await f.request({token:value})).statusCode,401);
 const [payload]=token.split('.'),claims=JSON.parse(Buffer.from(payload,'base64url'));claims.scope='different-scope';const altered=Buffer.from(JSON.stringify(claims)).toString('base64url'),signed=altered+'.'+createHmac('sha256',f.secret).update(altered).digest('base64url');assert.equal((await f.request({token:signed})).statusCode,401);
 f.advance(SHOWROOM_SESSION_TTL_SECONDS*1000);assert.equal((await f.request({token})).statusCode,401);
 const g=fixture();assert.equal((await g.request({token})).statusCode,401);
});

test('methods, exact origins and browser preflight are enforced',async()=>{
 const f=fixture();
 for(const origin of ['https://evil.example','https://studio-one-beta-test-v2.vercel.app.evil.example','null','https://leroyfactory.fr/']){const r=await f.request({password:f.password},{headers:{origin}});assert.equal(r.statusCode,403);assert.equal(r.headers['access-control-allow-origin'],undefined);}
 for(const origin of ['https://leroyfactory.fr','https://www.leroyfactory.fr','https://randal-catalogue-general-3d.vercel.app','https://randal-catalogue-general-3d-hugol-trading.vercel.app','https://us-central1-le-roy-factory.cloudfunctions.net'])assert.equal((await f.request({password:f.password},{headers:{origin}})).statusCode,200);
 assert.equal((await f.request({password:f.password},{method:'GET'})).statusCode,405);
 const preflight=await f.request(undefined,{method:'OPTIONS',headers:{'access-control-request-method':'POST'}});assert.equal(preflight.statusCode,204);assert.equal(preflight.headers['access-control-allow-methods'],'POST, OPTIONS');
 assert.equal((await f.request(undefined,{method:'OPTIONS',headers:{'access-control-request-method':'DELETE'}})).statusCode,405);
 const env={LRF_SHOWROOM_PASSWORD:f.password,LRF_SHOWROOM_SESSION_SECRET:f.secret,VERCEL_URL:'review-project.vercel.app'};f.setEnv(env);assert.equal((await f.request({password:f.password},{headers:{origin:'https://review-project.vercel.app'}})).statusCode,200);assert.equal((await f.request({password:f.password},{headers:{origin:'https://other-project.vercel.app'}})).statusCode,403);
});

test('only a bounded JSON password or token body is accepted',async()=>{
 const f=fixture();
 for(const body of [null,[],{},'not-json',{password:f.password,token:'extra'},{password:42},{password:''},{unknown:'value'},{password:'x'.repeat(1025)}])assert.equal((await f.request(body)).statusCode,400);
 assert.equal((await f.request(JSON.stringify({password:f.password}))).statusCode,200);
 assert.equal((await f.request(Buffer.from(JSON.stringify({password:f.password})))).statusCode,200);
 assert.equal((await f.request({password:f.password},{headers:{'content-type':'text/plain'}})).statusCode,415);
 assert.equal((await f.request('x'.repeat(4097))).statusCode,413);
 assert.equal((await f.request({password:f.password},{headers:{'content-length':'9000'}})).statusCode,413);
});

test('password attempts are limited per IP without blocking an already valid token',async()=>{
 const f=fixture(),login=await f.request({password:f.password});
 for(let i=0;i<11;i++)assert.equal((await f.request({password:randomBytes(12).toString('hex')})).statusCode,401);
 const blocked=await f.request({password:f.password});assert.equal(blocked.statusCode,429);assert.equal(blocked.headers['retry-after'],'900');
 assert.equal((await f.request({token:login.body.token})).statusCode,200);
 assert.equal((await f.request({password:f.password},{headers:{'x-forwarded-for':'192.0.2.20'}})).statusCode,200);
 f.advance(15*60*1000);assert.equal((await f.request({password:f.password})).statusCode,200);
});

test('missing configuration fails closed and both routes import the server-only handler',async()=>{
 const f=fixture();f.setEnv({});assert.equal((await f.request({password:randomBytes(8).toString('hex')})).statusCode,503);
 f.setEnv({LRF_SHOWROOM_PASSWORD:randomBytes(8).toString('hex'),LRF_SHOWROOM_SESSION_SECRET:randomBytes(8).toString('hex')});assert.equal((await f.request({token:'invalid'})).statusCode,503);
 for(const app of ['studio-one','randal-general'])assert.match(readFileSync(new URL('../'+app+'/api/showroom-access.js',import.meta.url),'utf8'),/export \{default\} from '\.\.\/\.\.\/shared\/lrf-server\/showroom-access\.mjs'/);
});
