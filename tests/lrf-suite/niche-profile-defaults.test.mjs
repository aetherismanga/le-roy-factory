import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {DEFAULT_ROOM,cloneRoom,makeRoom,validateRoom} from '../../shared/lrf-3d/room.js';
import {buildProfiles,updateAttachedProfile} from '../../shared/lrf-3d/profiles.js';
import {METAL_FINISHES} from '../../shared/lrf-3d/taps.js';
import {withDefaultNicheProfiles,nicheProfileEdges} from '../../shared/lrf-3d/niche-profile-options.js';
import {withNichePlacement} from '../../shared/lrf-3d/niche-placement.js';

const niche={id:'niche-defaults',wallKey:'boundary-0',u:160,bottom:100,width:60,height:40,depth:6};
const profileMeshes=group=>{const result=[];group.traverse(object=>{if(object.isMesh&&object.parent?.name.startsWith('Profile_niche_'))result.push(object);});return result;};
const dispose=group=>group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});

test('new niche captures each actual tap finish on four edges, uses its physical material and survives JSON restoration',()=>{
 for(const finish of METAL_FINISHES){
  const value=withDefaultNicheProfiles({...niche},finish.id),config={...cloneRoom(DEFAULT_ROOM),niches:[value]};
  assert.equal(value.profileEnabled,true);assert.equal(value.profileFinish,finish.id);
  assert.deepEqual(Object.values(value.profileEdges),Array(4).fill(finish.id));assert.equal(validateRoom(config,0),'');
  const restored=JSON.parse(JSON.stringify(config)),room=makeRoom(restored,0),profiles=buildProfiles(room,{enabled:false},room.walls.map(()=>({collection:'Peinture'})));
  const entries=profiles.entries.filter(entry=>entry.kind.startsWith('niche_'));
  assert.equal(entries.length,4);assert(entries.every(entry=>entry.enabled&&entry.color===finish.id));
  const meshes=profileMeshes(profiles.group);assert.equal(meshes.length,4);
  for(const mesh of meshes){assert.equal(mesh.material.color.getHexString(),new T.Color(finish.hex).getHexString());assert.equal(mesh.material.metalness,finish.metalness);assert.equal(mesh.material.roughness,finish.roughness);}
  room.dispose();dispose(profiles.group);
 }
});

test('explicit removal beats old overrides, restores without metal and permits one clicked edge to be enabled',()=>{
 const value={...withDefaultNicheProfiles({...niche},'Or brossé'),profileEnabled:false},config={...cloneRoom(DEFAULT_ROOM),niches:[value]},room=makeRoom(config,0),finishes=room.walls.map(()=>({collection:'Peinture'}));
 let profiles=buildProfiles(room,{},finishes);const ids=profiles.entries.filter(entry=>entry.kind.startsWith('niche_')).map(entry=>entry.id);dispose(profiles.group);
 const overrides=Object.fromEntries(ids.map(id=>[id,{enabled:true,color:'Noir'}]));
 profiles=buildProfiles(room,{enabled:true,overrides},finishes);assert.equal(profileMeshes(profiles.group).length,0);assert(profiles.entries.filter(entry=>entry.kind.startsWith('niche_')).every(entry=>!entry.enabled));dispose(profiles.group);
 const restored=makeRoom(JSON.parse(JSON.stringify(config)),0),again=buildProfiles(restored,{enabled:true,overrides},finishes);assert.equal(profileMeshes(again.group).length,0);dispose(again.group);restored.dispose();
 assert(updateAttachedProfile({room,config,finishes},ids[0],{enabled:true,color:'Cuivre'}));
 profiles=buildProfiles(room,{enabled:true,overrides},finishes);assert.equal(profileMeshes(profiles.group).length,1);assert.equal(profiles.entries.find(entry=>entry.id===ids[0]).color,'Cuivre');dispose(profiles.group);room.dispose();
});

test('legacy choices remain unchanged; an untouched inherited niche receives defaults only at validation',()=>{
 const legacy={...niche,profileEdges:{left:'Argent',right:'Noir',top:'Doré',bottom:'none'}};
 assert.equal(withDefaultNicheProfiles(legacy,'Cuivre',legacy),legacy);
 assert.deepEqual(nicheProfileEdges(legacy),legacy.profileEdges);
 const plain={...niche};assert.deepEqual(nicheProfileEdges(plain),{});const validated=withDefaultNicheProfiles(plain,'Cuivre',plain);assert.notEqual(validated,plain);assert.equal(plain.profileEnabled,undefined);assert.deepEqual(Object.values(validated.profileEdges),Array(4).fill('Cuivre'));
 assert.deepEqual(nicheProfileEdges({...legacy,profileEnabled:false}),{left:'none',right:'none',top:'none',bottom:'none'});
 assert.match(validateRoom({...cloneRoom(DEFAULT_ROOM),niches:[{...niche,profileFinish:'unlisted'}]},0),/Profilés/);
 assert.match(validateRoom({...cloneRoom(DEFAULT_ROOM),niches:[{...niche,profileEnabled:'yes'}]},0),/Profilés/);
});

class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.style={};this.listeners=new Map();this.hidden=false;const classes=new Set();this.classList={add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value)};}
 append(...children){this.children.push(...children);for(const child of children)child.parentElement=this;}
 setAttribute(){} addEventListener(type,callback){this.listeners.set(type,callback);}querySelector(){return null;}
 getBoundingClientRect(){return {left:0,top:0,right:1000,bottom:800,width:1000,height:800};}
}

test('the actual guide controller draws only an edited niche, clears on close/save/delete/restore and has no permanent toggle',()=>{
 const originalDocument=globalThis.document,originalWindow=globalThis.window;
 const document={head:new Element('head'),createElement:tag=>new Element(tag),createElementNS:()=>new Element(),querySelector:()=>null,addEventListener(){},dispatchEvent(){}},window={addEventListener(){}};
 globalThis.document=document;globalThis.window=window;
 const config={...cloneRoom(DEFAULT_ROOM),niches:[{...niche}]},room=makeRoom(config,0),scene=new T.Scene();scene.add(room.root);scene.updateMatrixWorld(true);
 const camera=new T.PerspectiveCamera();camera.position.copy(room.walls[0].group.localToWorld(new T.Vector3(1.6,1.2,2)));camera.updateMatrixWorld(true);
 const stage=new Element(),api={stage,canvas:new Element('canvas'),scene,camera,controls:{enabled:true,enableDamping:true,autoRotate:false,update(){}},getRoomConfig:()=>config,getRoom:()=>room,getComposition:()=>({locked:false,items:[]}),readonly:()=>false,invalidate(){},status(){},checkpoint(){}};
 try{
  const controller=withNichePlacement(api,()=>({showNiche(){},renderContext(){},updateVisibility(){},restore(){},getState:()=>({locked:false})}));
  controller.updateVisibility();assert.equal(controller.getNicheGuideState().count,0);assert.equal(stage.children.filter(child=>child.id==='toggle-niche-guides').length,0);
  api.onNicheEditingChange({id:niche.id});assert.equal(controller.getNicheGuideState().count,1);assert.equal(controller.getNicheGuideState().visible,1);
  api.onNicheEditingChange({id:null});assert.equal(controller.getNicheGuideState().count,0);
  api.onNicheEditingChange({id:niche.id});controller.restore({nicheGuidesVisible:true});assert.equal(controller.getNicheGuideState().count,0);assert.equal(controller.getNicheGuideState().editingId,null);
  assert.equal(Object.hasOwn(controller.getState(),'nicheGuidesVisible'),false);
  api.onNicheEditingChange({id:niche.id});room.walls[0].niches=[];config.niches=[];controller.updateVisibility();assert.equal(controller.getNicheGuideState().count,0);
 }finally{room.dispose();if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});
