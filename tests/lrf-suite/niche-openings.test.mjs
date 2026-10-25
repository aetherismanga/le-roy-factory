import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,cloneRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {allowsNicheUpdate,sameNichePosition} from '../../shared/lrf-3d/niche-editing.js';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {applySurfaceTextureMapping} from '../../shared/lrf-3d/surface-appearance.js';
import {applyTileColors} from '../../shared/lrf-3d/tile-colors.js';
import {mountRenovation} from '../../studio-one/src/renovation.js';

const finish={collection:'Creta',color:'avena',format:'60x120',groutColor:'Ivoire'};
const niche={id:'niche-recut',wallKey:'boundary-0',u:150,bottom:100,width:60,height:40,depth:6};
const configuration=()=>({...cloneRoom(DEFAULT_ROOM),niches:[structuredClone(niche)]});
const door={type:'door',settings:{width:83,height:204},dimensions:{width:.83,height:2.04},placement:{wall:0,u:300,height:0}};

test('opening cuts keep the same textured niche faces and native picking targets',()=>{
 const room=makeRoom(configuration(),0),wall=room.walls[0],faces=[...wall.nicheSurfaces],texture=new T.Texture({width:1200,height:600});
 for(const face of faces){face.material.map=texture;face.material.color.set('#5d7858');}
 const window={type:'window',settings:{width:50,height:40},dimensions:{width:.5,height:.4},placement:{wall:0,u:230,height:180}};
 for(const openings of [[door],[{...door,placement:{...door.placement,u:330}}],[door,window],[window],[]]){
  room.setOpenings(openings);
  assert.deepEqual(wall.nicheSurfaces,faces,'Adding/removing an opening must not recreate an unchanged niche');
  assert(wall.nicheSurfaces.every(face=>face.material.map===texture&&face.material.color.getHexString()==='5d7858'));
  room.root.updateMatrixWorld(true);
  const back=wall.nicheSurfaces.find(face=>face.nichePart==='back'),target=back.group.localToWorld(new T.Vector3(.3,.2,0));
  const camera=new T.PerspectiveCamera(45,1,.01,20);camera.position.copy(target).add(new T.Vector3(0,0,2));camera.lookAt(target);camera.updateProjectionMatrix();
  assert.equal(pickSelection(room.root,camera,new T.Vector2())?.editTarget,'niche:'+niche.id);
 }
 room.dispose();texture.dispose();
});

test('rebuilding a grouped niche disposes each old material once and keeps cached source textures',()=>{
 const room=makeRoom(configuration(),0),wall=room.walls[0],back=wall.nicheSurfaces[0];
 const source=new T.Texture({width:2400,height:600}),a=back.material,b=a.clone();let aDisposals=0,bDisposals=0,sourceDisposals=0;
 source.addEventListener('dispose',()=>sourceDisposals++);a.addEventListener('dispose',()=>aDisposals++);b.addEventListener('dispose',()=>bDisposals++);
 applySurfaceTextureMapping(a,{map:source,layout:{width:.6,height:.6},choice:{texturePhysicalSize:[2.4,.6]}});
 assert.notEqual(a.map,source,'Test exercises an owned UV crop clone');
 back.tiles.material=[a,b];back.paint.material=a;
 assert.doesNotThrow(()=>wall.setLayout({...wall.layout,x:17}));
 assert.equal(aDisposals,1);assert.equal(bDisposals,1);assert.equal(sourceDisposals,0);
 room.dispose();source.dispose();
});

class Element{
 constructor(tag='div',ids){this.tag=tag;this.ids=ids;this.children=[];this.attributes={};this.dataset={};this.style={};this.classList={add(){}};}
 set id(value){this._id=value;this.ids.set(value,this);}get id(){return this._id;}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
 setAttribute(key,value){this.attributes[key]=String(value);}after(){}
 querySelector(selector){if(selector.startsWith('#'))return this.ids.get(selector.slice(1));this.slots??={};return this.slots[selector]??=new Element(selector,this.ids);}
}

test('the real renovation controller repaints custom back/reveals after a layout recut and permits finish-only edits under the room lock',()=>{
 const previous=globalThis.document,ids=new Map(),body=new Element('body',ids),head=new Element('head',ids),primary=new Element('button',ids);primary.id='room-open';body.append(primary);
 globalThis.document={head,body,createElement:tag=>new Element(tag,ids),createTextNode:text=>({textContent:text}),querySelector:selector=>ids.get(selector.slice(1))||null};
 let config=configuration(),room=makeRoom(config,0),readonly=false,controller,commits=0;
 const composition={locked:false,items:[]},walls=DEFAULT_ROOM.points.map(()=>({...finish,zones:[],jointProfiles:[]}));
 const textures=new Map(['avena','caramello','fenix-blueberry'].map(color=>[color,new T.Texture({width:1200,height:600})]));
 const api={canvas:{addEventListener(){}},camera:null,controls:{enabled:true},stage:new Element('stage',ids),scene:new T.Scene(),getRoom:()=>room,getRoomConfig:()=>cloneRoom(config),getComposition:()=>composition,getWallFinish:index=>walls[index],getFloorFinish:()=>({...finish,zones:[],jointProfiles:[]}),getSelectedWall:()=>0,readonly:()=>readonly,status(){},wallLabel:index=>'Mur '+index,
  resetPartitionPositionUnlocks(){for(const value of config.niches||[])delete value.positionUnlocked;},
  applyRoom(next,_reset,_partition,id){if(composition.locked&&!allowsNicheUpdate(composition,config,next,id))return false;const candidate=makeRoom(next,0);room.dispose();room=candidate;config=cloneRoom(next);commits++;return true;},refresh(){controller?.sync();},invalidate(){},checkpoint(){},
  applySurface(surface,collection,color,value){const paint=material=>{material.color.set('#ffffff');material.userData.testColor=color;applySurfaceTextureMapping(material,{map:textures.get(color),layout:surface.layout});};paint(surface.material);applyTileColors(surface,{...value,collection,color},()=>{const material=surface.material.clone();paint(material);return material;});}
 };
 try{
  controller=mountRenovation(api);controller.sync();
  let value={...niche,covering:{mode:'split',back:{collection:'Allure',color:'fenix-blueberry',format:'60x120'},reveal:{...finish,color:'caramello'}}};controller.saveNiche(value);
  const wall=room.walls[0],before=wall.nicheSurfaces;
  assert(before.find(face=>face.nichePart==='back').tiles.geometry.userData.continuousDecor);
  controller.setLock(true);room.setOpenings([door]);
  let back=room.walls[0].nicheSurfaces.find(face=>face.nichePart==='back');assert(back.material.map);assert.equal(back.material.userData.testColor,'fenix-blueberry');
  room.walls[0].setLayout({...room.walls[0].layout,x:31,y:13,groutWidth:1.5});
  back=room.walls[0].nicheSurfaces.find(face=>face.nichePart==='back');assert(back.material.map,'Recreated lining must be painted immediately');assert.equal(back.material.userData.testColor,'fenix-blueberry');assert(back.tiles.geometry.userData.continuousDecor);
  for(const face of room.walls[0].nicheSurfaces.filter(face=>face.nichePart!=='back'))assert.equal(face.material.userData.testColor,'caramello');
  assert.equal(back.layout.x,31);assert.equal(back.layout.y,13);assert.equal(back.layout.groutWidth,1.5);
  value={...config.niches[0],covering:{mode:'all',back:{...finish,color:'avena'}}};controller.saveNiche(value);assert.equal(config.niches[0].covering.back.color,'avena');assert.equal(composition.locked,true);
  assert.throws(()=>controller.saveNiche({...config.niches[0],u:180}),/Déverrouillez/);
  controller.contextActions({editTarget:'niche:'+niche.id}).find(action=>action.label==='Déverrouiller').run();assert.equal(config.niches[0].positionUnlocked,true);assert.equal(composition.locked,true);
  controller.saveNiche({...config.niches[0],u:180});assert.equal(config.niches[0].u,180);
  const baseline=commits;readonly=true;assert.throws(()=>controller.saveNiche({...config.niches[0],u:190}),/commande est validée/);assert.equal(commits,baseline);
 }finally{room.dispose();textures.forEach(texture=>texture.dispose());if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('niche exceptions cannot alter room boundaries, another niche or a locked niche position',()=>{
 const current=configuration(),composition={locked:true};current.niches.push({...niche,id:'niche-other',u:260});
 const finishChange=cloneRoom(current);finishChange.niches[0].covering={mode:'all',back:{...finish}};
 assert(allowsNicheUpdate(composition,current,finishChange,niche.id));assert(sameNichePosition(current.niches[0],finishChange.niches[0]));
 const moved=cloneRoom(current);moved.niches[0].u=170;assert.equal(allowsNicheUpdate(composition,current,moved,niche.id),false);
 current.niches[0].positionUnlocked=true;moved.niches[0].positionUnlocked=true;assert(allowsNicheUpdate(composition,current,moved,niche.id));
 moved.points[0][0]=1;assert.equal(allowsNicheUpdate(composition,current,moved,niche.id),false);moved.points[0][0]=0;moved.niches[1].bottom=110;assert.equal(allowsNicheUpdate(composition,current,moved,niche.id),false);
 const removed=cloneRoom(current);removed.niches.splice(0,1);assert(allowsNicheUpdate(composition,current,removed,niche.id));
 const locked=cloneRoom(current);delete locked.niches[0].positionUnlocked;assert.equal(allowsNicheUpdate(composition,locked,removed,niche.id),false);
});
