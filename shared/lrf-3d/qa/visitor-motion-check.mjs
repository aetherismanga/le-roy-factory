import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createVisitorMotionSampler} from '../visitor-avatar.js';
import {createResident} from '../resident.js';

const sampler=createVisitorMotionSampler();
sampler.reset({x:0,z:0},0);
const walk=sampler.sample({x:0,z:.05},0,1/30,{running:true});
assert.equal(walk.moving,true);assert.equal(walk.running,false);
assert.ok(Math.abs(walk.speed-1.5)<1e-9);assert.equal(walk.directionZ,1);
const blocked=sampler.sample({x:0,z:.05},0,1/30,{running:true});
assert.equal(blocked.moving,false);assert.equal(blocked.distance,0);assert.equal(blocked.speed,0);
const relocation=sampler.sample({x:3,z:4},0,1/30);
assert.equal(relocation.moving,false);assert.equal(relocation.distance,0);
sampler.reset({x:0,z:0},Math.PI-.02);
const turn=sampler.sample({x:0,z:0},-Math.PI+.02,.05);
assert.ok(Math.abs(turn.heading-(Math.PI-.02))<.03,'Crossing ±pi takes the short turn');
assert.ok(Math.abs(turn.headYaw)<.05);
sampler.reset({x:0,z:0},0);
const sideways=sampler.sample({x:.05,z:0},0,1/30);
assert.equal(sideways.directionX,1);assert.equal(sideways.directionZ,0);
const backwards=sampler.sample({x:.05,z:-.05},0,1/30);
assert.equal(backwards.directionZ,-1);

const originalDocument=globalThis.document,originalTextureLoad=T.TextureLoader.prototype.loadAsync,originalModelLoad=GLTFLoader.prototype.loadAsync;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const bytes=fs.readFileSync(new URL('../../avatar/jerome-v1/resident.glb',import.meta.url));
const parse=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
GLTFLoader.prototype.loadAsync=parse;
T.TextureLoader.prototype.loadAsync=async()=>new T.Texture({width:1254,height:1254});
const profiles={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp'}}};
const renderer={capabilities:{getMaxAnisotropy:()=>8}};
const make=()=>createResident(new T.Scene(),renderer,{profiles});
const a=make(),b=make();
try{
 await Promise.all([a.load('jerome'),b.load('jerome')]);
 a.place(new T.Vector3(0,0,0),0);b.place(new T.Vector3(0,0,0),0);
 for(let i=0;i<30;i++)a.animate(1/30,{moving:true,speed:1.5,distance:1.5/30,directionX:0,directionZ:1});
 for(let i=0;i<60;i++)b.animate(1/60,{moving:true,speed:1.5,distance:1.5/60,directionX:0,directionZ:1});
 assert.ok(Math.abs(a.diagnostics.gaitPhase-b.diagnostics.gaitPhase)<1e-9,'Stride cadence follows travelled distance at 30 and 60 fps');
 const phase=a.diagnostics.gaitPhase;
 for(let i=0;i<24;i++)a.animate(1/30,{moving:true,speed:0,distance:0,directionX:0,directionZ:1});
 assert.equal(a.diagnostics.gaitPhase,phase,'Input intent cannot advance gait while collision blocks displacement');
 assert.equal(a.diagnostics.gesture,'idle');assert.ok(a.diagnostics.gaitBlend<.001,'The last stride eases to rest');
 const root=a.getRoot();root.updateMatrixWorld(true);
 const p=name=>root.worldToLocal(root.getObjectByName('Bip01_'+name).getWorldPosition(new T.Vector3()));
 for(const side of ['L','R']){
  const shoulder=p(side+'_UpperArm'),elbow=p(side+'_Forearm'),hand=p(side+'_Hand');
  assert.ok(shoulder.y>elbow.y&&elbow.y>hand.y,'Relaxed arms hang down with elbow above hand');
  assert.ok(Math.abs(hand.x)<Math.abs(shoulder.x)+10,'Arms stay close to the torso');
 }
 for(let i=0;i<180;i++)a.animate(1/60,{moving:i<60,speed:i<60?1.5:0,distance:i<60?1.5/60:0,directionX:1,directionZ:0,headYaw:.3});
 root.updateMatrixWorld(true);root.traverse(o=>{
  assert.ok([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite),'Every joint stays finite through strafe, stop and head turn');
 });
 assert.ok(a.diagnostics.bones>70,'The acceptance run uses the actual personalized facial/hand rig');
 // B is at t=1 second. Exercise the real facial blend shapes at the next blink.
 for(let i=0;i<12;i++)b.animate(.2,{moving:false,speed:0,distance:0});
 b.animate(.01,{moving:false,speed:0,distance:0});
 let closed=false;b.getRoot().traverse(o=>{for(const [name,index]of Object.entries(o.morphTargetDictionary||{}))if(/EyeBlink/.test(name)&&o.morphTargetInfluences[index]>.8)closed=true;});
 assert.ok(closed,'The actual facial blend shapes blink naturally');
 console.log(JSON.stringify({passed:true,checks:['measured displacement and blocked input','run threshold','teleport correction','shortest-angle neck/body turn','backward and sideways direction','actual rig cadence independent of frame rate','idle easing at obstacles','relaxed arm geometry','finite real facial and hand rig']},null,2));
}finally{
 a.dispose();b.dispose();T.TextureLoader.prototype.loadAsync=originalTextureLoad;GLTFLoader.prototype.loadAsync=originalModelLoad;
 if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
}
