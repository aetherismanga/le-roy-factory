import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeOpening} from '../shared/lrf-3d/openings.js';
import {makeRoom,DEFAULT_ROOM} from '../shared/lrf-3d/room.js';
import {showroomMoveAllowed,createShowroomVisit} from '../shared/lrf-3d/showroom-visit.js';
import {disposeObject} from '../studio-one/src/composition.js';
import {SHOWROOM_MANUFACTURERS} from '../shared/lrf-3d/showroom-catalog.js';
import {makeDoorInterior} from '../shared/lrf-3d/door-interior.js';

function doorFixture(angle=0){
 const asset=makeOpening('door',{width:83,height:204});
 asset.root.position.set(8.2,0,-5.4);asset.root.rotation.y=angle;asset.setOpenProgress(1);
 const item={id:'visit-door',type:'door',root:asset.root,asset,settings:{width:83,height:204,doorOpen:true},dimensions:{width:.83,height:2.04},placement:{wall:0,u:150,height:0}};
 const world=(x,z)=>{asset.root.updateMatrixWorld(true);return asset.visitInterior.root.localToWorld(new T.Vector3(x,1.58,z));};
 return {asset,item,world};
}

test('the exhibition is lazy, retains an isolated project footprint, and uses every public manufacturer',()=>{
 const {asset,item}=doorFixture();
 try{
  const initial=JSON.stringify(item.settings),space=asset.visitInterior;
  assert.equal(space.showroom,null,'opening the bathroom door does not allocate the exhibition');
  space.setInnerOpen(true);const hall=space.showroom;
  assert.equal(hall.root.parent,space.root);assert.equal(hall.root.visible,true);
  assert.equal(hall.stands.length,SHOWROOM_MANUFACTURERS.length);
  assert.equal(hall.dimensions.width,28);assert.equal(hall.dimensions.wallHeight,2.25);
  assert(hall.dimensions.depth>=30&&hall.dimensions.depth<34,'the complete exhibition fits a wide compact atrium');
  space.setInnerOpen(false);space.setInnerOpen(true);assert.equal(space.showroom,hall,'the same architecture is reused');
  assert.equal(JSON.stringify(item.settings),initial,'visit state is absent from commercial project settings');
  assert.equal(space.root.userData.excludeFromProductBounds,true);
  const ray=new T.Raycaster(new T.Vector3(8.2,1.58,-4),new T.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(space.root,true).length,0,'scenery cannot steal editing picks');
 }finally{disposeObject(asset.root);}
});

test('continuous steps can cross the vestibule and second doorway at every wall orientation',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2,.43]){
  const {asset,item,world}=doorFixture(angle);const space=asset.visitInterior;
  try{
   let previous=world(0,.12);
   for(let z=.07;z>=-1.5;z-=.05){const next=world(0,z);const allowed=showroomMoveAllowed([item],previous,next,.20);assert.notEqual(allowed,false,'clear first doorway at '+z+' / '+angle);previous=next;}
   for(let x=.04;x<.34;x+=.04){const next=world(x,-1.5);assert.equal(showroomMoveAllowed([item],previous,next,.20),true,'sas permits walking to the offset inner doorway');previous=next;}
   previous=world(.3325,-3.20);assert.equal(showroomMoveAllowed([item],previous,world(.3325,-3.30),.20),false,'closed second door blocks walking');
   space.setInnerOpen(true);previous=world(.3325,-3.15);
   for(let z=-3.20;z>=-5.0;z-=.04){const next=world(.3325,z);assert.equal(showroomMoveAllowed([item],previous,next,.20),true,'open second doorway must connect to hall at '+z+' / '+angle);previous=next;}
   for(let z=-4.95;z<=-.25;z+=.04){const next=world(z>-1.5?0:.3325,z);assert.equal(showroomMoveAllowed([item],previous,next,.20),true,'return route remains connected at '+z);previous=next;}
   assert.equal(showroomMoveAllowed([item],previous,world(0,-.16),.20),null,'bathroom collision system resumes on return');
  }finally{disposeObject(asset.root);}
 }
});

test('solid sas walls, console, hall partitions and disconnected doors do not admit a visitor',()=>{
 const {asset,item,world}=doorFixture(),space=asset.visitInterior;
 try{
  assert.equal(showroomMoveAllowed([item],world(0,-1.5),world(.90,-1.5),.20),false,'sas side wall');
  assert.equal(showroomMoveAllowed([item],world(-.5,-2.7),world(-.5,-3.1),.20),false,'grounded console');
  item.settings.doorOpen=false;assert.equal(showroomMoveAllowed([item],world(0,.1),world(0,-.4),.20),null,'closed exterior door never grants an extension');item.settings.doorOpen=true;
  assert.equal(showroomMoveAllowed([item],world(6,2),world(0,-1.5),.20),null,'unreached remote doorway cannot teleport a walker');
  space.setInnerOpen(true);const hall=space.showroom,bounds=hall.navigableBounds||hall.bounds;
  assert(bounds,'the hall exposes navigable bounds');
  assert.equal(space.canWalk(new T.Vector3(bounds.maxX+1+.3325,1.58,-8),.20),false,'outside wall');
  const obstacle=hall.colliders.find(c=>c.minZ<-8&&c.maxZ>-hall.dimensions.depth+2&&c.minX>-14&&c.maxX<14);
  assert(obstacle,'there are physical stand partitions');
  const x=(obstacle.minX+obstacle.maxX)/2+.3325,z=(obstacle.minZ+obstacle.maxZ)/2-3.54;
  assert.equal(space.canWalk(new T.Vector3(x,1.58,z),.20),false,'stand partition rejects the walker');
 }finally{disposeObject(asset.root);}
});

test('visit occupancy keeps the reached opening visible through cutaway and cleans up on exit',()=>{
 const {asset,item,world}=doorFixture();let invalidations=0;
 const camera=new T.PerspectiveCamera(42,1,.035,120),visit=createShowroomVisit({stage:{},canvas:{},camera,getItems:()=>[item],onInvalidate:()=>invalidations++});
 try{
  asset.root.visible=false;visit.update(world(0,-1));assert.equal(visit.occupiedId,item.id);assert.equal(asset.root.visible,true);assert.equal(asset.visitInterior.occupied,true);
  const original=JSON.stringify(item.settings);visit.exit();assert.equal(visit.occupiedId,null);assert.equal(asset.visitInterior.occupied,false);assert.equal(JSON.stringify(item.settings),original);
  visit.update(world(4,4));assert.equal(visit.occupiedId,null);assert.equal(asset.visitInterior.occupied,false);
 }finally{disposeObject(asset.root);}
});

test('a real centre-screen ray requires verified access before opening the reached second door',async()=>{
 const {asset,item,world}=doorFixture(),camera=new T.PerspectiveCamera(42,1,.035,120);
 let pending=null,requests=0,closed=0;
 const showroomAccess={get pending(){return !!pending;},request(){if(pending)return pending.promise;requests++;let resolve;const promise=new Promise(done=>{resolve=done;});pending={promise,resolve};return promise;},complete(allowed){const state=pending;pending=null;state.resolve(allowed);},close(){closed++;if(pending)this.complete(false);}};
 const canvas={getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},visit=createShowroomVisit({stage:{},canvas,camera,getItems:()=>[item],showroomAccess});
 try{
  camera.position.copy(world(0,-1.2));camera.lookAt(world(.3325,-3.41));camera.updateMatrixWorld(true);visit.update(camera.position);
  assert.equal(asset.visitInterior.innerOpen,false);assert.equal(visit.tap({clientX:50,clientY:50}),true);assert.equal(asset.visitInterior.innerOpen,false,'the door stays closed while the server checks access');assert.equal(visit.blocked,true);
  showroomAccess.complete(false);await Promise.resolve();assert.equal(asset.visitInterior.innerOpen,false,'refused access never opens the door');assert.equal(visit.blocked,false);
  assert.equal(visit.tap({clientX:50,clientY:50}),true);showroomAccess.complete(true);await Promise.resolve();assert.equal(asset.visitInterior.innerOpen,true,'verified access opens the same physical doorway');assert.equal(requests,2);
  asset.visitInterior.setInnerOpen(false);assert.equal(visit.tap({clientX:50,clientY:50}),true);showroomAccess.complete(true);visit.exit();await Promise.resolve();assert.equal(asset.visitInterior.innerOpen,false,'leaving the visit wins over an access result already queued for this door');assert.equal(visit.occupiedId,null);assert.equal(closed,1);
  visit.update(world(0,.1));assert.equal(visit.tap({clientX:50,clientY:50}),false,'unreached scenery cannot be clicked through the bathroom wall');
 }finally{visit.exit();disposeObject(asset.root);}
});

test('normal door disposal aborts attached exhibition downloads and discards their late textures',async()=>{
 const requests=[];let disposed=0,ready=0;
 const space=makeDoorInterior({loadTexture:(url,options)=>new Promise(resolve=>requests.push({url,options,resolve})),onReady:()=>ready++});
 space.setVisible(true);space.setInnerOpen(true);const hall=space.showroom,task=hall.prepareNear(new T.Vector3(-8,1.58,-12));await Promise.resolve();
 assert(requests.length>2,'test exercises both vestibule floor and exhibition image downloads');
 const before=ready;disposeObject(space.root);assert(requests.every(r=>r.options.signal.aborted),'both resource owners cancel their pending transfers');
 for(const request of requests){const texture=new T.Texture({width:20,height:20});texture.addEventListener('dispose',()=>disposed++);request.resolve(texture);}
 await task;await space.prepareFloor();assert.equal(disposed,requests.length);assert.equal(hall.diagnostics().loaded,0);assert.equal(ready,before,'destroyed opening cannot wake the renderer');
});

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

for(const app of ['studio-one','randal-general'])test(app+': real keyboard walking reaches the hall and quitting restores the editing camera',async()=>{
 const env=installDOM(),{createWalkMode}=await import('../'+app+'/src/walk-mode.js'),{Composition}=await import('../'+app+'/src/composition.js');
 const room=makeRoom(DEFAULT_ROOM,0),composition=new Composition(room),asset=makeOpening('door',{width:83,height:204});
 const result=composition.add('door',asset,{width:83,height:204,doorOpen:true},{wall:0,u:150,height:0});assert(result.item,result.error);asset.setOpenProgress(1);asset.root.updateMatrixWorld(true);
 const start=asset.visitInterior.root.localToWorld(new T.Vector3(0,1.58,.12)),goal=asset.visitInterior.root.localToWorld(new T.Vector3(0,1.58,-1)),camera=new T.PerspectiveCamera(42,1,.035,120);camera.position.copy(start);
 const controls={enabled:true,target:goal.clone(),update(){camera.lookAt(this.target);}},originalCamera=start.clone(),originalTarget=goal.clone();
 const walk=createWalkMode({stage:env.stage,canvas:env.canvas,camera,controls,getRoom:()=>room,getItems:()=>composition.items,onMove(){}});
 const press=code=>env.doc.emit('keydown',{code,target:env.canvas}),release=code=>env.doc.emit('keyup',{code,target:env.canvas});
 try{
  walk.setActive(true);press('ArrowUp');for(let i=0;i<150;i++)walk.tick(1/60);release('ArrowUp');
  let local=asset.visitInterior.root.worldToLocal(walk.position.clone());assert(local.z<-3&&local.z>-3.30,'closed inner door stops a normal walking sequence');assert.equal(walk.interiorId,result.item.id);
  press('KeyD');for(let i=0;i<12;i++)walk.tick(1/60);release('KeyD');asset.visitInterior.setInnerOpen(true);
  press('ArrowUp');for(let i=0;i<70;i++)walk.tick(1/60);release('ArrowUp');
  local=asset.visitInterior.root.worldToLocal(walk.position.clone());assert(local.z<-4.5,'visitor walks through the opened inner door into the hall');
  walk.setActive(false);assert(camera.position.distanceTo(originalCamera)<1e-8);assert(controls.target.distanceTo(originalTarget)<1e-8);assert.equal(controls.enabled,true);assert.equal(asset.visitInterior.occupied,false);
 }finally{walk.setActive(false);disposeObject(asset.root);room.dispose();env.restore();}
});
