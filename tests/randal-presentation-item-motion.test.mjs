import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPresentationMotion,presentationDrawerTargets} from '../shared/lrf-3d/randal-presentation-motion.js';
import {createRandalPresentationScene} from '../shared/lrf-3d/randal-presentation-scene.js';

function clock(items,drawerTravel){
 let time=0,id=0,current=items;const frames=new Map();
 const motion=createPresentationMotion({getItems:()=>current,drawerTravel,now:()=>time,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id),reducedMotion:()=>false});
 return {motion,frames,setItems:items=>current=items,step(value){time=value;const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(time);}};
}
async function fixture(variant,count=2){
 const {buildPreview}=await import('../'+variant+'/src/commerce/preview-model.js'),{initialDraft,draftProject}=await import('../'+variant+'/src/commerce/guided.js'),{drawerTravel}=await import('../'+variant+'/src/configuration.js');
 const draft=variant==='studio-one'?{...initialDraft(),format:count===3?'three':'two',column:true,mirror:'ilse'}:{...initialDraft('harmony'),format:count===3?'harmony-three':'harmony-two',column:true,mirror:'ilse'},project=draftProject(draft),preview=buildPreview(project);
 return {project,preview,drawerTravel,cabinet:preview.items.find(i=>i.type==='cabinet'),column:preview.items.find(i=>i.type==='column'),mirror:preview.items.find(i=>i.type==='mirror')};
}
function release(preview){const geometries=new Set(),materials=new Set();preview.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const material of o.material?Array.isArray(o.material)?o.material:[o.material]:[])materials.add(material);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();}
const travelValues=(item,drawerTravel)=>presentationDrawerTargets(item.asset,drawerTravel).map(row=>({value:row.drawer.position.z,target:row.travel}));

for(const variant of ['studio-one','randal-general'])test(variant+': opening only the selected cabinet leaves its column and source settings untouched',async()=>{
 const f=await fixture(variant,3),timer=clock(f.preview.items,f.drawerTravel),settings=JSON.stringify(f.preview.items.map(item=>item.settings));
 try{
  assert.equal(timer.motion.setItemOpened(f.cabinet.id,true),true);assert.deepEqual(timer.motion.itemCapabilities(f.cabinet.id),{openable:true,opened:true});
  assert.deepEqual(timer.motion.itemCapabilities(f.column.id),{openable:true,opened:false});assert.deepEqual(timer.motion.capabilities(),{openable:true,opened:false,partlyOpened:true});
  timer.step(450);for(const row of travelValues(f.cabinet,f.drawerTravel))assert(Math.abs(row.value-row.target*.5)<1e-8);assert.equal(f.column.asset.door.rotation.y,0);
  timer.step(900);const rows=travelValues(f.cabinet,f.drawerTravel);assert.deepEqual(rows.map(row=>row.value),[.2,.26,.315]);
  assert.equal(timer.motion.setItemOpened(f.cabinet.id,false),true);timer.step(1350);assert(rows.every(row=>row.value>0));timer.step(1800);assert(f.cabinet.asset.drawers.every(drawer=>drawer.position.z===0));assert.equal(f.column.asset.door.rotation.y,0);
  assert.equal(JSON.stringify(f.preview.items.map(item=>item.settings)),settings);
 }finally{timer.motion.dispose();release(f.preview);}
});

test('independent opening and closing animations keep their own clocks, then the global control unifies mixed states',async()=>{
 const f=await fixture('studio-one',3),timer=clock(f.preview.items,f.drawerTravel);
 try{
  timer.motion.setItemOpened(f.cabinet.id,true);timer.step(300);timer.motion.setItemOpened(f.column.id,true);timer.step(450);const before=travelValues(f.cabinet,f.drawerTravel).map(row=>row.value);
  timer.motion.setItemOpened(f.cabinet.id,false);timer.step(750);for(const [index,row]of travelValues(f.cabinet,f.drawerTravel).entries())assert(row.value>0&&row.value<before[index]);assert(Math.abs(Math.abs(f.column.asset.door.rotation.y)-Math.PI*.55*.5)<1e-8);
  timer.step(1350);assert(f.cabinet.asset.drawers.every(drawer=>drawer.position.z===0));assert(Math.abs(Math.abs(f.column.asset.door.rotation.y)-Math.PI*.55)<1e-8);assert.equal(timer.motion.partlyOpened,true);assert.equal(timer.motion.opened,false);
  timer.motion.setOpened(true);timer.step(2250);assert.equal(timer.motion.opened,true);assert.equal(timer.motion.partlyOpened,false);assert.equal(timer.motion.isItemOpened(f.cabinet.id),true);assert.equal(timer.motion.isItemOpened(f.column.id),true);
  timer.motion.setOpened(false);timer.step(3150);assert.equal(timer.motion.opened,false);assert.equal(timer.motion.partlyOpened,false);assert(f.cabinet.asset.drawers.every(drawer=>drawer.position.z===0));assert.equal(f.column.asset.door.rotation.y,0);assert.equal(timer.frames.size,0);
 }finally{timer.motion.dispose();release(f.preview);}
});

test('mirror, unknown, and non-opening furniture ids are rejected without affecting another item',async()=>{
 const f=await fixture('studio-one'),empty={id:'empty-cabinet',type:'cabinet',asset:{drawers:[]}},timer=clock([...f.preview.items,empty],f.drawerTravel);
 try{for(const id of [f.mirror.id,'missing',empty.id]){assert.deepEqual(timer.motion.itemCapabilities(id),{openable:false,opened:false});assert.equal(timer.motion.setItemOpened(id,true),false);}assert.equal(timer.frames.size,0);assert.equal(timer.motion.isItemOpened(f.cabinet.id),false);assert(f.cabinet.asset.drawers.every(drawer=>drawer.position.z===0));}
 finally{timer.motion.dispose();release(f.preview);}
});

for(const variant of ['studio-one','randal-general'])test(variant+': mixed individual states survive replacement of all model assets without a global open call',async()=>{
 const first=await fixture(variant),next=await fixture(variant,3),timer=clock(first.preview.items,first.drawerTravel);
 try{
  timer.motion.setItemOpened(first.cabinet.id,true);timer.step(900);timer.setItems(next.preview.items);
  assert.deepEqual(timer.motion.itemCapabilities(next.cabinet.id),{openable:true,opened:true});for(const row of travelValues(next.cabinet,next.drawerTravel))assert.equal(row.value,row.target);assert.equal(next.column.asset.door.rotation.y,0);assert.equal(timer.motion.partlyOpened,true);assert.equal(timer.motion.opened,false);
  timer.motion.setItemOpened(next.cabinet.id,false);timer.step(1800);assert(next.cabinet.asset.drawers.every(drawer=>drawer.position.z===0));assert.equal(next.column.asset.door.rotation.y,0);
 }finally{timer.motion.dispose();release(first.preview);release(next.preview);}
});

test('a replacement during an individual animation preserves progress and finishes at the original deadline',async()=>{
 const first=await fixture('studio-one',3),next=await fixture('studio-one'),timer=clock(first.preview.items,first.drawerTravel);
 try{
  timer.motion.setItemOpened(first.cabinet.id,true);timer.step(300);const progress=travelValues(first.cabinet,first.drawerTravel)[0].value/.2,oldValues=first.cabinet.asset.drawers.map(drawer=>drawer.position.z);timer.setItems(next.preview.items);timer.motion.itemCapabilities(next.cabinet.id);
  for(const row of travelValues(next.cabinet,next.drawerTravel))assert(Math.abs(row.value/row.target-progress)<1e-8);
  timer.step(600);for(const row of travelValues(next.cabinet,next.drawerTravel))assert(Math.abs(row.value/row.target-(progress+(1-progress)*.5))<1e-8);
  timer.step(900);for(const row of travelValues(next.cabinet,next.drawerTravel))assert.equal(row.value,row.target);assert.deepEqual(first.cabinet.asset.drawers.map(drawer=>drawer.position.z),oldValues);assert.equal(timer.frames.size,0);
 }finally{timer.motion.dispose();release(first.preview);release(next.preview);}
});

test('new items follow the last global action and removing a moving item releases its scheduled callback',async()=>{
 const f=await fixture('studio-one'),extra=await fixture('studio-one'),timer=clock([f.cabinet],f.drawerTravel);
 try{
  timer.motion.setItemOpened(f.cabinet.id,true);timer.step(900);assert.equal(timer.motion.opened,true);
  timer.setItems([f.cabinet,f.column]);assert.equal(timer.motion.opened,false);assert.equal(timer.motion.isItemOpened(f.column.id),false);
  timer.motion.setOpened(true);timer.step(1800);const extraColumn={...extra.column,id:'second-column'};timer.setItems([f.cabinet,f.column,extraColumn]);assert.equal(timer.motion.isItemOpened(extraColumn.id),true);timer.step(2250);assert(Math.abs(extraColumn.asset.door.rotation.y)>0);
  const value=extraColumn.asset.door.rotation.y,stale=[...timer.frames.values()][0];timer.setItems([f.cabinet,f.column]);timer.motion.capabilities();assert.equal(timer.frames.size,0);stale(2700);assert.equal(extraColumn.asset.door.rotation.y,value);
 }finally{timer.motion.dispose();release(f.preview);release(extra.preview);}
});

test('individual opening preserves live hinge changes and disposal cancels every item animation',async()=>{
 const f=await fixture('randal-general',3),timer=clock(f.preview.items,f.drawerTravel);
 try{
  timer.motion.setItemOpened(f.column.id,true);timer.step(300);f.column.asset.setHingeSide('right');timer.step(450);assert(f.column.asset.door.rotation.y>0);assert.equal(f.cabinet.asset.drawers[0].position.z,0);
  timer.motion.setItemOpened(f.cabinet.id,true);const stale=[...timer.frames.values()][0],values=f.cabinet.asset.drawers.map(drawer=>drawer.position.z),angle=f.column.asset.door.rotation.y;timer.motion.dispose();stale(2000);assert.deepEqual(f.cabinet.asset.drawers.map(drawer=>drawer.position.z),values);assert.equal(f.column.asset.door.rotation.y,angle);assert.equal(timer.frames.size,0);assert.equal(timer.motion.setItemOpened(f.cabinet.id,true),false);
 }finally{timer.motion.dispose();release(f.preview);}
});

test('the genuine presentation scene exposes individual item controls and mixed global capability',async()=>{
 const f=await fixture('studio-one',3),scene=new T.Scene(),floor=new T.Mesh(),wall=new T.Mesh(),previous=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:true});scene.add(f.preview.group,floor,wall);
 const presentation=createRandalPresentationScene({scene,renderer:{capabilities:{getMaxAnisotropy:()=>16}},floor,wall,getItems:()=>f.preview.items,invalidate(){},loadExteriorTexture:async()=>new T.Texture({width:2,height:1})});
 try{
  assert.equal(presentation.setItemOpened(f.cabinet.id,true),true);assert.equal(presentation.isItemOpened(f.cabinet.id),true);assert.deepEqual(presentation.itemCapabilities(f.column.id),{openable:true,opened:false});
  assert.equal(presentation.capabilities().opened,false);assert.equal(presentation.capabilities().partlyOpened,true);assert.equal(f.column.asset.door.rotation.y,0);assert.deepEqual(presentation.itemCapabilities(f.mirror.id),{openable:false,opened:false});
  presentation.setOpened(true);assert.equal(presentation.capabilities().opened,true);assert.equal(presentation.capabilities().partlyOpened,false);
  presentation.setItemOpened(f.column.id,false);assert.equal(presentation.capabilities().opened,false);assert.equal(presentation.capabilities().partlyOpened,true);for(const row of travelValues(f.cabinet,f.drawerTravel))assert.equal(row.value,row.target);
 }finally{presentation.dispose();globalThis.matchMedia=previous;release(f.preview);floor.geometry?.dispose();floor.material?.dispose();wall.geometry?.dispose();wall.material?.dispose();}
});

test('Studio finish/settings refresh keeps an individually opened cabinet on the same asset without opening the column',async()=>{
 const f=await fixture('studio-one',3),timer=clock(f.preview.items,f.drawerTravel),{applyPreviewSettings,FINISHES}=await import('../studio-one/src/commerce/preview-model.js');
 try{
  timer.motion.setItemOpened(f.cabinet.id,true);timer.step(900);const asset=f.cabinet.asset,next=structuredClone(f.project),cabinet=next.items.find(item=>item.id===f.cabinet.id);cabinet.settings.finish=FINISHES.find(finish=>finish.id!==cabinet.settings.finish).id;
  applyPreviewSettings(f.preview,next);assert.equal(f.cabinet.asset,asset);for(const drawer of asset.drawers)drawer.position.z=0;
  timer.motion.refresh();for(const row of travelValues(f.cabinet,f.drawerTravel))assert.equal(row.value,row.target);assert.equal(f.column.asset.door.rotation.y,0);assert.deepEqual(timer.motion.capabilities(),{openable:true,opened:false,partlyOpened:true});
  timer.motion.setItemOpened(f.cabinet.id,false);timer.step(1200);const values=asset.drawers.map(drawer=>drawer.position.z);for(const drawer of asset.drawers)drawer.position.z=0;timer.motion.refresh();assert.deepEqual(asset.drawers.map(drawer=>drawer.position.z),values);timer.step(1800);assert(asset.drawers.every(drawer=>drawer.position.z===0));assert.equal(f.column.asset.door.rotation.y,0);
 }finally{timer.motion.dispose();release(f.preview);}
});
