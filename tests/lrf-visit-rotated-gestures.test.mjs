import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';

class Element{
 constructor(){this.listeners=new Map();this.style={};this.classList={toggle(){}};}
 append(){}setAttribute(){}setPointerCapture(){}closest(){return null;}
 addEventListener(type,handler){const list=this.listeners.get(type)||[];list.push(handler);this.listeners.set(type,list);}
 emit(type,properties){for(const handler of this.listeners.get(type)||[])handler({type,target:this,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...properties});}
}
for(const app of ['studio-one','randal-general'])for(const pointerType of ['mouse','touch'])test(app+': '+pointerType+' look uses the rotated stage logical axes',()=>{
 const source=readFileSync(new URL('../'+app+'/src/walk-mode.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('export function createWalkMode')).replace('export function','function'),originals=new Map(['document','window','navigator','matchMedia','innerWidth','setTimeout','clearTimeout'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const doc=new Element(),win=new Element(),stage=new Element(),canvas=new Element();doc.createElement=()=>new Element();
 for(const [name,value]of Object.entries({document:doc,window:win,navigator:{maxTouchPoints:1},matchMedia:()=>({matches:true}),innerWidth:400,setTimeout:()=>1,clearTimeout(){}}))Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
 const calls={point:0,delta:0,time:null};let gardenActive=false;
 const makeWalk=new Function('T','createVisitTapGesture','boundsOnWall','mountVisitMobileControls','createShowroomVisit','showroomMoveAllowed','visitLocalPoint','visitLocalDelta',body+'\nreturn createWalkMode;')(
  T,()=>({reset(){},cancel(){},down(){},move(){}}),()=>null,()=>({setActive(){},reset(){}}),()=>({update(){},exit(){},blocked:false,occupiedId:null,animate(_position,time){calls.time=time;return gardenActive;}}),()=>null,
  (_canvas,event)=>{calls.point++;return {x:event.clientY,y:-event.clientX,width:800,height:400};},(_stage,x,y)=>{calls.delta++;return {x:y,y:-x};}
 );
 const camera=new T.PerspectiveCamera();camera.position.set(0,1.58,0);const controls={target:new T.Vector3(0,1.58,-1),update(){camera.lookAt(this.target);}},walk=makeWalk({stage,canvas,camera,controls,getRoom:()=>null,getItems:()=>[],onMove(){}});
 try{
  walk.setActive(true);stage.emit('pointerdown',{target:canvas,pointerType,button:0,pointerId:1,clientX:100,clientY:100});
  stage.emit('pointermove',{target:canvas,pointerType,pointerId:1,clientX:250,clientY:100,movementX:150,movementY:0});
  const direction=camera.getWorldDirection(new T.Vector3());assert(Math.abs(Math.asin(direction.y)-.6)<1e-10,'physical horizontal swipe maps to logical vertical looking in the rotated stage');assert.equal(camera.position.y,1.58);
  assert(pointerType==='mouse'?calls.delta===1:calls.point===2,'the real gesture handler delegates to the rotation helper');
  assert.equal(walk.tick(.016),false,'a stationary indoor visit can sleep');gardenActive=true;assert.equal(walk.tick(.016),true,'the stationary garden keeps its water animation rendering');assert(Math.abs(calls.time-performance.now()/1000)<.1,'the garden receives seconds rather than milliseconds');walk.setActive(false);const lastTime=calls.time;assert.equal(walk.tick(.016),false);assert.equal(calls.time,lastTime,'leaving the visit stops animation updates');
 }finally{walk.setActive(false);for(const [name,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
});
