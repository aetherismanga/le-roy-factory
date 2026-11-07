import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,DEFAULT_ROOM} from '../shared/lrf-3d/room.js';
import {newTiledZone} from '../shared/lrf-3d/tiled-zone-controls.js';
import {normalizeLayout} from '../shared/lrf-3d/surface-catalog.js';
import {mountRenovation} from '../studio-one/src/renovation.js';
import commercialSurfaces from '../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
import {createVisualChoiceDOM,descendants,fire} from './helpers/visual-choice-dom.mjs';

const exactImage='https://leroyfactory.fr/assets/img/lrf-plan-pose/faces/elios-20261102/stone-icon/04S6902_2.jpg';
const find=(root,key,value)=>descendants(root).find(element=>element.dataset?.[key]===value);
const snapshot=value=>structuredClone(value);
const geometry=value=>Object.fromEntries(['x','y','width','height','direction','pattern','locked','positionUnlocked'].map(key=>[key,value[key]]));

function fixture(kind){
 const dom=createVisualChoiceDOM(),{document,element}=dom;
 const section=element('section'),primary=element('button'),rail=element('aside'),stage=element('div'),canvas=element('canvas');
 primary.id='room-open';rail.id='settings';section.append(primary);document.body.append(section,rail,stage);stage.append(canvas);
 const room=makeRoom(DEFAULT_ROOM,0),product=commercialSurfaces.products.find(product=>product.reference==='04S6902');assert(product);
 const finish={collection:'Stone Icon',color:'francese',format:'60x90',catalogueKey:product.key,reference:product.reference,finish:product.finish,zones:[],jointProfiles:[]};
 const walls=room.walls.map(()=>({...finish,zones:[],jointProfiles:[]})),floor={...finish,zones:[],jointProfiles:[]},surface=kind==='floor'?room.floor:room.walls[0],target=kind==='floor'?floor:walls[0];
 surface.setLayout(normalizeLayout({direction:'horizontal'},finish.collection,finish.format,finish.color));
 target.zones=[{...newTiledZone(surface,finish,kind),id:'test-'+kind,locked:false}];
 const scene=new T.Scene();scene.add(room.root);const camera=new T.PerspectiveCamera(42,1000/700,.02,100);camera.position.set(0,1.3,3);camera.lookAt(0,1.3,-.23);camera.updateMatrixWorld(true);
 const composition={locked:false,items:[]},controls={enabled:true};let checkpoints=0,readonly=false,controller;
 const api={canvas,camera,scene,stage,controls,getRoom:()=>room,getWallFinish:index=>walls[index],getFloorFinish:()=>floor,getComposition:()=>composition,getSelectedWall:()=>0,readonly:()=>readonly,status(){},wallLabel:index=>'Mur '+(index+1),refresh(){controller.sync();},invalidate(){},checkpoint(){checkpoints++;},applySurface(){}};
 controller=mountRenovation(api);controller.sync();controller.showZone(kind,0,target.zones[0].id);
 const panel=document.getElementById('tile-zone-editor');assert(panel,'The real compact editor opens');
 return {document,controller,panel,target,composition,readonly:value=>{readonly=value;controller.sync();},checkpoints:()=>checkpoints,widget:name=>{const value=find(panel,'zoneVisual',name);assert(value,'Illustrated '+name+' control exists');return value;},cleanup(){controller.restore({locked:false},{sync:false});room.dispose();dom.restore();}};
}

for(const kind of ['wall','floor']){
 test(kind+' tiled-zone preview uses the saved SKU and never changes the saved scene',()=>{
  const h=fixture(kind);
  try{
   const before=snapshot(h.target.zones),count=h.checkpoints(),widget=h.widget('color'),native=descendants(h.panel).find(element=>element.tagName==='SELECT'&&element.name==='color');
   assert.equal(native.value,'francese');assert.equal(native.hidden,true,'The original name/value contract remains available behind the illustrated control');
   assert.equal(widget.querySelector('img').src,exactImage,'The current 60 × 90 Tumbled reference uses its real 04S6902 face');
   assert.match(widget.textContent,/04S6902/,'The preview identifies the actual selected SKU');
   const photo=find(widget,'visualChoicePreview','current');assert(photo);
   fire(photo,'pointerenter',{pointerType:'mouse'});const hover=find(h.document.body,'visualHover','true');assert(hover,'Mouse hover exposes a contextual image');assert.equal(hover.querySelector('img').src,exactImage);
   fire(photo,'pointerleave',{pointerType:'mouse'});assert.equal(find(h.document.body,'visualHover','true'),undefined);
   photo.click();const modal=find(h.document.body,'visualPreview','true');assert(modal,'A separate tap opens the enlarged preview');assert.equal(modal.querySelector('img').src,exactImage);modal.querySelector('button').click();
   assert.deepEqual(h.target.zones,before,'Hovering, opening and closing a photo never saves another material or geometry');assert.equal(h.checkpoints(),count,'Previewing adds no undo history entry');
  }finally{h.cleanup();}
 });

 test(kind+' tiled-zone illustrated colour applies its exact value and removes the previous SKU only on selection',()=>{
  const h=fixture(kind);
  try{
   const before=snapshot(h.target.zones[0]),count=h.checkpoints(),widget=h.widget('color');find(widget,'visualChoiceTrigger','true').click();
   const popup=find(h.document.body,'visualChoicePopup','true');assert(popup);const preview=find(popup,'visualChoicePreview','leccese'),choice=find(popup,'visualChoiceValue','leccese');assert(preview);assert(choice);
   preview.click();const modal=find(h.document.body,'visualPreview','true');assert(modal);assert.equal(modal.querySelector('img').src,'https://leroyfactory.fr/assets/img/lrf-plan-pose/faces/elios-20261102/stone-icon/04S6903_4.jpg','The candidate colour uses its verified Leccese face for this format');assert.doesNotMatch(modal.textContent,/04S6902/,'An unselected colour never borrows the current SKU');modal.querySelector('button').click();
   assert.deepEqual(h.target.zones,[before]);assert.equal(h.checkpoints(),count);
   choice.click();const saved=h.target.zones[0];assert.equal(saved.color,'leccese');assert.equal(saved.collection,'Stone Icon');assert.equal(saved.format,'60x90');assert.equal(saved.reference,undefined);assert.equal(saved.catalogueKey,undefined,'A colour change clears the previous commercial identity');
   assert.deepEqual(geometry(saved),geometry(before),'Selecting a material leaves position, dimensions and lock state unchanged');assert.equal(h.checkpoints(),count+1,'One explicit colour selection saves one history entry');assert.doesNotMatch(h.widget('color').textContent,/04S6902/);
  }finally{h.cleanup();}
 });

 test(kind+' tiled-zone lock and read-only rules also disable the illustrated material controls',()=>{
  const h=fixture(kind);
  try{
   h.target.zones[0].locked=true;h.controller.sync();const before=snapshot(h.target.zones),count=h.checkpoints();
   for(const name of ['collection','color']){const trigger=find(h.widget(name),'visualChoiceTrigger','true');assert.equal(trigger.disabled,true);trigger.click();}
   assert.equal(find(h.document.body,'visualChoicePopup','true'),undefined);assert.deepEqual(h.target.zones,before);assert.equal(h.checkpoints(),count);
   h.target.zones[0].locked=false;h.readonly(true);for(const name of ['collection','color'])assert.equal(find(h.widget(name),'visualChoiceTrigger','true').disabled,true);
   assert.equal(h.checkpoints(),count);
  }finally{h.cleanup();}
 });
}
