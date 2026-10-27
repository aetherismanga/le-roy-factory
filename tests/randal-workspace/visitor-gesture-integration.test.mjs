import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createResident} from '../../shared/lrf-3d/resident.js';
import {createVisitorInteraction,resolveVisitorContact} from '../../shared/lrf-3d/visitor-interaction.js';
import {createVisitInteractions} from '../../shared/lrf-3d/visit-interactions.js';
import {makeModel as makeStudio} from '../../studio-one/src/model.js';
import {makeModel as makeGeneral} from '../../randal-general/src/model.js';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {disposeObject} from '../../studio-one/src/composition.js';

// Exercise the real rig, real fronts and the production visit coordinator.
// Only image decoding is stubbed; geometry, facial morphs and skinning are real.
const originalDocument=globalThis.document;
const originalTexture=T.TextureLoader.prototype.loadAsync;
const originalModel=GLTFLoader.prototype.loadAsync;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const bytes=fs.readFileSync(new URL('../../shared/avatar/jerome-v1/resident.glb',import.meta.url));
GLTFLoader.prototype.loadAsync=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
T.TextureLoader.prototype.loadAsync=async()=>new T.Texture({width:1254,height:1254});
const profiles={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp'}}};

async function rig(make,{type='cabinet',position=new T.Vector3(0,0,.55),target={kind:'drawer',index:0}}={}){
 const scene=new T.Scene(),asset=make(),root=new T.Group();root.add(asset.root);scene.add(root);
 const item={id:'qa-item',type,asset,root,settings:{drawers:(asset.drawers||[]).map(()=>0),doorOpen:false,locked:true},motion:{drawers:(asset.drawers||[]).map(()=>0),door:0}};
 const actor=createResident(scene,{capabilities:{getMaxAnisotropy:()=>8}},{profiles});await actor.load('jerome');actor.place(position,Math.PI);actor.animate(1/60,{moving:false,speed:0,distance:0});
 let active=true,commits=0;
 const driver=createVisitorInteraction({getActorRoot:()=>actor.getRoot(),getHandContactPosition:side=>actor.getHandContactPosition(side),getPosition:()=>position,getHeading:()=>Math.PI,isActive:()=>active});
 const controller=createVisitInteractions({getItems:()=>[item],onBeforeAction:action=>driver.start(action),onCancelAction:()=>driver.cancel('coordinator'),onChange:event=>{if(!event.restored)commits++;}});
 controller.begin({transient:true});
 const part=target.kind==='drawer'?asset.drawers[target.index]:(asset.doors?.[target.index||0]||asset.door);
 let hitObject;part.traverse(o=>{if(!hitObject&&o.isMesh&&/Facade|Bequille|Poign|Vantail/.test(o.name))hitObject=o;});
 const hit={itemId:item.id,object:hitObject||part};
 const frames=[];
 function advance(seconds){
  for(let i=0;i<Math.round(seconds*60);i++){
   for(let j=0;j<(asset.drawers?.length||0);j++){
    const to=(item.settings.drawers[j]||0)*(j===0?.2:.315);
    item.motion.drawers[j]+=(to-item.motion.drawers[j])*(1-Math.exp(-8/60));asset.drawers[j].position.z=item.motion.drawers[j];
   }
   item.motion.door+=((item.settings.doorOpen?1:0)-item.motion.door)*(1-Math.exp(-8/60));
   if(asset.setOpenProgress)asset.setOpenProgress(item.motion.door);else asset.setDoorProgress?.(item.motion.door);
   const interaction=driver.tick(1/60);actor.animate(1/60,{moving:false,speed:0,distance:0,interaction});
   const palm=interaction&&actor.getHandContactPosition(interaction.side),point=interaction&&new T.Vector3(...interaction.target);
   frames.push({phase:interaction?.phase||'idle',weight:interaction?.weight||0,grip:interaction?.grip||0,commits,contactDistance:palm&&point?palm.distanceTo(point):null,pose:actor.diagnostics.interaction});
  }
 }
 return {scene,item,actor,driver,controller,hit,position,target,frames,advance,get commits(){return commits;},disable(){active=false;},dispose(){controller.end();driver.dispose();actor.dispose();disposeObject(root);}};
}

for(const [name,make] of [['Studio',()=>makeStudio({includeMirror:false})],['General',()=>makeGeneral({includeMirror:false})]])test(name+': drawer reaches its real front before committing, follows it, and releases to idle',async()=>{
 const r=await rig(make);
 try{
  assert.equal(r.controller.tap(r.hit),true);assert.equal(r.driver.active,true,'The close, real grip starts a reach '+JSON.stringify({driver:r.driver.diagnostics(),contact:resolveVisitorContact({item:r.item,target:r.target,hit:r.hit,actorPosition:r.position})?.sample(r.position),bones:['R_UpperArm','R_Forearm','R_Hand'].map(n=>r.actor.getRoot().getObjectByName('Bip01_'+n).getWorldPosition(new T.Vector3()).toArray())}));
  assert.equal(r.item.settings.drawers[0],0,'Request must not open a drawer before contact');
  r.advance(.25);assert.equal(r.commits,0);assert.equal(r.item.settings.drawers[0],0);
  r.advance(.10);assert.equal(r.commits,1);assert.equal(r.item.settings.drawers[0],1);
  r.advance(.65);
  const follow=r.frames.filter(f=>f.phase==='follow'&&f.weight>.99);assert.ok(follow.length>12,'The action must contain a real hold/follow phase');
  assert.ok(Math.max(...follow.map(f=>f.contactDistance))<.03,'The actual palm follows the live moving front without an extended arm');
  console.log(JSON.stringify({case:name,firstContactError:follow[0].contactDistance,worstFollowError:Math.max(...follow.map(f=>f.contactDistance)),lastFollowError:follow.at(-1).contactDistance}));
  r.advance(.8);assert.equal(r.driver.active,false);assert.equal(r.commits,1);assert.equal(r.actor.diagnostics.gesture,'idle');
  r.actor.getRoot().traverse(o=>assert([...o.position.toArray(),...o.quaternion.toArray()].every(Number.isFinite),'All joints remain finite after contact/release'));
  r.controller.end();assert.equal(r.item.settings.drawers[0],0,'Locked demo restores its original configuration');
 }finally{r.dispose();}
});

test('a room door uses its real lever and a cancelled reach cannot mutate the locked project later',async()=>{
 const r=await rig(()=>makeOpening('door',{width:83,height:204}),{type:'door',position:new T.Vector3(.23,0,.24),target:{kind:'door'}});
 try{
  assert.equal(r.controller.tap(r.hit),true);assert.equal(r.driver.active,true);
  r.advance(.15);r.controller.end();r.advance(1.5);
  assert.equal(r.commits,0);assert.equal(r.item.settings.doorOpen,false);assert.equal(r.driver.active,false);
  r.controller.begin({transient:true});r.controller.tap(r.hit);r.advance(.4);assert.equal(r.commits,1);assert.equal(r.item.settings.doorOpen,true);
  r.advance(.9);assert.ok(r.frames.some(f=>f.phase==='follow'&&f.contactDistance<.08),'Door lever can be reached by the actual palm');
  r.controller.end();assert.equal(r.item.settings.doorOpen,false);
 }finally{r.dispose();}
});

test.after(()=>{
 T.TextureLoader.prototype.loadAsync=originalTexture;GLTFLoader.prototype.loadAsync=originalModel;
 if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
});
