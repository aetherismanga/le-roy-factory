import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {makeModel} from '../../studio-one/src/model.js';

class Pointer{
 constructor(type,values={}){Object.assign(this,{type,button:0,buttons:1,pointerType:'mouse',pointerId:1,clientX:400,clientY:300,timeStamp:0},values);this.pageX=this.clientX;this.pageY=this.clientY;}
 preventDefault(){this.defaultPrevented=true;}stopImmediatePropagation(){this.stopped=true;}
}
class Canvas{
 constructor(){this.style={};this.listeners=new Map();this.captured=new Set();this.clientWidth=800;this.clientHeight=600;this.document={addEventListener(){},removeEventListener(){}};this.classList={add(){},remove(){}};}
 addEventListener(type,handler,options={}){const list=this.listeners.get(type)||[];list.push({handler,capture:typeof options==='boolean'?options:!!options.capture});this.listeners.set(type,list);}
 removeEventListener(type,handler){this.listeners.set(type,(this.listeners.get(type)||[]).filter(e=>e.handler!==handler));}
 dispatchEvent(event){for(const capture of [true,false])for(const {handler}of [...(this.listeners.get(event.type)||[])].filter(e=>e.capture===capture)){handler(event);if(event.stopped)return false;}return true;}
 getRootNode(){return this.document;}getBoundingClientRect(){return {left:0,top:0,width:800,height:600};}
 setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}releasePointerCapture(id){this.captured.delete(id);}
}
const dispose=root=>{const geometry=new Set(),material=new Set();root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)material.add(m);});geometry.forEach(g=>g.dispose());material.forEach(m=>m.dispose());};

for(const app of ['studio-one','randal-general'])for(const pointerType of ['mouse','touch'])test(app+' '+pointerType+': clicking actual window glazing returns the window options after genuine OrbitControls completes the gesture',async()=>{
 const {setupObjectDragging}=await import('../../'+app+'/src/dragging.js');
 const scene=new T.Scene(),asset=makeOpening('window',{width:120,height:100}),root=new T.Group();root.userData.itemId='window';root.position.y=.9;root.add(asset.root);scene.add(root);
 const item={id:'window',type:'window',root,asset,settings:{width:120,height:100},placement:{wall:0,u:150,height:90},dimensions:{width:1.2,height:1,depth:.12}};
 const wall={start:new T.Vector3(-1.5,0,-.24),normal:new T.Vector3(0,0,1),group:new T.Group(),length:3,height:2.7};
 const composition={items:[item],room:{walls:[wall],height:2.7},previewMove(_id,placement){Object.assign(item.placement,placement);return {};},settle(){return {};},move(_id,placement){Object.assign(item.placement,placement);return {};}},camera=new T.PerspectiveCamera(40,4/3,.01,50);camera.position.set(0,1.4,3);camera.lookAt(0,1.4,-.24);camera.updateMatrixWorld();
 const canvas=new Canvas(),controls=new OrbitControls(camera,canvas);controls.target.set(0,1.4,-.24);controls.update();let inspector=null,taps=0;controls.addEventListener('start',()=>inspector=null);
 const controller=setupObjectDragging({canvas,scene,camera,controls,getComposition:()=>composition,onSelect(){},onTap:hit=>{taps++;inspector=hit?.editTarget;assert.equal(hit?.itemId,'window');},onChange(){},onStatus(){}});
 const send=(type,extra={})=>canvas.dispatchEvent(new Pointer(type,{pointerType,...extra}));
 try{
  send('pointerdown');send('pointerup',{buttons:0,timeStamp:110});assert.equal(taps,1);assert.equal(inspector,'window');assert.equal(controls.enabled,true);assert.equal(controller.getActive(),null);assert.equal(canvas.captured.size,0);
  inspector=null;send('pointerdown',{timeStamp:200});send('pointermove',{clientX:455,timeStamp:240});send('pointerup',{clientX:455,buttons:0,timeStamp:280});assert.equal(taps,1,'A drag or orbit must never become a new options click');
 }finally{controller.cancel();controls.dispose();dispose(root);}
});

test('the exposed plain worktop surface is picked as plan-and-basin options while hidden alternate basins stay ignored',()=>{
 const scene=new T.Scene(),model=makeModel();model.root.userData.itemId='cabinet';scene.add(model.root);model.setTop('plain');
 const camera=new T.PerspectiveCamera(42,1,.035,120);camera.position.set(1.1,1.4,2.7);camera.lookAt(0,.9,0);camera.updateMatrixWorld();
 try{
  const point=new T.Vector3(.35,.84,.1),hit=pickSelection(scene,camera,point.project(camera));assert.equal(hit.itemId,'cabinet');assert.equal(hit.editTarget,'basin');assert.match(hit.object.name,/Plan/);
  model.setTop('sella');const inset=pickSelection(scene,camera,new T.Vector3(.35,.84,.1).project(camera));assert.equal(inset.itemId,'cabinet');assert.equal(inset.editTarget,'basin');
 }finally{dispose(model.root);}
});
