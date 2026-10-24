import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel} from '../src/model.js';
import {makeRoom,DEFAULT_ROOM,roomPreset} from '../src/room.js';
import {Composition} from '../src/composition.js';
import {setupObjectDragging} from '../src/dragging.js';
import {dimensionSegments,projectDimensions,dimensionMarkup} from '../src/dimensions.js';
import {writeFileSync} from 'node:fs';
const room=makeRoom(DEFAULT_ROOM,0),comp=new Composition(room),scene=new T.Scene();scene.add(room.root);
const add=(u,wall=0)=>{const result=comp.add('cabinet',makeModel({includeMirror:false}),{width:80,top:'sella'},{wall,u,height:28});assert(result.item);scene.add(result.item.root);return result.item;};
const a=add(140),b=add(235),bOriginal={...b.placement};
const camera=new T.PerspectiveCamera(42,1,.035,120);camera.position.set(0,1.1,3.5);camera.lookAt(0,.7,0);camera.updateMatrixWorld();
class Canvas{constructor(){this.listeners={};this.classList={add(){},remove(){}};}addEventListener(n,f){(this.listeners[n]??=[]).push(f);}getBoundingClientRect(){return {left:0,top:0,width:600,height:600};}setPointerCapture(){}hasPointerCapture(){return false;}send(n,e){for(const f of this.listeners[n]||[])f(e);}}
const canvas=new Canvas(),controls={enabled:true},messages=[];let id=0;const timers=new Map();const drag=setupObjectDragging({canvas,scene,camera,controls,getComposition:()=>comp,onSelect:id=>comp.selectedId=id,onTap(){},onChange(){},onStatus:s=>messages.push(s),setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:id=>timers.delete(id)});
const event=(point,type='mouse',pointerId=1,t=0)=>{const p=point.clone().project(camera);return {pointerType:type,pointerId,button:0,clientX:(p.x+1)*300,clientY:(1-p.y)*300,timeStamp:t,preventDefault(){}};};
function down(type='mouse',pointerId=1){a.root.updateMatrixWorld(true);const e=event(a.root.localToWorld(new T.Vector3(0,.54,.23)),type,pointerId);canvas.send('pointerdown',e);assert(drag.getActive());if(type==='touch')[...timers.values()][0]();return e;}
function moveTo(u,height=28,wall=0,type='mouse',pointerId=1){const active=drag.getActive(),w=room.walls[wall],t=new T.Vector3(Math.cos(w.group.rotation.y),0,-Math.sin(w.group.rotation.y)),point=w.start.clone().addScaledVector(t,(u-active.offsetU)/100);point.y=(height-active.offsetH)/100;const e=event(point,type,pointerId,400);canvas.send('pointermove',e);return e;}
// Crossing another cabinet is allowed before release, with no mutation of it.
down();let e=moveTo(235);assert.equal(a.placement.u,235);assert(comp.validate(a));assert.deepEqual(b.placement,bOriginal);canvas.send('pointerup',e);assert.equal(comp.validate(a),'');assert.equal(a.placement.u,155,'Closest valid horizontal position is selected');assert.equal(a.placement.height,28);assert.deepEqual(b.placement,bOriginal);assert(messages.some(s=>s.includes('automatiquement')));
down();moveTo(235);e=moveTo(350);assert.equal(a.placement.u,350);canvas.send('pointerup',e);assert.equal(a.placement.u,350,'A free destination is never moved away by snapping');
const before={...a.placement};down('touch',2);e=moveTo(235,28,0,'touch',2);assert(comp.validate(a));canvas.send('pointercancel',e);assert.deepEqual(a.placement,before);assert.equal(controls.enabled,true);
// Each wall can be the destination, even if its rendered surface was cut away.
for(const wall of [1,2,3,0]){const origin={...a.placement};const r=comp.previewMove(a.id,{wall,u:120,height:40});assert(r.item);const result=comp.settle(a.id,origin);assert(result.item&&!result.restored);assert.equal(a.placement.wall,wall);assert.equal(comp.validate(a),'');}
// Actual pointer transfer to another wall; raycast bypasses furniture and the
// renderer's cutaway flag. Both mounting planes are visible to this camera.
assert(!comp.move(a.id,{wall:0,u:100,height:28}).error);camera.position.set(.4,1.2,2.2);camera.lookAt(-1.4,.7,.4);camera.updateMatrixWorld();room.walls[3].group.visible=false;down();e=moveTo(100,28,3);assert.equal(a.placement.wall,3);canvas.send('pointerup',e);assert.equal(a.placement.wall,3);assert.equal(comp.validate(a),'');
// When a destination wall is completely occupied at all heights, dropping
// restores the start position rather than leaving objects overlapped.
const tiny=makeRoom(roomPreset('rectangle',150,150,180),0),c=new Composition(tiny);const mock=()=>({root:new T.Group()});const full=c.add('column',mock(),{},{wall:1,u:75,height:0}).item;full.dimensions={width:1.46,height:1.8,depth:.27,base:0};c.sync(full);const moving=c.add('column',mock(),{},{wall:0,u:75,height:0}).item;assert(moving);const origin={...moving.placement};assert(c.previewMove(moving.id,{wall:1,u:75,height:0}).item);const result=c.settle(moving.id,origin);assert(result.restored);assert.deepEqual(moving.placement,origin);assert.equal(c.validate(moving),'');
// Dimension anchors measure the actual local model, including after rotation.
comp.selectedId=a.id;const segments=dimensionSegments(comp);assert(segments.some(s=>s.label==='L · 80 cm'&&Math.abs(s.a.distanceTo(s.b)-.8)<1e-6));assert(segments.some(s=>s.label==='H · 54 cm'&&Math.abs(s.a.distanceTo(s.b)-.54)<1e-6));assert(segments.some(s=>s.label==='P · 46 cm'));assert(segments.some(s=>s.label==='H pièce · 260 cm'));const projected=projectDimensions(segments,camera,390,844);assert(projected.length);assert(dimensionMarkup(projected).includes('<text'));
const report={passed:true,at:new Date().toISOString(),checks:['actual mouse drag crosses furniture before release','release finds closest horizontal free centimetre without moving neighbours','free drops preserve requested location','touch cancellation restores origin from an overlap','placements and pointer transfer to other walls ignore rendered cutaway state','full destination wall restores valid original position','dimension lines measure real width,height,depth,clearance and room walls','camera projection yields phone-sized readable SVG labels'],browserQA:'Node controller and projection tests; no browser/WebGL visual validation'};writeFileSync('qa/placement-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
