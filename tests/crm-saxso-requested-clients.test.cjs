const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const {targets,resolveTargets,grant}=require('../scripts/grant-requested-saxso-20261119.cjs');
function fixture(){
 const rows=targets.map((target,i)=>({id:'client-'+i,societe:target.name,codeClient:'LRF-00'+(200+i),departement:'34',partenaires:['elios-ceramica','unknown-partner'],notes:'unchanged'}));
 rows.push({id:'unrelated',societe:'Autre magasin',partenaires:['view-ceramica']});
 const documents=new Map(rows.map(row=>[row.id,structuredClone(row)]));let writes=0;
 const doc=id=>({exists:documents.has(id),data:()=>structuredClone(documents.get(id))});
 const db={collection(){return{select(){return this;},get:async()=>({docs:[...documents.keys()].map(id=>({id,data:doc(id).data}))}),doc:id=>({id,get:async()=>doc(id)})};},runTransaction:async work=>work({get:async ref=>doc(ref.id),update(ref,patch){writes++;const row=documents.get(ref.id);assert.deepEqual(Object.keys(patch),['partenaires']);for(const value of patch.partenaires.union)if(!row.partenaires.includes(value))row.partenaires.push(value);}})};
 return {documents,db,FieldValue:{arrayUnion:(...union)=>({union})},writes:()=>writes};
}
test('only the four requested clients receive SAXSO and their existing data survives repeat runs',async()=>{
 const f=fixture(),before=structuredClone([...f.documents.values()]);
 const result=await grant(f.db,f.FieldValue);assert.equal(result.length,4);
 await grant(f.db,f.FieldValue);
 for(const row of before){const after=f.documents.get(row.id);if(row.id==='unrelated')assert.deepEqual(after,row);else assert.deepEqual(after,{...row,partenaires:[...row.partenaires,'saxso']});}
 assert.equal(result.every(row=>row.saxsoAuthorized),true);
 assert.equal(JSON.stringify(result).includes('LRF-'),false);
});
test('an ambiguous or missing company stops before any update',async()=>{
 for(const action of ['duplicate','missing']){
  const f=fixture();if(action==='duplicate')f.documents.set('duplicate',{...f.documents.get('client-0'),id:'duplicate'});else f.documents.delete('client-0');
  await assert.rejects(grant(f.db,f.FieldValue),/Latino Ceram/);assert.equal(f.writes(),0);
 }
});
test('disabled access or malformed partner data cannot partly update the other clients',async()=>{
 for(const patch of [{proAccessDisabled:true},{partenaires:'invalid'}]){
  const f=fixture();Object.assign(f.documents.get('client-3'),patch);
  await assert.rejects(grant(f.db,f.FieldValue));assert.equal(f.writes(),0);
 }
});
test('the CRM, mail filters and agent sessions contain every current site partner',()=>{
 const read=path=>readFileSync(new URL('../'+path,'file://'+__filename),'utf8');
 const expected=JSON.parse(read('data/fabricants.json')).map(row=>row.id).sort();
 for(const path of ['assets/js/crm-client-partner-access.js','assets/js/crm-client-enhancements.js','assets/js/mails-groupes-partenaires.js']){
  const source=read(path),literal=source.match(/const PARTNERS\s*=\s*(\{[\s\S]*?\});/)[1];
  assert.deepEqual(Object.keys(vm.runInNewContext('('+literal+')')).sort(),expected,path);
 }
 const list=read('assets/js/pro-session-bridge.js').match(/const ALL_PARTNERS\s*=\s*(\[[\s\S]*?\]);/)[1];
 assert.deepEqual(Array.from(vm.runInNewContext(list)).sort(),expected);
});
