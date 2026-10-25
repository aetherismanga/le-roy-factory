import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,copyFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes,createCipheriv} from 'node:crypto';
import {CATALOG as C} from '../../studio-one/src/commerce/catalog.js';
import {initialDraft,draftProject} from '../../studio-one/src/commerce/guided.js';
import {quoteProject} from '../../studio-one/src/commerce/pricing.js';
import {saveComposition} from '../../studio-one/src/commerce/flow.js';
import {createIdentityState} from '../../shared/lrf-3d/commerce/identity-state.js';
import {commercialReference} from '../../shared/lrf-server/commercial-reference.mjs';

// No real accounts, credentials or decrypted tariff data. Non-mirror purchase
// amounts are synthetic; mirror expectations use the manufacturer's verified
// public prices and independently evaluated rational form of its stated terms.
test('Studio mirror reference uses verified terms while preserving its encrypted furniture grid',async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'studio-mirror-'));
 const originalKey=process.env.LRF_PURCHASE_GRID_KEY,originalFetch=globalThis.fetch;
 try{
  const app=path.join(temp,'studio-one'),data=path.join(app,'server/data');await mkdir(data,{recursive:true});await mkdir(path.join(app,'api'));
  await writeFile(path.join(temp,'package.json'),'{"type":"module"}');await symlink(path.join(root,'shared'),path.join(temp,'shared'),'dir');await symlink(path.join(root,'studio-one/src'),path.join(app,'src'),'dir');
  await copyFile(path.join(root,'studio-one/api/commercial.js'),path.join(app,'api/commercial.js'));await copyFile(path.join(root,'studio-one/server/purchase.js'),path.join(app,'server/purchase.js'));
  const base={...initialDraft(),top:'tampa',column:true},bare=draftProject(base),prices=Object.fromEntries(quoteProject(bare).rows.map((r,i)=>[r.ref,[22000,7100,17700][i]]));
  // The screenshot's starting total is reproduced by a synthetic grid fixture.
  // Its public quote still comes from the actual, unmodified France catalogue.
  assert.equal(quoteProject(bare).publicTTC,109840);
  // Additional synthetic lines prove cabinet/plan/basin/column edits retain
  // their grid values instead of adopting the mirror conversion policy.
  const changedDrafts=[{width:100},{finish:'NOGAL'},{top:'plain'},{top:'sella'},{top:'neris'},{columnFinish:'NOGAL'}];
  for(const patch of changedDrafts)for(const row of quoteProject(draftProject({...base,...patch})).rows)if(!Object.hasOwn(prices,row.ref))prices[row.ref]=12347+Object.keys(prices).length;
  const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('lrf-purchase-grid/v1/studio-one'));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify({source:'Synthetic mirror integration fixture',prices})),cipher.final()]);
  await writeFile(path.join(data,'studio-one-purchase.enc.json'),JSON.stringify({version:1,algorithm:'A256GCM',variant:'studio-one',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}));process.env.LRF_PURCHASE_GRID_KEY=key.toString('hex');
  const {purchaseQuote}=await import(pathToFileURL(path.join(app,'server/purchase.js')).href),{default:handler}=await import(pathToFileURL(path.join(app,'api/commercial.js')).href);
  const identity={client:{codeClient:'LRF-00317',societe:'Synthetic customer'},randalAllowed:true,isAdmin:false};
  const ref=project=>commercialReference(identity,purchaseQuote(project)).privateCode;
  assert.equal(purchaseQuote(bare).proHT,46800);assert.equal(ref(bare),'LRF-00317-468.00.00');
  const round=draftProject({...base,mirror:'round',mirrorFinish:'Doré'});assert.equal(quoteProject(round).publicTTC,129280);assert.equal(purchaseQuote(round).proHT,54900);assert.equal(ref(round),'LRF-00317-549.00.00');
  let references=0;
  for(const mirror of C.mirrors)for(const [mirrorSize,size]of mirror.sizes.entries())for(const mirrorFinish of Object.keys(size.refs||{Noir:size.ref})){
   const project=draftProject({...base,mirror:mirror.id,mirrorSize,mirrorFinish}),q=purchaseQuote(project),expected=46800+Number((BigInt(size.ttc)*5n+6n)/12n);
   assert.equal(q.proHT,expected,mirror.id+'/'+size.label+'/'+mirrorFinish);assert.equal(q.pricingUnavailable,false);assert.equal(q.rows.at(-1).ref,size.refs?.[mirrorFinish]||size.ref);assert.equal(q.rows.at(-1).publicTTC,size.ttc);
   assert.equal(ref(project),'LRF-00317-'+(expected/100).toFixed(2)+'.00');
   const rotated=structuredClone(project);rotated.items.find(i=>i.type==='mirror').settings.rotated=true;assert.equal(purchaseQuote(rotated).proHT,expected);references++;
  }
  assert.equal(references,25);
  for(const patch of changedDrafts){
   const project=draftProject({...base,...patch,mirror:'round',mirrorFinish:'Doré'}),rows=quoteProject(project).rows,expected=rows.filter(r=>r.itemId!=='guided-mirror').reduce((sum,r)=>sum+prices[r.ref],8100);
   assert.equal(purchaseQuote(project).proHT,expected);assert.equal(purchaseQuote(project).rows.filter(r=>r.itemId!=='guided-mirror').every(r=>r.proHT===prices[r.ref]),true);
  }
  const multiple={...round,items:[...round.items,...round.items.filter(i=>i.type==='mirror').map(i=>({...i,id:'second-mirror'}))]};assert.equal(purchaseQuote(multiple).proHT,63000);
  assert.equal(ref({...round,items:round.items.filter(i=>i.type!=='mirror')}),'LRF-00317-468.00.00');
  const storage=new Map(),store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},saved=saveComposition(store,round);
  assert.equal(ref(JSON.parse(storage.get('studio-one-projects'))[0].data),'LRF-00317-549.00.00');assert.equal(ref(saved.data),ref(round));assert(!storage.get('studio-one-projects').includes('549.00'));
  for(const patch of [{mirrorModel:'unknown-mirror'},{width:61},{mirrorFinish:'unknown-finish'}]){
   const invalid=structuredClone(round);Object.assign(invalid.items.find(i=>i.type==='mirror').settings,patch);
   assert.equal(purchaseQuote(invalid).proHT,null);assert.equal(ref(invalid),'LRF-00317');
  }
  // A future public-price change cannot silently reuse an older agreement.
  const ttc=C.mirrors.find(m=>m.id==='round').sizes[0].ttc;
  try{C.mirrors.find(m=>m.id==='round').sizes[0].ttc++;assert.equal(purchaseQuote(round).proHT,null);}finally{C.mirrors.find(m=>m.id==='round').sizes[0].ttc=ttc;}
  let code='LRF-00317',allowed=true,revoked=false;
  globalThis.fetch=async()=>revoked?{ok:false,status:401,json:async()=>({success:false})}:{ok:true,json:async()=>({success:true,client:{id:code,codeClient:code,departement:'99',societe:'Synthetic customer',partenaires:allowed?['randal-pro']:[]}})};
  const request=async(project=round)=>{let response;await handler({method:'POST',headers:{host:'fixture.vercel.app',authorization:'Bearer synthetic-session-abcdefghijklmnopqrstuvwxyz'},body:{action:'quote',project,codeClient:'LRF-99999',proHT:1,privateCode:'LRF-99999-0.01.00'}},{setHeader(){},status(status){this.code=status;return this;},json(body){response={status:this.code,body};}});return response;};
  let response=await request();assert.equal(response.body.privateCode,'LRF-00317-549.00.00');assert.equal(response.body.proHT,null);assert.deepEqual(response.body.proRows,[]);assert.equal(response.body.priceSource,'');
  code='LRF-12345';response=await request();assert.equal(response.body.privateCode,'LRF-12345-549.00.00');
  allowed=false;response=await request();assert.equal(response.body.privateCode,'LRF-12345');assert.equal(response.body.referenceAllowed,false);
  allowed=true;revoked=true;response=await request();assert.equal(response.status,401);assert.equal(response.body.client,null);
  delete process.env.LRF_PURCHASE_GRID_KEY;assert.equal(purchaseQuote(round).proHT,null);assert.equal(ref(round),'LRF-00317');
  process.env.LRF_PURCHASE_GRID_KEY=randomBytes(32).toString('hex');assert.equal(purchaseQuote(round).proHT,null);
 }finally{
  globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.LRF_PURCHASE_GRID_KEY;else process.env.LRF_PURCHASE_GRID_KEY=originalKey;
  await rm(temp,{recursive:true,force:true});
 }
});

test('rapid mirror replacements never restore an older code or another account',async()=>{
 let project='none',resolveOld,resolveLatest;
 const complete=(code,cents)=>({client:{codeClient:code},randalAllowed:true,...commercialReference({client:{codeClient:code},randalAllowed:true}, {proHT:cents,rows:[]})});
 const controller=createIdentityState({getProject:()=>({key:project}),getKey:p=>p.key,delay:0,request:async action=>{
  if(action==='exchange')return complete('LRF-12345',63000);
  if(project==='none')return complete('LRF-00317',46800);
  return new Promise(resolve=>{if(project==='round')resolveOld=resolve;else resolveLatest=resolve;});
 }});
 await controller.load();project='round';const old=controller.refresh();await Promise.resolve();project='rect';const latest=controller.refresh();await Promise.resolve();
 assert.equal(controller.state.privateCode,'LRF-00317');resolveLatest(complete('LRF-00317',57550));await latest;assert.equal(controller.state.privateCode,'LRF-00317-575.50.00');
 resolveOld(complete('LRF-00317',54900));await old;assert.equal(controller.state.privateCode,'LRF-00317-575.50.00');
 await controller.authenticate('exchange',{sessionToken:'different-synthetic-account'});assert.equal(controller.state.privateCode,'LRF-12345-630.00.00');
});
