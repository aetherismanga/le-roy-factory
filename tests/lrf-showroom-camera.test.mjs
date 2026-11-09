import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

class Element{
 constructor(doc,tag='div'){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.listeners=new Map();this.attrs={};this.dataset={};this.style={};this.classList={add(){},remove(){},toggle(){}};}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(name,value){this.attrs[name]=String(value);}
 addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}
 removeEventListener(){}
 emit(type,values={}){const event={type,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...values};for(const handler of this.listeners.get(type)||[])handler(event);}
 dispatchEvent(event){this.emit(event.type,event);}
 getContext(){return null;}
 closest(){return null;}
 setPointerCapture(){}
 remove(){}
}
function installDOM(){
 const names=['document','window','navigator','matchMedia','innerWidth'],originals=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const doc=new Element(null,'document');doc.head=new Element(doc,'head');doc.body=new Element(doc,'body');doc.body.style.overflow='auto';doc.createElement=tag=>new Element(doc,tag);doc.getElementById=()=>null;
 const win=new Element(doc,'window');win.setTimeout=()=>1;win.screen={};win.innerWidth=400;win.innerHeight=800;doc.defaultView=win;
 for(const [name,value]of Object.entries({document:doc,window:win,navigator:{maxTouchPoints:0},matchMedia:()=>({matches:false}),innerWidth:1200}))Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
 return {doc,win,stage:new Element(doc),canvas:new Element(doc,'canvas'),restore(){for(const [name,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}};
}

for(const app of ['studio-one','randal-general']){
 test(app+': first-person looking keeps eye height and pitch independent of editing OrbitControls limits',async()=>{
  const env=installDOM(),{createWalkMode}=await import('../'+app+'/src/walk-mode.js');
  const camera=new T.PerspectiveCamera(42,.62,.035,120);camera.position.set(0,1.3,2);
  const controls=new OrbitControls(camera,null);controls.minPolarAngle=.18;controls.maxPolarAngle=1.6;controls.target.set(0,1.1,-1);controls.update();
  const originalPosition=camera.position.clone(),originalTarget=controls.target.clone(),nativeUpdate=controls.update.bind(controls);let updates=0;
  controls.update=(...args)=>{updates++;return nativeUpdate(...args);};
  const room={bounds:new T.Box3(new T.Vector3(-4,0,-4),new T.Vector3(4,3,4)),walls:[]};
  const walk=createWalkMode({stage:env.stage,canvas:env.canvas,camera,controls,getRoom:()=>room,getItems:()=>[],onMove(){}});
  try{
   walk.setActive(true);assert.equal(updates,0,'entering first-person mode must not invoke the editing orbit solver');
   const eye=walk.position.clone();assert.equal(eye.y,1.58);
   env.stage.emit('pointerdown',{target:env.canvas,pointerType:'mouse',button:0,pointerId:1,clientX:100,clientY:100});
   env.stage.emit('pointermove',{target:env.canvas,pointerType:'mouse',pointerId:1,movementX:0,movementY:-150,clientX:100,clientY:-50});
   let direction=camera.getWorldDirection(new T.Vector3());
   assert(camera.position.distanceTo(eye)<1e-10,'looking upward must not raise the camera above the visitor');
   assert(Math.abs(Math.asin(direction.y)-.6)<1e-10,'the requested34.38° upward pitch survives the editor maxPolarAngle1.6');
   assert(controls.target.distanceTo(eye.clone().add(new T.Vector3(0,Math.sin(.6),-Math.cos(.6))))<1e-10);
   env.stage.emit('pointermove',{target:env.canvas,pointerType:'mouse',pointerId:1,movementX:0,movementY:250,clientX:100,clientY:200});
   direction=camera.getWorldDirection(new T.Vector3());assert(camera.position.distanceTo(eye)<1e-10);assert(Math.abs(Math.asin(direction.y)+.4)<1e-10,'looking down also preserves the exact first-person pitch');
   assert.equal(updates,0,'look gestures never run the editing orbit solver');
   walk.setActive(false);assert.equal(controls.enabled,true);assert.equal(updates,1,'the editing solver resumes when the visit ends');
   assert(camera.position.distanceTo(originalPosition)<1e-10);assert(controls.target.distanceTo(originalTarget)<1e-10);
  }finally{walk.setActive(false);env.restore();}
 });

 test(app+': the actual animation loop leaves an active first-person camera outside the orbit solver',()=>{
  // Execute the unchanged animation function with its rendering dependencies
  // stubbed. This exercises the real app boundary without requiring a GPU.
  const source=readFileSync(new URL('../'+app+'/src/app.js',import.meta.url),'utf8'),begin=source.indexOf('function animate(time){'),end=source.indexOf('\nasync function start()',begin);
  assert(begin>=0&&end>begin,'the production render loop is available');const animate=source.slice(begin,end);
  for(const active of [true,false]){
   let updates=0,renders=0;
   const context={captureBusy:false,document:{hidden:false},running:true,lastTime:0,quality:{pause(){},sample(){return false;}},state:{ready:true,orbit:false,drawers:[]},frames:0,walkMode:{active,tick(){return false;}},visitorAvatar:null,shadowsDirty:false,composition:null,model:{drawers:[]},viewTween:null,controls:{update(){updates++;return false;}},renderActivity:{active:false,update(){return false;}},applyRenderPhase(){},roomScene:null,wall:{},roomGroup:{},camera:{position:{z:0}},sceneRevision:0,renderer:{shadowMap:{},render(){renders++;}},showroomLighting:{update(){}},renderDimensions(){},ultraPipeline:null,scene:{},dragController:null,partitionDragController:null,productDragController:null,renderProfile(){return {ao:false};},applyQuality(){},lastMove:-1000,requestAnimationFrame(){}};
   vm.runInNewContext(animate+'\nanimate(1000);',context);assert.equal(renders,1);
   assert.equal(updates,active?0:1,active?'the render loop cannot alter the walking eye or pitch':'editing retains its normal OrbitControls update');
  }
 });
}
