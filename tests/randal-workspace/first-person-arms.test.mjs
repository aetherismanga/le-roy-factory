import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFirstPersonArms} from '../../shared/lrf-3d/first-person-arms.js';
import {createResident} from '../../shared/lrf-3d/resident.js';
import {mountUltraVisitorAvatar} from '../../shared/lrf-3d/visitor-avatar.js';

const original={document:globalThis.document,texture:T.TextureLoader.prototype.loadAsync,model:GLTFLoader.prototype.loadAsync};
globalThis.document={hidden:false,createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const bytes=fs.readFileSync(new URL('../../shared/avatar/jerome-v1/resident.glb',import.meta.url));
GLTFLoader.prototype.loadAsync=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
T.TextureLoader.prototype.loadAsync=async()=>new T.Texture({width:64,height:64});
const profiles={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp'}}};
const renderer={capabilities:{getMaxAnisotropy:()=>8}};

async function rig(){const scene=new T.Scene(),actor=createResident(scene,renderer,{profiles});await actor.load('jerome');actor.place(new T.Vector3(0,0,.6),Math.PI);actor.setVisible(false);return {scene,actor};}

test('direct draw contains only real arm skin, never the head or torso, and follows the identical animated skeleton',async()=>{
 const {scene,actor}=await rig(),arms=createFirstPersonArms({scene,root:actor.getRoot()});
 try{
  assert.ok(arms.diagnostics().triangles>500,'Detailed fingers and arms are retained');
  assert.ok(arms.diagnostics().triangles<5000,'The direct draw does not duplicate a full body');
  const interaction={target:[-.14,.95,.15],normal:[0,0,1],side:'R',weight:1,grip:.75};
  for(let i=0;i<50;i++)actor.animate(1/60,{interaction});arms.update(actor.diagnostics.interaction);
  assert.equal(arms.group.visible,true);assert.equal(actor.pivot.visible,false);
  assert.equal(arms.group.userData.skipPicking,true);
  for(const mesh of arms.group.children){
   assert.equal(mesh.visible,mesh.name.startsWith('Bras_visite_R_'));assert.equal(mesh.userData.skipPicking,true);
   const source=actor.getRoot().getObjectByName(mesh.name.replace(/^Bras_visite_[LR]_/,''));
   assert.equal(mesh.skeleton,source.skeleton);assert.equal(mesh.material,source.material);assert.notEqual(mesh.geometry,source.geometry);
   assert.deepEqual(mesh.matrixWorld.toArray(),source.matrixWorld.toArray());
   const skin=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight'),side=mesh.name.startsWith('Bras_visite_R_')?'R':'L';
   for(let i=0;i<skin.count;i++){let armWeight=0;for(let j=0;j<skin.itemSize;j++)if(new RegExp('^Bip01_'+side+'_(UpperArm|Forearm|Hand|Finger)').test(mesh.skeleton.bones[skin.getComponent(i,j)].name))armWeight+=weights.getComponent(i,j);assert.ok(armWeight>=.5,'Every vertex is dominated by its real arm bones');}
  }
  assert.throws(()=>arms.withHidden(()=>{assert.equal(arms.group.visible,false);throw Error('capture');}),/capture/);assert.equal(arms.group.visible,true);
  for(let i=0;i<100;i++)actor.animate(1/60,{});arms.update(actor.diagnostics.interaction);assert.equal(arms.group.visible,false,'Arm settles out of view after release');
 }finally{arms.dispose();actor.dispose();}
});

test('disposing direct geometry never releases the shared body material, skeleton or textures',async()=>{
 const {scene,actor}=await rig(),arms=createFirstPersonArms({scene,root:actor.getRoot()});let released=0,geometries=0;
 const shared=new Set();actor.getRoot().traverse(o=>{if(!o.isMesh)return;shared.add(o.geometry);shared.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:[o.material]){shared.add(m);if(m.map)shared.add(m.map);}});
 for(const object of shared)object?.addEventListener?.('dispose',()=>released++);
 for(const mesh of arms.group.children)mesh.geometry.addEventListener('dispose',()=>geometries++);
 const expected=arms.group.children.length;arms.dispose();arms.dispose();assert.equal(released,0);assert.equal(geometries,expected);assert.equal(arms.group.parent,null);actor.dispose();
});

test('production wrapper suppresses direct arm meshes in reflected captures and disposes them when Ultra ends',async()=>{
 const scene=new T.Scene(),walk={active:true,position:new T.Vector3(0,1.55,.6),heading:Math.PI};let mode='max';
 const avatar=mountUltraVisitorAvatar({scene,renderer,walk,getQuality:()=>({mode})});avatar.sync();
 for(let i=0;i<100&&!avatar.ready;i++)await new Promise(resolve=>setImmediate(resolve));
 try{
  assert.equal(avatar.ready,true);const group=scene.getObjectByName('Jerome_bras_vue_visite');assert.ok(group);group.visible=true;
  avatar.withReflection(()=>{assert.equal(group.visible,false);assert.equal(scene.getObjectByName('Jerome_visiteur_Ultra_reflets').visible,true);});
  assert.equal(group.visible,true);assert.equal(scene.getObjectByName('Jerome_visiteur_Ultra_reflets').visible,false);
  mode='balanced';avatar.sync();assert.equal(group.parent,null);assert.equal(avatar.diagnostics().firstPersonArms.visible,false);
 }finally{avatar.dispose();}
});

test.after(()=>{T.TextureLoader.prototype.loadAsync=original.texture;GLTFLoader.prototype.loadAsync=original.model;if(original.document===undefined)delete globalThis.document;else globalThis.document=original.document;});
