import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom} from '../../shared/lrf-3d/room.js';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {tileKeysForSelection,tileKeyForHit} from '../../shared/lrf-3d/tile-selection.js';

const fixture=()=>{
 const room=makeRoom({height:260,points:[[0,0],[450,0],[450,450],[0,450]]},0),surface=room.walls[0];
 const scene=new T.Scene();scene.add(room.root);const camera=new T.PerspectiveCamera(45,1,.01,100);
 camera.position.set(0,1.3,3);camera.lookAt(0,1.3,-.23);camera.updateMatrixWorld(true);
 const pick=(x,y)=>pickSelection(scene,camera,new T.Vector3(x-2.25,y,-.23).project(camera));
 return {room,surface,scene,camera,pick};
};

test('single, row and column selection follows physical axes in both tile directions',()=>{
 const {room,surface}=fixture();
 try{for(const direction of ['horizontal','vertical']){
  surface.setLayout({width:1.2,height:.6,direction});
  const cells=surface.tiles.geometry.userData.cells,key=cells.find(c=>c.center[0]>1&&c.center[0]<3&&c.center[1]>1&&c.center[1]<2).key;
  assert.deepEqual(tileKeysForSelection(surface,key,'single'),[key]);
  for(const [mode,axis] of [['horizontal',1],['vertical',0]]){
   const keys=tileKeysForSelection(surface,key,mode),selected=cells.filter(c=>keys.includes(c.key));
   assert(selected.length>1,mode+' has multiple tiles');
   assert.equal(new Set(selected.map(c=>Math.round(c.center[axis]*1e6))).size,1,mode+' keeps the physical '+(axis?'height':'column'));
  }
  assert.deepEqual(tileKeysForSelection(surface,'missing','horizontal'),[]);
 }}finally{room.dispose();}
});

test('real tile faces and grout joints select a tile, including rotated wall layouts',()=>{
 const {room,surface,pick}=fixture();
 try{for(const direction of ['horizontal','vertical']){
  surface.setLayout({width:1.2,height:.6,direction,groutWidth:3});
  for(const [x,y] of [[1.1,1.3],[1.2,1.3],[1.1998,1.3]]){
   const hit=pick(x,y);assert.equal(hit.editTarget,'wall:0');
   const key=tileKeyForHit(surface,hit);assert(key,'joint at '+x+' selects a nearby existing tile');
   assert(surface.tiles.geometry.userData.cells.some(c=>c.key===key));
  }
 }}finally{room.dispose();}
});

test('grout fallback respects opening cuts and does not select through foreground objects',()=>{
 const {room,surface,scene,pick}=fixture();
 try{
  surface.openings=[{left:.8,right:1.8,bottom:0,top:2.1}];surface.openingSignature=null;surface.recut();
  const opening=pick(1.2,1.3);assert.notEqual(opening?.editTarget,'wall:0');assert.equal(tileKeyForHit(surface,opening),null);
  const blocker=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial());blocker.position.set(.15,1.3,.2);blocker.userData.itemId='foreground';scene.add(blocker);
  const hit=pick(2.4,1.3);assert.equal(hit.itemId,'foreground');assert.equal(tileKeyForHit(surface,hit),null);
  assert.equal(tileKeyForHit(surface,{object:surface.backing,point:new T.Vector3(0,1.3,-.23)}),null);
 }finally{room.dispose();}
});
