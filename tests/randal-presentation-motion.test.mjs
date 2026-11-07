import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPresentationMotion,presentationDrawerTargets,PRESENTATION_OPENING_DURATION} from '../shared/lrf-3d/randal-presentation-motion.js';

function clock(items,options={}){
 let time=0,id=0,invalidations=0,current=items;const frames=new Map();
 const motion=createPresentationMotion({getItems:()=>current,now:()=>time,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id),invalidate:()=>invalidations++,reducedMotion:()=>false,...options});
 return {motion,frames,get invalidations(){return invalidations;},setItems:items=>current=items,step(value){time=value;const ready=[...frames.values()];frames.clear();for(const fn of ready)fn(time);}};
}
function release(preview){const geometries=new Set(),materials=new Set();preview.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const material of o.material?Array.isArray(o.material)?o.material:[o.material]:[])materials.add(material);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();}
async function fixture(variant,count,column=true){
 const {buildPreview}=await import('../'+variant+'/src/commerce/preview-model.js'),{initialDraft,draftProject}=await import('../'+variant+'/src/commerce/guided.js'),{drawerTravel}=await import('../'+variant+'/src/configuration.js');
 const draft=variant==='studio-one'?{...initialDraft(),format:count===3?'three':'two',column}:{...initialDraft('harmony'),format:count===3?'harmony-three':'harmony-two',column};
 const preview=buildPreview(draftProject(draft));return {preview,drawerTravel,cabinet:preview.items.find(i=>i.type==='cabinet'),column:preview.items.find(i=>i.type==='column')};
}
for(const variant of ['studio-one','randal-general'])for(const count of [2,3])test(variant+': '+count+' true drawers open gradually farther from top to bottom',async()=>{
 const f=await fixture(variant,count),before=f.cabinet.asset.drawers.map(d=>d.position.z),timer=clock(f.preview.items,{drawerTravel:f.drawerTravel});
 try{
  assert.equal(PRESENTATION_OPENING_DURATION,900);assert.equal(timer.motion.setOpened(true),true);assert.deepEqual(f.cabinet.asset.drawers.map(d=>d.position.z),before);
  timer.step(450);const half=presentationDrawerTargets(f.cabinet.asset,f.drawerTravel);for(const row of half)assert(Math.abs(row.drawer.position.z-row.travel*.5)<1e-8);
  assert(Math.abs(f.column.asset.door.rotation.y)<Math.PI*.55);
  timer.step(899);assert(timer.frames.size>0);timer.step(900);
  const rows=presentationDrawerTargets(f.cabinet.asset,f.drawerTravel);assert.equal(rows.length,count);
  for(let i=0;i<rows.length;i++){assert(Math.abs(rows[i].drawer.position.z-f.drawerTravel(i,count))<1e-8);if(i)assert(rows[i].drawer.position.z>rows[i-1].drawer.position.z);}
  assert.equal(timer.frames.size,0);assert(Math.abs(Math.abs(f.column.asset.door.rotation.y)-Math.PI*.55)<1e-8);
  timer.motion.setOpened(false);timer.step(1350);assert(rows.every(r=>r.drawer.position.z>0&&r.drawer.position.z<r.travel));timer.step(1800);assert(rows.every(r=>r.drawer.position.z===0));assert.equal(f.column.asset.door.rotation.y,0);
 }finally{timer.motion.dispose();release(f.preview);}
});

test('geometry height determines travel even when drawer assembly order is reversed',async()=>{
 const f=await fixture('studio-one',3,false);try{const source=presentationDrawerTargets(f.cabinet.asset,f.drawerTravel).map(r=>({drawer:r.drawer,travel:r.travel}));f.cabinet.asset.drawers.reverse();const rows=presentationDrawerTargets(f.cabinet.asset,f.drawerTravel);for(let i=0;i<rows.length;i++){assert.equal(rows[i].drawer,source[i].drawer);assert.equal(rows[i].travel,source[i].travel);}}finally{release(f.preview);}
});
test('shallow carcass bounds retain the top-to-bottom travel proportions',()=>{
 const drawers=[0,1,2].map(i=>{const group=new T.Group();group.position.y=2-i;group.add(new T.Mesh(new T.BoxGeometry(.5,.2,.12)));return group;}),asset={drawers,spec:{depth:.16}};
 try{const rows=presentationDrawerTargets(asset);assert.equal(rows[2].travel,.16*.8);assert(rows[0].travel<rows[1].travel&&rows[1].travel<rows[2].travel);}finally{for(const drawer of drawers)drawer.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
});
test('rapid reversal reads actual progress, cancels old callbacks and never overshoots',async()=>{
 const f=await fixture('studio-one',3),timer=clock(f.preview.items,{drawerTravel:f.drawerTravel});
 try{
  timer.motion.setOpened(true);const stale=[...timer.frames.values()][0];timer.step(300);const values=f.cabinet.asset.drawers.map(d=>d.position.z);timer.motion.setOpened(false);stale(900);assert.deepEqual(f.cabinet.asset.drawers.map(d=>d.position.z),values);
  timer.step(750);for(let i=0;i<values.length;i++)assert(Math.abs(f.cabinet.asset.drawers[i].position.z-values[i]*.5)<1e-8);
  timer.motion.setOpened(true);const from=f.cabinet.asset.drawers.map(d=>d.position.z);timer.step(1200);for(let i=0;i<values.length;i++){const value=f.cabinet.asset.drawers[i].position.z;assert(value>=from[i]&&value<=f.drawerTravel(i,values.length));}timer.step(1650);assert.equal(timer.frames.size,0);
 }finally{timer.motion.dispose();release(f.preview);}
});
test('door hinge changes during a slow opening keep the current opening progress',async()=>{
 const f=await fixture('randal-general',2),timer=clock(f.preview.items,{drawerTravel:f.drawerTravel});try{timer.motion.setOpened(true);timer.step(300);const before=Math.abs(f.column.asset.door.rotation.y);f.column.asset.setHingeSide('right');timer.step(450);assert(f.column.asset.door.rotation.y>0);assert(Math.abs(f.column.asset.door.rotation.y)>before);timer.step(900);assert(Math.abs(f.column.asset.door.rotation.y-Math.PI*.55)<1e-8);}finally{timer.motion.dispose();release(f.preview);}
});
test('an opened composition reapplies its motion to newly built assets',async()=>{
 const first=await fixture('studio-one',2),next=await fixture('studio-one',3),timer=clock(first.preview.items,{drawerTravel:first.drawerTravel});try{timer.motion.setOpened(true);timer.step(900);assert.equal(timer.motion.opened,true);timer.setItems(next.preview.items);timer.motion.setOpened(true);timer.step(1800);for(const row of presentationDrawerTargets(next.cabinet.asset,next.drawerTravel))assert.equal(row.drawer.position.z,row.travel);}finally{timer.motion.dispose();release(first.preview);release(next.preview);}
});
test('reduced motion is immediate and closing stops every pending update',async()=>{
 const f=await fixture('studio-one',3),reduced=clock(f.preview.items,{drawerTravel:f.drawerTravel,reducedMotion:()=>true}),animated=clock(f.preview.items,{drawerTravel:f.drawerTravel});try{reduced.motion.setOpened(true);assert.equal(reduced.frames.size,0);assert(f.cabinet.asset.drawers.every(d=>d.position.z>0));animated.motion.setOpened(false);const late=[...animated.frames.values()][0],before=f.cabinet.asset.drawers.map(d=>d.position.z);animated.motion.dispose();late(1000);assert.deepEqual(f.cabinet.asset.drawers.map(d=>d.position.z),before);assert.equal(animated.frames.size,0);assert.equal(animated.motion.setOpened(true),false);}finally{reduced.motion.dispose();animated.motion.dispose();release(f.preview);}
});
test('General paired column doors and door-only cabinets retain their native opposing pivots',async()=>{
 const {CATALOG:C}=await import('../randal-general/src/commerce/catalog.js'),{makeColumn}=await import('../randal-general/src/column.js'),{buildPreview}=await import('../randal-general/src/commerce/preview-model.js'),{initialDraft,draftProject}=await import('../randal-general/src/commerce/guided.js');
 const definition=C.columns.find(c=>c.collection==='brent'&&c.width===60),column=makeColumn({columnModel:definition.id,finish:definition.finishes[0]}),preview=buildPreview(draftProject(initialDraft('less'))),cabinet=preview.items.find(i=>i.type==='cabinet'),timer=clock([{type:'column',asset:column},...preview.items]);
 try{
  assert.equal(column.doors.length,2);assert.equal(cabinet.asset.drawers.length,0);assert(cabinet.asset.doors.length>0);
  timer.motion.setOpened(true);timer.step(450);assert(column.doors[0].rotation.y*column.doors[1].rotation.y<0);assert(Math.abs(Math.abs(cabinet.asset.doors[0].rotation.y)-Math.PI*.52*.5)<1e-8);
  timer.step(900);assert(Math.abs(Math.abs(column.doors[0].rotation.y)-Math.PI*.55)<1e-8);assert(Math.abs(Math.abs(cabinet.asset.doors[0].rotation.y)-Math.PI*.52)<1e-8);
 }finally{timer.motion.dispose();column.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});release(preview);}
});
