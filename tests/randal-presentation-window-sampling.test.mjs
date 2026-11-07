import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPresentationReflectionRoom} from '../shared/lrf-3d/randal-presentation-reflection-room.js';
import {createRandalPresentationScene} from '../shared/lrf-3d/randal-presentation-scene.js';
import {setExteriorTexture,makeOpening,OPENING_COLORS} from '../shared/lrf-3d/openings.js';

const panorama=()=>new T.Texture({width:1536,height:1024});
const materials=object=>object.material?Array.isArray(object.material)?object.material:[object.material]:[];

test('the actual white configurator window has glazing, hardware and the existing exterior panorama',async()=>{
 const calls=[],map=panorama();let redraws=0;
 const room=createPresentationReflectionRoom({loadTexture:async(...args)=>{calls.push(args);return map;},invalidate(){redraws++;}});
 try{
  assert.equal(await room.ready(),true);assert.equal(await room.ready(),true);assert.equal(calls.length,1);
  assert.equal(calls[0][0],'assets/exterior/mediterranean-garden.webp');assert.equal(map.colorSpace,T.SRGBColorSpace);
  assert.equal(room.window.frame.color.getHexString(),new T.Color(OPENING_COLORS.find(c=>c.id==='white').hex).getHexString());
  assert(room.root.getObjectByName('Dormant_vertical'));assert(room.root.getObjectByName('Poignee_fenetre'));
  const panes=[];room.window.root.traverse(o=>{if(o.name==='Double_vitrage')panes.push(o);});assert.equal(panes.length,4);assert(panes.every(o=>o.material.userData.architecturalGlass));
  const garden=room.root.getObjectByName('Vue_exterieure_jardin');assert.equal(garden.material.map,map);assert.equal(garden.material.toneMapped,false);assert.equal(room.diagnostics().exteriorReady,true);assert.equal(redraws,1);
  assert.equal(room.root.getObjectByName('Présentation_fenêtre_raster'),undefined,'no white emissive rectangle replaces the landscape');
 }finally{room.dispose();}
});

test('a reflected ray reaches the landscape through a real rear-wall opening at the default presentation angle',async()=>{
 const room=createPresentationReflectionRoom({loadTexture:async()=>panorama()});
 try{
  await room.ready();room.root.updateMatrixWorld(true);
  const camera=new T.Vector3(.75,1.8,3),mirrorPoint=new T.Vector3(.1,1.8,.009),direction=mirrorPoint.clone().sub(camera).normalize().reflect(new T.Vector3(0,0,1));
  const raycaster=new T.Raycaster(mirrorPoint,direction),rear=room.wallSurfaces[0];
  assert.equal(raycaster.intersectObject(rear.group,true).length,0,'neither paint nor grout obstructs the opening');
  const garden=room.root.getObjectByName('Vue_exterieure_jardin'),probe=new T.Mesh(garden.geometry,garden.material);probe.matrixWorld.copy(garden.matrixWorld);probe.matrixAutoUpdate=false;
  assert.equal(raycaster.intersectObject(probe).length,1,'the ordinary reflection direction reaches the actual panorama plane');
  const solidRay=new T.Raycaster(new T.Vector3(0,4,0),new T.Vector3(0,0,1));assert(solidRay.intersectObject(rear.group,true).length>0,'rear wall still encloses the rest of the room');
  for(const light of room.root.children.filter(o=>o.isRectAreaLight))for(const x of [-light.width/2,light.width/2])for(const y of [-light.height/2,light.height/2])assert.ok(new T.Vector3(x,y,0).applyMatrix4(light.matrixWorld).z<10,'all light corners stay in front of the wall');
 }finally{room.dispose();}
});

test('selected paint and real manufacturer maps continue onto the reflected bathroom walls',async()=>{
 const scene=new T.Scene(),floor=new T.Mesh(),wall=new T.Mesh();scene.add(floor,wall);
 const presentation=createRandalPresentationScene({scene,floor,wall,getItems:()=>[],renderer:{capabilities:{getMaxAnisotropy:()=>8}},invalidate(){},loadTexture:async()=>panorama(),loadExteriorTexture:async()=>panorama()});
 try{
  await presentation.setSurface('wall','paint-sage');
  const front=scene.getObjectByName('Présentation_wall'),rear=scene.getObjectByName('Présentation_mur_reflet');
  assert.equal(front.children[2].visible,true);assert.equal(rear.children[2].visible,true);assert.equal(rear.children[2].material.color.getHex(),front.children[2].material.color.getHex());
  await presentation.setSurface('wall','stone-icon-leccese');
  const sourceMaps=new Set(materials(front.children[0]).map(m=>m.map)),rearMaps=new Set(materials(rear.children[0]).map(m=>m.map));
  assert.equal(rearMaps.size,4);assert.deepEqual(rearMaps,sourceMaps,'rear and front use the same four genuine tile faces');
  assert.equal(rear.children[2].visible,false);assert.equal(rear.children[0].visible,true);
 }finally{presentation.dispose();presentation.dispose();}
});

test('fullscreen disposal owns only its new panorama and releases every geometry/material once',async()=>{
 const shared=panorama();let sharedDisposals=0;shared.addEventListener('dispose',()=>sharedDisposals++);setExteriorTexture(shared);
 const own=panorama();let ownDisposals=0;own.addEventListener('dispose',()=>ownDisposals++);
 const room=createPresentationReflectionRoom({loadTexture:async()=>own});await room.ready();
 const geometries=new Set(),mats=new Set();room.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);materials(o).forEach(m=>mats.add(m));});
 let geometryDisposals=0,materialDisposals=0;geometries.forEach(g=>g.addEventListener('dispose',()=>geometryDisposals++));mats.forEach(m=>m.addEventListener('dispose',()=>materialDisposals++));
 room.dispose();room.dispose();assert.equal(ownDisposals,1);assert.equal(sharedDisposals,0);assert.equal(geometryDisposals,geometries.size);assert.equal(materialDisposals,mats.size);
 const ordinary=makeOpening('window');assert.equal(ordinary.root.getObjectByName('Vue_exterieure_jardin').material.map,shared,'the normal configurator registry was never replaced');
 const ordinaryGeometries=new Set(),ordinaryMaterials=new Set();ordinary.root.traverse(o=>{if(o.geometry)ordinaryGeometries.add(o.geometry);materials(o).forEach(m=>ordinaryMaterials.add(m));});ordinaryGeometries.forEach(g=>g.dispose());ordinaryMaterials.forEach(m=>m.dispose());setExteriorTexture(null);shared.dispose();
});

test('closing before the exterior arrives disposes it without a late mirror redraw',async()=>{
 let resolve,signal,redraws=0;const texture=panorama();let disposals=0;texture.addEventListener('dispose',()=>disposals++);
 const room=createPresentationReflectionRoom({loadTexture:(_url,options)=>{signal=options.signal;return new Promise(r=>resolve=r);},invalidate(){redraws++;}}),pending=room.ready();await Promise.resolve();room.dispose();resolve(texture);
 assert.equal(signal.aborted,true);assert.equal(await pending,false);assert.equal(disposals,1);assert.equal(redraws,0);assert.equal(room.diagnostics().exteriorReady,false);
});
