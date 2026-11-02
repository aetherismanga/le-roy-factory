import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {makeDoorInterior} from '../../shared/lrf-3d/door-interior.js';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {captureRoomShadows} from '../../shared/lrf-3d/daylight.js';
import {disposeObject} from '../../studio-one/src/composition.js';

function hallHits(root,origin,direction){
 root.updateMatrixWorld(true);const ray=new T.Raycaster(origin,direction.normalize()),hits=[];
 root.traverse(object=>{if(!object.isMesh)return;(object.isInstancedMesh?T.InstancedMesh.prototype:T.Mesh.prototype).raycast.call(object,ray,hits);});
 return hits.sort((a,b)=>a.distance-b.distance);
}

test('an opened door reveals a physical interior, while closed doors and cutaway parents keep it hidden',()=>{
 const asset=makeOpening('door',{width:83,height:204,color:'white'});
 try{
  assert.equal(asset.interior.visible,false);assert.equal(asset.interior.parent,asset.root);assert.equal(asset.getOpenProgress(),0);
  asset.setOpenProgress(.2);assert.equal(asset.interior.visible,true);asset.setOpenProgress(1);const fixed=asset.interior.matrix.clone();
  asset.setHingeSide('right');assert.deepEqual(asset.interior.matrix.elements,fixed.elements,'The hall never mirrors or swings with the leaf');
  asset.setInteriorVisible(false);assert.equal(asset.interior.visible,false);asset.setOpenProgress(.5);assert.equal(asset.interior.visible,false);
  asset.setInteriorVisible(true);assert.equal(asset.interior.visible,true);
  asset.root.visible=false;let visible=0;asset.root.traverseVisible(o=>{if(o.isMesh)visible++;});assert.equal(visible,0);
  captureRoomShadows({items:[{type:'door',root:asset.root}]},()=>{let seen=false;asset.root.traverseVisible(o=>{if(o.name==='Mur_fond_hall')seen=true;});assert(seen,'Reflection/shadow capture forcing the opening visible also sees its adjoining room');});
  assert.equal(asset.root.visible,false);asset.setOpenProgress(0);assert.equal(asset.interior.visible,false);
 }finally{disposeObject(asset.root);}
});

test('the doorway has continuous threshold/floor levels, room-scale architecture and grounded interior objects',()=>{
 const asset=makeOpening('door',{width:83,height:204});asset.setOpenProgress(1);
 try{
  const hall=asset.interior,threshold=hall.getObjectByName('Seuil_transition_interieur'),floor=hall.getObjectByName('Sol_continu_passage'),consoleTop=hall.getObjectByName('Plateau_console_hall');
  const bounds=object=>new T.Box3().setFromObject(object);assert(Math.abs(bounds(floor).max.y-.001)<1e-6);assert(Math.abs(bounds(threshold).max.y-.003)<1e-6);
  assert(Math.abs(bounds(consoleTop).max.y-.79)<1e-6);
  for(const name of ['Mur_lateral_hall','Mur_fond_hall','Plafond_hall','Plinthe_hall','Porte_interieure_hall','Poignee_porte_hall','Spot_encastre_hall'])assert(hall.getObjectByName(name),name);
  hall.traverse(object=>{if(object.name==='Pied_console_hall')assert(Math.abs(bounds(object).min.y)<1e-6,'The console stands on the hall floor');});
  const bowl=hall.getObjectByName('Coupe_ceramique_hall');assert(Math.abs(bounds(bowl).min.y-.79)<1e-6,'The ceramic bowl sits on the console');
  const fill=hall.getObjectByName('Lumiere_interieure_hall');assert(fill.position.distanceTo(new T.Vector3(0,1,-.23))>fill.distance,'Local hall fill cannot leak through the bathroom doorway');
  assert.equal(hall.userData.visualOnly,true);assert.equal(hall.userData.excludeFromProductBounds,true);
 }finally{disposeObject(asset.root);}
});

test('the passage meets the first hall slab with only its half-joint and no coplanar overlap band',()=>{
 const asset=makeOpening('door',{width:83,height:204});
 try{
  const hall=asset.interior,passage=new T.Box3().setFromObject(hall.getObjectByName('Sol_continu_passage')),tiles=hall.getObjectByName('Dalles_minerales_hall_60x120');tiles.geometry.computeBoundingBox();
  const matrix=new T.Matrix4(),boxes=[];for(let index=0;index<tiles.count;index++){tiles.getMatrixAt(index,matrix);boxes.push(tiles.geometry.boundingBox.clone().applyMatrix4(matrix));}
  const front=Math.max(...boxes.map(box=>box.max.z));assert(Math.abs(passage.max.z+.22)<1e-7);assert(passage.min.z>=front-1e-7);
  assert(passage.min.z-front<.00076,'Only the 0.75mm half-joint separates the full passage slab and the tiled hall');
  for(const box of boxes){const intersection=passage.clone().intersect(box);if(!intersection.isEmpty()){const size=intersection.getSize(new T.Vector3());assert(size.x<1e-7||size.z<1e-7,'A shared-height passage must not cover any hall tile');}}
 }finally{disposeObject(asset.root);}
});

test('the open passage contains real depth for front and oblique views but backdrop meshes never steal object picking',()=>{
 const asset=makeOpening('door',{width:83,height:204});asset.setOpenProgress(1);
 try{
  for(const x of [-.20,0,.20])for(const y of [.4,1.2,1.7]){
   const hits=hallHits(asset.interior,new T.Vector3(x,y,.4),new T.Vector3(x*.10,0,-1));
   assert(hits.length,'There is a modeled house interior behind every part of the clear passage');assert(hits[0].point.z<-.5);assert(hits[0].object.name.includes('hall'));
  }
  const center=hallHits(asset.interior,new T.Vector3(0,1.15,.4),new T.Vector3(0,0,-1))[0];assert(center.distance>3,'A real back wall/inner door has perspective depth rather than a white plane at the opening');
  assert.equal(new T.Raycaster(new T.Vector3(0,1.2,1),new T.Vector3(0,0,-1)).intersectObject(asset.interior,true).length,0);
 }finally{disposeObject(asset.root);}
});

test('all supported door sizes retain bounded finite, locally owned scenery with no network or billboard dependency',()=>{
 for(const [width,height]of [[60,180],[60,260],[140,180],[140,260],[83,204]]){
  const asset=makeOpening('door',{width,height});asset.setOpenProgress(1);
  try{
   let meshes=0,triangles=0;asset.interior.traverse(object=>{if(!object.isMesh)return;meshes++;const geometry=object.geometry;assert(Array.from(geometry.attributes.position.array).every(Number.isFinite));triangles+=(geometry.index?.count||geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);assert.notEqual(geometry.type,'PlaneGeometry','The hall is physical architecture, not a flat image background');if(object.material.map)assert.fail('No external bitmap is required');});
   assert(meshes<45);assert(triangles<18000);assert(new T.Box3().setFromObject(asset.interior).max.z<-.20,'Hall scenery stays beyond the doorway threshold');
  }finally{disposeObject(asset.root);}
 }
 const a=makeDoorInterior(),b=makeDoorInterior(),mapA=a.root.getObjectByName('Mur_fond_hall').material.bumpMap,mapB=b.root.getObjectByName('Mur_fond_hall').material.bumpMap;assert.notEqual(mapA,mapB);
 let disposedA=0,disposedB=0;mapA.addEventListener('dispose',()=>disposedA++);mapB.addEventListener('dispose',()=>disposedB++);disposeObject(a.root);assert.equal(disposedA,1);assert.equal(disposedB,0);disposeObject(b.root);assert.equal(disposedB,1);
});

for(const app of ['studio-one','randal-general'])test(app+': the adjoining hall does not enlarge commercial dimensions, room bounds or collision footprints',async()=>{
 const {Composition,itemDimensions}=await import('../../'+app+'/src/composition.js'),settings={width:83,height:204,color:'white'},room=makeRoom(DEFAULT_ROOM,0),asset=makeOpening('door',settings),composition=new Composition(room);
 try{
  const roomBounds=room.bounds.clone(),expected={width:.83,height:2.04,depth:.07,base:0};assert.deepEqual(itemDimensions('door',settings),expected);
  const result=composition.add('door',asset,settings,{wall:0,u:200,height:0});assert(result.item,result.error);asset.setOpenProgress(1);
  assert.deepEqual(result.item.dimensions,expected);assert.equal(composition.validate(result.item),'');assert.deepEqual(room.bounds.min.toArray(),roomBounds.min.toArray());assert.deepEqual(room.bounds.max.toArray(),roomBounds.max.toArray());
  assert.equal(composition.move(result.item.id,{wall:1,u:180}).error,undefined);assert.equal(composition.validate(result.item),'');
 }finally{disposeObject(asset.root);room.dispose();}
});

for(const app of ['studio-one','randal-general'])test(app+': internal partition doors show the real adjoining space, including moves, room rebuilds, project recovery and captures',async()=>{
 const {Composition}=await import('../../'+app+'/src/composition.js'),{encodeProject,decodeProject}=await import('../../'+app+'/src/projects.js');
 const config={points:[[0,0],[600,0],[600,600],[0,600]],height:280,partitions:[{id:'inner-hall-wall',a:[200,300],b:[450,300],thickness:10,height:280,fullHeight:true}]},room=makeRoom(config,0),composition=new Composition(room),settings={width:83,height:204,color:'white',doorOpen:true},asset=makeOpening('door',settings);
 let rebuiltRoom;
 try{
  const added=composition.add('door',asset,settings,{wall:0,u:150,height:0});assert(added.item,added.error);const item=added.item;asset.setOpenProgress(1);assert.equal(asset.interior.visible,true);
  for(const wall of room.walls.map((value,index)=>value.partition===undefined?null:index).filter(index=>index!==null)){
   assert.equal(composition.move(item.id,{wall,u:120,height:0}).error,undefined);assert.equal(asset.getOpenProgress(),1);assert.equal(asset.interior.visible,false,'Both faces of a partition already have real room geometry behind them');
   item.root.visible=false;captureRoomShadows({room,items:composition.items},()=>{assert.equal(item.root.visible,true);assert.equal(asset.interior.visible,false,'A capture must not force fictional scenery into an internal doorway');});assert.equal(item.root.visible,false);
  }
  const saved=decodeProject(encodeProject({version:2,room:config,items:composition.snapshot()})),restored=new Composition(room),raw=saved.items[0],restoredAsset=makeOpening('door',raw.settings);
  try{const recovery=restored.add('door',restoredAsset,raw.settings,raw.placement);assert(recovery.item,recovery.error);restoredAsset.setOpenProgress(1);assert.equal(restoredAsset.interior.visible,false);}finally{disposeObject(restoredAsset.root);}
  rebuiltRoom=makeRoom({...config,partitions:[{...config.partitions[0],a:[200,350],b:[450,350]}]},0);assert.equal(composition.setRoom(rebuiltRoom),'');assert.equal(asset.interior.visible,false,'Room topology rebuild reapplies the partition gate');
  item.root.visible=true;assert.equal(composition.move(item.id,{wall:1,u:180,height:0}).error,undefined);assert.equal(asset.interior.visible,true,'Returning to an outer boundary restores the same adjoining hall');
  asset.setOpenProgress(0);assert.equal(asset.interior.visible,false);asset.setOpenProgress(1);assert.equal(asset.interior.visible,true);
 }finally{disposeObject(asset.root);room.dispose();rebuiltRoom?.dispose();}
});
