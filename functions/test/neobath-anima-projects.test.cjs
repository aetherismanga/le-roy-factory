'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createNeobathProjectStore, normalizeProject} = require('../neobath-anima-projects.cjs');
const catalogue = {products: [{id:'pura-80', category:'module'}, {id:'top-80', category:'worktop'}], finishes: [{id:'gesso'}]};
const jerome = {uid:'jerome-uid', email:'jerome@leroyfactory.fr'};
const coryne = {uid:'coryne-uid', email:'coryne@leroyfactory.fr'};
function project() {
  return {schema:'neobath-anima-project',version:1,id:'anima-12345678-1234-1234-1234-123456789012',revision:0,title:'Client Montpellier',
    items:[{key:'12345678-1234',productId:'pura-80',finishId:'gesso',priceKey:'standard',handle:'black',hinge:'left',x:0,bottom:30,z:0,topId:'top-80',topPriceKey:'standard',topWidth:80.5,basinId:'',basinPriceKey:'standard',mirrorId:'',lightId:'',accessoryId:''}],
    room:{width:300,depth:260,height:250,wall:'#e8e6de',floor:'#b6b5a6'},view:'studio',quality:'normal'};
}
function store() {
  const records = new Map();
  const snapshot = id => ({exists:records.has(id), data:()=>records.get(id)});
  const chain = {orderBy:()=>chain, limit:()=>chain, get:async()=>({docs:[...records.keys()].map(snapshot)}), doc:id=>({id})};
  const db = {collection:name=>{assert.equal(name,'neobath_anima_projects');return chain;},runTransaction:async task=>task({get:async ref=>snapshot(ref.id),set:(ref,data)=>records.set(ref.id,data)})};
  return {records, actions:createNeobathProjectStore({db,loadCatalogue:()=>catalogue})};
}
test('both verified agents share saved projects, server authorship and timestamps are authoritative', async()=>{
  const {actions} = store();
  const input = {...project(),updatedBy:'client@example.test',createdAt:'invented',token:'must not persist',pricePurchase:1};
  const saved = await actions['projects-save']({project:input},jerome);
  assert.equal(saved.project.revision,1);
  assert.equal(saved.project.createdBy,jerome.email);
  assert.equal(saved.project.updatedBy,jerome.email);
  assert.ok(!('token' in saved.project));
  assert.ok(!('pricePurchase' in saved.project));
  assert.ok(!Number.isNaN(Date.parse(saved.project.createdAt)));
  const listed = await actions['projects-list']({},coryne);
  assert.equal(listed.projects[0].id,input.id);
  const update = await actions['projects-save']({project:{...saved.project,title:'Modifié par Coryne'}},coryne);
  assert.equal(update.project.revision,2);
  assert.equal(update.project.createdBy,jerome.email);
  assert.equal(update.project.updatedBy,coryne.email);
});
test('stale saves and deletes conflict; deleted projects cannot be silently resurrected',async()=>{
  const {actions} = store();
  const saved = await actions['projects-save']({project:project()},jerome);
  await assert.rejects(actions['projects-save']({project:project()},coryne),{status:409});
  await assert.rejects(actions['projects-delete']({id:saved.project.id,revision:0},coryne),{status:409});
  await actions['projects-delete']({id:saved.project.id,revision:1},coryne);
  assert.deepEqual((await actions['projects-list']({},jerome)).projects,[]);
  await assert.rejects(actions['projects-save']({project:project()},jerome),{status:410});
});
test('source identities, finite dimensions, distinct items and bounded room are required',()=>{
  const valid = project();
  assert.equal(normalizeProject(valid,catalogue).items[0].productId,'pura-80');
  for (const change of [p=>p.items[0].productId='unknown',p=>p.items[0].finishId='invented',p=>p.items[0].x=Infinity,p=>p.items.push({...p.items[0]}),p=>p.room.width=-3,p=>p.id='../outside',p=>p.revision=-1,p=>p.items=Array(61).fill(p.items[0])]) {
    const input = project();change(input);assert.throws(()=>normalizeProject(input,catalogue),{status:400});
  }
});
test('store independently rejects clients and missing identities before database access',async()=>{
  const {actions} = store();
  for(const agent of [null,{uid:'client',email:'client@example.test'},{email:jerome.email}]) {
    await assert.rejects(actions['projects-list']({},agent),{status:403});
    await assert.rejects(actions['projects-save']({project:project()},agent),{status:403});
  }
});
