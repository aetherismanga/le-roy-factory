import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';

class Element{
 constructor(){this.listeners=new Map();this.children=[];this.style={};this.attrs={};this.classList={toggle(){}};}
 append(...children){this.children.push(...children);}
 setAttribute(name,value){this.attrs[name]=value;}
 addEventListener(type,handler){const list=this.listeners.get(type)||[];list.push(handler);this.listeners.set(type,list);}
 emit(type,properties={}){for(const handler of this.listeners.get(type)||[])handler({type,target:this,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...properties});}
 closest(){return null;}
}

// Execute the actual unchanged walk controller with its browser/joystick edge
// injected. This measures physical camera displacement, not duplicated maths.
function mount(app){
 const source=readFileSync(new URL('../'+app+'/src/walk-mode.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('export function createWalkMode')).replace('export function','function');
 const doc=new Element(),win=new Element(),stage=new Element(),canvas=new Element();doc.createElement=()=>new Element();
 const originals=new Map(['document','window','navigator','matchMedia','innerWidth','setTimeout','clearTimeout'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 for(const [name,value]of Object.entries({document:doc,window:win,navigator:{maxTouchPoints:1},matchMedia:()=>({matches:true}),innerWidth:400,setTimeout:()=>1,clearTimeout(){}}))Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
 let input;const mountMobile=options=>{input=options.onInput;return {setActive(){input({forward:0,strafe:0,speed:0});},reset(){input({forward:0,strafe:0,speed:0});}};};
 const createWalk=new Function('T','createVisitTapGesture','boundsOnWall','mountVisitMobileControls','createShowroomVisit','showroomMoveAllowed',body+'\nreturn createWalkMode;')(T,()=>({reset(){},cancel(){}}),()=>null,mountMobile,()=>({update(){},exit(){},blocked:false,occupiedId:null}),()=>null);
 const camera=new T.PerspectiveCamera();camera.position.set(0,1.58,0);const controls={target:new T.Vector3(0,1.58,-1),enabled:true,update(){camera.lookAt(this.target);}};
 const walk=createWalk({stage,canvas,camera,controls,getRoom:()=>null,getItems:()=>[],onMove(){}});walk.setActive(true);
 return {walk,input:value=>input(value),key:code=>doc.emit('keydown',{code,target:canvas}),release:code=>doc.emit('keyup',{code,target:canvas}),step(){const before=walk.position.clone();walk.tick(.10);return walk.position.distanceTo(before);},dispose(){walk.setActive(false);for(const [name,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}};
}

for(const app of ['studio-one','randal-general'])test(app+': analog deflection and fast joystick sector determine real camera speed once',()=>{
 const f=mount(app);
 try{
  f.input({forward:1,strafe:0,speed:.25});const slow=f.step();assert(Math.abs(slow-.0425)<1e-10,'quarter deflection walks at quarter pace');
  f.input({forward:1,strafe:0,speed:1});const normal=f.step();assert(Math.abs(normal-.17)<1e-10);
  f.input({forward:1,strafe:0,speed:2.1});const fast=f.step();assert(Math.abs(fast-.357)<1e-10,'upper sector is faster than standard walking');assert(Math.abs(fast/normal-2.1)<1e-10);
  f.input({forward:Math.SQRT1_2,strafe:Math.SQRT1_2,speed:.5});assert(Math.abs(f.step()-.085)<1e-10,'diagonal direction does not multiply or discard radial pace');
  f.input({forward:1,strafe:0,speed:0});assert.equal(f.step(),0,'neutral pace stops despite a remembered direction');
 }finally{f.dispose();}
});

for(const app of ['studio-one','randal-general'])test(app+': keyboard walking and Shift keep their normal pace when an analog input is also present',()=>{
 const f=mount(app);
 try{
  f.input({forward:1,strafe:0,speed:.25});f.key('ArrowUp');assert(Math.abs(f.step()-.17)<1e-10,'keyboard takes its usual normalized pace');
  f.key('ShiftLeft');assert(Math.abs(f.step()-.272)<1e-10,'Shift still applies to keyboard walking');
  f.release('ArrowUp');assert(Math.abs(f.step()-.0425)<1e-10,'joystick-only movement retains its explicit analog pace');
 }finally{f.dispose();}
});
