import assert from 'node:assert/strict';
import * as T from 'three';
import {createArrangement,rectangle,overlaps,validateItemOverrides} from '../src/arrangement.js';
import {ROOMS,roomBounds,point,SCALE,WALLS} from '../src/plan.js';
import {QUALITY,applySceneQuality} from '../src/quality.js';
const project={items:{}},root=new T.Group(),floors=[0,1].map(()=>({static:new T.Group()})),registry=createArrangement({project,root,floors,doors:WALLS.flatMap(w=>w.openings.filter(o=>o.kind==='door').map(o=>({id:o.id,wall:w,opening:{...o,u:o.u*SCALE,width:o.width*SCALE},hinge:'left',inward:-1,sliding:true})))});
registry.prepare();
const shared=new T.MeshStandardMaterial({color:'#d4b48e'});
function make(id,x,z,angle=0){const group=new T.Group(),geometry=new T.BoxGeometry(.6,1,.4);geometry.translate(0,.5,0);group.add(new T.Mesh(geometry,shared));group.position.set(...point(x,.02,z));group.rotation.y=angle;floors[0].static.add(group);return registry.register(group,{id,kind:'bench',floor:0});}
const first=make('first',5,5),second=make('second',6,5),base=registry.read(first);
assert.ok(Math.abs(base.width-60)<.001);assert.ok(Math.abs(base.depth-40)<.001);
const rotation=make('rotation',5,7,Math.PI);assert.equal(Math.round(registry.read(rotation).angle),180);
assert.equal(overlaps(rectangle(0,0,2,.2,Math.PI/4),rectangle(0,1.5,.2,.2)),false);
assert.equal(overlaps(rectangle(0,0,2,.2,Math.PI/4),rectangle(.5,-.5,.2,.2)),true);
const blocked=registry.update('first',{x:registry.read(second).x});assert.equal(blocked.ok,false);assert.deepEqual(registry.read(first),base);
const b=roomBounds(ROOMS.find(r=>r.id==='living'));
const door=registry.update('first',{x:(1.45-b.x)*SCALE*100,z:(3.6-b.z)*SCALE*100});assert.equal(door.ok,false);assert.ok(door.errors.some(e=>e.includes('porte')));
const stair=registry.update('first',{room:'entry',x:(3.61-2.94)*SCALE*100,z:2*SCALE*100});assert.equal(stair.ok,false);assert.ok(stair.errors.some(e=>e.includes('escalier')));
assert.equal(registry.update('first',{x:1}).ok,false);
assert.equal(registry.update('first',{y:240}).ok,false);
assert.equal(registry.update('first',{color:'#72895e'}).ok,true);
assert.equal(second.object.children[0].material,shared);assert.equal(shared.color.getHexString(),'d4b48e');assert.notEqual(first.object.children[0].material,shared);
assert.equal(registry.update('first',{color:'#afa090'}).ok,true);assert.equal(first.clones.size,1);
assert.equal(registry.update('first',{hidden:true}).ok,true);assert.ok(!registry.colliders().some(c=>c.id==='first'));assert.ok(project.items.first.hidden);
assert.equal(registry.update('first',{hidden:false}).ok,true);assert.ok(registry.colliders().some(c=>c.id==='first'));
assert.equal(registry.reset('first').ok,true);assert.equal(project.items.first,undefined);assert.equal(first.object.children[0].material,shared);
// Bounds of an instanced decorative leaf must include its instance scale,
// rather than the two-metre source sphere used by the GPU.
const leaf=new T.InstancedMesh(new T.SphereGeometry(1,8,4),shared,2),matrix=new T.Matrix4();
matrix.makeScale(.01,.02,.01);leaf.setMatrixAt(0,matrix);matrix.setPosition(.06,0,0);leaf.setMatrixAt(1,matrix);
const plant=new T.Group();plant.add(leaf);plant.position.set(...point(4,.02,6));floors[0].static.add(plant);
const measured=registry.register(plant,{id:'instanced',kind:'plant',floor:0});assert.ok(measured.dimensions.x<.081&&measured.dimensions.x>.079);
const snapshot=structuredClone(project);assert.deepEqual(JSON.parse(JSON.stringify(snapshot)),snapshot);
assert.throws(()=>validateItemOverrides({bad:{x:Infinity}}));assert.throws(()=>validateItemOverrides({bad:{color:'red'}}));
assert.equal(WALLS.find(w=>w.id==='office-side').openings.length,0);assert.ok(WALLS.find(w=>w.id==='office-back').openings.some(o=>o.id==='office-door'));
assert.deepEqual(Object.keys(QUALITY),['eco','balanced','high']);
let mirrorSize;const house={mirrors:[{mirror:{getRenderTarget:()=>({setSize:(w,h)=>mirrorSize=[w,h]})}}]},garden={root:new T.Group()},grass=new T.InstancedMesh(new T.BoxGeometry(),shared,18000);grass.userData={qualityKind:'grass',fullCount:18000};garden.root.add(grass);
for(const id of Object.keys(QUALITY)){applySceneQuality(house,garden,id);assert.equal(grass.count,QUALITY[id].grass);assert.deepEqual(mirrorSize,[QUALITY[id].mirror,QUALITY[id].mirror]);}
console.log(JSON.stringify({result:'PASS',measuredBounds:true,orientedCollisions:true,doorsAndStairReserved:true,individualMaterials:true,removeRestore:true,instanceScale:true,performancePresets:3}));
