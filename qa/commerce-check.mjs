import {makeRoom} from '../src/room.js';
import {Composition,itemDimensions} from '../src/composition.js';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {CATALOG as C} from '../src/commerce/catalog.js';
import {draftProject,initialDraft,normalizeDraft} from '../src/commerce/guided.js';
import {quoteProject} from '../src/commerce/pricing.js';
import handler from '../api/commercial.js';
const base=initialDraft();
assert.equal(quoteProject(draftProject(base)).publicTTC,69120);
assert.equal(quoteProject(draftProject({...base,top:'neris'})).publicTTC,90480);
assert.equal(quoteProject(draftProject({...base,width:120,format:'three',top:'plain',column:true,mirror:'basic'})).publicTTC,149160);
assert.equal(quoteProject({items:[{type:'mirror',settings:{mirrorModel:'basic',width:1,height:1}}]}).publicTTC,null);
assert.equal(quoteProject({items:[{type:'cabinet',settings:{format:'unknown'}}]}).publicTTC,null);
assert.throws(()=>normalizeDraft({...base,width:79}));
assert.throws(()=>normalizeDraft({...base,top:'neris',width:40}));
assert.throws(()=>normalizeDraft({...base,width:80.5}));
assert.equal(quoteProject({items:[...draftProject(base).items,{type:'shower',settings:{}}]}).publicTTC,69120);
assert.equal(quoteProject(draftProject({...base,finish:'BISC'})).rows[0].ref,'13692 80@BISC.');
let comparisons=0;
if(process.env.STUDIO_ONE_SOURCE){
 let uid=0;const window={crypto:{randomUUID:()=>String(++uid)}};
 const ctx=vm.createContext({window});
 for(const file of ['catalog.js','model.js'])vm.runInContext(readFileSync(process.env.STUDIO_ONE_SOURCE+'/assets/js/studio-one/'+file,'utf8'),ctx);
 const old=window.StudioOneModel;
 for(const [index,m]of C.models.entries())for(const f of C.finishes)for(let width=40;width<=120;width++)for(const top of ['plain','neris','torne','sella','tampa']){
  if(top==='neris'&&width<50||['sella','tampa'].includes(top)&&!C.inset[top].gloss[width])continue;
  const d={...base,format:m.id,finish:f.id,width,top};
  const previous=old.make('cabinet',{model:index,width,finish:f.refCode,option:['sella','tampa'].includes(top)?'basin':'top',sink:top==='plain'?null:{model:top[0].toUpperCase()+top.slice(1),color:'gloss',layout:'single'}});
  const rows=old.lines(previous),q=quoteProject(draftProject(d));
  assert.deepEqual(q.rows.map(r=>[r.ref,r.publicTTC]),JSON.parse(JSON.stringify(rows.map(r=>[r.ref.replace(' · à confirmer usine',''),Math.round(r.unit*240)]))));comparisons++;
 }

 for(const [index,m]of C.models.entries())for(const top of ['sella','tampa','neris','torne']){
  const colors=['sella','tampa'].includes(top)?C.insetColors.filter(c=>C.inset[top][c.code]):C.vesselColors;
  for(const color of colors)for(const width of [60,70,80,90,100,120]){
   const d={...base,format:m.id,width,top,basinColor:color.code};
   const previous=old.make('cabinet',{model:index,width,finish:'ROBLE',option:['sella','tampa'].includes(top)?'basin':'top',sink:{model:top[0].toUpperCase()+top.slice(1),color:color.code,layout:'single'}});
   assert.equal(quoteProject(draftProject(d)).publicTTC,Math.round(old.lines(previous).reduce((n,r)=>n+r.unit,0)*240));comparisons++;
  }
 }
 for(const mirror of C.mirrors)for(const [index,size]of mirror.sizes.entries())for(const metal of mirror.metal?['Noir','Argent','Doré','Bronze']:['Noir']){
  const prev=old.make('mirror',{mirror:mirror.name,mirrorSize:size.label,mirrorFinish:metal}),rows=old.lines(prev);
  const q=quoteProject({items:[{id:'mirror',type:'mirror',settings:{mirrorModel:mirror.id,width:size.width,height:size.height,mirrorFinish:metal}}]});
  assert.equal(q.rows[0].ref,rows[0].ref);assert.equal(q.publicTTC,Math.round(rows[0].unit*120));comparisons++;
 }
}
let placementChecks=0;const testRoom=makeRoom(draftProject(base).room,0);
for(const model of C.models)for(let width=40;width<=120;width++)for(const mirror of C.mirrors)for(let mirrorSize=0;mirrorSize<mirror.sizes.length;mirrorSize++){
 const project=draftProject({...base,format:model.id,width,top:'plain',mirror:mirror.id,mirrorSize,column:true}),comp=new Composition(testRoom);
 for(const raw of project.items){const item={...raw,dimensions:itemDimensions(raw.type,raw.settings)};assert.equal(comp.validate(item,item.placement),'',`${model.id}, ${width}, ${mirror.id}/${mirrorSize} placement`);comp.items.push(item);}placementChecks++;
}testRoom.dispose();
const originalFetch=globalThis.fetch;let calls=0;
async function request(body,headers={}){let status=200,value,out={};const res={setHeader:(k,v)=>out[k]=v,status(n){status=n;return this;},json(v){value=v;return this;}};await handler({method:'POST',headers:{host:'preview.example',...headers},body},res);return {status,value,headers:out};}
try{
 globalThis.fetch=async()=>{calls++;throw Error('Must not call upstream');};
 let r=await request({action:'quote',proHT:1,discount:100,codeClient:'LRF-12345'});assert.equal(r.value.proHT,null);assert.equal(r.value.client,null);assert.equal(calls,0);assert.match(r.headers['Cache-Control'],/no-store/);
 r=await request({action:'identify',codeClient:'LRF-XXXXX',departement:'34'});assert.equal(r.status,400);assert.equal(calls,0);
 r=await request({action:'quote'},{origin:'https://attacker.example'});assert.equal(r.status,403);
 globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,client:{codeClient:'LRF-12345',societe:'Compte synthétique de test',partenaires:['randal-pro']}})});
 r=await request({action:'quote',proHT:1,remise:99},{cookie:'studio_one_pro='+('a'.repeat(40))});assert.equal(r.value.client.codeClient,'LRF-12345');assert.equal(r.value.proHT,null);assert.equal(r.value.proStatus,'authenticated');assert(!JSON.stringify(r.value).includes('remise'));
 globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({success:false})});r=await request({action:'quote'},{cookie:'studio_one_pro='+('a'.repeat(40))});assert.equal(r.status,401);assert.equal(r.value.proHT,null);
}finally{globalThis.fetch=originalFetch;}
const report={passed:true,sourceComparisons:comparisons,placementChecks,checks:['Exact public TTC and references compared with legacy source where supplied','8 finish references, including BISC. preserved','Incompatible and unknown selections rejected; missing prices remain null','Unsupported equipment does not change furniture subtotal','Visitor cannot grant PRO access by injecting code, price or discount','Verified synthetic session returns identity without unrequested prices; historical purchase grid is tested separately','Invalid/revoked session and cross-origin calls rejected; no-store responses'],authorizedRealAccount:'NOT RUN — no real credential used; historical purchase grid and synthetic identity are verified separately'};
writeFileSync('reports/commerce-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
