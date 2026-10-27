import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mountUltraVisitorAvatar} from '../../shared/lrf-3d/visitor-avatar.js';
import {createVisitInteractions} from '../../shared/lrf-3d/visit-interactions.js';
import {advanceVisitOpenings} from '../../shared/lrf-3d/opening-motion.js';
import {createVisitCollisionWorld} from '../../shared/lrf-3d/visit-collisions.js';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';

const original={document:globalThis.document,texture:T.TextureLoader.prototype.loadAsync,model:GLTFLoader.prototype.loadAsync};
globalThis.document={hidden:false,createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const bytes=fs.readFileSync(new URL('../../shared/avatar/jerome-v1/resident.glb',import.meta.url));
GLTFLoader.prototype.loadAsync=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let requests=0;
T.TextureLoader.prototype.loadAsync=async()=>{requests++;return new T.Texture({width:1254,height:1254});};

async function fixture(variant,{depth=450,mode='max',format=variant==='studio-one'?'two':'harmony-two'}={}){
 const {makeModel}=await import(`../../${variant}/src/model.js`),{Composition,boundsOnWall,disposeObject}=await import(`../../${variant}/src/composition.js`);
 const room=makeRoom({...DEFAULT_ROOM,points:[[0,0],[450,0],[450,depth],[0,depth]]}),asset=makeModel({format,includeMirror:false}),composition=new Composition(room),scene=new T.Scene();
 const result=composition.add('cabinet',asset,{width:80,format,top:'sella'},{wall:0,u:225,height:28});assert.ok(result.item,result.error);
 const item=result.item;scene.add(item.root);const world=()=>createVisitCollisionWorld({room,items:composition.items,boundsOnWall}),front=Math.max(...world().obstacles[0].map(p=>p[1]));
 const walk={active:true,position:new T.Vector3(0,1.55,front+.32),heading:Math.PI,moving:false,running:false,clearOpening(dt,normal){const before=this.position.clone(),ok=world().clearOpening(this.position,dt,normal);assert.ok(this.position.distanceTo(before)<=.65*dt+1e-6);return ok;}};
 let quality=mode;const statuses=[],events=[];
 const avatar=mountUltraVisitorAvatar({scene,renderer:{capabilities:{getMaxAnisotropy:()=>8}},walk,getQuality:()=>({mode:quality}),status:s=>statuses.push(s)});
 const controller=createVisitInteractions({getItems:()=>composition.items,onBeforeAction:a=>avatar.interact(a),onCancelAction:()=>avatar.cancelInteraction(),onChange:e=>events.push(e)});
 avatar.sync();
 if(mode==='max')for(let i=0;i<100&&!avatar.ready;i++)await new Promise(resolve=>setImmediate(resolve));
 if(mode==='max')assert.equal(avatar.ready,true,avatar.diagnostics().failure);
 controller.begin({transient:true});
 const hit={itemId:item.id,object:asset.drawers[0].children[0]},initial=walk.position.clone();
 const step=seconds=>{for(let i=0;i<Math.ceil(seconds*60);i++){advanceVisitOpenings(composition.items,1/60,{visitor:avatar,drawerTravel:index=>asset.drawers.length===1?.315:index===0?.2:.315});avatar.tick(1/60);assert.equal(world().passable(walk.position.x,walk.position.z),true,'Actual body stays outside the mechanism after each frame');}};
 return {item,asset,avatar,controller,walk,statuses,events,hit,initial,step,setMode(next){quality=next;avatar.sync();},dispose(){controller.end();avatar.dispose();disposeObject(item.root);room.dispose();}};
}

for(const variant of ['studio-one','randal-general'])test(variant+': production avatar wrapper coordinates palm contact, physical drawer speed, retreat and return to idle',async()=>{
 const f=await fixture(variant);
 try{
  assert.equal(f.controller.tap(f.hit),true);assert.equal(f.avatar.diagnostics().visitAction.active,true);
  assert.equal(f.item.settings.drawers[0],0);f.step(.24);assert.equal(f.item.settings.drawers[0],0);
  f.step(.55);
  const contact=f.avatar.diagnostics();assert.equal(contact.visitAction.fallbacks,0);
  assert.ok(Math.abs(contact.interaction.target[0])<.13,'The reachable real grip must be inside the portrait view, not at the shoulder');
  f.step(2.25);assert.equal(f.item.settings.drawers[0],1);assert.ok(Math.abs(f.item.motion.drawers[0]-.2)<.0001);
  assert.ok(f.walk.position.z-f.initial.z>.14,'A close operator takes a small safe step back');
  assert.equal(f.avatar.diagnostics().visitAction.active,false);assert.equal(f.avatar.diagnostics().gesture,'idle');assert.equal(f.statuses.length,0);
  assert.equal(f.events.filter(e=>!e.restored).length,1,'One contact produces one opening');
 }finally{f.dispose();}
});

test('General 80 cm single drawer reaches its lower real grip from normal collision clearance',async()=>{
 const f=await fixture('randal-general',{format:'luce-single'});
 try{
  assert.equal(f.asset.drawers.length,1);assert.equal(f.controller.tap(f.hit),true);
  assert.equal(f.avatar.diagnostics().visitAction.active,true,'The lower front must start an actual reach');
  f.step(.8);
  const action=f.avatar.diagnostics().visitAction;
  assert.equal(action.committed,true);assert.equal(action.fallbacks,0,'The real palm must make contact, not fall back to remote opening');
  assert.ok(action.contactDistance<.035);
  assert.ok(Math.abs(f.avatar.diagnostics().interaction.target[0])<.13,'The low grip stays inside the portrait view');
  f.step(2);assert.equal(f.item.settings.drawers[0],1);assert.ok(Math.abs(f.item.motion.drawers[0]-.315)<.0001);
 }finally{f.dispose();}
});

test('a real rear wall stops an assisted opening and restores its requested state without a body jump',async()=>{
 const f=await fixture('studio-one',{depth:120});
 try{
  f.controller.tap(f.hit);f.step(2.8);
  assert.equal(f.item.settings.drawers[0],0,'Blocked operation rolls its intent back');
  assert.ok(f.item.motion.drawers[0]<.0001);assert.equal(f.events.filter(e=>e.blocked).length,1);assert.equal(f.statuses.length,1);
  assert.ok(f.walk.position.z-f.initial.z<.2);
 }finally{f.dispose();}
});

test('leaving Ultra before contact cancels the actual wrapper and Standard never requests the character',async()=>{
 const f=await fixture('studio-one');
 try{f.controller.tap(f.hit);f.step(.15);f.setMode('balanced');f.step(1);assert.equal(f.item.settings.drawers[0],0);assert.equal(f.avatar.ready,false);assert.equal(f.avatar.diagnostics().visitAction.active,false);}finally{f.dispose();}
 const before=requests,g=await fixture('studio-one',{mode:'balanced'});
 try{g.controller.tap(g.hit);assert.equal(g.item.settings.drawers[0],1);assert.equal(g.avatar.ready,false);assert.equal(requests,before);}finally{g.dispose();}
});

test.after(()=>{T.TextureLoader.prototype.loadAsync=original.texture;GLTFLoader.prototype.loadAsync=original.model;if(original.document===undefined)delete globalThis.document;else globalThis.document=original.document;});
