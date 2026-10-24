import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import handler from '../api/commercial.js';
import {purchaseQuote,privateReference} from '../server/purchase.js';
import {initialDraft,draftProject} from '../src/commerce/guided.js';
import {buildPreview,FINISHES} from '../src/commerce/preview-model.js';
import {APPEARANCE} from '../src/commerce/appearance.js';

const visualProject=draftProject({...initialDraft(),format:'three',width:100,finish:'BISC',top:'tampa',basinColor:'black',column:true,columnFinish:'NOGAL',mirror:'ilse',mirrorSize:2});
const project={...visualProject,items:visualProject.items.filter(i=>i.type!=='mirror')};
assert.equal(purchaseQuote(visualProject).proHT,null,'Undocumented mirror purchase price remains unavailable');
assert.equal(privateReference('LRF-12345',12345),'LRF-12345','A public reference never encodes a purchase amount');
assert.equal(privateReference('bad',12345),'');
assert.equal(existsSync('server/data/studio-one-purchase.json'),false,'No plaintext grid in the source tree');
const envelope=JSON.parse(readFileSync('server/data/studio-one-purchase.enc.json'));
assert.equal(envelope.algorithm,'A256GCM');assert.equal(envelope.variant,'studio-one');assert.equal(envelope.prices,undefined);
for(const f of FINISHES){assert.equal(APPEARANCE[f.id].hex,f.hex);assert.equal(APPEARANCE[f.id].texture,f.swatch||f.texture);}
const visual=buildPreview(visualProject);assert.equal(visual.items.length,3);
const model=visual.items.find(i=>i.type==='cabinet').asset;
assert.equal(model.format.id,'three');assert.equal(model.spec.width,1);assert.equal(model.getTop(),'tampa');assert.equal(model.ceramic.color.getHexString(),'403f41');assert.equal(model.wood.color.getHexString(),FINISHES.find(f=>f.id===visualProject.items.find(i=>i.type==='cabinet').settings.finish).hex.replace('#',''));assert.equal(visual.items.find(i=>i.type==='mirror').asset.spec.reference,'12745');

const original=globalThis.fetch;let mode='client',calls=[];
const jwt=(claims={})=>'synthetic.'+Buffer.from(JSON.stringify({aud:'le-roy-factory',iss:'https://securetoken.google.com/le-roy-factory',sub:'admin-uid',email_verified:true,exp:Math.floor(Date.now()/1000)+300,auth_time:Math.floor(Date.now()/1000),...claims})).toString('base64url')+'.signature';
async function request(body,cookie=''){let value,status=200,headers={};await handler({method:'POST',headers:{host:'localhost',cookie},body},{setHeader(k,v){headers[k]=v;},status(n){status=n;return this;},json(v){value=v;}});return {value,status,headers};}
try{
 globalThis.fetch=async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body)});
  if(String(url).includes('identitytoolkit'))return {ok:mode!=='invalid-admin',json:async()=>({users:[{email:mode==='wrong-admin'?'intrus@example.invalid':'jerome@leroyfactory.fr',emailVerified:mode!=='unverified-admin',localId:'admin-uid',validSince:mode==='revoked-admin'?Math.floor(Date.now()/1000)+60:0}]})};
  if(mode==='revoked')return {ok:false,status:401,json:async()=>({success:false})};
  if(String(url).includes('getAccountClientPrefill'))return {ok:true,json:async()=>({success:true,client:{societe:'Client synthétique',email:'qa@example.invalid',telephone:'0000000000',adresse:'Adresse de test',codePostal:'99999',ville:'Test'}})};
  return {ok:true,json:async()=>({success:true,sessionToken:'t'.repeat(44),client:{id:'fixture-client',codeClient:'LRF-12345',departement:'99',societe:'Client synthétique',partenaires:mode==='forbidden'?[]:['randal-pro']}})};
 };
 let r=await request({action:'quote',project,isAdmin:true,proHT:12345,discount:100,codeClient:'LRF-12345'});
 assert.equal(r.value.proHT,null);assert.equal(r.value.client,null);assert.equal(calls.length,0);
 r=await request({action:'identify',codeClient:'LRF-12345',departement:'99',project});
 assert.equal(r.value.proHT,null);assert.deepEqual(r.value.proRows,[]);assert.equal(r.value.privateCode,'LRF-12345');assert.equal(r.value.proStatus,'public-only');assert.equal(r.value.client.email,'qa@example.invalid');assert(r.headers['Set-Cookie'][0].includes('HttpOnly; Secure; SameSite=Strict'));assert.equal(r.value.client.codeClient,'LRF-12345');assert(!calls.some(c=>c.url.includes('update')));
 mode='forbidden';r=await request({action:'quote',project},'studio_one_pro='+('t'.repeat(44)));assert.equal(r.value.proHT,null);assert.equal(r.value.randalAllowed,false);
 mode='revoked';r=await request({action:'quote',project},'studio_one_pro='+('t'.repeat(44)));assert.equal(r.status,401);assert.equal(r.value.proHT,null);
 mode='client';r=await request({action:'admin-token',idToken:jwt(),project});assert.equal(r.value.isAdmin,true);assert.equal(r.value.client.codeClient,'');assert.equal(r.value.proRows.length,purchaseQuote(project).rows.length);
 for(const m of ['invalid-admin','wrong-admin','revoked-admin','unverified-admin']){mode=m;r=await request({action:'admin-token',idToken:jwt(),project});assert.equal(r.status,401);assert.equal(r.value.proHT,null);}
 mode='client';r=await request({action:'admin-token',idToken:jwt({aud:'wrong-project'}),project});assert.equal(r.status,401);
 r=await request({action:'admin-token',idToken:jwt({email_verified:false}),project});assert.equal(r.status,401);
 r=await request({action:'admin-token',idToken:jwt({exp:1}),project});assert.equal(r.status,401);
}finally{globalThis.fetch=original;}
const result={passed:true,checks:['Encrypted server grid; missing key fails closed','Anonymous, customer and partner sessions expose no purchase amounts or encoded reference','Expired session, forged/unverified administrator and revoked token blocked','Verified agent still receives the authorised quote structure','Actual model geometry and official finishing samples preserved'],liveAccounts:'Synthetic tests only. No real account or password used.',browser3D:'Requires WebGL2; see browser evidence.'};
writeFileSync('reports/purchase-identity-check.json',JSON.stringify(result,null,2));console.log(result);
