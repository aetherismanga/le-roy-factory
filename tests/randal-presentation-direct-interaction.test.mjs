import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createPresentationEditing,presentationHitPart} from '../shared/lrf-3d/randal-presentation-editing.js';
import {buildPreview} from '../studio-one/src/commerce/preview-model.js';
import {initialDraft,draftProject} from '../studio-one/src/commerce/guided.js';

class Pointer {
 constructor(type,values={}){Object.assign(this,{type,button:0,buttons:1,pointerType:'mouse',pointerId:1,clientX:400,clientY:300},values);this.pageX=this.clientX;this.pageY=this.clientY;}
 preventDefault(){this.defaultPrevented=true;}
 stopImmediatePropagation(){this.stopped=true;}
}
class Surface {
 constructor(){this.style={};this.listeners=new Map();this.captured=new Set();this.clientWidth=800;this.clientHeight=600;this.document={addEventListener(){},removeEventListener(){}};}
 addEventListener(type,handler,options={}){const list=this.listeners.get(type)||[];list.push({handler,capture:typeof options==='boolean'?options:!!options.capture});this.listeners.set(type,list);}
 removeEventListener(type,handler){this.listeners.set(type,(this.listeners.get(type)||[]).filter(e=>e.handler!==handler));}
 dispatchEvent(event){for(const capture of [true,false])for(const {handler}of [...(this.listeners.get(event.type)||[])].filter(e=>e.capture===capture)){handler(event);if(event.stopped)return !event.defaultPrevented;}return !event.defaultPrevented;}
 getRootNode(){return this.document;}
 getBoundingClientRect(){return {left:0,top:0,width:800,height:600};}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);this.dispatchEvent(new Pointer('lostpointercapture',{pointerId:id}));}
}
function fixture({realOrbit=false}={}){
 const project=draftProject(initialDraft()),preview=buildPreview(project),scene=new T.Scene();scene.add(preview.group);const cabinet=preview.items[0],bounds=new T.Box3().setFromObject(cabinet.wrapper),centre=bounds.getCenter(new T.Vector3()),camera=new T.PerspectiveCamera(36,4/3,.05,100);camera.position.copy(centre).add(new T.Vector3(0,.1,3));camera.lookAt(centre);camera.updateMatrixWorld();
 const canvas=new Surface(),controls=realOrbit?new OrbitControls(camera,canvas):{enabled:true};if(realOrbit){controls.target.copy(centre);controls.update();}
 const events=[],editing=createPresentationEditing({scene,camera,canvas,controls,getItems:()=>preview.items,getProject:()=>project,invalidate(){}});editing.setListener(event=>events.push(event));
 const send=(type,values={})=>canvas.dispatchEvent(new Pointer(type,values));
 return {project,preview,scene,cabinet,camera,canvas,controls,events,editing,send,dispose(){editing.dispose();controls.dispose?.();}};
}
for(const pointerType of ['mouse','touch'])test(pointerType+': dragging a real cabinet is direct, bounded and committed once without movement mode',()=>{
 const f=fixture(),before=f.cabinet.placement.u;
 try{f.send('pointerdown',{pointerType});assert.equal(f.controls.enabled,false);f.send('pointermove',{pointerType,clientX:350});assert.ok(f.cabinet.placement.u<before);assert.equal(f.events.filter(e=>e.kind==='placement').length,0);f.send('pointerup',{pointerType,clientX:350});assert.equal(f.controls.enabled,true);assert.equal(f.events.filter(e=>e.kind==='placement').length,1);assert.equal(f.events.some(e=>e.kind==='selection'),false);assert.equal(f.editing.state().moving,false);}
 finally{f.dispose();}
});
for(const pointerType of ['mouse','touch'])test(pointerType+': tapping a real item selects its context without moving or saving it',()=>{
 const f=fixture(),before=structuredClone(f.cabinet.placement);
 try{f.send('pointerdown',{pointerType});f.send('pointermove',{pointerType,clientX:403,clientY:302});f.send('pointerup',{pointerType,clientX:403,clientY:302});assert.deepEqual(f.cabinet.placement,before);const event=f.events.find(e=>e.kind==='selection');assert.equal(event.itemId,f.cabinet.id);assert.equal(event.part,'cabinet');assert.equal(f.events.some(e=>e.kind==='placement'),false);}
 finally{f.dispose();}
});
test('cancelled drag restores the original placement and leaves no pending pointer capture',()=>{
 const f=fixture(),before=structuredClone(f.cabinet.placement);
 try{f.send('pointerdown');f.send('pointermove',{clientX:350});f.send('pointercancel',{clientX:350});assert.deepEqual(f.cabinet.placement,before);assert.equal(f.controls.enabled,true);assert.equal(f.canvas.captured.size,0);assert.equal(f.events.some(e=>e.kind==='placement'),false);}
 finally{f.dispose();}
});
test('a second finger restores furniture and hands both pointers to genuine OrbitControls for pinch',()=>{
 const old=globalThis.PointerEvent;globalThis.PointerEvent=Pointer;const f=fixture({realOrbit:true}),before=structuredClone(f.cabinet.placement),distance=f.camera.position.distanceTo(f.controls.target);
 try{
  f.send('pointerdown',{pointerType:'touch',pointerId:11});f.send('pointermove',{pointerType:'touch',pointerId:11,clientX:380});assert.notDeepEqual(f.cabinet.placement,before);
  f.send('pointerdown',{pointerType:'touch',pointerId:12,clientX:500});assert.deepEqual(f.cabinet.placement,before);assert.equal(f.controls.enabled,true);assert.deepEqual(f.controls._pointers,[11,12]);
  f.send('pointermove',{pointerType:'touch',pointerId:12,clientX:560});assert.ok(f.camera.position.distanceTo(f.controls.target)<distance,'the actual orbit camera zooms when fingers separate');assert.deepEqual(f.cabinet.placement,before);assert.equal(f.events.some(e=>e.kind==='placement'),false);
  f.send('pointerup',{pointerType:'touch',pointerId:12,clientX:560});f.send('pointerup',{pointerType:'touch',pointerId:11,clientX:380});assert.equal(f.controls._pointers.length,0);assert.equal(f.canvas.captured.size,0);
 }finally{f.dispose();globalThis.PointerEvent=old;}
});
test('background orbit remains owned by genuine OrbitControls',()=>{
 const f=fixture({realOrbit:true}),before=f.camera.position.clone();
 try{f.send('pointerdown',{clientX:20,clientY:20});assert.equal(f.controls.enabled,true);f.send('pointermove',{clientX:80,clientY:20});f.send('pointerup',{clientX:80,clientY:20});assert.ok(f.camera.position.distanceTo(before)>.1);assert.equal(f.events.length,0);}
 finally{f.dispose();}
});
test('hidden alternate basins never intercept real object picking',()=>{
 const f=fixture();
 try{const hidden=new T.Mesh(new T.PlaneGeometry(10,10),new T.MeshBasicMaterial());hidden.name='Vasque_invisible';hidden.position.copy(f.camera.position).add(new T.Vector3(0,0,-.2));hidden.visible=false;f.cabinet.wrapper.add(hidden);f.send('pointerdown');f.send('pointerup');assert.equal(f.events.find(e=>e.kind==='selection').part,'cabinet');}
 finally{f.dispose();}
});
test('real model names and inherited edit targets distinguish basin, plan and both faucets',()=>{
 const item={type:'cabinet',wrapper:new T.Group()},part=(name,target)=>{const group=new T.Group();group.name=name;if(target)group.userData.editTarget=target;item.wrapper.add(group);const mesh=new T.Mesh();group.add(mesh);return presentationHitPart(mesh,item);};
 assert.equal(part('Vasque_encastree_sella','basin'),'basin');assert.equal(part('Plan_assorti_800x460x20','basin'),'top');assert.equal(part('Mitigeur_illustratif','basin'),'tap');assert.equal(part('Mitigeur_illustratif_double'),'tap');assert.equal(part('Caisson_800x540x460','furniture'),'cabinet');
});
test('disabled or disposed interaction never intercepts gestures and removes every listener it owns',()=>{
 const f=fixture();f.editing.setEnabled(false);f.send('pointerdown');assert.equal(f.controls.enabled,true);assert.equal(f.events.length,0);f.editing.setEnabled(true);f.send('pointerdown');f.send('pointermove',{clientX:350});f.editing.dispose();assert.equal(f.controls.enabled,true);assert.equal(f.canvas.captured.size,0);assert.ok([...f.canvas.listeners.values()].every(list=>list.length===0));
});
