import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
import {SANITARIES,PLUMBING,makeSanitary} from '../src/sanitaries.js';
import {makeEquipment,equipmentError} from '../src/equipment.js';
import {makeRoom,DEFAULT_ROOM,roomPreset} from '../src/room.js';
import {Composition,disposeObject} from '../src/composition.js';
import {makeFixture,setBathData} from '../src/fixtures.js';
import {decorateAsset} from '../src/decor.js';
import {snapPlanPoint,snapPlanVertex,rightAngleMarkup} from '../src/plan-snap.js';
import {cabinetCombinations} from '../src/cabinet-combinations.js';
const close=(a,b,t=.00001)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
setBathData(JSON.parse(readFileSync('dist/assets/bathroom/baths.json','utf8')));
for(const p of SANITARIES){
 const s={reference:p.id},a=makeSanitary(p.type,s),box=new T.Box3().setFromObject(a.root),size=box.getSize(new T.Vector3());
 assert.equal(a.root.userData.reference,p.id);assert.equal(equipmentError(p.type,s),'');assert(equipmentError(p.type,{reference:'unknown'}));
 a.root.traverse(o=>{if(o.isMesh){assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));assert(o.material.isMeshStandardMaterial);}});
 if(p.type==='toilet'){close(size.x,p.width);close(size.y,p.height);close(size.z,p.depth);close(box.min.y,0);assert(a.root.getObjectByName('Cuvette_creuse'));assert(a.root.getObjectByName('Lunette'));const opened=makeSanitary(p.type,{...s,lidOpen:true});assert(opened.root.getObjectByName('Abattant').rotation.x< -1.4);assert(opened.dimensions.height>=a.dimensions.height);disposeObject(opened.root);if(p.floor)assert(a.root.getObjectByName('Reservoir'));}
 else {close(a.dimensions.width,p.width);close(a.dimensions.depth,p.depth);assert(a.root.getObjectByName(p.id==='TR443'?'Vasque_ovale':'Vasque_rectangle'));decorateAsset(a,p.type,s);assert(a.root.getObjectByName('Flacon'));if(p.id==='TR443'){assert(a.root.getObjectByName('Porte_serviettes'));assert(a.root.getObjectByName('Serviette_suspendue'));assert(a.root.getObjectByName('Savon'));}decorateAsset(a,p.type,{...s,decor:false});assert.equal(a.root.getObjectByName('Accessoires_decoratifs').visible,false);}
 if(p.id.endsWith('U18'))assert(a.ceramic.roughness>.6);else assert(a.ceramic.clearcoat>.7);
 disposeObject(a.root);
}
for(const p of PLUMBING){const a=makeSanitary('washstand',{reference:'TR443',metal:p.id});assert(a.root.getObjectByName('Bonde_'+p.drain));assert(a.root.getObjectByName('Siphon_'+p.trap));const pipe=a.root.getObjectByName('Sortie_D32');close(pipe.geometry.parameters.radiusTop,.016);disposeObject(a.root);}
{const a=makeSanitary('washstand',{reference:'STR4335',trap:'square',drain:'square'});assert(a.root.getObjectByName('Siphon_31141112702'));assert(a.root.getObjectByName('Bonde_000560'));disposeObject(a.root);}
for(const n of [121,160,180,200,240,360,1000]){const combinations=cabinetCombinations(n);assert(combinations.length);for(const widths of combinations){assert.equal(widths.reduce((a,b)=>a+b,0),n);assert(widths.every(w=>Number.isInteger(w)&&w>=40&&w<=120));}}
assert(cabinetCombinations(160).some(w=>w.join('+')==='80+80'));assert(cabinetCombinations(160).some(w=>w.join('+')==='100+60'));assert.equal(cabinetCombinations(120).length,0);
const snap=snapPlanPoint([302,280],[300,0],[0,0]);assert(snap.right);assert.deepEqual(snap.point,[300,280]);assert(rightAngleMarkup(snap,p=>p).includes('90°'));assert(!snapPlanPoint([350,280],[300,0],[0,0]).snapped);assert.deepEqual(snapPlanVertex([302,298],[[0,0],[300,0],[302,298],[0,300]],2).point,[300,300]);
// Solid mixer body may not enter the tub. Spout/hose can extend over its bowl.
{const room=makeRoom(DEFAULT_ROOM,0),c=new Composition(room),s={kind:'rect',width:170,depth:75,apron:'tile'},bath=c.add('bath',makeFixture('bath',s),s,{wall:0,u:225,height:0}).item;assert(bath);const ts={use:'bath'},tap=c.add('tap',makeEquipment('tap',ts),ts,{wall:0,u:225,height:40}).item;assert(tap);assert.equal(c.validate(tap),'');const original={...tap.placement};assert(c.move(tap.id,{height:10,offset:10}).error);assert.deepEqual(tap.placement,original);assert(c.previewMove(tap.id,{height:10,offset:10}).error);assert(c.move(tap.id,{height:50}).item);assert.equal(c.validate(tap),'');for(const i of c.items)disposeObject(i.root);room.dispose();}
// Timed CPU geometry tests exercise the largest editor dimensions and twelve angles.
const timings=[];for(const kind of ['rectangle','l','chamfer','twelve']){const config=kind==='twelve'?{height:260,points:[[0,0],[1000,0],[1000,300],[900,300],[900,500],[1000,500],[1000,1000],[0,1000],[0,700],[100,700],[100,500],[0,500]]}:roomPreset(kind,1000,1000);const at=performance.now(),room=makeRoom(config,0),ms=performance.now()-at;assert(ms<3000,kind+' CPU geometry exceeded 3 seconds');assert(room.floor.tiles.geometry.attributes.position.count<100000);const geometry=room.floor.tiles.geometry;room.floor.setLayout({...room.floor.layout});const normalized=room.floor.tiles.geometry;room.floor.setLayout({...room.floor.layout});assert.equal(room.floor.tiles.geometry,normalized,'Unchanged layout does not rebuild');const g=room.walls[0].tiles.geometry;room.setOpenings([]);assert.equal(room.walls[0].tiles.geometry,g,'Empty openings do not rebuild walls');timings.push({kind,ms:Math.round(ms*100)/100,floorVertices:geometry.attributes.position.count});room.dispose();}
const result={passed:true,at:new Date().toISOString(),checks:['five sanitary references with real hollow geometry, overall WC dimensions and catalogue finish','seven real round trap/drain finish pairs plus square chrome references','TRIXIE open towel slot, cloth, bottles and reversible decoration visibility','large cabinet proposals sum correctly and include 80+80 and 100+60 for 160 cm','90-degree drawing snap, visual guide and right-angle corner snapping','bath mixer solid collision rejected during drag and release; raised fixture accepted','large 100 m² and twelve-corner geometry builds; unchanged layouts and openings retain buffers'],timings,browserQA:'CPU/controller checks only. No actual browser, mobile, GPU, FPS or photorealism validation.'};
writeFileSync('qa/mission-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
