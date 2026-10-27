import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createResident} from '../resident.js';

// Exercise the genuine skinned model and its authored finger/facial joints.
// Only image decoding and HTTP loading are replaced; no synthetic skeleton or
// WebGL frame rate can hide a stretched limb or a missed moving handle here.
const oldDocument=globalThis.document,oldTextureLoad=T.TextureLoader.prototype.loadAsync,oldModelLoad=GLTFLoader.prototype.loadAsync;
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const bytes=fs.readFileSync(new URL('../../avatar/jerome-v1/resident.glb',import.meta.url));
GLTFLoader.prototype.loadAsync=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
T.TextureLoader.prototype.loadAsync=async()=>new T.Texture({width:1254,height:1254});
const profiles={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp'}}};
const actor=createResident(new T.Scene(),{capabilities:{getMaxAnisotropy:()=>8}},{profiles});
const idle={moving:false,speed:0,distance:0},checks=[],measurements=[];
const pass=description=>checks.push(description);
const close=(a,b,tolerance,message)=>assert.ok(Math.abs(a-b)<=tolerance,message+': '+a+' / '+b);
function joint(name){return actor.getRoot().getObjectByName('Bip01_'+name).getWorldPosition(new T.Vector3());}
function lengths(side){return [joint(side+'_UpperArm').distanceTo(joint(side+'_Forearm')),joint(side+'_Forearm').distanceTo(joint(side+'_Hand'))];}
function smile(){let value=0;actor.getRoot().traverse(o=>{for(const [name,index]of Object.entries(o.morphTargetDictionary||{}))if(/Smile/.test(name))value=Math.max(value,o.morphTargetInfluences[index]);});return value;}
function finite(){actor.getRoot().traverse(o=>assert.ok([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite),'Every animated joint stays finite'));}
function input(local,side='R',extra={}){
 const target=actor.pivot.localToWorld(new T.Vector3(...local)),normal=new T.Vector3(0,0,-1).applyQuaternion(actor.pivot.quaternion);
 return {target:target.toArray(),normal:normal.toArray(),side,weight:1,grip:1,effort:.4,lookWeight:1,...extra};
}
function frame(interaction,dt=1/60){actor.animate(dt,{...idle,interaction});actor.pivot.updateMatrixWorld(true);finite();}
function settle(interaction,frames=65){for(let i=0;i<frames;i++)frame(interaction);}
function resetReach(){settle(undefined,90);assert.equal(actor.diagnostics.interaction.active,false);}

try{
 await actor.load('jerome');actor.place(new T.Vector3(0,0,.55),Math.PI);frame();
 assert.ok(actor.diagnostics.bones>=80&&actor.diagnostics.expressions>=4);
 const segmentLengths={L:lengths('L'),R:lengths('R')};
 const initialHand=joint('R_Hand');let idleTravel=0,previous=initialHand.clone(),minSmile=1,maxSmile=0;
 for(let i=0;i<180;i++){frame();const hand=joint('R_Hand');idleTravel+=hand.distanceTo(previous);previous=hand;minSmile=Math.min(minSmile,smile());maxSmile=Math.max(maxSmile,smile());}
 assert.ok(idleTravel>.02,'Relaxed arms show visible continuous movement, not a fixed pose: '+idleTravel);
 assert.ok(maxSmile-minSmile>.01&&maxSmile<.12,'Expression varies subtly instead of holding a fixed grin');
 pass('real rig, visibly supple idle arms and restrained changing expression');

 for(const [side,local]of [['R',[-.17,.85,.33]],['L',[.17,.92,.33]]]){
  const interaction=input(local,side);settle(interaction);
  const contact=actor.getHandContactPosition(side),distance=contact.distanceTo(new T.Vector3(...interaction.target));
  assert.ok(distance<.012,side+' palm must meet the reachable handle: '+distance);
  for(let part=0;part<2;part++)close(lengths(side)[part],segmentLengths[side][part],1e-5,'Arm bone length is preserved');
  assert.ok(actor.diagnostics.interaction.grip>.99&&smile()<.02,'Grip and quiet concentration follow contact');
  measurements.push({case:'handle '+side,contactError:distance});resetReach();
 }
 pass('both palms meet world-space handles without stretching arms');

 actor.place(new T.Vector3(.8,0,1.2),-.82);
 const moving=input([-.17,.86,.33]);settle(moving);
 let worstContact=0,maxStep=0,lastContact=actor.getHandContactPosition('R');
 for(let i=0;i<=40;i++){
  const next=input([-.17,.86,.33-i/40*.2]);frame(next);
  const contact=actor.getHandContactPosition('R');worstContact=Math.max(worstContact,contact.distanceTo(new T.Vector3(...next.target)));maxStep=Math.max(maxStep,contact.distanceTo(lastContact));lastContact=contact;
 }
 assert.ok(worstContact<.015&&maxStep<.025,'Hand tracks the moving drawer under a rotated/translated visitor');
 measurements.push({case:'moving handle',worstContact,maxStep});
 pass('moving handle follows real transforms with continuous wrist motion');
 const beforeRelease=actor.getHandContactPosition('R');frame(undefined);
 assert.ok(actor.getHandContactPosition('R').distanceTo(beforeRelease)<.065,'Abrupt cancellation releases smoothly');
 resetReach();assert.ok(actor.getHandContactPosition('R').distanceTo(new T.Vector3(...moving.target))>.08);
 pass('release and interrupted gestures return softly to idle');

 actor.place(new T.Vector3(0,0,.55),Math.PI);resetReach();
 const feetBefore=['L','R'].map(side=>joint(side+'_Foot')),low=input([-.17,.60,.33]);settle(low);
 const lowError=actor.getHandContactPosition('R').distanceTo(new T.Vector3(...low.target));
 assert.ok(lowError<.015,'Low drawer is reached by posture rather than limb stretch: '+lowError);
 assert.ok(actor.diagnostics.interaction.crouch>.15&&actor.diagnostics.interaction.crouch<=.251);
 for(let i=0;i<2;i++)assert.ok(joint(['L','R'][i]+'_Foot').distanceTo(feetBefore[i])<.005,'Bent knees preserve the floor contacts');
 measurements.push({case:'low handle',contactError:lowError,crouch:actor.diagnostics.interaction.crouch});resetReach();
 pass('low handle bends knees with planted feet and bounded crouch');

 actor.place(new T.Vector3(.23,0,.24),Math.PI);
 const closeDoor={target:[.1537942291,.9996,.1249638445],normal:[-.4950219212,0,.8688804852],side:'R',weight:1,grip:1,effort:.33,lookWeight:.8};settle(closeDoor);
 const center=actor.pivot.worldToLocal(joint('Spine1')),elbow=actor.pivot.worldToLocal(joint('R_Forearm')),wrist=actor.pivot.worldToLocal(joint('R_Hand'));
 const forearmForward=(elbow.z+wrist.z)/2-center.z;
 assert.ok(forearmForward>.10,'A close crossing door handle must route the forearm in front of the torso, not back through it');
 measurements.push({case:'close crossing door',forearmForward});resetReach();
 pass('close crossing handle keeps the elbow and forearm in front of the torso');

 const far=input([-2,.7,3]);settle(far);
 assert.equal(actor.diagnostics.interaction.clamped,true);assert.ok(actor.diagnostics.interaction.contactDistance>1);
 for(const side of ['L','R'])for(let part=0;part<2;part++)close(lengths(side)[part],segmentLengths[side][part],1e-5,'Unreachable target never stretches a bone');
 resetReach();settle({...input([-.17,.9,.33]),target:[NaN,1,2]});assert.equal(actor.diagnostics.interaction.active,false);
 pass('unreachable and invalid targets remain bounded and finite');

 const right=input([-.17,.88,.33]),left=input([.17,.88,.33],'L');settle(right);let maximumStep=0,last={L:actor.getHandContactPosition('L'),R:actor.getHandContactPosition('R')};
 for(let i=0;i<100;i++){frame(left);for(const side of ['L','R']){const next=actor.getHandContactPosition(side);maximumStep=Math.max(maximumStep,next.distanceTo(last[side]));last[side]=next;}}
 assert.ok(maximumStep<.065,'Changing hands releases the old arm before reaching with the next');assert.equal(actor.diagnostics.interaction.side,'L');
 measurements.push({case:'hand change',maximumStep});pass('interrupted hand changes do not snap either wrist');
 console.log(JSON.stringify({passed:true,checks,measurements},null,2));
}finally{
 actor.dispose();T.TextureLoader.prototype.loadAsync=oldTextureLoad;GLTFLoader.prototype.loadAsync=oldModelLoad;
 if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
}
