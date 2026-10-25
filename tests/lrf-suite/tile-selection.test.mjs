import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import {makeRoom} from '../../shared/lrf-3d/room.js';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {tileKeysForSelection,tileKeyForHit,tileColorMatchesLayout} from '../../shared/lrf-3d/tile-selection.js';
import {applyTileColors} from '../../shared/lrf-3d/tile-colors.js';

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

test('both shipped tile controllers reject a 30×30 Dynasty decor on a 60×120 wall without changing its SKU or geometry',()=>{
 for(const app of ['studio-one','randal-general']){
  const {room,surface}=fixture();
  try{
   surface.setLayout({width:1.2,height:.6});
   const finish={collection:'Dynasty',color:'bianco-aurora',format:'60x120',catalogueKey:'audit-base-SKU',reference:'audit-reference',finish:'3D Honed'},before=JSON.stringify(finish),geometry=surface.tiles.geometry;
   const selectedTile={wall:0,key:geometry.userData.cells[0].key,keys:[geometry.userData.cells[0].key]};
   let applied=0,status='';
   const source=readFileSync(new URL('../../'+app+'/src/app.js',import.meta.url),'utf8').match(/^function setIndividualTile\(color\)\{.*\}$/m)[0];
   const context=vm.createContext({selectedTile,selectedWall:0,state:{wallCollection:'Dynasty'},roomScene:{walls:[surface]},wallFinishes:[finish],tileColorMatchesLayout,placementStatus:message=>{status=message;},applyWallTileColors:()=>applied++,refreshInspector(){},refreshQuantities(){},invalidate(){},scheduleProjectCheckpoint(){}});
   vm.runInContext(source,context);
   assert.equal(vm.runInContext("setIndividualTile('crown-green')",context),false,app+' rejects incompatible decor');
   assert.equal(applied,0);assert.match(status,/format/);assert.equal(JSON.stringify(finish),before);assert.equal(surface.tiles.geometry,geometry);
   assert.equal(tileColorMatchesLayout('Dynasty','crown-green',surface.layout),false);
   assert.equal(tileColorMatchesLayout('Dynasty','missing-colour',surface.layout),false);
  }finally{room.dispose();}
 }
});

test('compatible Dynasty panel colours retain 30×30 cells and continuous 2×2 phase for every scope and direction',()=>{
 const distance=(a,b)=>Math.abs(a-b-Math.round(a-b));
 for(const app of ['studio-one','randal-general'])for(const direction of ['horizontal','vertical'])for(const mode of ['single','horizontal','vertical']){
  const {room,surface}=fixture();
  try{
   surface.setLayout({width:.3,height:.3,direction,x:-13,y:21});
   const geometry=surface.tiles.geometry,key=geometry.userData.cells.find(cell=>cell.area>.08).key,keys=tileKeysForSelection(surface,key,mode),finish={collection:'Dynasty',color:'crown-green',format:'30x30',reference:'04N3D01',catalogueKey:'ELIOS|04N3D01',finish:'3D Honed'};
   const identity=JSON.stringify(finish),layout=JSON.stringify(surface.layout);
   const source=readFileSync(new URL('../../'+app+'/src/app.js',import.meta.url),'utf8').match(/^function setIndividualTile\(color\)\{.*\}$/m)[0];
   const context=vm.createContext({selectedTile:{wall:0,key,keys},selectedWall:0,state:{wallCollection:'Dynasty'},roomScene:{walls:[surface]},wallFinishes:[finish],tileColorMatchesLayout,placementStatus(){},applyWallTileColors:()=>applyTileColors(surface,finish,()=>new T.MeshPhysicalMaterial()),refreshInspector(){},refreshQuantities(){},invalidate(){},scheduleProjectCheckpoint(){}});
   vm.runInContext(source,context);
   assert.equal(vm.runInContext("setIndividualTile('imperial-black')",context),true,app+' accepts compatible '+mode);
   assert(keys.every(key=>finish.tiles[key]==='imperial-black'));
   assert.equal(surface.tiles.geometry,geometry);assert.equal(JSON.stringify(surface.layout),layout);
   const {tiles,...unchanged}=finish;assert.equal(JSON.stringify(unchanged),identity,'The base reference and finish remain unchanged');
   const {position,normal,uv}=geometry.attributes;
   for(let i=0;i<position.count;i++)if(normal.getZ(i)>.99){
    const x=position.getX(i),y=position.getY(i),local=direction==='vertical'?[y-surface.layout.y/100,-x+surface.layout.x/100]:[x-surface.layout.x/100,y-surface.layout.y/100];
    assert(distance(uv.getX(i),local[0]/.6)<2e-6);assert(distance(uv.getY(i),local[1]/.6)<2e-6);
   }
  }finally{room.dispose();}
 }
});
