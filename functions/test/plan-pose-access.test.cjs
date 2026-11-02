const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {createPlanPoseHandler, browserModule} = require('../plan-pose-access-core.cjs');

function response() {
  return {code:200,headers:{},set(k,v){this.headers[k]=v;return this;},status(v){this.code=v;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};
}
async function request({agent=null,method='POST',origin='https://leroyfactory.fr',body={},failure=false}={}) {
  let reads=0,verifications=0;
  const handler=createPlanPoseHandler({getAgent:async()=>{verifications++;return agent;},loadApplication:()=>{reads++;if(failure)throw Error('private diagnostic');return {html:'<main id="board">Private editor</main>',source:"import {value} from './core.mjs';\nconst base=import.meta.url;"};}});
  const res=response();await handler({method,headers:{origin},body},res);
  return {...res,reads,verifications};
}
test('anonymous and forged PRO/admin flags cannot obtain the editor',async()=>{
  for(const body of [{},{isAdmin:true,email:'jerome@leroyfactory.fr',codeClient:'LRF-00317'},{role:'admin',sessionToken:'forged'}]){
    const result=await request({body});assert.equal(result.code,401);assert.equal(result.reads,0);assert.equal(result.body.success,false);assert.equal(result.body.html,undefined);assert.equal(result.body.module,undefined);
  }
});
test('a valid client or another agent cannot open the owner application',async()=>{
  for(const email of ['client@example.com','coryne@leroyfactory.fr']){
    const result=await request({agent:{email,uid:'verified-test-identity'}});assert.equal(result.code,403);assert.equal(result.reads,0);assert.equal(result.body.module,undefined);
  }
});
test('only the verified Jerome identity gets markup and executable module, without caching',async()=>{
  const result=await request({agent:{email:'jerome@leroyfactory.fr',uid:'verified-test-owner'}});
  assert.equal(result.code,200);assert.equal(result.reads,1);assert.equal(result.body.success,true);assert.match(result.body.html,/Private editor/);assert.match(result.body.module,/https:\/\/leroyfactory.fr\/assets\/js\/lrf-plan-pose\/core.mjs/);assert.match(result.headers['Cache-Control'],/private, no-store/);assert.equal(result.headers['Access-Control-Allow-Origin'],'https://leroyfactory.fr');
});
test('disallowed origins, GET and preflight never read protected assets',async()=>{
  for(const [input,status] of [[{origin:'https://attacker.invalid'},403],[{method:'GET'},405],[{method:'OPTIONS'},204]]){
    const result=await request(input);assert.equal(result.code,status);assert.equal(result.reads,0);assert.equal(result.verifications,0);
  }
});
test('private load failures return a closed response without exposing the source',async()=>{
  const result=await request({agent:{email:'jerome@leroyfactory.fr'},failure:true});assert.equal(result.code,503);assert.equal(result.body.html,undefined);assert.doesNotMatch(JSON.stringify(result.body),/private diagnostic/);
});
test('canonical entry keeps absolute imports, catalogue URLs, workers and PDF asset bases',()=>{
  const source=readFileSync(resolve(__dirname,'../../assets/js/lrf-plan-pose/app.mjs'),'utf8');
  for(const origin of ['https://leroyfactory.fr','https://www.leroyfactory.fr']){
    const converted=browserModule(source,origin);assert.doesNotMatch(converted,/from ['"]\.\.?\//);assert.doesNotMatch(converted,/import\.meta\.url/);assert.match(converted,/https:\/\/(?:www\.)?leroyfactory.fr\/shared\/lrf-3d\/surface-identity.mjs/);assert.match(converted,/new URL\('\.\/recognition.mjs',"https:/);assert.match(converted,/new URL\('\.\.\/\.\.\/vendor\/randal-catalogue\/jspdf/);
  }
  assert.throws(()=>browserModule(source,'https://attacker.invalid'));
});
