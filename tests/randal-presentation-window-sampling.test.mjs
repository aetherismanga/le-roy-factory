import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRandalPresentationScene} from '../shared/lrf-3d/randal-presentation-scene.js';
import {createPathTracingScene} from '../shared/lrf-3d/randal-presentation-path-scene.js';

test('window apertures remain wholly inside the room and have one sampled photo emitter each',()=>{
 const scene=new T.Scene(),floor=new T.Mesh(),wall=new T.Mesh();scene.add(floor,wall);
 const presentation=createRandalPresentationScene({scene,floor,wall,renderer:{capabilities:{getMaxAnisotropy:()=>8}},getItems:()=>[],invalidate(){}});
 let snapshot;
 try{
  scene.updateMatrixWorld(true);
  const enclosure=scene.getObjectByName('Présentation · environnement');
  const panels=enclosure.children.filter(o=>o.name==='Présentation_fenêtre_raster');
  const lights=enclosure.children.filter(o=>o.name==='Présentation_fenêtre_lumineuse');
  assert.equal(panels.length,2);assert.equal(lights.length,2);
  for(const light of lights){
   // With a tilted light half the rectangle crossed z=10 into the opaque
   // back wall, wasting samples. Every corner must be in front of it.
   for(const x of [-light.width/2,light.width/2])for(const y of [-light.height/2,light.height/2]){
    const corner=new T.Vector3(x,y,0).applyMatrix4(light.matrixWorld);
    assert.ok(Math.abs(corner.z-9.98)<1e-9);assert.ok(corner.z<10);
   }
   const inward=new T.Vector3(0,0,-1).transformDirection(light.matrixWorld);assert.ok(inward.z<-.99);
  }
  assert(panels.every(p=>p.visible&&p.material.emissiveIntensity===3&&p.userData.presentationRasterOnly));
  snapshot=createPathTracingScene(scene);
  assert.equal(snapshot.stats.lights,2);
  assert.equal(snapshot.scene.children.filter(o=>o.name==='Présentation_fenêtre_lumineuse').length,2);
  assert.equal(snapshot.scene.getObjectByName('Présentation_fenêtre_raster'),undefined);
  assert(panels.every(p=>p.parent===enclosure&&p.visible),'photo cloning does not change raster mirror apertures');
 }finally{snapshot?.dispose();presentation.dispose();}
});
