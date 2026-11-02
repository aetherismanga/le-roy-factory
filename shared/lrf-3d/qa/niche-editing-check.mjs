import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,cloneRoom,DEFAULT_ROOM,validateRoom} from '../room.js';
import {buildProfiles,updateAttachedProfile} from '../profiles.js';
import {collectNicheFinishes,nicheSurfaceFinish} from '../niches.js';
import {mountRenovation} from '../../../studio-one/src/renovation.js';

const niche={id:'niche-acceptance',wallKey:'boundary-0',u:160,bottom:100,width:60,height:40,depth:6,
 covering:{mode:'split',back:{collection:'Creta',color:'avena',format:'60x120'},reveal:{collection:'Creta',color:'caramello',format:'60x120'}},
 profileEdges:{left:'Argent',right:'Noir',top:'Doré',bottom:'Bronze'}};
let config={...cloneRoom(DEFAULT_ROOM),niches:[niche]},room=makeRoom(config,0);
room.root.updateMatrixWorld(true);
const wall=room.walls[0];assert.equal(wall.nicheSurfaces.length,5);
assert.deepEqual(wall.nicheSurfaces.map(f=>f.nichePart).sort(),['back','bottom','left','right','top']);
for(const face of wall.nicheSurfaces){
 face.group.updateMatrixWorld(true);const points=face.tiles.geometry.attributes.position;
 for(let i=0;i<points.count;i++){
  const p=new T.Vector3().fromBufferAttribute(points,i);face.group.localToWorld(p);wall.group.worldToLocal(p);
  assert(p.z<=1e-7,`${face.nichePart}: no tile projects in front of the wall`);
  assert(p.z>=-.069,`${face.nichePart}: lining stays at the specified recess depth plus tile thickness`);
 }
 assert.equal(nicheSurfaceFinish(niche,face.nichePart,{}).color,face.nichePart==='back'?'avena':'caramello');
}
const saved=cloneRoom(config);saved.niches[0].covering.back.color='changed';saved.niches[0].profileEdges.left='none';
assert.equal(config.niches[0].covering.back.color,'avena','Cloning a room isolates nested niche finishes');
assert.equal(config.niches[0].profileEdges.left,'Argent');
assert.deepEqual(collectNicheFinishes(config).map(f=>f.color),['avena','caramello']);
assert.equal(collectNicheFinishes({...config,niches:[{...niche,covering:{mode:'all',back:niche.covering.back}}]}).length,1);
assert.match(validateRoom({...config,niches:[{...niche,profileEdges:{top:'invalid'}}]},0),/Profilés/);
const finishes=room.walls.map(()=>({collection:'Peinture',color:'white'}));
finishes[0].zones=[{id:'zone-column',x:220,y:0,width:40,height:260,profileEdges:{left:'Noir',right:'Doré',top:'none',bottom:'none'}}];
const profiles=buildProfiles(room,{enabled:false,editMode:true},finishes);
const nicheEdges=profiles.entries.filter(e=>e.kind.startsWith('niche_'));
assert.equal(nicheEdges.length,4);assert(nicheEdges.every(e=>e.enabled));
assert(Math.abs(nicheEdges.reduce((m,e)=>m+e.length,0)-2)<1e-8,'Niche profiles measure its 2 m perimeter');
const columnEdges=profiles.entries.filter(e=>e.kind.startsWith('colonne_carrelage_'));
assert.equal(columnEdges.length,2);assert.equal(columnEdges.filter(e=>e.enabled).length,2);
assert(columnEdges.every(e=>e.id.startsWith('zone-zone-column|')),'Tiled column edges have stable selectable targets');
profiles.group.updateMatrixWorld(true);
for(const child of profiles.group.children[0].children.filter(o=>o.userData.editTarget?.startsWith('niche:')))child.traverse(o=>{
 if(!o.isMesh||o.name==='Angle_selectionnable')return;const b=new T.Box3().setFromObject(o);assert(b.max.z<=-.2299,'Niche inlay metal remains behind the wall front');
});
room.dispose();

// Regression: an older clicked-edge override must not defeat a later dialog
// choice of "Sans profil" or a new colour, in either niche or tiled column.
const legacyConfig={...cloneRoom(DEFAULT_ROOM),niches:[{...cloneRoom({...cloneRoom(DEFAULT_ROOM),niches:[niche]}).niches[0],profileEdges:{}}]};
const legacyRoom=makeRoom(legacyConfig,0),legacyFinishes=legacyRoom.walls.map(()=>({collection:'Peinture',color:'white'}));
legacyFinishes[0].zones=[{id:'zone-regression',x:220,y:0,width:40,height:260,profile:false}];
const first=buildProfiles(legacyRoom,{},legacyFinishes),idsToTest=[first.entries.find(e=>e.kind==='niche_left').id,first.entries.find(e=>e.kind==='colonne_carrelage_left').id];
const legacySettings={overrides:Object.fromEntries(idsToTest.map(id=>[id,{enabled:true,color:'Noir'}]))};
const entry=(asset,id)=>asset.entries.find(e=>e.id===id);
let old=buildProfiles(legacyRoom,legacySettings,legacyFinishes);assert(idsToTest.every(id=>entry(old,id).enabled&&entry(old,id).color==='Noir'),'Untouched legacy overrides still render');
legacyConfig.niches[0].profileEdges.left='none';legacyRoom.walls[0].niches[0].profileEdges.left='none';legacyFinishes[0].zones[0].profileEdges={left:'none'};
let changed=buildProfiles(legacyRoom,legacySettings,legacyFinishes);assert(idsToTest.every(id=>!entry(changed,id).enabled),'Explicit dialog removal takes priority over stale global overrides');
legacyConfig.niches[0].profileEdges.left='Doré';legacyRoom.walls[0].niches[0].profileEdges.left='Doré';legacyFinishes[0].zones[0].profileEdges.left='Doré';
changed=buildProfiles(legacyRoom,legacySettings,legacyFinishes);assert(idsToTest.every(id=>entry(changed,id).enabled&&entry(changed,id).color==='Doré'),'Dialog colour takes priority over stale global overrides');
for(const id of idsToTest)assert(updateAttachedProfile({room:legacyRoom,config:legacyConfig,finishes:legacyFinishes},id,{enabled:true,color:'Bronze'}));
assert.equal(legacyConfig.niches[0].profileEdges.left,'Bronze','Clicked niche edge updates the exported project');
assert.equal(legacyRoom.walls[0].niches[0].profileEdges.left,'Bronze','Clicked niche edge updates runtime geometry');
assert.equal(legacyFinishes[0].zones[0].profileEdges.left,'Bronze','Clicked tiled-column edge updates the same data as its dialog');
changed=buildProfiles(legacyRoom,legacySettings,legacyFinishes);assert(idsToTest.every(id=>entry(changed,id).color==='Bronze'));
for(const id of idsToTest)assert(updateAttachedProfile({room:legacyRoom,config:legacyConfig,finishes:legacyFinishes},id,{enabled:false,color:'Bronze'}));
const persistedConfig=JSON.parse(JSON.stringify(legacyConfig)),persistedWalls=JSON.parse(JSON.stringify(legacyFinishes)),persistedRoom=makeRoom(persistedConfig,0),restoredProfiles=buildProfiles(persistedRoom,legacySettings,persistedWalls);
assert(idsToTest.every(id=>!entry(restoredProfiles,id).enabled),'Removed profiles remain absent after save/import even with old override data');
for(const id of idsToTest)assert(updateAttachedProfile({room:legacyRoom,config:legacyConfig,finishes:legacyFinishes},id,null));
assert.equal(legacyConfig.niches[0].profileEdges.left,undefined);assert.equal(legacyFinishes[0].zones[0].profileEdges.left,undefined);
assert.equal(updateAttachedProfile({room:legacyRoom,config:legacyConfig,finishes:legacyFinishes},'boundary-0|angle_interne|0|1',{enabled:true}),false,'Wall/partition profiles keep the standard override path');
legacyRoom.dispose();persistedRoom.dispose();

// Exercise the actual shared controller and project round-trip without a GPU.
const priorDocument=globalThis.document,ids=new Map();
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.style={};this.classList={add(){}};}
 set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
 append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
 setAttribute(k,v){this.attributes[k]=String(v);}after(){}
 querySelector(s){if(s.startsWith('#'))return ids.get(s.slice(1));this.slots??={};return this.slots[s]??=new Element(s);}
}
try{
 const body=new Element('body'),head=new Element('head'),primary=new Element('button');primary.id='room-open';body.append(primary);
 globalThis.document={head,body,createElement:t=>new Element(t),createTextNode:t=>({textContent:t}),querySelector:s=>ids.get(s.slice(1))||null};
 const listeners=new Map(),composition={locked:false,items:[]},walls=DEFAULT_ROOM.points.map(()=>({collection:'Creta',color:'avena',format:'60x120',zones:[],jointProfiles:[]}));
 config=cloneRoom(DEFAULT_ROOM);room=makeRoom(config,0);let readonly=false,controller,applied=[];
 const api={canvas:{addEventListener:(name,fn)=>listeners.set(name,fn)},camera:null,controls:{enabled:true},stage:new Element(),scene:new T.Scene(),
  getRoom:()=>room,getRoomConfig:()=>cloneRoom(config),getComposition:()=>composition,getWallFinish:i=>walls[i],getFloorFinish:()=>({collection:'Creta',color:'avena',zones:[],jointProfiles:[]}),getSelectedWall:()=>0,
  getNicheMetalFinish:()=> 'Cuivre',applyRoom(next){if(validateRoom(next,0))return false;room.dispose();config=cloneRoom(next);room=makeRoom(config,0);return true;},readonly:()=>readonly,status(){},wallLabel:i=>'Mur '+(i+1),
  refresh(){controller?.sync();},invalidate(){},checkpoint(){},applySurface(face,collection,color,finish){applied.push({part:face.nichePart,collection,color,finish});}};
 controller=mountRenovation(api);controller.saveNiche(niche);controller.sync();
 const rows=controller.quantities().rows.filter(e=>e.surface.nicheId);assert.equal(rows.length,5);
 assert.equal(rows.find(e=>e.surface.nichePart==='back').finish.color,'avena');assert(rows.filter(e=>e.surface.nichePart!=='back').every(e=>e.finish.color==='caramello'));
 assert(applied.some(e=>e.part==='top'&&e.color==='caramello'),'Separate reveal tile is actually passed to the material adapter');
 let actions=controller.contextActions({editTarget:'niche:'+niche.id});assert.equal(actions.length,4);
 actions.find(a=>a.label==='Verrouiller').run();assert(config.niches[0].locked);
 assert.throws(()=>controller.saveNiche({...config.niches[0],u:180}),/Déverrouillez/);
 actions=controller.contextActions({editTarget:'niche:'+niche.id});assert(actions.find(a=>a.label==='Supprimer').disabled);
 actions.find(a=>a.label==='Déverrouiller').run();controller.contextActions({editTarget:'niche:'+niche.id}).find(a=>a.label==='Dupliquer').run();
 assert.equal(config.niches.length,2);assert.equal(config.niches[1].covering.reveal.color,'caramello');assert.notEqual(config.niches[1].id,niche.id);
 controller.contextActions({editTarget:'niche:'+niche.id}).find(a=>a.label==='Supprimer').run();assert.equal(config.niches.length,1);
 const {profileEdges:legacyEdges,...unprofiled}=niche;controller.saveNiche({...unprofiled,id:'niche-auto-profiles',u:80});const installed=config.niches.find(n=>n.id==='niche-auto-profiles');
 assert.equal(installed.profileEnabled,true);assert.equal(installed.profileFinish,'Cuivre');assert.deepEqual(Object.values(installed.profileEdges),Array(4).fill('Cuivre'),'The actual creation controller captures the current tap finish on every edge');
 controller.saveNiche({...installed,profileEnabled:false});assert.equal(config.niches.find(n=>n.id===installed.id).profileEnabled,false);assert.equal(validateRoom(JSON.parse(JSON.stringify(config)),0),'');
 controller.contextActions({editTarget:'niche:'+installed.id}).find(a=>a.label==='Supprimer').run();assert.equal(config.niches.length,1);
 readonly=true;assert(controller.contextActions({editTarget:'niche:'+config.niches[0].id}).filter(a=>a.label!=='Configurer la niche et ses finitions').every(a=>a.disabled));
 const restored=JSON.parse(JSON.stringify(config));assert.equal(validateRoom(restored,0),'');const again=makeRoom(restored,0);assert.equal(again.walls[0].niches[0].covering.mode,'split');again.dispose();room.dispose();
}finally{if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}
console.log(JSON.stringify({passed:true,checks:['five recessed niche faces; no protruding top','deep-cloned finish and edge settings','independent back/reveal materials and quantity rows','four selectable niche edges and two vertical tiled-column profiles','real shared controller duplicate/lock/delete/read-only','project round-trip preserves split coverings','stale profile overrides cannot defeat dialog removal or colour; clicked edges share persisted fields']},null,2));
