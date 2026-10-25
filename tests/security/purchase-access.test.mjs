import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {decodePurchaseGrid} from '../../shared/lrf-server/purchase-grid.mjs';

const priorFetch=globalThis.fetch,priorKey=process.env.LRF_PURCHASE_GRID_KEY;
// Public catalogue lines are the independent input for General's approved
// server-only derivation. Studio continues to require its encrypted grid.
const expectedGeneralRows=quote=>quote.rows.map(row=>({ref:row.ref,itemId:row.itemId,proHT:Number.isSafeInteger(row.publicTTC)&&row.publicTTC>=0?Number((BigInt(row.publicTTC)*5n+6n)/12n):null}));
const expectedGeneralTotal=quote=>{const rows=expectedGeneralRows(quote);return rows.length&&rows.every(row=>row.proHT!==null)?rows.reduce((sum,row)=>sum+row.proHT,0):null;};
const expectedCode=(code,cents)=>cents===null?code:code+'-'+(cents/100).toFixed(2)+'.00';

after(()=>{globalThis.fetch=priorFetch;if(priorKey===undefined)delete process.env.LRF_PURCHASE_GRID_KEY;else process.env.LRF_PURCHASE_GRID_KEY=priorKey;});

function envelope(value,variant='studio-one',key=randomBytes(32)){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(Buffer.from('lrf-purchase-grid/v1/'+variant));
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
 return {key:key.toString('hex'),value:{version:1,algorithm:'A256GCM',variant,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}};
}

test('confidential grid decrypts with its server key and preserves references exactly',()=>{
 const fixture={source:'Synthetic test data',prices:{'SYNTHETIC-ONE':12345,'SYNTHETIC-ZERO':0}},e=envelope(fixture);
 const actual=decodePurchaseGrid(e.value,e.key,'studio-one');
 assert.deepEqual({...actual.prices},fixture.prices);assert.equal(actual.source,fixture.source);
 assert.equal(JSON.stringify(e.value).includes('SYNTHETIC'),false);
});

test('missing, wrong, cross-variant and altered keys or ciphertext fail closed',()=>{
 const e=envelope({prices:{'SYNTHETIC-ONE':12345}});
 for(const key of ['',randomBytes(32).toString('hex'),'not-a-key'])assert.throws(()=>decodePurchaseGrid(e.value,key,'studio-one'));
 assert.throws(()=>decodePurchaseGrid(e.value,e.key,'randal-general'));
 const cipher=Buffer.from(e.value.ciphertext,'base64');cipher[0]^=1;
 assert.throws(()=>decodePurchaseGrid({...e.value,ciphertext:cipher.toString('base64')},e.key,'studio-one'));
 assert.throws(()=>decodePurchaseGrid({...e.value,iv:'broken'},e.key,'studio-one'));
});

test('decrypted grid rejects unsafe references, coercible and invalid amounts',()=>{
 for(const fixture of [JSON.parse('{"prices":{"__proto__":12345}}'),{prices:{synthetic:'12345'}},{prices:{synthetic:-1}},{prices:{synthetic:1.5}},{prices:Array(2).fill(12345)}]){
  const e=envelope(fixture);assert.throws(()=>decodePurchaseGrid(e.value,e.key,'studio-one'));
 }
});

const main=fileURLToPath(new URL('../../',import.meta.url));
const roots=[['randal-general',path.join(main,'randal-general')],['studio-one',process.env.STUDIO_PROJECT_ROOT||path.join(main,'studio-one')]];
const jwt=(changes={})=>'synthetic.'+Buffer.from(JSON.stringify({aud:'le-roy-factory',iss:'https://securetoken.google.com/le-roy-factory',sub:'agent-fixture',email_verified:true,exp:Math.floor(Date.now()/1000)+600,auth_time:Math.floor(Date.now()/1000),...changes})).toString('base64url')+'.signature';

for(const [variant,root] of roots){
 test(variant+': anonymous requests cannot read purchases; authorized customers receive only their policy-validated reference',async()=>{
  const {default:handler}=await import(pathToFileURL(path.join(root,'api/commercial.js')));
  const {initialDraft,draftProject}=await import(pathToFileURL(path.join(root,'src/commerce/guided.js')));
  const project=draftProject(variant==='randal-general'?initialDraft('aruba'):initialDraft());
  const {quoteProject}=await import(pathToFileURL(path.join(root,'src/commerce/pricing.js'))),quote=quoteProject(project),expected=variant==='randal-general'?expectedGeneralTotal(quote):null;
  let lookup=0;
  globalThis.fetch=async url=>{
   if(String(url).includes('identitytoolkit')){lookup++;return {ok:true,json:async()=>({users:[{email:'jerome@leroyfactory.fr',emailVerified:true,localId:'agent-fixture',validSince:0}]})};}
   return {ok:true,status:200,json:async()=>({success:true,sessionToken:'synthetic-session-abcdefghijklmnopqrstuvwxyz',client:{id:'synthetic-client',codeClient:'LRF-12345',departement:'99',partenaires:['randal-pro'],societe:'Synthetic customer'}})};
  };
  const request=async(headers={},body={})=>{let result;const res={setHeader(){},status(n){this.code=n;return this;},json(value){result={status:this.code??200,value};return this;}};await handler({method:'POST',headers:{host:'test.vercel.app',...headers},body:{action:'quote',project,isAdmin:true,proHT:12345,...body}},res);return result;};
  delete process.env.LRF_PURCHASE_GRID_KEY;const anonymous=await request();assert.equal(anonymous.status,200);assert.equal(anonymous.value.proHT,null);assert.equal(anonymous.value.client,null);assert.equal(anonymous.value.privateCode,undefined);assert.equal(anonymous.value.proRows,undefined);assert.equal(anonymous.value.priceSource,undefined);
  const customer=await request({authorization:'Bearer synthetic-session-abcdefghijklmnopqrstuvwxyz'});
  assert.equal(customer.status,200);assert.equal(customer.value.isAdmin,false);assert.equal(customer.value.proHT,null);assert.deepEqual(customer.value.proRows,[]);assert.equal(customer.value.privateCode,expectedCode('LRF-12345',expected));assert.equal(customer.value.proStatus,variant==='randal-general'?'verified-composition':'purchase-unavailable');assert.equal(customer.value.referenceAllowed,variant==='randal-general');assert.equal(customer.value.priceSource,'');assert.equal(lookup,0);
  assert.equal(JSON.stringify(customer.value).includes('12345.00'),false);
 });

 test(variant+': verified agent access remains available and unavailable key does not break login',async()=>{
  const {default:handler}=await import(pathToFileURL(path.join(root,'api/commercial.js')));
  const {initialDraft,draftProject}=await import(pathToFileURL(path.join(root,'src/commerce/guided.js')));
  const project=draftProject(variant==='randal-general'?initialDraft('aruba'):initialDraft());
  const {quoteProject}=await import(pathToFileURL(path.join(root,'src/commerce/pricing.js'))),quote=quoteProject(project),expected=variant==='randal-general'?expectedGeneralTotal(quote):null;
  let verified=true;
  globalThis.fetch=async()=>({ok:true,json:async()=>({users:[{email:'jerome@leroyfactory.fr',emailVerified:verified,localId:'agent-fixture',validSince:0}]})});
  const request=async token=>{let result;const res={setHeader(){},status(n){this.code=n;return this;},json(value){result={status:this.code??200,value};return this;}};await handler({method:'POST',headers:{host:'test.vercel.app'},body:{action:'admin-token',idToken:token,project}},res);return result;};
  delete process.env.LRF_PURCHASE_GRID_KEY;
  const noKey=await request(jwt());assert.equal(noKey.status,200);assert.equal(noKey.value.isAdmin,true);assert.equal(noKey.value.proHT,expected);assert.equal(noKey.value.proStatus,variant==='randal-general'?'verified-composition':'purchase-unavailable');if(variant==='randal-general')assert.deepEqual(noKey.value.proRows,expectedGeneralRows(quote));else assert(noKey.value.proRows.every(r=>r.proHT===null));
  verified=false;const unverified=await request(jwt());assert.equal(unverified.status,401);assert.equal(unverified.value.proHT,null);
  verified=true;const claimUnverified=await request(jwt({email_verified:false}));assert.equal(claimUnverified.status,401);assert.equal(claimUnverified.value.proHT,null);
  const expired=await request(jwt({exp:1}));assert.equal(expired.status,401);
 });
}
