import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {createVisitCollisionWorld,VISITOR_BODY_RADIUS,VISITOR_EYE_HEIGHT} from '../../shared/lrf-3d/visit-collisions.js';
import {boundsOnWall} from '../../studio-one/src/composition.js';

const room=()=>makeRoom(DEFAULT_ROOM);
const cabinet=(wall=0)=>({type:'cabinet',placement:{wall,u:225,height:30},dimensions:{width:.8,height:.54,depth:.46}});
const world=(r,items=[])=>createVisitCollisionWorld({room:r,items,boundsOnWall});

test('body clearance uses world coordinates on every wall, including suspended vanity',()=>{
 const r=room();
 for(let wall=0;wall<4;wall++){
  const item=cabinet(wall),w=r.walls[wall],t=new T.Vector3(w.normal.z,0,-w.normal.x),center=w.start.clone().addScaledVector(t,2.25),c=world(r,[item]);
  const blocked=center.clone().addScaledVector(w.normal,.46+VISITOR_BODY_RADIUS-.02),free=center.clone().addScaledVector(w.normal,.46+VISITOR_BODY_RADIUS+.02);
  assert.equal(c.passable(blocked.x,blocked.z),false,'Vanity body clearance on wall '+wall);
  assert.equal(c.passable(free.x,free.z),true,'Nearest free position on wall '+wall);
 }
 assert.ok(VISITOR_EYE_HEIGHT<1.65,'Camera stays within a 1.65 m visitor');
 r.dispose();
});

test('actual basin projection and opened drawers extend the collision footprint',()=>{
 const r=room(),item=cabinet(),root=new T.Group(),projecting=new T.Mesh(new T.BoxGeometry(.75,.1,.72),new T.MeshBasicMaterial());
 root.position.set(0,0,0);projecting.position.set(0,.9,.13);root.add(projecting);item.root=root;
 let c=world(r,[item]);
 assert.equal(c.passable(0,.49+VISITOR_BODY_RADIUS-.02),false,'Projected washbasin remains outside the torso');
 assert.equal(c.passable(0,.49+VISITOR_BODY_RADIUS+.02),true);
 projecting.position.z+=.25;c=world(r,[item]);
 assert.equal(c.passable(0,.74+VISITOR_BODY_RADIUS-.02),false,'An opened drawer is solid too');
 projecting.visible=false;c=world(r,[item]);
 assert.equal(c.passable(0,.74+VISITOR_BODY_RADIUS-.02),true,'Hidden alternative geometry is not a phantom obstacle');
 root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});r.dispose();
});

test('nearest safe entry relocates a camera already inside furniture',()=>{
 const r=room(),c=world(r,[cabinet()]),bad={x:0,z:.1};
 assert.equal(c.passable(bad.x,bad.z),false);
 const spawn=c.findSafe(bad);assert.ok(spawn);assert.equal(c.passable(spawn.x,spawn.z),true);
 assert.ok(Math.hypot(spawn.x-bad.x,spawn.z-bad.z)<1,'Spawn stays near the selected viewpoint');
 r.dispose();
});

test('delayed and diagonal movement cannot tunnel through a vanity or a low partition',()=>{
 const config={...DEFAULT_ROOM,partitions:[{id:'low',a:[225,120],b:[225,320],thickness:8,height:120}]},r=makeRoom(config);
 const c=world(r,[cabinet()]),p={x:0,z:1.2};
 c.move(p,{x:0,z:-2});assert.equal(c.passable(p.x,p.z),true);assert.ok(p.z>=.46-.23+VISITOR_BODY_RADIUS-.01,'Fast approach stops outside vanity');
 const q={x:-1,z:2};c.move(q,{x:2,z:.3});assert.ok(q.x<-.30,'Low partition blocks body even below eye height');assert.equal(c.passable(q.x,q.z),true);
 r.dispose();
});

test('walls stop the whole body and an open door retains a usable passage',()=>{
 const r=room(),door={type:'door',placement:{wall:0,u:225,height:0},settings:{doorOpen:false},dimensions:{width:.83,height:2.04,depth:.07}},closed=world(r,[door]);
 assert.equal(closed.passable(0,-.15),false);
 door.settings.doorOpen=true;const open=world(r,[door]);
 assert.equal(open.passable(0,-.15),true);
 assert.equal(open.passable(.2,-.15),false,'Door jambs reserve shoulder clearance');
 const p={x:0,z:.6};open.move(p,{x:0,z:-.9});assert.ok(p.z<-.23,'Open doorway may be crossed');
 const outside=p.z;for(let frame=0;frame<12;frame++)world(r,[door]).move(p,{x:0,z:-.08});
 assert.ok(p.z<=outside,'Refreshing collision bounds does not eject a visitor back inside the doorway');
 assert.equal(open.passable(p.x,p.z),true);
 r.dispose();
});

test('shower trays remain walkable and solid fixed glass screens block the body',()=>{
 const r=room(),tray={type:'shower',placement:{wall:0,u:225,height:0},dimensions:{width:1.2,depth:.8,height:.035}},screen={type:'screen',placement:{wall:0,u:225,height:3.5},dimensions:{width:1.2,depth:.018,height:2}};
 assert.equal(world(r,[tray]).passable(0,.5),true);
 assert.equal(world(r,[tray,screen]).passable(0,-.23+.15),false);
 r.dispose();
});


test('instanced geometry uses each rendered scale and position, never its unit source',()=>{
 const r=room(),item=cabinet(),root=new T.Group(),leaves=new T.InstancedMesh(new T.SphereGeometry(1,10,6),new T.MeshBasicMaterial(),1),matrix=new T.Matrix4();
 matrix.compose(new T.Vector3(0,.95,0),new T.Quaternion(),new T.Vector3(.008,.038,.004));leaves.setMatrixAt(0,matrix);root.add(leaves);item.root=root;
 let c=world(r,[item]);assert.equal(c.passable(0,.8),true,'A tiny leaf must not introduce a 2 metre source-sphere obstacle');
 matrix.compose(new T.Vector3(0,.8,.9),new T.Quaternion(),new T.Vector3(.03,.04,.04));leaves.setMatrixAt(0,matrix);
 c=world(r,[item]);assert.equal(c.passable(0,1.2),false,'Actual translated instances still contribute their real physical envelope');
 root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});r.dispose();
});

test('real decorated General Neris 100 cm keeps the vanity envelope at its rendered size',async()=>{
 const {makeModel}=await import('../../randal-general/src/model.js');
 const {Composition,boundsOnWall:generalBounds,disposeObject}=await import('../../randal-general/src/composition.js');
 const {decorateAsset}=await import('../../randal-general/src/decor.js');
 const r=room(),asset=makeModel({width:1,format:'harmony-two',basinTop:'neris',includeMirror:false}),settings={width:100,format:'harmony-two',top:'neris'},composition=new Composition(r);
 decorateAsset(asset,'cabinet',settings);const result=composition.add('cabinet',asset,settings,{wall:0,u:225,height:28});assert.ok(result.item,result.error);
 assert.equal(asset.root.getObjectByName('Feuillage')?.isInstancedMesh,true,'Exercise the actual instanced foliage from the product');
 const c=createVisitCollisionWorld({room:r,items:composition.items,boundsOnWall:generalBounds}),xs=c.obstacles[0].map(p=>p[0]),zs=c.obstacles[0].map(p=>p[1]);
 assert.ok(Math.max(...xs)-Math.min(...xs)<1.1,'100 cm vanity has no phantom 2 metre collision width');
 assert.ok(Math.max(...zs)-Math.min(...zs)<.6,'Vanity depth remains near its 45 cm product dimensions');
 const front=Math.max(...zs),p={x:0,z:1.3};c.move(p,{x:0,z:-1});
 assert.ok(p.z>=front+VISITOR_BODY_RADIUS-.01&&p.z<front+VISITOR_BODY_RADIUS+.06,'Approach stops at the actual rendered front plus shoulder clearance');
 assert.equal(c.passable(0,front+VISITOR_BODY_RADIUS+.02),true);
 disposeObject(result.item.root);r.dispose();
});
