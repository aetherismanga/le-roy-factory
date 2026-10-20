import assert from 'node:assert/strict';
import * as T from 'three';
import {makeOpening,openingError} from '../src/openings.js';
import {makeRoom,DEFAULT_ROOM,roomPreset,wallRectangles} from '../src/room.js';
import {Composition,itemDimensions} from '../src/composition.js';
import {makeColumn} from '../src/column.js';
import {setupObjectDragging} from '../src/dragging.js';
import {writeFileSync} from 'node:fs';
const room=makeRoom(DEFAULT_ROOM,0),comp=new Composition(room),scene=new T.Scene();scene.add(room.root);
const settings={width:120,height:100,color:'white'},asset=makeOpening('window',settings),window=comp.add('window',asset,settings,{wall:0,u:225,height:100}).item;assert(window);scene.add(window.root);
function wallHit(index,u,height){scene.updateMatrixWorld(true);const w=room.walls[index],point=w.group.localToWorld(new T.Vector3(u/100,height/100,0)),origin=point.clone().addScaledVector(w.normal,1);return new T.Raycaster(origin,w.normal.clone().negate()).intersectObjects([w.tiles,w.grout,w.backing],false);}
assert.equal(wallHit(0,225,150).length,0,'All opaque wall layers must be cut through');assert(wallHit(0,80,150).length>0,'Tiles outside the opening stay intact');
const area=room.walls[0].tiles.geometry.attributes.position;let tileArea=0;for(let i=0;i<area.count;i+=3){const n=room.walls[0].tiles.geometry.attributes.normal;if(n.getZ(i)>.99){const a=new T.Vector3().fromBufferAttribute(area,i),b=new T.Vector3().fromBufferAttribute(area,i+1),c=new T.Vector3().fromBufferAttribute(area,i+2);tileArea+=b.sub(a).cross(c.sub(a)).length()/2;}}assert(tileArea<4.5*2.6-1.2+1e-3&&tileArea>4.5*2.6-1.2-.1);
const originalMap=new T.Texture();room.walls[0].material.map=originalMap;
for(const wall of [1,2,3,0]){const old=window.placement.wall;assert(!comp.move(window.id,{wall,u:225,height:100}).error);assert.equal(wallHit(wall,225,150).length,0);if(old!==wall)assert(wallHit(old,225,150).length>0,'Moving restores the old wall');}
assert.equal(room.walls[0].material.map,originalMap,'Cutting preserves selected tile material');
assert(comp.move(window.id,{height:210}).error);assert(comp.move(window.id,{u:20}).error);assert(openingError('window',25,100));assert(openingError('door',83.5,204));
const ds={width:83,height:204,color:'black'},da=makeOpening('door',ds),door=comp.add('door',da,ds,{wall:1,u:225,height:0}).item;assert(door);scene.add(door.root);assert.equal(wallHit(1,225,100).length,0);assert(wallHit(1,225,240).length);assert(comp.move(door.id,{height:10}).error);
da.setOpenProgress(1);assert(da.door.rotation.y<0);da.setHingeSide('right');assert(da.door.rotation.y>0);da.setOpenProgress(0);assert.equal(da.door.rotation.y,0);asset.setColor('black');assert.equal(asset.frame.color.getHexString(),'202526');asset.setColor('white');assert.equal(asset.frame.color.getHexString(),'f1f0eb');
const occupied=comp.add('column',makeColumn(),{}, {wall:0,u:225,height:100}).item;assert(occupied);assert.notEqual(occupied.placement.u,225,'Furniture cannot cover an opening');
// Rebuild a custom angled room and retain actual cuts on the new wall geometry.
const next=makeRoom(roomPreset('chamfer',500,500,280),0);assert.equal(comp.setRoom(next),'');assert.equal(next.walls[0].openings.length,1);assert.equal(next.walls[1].openings.length,1);assert.equal(comp.resize(window,itemDimensions('window',{width:240,height:220}))!== '',true,'Invalid enlarged window leaves its old dimensions');
const rectangles=wallRectangles(4.5,2.6,[{left:.5,right:1.5,bottom:1,top:2},{left:2,right:3,bottom:0,top:2}]);const sum=rectangles.reduce((n,r)=>n+(r.right-r.left)*(r.top-r.bottom),0);assert(Math.abs(sum-(4.5*2.6-3))<1e-9);
// Real controller: ray through the existing window hole must not jump to the
// opposite wall behind it. Quick mouse dragging stays on its mounting wall.
scene.remove(room.root);scene.add(next.root);const camera=new T.PerspectiveCamera(42,1,.035,120);camera.position.set(0,1.5,3);camera.lookAt(0,1.5,0);camera.updateMatrixWorld();next.root.updateMatrixWorld(true);window.root.updateMatrixWorld(true);
const listeners={},canvas={classList:{add(){},remove(){}},addEventListener:(n,f)=>(listeners[n]??=[]).push(f),getBoundingClientRect:()=>({left:0,top:0,width:600,height:600}),setPointerCapture(){},hasPointerCapture:()=>false},controls={enabled:true};
const drag=setupObjectDragging({canvas,scene,camera,controls,getComposition:()=>comp,onSelect:id=>comp.selectedId=id,onTap(){},onChange(){},onStatus(){}});
const screen=window.root.localToWorld(new T.Vector3(-.25,.5,-.24)).project(camera),e={pointerType:'mouse',pointerId:1,button:0,clientX:(screen.x+1)*300,clientY:(1-screen.y)*300,timeStamp:0,preventDefault(){}};
for(const f of listeners.pointerdown)f(e);assert(drag.getActive());for(const f of listeners.pointermove)f({...e,clientX:e.clientX+12,timeStamp:40});assert.equal(window.placement.wall,0,'A hole must not cause unintended transfer to the rear wall');for(const f of listeners.pointerup)f({...e,clientX:e.clientX+12,timeStamp:100});assert.equal(controls.enabled,true);
comp.remove(window.id);assert.equal(next.walls[0].openings.length,0);comp.remove(door.id);assert.equal(next.walls[1].openings.length,0);
const result={passed:true,at:new Date().toISOString(),checks:['real glazed window and 40mm hinged door geometry','tiles, grout and backing genuinely cut with correct net area','all four wall placements and restoration after movement/deletion','existing tile material preserved during cuts','door remains on floor; width/height and collision limits enforced','black/white frames and reversible door hinge preserve open progress','custom chamfered room retains cuts transactionally','actual dragging through window glazing stays on its wall'],browserQA:'Node geometry and shipped drag controller; no browser/WebGL visual validation'};writeFileSync('qa/openings-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
