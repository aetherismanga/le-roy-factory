import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {openingBathroomProject} from '../../shared/lrf-3d/opening-project.js';
import {DEFAULT_ROOM,makeRoom,validateRoom} from '../../shared/lrf-3d/room.js';
import {openingError,makeOpening} from '../../shared/lrf-3d/openings.js';
import {Composition as StudioComposition} from '../../studio-one/src/composition.js';
import {Composition as GeneralComposition} from '../../randal-general/src/composition.js';

const catalogue=JSON.parse(readFileSync(new URL('../../shared/lrf-3d/commercial-surfaces.json',import.meta.url))).products;
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} differs from ${b}`);
test('fresh opening scene resolves exact manufacturer SKUs and leaves the fourth wall painted',()=>{
 const p=openingBathroomProject();assert.deepEqual(p.room,DEFAULT_ROOM);assert.equal(validateRoom(p.room,0),'');
 for(const [f,reference,color] of [[p.floor,'04S6903','leccese'],...[0,1,2].map(i=>[p.walls[i],'04S6902','francese'])]){
  const product=catalogue.find(r=>r.key===f.catalogueKey);assert(product,'Default must name an actual commercial product');
  assert.equal(product.reference,reference);assert.equal(product.colorId,color);assert.equal(product.collection,'Stone Icon');assert.equal(product.format,'60x90');assert.equal(f.reference,reference);assert.equal(f.format,product.format);assert.equal(f.finish,product.finish);assert.equal(f.groutColor,'Beige');
 }
 assert.deepEqual(p.walls[3],{collection:'Peinture',color:'white',paintHex:'#eeeae0'});assert.equal(p.lighting,'day');assert.equal(p.brightness,84);assert.equal(p.temperature,4700);
});
test('floor and wall seams meet in physical scene coordinates rather than merely using identical offsets',()=>{
 const p=openingBathroomProject(),scene=makeRoom(p.room,0);
 try{
  scene.floor.group.updateWorldMatrix(true,false);scene.walls[0].group.updateWorldMatrix(true,false);
  const floor=p.layouts.floor,wall=p.layouts.walls[0];assert.equal(floor.direction,'horizontal');assert.equal(wall.direction,'horizontal');assert.equal(floor.pattern,'straight');assert.equal(wall.pattern,'straight');near(floor.width,.9);near(floor.height,.6);assert.equal(floor.groutWidth,wall.groutWidth);
  const seam=scene.floor.group.worldToLocal(scene.walls[0].group.localToWorld(new Vector3(wall.x/100,0,0)));
  const periods=(seam.x-floor.x/100)/floor.width;near(periods,Math.round(periods));assert.notEqual(floor.x,wall.x,'Centred floor and corner-based wall require different numeric origins');
 }finally{scene.dispose();}
});
test('only a right-hand wall-one window and a wall-four door fit both native composition engines',()=>{
 const p=openingBathroomProject();assert.deepEqual(p.items.map(i=>i.type).sort(),['door','window']);
 const window=p.items.find(i=>i.type==='window'),door=p.items.find(i=>i.type==='door');assert.equal(window.placement.wall,0);assert(window.placement.u>225);assert.equal(door.placement.wall,3);assert.equal(door.placement.height,0);
 for(const Composition of [StudioComposition,GeneralComposition]){
  const room=makeRoom(p.room,0),composition=new Composition(room),assets=[];
  try{for(const raw of p.items){assert.equal(openingError(raw.type,raw.settings.width,raw.settings.height),'');const asset=makeOpening(raw.type,raw.settings);assets.push(asset);const result=composition.add(raw.type,asset,raw.settings,raw.placement);assert(result.item,result.error);assert.deepEqual(result.item.placement,raw.placement);assert.equal(composition.validate(result.item,raw.placement),'');}assert.equal(composition.items.length,2);}
  finally{for(const asset of assets)asset.root.traverse(o=>{o.geometry?.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material?.dispose();});room.dispose();}
 }
});
test('independent fresh scenes cannot inherit edits to a prior project or shared preset arrays',()=>{
 const first=openingBathroomProject(),second=openingBathroomProject(),snapshot=structuredClone(second);first.room.points[0][0]=999;first.floor.zones.push({id:'rug'});first.walls[0].color='changed';first.layouts.walls[0].x=999;first.items[0].placement.u=1;first.profiles.walls.push(3);assert.deepEqual(second,snapshot);assert.deepEqual(openingBathroomProject(),snapshot);
});
