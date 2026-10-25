import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {makeRoom,DEFAULT_ROOM,cloneRoom} from '../../shared/lrf-3d/room.js';
import {floorWallAlignment} from '../../shared/lrf-3d/floor-wall-alignment.js';

const format={id:'60x120',width:1.2,height:.6};
const layout={...format,shape:'rectangle',direction:'horizontal',pattern:'straight',groutWidth:2,x:17,y:-36};
function request(room,wallIndex=0,patch={}){
 return {floorLayout:{...layout,x:137,y:-163},wallLayout:{...layout},floorFormat:format,wallFormat:format,floorGroup:room.floor.group,wallGroup:room.walls[wallIndex].group,...patch};
}
function assertSharedJoints(input,result){
 assert.equal(result.allowed,true,result.reason);
 const origin=result.layout[result.axis]/100*(result.axis==='y'&&result.layout.planAxes?-1:1);
 for(let n=-4;n<=5;n++){
  const seam=input.floorGroup.worldToLocal(input.wallGroup.localToWorld(new Vector3(input.wallLayout.x/100+n*result.pitch,0,0)));
  const module=(seam[result.axis]-origin)/result.pitch;
  assert.ok(Math.abs(module-Math.round(module))<1e-7,'Every wall joint projects onto a floor joint');
 }
}

test('floor joints follow either parallel wall without altering the perpendicular phase or wall layout',()=>{
 const room=makeRoom(cloneRoom(DEFAULT_ROOM),0);
 try{for(const index of [0,2]){
  const input=request(room,index),before=structuredClone(input.wallLayout),result=floorWallAlignment(input);
  assertSharedJoints(input,result);assert.equal(result.axis,'x');assert.equal(result.layout.y,input.floorLayout.y);assert.deepEqual(input.wallLayout,before);
  assert.ok(Math.abs(result.layout.x-input.floorLayout.x)<=format.width*50+.0001,'Use the nearest equivalent origin');
 }}finally{room.dispose();}
});

test('perpendicular and opposite walls require the matching floor direction and support imported plan axes',()=>{
 const room=makeRoom(cloneRoom(DEFAULT_ROOM),0);
 try{for(const index of [1,3])for(const planAxes of [false,true]){
  const incompatible=request(room,index);assert.equal(floorWallAlignment(incompatible).allowed,false);
  const input=request(room,index,{floorLayout:{...layout,direction:'vertical',planAxes,x:137,y:-163}}),result=floorWallAlignment(input);
  assertSharedJoints(input,result);assert.equal(result.axis,'y');assert.equal(result.layout.x,input.floorLayout.x);
 }}finally{room.dispose();}
});

test('partition faces use their actual position and direction instead of a boundary-wall index assumption',()=>{
 const config={...cloneRoom(DEFAULT_ROOM),partitions:[{id:'alignment-wall',a:[100,180],b:[340,180],thickness:10,height:260}]},room=makeRoom(config,0);
 try{for(const index of [4,5]){const input=request(room,index),result=floorWallAlignment(input);assertSharedJoints(input,result);}}finally{room.dispose();}
});

test('different formats, staggered or opus grids, different grout, paint and oblique walls remain explicitly unavailable',()=>{
 const room=makeRoom(cloneRoom(DEFAULT_ROOM),0),input=request(room);
 try{
  for(const patch of [
   {wallFormat:{id:'60x60',width:.6,height:.6}},
   {floorLayout:{...layout,pattern:'opus'}},
   {wallLayout:{...layout,pattern:'offset'}},
   {floorLayout:{...layout,shape:'hexagon'}},
   {wallLayout:{...layout,groutWidth:3}},
   {wallTiled:false},
   {wallFormat:null}
  ]){const result=floorWallAlignment({...input,...patch});assert.equal(result.allowed,false);assert.ok(result.reason.length>12);assert.equal(result.layout,undefined);}
  const rotation=room.walls[0].group.rotation.y;room.walls[0].group.rotation.y=Math.PI/4;
  assert.match(floorWallAlignment(input).reason,/en biais/);room.walls[0].group.rotation.y=rotation;
 }finally{room.dispose();}
});
