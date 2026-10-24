import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {LEGACY_FORMATS,LEGACY_FINISHES,LEGACY_MIRRORS,convertLegacyRecord,recoveryItemDimensions,encodeRecoveredProject} from '../../assets/js/studio-one/legacy-recovery-converter.mjs';
import {CABINET_FORMATS,validWidth,topAvailable} from '../../studio-one/src/configuration.js';
import {FINISHES} from '../../studio-one/src/finishes.js';
import {MIRRORS,mirrorSpec} from '../../studio-one/src/mirrors.js';
import {validateProject,migrateProject,decodeProject} from '../../studio-one/src/projects.js';
import {basinEntry,basinReference,VESSEL_COLORS} from '../../studio-one/src/basins.js';
import {Composition,itemDimensions} from '../../studio-one/src/composition.js';
import {canonicalPoints,validateRoom} from '../../studio-one/src/room.js';
import {INTEGRATED_BASINS} from '../../shared/lrf-3d/integrated-basins.js';
import {normalizeProjectSurfaceIdentities} from '../../shared/lrf-3d/surface-identity.mjs';

// Geometry/reference fixtures only. No legacy purchase catalogue is imported.
const clone=value=>JSON.parse(JSON.stringify(value));
const nearly=(actual,expected,label)=>assert(Math.abs(actual-expected)<1e-8,label||'Geometry dimension must agree with the active engine');
const cabinet=(patch={})=>({id:'cabinet-test',kind:'cabinet',model:0,width:80,finish:'ROBLE',option:'top',sink:null,accessories:[],open:false,position:{x:0,y:28,z:0},...patch});
const column=(patch={})=>({id:'column-test',kind:'column',model:0,finish:'ROBLE',option:'bare',accessories:[],open:false,doorSide:'left',position:{x:0,y:18,z:-9.5},...patch});
const mirror=(patch={})=>({id:'mirror-test',kind:'mirror',model:0,finish:'ROBLE',option:'bare',accessories:[],open:false,mirror:'Basic',mirrorSize:'60 × 80 cm',mirrorFinish:'Noir',mirrorRotated:false,ledOn:false,position:{x:0,y:130,z:-23},...patch});
const tile=()=>({collection:'elios-creta',color:'avena',format:'60x60',orientation:'horizontal',layout:'straight',groutWidth:2,groutColor:'#ded5c1'});
const record=(items=[cabinet()])=>({name:'Pièce récupérée — test',client:'Client synthétique',date:'2026-10-24T12:00:00Z',data:{version:2,items},ambience:{room:{width:4.5,depth:4.5,height:2.6},floor:tile(),wall:tile(),floorOrientation:'horizontal',wallOrientation:'horizontal'}});

function nativeRoom(room){
 const points=canonicalPoints(room.points),height=room.height/100;
 const walls=points.map((a,index)=>{
  const b=points[(index+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  return {height,length,start:new T.Vector3(a[0],0,a[1]-.23),normal:new T.Vector3(-dz/length,0,dx/length),group:{rotation:{y:-Math.atan2(dz,dx)}}};
 });
 return {points,height,walls,partitions:[]};
}
function assertNative(project){
 assert.equal(validateProject(project),project);assert.equal(validateRoom(project.room,0),'');
 assert.deepEqual(migrateProject(project),project,'Modern version 2 never takes the older bathroom migration path');
 const canonical=normalizeProjectSurfaceIdentities(project);assert.equal(canonical.floor.collection,'Creta');assert.equal(canonical.floor.color,'avena');
 const room=nativeRoom(project.room),composition=new Composition(room),items=project.items.map(item=>({...item,dimensions:itemDimensions(item.type,item.settings)}));
 for(const item of items){
  assert.equal(composition.validate(item,item.placement,item.dimensions,items),'','Accepted recovered item must pass the active Composition validator');
  const adapter=recoveryItemDimensions(item);for(const key of ['width','height','depth'])nearly(adapter[key],item.dimensions[key]*100);
  if(item.type==='cabinet'){
   assert(validWidth(item.settings.width));assert(topAvailable(item.settings.top,item.settings.width));assert(FINISHES.some(f=>f.id===item.settings.finish));
   if(['sella','tampa'].includes(item.settings.top))assert(basinEntry(item.settings.top,item.settings.basinColor,item.settings.width,item.settings.format,item.settings.basinLayout));
  }
 }
 return project;
}
function accepted(input){
 const before=JSON.stringify(input),result=convertLegacyRecord(input);assert.equal(result.ok,true,result.notes.join(' '));assert.equal(JSON.stringify(input),before,'Conversion never mutates the source');
 return assertNative(result.project);
}
function rejected(input,reason){
 const before=JSON.stringify(input),result=convertLegacyRecord(input);assert.equal(result.ok,false,'Unsafe/inexact conversion must fail');assert.equal(result.project,null);assert(result.notes.length);
 if(reason)assert.match(result.notes.join(' '),reason);assert.equal(JSON.stringify(input),before,'Failed conversion leaves all original fields intact');
}

test('legacy format/finish/mirror metadata agrees with active Studio One IDs and dimensions',()=>{
 assert.deepEqual(LEGACY_FORMATS.map(f=>f.id),CABINET_FORMATS.map(f=>f.id));
 LEGACY_FORMATS.forEach((form,index)=>{nearly(form.height,CABINET_FORMATS[index].height*100);assert.equal(form.drawers,CABINET_FORMATS[index].drawers);});
 assert.deepEqual([...LEGACY_FINISHES].sort(),FINISHES.map(f=>f.id).sort());
 assert.deepEqual(Object.values(LEGACY_MIRRORS).map(m=>m.id).sort(),MIRRORS.map(m=>m.id).sort());
 for(const legacy of Object.values(LEGACY_MIRRORS)){const active=MIRRORS.find(m=>m.id===legacy.id);assert.deepEqual(legacy.sizes,active.sizes.map(size=>size.slice(0,2)));}
});

test('all four models, every integer width 40–120 and all eight finishes convert and pass the native engine',()=>{
 let count=0;
 for(let model=0;model<4;model++)for(let width=40;width<=120;width++)for(const finish of LEGACY_FINISHES){
  const old=cabinet({model,width,finish:finish==='BISC'?'BISC.':finish,open:width%2===0,position:{x:0,y:model===1?0:28,z:0}}),project=accepted(record([old])),item=project.items[0];
  assert.equal(item.settings.format,CABINET_FORMATS[model].id);assert.equal(item.settings.width,width);assert.equal(item.settings.finish,finish);assert.equal(item.settings.top,'plain');
  assert.deepEqual(item.settings.drawers,Array(CABINET_FORMATS[model].drawers).fill(old.open?1:0));assert.deepEqual(item.placement,{wall:0,u:225,height:old.position.y,offset:1.5});count++;
 }
 assert.equal(count,2592);
});

test('bare and plain plans remain distinct and never acquire an invented sink',()=>{
 for(const [option,top] of [['bare','bare'],['top','plain']]){const project=accepted(record([cabinet({option})]));assert.equal(project.items[0].settings.top,top);assert.equal(project.items[0].settings.tap,null);}
 rejected(record([cabinet({option:'bare',sink:{model:'Sella',color:'gloss',layout:'single'}})]),/sans plateau/);
 rejected(record([cabinet({option:'basin',sink:null})]),/absente/);
});

test('every legacy integrated basin colour/width/layout resolves to the active reference on every cabinet model',()=>{
 let count=0;
 for(const [modelName,colors] of Object.entries(INTEGRATED_BASINS))for(const [color,layouts] of Object.entries(colors))for(const width of [60,70,80,90,100,120])for(const legacyLayout of ['single','double']){
  const layout=legacyLayout==='double'?'double':modelName==='sella'&&width===120?'offset':'center',entry=layouts[layout]?.[width];
  if(!entry||legacyLayout==='double'&&width!==120)continue;
  for(let model=0;model<4;model++){
   const old=cabinet({model,width,option:'basin',sink:{model:modelName==='sella'?'Sella':'Tampa',color,layout:legacyLayout,reference:entry.ref},position:{x:0,y:model===1?0:28,z:0}}),item=accepted(record([old])).items[0],s=item.settings;
   assert.equal(s.top,modelName);assert.equal(s.basinLayout,layout);assert.equal(s.basinColor,color);assert.equal(basinReference(s.top,s.basinColor,s.width,s.format,s.basinLayout),entry.ref);count++;
  }
 }
 assert.equal(count,112);
 const item=accepted(record([cabinet({width:120,option:'basin',sink:{model:'Sella',color:'gloss',layout:'single',reference:'6389'}})])).items[0];
 assert.equal(item.settings.basinLayout,'offset');assert.equal(basinReference('sella','gloss',120,item.settings.format,'offset'),'6389');
});

test('inset basin reference mismatches, unsupported finishes and impossible double layouts fail safely',()=>{
 const cases=[{width:120,sink:{model:'Sella',color:'gloss',layout:'single',reference:'2809'}},{width:80,sink:{model:'Sella',color:'black',layout:'single'}},{width:80,sink:{model:'Tampa',color:'gloss',layout:'double'}},{width:83,sink:{model:'Tampa',color:'gloss',layout:'single'}},{width:80,sink:{model:'Tampa',color:'unknown',layout:'single'}}];
 for(const patch of cases)rejected(record([cabinet({option:'basin',...patch})]),/vasque|Référence|référence/);
});

test('all nine Neris/Torne colours keep the active rendered basin colour and manufacturer reference',()=>{
 for(const modelName of ['neris','torne'])for(const color of VESSEL_COLORS)for(let model=0;model<4;model++){
  const old=cabinet({model,width:modelName==='neris'?50:40,sink:{model:modelName==='neris'?'Neris':'Torne',color:color.id,layout:'single'},position:{x:0,y:model===1?0:28,z:0}}),s=accepted(record([old])).items[0].settings;
  assert.equal(s.top,modelName);assert.equal(s.vesselColor,color.id);assert.equal(s.basinColor,color.id,'Native paintAsset and basinReference use basinColor');assert.equal(basinReference(s.top,s.basinColor,s.width,s.format,s.basinLayout),color[modelName]);
 }
 rejected(record([cabinet({width:49,sink:{model:'Neris',color:'gloss',layout:'single'}})]),/poser incompatible/);
 rejected(record([cabinet({sink:{model:'Torne',color:'unknown',layout:'single'}})]),/poser incompatible/);
});

test('all mirror sizes, metal colours and LED states preserve active model references and centre heights',()=>{
 for(const [name,model] of Object.entries(LEGACY_MIRRORS))for(const [width,height] of model.sizes)for(const mirrorFinish of ['Noir','Doré','Bronze','Argent'])for(const ledOn of [false,true]){
  const old=mirror({mirror:name,mirrorSize:name==='Miroir métallique rond'?'Ø '+width+' cm':width+' × '+height+' cm',mirrorFinish,ledOn}),s=accepted(record([old])).items[0];
  assert.equal(s.settings.mirrorModel,model.id);assert.equal(s.settings.width,width);assert.equal(s.settings.height,height);assert.equal(s.settings.mirrorFinish,mirrorFinish);assert.equal(s.settings.led,ledOn);assert.equal(s.placement.height,130+height/2);
  const expected=mirrorSpec({mirrorModel:model.id,width,height,mirrorFinish});assert.equal(mirrorSpec(s.settings).reference,expected.reference);
 }
});

test('only the historical Basic 60×80 rotation changes display dimensions',()=>{
 for(const [name,model] of Object.entries(LEGACY_MIRRORS))for(const [width,height] of model.sizes){
  const item=accepted(record([mirror({mirror:name,mirrorSize:width+' × '+height+' cm',mirrorRotated:true})])).items[0],rotated=name==='Basic'&&width===60&&height===80;
  assert.equal(item.settings.rotated,rotated);assert.equal(item.settings.width,width);assert.equal(item.settings.height,height);assert.equal(item.placement.height,130+(rotated?width:height)/2);
  const displayed=mirrorSpec(item.settings);nearly(displayed.width*100,rotated?height:width);nearly(displayed.height*100,rotated?width:height);
 }
});

test('column finish, hinge side, door state and original bottom height are preserved',()=>{
 for(const finish of LEGACY_FINISHES)for(const doorSide of ['left','right'])for(const open of [true,false]){
  const item=accepted(record([column({finish:finish==='BISC'?'BISC.':finish,doorSide,open})])).items[0];assert.deepEqual(item.settings,{finish,hingeSide:doorSide,doorOpen:open});assert.deepEqual(item.placement,{wall:0,u:225,height:18,offset:1.5});
 }
 rejected(record([column({doorSide:'unknown'})]),/colonne/);rejected(record([column({open:'true'})]),/colonne/);
});

test('room metres become exact centimetres while local item coordinates, surfaces and joints are preserved',()=>{
 const input=record([cabinet({position:{x:-71.3,y:31.7,z:2.5}})]);input.ambience.room={width:5.3,depth:3.7,height:2.8};input.ambience.wall.layout='staggered';input.ambience.wallOrientation='vertical';input.ambience.wall.groutWidth=3;
 const project=accepted(input);assert.deepEqual(project.room,{points:[[0,0],[530,0],[530,370],[0,370]],height:280,partitions:[]});assert.deepEqual(project.items[0].placement,{wall:0,u:193.7,height:31.7,offset:4});
 assert.equal(project.floor.collection,'Creta');assert.equal(project.floor.color,'avena');assert.equal(project.floor.format,'60x60');assert.equal(project.floor.groutColor,'Ivoire');
 assert.deepEqual(project.layouts.floor,{width:.6,height:.6,direction:'horizontal',pattern:'straight',groutWidth:2,x:0,y:0,shape:'rectangle'});
 assert.equal(project.walls.length,4);assert(project.walls.every(w=>w.collection==='Creta'&&w.color==='avena'&&w.groutColor==='Ivoire'));assert(project.layouts.walls.every(l=>l.pattern==='offset'&&l.direction==='vertical'&&l.groutWidth===3));
 assert(project.legacyRecovery.notes.some(note=>/HD officielles/.test(note)));assert.equal(project.client.name,input.client);assert.equal(project.legacyRecovery.sourceDate,input.date);
});

test('a cabinet, elevated mirror and separate column pass active collision checks without automatic repositioning',()=>{
 const input=record([cabinet({position:{x:-60,y:28,z:0}}),mirror({position:{x:-60,y:130,z:-23}}),column({position:{x:60,y:18,z:-9.5}})]),project=accepted(input),native=new Composition(nativeRoom(project.room));
 for(const raw of project.items){const result=native.add(raw.type,{root:new T.Group()},raw.settings,raw.placement);assert(result.item);assert.deepEqual(result.item.placement,raw.placement);assert.equal(native.move(result.item.id,raw.placement).error,undefined);}
 assert.equal(native.items.length,3);
});

test('missing room, unknown surface identity, format, colour, orientation and grout fail without fallback or mutation',()=>{
 const cases=[
  [r=>delete r.ambience.room,/Dimensions de pièce absentes/],
  [r=>r.ambience.floor.collection='unknown-collection',/Collection historique non reconnue/],
  [r=>r.ambience.wall.color='unknown-color',/Coloris non reconnu/],
  [r=>r.ambience.floor.format='123x456',/Format non reconnu/],
  [r=>r.ambience.floorOrientation='diagonal',/Orientation historique/],
  [r=>r.ambience.wall.groutColor='#010203',/joint non reconnue/],
  [r=>r.ambience.wall.groutWidth=9,/joint historique invalide/],
  [r=>delete r.ambience.wall,/revêtement des murs/],
  [r=>r.ambience.floor.layout='random',/Calepinage historique/]
 ];
 for(const [mutate,reason] of cases){const input=record();mutate(input);rejected(input,reason);}
});

test('accessories, invalid geometry, collisions, limits and duplicate identifiers are rejected intact',()=>{
 const cases=[
  [r=>r.data.items[0].accessories.push({kind:'tap',reference:'PUBLIC'}),/accessoires historiques/],
  [r=>r.data.items[0].position.x=230,/dépasse/],
  [r=>r.data.items[0].position.y=250,/dépasse/],
  [r=>r.data.items[0].position.z=-5,/dépasse/],
  [r=>r.data.items.push(cabinet({id:'second'})),/chevauchent/],
  [r=>r.data.items=Array.from({length:33},(_,i)=>cabinet({id:'cabinet-'+i})),/32 éléments/],
  [r=>r.data.items=Array.from({length:4},(_,i)=>mirror({id:'mirror-'+i})),/3 miroirs/],
  [r=>r.data.items.push(column({id:r.data.items[0].id})),/dupliqués/],
  [r=>r.data.items[0].id='invalid/id',/Identifiants/],
  [r=>r.data.items[0].model=4,/modèle ou largeur/],
  [r=>r.data.items[0].width=80.5,/modèle ou largeur/],
  [r=>r.data.items[0].finish='UNKNOWN',/finition inconnue/],
  [r=>r.ambience.room.width=20,/Dimensions de pièce hors/]
 ];
 for(const [mutate,reason] of cases){const input=record();mutate(input);rejected(input,reason);}
});

test('encoded recovered projects decode with the active loader and retain no purchase/session fields',()=>{
 const input=record();input.purchaseHT=1.23;input.token='SYNTHETIC_TOKEN';input.data.items[0].privateCode='SYNTHETIC_PRIVATE_CODE';input.ambience.floor.proRows=[{amount:1.23}];
 const project=accepted(input),encoded=encodeRecoveredProject(project),decoded=decodeProject(encoded);assert.deepEqual(decoded,project);assert(!/[+/=]/.test(encoded));assert.equal(decoded.client.name,input.client);assert.equal(decoded.legacyRecovery.sourceDate,input.date);
 const text=JSON.stringify(decoded);assert(!text.includes('SYNTHETIC_TOKEN'));assert(!text.includes('SYNTHETIC_PRIVATE_CODE'));assert(!text.includes('purchaseHT'));assert(!text.includes('proRows'));assert(!text.includes('"amount"'));
});
