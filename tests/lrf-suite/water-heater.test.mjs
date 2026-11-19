import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {WATER_HEATER_CAPACITIES,makeWaterHeater,waterHeaterError,waterHeaterLabel} from '../../shared/lrf-3d/water-heater.js';
import {makeEquipment,equipmentDimensions,equipmentError,TOWEL_MODELS} from '../../shared/lrf-3d/equipment.js';
import {productVisual} from '../../shared/lrf-3d/catalogue-product-visuals.js';
import {makeRoom} from '../../shared/lrf-3d/room.js';
import {encodeProject,decodeProject} from '../../studio-one/src/projects.js';
import {buildPhotorealPrompt} from '../../shared/lrf-3d/photoreal-export.js';
const settings=capacity=>({model:'atlantic-lineo',waterHeaterCapacity:capacity});
function dispose(asset){const geometries=new Set(),materials=new Set();asset.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

test('all four real mesh envelopes match the supplied Atlantic dimension sheet, including trim, controls and plumbing',()=>{
 assert.deepEqual(WATER_HEATER_CAPACITIES.map(p=>[p.capacity,p.height,p.width,p.depth]),[[40,765,490,290],[65,1090,490,290],[80,1300,490,290],[100,1240,550,320]]);
 for(const p of WATER_HEATER_CAPACITIES){const asset=makeEquipment('towel',settings(p.capacity));try{const box=new Box3().setFromObject(asset.root),size=box.getSize(new Vector3());for(const [axis,key]of [['x','width'],['y','height'],['z','depth']])assert(Math.abs(size[axis]-p[key]/1000)<1e-6,`${p.capacity}L ${key}`);assert(Math.abs(box.min.y)<1e-7);assert(Math.abs(box.min.z+.23)<1e-7);assert.deepEqual(asset.dimensions,{width:p.width/1000,height:p.height/1000,depth:p.depth/1000,base:0});asset.root.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});}finally{dispose(asset);}}
});
test('capacity is validated and dimension caching never reuses the 80L envelope for another capacity',()=>{
 assert(TOWEL_MODELS.some(p=>p.id==='atlantic-lineo'));assert.equal(equipmentError('towel',settings(80)),'');assert(waterHeaterError(settings(120)));assert(equipmentError('towel',settings('80')));assert.throws(()=>makeWaterHeater(settings(150)));
 for(const capacity of [40,80,100,65,80])assert.equal(equipmentDimensions('towel',settings(capacity)).height,WATER_HEATER_CAPACITIES.find(p=>p.capacity===capacity).height/1000);
 assert.equal(equipmentDimensions('towel',{model:'atlantic-lineo'}).height,1.3);
});
test('the product has its own white enamel, satin caps, glass controls, branding, mounts and independently identified hot/cold threaded ports',()=>{
 const asset=makeWaterHeater(settings(80));try{for(const name of ['Habillage_blanc_arrondi','Bandeau_superieur_satine','Bandeau_inferieur_satine','Cadre_commande_chrome','Commande_Water_Drop','Logo_Atlantic_vertical','Raccord_eau_chaude','Raccord_eau_froide','Filetage_eau_chaude','Filetage_eau_froide','Platine_fixation_murale'])assert(asset.root.getObjectByName(name),name);const enamel=asset.root.getObjectByName('Habillage_blanc_arrondi').material;assert(enamel.isMeshPhysicalMaterial);assert(enamel.clearcoat>0);assert(asset.root.getObjectByName('Commande_Water_Drop').material.clearcoat>0);assert.equal(asset.root.userData.productKind,'water-heater');}finally{dispose(asset);}
});
test('the chooser has a heater visual and projects preserve capacity for saving and photographic handoff',()=>{
 const visual=productVisual('towel',settings(80));assert(visual);assert.match(visual.alt,/Atlantic Linéo/);assert.notEqual(visual.src,productVisual('towel',{model:'round'}).src);
 const project={version:2,room:{height:260,points:[[0,0],[450,0],[450,450],[0,450]]},items:[{id:'heater',type:'towel',settings:settings(65),placement:{wall:0,u:150,height:90}}]};assert.equal(decodeProject(encodeProject(project)).items[0].settings.waterHeaterCapacity,65);assert.match(buildPhotorealPrompt(project),/waterHeaterCapacity/);assert.match(waterHeaterLabel(settings(100)),/100 L/);
});
test('both furniture apps place the exact wall-mounted volume, preserve it through room changes and keep towels off the heater',async()=>{
 for(const app of ['studio-one','randal-general']){const {Composition}=await import('../../'+app+'/src/composition.js'),{decorateAsset,decorationVisible}=await import('../../'+app+'/src/decor.js'),config={height:260,points:[[0,0],[450,0],[450,450],[0,450]],partitions:[{id:'mount',a:[100,220],b:[300,220],thickness:10,height:260,planIntegrated:true}]},room=makeRoom(config,0),composition=new Composition(room),asset=makeEquipment('towel',settings(80));try{decorateAsset(asset,'towel',settings(80));assert.equal(asset.root.getObjectByName('Accessoires_decoratifs'),undefined);assert.equal(decorationVisible('towel',settings(80)),false);const added=composition.add('towel',asset,settings(80),{wall:4,u:100,height:90});assert(added.item,added.error);assert.equal(composition.validate(added.item),'');assert(composition.validate(added.item,{wall:4,u:100,height:150}));assert.equal(added.item.dimensions.depth,.29);}finally{dispose(asset);room.dispose();}}
});
