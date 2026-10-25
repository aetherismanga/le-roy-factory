import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commercialReference,privateReference,purchaseRows} from '../../shared/lrf-server/commercial-reference.mjs';
import {privateMarkup} from '../../shared/lrf-3d/commerce/private-reference.js';
import {createIdentityState} from '../../shared/lrf-3d/commerce/identity-state.js';
import {mkdtemp,mkdir,writeFile,copyFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes,createCipheriv} from 'node:crypto';

// Synthetic fixtures only; no real account, credential or private tariff.
const identity={client:{codeClient:'LRF-12345',societe:'Compte synthétique'},randalAllowed:true,isAdmin:false};
const priced=cents=>({rows:[{ref:'SYNTHETIC',itemId:'fixture',proHT:cents}],proHT:cents,source:'Synthetic fixture'});
const complete=cents=>({...identity,...commercialReference(identity,priced(cents))});
// Independent integer/rational expectation from the approved General policy and
// public quote lines. Do not import its purchase implementation as the oracle.
const expectedGeneralTotal=quote=>quote.rows.length&&quote.rows.every(row=>Number.isSafeInteger(row.publicTTC)&&row.publicTTC>=0)?quote.rows.reduce((sum,row)=>sum+Number((BigInt(row.publicTTC)*5n+6n)/12n),0):null;
const expectedCode=(code,cents)=>cents===null?code:code+'-'+(cents/100).toFixed(2)+'.00';


test('exact reference format uses integer cents, two decimals and the fixed .00 suffix',()=>{
 for(const [cents,suffix] of [[66888,'668.88.00'],[100,'1.00.00'],[101,'1.01.00'],[199,'1.99.00'],[0,'0.00.00']])assert.equal(privateReference('LRF-00317',cents,true),'LRF-00317-'+suffix);
 for(const amount of [null,undefined,-1,1.5,'66888',NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(privateReference('LRF-12345',amount,true),'LRF-12345');
 assert.equal(privateReference('LRF-12345',66888),'LRF-12345');
 for(const code of ['',null,'12345','LRF-1234','LRF-123456','LRF-12345-OLD'])assert.equal(privateReference(code,66888,true),'');
});

test('only a live authorized partner gets its own code; agent-only details stay private',()=>{
 const allowed=commercialReference(identity,priced(66888));
 assert.equal(allowed.privateCode,'LRF-12345-668.88.00');assert.equal(allowed.referenceAllowed,true);
 assert.equal(allowed.proHT,null);assert.deepEqual(allowed.proRows,[]);assert.equal(allowed.priceSource,'');
 const denied=commercialReference({...identity,randalAllowed:false},priced(66888));
 assert.equal(denied.privateCode,'LRF-12345');assert.equal(denied.referenceAllowed,false);assert.equal(JSON.stringify(denied).includes('66888'),false);assert.equal(JSON.stringify(denied).includes('668.88'),false);
 const admin=commercialReference({...identity,isAdmin:true,client:{codeClient:''}},priced(66888));
 assert.equal(admin.privateCode,'');assert.equal(admin.referenceAllowed,false);assert.equal(admin.proHT,66888);
 const other=commercialReference({...identity,client:{codeClient:'LRF-54321'}},priced(66888));
 assert.equal(other.privateCode,'LRF-54321-668.88.00');
});

test('every line is priced from the server grid, duplicates are summed and partial totals are withheld',()=>{
 const quote={rows:[{ref:'SYNTHETIC-A',publicTTC:50000,proHT:1},{ref:'SYNTHETIC-A',publicTTC:50000},{ref:'SYNTHETIC-B',publicTTC:10000}]};
 assert.equal(purchaseRows(quote,{prices:{'SYNTHETIC-A':30000,'SYNTHETIC-B':6888}}).proHT,66888);
 for(const grid of [null,{prices:{'SYNTHETIC-A':30000}},{prices:{'SYNTHETIC-A':30000,'SYNTHETIC-B':'6888'}}]){
  const result=purchaseRows(quote,grid);assert.equal(result.proHT,null);assert.equal(commercialReference(identity,result).privateCode,'LRF-12345');
 }
 assert.equal(purchaseRows({rows:[]},{prices:{}}).proHT,null);
 assert.equal(purchaseRows({rows:[{ref:'SYNTHETIC-A',publicTTC:null}]},{prices:{'SYNTHETIC-A':30000}}).proHT,null);
 assert.equal(purchaseRows({rows:[{ref:'toString',publicTTC:100}]},{prices:{}}).proHT,null);
});

for(const variant of ['studio-one','randal-general']){
 test(variant+': real gateway validates its server pricing policy and never trusts a submitted account or amount',async()=>{
  const root=fileURLToPath(new URL('../../',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'lrf-reference-'));
  const originalFetch=globalThis.fetch,originalKey=process.env.LRF_PURCHASE_GRID_KEY;
  try{
   const app=path.join(temp,variant),data=path.join(app,'server/data');await mkdir(data,{recursive:true});await mkdir(path.join(app,'api'));
   await writeFile(path.join(temp,'package.json'),'{"type":"module"}');await symlink(path.join(root,'shared'),path.join(temp,'shared'),'dir');await symlink(path.join(root,variant,'src'),path.join(app,'src'),'dir');
   await copyFile(path.join(root,variant,'api/commercial.js'),path.join(app,'api/commercial.js'));await copyFile(path.join(root,variant,'server/purchase.js'),path.join(app,'server/purchase.js'));
   const {initialDraft,draftProject}=await import('../../'+variant+'/src/commerce/guided.js');
   const {quoteProject}=await import('../../'+variant+'/src/commerce/pricing.js');
   const project=draftProject(variant==='studio-one'?{...initialDraft(),top:'bare',column:false,mirror:null}:initialDraft('aruba'));
   const quote=quoteProject(project),expected=variant==='studio-one'?66888:expectedGeneralTotal(quote),prices=Object.fromEntries(quote.rows.map((row,index)=>[row.ref,index===0?66888-(quote.rows.length-1)*100:100]));
   const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('lrf-purchase-grid/v1/'+variant));
   const ciphertext=Buffer.concat([cipher.update(JSON.stringify({source:'Synthetic integration fixture',prices})),cipher.final()]);
   const envelope={version:1,algorithm:'A256GCM',variant,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
   await writeFile(path.join(data,variant==='studio-one'?'studio-one-purchase.enc.json':'ceramic-purchase.enc.json'),JSON.stringify(envelope));process.env.LRF_PURCHASE_GRID_KEY=key.toString('hex');
   let code='LRF-12345',partner=true,revoked=false;
   globalThis.fetch=async url=>{
    assert(!String(url).includes('identitytoolkit'),'A stale admin cookie cannot override the customer bearer session');
    if(revoked)return {ok:false,status:401,json:async()=>({success:false})};
    return {ok:true,json:async()=>({success:true,client:{id:code,codeClient:code,departement:'99',societe:'Synthetic integration account',partenaires:partner?['randal-pro']:[]}})};
   };
   const {default:handler}=await import(pathToFileURL(path.join(app,'api/commercial.js')).href);
   const request=async(extra={})=>{let result;await handler({method:'POST',headers:{host:'fixture.vercel.app',authorization:'Bearer synthetic-session-abcdefghijklmnopqrstuvwxyz',cookie:'studio_one_admin=stale; randal_general_admin=stale'},body:{action:'quote',project,codeClient:'LRF-54321',isAdmin:true,randalAllowed:true,proHT:1,privateCode:'LRF-54321-0.01.00',...extra}},{setHeader(){},status(status){this.statusCode=status;return this;},json(body){result={status:this.statusCode,body};}});return result;};
   let response=await request();assert.equal(response.status,200);assert.equal(response.body.privateCode,expectedCode('LRF-12345',expected));assert.equal(response.body.proHT,null);assert.deepEqual(response.body.proRows,[]);assert.equal(response.body.referenceAllowed,true);assert.equal(response.body.priceSource,'');
   const doubled={...project,items:[...project.items,...project.items.map(item=>({...item,id:item.id+'-duplicate'}))]};response=await request({project:doubled});assert.equal(response.body.privateCode,expectedCode('LRF-12345',expected*2));
   code='LRF-99999';response=await request();assert.equal(response.body.privateCode,expectedCode('LRF-99999',expected));
   for(const unavailableKey of ['',randomBytes(32).toString('hex')]){
    if(unavailableKey)process.env.LRF_PURCHASE_GRID_KEY=unavailableKey;else delete process.env.LRF_PURCHASE_GRID_KEY;
    response=await request();assert.equal(response.status,200);assert.equal(response.body.privateCode,variant==='studio-one'?'LRF-99999':expectedCode('LRF-99999',expected));assert.equal(response.body.proStatus,variant==='studio-one'?'purchase-unavailable':'verified-composition');assert.equal(response.body.proHT,null);assert.deepEqual(response.body.proRows,[]);assert.equal(response.body.priceSource,'');
   }
   process.env.LRF_PURCHASE_GRID_KEY=key.toString('hex');
   const encryptedFile=path.join(data,variant==='studio-one'?'studio-one-purchase.enc.json':'ceramic-purchase.enc.json');
   await writeFile(encryptedFile,JSON.stringify({...envelope,tag:'broken'}));response=await request();assert.equal(response.body.privateCode,variant==='studio-one'?'LRF-99999':expectedCode('LRF-99999',expected));assert.equal(response.body.proStatus,variant==='studio-one'?'purchase-unavailable':'verified-composition');assert.equal(response.body.proHT,null);assert.deepEqual(response.body.proRows,[]);await writeFile(encryptedFile,JSON.stringify(envelope));
   const partial={...project,items:[...project.items,{id:'unknown-sku',type:'mirror',settings:{mirrorModel:'missing-model',width:60,height:60,publicTTC:1,proHT:1,reference:'FORGED'},placement:{wall:0,u:50,height:140}}]};
   response=await request({project:partial});assert.equal(response.status,200);assert.equal(response.body.privateCode,'LRF-99999');assert.equal(response.body.referenceAllowed,false);assert.equal(response.body.proStatus,'purchase-unavailable');assert.equal(response.body.proHT,null);assert.deepEqual(response.body.proRows,[]);
   response=await request({project:{...project,items:[]}});assert.equal(response.status,200);assert.equal(response.body.privateCode,'LRF-99999');assert.equal(response.body.referenceAllowed,false);assert.equal(response.body.proStatus,'purchase-unavailable');assert.equal(response.body.proHT,null);assert.deepEqual(response.body.proRows,[]);

   partner=false;response=await request();assert.equal(response.body.privateCode,'LRF-99999');assert.equal(response.body.referenceAllowed,false);assert(!JSON.stringify(response.body).includes((expected/100).toFixed(2)));assert.equal(response.body.proHT,null);assert.deepEqual(response.body.proRows,[]);assert.equal(response.body.priceSource,'');
   revoked=true;response=await request();assert.equal(response.status,401);assert.equal(response.body.client,null);assert.equal(response.body.privateCode,undefined);
  }finally{
   globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.LRF_PURCHASE_GRID_KEY;else process.env.LRF_PURCHASE_GRID_KEY=originalKey;
   await rm(temp,{recursive:true,force:true});
  }
 });
 test(variant+': actual composition changes recompute from its public product references',async()=>{
  const {initialDraft,draftProject}=await import('../../'+variant+'/src/commerce/guided.js');
  const {quoteProject}=await import('../../'+variant+'/src/commerce/pricing.js');
  const draft=variant==='studio-one'?{...initialDraft(),top:'bare',column:false,mirror:null}:initialDraft('aruba');
  const project=draftProject(draft),q=quoteProject(project),prices=Object.fromEntries(q.rows.map((row,index)=>[row.ref,10001+index]));
  const {purchaseQuote}=variant==='randal-general'?await import('../../randal-general/server/purchase.js'):{purchaseQuote:null};const first=variant==='randal-general'?purchaseQuote(project):purchaseRows(q,{prices});assert(Number.isSafeInteger(first.proHT));if(variant==='randal-general')assert.equal(first.proHT,expectedGeneralTotal(q));
  const duplicated={...project,items:project.items.concat(project.items.map(item=>({...item,id:item.id+'-duplicate'})))};
  const next=variant==='randal-general'?purchaseQuote(duplicated):purchaseRows(quoteProject(duplicated),{prices});assert.equal(next.proHT,first.proHT*2);if(variant==='randal-general')assert.equal(next.proHT,expectedGeneralTotal(quoteProject(duplicated)));
  assert.equal(quoteProject(project).publicTTC,q.publicTTC);
  assert.notEqual(commercialReference(identity,first).privateCode,commercialReference(identity,next).privateCode);
 });
 test(variant+': both interfaces use one renderer and reject another account reference',async()=>{
  const {privateMarkup:render}=await import('../../'+variant+'/src/commerce/identity.js');
  const html=render(complete(66888));assert.match(html,/<small class="pro-reference">LRF-12345-668\.88\.00<\/small><small>/);
  assert.doesNotMatch(html,/achat|HT|explication/i);
  for(const state of [{...complete(66888),randalAllowed:false},{...complete(66888),referenceAllowed:false},{...complete(66888),privateCode:'LRF-54321-668.88.00'}])assert.doesNotMatch(render(state),/668\.88/);
  assert.equal(privateMarkup({client:null},'STUDIO ONE'),'<span>Mon compte client LRF</span>');
 });
}

test('composition changes, failures, logout and account switching immediately discard the previous confidential code',async()=>{
 let key='first',reject=false,finish;
 const controller=createIdentityState({getProject:()=>({key}),getKey:p=>p.key,delay:0,request:async action=>{
  if(action==='logout')return new Promise(resolve=>{finish=resolve;});
  if(reject)throw Object.assign(Error('Expired'),{status:401});
  return complete(key==='first'?66888:70001);
 }});
 await controller.load();assert.equal(controller.state.referenceAllowed,true);
 key='second';controller.schedule();assert.equal(controller.state.privateCode,'LRF-12345');assert.equal(controller.state.referenceAllowed,false);
 await controller.refresh();assert.equal(controller.state.privateCode,'LRF-12345-700.01.00');
 reject=true;await controller.refresh();assert.equal(controller.state.client,null);assert.equal(controller.state.referenceAllowed,false);
 reject=false;await controller.authenticate('exchange',{sessionToken:'synthetic'});
 const logout=controller.logout();assert.equal(controller.state.client,null);assert.equal(controller.state.privateCode,'');assert.equal(controller.state.referenceAllowed,false);
 finish({client:null});await logout;
});
