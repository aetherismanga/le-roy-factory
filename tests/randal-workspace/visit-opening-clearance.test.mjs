import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {createVisitCollisionWorld,VISITOR_BODY_RADIUS} from '../../shared/lrf-3d/visit-collisions.js';

async function fixture(variant,{depth=450}={}){
 const {makeModel}=await import(`../../${variant}/src/model.js`),{Composition,boundsOnWall,disposeObject}=await import(`../../${variant}/src/composition.js`);
 const room=makeRoom({...DEFAULT_ROOM,points:[[0,0],[450,0],[450,depth],[0,depth]]}),format=variant==='studio-one'?'two':'harmony-two',asset=makeModel({format,includeMirror:false}),composition=new Composition(room);
 const result=composition.add('cabinet',asset,{width:80,format,top:'sella'},{wall:0,u:225,height:28});assert.ok(result.item,result.error);
 return {room,asset,composition,world:()=>createVisitCollisionWorld({room,items:composition.items,boundsOnWall}),dispose(){disposeObject(result.item.root);room.dispose();}};
}

for(const variant of ['studio-one','randal-general']){
 test(variant+': opening a real drawer causes only small physical backward steps',async()=>{
  const f=await fixture(variant),initial=f.world(),front=Math.max(...initial.obstacles[0].map(p=>p[1])),position={x:0,y:1.55,z:front+VISITOR_BODY_RADIUS+.02},start=position.z,dt=1/30;
  for(let frame=1;frame<=35;frame++){
   f.asset.drawers[1].position.z=frame*.01;const before={...position},world=f.world();
   assert.equal(world.clearOpening(position,dt,{x:0,z:1}),true,'Backward step admits drawer frame '+frame);
   assert.equal(position.x,0);assert.equal(position.y,1.55);assert.ok(position.z>=before.z);
   assert.ok(position.z-before.z<=dt*.65+1e-8,'Retreat speed stays at walking pace');
   assert.equal(world.passable(position.x,position.z),true,'Body remains clear of the proposed drawer frame');
  }
  assert.ok(position.z-start>.30&&position.z-start<.36,'Body follows drawer extension without a jump');
  f.dispose();
 });
 test(variant+': tight rear wall blocks the proposed frame without moving the body',async()=>{
  const f=await fixture(variant,{depth:120}),initial=f.world(),front=Math.max(...initial.obstacles[0].map(p=>p[1])),position={x:0,y:1.55,z:front+VISITOR_BODY_RADIUS+.02},dt=1/30;
  let rejected=false;
  for(let frame=1;frame<=35;frame++){
   const oldDrawer=f.asset.drawers[1].position.z,before={...position};f.asset.drawers[1].position.z=frame*.01;
   if(!f.world().clearOpening(position,dt,{x:0,z:1})){
    assert.deepEqual(position,before,'A blocked gesture never teleports or partially slides the visitor');
    f.asset.drawers[1].position.z=oldDrawer;
    assert.equal(f.world().passable(position.x,position.z),true,'Restoring the last mechanism frame restores safe clearance');
    rejected=true;break;
   }
  }
  assert.equal(rejected,true,'Wall obstruction must stop the opening before full extension');f.dispose();
 });
}

test('newly opened furniture may only be exited; wrong normals and large penetrations fail atomically',async()=>{
 const f=await fixture('studio-one'),initial=f.world(),front=Math.max(...initial.obstacles[0].map(p=>p[1])),position={x:0,z:front+VISITOR_BODY_RADIUS+.002},before={...position};
 f.asset.drawers[1].position.z=.015;
 assert.equal(f.world().clearOpening(position,1/30,{x:0,z:-1}),false,'Wrong direction cannot push the body deeper into the drawer');assert.deepEqual(position,before);
 f.asset.drawers[1].position.z=.35;
 assert.equal(f.world().clearOpening(position,1/30,{x:0,z:1}),false,'Large unanimated changes cannot be repaired by teleporting');assert.deepEqual(position,before);
 assert.equal(f.world().clearOpening(position,1/30,{x:0,z:0}),false);assert.deepEqual(position,before);f.dispose();
});

class NodeDouble{
 constructor(){this.style={};this.children=[];this.attributes={};this.classList={toggle(){},remove(){}};}
 append(...nodes){this.children.push(...nodes);}
 addEventListener(){}setAttribute(name,value){this.attributes[name]=value;}
}
for(const variant of ['studio-one','randal-general'])test(variant+': clearOpening updates body and first-person camera together, only when called in a visit',async()=>{
 const previous={document:globalThis.document,window:globalThis.window,matchMedia:globalThis.matchMedia,innerWidth:globalThis.innerWidth,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 Object.assign(globalThis,{document:{createElement:()=>new NodeDouble(),addEventListener(){}},window:{addEventListener(){}},matchMedia:()=>({matches:false}),innerWidth:1200,setTimeout:()=>0,clearTimeout(){}});
 const f=await fixture(variant);
 try{
  const {createWalkMode}=await import(`../../${variant}/src/walk-mode.js`),front=Math.max(...f.world().obstacles[0].map(p=>p[1])),camera=new T.PerspectiveCamera();camera.position.set(0,1.55,front+.32);
  const controls={target:new T.Vector3(0,1.55,0),enabled:true,update(){}},walk=createWalkMode({stage:new NodeDouble(),canvas:new NodeDouble(),camera,controls,getRoom:()=>f.room,getItems:()=>f.composition.items,onMove(){}}),initial=camera.position.clone();
  assert.equal(walk.clearOpening(1/30,{x:0,z:1}),false,'Outside visit there is no gesture movement');assert.ok(camera.position.equals(initial));
  walk.setActive(true);const before=walk.position.clone();f.asset.drawers[1].position.z=.03;
  assert.equal(walk.clearOpening(1/30,{x:0,z:1}),true);assert.ok(walk.position.z>before.z);assert.ok(camera.position.equals(walk.position),'First-person camera remains at body location');
  const after=walk.position.clone();assert.equal(walk.clearOpening(1/30,{x:0,z:1}),true);assert.ok(walk.position.equals(after),'An already clear position is not moved gratuitously');
  walk.setActive(false);
 }finally{f.dispose();Object.assign(globalThis,previous);}
});

async function doorFixture(variant,hingeSide,{depth=450}={}){
 const {makeOpening}=await import('../../shared/lrf-3d/openings.js'),{Composition,boundsOnWall,disposeObject}=await import(`../../${variant}/src/composition.js`);
 const room=makeRoom({...DEFAULT_ROOM,points:[[0,0],[450,0],[450,depth],[0,depth]]}),settings={width:83,height:204,hingeSide,doorOpen:true},asset=makeOpening('door',settings),composition=new Composition(room),result=composition.add('door',asset,settings,{wall:0,u:225,height:0});assert.ok(result.item,result.error);
 return {room,asset,item:result.item,world:({gesture=true}={})=>createVisitCollisionWorld({room,items:composition.items,boundsOnWall,...(gesture?{openingItem:result.item}:{})}),dispose(){disposeObject(result.item.root);room.dispose();}};
}
for(const variant of ['studio-one','randal-general'])for(const hinge of ['left','right'])for(const closing of [false,true])test(`${variant}: real ${hinge} room door ${closing?'closing':'opening'} preserves body clearance`,async()=>{
 const f=await doorFixture(variant,hinge),position={x:0,y:1.55,z:.4},start=position.z,dt=1/30;
 f.item.settings.doorOpen=!closing;f.asset.setOpenProgress(closing?1:0);
 assert.equal(f.world().passable(position.x,position.z),true,'Start outside the actual leaf');
 const facing=new T.Vector3(0,0,1).transformDirection(f.asset.door.matrixWorld),toActor=new T.Vector3(position.x,0,position.z).sub(f.asset.door.getWorldPosition(new T.Vector3())),normalSign=facing.dot(toActor)<0?-1:1;let previousProgress=closing?1:0;
 for(let frame=1;frame<=100;frame++){
  f.asset.setOpenProgress(closing?1-frame/100:frame/100);const before={...position},world=f.world();
  const normal=new T.Vector3(0,0,1).transformDirection(f.asset.door.matrixWorld).multiplyScalar(normalSign);
  if(!world.clearOpening(position,dt,normal)){
   assert.ok(closing,'The open room permits a complete outward door pull');
   assert.deepEqual(position,before,'A closing leaf blocked by its wall never pushes the body through it');
   f.asset.setOpenProgress(previousProgress);assert.equal(f.world().passable(position.x,position.z),true,'Rollback keeps the closing door and body separated');break;
  }
  assert.equal(position.y,1.55);assert.ok(Math.hypot(position.x-before.x,position.z-before.z)<=dt*.65+1e-8);
  assert.equal(world.passable(position.x,position.z),true,'Proposed door frame never intersects body');previousProgress=closing?1-frame/100:frame/100;
 }
 assert.ok(Math.hypot(position.x,position.z-start)>.02,'The leaf really required a retreat during its swing');
 f.dispose();
});

test('only gesture worlds include the thin live door panel; the ordinary doorway stays traversable',async()=>{
 const f=await doorFixture('studio-one','left');f.asset.setOpenProgress(1);
 const gesture=f.world(),ordinary=f.world({gesture:false}),panel=gesture.obstacles.at(-1),xs=panel.map(p=>p[0]),zs=panel.map(p=>p[1]);
 assert.equal(ordinary.obstacles.length,0,'Ordinary walk has no added door collider');assert.equal(gesture.obstacles.length,1);
 assert.ok(Math.max(...xs)-Math.min(...xs)<.045,'Only 40 mm panel thickness is included across X');assert.ok(Math.max(...zs)-Math.min(...zs)>.7,'Rotated actual panel length follows the leaf');
 assert.equal(ordinary.passable(0,-.15),true,'Original open doorway remains usable');
 f.dispose();
});

test('a room door swing blocked by a rear wall rejects its frame without pushing the body through the wall',async()=>{
 const f=await doorFixture('studio-one','left',{depth:90}),position={x:0,y:1.55,z:.36},dt=1/30;let rejected=false,previous=0;
 for(let frame=1;frame<=100;frame++){
  const before={...position},next=frame/100;f.asset.setOpenProgress(next);
  if(!f.world().clearOpening(position,dt,{x:0,z:1})){
   assert.deepEqual(position,before,'Blocked door cannot teleport or slide the visitor');f.asset.setOpenProgress(previous);
   assert.equal(f.world().passable(position.x,position.z),true,'Rollback restores the last safe door/body configuration');rejected=true;break;
  }
  previous=next;
 }
 assert.equal(rejected,true);f.dispose();
});
