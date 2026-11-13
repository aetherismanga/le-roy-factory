import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {keepInUnreal,physicalLighting,applyUnrealSurface,unrealSurfaceParams} from '../shared/lrf-3d/unreal-photoreal.js';
import {captureUnrealState,sceneChanges,unrealLights} from '../shared/lrf-3d/unreal-sync.js';
import {createUnrealScene} from '../shared/lrf-3d/unreal-scene.js';
import {makeRoom,roomPreset,inside} from '../shared/lrf-3d/room.js';

test('camera cutaway retains real walls but never inactive paint or tile variants',()=>{
 const scene=new T.Scene(),wall=new T.Group();wall.userData.wallIndex=0;wall.visible=false;scene.add(wall);
 const tile=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial()),paint=tile.clone();paint.visible=false;wall.add(tile,paint);
 assert.equal(keepInUnreal(tile),true);assert.equal(keepInUnreal(paint),false);
 const copy=createUnrealScene(scene);assert.equal(copy.scene.children.length,1);assert.equal(copy.noShadow.length,0);copy.dispose();
 assert.equal(wall.visible,false);assert.equal(paint.visible,false);
});
test('hidden ceiling contributes to Unreal without being exposed in the native scene',()=>{
 const scene=new T.Scene(),ceiling=new T.Mesh(new T.PlaneGeometry(3,3),new T.MeshBasicMaterial());ceiling.name='Plafond_occlusion_lumiere';ceiling.visible=false;scene.add(ceiling);
 const copy=createUnrealScene(scene);assert.equal(copy.scene.children.length,1);assert.equal(copy.cutaway.length,1);assert.equal(ceiling.visible,false);assert.equal(copy.scene.children[0].material.emissive.getHex(),0);copy.dispose();
});
test('real manufacturer colours and original maps survive surface export',()=>{
 const map=new T.DataTexture(new Uint8Array([25,50,75,255]),1,1),m=new T.MeshPhysicalMaterial({color:'#897563',roughness:.82,map}),mesh=new T.Mesh(new T.PlaneGeometry(),m);mesh.name='Carreaux_test';
 const before=m.toJSON(),out=m.clone();applyUnrealSurface(out,m,mesh);assert.deepEqual(m.toJSON(),before);assert.equal(out.map,map);assert.deepEqual(out.color.toArray(),m.color.toArray());assert(out.normalMap);assert(out.roughness>.65&&out.roughness<.82);assert.equal(out.emissiveIntensity,1);
});
test('glass keeps Fresnel reflection and no duplicate alpha attenuation',()=>{
 const m=new T.MeshPhysicalMaterial({transmission:.86,opacity:.18,transparent:true,roughness:.028}),o=new T.Mesh(new T.BoxGeometry(),m),out=m.clone();applyUnrealSurface(out,m,o);
 assert.equal(out.opacity,1);assert.equal(out.transmission,1);assert.equal(m.opacity,.18);assert.equal(m.transmission,.86);
});
test('three ambiences are different and never depend on camera position',()=>{
 const lights=[{id:'key',kind:'rect',position:[0,3,2],direction:[0,-1,0],up:[0,1,0],color:[1,1,1],intensity:1},{id:'sun',kind:'directional',position:[0,6,-6],direction:[0,-1,1],color:[1,1,1],intensity:2},{name:'Lumiere_diffuse_fenetre',kind:'rect',position:[1,1,-.2],direction:[0,0,1],color:[1,1,1],intensity:2}];
 const settings={roles:{key:'key',sun:'sun'},bounds:[[-2,0,-.23],[2,2.6,4]],brightness:120,temperature:5500};
 const outputs=['day','warm','showroom'].map(preset=>physicalLighting(lights,{...settings,preset}));assert.notDeepEqual(outputs[0],outputs[1]);assert.notDeepEqual(outputs[0],outputs[2]);assert.equal(outputs[1].lights[1].intensity,0);assert.equal(outputs[0].lighting.brightness,120);assert.equal(outputs[0].lights[0].position[1],2.52);assert.deepEqual(outputs[0].lights[0].direction,[0,-1,0]);assert.equal(lights[0].position[1],3);
 const noWindow=physicalLighting(lights.slice(0,2),{...settings,preset:'day'});assert.equal(noWindow.lights[1].intensity,0);
});
test('brightness change uses a lightweight update, not another geometry import',()=>{
 const scene=new T.Scene();scene.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));const a=captureUnrealState(scene,{brightness:100}),b=captureUnrealState(scene,{brightness:150});
 assert.equal(a.signature,b.signature);assert.equal(sceneChanges(a,b).replace.size,0);assert.notDeepEqual(a.lighting,b.lighting);
});
test('real room cutaways retain physical walls; open exhibition boxes do not acquire walls or a ceiling',()=>{
 const room=makeRoom({height:260,points:[[0,0],[450,0],[450,450],[0,450]]},0),scene=new T.Scene();scene.add(room.root);
 room.updateCutaway(new T.Vector3(0,3,-3));
 captureUnrealState(scene,{room});const before=createUnrealScene(scene);assert(before.stats.meshes>0);assert(keepInUnreal(room.walls[0].tiles));
 const native=room.floor.grout.geometry.attributes.position.array.slice(),mesh=before.scene.children.find(m=>m.name.startsWith('LRF_'+room.floor.grout.uuid.replaceAll('-','')));mesh.geometry.computeBoundingBox();assert(mesh.geometry.boundingBox.min.z<-.03);assert(Math.abs(mesh.geometry.boundingBox.max.z)<1e-7);assert.deepEqual(room.floor.grout.geometry.attributes.position.array,native);before.dispose();
 const inside=captureUnrealState(scene,{room});room.updateCutaway(new T.Vector3(3,3,3));assert.equal(captureUnrealState(scene,{room}).signature,inside.signature);
 room.walls[0].expoEnabled=false;captureUnrealState(scene,{room});assert.equal(keepInUnreal(room.walls[0].tiles),false);assert.equal(keepInUnreal(room.shadowCeiling),false);room.dispose();
});
test('round LED mirrors export a circular source without altering their native area light',()=>{
 const scene=new T.Scene(),mirror=new T.Group(),rig=new T.Group(),backing=new T.Mesh(new T.CircleGeometry(.3),new T.MeshStandardMaterial());backing.name='Cadre_metal_noir';
 const back=new T.RectAreaLight(0xffffff,6,.516,.516);back.name='Retro_eclairage';rig.add(back);mirror.add(rig,backing);scene.add(mirror);scene.updateMatrixWorld(true);
 const raw=unrealLights(scene);assert.equal(raw[0].sourceShape,'round');assert.equal(back.userData.sourceShape,undefined);assert.equal(back.intensity,6);
 const out=physicalLighting(raw,{preset:'day'});assert.equal(out.lights[0].sourceShape,'round');
});
test('ceiling panels stay inside L, chamfer, narrow plans and outside partition footprints',()=>{
 const configs=[roomPreset('l'),roomPreset('chamfer'),roomPreset('rect',180,650),{...roomPreset('l',600,550),partitions:[{id:'qa',a:[150,30],b:[150,240],thickness:12,height:260}]}];
 for(const config of configs){
  const room=makeRoom(config,0),raw=['key','fill','rim'].map(id=>({id,kind:'rect',position:[0,3,0],direction:[0,-1,0],color:[1,1,1],intensity:1,width:3,height:2}));
  const settings={room,roles:{key:'key',fill:'fill',rim:'rim'},bounds:[room.bounds.min.toArray(),room.bounds.max.toArray()]};
  const before=JSON.stringify(raw),out=physicalLighting(raw,settings);
  for(const light of out.lights){assert(light.intensity>0);for(const dx of [-.5,.5])for(const dz of [-.5,.5]){const point=[light.position[0]+light.width*dx,light.position[2]+light.height*dz+.23];assert(inside(point,room.points),'source outside polygon');assert(!room.partitions.some(p=>inside(point,p.corners)),'source inside partition');}}
  assert.equal(JSON.stringify(raw),before);assert.deepEqual(physicalLighting(raw,settings),out);room.dispose();
 }
});
