import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import * as common from '../room.js';
import {makeOpening as makeCommonOpening} from '../openings.js';
import {createRoomEditor as createCommonEditor} from '../room-editor.js';

const suiteRoot=fileURLToPath(new URL('../../../',import.meta.url));
const studioSource=process.env.LRF_STUDIO_SOURCE?resolve(process.env.LRF_STUDIO_SOURCE):resolve(suiteRoot,'studio-one/src');
const generalSource=resolve(suiteRoot,'randal-general/src');
const apps=await Promise.all([studioSource,generalSource].map(async root=>({
 room:await import(pathToFileURL(resolve(root,'room.js'))),
 openings:await import(pathToFileURL(resolve(root,'openings.js'))),
 editor:await import(pathToFileURL(resolve(root,'room-editor.js'))),
 renovation:await import(pathToFileURL(resolve(root,'renovation.js')))
})));
for(const app of apps){
 for(const name of ['validateRoom','validatePartitions','polygonArea','roomMetrics','partitionGeometry','inside','tiledPolygonGeometry'])assert.equal(app.room[name],common[name],'Same geometry/validation function: '+name);
 assert.equal(app.openings.makeOpening,makeCommonOpening);
 assert.equal(app.editor.createRoomEditor,createCommonEditor,'One plan interaction controller');
}

const cases=[
 common.cloneRoom(common.DEFAULT_ROOM),
 {height:270,points:[[0,0],[500,0],[500,240],[280,240],[280,420],[0,420]]},
 {...common.cloneRoom(common.DEFAULT_ROOM),partitions:[{id:'divider',a:[250,80],b:[250,350],thickness:10,height:260,fullHeight:true}],plinthExclusions:{'boundary-0':[[20,50]]}},
 {...common.cloneRoom(common.DEFAULT_ROOM),niches:[{id:'niche-shared-check',wallKey:'boundary-2',u:160,width:60,height:40,bottom:100,depth:5}]}
];
function shape(room){
 return {points:room.points,height:room.height,metrics:room.metrics,plinthExclusions:room.plinthExclusions,
  floor:{polygon:room.floor.polygon,holes:room.floor.holes,positions:Array.from(room.floor.tiles.geometry.attributes.position.array)},
  walls:room.walls.map(w=>({key:w.key,length:w.length,height:w.height,openings:w.openings,positions:Array.from(w.tiles.geometry.attributes.position.array),nicheSurfaces:(w.nicheSurfaces||[]).map(s=>({width:s.length,height:s.height}))}))};
}
for(const config of cases){
 const rooms=apps.map(app=>app.room.makeRoom(config,0));
 assert.deepEqual(shape(rooms[0]),shape(rooms[1]),'Identical floor, walls, partitions, niches and measurements');
 const door={type:'door',placement:{wall:0,u:150,height:0},dimensions:{width:.83,height:2.04},settings:{width:83,height:204}};
 for(const room of rooms)room.setOpenings([door]);
 assert.deepEqual(shape(rooms[0]),shape(rooms[1]),'Identical opening cuts and floor topology');
 assert.equal(rooms[0].floor.tiles.receiveShadow,true,'Studio receives the same physical window daylight as General');
 assert.equal(rooms[1].floor.tiles.receiveShadow,true,'General existing daylight policy is preserved');
 for(const room of rooms)room.dispose();
}
for(const exclusions of [{'boundary-0':[[50,20]]},{'boundary-0':[[0,Infinity]]},{'boundary-0':[[0,1000001]]}]){
 for(const app of apps)assert.match(app.room.validateRoom({...common.cloneRoom(common.DEFAULT_ROOM),plinthExclusions:exclusions},0),/Exclusions de plinthes/);
}
for(const app of apps){
 const opening=app.openings.makeOpening('window',{width:120,height:100});const panes=[];
 opening.root.traverse(o=>{if(o.material?.userData?.architecturalGlass)panes.push(o);});
 assert.equal(panes.length,2);assert(panes.every(p=>p.castShadow===false),'Clear glass does not cast opaque daylight shadows');
 const geometries=new Set(),materials=new Set();opening.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
// Exercise the real cold-start lock control through both renovation adapters.
const priorDocument=globalThis.document;
try{for(const app of apps){
 const ids=new Map();
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.style={};this.classList={add(){}};}
  set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  setAttribute(key,value){this.attributes[key]=String(value);}after(){}
  querySelector(selector){if(selector.startsWith('#'))return ids.get(selector.slice(1));this.slots??={};return this.slots[selector]??=new Element(selector);}
 }
 const body=new Element('body'),head=new Element('head'),primary=new Element('button');primary.id='room-open';body.append(primary);
 globalThis.document={head,body,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelector:selector=>ids.get(selector.slice(1))||null};
 const room=app.room.makeRoom(common.DEFAULT_ROOM,0),composition={locked:false,items:[]},floor={collection:'Peinture',color:'white',zones:[],jointProfiles:[]};
 const walls=room.walls.map(()=>({collection:'Peinture',color:'white',zones:[],jointProfiles:[]}));let readonly=false;
 const controller=app.renovation.mountRenovation({canvas:{addEventListener(){}},camera:null,controls:{enabled:true},stage:new Element('div'),
  getRoom:()=>room,getComposition:()=>composition,getFloorFinish:()=>floor,getWallFinish:index=>walls[index],getSelectedWall:()=>0,
  readonly:()=>readonly,status(){},refresh(){},invalidate(){},checkpoint(){},applySurface(){}});
 const quick=ids.get('scene-position-lock');assert(quick.innerHTML.includes('<svg'),'Lock has a real icon on its first render');assert.equal(quick.attributes['aria-pressed'],'false');
 controller.setLock(true);assert.equal(composition.locked,true);assert.equal(quick.attributes['aria-pressed'],'true');assert(quick.attributes['aria-label'].includes('verrouillée'));
 controller.setLock(false);assert.equal(composition.locked,false);assert.equal(quick.attributes['aria-pressed'],'false');
 readonly=true;assert.equal(controller.setLock(true),false);assert.equal(composition.locked,false,'Read-only project remains unchanged');room.dispose();
}}finally{if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}

console.log(JSON.stringify({passed:true,roomCases:cases.length,checks:['one plan editor implementation','room geometry and measurements identical in both adapters','partition/niche/opening cuts identical','invalid plinth ranges rejected consistently','transparent glass shadows fixed','both application adapters receive physical window daylight','cold-start lock icon, toggle and read-only guard in both renovation adapters']},null,2));
