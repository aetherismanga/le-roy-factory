import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {createDaylightRig,captureRoomShadows} from '../../shared/lrf-3d/daylight.js';

const color=new T.Color('#fff8ed');
const config={height:260,points:[[0,0],[450,0],[450,450],[0,450]]};
function lights(room){
 const scene=new T.Scene(),sun=new T.DirectionalLight(),key=new T.RectAreaLight(),fill=new T.RectAreaLight(),rim=new T.RectAreaLight(),hemisphere=new T.HemisphereLight();
 sun.shadow.mapSize.set(2048,2048);scene.add(room.root,sun,sun.target,key,fill,rim,hemisphere);
 const rig=createDaylightRig(scene,{sun,key,fill,rim,hemisphere});
 return {scene,sun,key,rig,update:(items,mode='day',profile={id:'balanced',shadow:2048})=>rig.update({room,items,mode,profile,color})};
}

for(const app of ['studio-one','randal-general'])test(app+': a real window admits sunlight through its opening onto shadow-receiving tiles',async()=>{
 const [{makeRoom},{Composition},adapter]=await Promise.all([import('../../'+app+'/src/room.js'),import('../../'+app+'/src/composition.js'),import('../../'+app+'/src/daylight.js')]);
 assert.equal(adapter.createDaylightRig,createDaylightRig,'The two applications use the same daylight implementation');
 const room=makeRoom(config,0),composition=new Composition(room);
 const settings={width:120,height:120,color:'white'};
 const {item,error}=composition.add('window',makeOpening('window',settings),settings,{wall:3,u:150,height:90});assert(!error,error);
 const {sun,rig,update}=lights(room);update(composition.items);
 room.root.updateMatrixWorld(true);item.root.updateMatrixWorld(true);
 assert.equal(rig.physicalDaylight,true);assert.equal(rig.diagnostics().skyPortals,1);
 assert.equal(room.floor.tiles.receiveShadow,true);assert.equal(room.floor.grout.receiveShadow,true);
 assert(room.walls.every(w=>w.tiles.receiveShadow&&w.grout.receiveShadow));
 const glass=[];item.root.traverse(o=>{if(o.material?.userData?.architecturalGlass)glass.push(o);});
 assert(glass.length>0);assert(glass.every(o=>!o.castShadow));
 const ray=new T.Raycaster(sun.position,sun.target.position.clone().sub(sun.position).normalize(),0,20);
 assert(!ray.intersectObjects(room.walls.map(w=>w.backing)).some(h=>h.distance<sun.position.distanceTo(sun.target.position)+.1),'Solid backing must not cover the window');
 const spot=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
 assert(spot&&spot.x>room.bounds.min.x&&spot.x<room.bounds.max.x&&spot.z>room.bounds.min.z&&spot.z<room.bounds.max.z,'Sun beam reaches the room floor');
 const stable=rig.diagnostics();update([...composition.items,{id:'cabinet-test',type:'cabinet',settings:{width:80},placement:{wall:0,u:200,height:28}}]);assert.deepEqual(rig.diagnostics(),stable,'Furniture selection and position do not redirect sunlight');
 assert(!composition.move(item.id,{...item.placement,u:250,height:105}).error);update(composition.items);
 assert.notDeepEqual(rig.diagnostics().sunTarget,stable.sunTarget,'Moving the window moves its sunlight');
 const moved=rig.diagnostics();item.settings.width=160;item.settings.height=100;update(composition.items);
 assert.notDeepEqual(rig.diagnostics().sunTarget,moved.sunTarget);assert.equal(rig.diagnostics().skyPortals,1,'Changing a window reuses its light instead of accumulating portals');
 update(composition.items,'day',{id:'fluid',shadow:0});assert.equal(sun.intensity,0,'Fluid mode uses diffuse window light without unoccluded exterior sunlight');
 update(composition.items,'day',{id:'max',shadow:4096});assert(sun.intensity>0,'HD/high quality restores the projected window beam');
 update(composition.items,'warm');assert.equal(rig.physicalDaylight,false);
 update([]);assert.equal(rig.physicalDaylight,false);assert.equal(rig.diagnostics().skyPortals,0);assert.equal(rig.diagnostics().primaryWindow,null);
 room.dispose();
});

test('shadow captures use structural occluders and restore cutaway state after interrupted rendering',async()=>{
 const {makeRoom}=await import('../../studio-one/src/room.js'),room=makeRoom(config,0);
 const window={type:'window',root:new T.Group()},door={type:'door',root:new T.Group()};window.root.visible=false;door.root.visible=false;
 room.walls[0].group.visible=false;room.walls[1].backing.castShadow=false;
 const check=()=>{assert(room.walls.every(w=>w.group.visible&&w.backing.castShadow&&!w.tiles.castShadow));assert.equal(room.shadowCeiling.visible,true);assert.equal(window.root.visible,true);assert.equal(door.root.visible,true);};
 assert.throws(()=>captureRoomShadows({room,items:[window,door],daylight:true},()=>{check();throw Error('interrupted GPU capture');}),/interrupted/);
 assert.equal(room.walls[0].group.visible,false);assert.equal(room.walls[1].backing.castShadow,false);assert.equal(room.shadowCeiling.visible,false);assert.equal(window.root.visible,false);assert.equal(door.root.visible,false);
 captureRoomShadows({room,items:[],daylight:false},()=>assert(room.walls.filter(w=>w.partition===undefined).every(w=>!w.backing.castShadow),'A windowless room has no arbitrary exterior sun shadow'));
 room.dispose();
});

test('shadow frustum is refitted after quality map resizing and contains a large room',async()=>{
 const {makeRoom}=await import('../../studio-one/src/room.js'),room=makeRoom({height:300,points:[[0,0],[900,0],[900,700],[0,700]]},0),{sun,update}=lights(room);
 update([]);sun.shadow.mapSize.set(512,512);update([]);
 const normalBias=sun.shadow.normalBias;sun.shadow.mapSize.set(4096,4096);update([]);
 assert(sun.shadow.normalBias<normalBias,'A new map size must recompute texel-scale bias even with an unchanged quality ID');
 for(const x of [room.bounds.min.x,room.bounds.max.x])for(const y of [0,room.height])for(const z of [room.bounds.min.z,room.bounds.max.z]){
  const p=new T.Vector3(x,y,z).applyMatrix4(sun.shadow.camera.matrixWorldInverse).applyMatrix4(sun.shadow.camera.projectionMatrix);
  assert(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))<=1.001);
 }
 room.dispose();
});
