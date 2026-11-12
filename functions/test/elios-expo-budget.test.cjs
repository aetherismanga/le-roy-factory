const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../elios-expo-budget-core.cjs');
const catalogue={merchandising:[{id:'EBRK01',valueUnitHT:170}]},agent={uid:'verified-agent',email:'jerome@leroyfactory.fr'};
const requestId='a'.repeat(64);
const request={reference:'ELIOS-2027-TEST',owner:'client:synthetic',budgetYear:2027,status:'sent',sentAt:'2026-11-12T10:00:00Z',customer:{societe:'Magasin test',codeClient:'LRF-00317',email:'not-needed@example.test'},quote:{budgetYear:2027,rows:[{type:'merchandising',key:'EBRK01',reference:'EBRK01',quantity:2,valueUnitHT:170,valueTotalHT:340,totalHT:0},{type:'box',key:'tile',reference:'TILE',quantity:1.44,netHT:12,totalHT:8.64,unit:'m²'}]},paths:{visual:'private/visual.png'},fingerprint:'private-fingerprint',sessionToken:'never-return'};
function fixture(seed={}){
 const rows=new Map(Object.entries(seed));
 const ref=(name,id)=>({key:name+'/'+id,id,get:async()=>({id,data:()=>rows.get(name+'/'+id)})});
 const collection=name=>{
  let where=null,limit=Infinity;
  const q={doc:id=>ref(name,id),select(){return q;},where(field,operator,value){where={field,value};return q;},limit(n){limit=n;return q;},async get(){const found=[...rows].filter(([key,v])=>key.startsWith(name+'/')&&(!where||v[where.field]===where.value)).slice(0,limit);return {docs:found.map(([key,v])=>({id:key.slice(name.length+1),data:()=>v}))};}};
  return q;
 };
 const db={collection,async runTransaction(fn){const writes=[];const result=await fn({get:async r=>({data:()=>rows.get(r.key)}),set:(r,v)=>writes.push([r.key,v])});for(const [k,v]of writes)rows.set(k,v);return result;}};
 return {db,rows};
}
const decisionBody=(extra={})=>({requestId,year:2027,revision:0,factoryReference:'Mail usine confirmé',factoryDate:'2026-01-01',lines:[{key:'merchandising|EBRK01',status:'approved',budgetCostHT:1},{key:'box|tile',status:'approved',budgetCostHT:99999}],...extra});
test('budget combines full merchandising and exactly half the net expo before discount',()=>{
 const p=C.requestProjection(requestId,request,{lines:C.decisionInput(decisionBody(),request,catalogue).lines},catalogue),s=C.summarize([p],{turnoverHT:10000});
 assert.equal(s.allowanceHT,700);assert.equal(s.approvedMerchandisingHT,340);assert.equal(s.approvedExpoHT,8.64);assert.equal(s.approvedHT,348.64);assert.equal(s.remainingHT,351.36);
 assert.equal(C.lineCosts(request.quote.rows[1],catalogue),8.64,'never halve the already discounted 8.64 again');
});
test('submitted requests remain pending until confirmed by Elios, and unknown CA stays unknown',()=>{
 const p=C.requestProjection(requestId,request,null,catalogue),s=C.summarize([p],{});
 assert.equal(s.approvedHT,0);assert.equal(s.pendingHT,348.64);assert.equal(s.turnoverHT,null);assert.equal(s.allowanceHT,null);assert.equal(s.remainingHT,null);
 assert.equal(C.summarize([p],{turnoverHT:0}).allowanceHT,0,'explicit zero is distinct from unknown');
});
test('client consumption is separated while the seven percent envelope remains global',()=>{
 const a=C.requestProjection(requestId,request,{lines:C.decisionInput(decisionBody(),request,catalogue).lines},catalogue),b={...a,id:'b'.repeat(64),clientKey:'LRF-00400',client:'Second magasin',lines:[{type:'box',budgetCostHT:50,status:'approved'}]};
 const s=C.summarize([a,b],{turnoverHT:10000});assert.equal(s.approvedHT,398.64);assert.equal(s.clients.find(x=>x.key==='LRF-00317').approvedHT,348.64);assert.equal(s.clients.find(x=>x.key==='LRF-00400').approvedHT,50);assert.equal(s.allowanceHT,700);
});
test('unknown values do not become zero or a falsely exact remaining budget',()=>{
 const p=C.requestProjection(requestId,{...request,quote:{rows:[{type:'merchandising',key:'UNKNOWN',quantity:1}]}},null,catalogue),s=C.summarize([p],{turnoverHT:1000});assert.equal(s.pendingUnknown,1);assert.equal(s.pendingHT,0);
 assert.throws(()=>C.decisionInput({lines:[{key:'merchandising|UNKNOWN',status:'approved'}],factoryReference:'Accord',factoryDate:'2026-01-01'},{...request,quote:{rows:[{type:'merchandising',key:'UNKNOWN',quantity:1}]}},catalogue),/Confirmez le tarif/);
});
test('decisions require exact stored references and proof; posted costs never override canonical amounts',()=>{
 const value=C.decisionInput(decisionBody(),request,catalogue);assert.equal(value.lines[0].budgetCostHT,340);assert.equal(value.lines[1].budgetCostHT,8.64);
 for(const bad of [{factoryReference:''},{factoryDate:'2099-01-01'},{factoryDate:'2026-13-99'},{lines:[{key:'box|foreign',status:'approved'}]},{lines:[{key:'box|tile',status:'approved'},{key:'box|tile',status:'approved'}]}])assert.throws(()=>C.decisionInput(decisionBody(bad),request,catalogue));
 for(const v of [null,'1000',NaN,Infinity,-1])assert.throws(()=>C.turnoverInput({turnoverHT:v,referencePeriod:'2026 complet',source:'Relevé usine'},2027));
 assert.throws(()=>C.yearValue(2027.5));
});
test('private dashboard excludes images, project paths, contact credentials and incomplete sends',async()=>{
 const f=fixture({['elios_sample_requests/'+requestId]:request,['elios_sample_requests/'+'b'.repeat(64)]:{...request,status:'partial'}}),result=await C.readDashboard(f.db,2027,catalogue);
 assert.equal(result.requests.length,1);const text=JSON.stringify(result);for(const secret of ['private/visual','never-return','private-fingerprint','not-needed@example.test'])assert(!text.includes(secret));assert.equal(result.requests[0].year,2027);
});
test('turnover updates enforce revisions and retain an agent audit trail',async()=>{
 const f=fixture(),body={turnoverHT:10000,referencePeriod:'01/01/2026 au 31/12/2026',source:'Relevé annuel Elios',revision:0};
 await C.saveTurnover(f.db,body,agent,2027);assert.equal(f.rows.get('elios_expo_budgets/2027').turnoverHT,10000);assert.equal(f.rows.get('elios_expo_budgets/2027').updatedBy,agent.email);
 await assert.rejects(()=>C.saveTurnover(f.db,{...body,turnoverHT:20000},agent,2027),e=>e.status===409);assert.equal([...f.rows.keys()].filter(k=>k.startsWith('elios_expo_budget_history/')).length,1);
});
test('approved and refused decisions recompute totals without accepting forged cost fields or stale versions',async()=>{
 const f=fixture({['elios_sample_requests/'+requestId]:request});await C.saveDecision(f.db,decisionBody(),agent,2027,catalogue);
 const d=f.rows.get('elios_expo_decisions/'+requestId);assert.equal(d.lines[0].budgetCostHT,340);assert.equal(d.revision,1);assert.equal(d.updatedBy,agent.email);
 await assert.rejects(()=>C.saveDecision(f.db,decisionBody(),agent,2027,catalogue),e=>e.status===409);
 await C.saveDecision(f.db,decisionBody({revision:1,lines:decisionBody().lines.map(x=>({...x,status:'rejected'}))}),agent,2027,catalogue);const result=await C.readDashboard(f.db,2027,catalogue);assert.equal(result.summary.approvedHT,0);assert.equal(result.summary.rejectedHT,348.64);assert.equal(result.requests[0].decision.history.length,2);
});
test('manual historical allocations are explicit, idempotent and halve only the stated pre-discount expo base',async()=>{
 const f=fixture(),body={entryId:'synthetic-manual-1234567890',client:'Magasin historique',codeClient:'LRF-00317',reference:'Box 2027',description:'Facture usine et accord par mail',type:'box',amountHT:100,status:'approved',factoryReference:'Accord usine 123',factoryDate:'2026-01-01'};
 await C.saveEntry(f.db,body,agent,2027,catalogue);await C.saveEntry(f.db,body,agent,2027,catalogue);
 let result=await C.readDashboard(f.db,2027,catalogue);assert.equal(result.requests.length,1);assert.equal(result.requests[0].source,'manual');assert.equal(result.summary.approvedExpoHT,50);
 await assert.rejects(()=>C.saveEntry(f.db,{...body,amountHT:999},agent,2027,catalogue),e=>e.status===409);
 await C.saveEntry(f.db,{...body,entryId:'synthetic-manual-9876543210',type:'merchandising',amountHT:170},agent,2027,catalogue);result=await C.readDashboard(f.db,2027,catalogue);assert.equal(result.summary.approvedMerchandisingHT,170);assert.equal(result.summary.approvedHT,220);
});
test('anonymous and forged client roles cannot query or write budget data',async()=>{
 let dbCalls=0;const handler=C.createHandler({admin:{firestore(){dbCalls++;throw Error('must never read');}},getAgentFromRequest:async()=>null,catalogue});
 for(const body of [{action:'read',year:2027,isAdmin:true,email:agent.email},{action:'save-turnover',year:2027,turnoverHT:99999,agentUid:agent.uid},{action:'decision',...decisionBody()}]){let code=200,result;const res={set(){return this;},status(n){code=n;return this;},json(v){result=v;return this;}};await handler({method:'POST',headers:{origin:'https://leroyfactory.fr',authorization:'Bearer forged'},body},res);assert.equal(code,401);assert.equal(result.success,false);}assert.equal(dbCalls,0);
});
test('factory confirmation dates use the business day in France',()=>{
 const now=Date.parse('2026-11-12T23:30:00Z');
 assert.equal(C.decisionInput(decisionBody({factoryDate:'2026-11-13'}),request,catalogue,now).factoryDate,'2026-11-13');
 assert.throws(()=>C.decisionInput(decisionBody({factoryDate:'2026-11-14'}),request,catalogue,now));
 assert.throws(()=>C.decisionInput(decisionBody({factoryDate:'2026-02-30'}),request,catalogue,now));
});
