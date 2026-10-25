import assert from 'node:assert/strict';
import * as T from 'three';
import {newTiledZone} from '../tiled-zone-controls.js';
import {makeRoom,DEFAULT_ROOM} from '../room.js';
import {buildProfiles} from '../profiles.js';
import {mountRenovation} from '../../../studio-one/src/renovation.js';
import {renderZones,zoneProfileSegments} from '../../../studio-one/src/surface-zones.js';
import {normalizeLayout} from '../surface-catalog.js';
import commercialSurfaces from '../commercial-surfaces.json' with {type:'json'};

const room=makeRoom(DEFAULT_ROOM,0),finish={collection:'Creta',color:'avena',format:'60x120',zones:[],jointProfiles:[]},wall=room.walls[0];
wall.setLayout(normalizeLayout({direction:'horizontal'},'Creta','60x120','avena'));
assert.equal(newTiledZone(wall,finish).width,120);wall.setLayout({...wall.layout,direction:'vertical'});assert.equal(newTiledZone(wall,finish).width,60);wall.setLayout({...wall.layout,direction:'horizontal'});
{
 const product=commercialSurfaces.products.find(p=>p.collection==='Stone Icon'&&p.format==='60x60'&&p.finish.startsWith('Tumbled Grip'));
 assert(product,'Test uses a real selected manufacturer variant');
 const selected={collection:product.collection,color:product.colorId,format:product.format,catalogueKey:product.key,reference:product.reference,finish:product.finish,pack:{collection:product.collection,color:product.colorId,format:product.format,m2Box:product.packArea,pcsBox:product.packPieces,source:product.packSource}};
 const zone=newTiledZone(wall,selected);assert.equal(zone.width,60);for(const k of ['catalogueKey','reference','finish'])assert.equal(zone[k],selected[k],'A new band inherits the selected Tumbled Grip variant: '+k);assert.deepEqual(zone.pack,selected.pack);zone.pack.pcsBox=1;assert.equal(selected.pack.pcsBox,4,'Band packaging is an independent copy');
 const paint=newTiledZone(wall,{...selected,collection:'Peinture',color:'white'});assert.equal(paint.catalogueKey,undefined);assert.equal(paint.reference,undefined);assert.equal(paint.finish,undefined);assert.equal(paint.pack,undefined);
 const stale=newTiledZone(wall,{...selected,format:'nonexistent'});assert.equal(stale.catalogueKey,undefined);assert.equal(stale.reference,undefined);assert.equal(stale.pack,undefined,'A fallback format does not inherit a stale carton');
 const mismatched=newTiledZone(wall,{...selected,reference:'WRONG'});assert.equal(mismatched.catalogueKey,undefined,'An inconsistent commercial identity is not copied');
}
const previous={document:globalThis.document,Option:globalThis.Option,matchMedia:globalThis.matchMedia},ids=new Map();
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.style={};this.listeners=new Map();this.classes=new Set();this.classList={add:(...names)=>names.forEach(n=>this.classes.add(n)),remove:(...names)=>names.forEach(n=>this.classes.delete(n)),contains:n=>this.classes.has(n),toggle:(name,force)=>{const enabled=force??!this.classes.has(name);if(enabled)this.classes.add(name);else this.classes.delete(name);return enabled;}};this.value='';this.scrollTop=0;}
 set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
 append(...nodes){for(const n of nodes){n.parentElement?.removeChild?.(n);n.parentElement=this;this.children.push(n);}}
 removeChild(n){this.children=this.children.filter(c=>c!==n);n.parentElement=null;}
 prepend(...nodes){this.children.unshift(...nodes);for(const n of nodes)n.parentElement=this;}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 remove(){this.parentElement?.removeChild(this);if(ids.get(this.id)===this)ids.delete(this.id);}
 setAttribute(k,v){this.attributes[k]=String(v);}after(){}
 querySelector(s){if(s.startsWith('#'))return ids.get(s.slice(1));this.slots??={};return this.slots[s]??=new Element(s);}
 addEventListener(k,fn){this.listeners.set(k,fn);}
 getBoundingClientRect(){return {left:0,top:0,width:1000,height:700};}
 setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
}
const all=e=>[e,...(e.children||[]).flatMap(all)],get=(p,name)=>all(p).find(e=>e.name===name);
try{
 const body=new Element('body'),head=new Element('head'),primary=new Element('button'),rail=new Element('aside'),stage=new Element(),canvas=new Element('canvas');primary.id='room-open';rail.id='settings';body.append(primary,rail,stage);stage.append(canvas);
 const documentEvents=new EventTarget();globalThis.document={head,body,createElement:t=>new Element(t),createTextNode:t=>({textContent:t}),querySelector:s=>ids.get(s.slice(1))||null,addEventListener:documentEvents.addEventListener.bind(documentEvents),removeEventListener:documentEvents.removeEventListener.bind(documentEvents),dispatchEvent:documentEvents.dispatchEvent.bind(documentEvents)};globalThis.Option=function(text,value){const o=new Element('option');o.textContent=text;o.value=value;return o;};globalThis.matchMedia=()=>({matches:true});
 const scene=new T.Scene();scene.add(room.root);const camera=new T.PerspectiveCamera(42,1000/700,.02,100);camera.position.set(0,1.3,3);camera.lookAt(0,1.3,-.23);camera.updateMatrixWorld(true);room.updateCutaway(camera.position);
 const walls=room.walls.map(()=>({...finish,zones:[],jointProfiles:[]})),floor={...finish,zones:[],jointProfiles:[]},composition={locked:false,items:[]},controls={enabled:true};let checkpoints=0,readonly=false,controller;
 const api={canvas,camera,scene,stage,controls,getRoom:()=>room,getWallFinish:i=>walls[i],getFloorFinish:()=>floor,getComposition:()=>composition,getSelectedWall:()=>0,readonly:()=>readonly,status(){},wallLabel:i=>'Mur'+i,refresh(){controller.sync();},invalidate(){},checkpoint(){checkpoints++;},applySurface(){}};
 controller=mountRenovation(api);controller.showZone('wall');const panel=ids.get('tile-zone-editor');assert(panel);assert.equal(panel.parentElement,rail);assert(rail.classList.contains('zone-editor-open'));assert.equal(panel.attributes.role,'region');assert.equal(walls[0].zones[0].width,120);assert(!ids.get('renovation-dialog'),'Desktop editor never opens a blocking modal');
 assert.equal(get(panel,'profile-top'),undefined);assert.equal(get(panel,'profile-bottom'),undefined);assert.equal(ids.get('tile-zone-options').tag,'details');assert.equal(ids.get('tile-zone-options').open,undefined);
 get(panel,'width').value='90';get(panel,'width').oninput();assert.equal(walls[0].zones[0].width,90,'A valid dimension changes the real scene immediately');
 get(panel,'profile-right').value='Noir';get(panel,'profile-right').onchange();assert.equal(walls[0].zones[0].profileEdges.right,'Noir');
 const zones=walls[0].zones,id=zones[0].id;zones[0].reference='preserved-SKU';get(panel,'name').value='Ma colonne';get(panel,'name').oninput();assert.equal(walls[0].zones[0].reference,'preserved-SKU','Position and labels do not discard the selected commercial reference');
 scene.updateMatrixWorld(true);let diag=controller.getDiagnostics().zones.find(z=>z.id===id);const event=(name,p,id=1)=>{const e={type:name,pointerId:id,button:0,pointerType:'mouse',target:canvas,clientX:p.x,clientY:p.y,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};stage.listeners.get(name)(e);return e;};
 const before=walls[0].zones[0].x,beforeCheckpoint=checkpoints;assert(event('pointerdown',diag.screen).stopped);assert.equal(controls.enabled,false);event('pointermove',diag.moveRight50);assert.equal(walls[0].zones[0].x,before,'Drag preview does not mutate the saved project on each pixel');assert.equal(checkpoints,beforeCheckpoint);event('pointerup',diag.moveRight50);assert.equal(controls.enabled,true);assert(walls[0].zones[0].x>before+40);assert.equal(checkpoints,beforeCheckpoint+1,'One completed drag adds one history checkpoint');assert.equal(Number(get(panel,'x').value),walls[0].zones[0].x,'An open panel tracks the drop position');
 const moved=walls[0].zones[0].x;get(panel,'color').value='caramello';get(panel,'color').onchange();assert.equal(walls[0].zones[0].x,moved,'Changing a colour after dragging must not restore the previous X');assert.equal(walls[0].zones[0].reference,undefined,'Changing the product clears the old commercial identity');
 // A cancelled drag restores both the mesh and the data, and has no history entry.
 scene.updateMatrixWorld(true);diag=controller.getDiagnostics().zones.find(z=>z.id===id);const c=checkpoints;event('pointerdown',diag.screen);event('pointermove',diag.moveRight50);event('pointercancel',diag.moveRight50);assert.equal(walls[0].zones[0].x,moved);assert.equal(checkpoints,c);assert.equal(controls.enabled,true);
 const invalid={...walls[0].zones[0],id:'zone-overlap',x:moved+20};assert.throws(()=>controller.saveZone('wall',0,invalid),/superposer/);
 walls[0].zones[0].locked=true;scene.updateMatrixWorld(true);diag=controller.getDiagnostics().zones.find(z=>z.id===id);assert(!event('pointerdown',diag.screen).stopped);assert.throws(()=>controller.saveZone('wall',0,{...walls[0].zones[0],x:20}),/Déverrouillez/);walls[0].zones[0].locked=false;
 readonly=true;assert.throws(()=>controller.saveZone('wall',0,{...walls[0].zones[0],x:20}),/validée/);readonly=false;
 controller.restore({locked:false});assert.equal(ids.get('tile-zone-editor'),undefined);assert(!rail.classList.contains('zone-editor-open'),'Closing/restoring returns the ordinary rail');
 // Context actions close any live editor and detached controls can never
 // revive deleted data, overwrite a later edit, or bypass a new lock.
 controller.showZone('wall',0,id);let staleWidth=get(ids.get('tile-zone-editor'),'width');const lockedWidth=walls[0].zones[0].width;
 controller.contextActions({editTarget:'zone:'+id}).find(a=>a.label==='Verrouiller').run();assert.equal(ids.get('tile-zone-editor'),undefined);assert(walls[0].zones[0].locked);staleWidth.value='70';staleWidth.oninput();assert.equal(walls[0].zones[0].width,lockedWidth);
 controller.showZone('wall',0,id);staleWidth=get(ids.get('tile-zone-editor'),'width');assert(staleWidth.disabled);controller.contextActions({editTarget:'zone:'+id}).find(a=>a.label==='Déverrouiller').run();assert.equal(ids.get('tile-zone-editor'),undefined);staleWidth.value='70';staleWidth.oninput();assert.equal(walls[0].zones[0].width,lockedWidth,'Detached controls remain inert after unlocking');
 controller.showZone('wall',0,id);const deletedSnapshot=structuredClone(walls[0].zones[0]);staleWidth=get(ids.get('tile-zone-editor'),'width');controller.contextActions({editTarget:'zone:'+id}).find(a=>a.label==='Supprimer').run();assert.equal(ids.get('tile-zone-editor'),undefined);assert.equal(walls[0].zones.length,0);staleWidth.value='70';staleWidth.oninput();assert.equal(walls[0].zones.length,0,'A detached editor cannot recreate a deleted zone');
 controller.saveZone('wall',0,deletedSnapshot);controller.showZone('wall',0,id);staleWidth=get(ids.get('tile-zone-editor'),'width');walls[0].zones=[];staleWidth.value='75';staleWidth.oninput();assert.equal(walls[0].zones.length,0,'Missing IDs are guarded even when deletion bypassed the panel close path');assert.equal(ids.get('tile-zone-editor'),undefined);
 controller.saveZone('wall',0,deletedSnapshot);scene.updateMatrixWorld(true);diag=controller.getDiagnostics().zones.find(z=>z.id===id);event('pointerdown',diag.screen);event('pointermove',diag.moveRight50);const atRestore=checkpoints;controller.restore({locked:false});assert.equal(controls.enabled,true);assert.equal(canvas.capture,null);event('pointerup',diag.moveRight50);assert.equal(checkpoints,atRestore,'A restore cancels a pending renovation drag before its later pointerup');assert.equal(walls[0].zones[0].x,deletedSnapshot.x);
 const old={...walls[0].zones[0],profile:true,profileColor:'Argent',profileEdges:{top:'Noir',bottom:'Doré'}};walls[0].zones=[old];const trims=buildProfiles(room,{enabled:false},walls),columnEdges=trims.entries.filter(p=>p.kind.startsWith('colonne_carrelage_'));assert.deepEqual(columnEdges.map(p=>p.kind).sort(),['colonne_carrelage_left','colonne_carrelage_right']);assert(columnEdges.every(p=>p.enabled));assert(Math.abs(trims.metres-old.height/50)<1e-7,'Legacy full-perimeter columns count only their two uprights');
 const floorTrim=zoneProfileSegments(room.floor,[{id:'zone-rug',x:-100,y:-200,width:50,height:80,profile:true,profileColor:'Noir'}]);assert.equal(floorTrim.length,4,'Floor tile rugs retain all four perimeter profiles');
 // Material-only updates must retain the existing cell geometry and holes.
 const shape={id:'zone-reuse',x:20,y:0,width:120,height:260,collection:'Creta',color:'avena'},layout=z=>normalizeLayout({direction:'horizontal'},z.collection,'60x120',z.color);renderZones(wall,[shape],()=>{},layout);const face=wall.decorativeZones[0],geometry=face.tiles.geometry,wallGeometry=wall.tiles.geometry;renderZones(wall,[{...shape,color:'caramello',profile:true}],()=>{},layout);assert.equal(wall.decorativeZones[0],face);assert.equal(face.tiles.geometry,geometry);assert.equal(wall.tiles.geometry,wallGeometry);assert.equal(face.zone.color,'caramello');
 console.log(JSON.stringify({passed:true,checks:['physical selected-tile default width in both orientations and exact Tumbled Grip SKU/carton inheritance','desktop right rail without modal or hidden viewport','live dimensions and commercial-identity preservation','immediate left-button drag and a single checkpoint','open editor follows drop before later colour edits','cancel/lock/read-only/collision guards; deleted or detached editors cannot resurrect zones; restore cancels pending drags','legacy wall trims vertical only; floor rugs retain four sides','material-only updates reuse tile and wall geometry']}));
}finally{for(const [k,v]of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;room.dispose();}
