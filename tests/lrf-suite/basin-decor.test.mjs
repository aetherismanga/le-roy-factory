import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {addDecorBottle,addFoldedTowels,addHangingTowel,addDecorPlant} from '../../shared/lrf-3d/basin-decor.js';
import {decorateAsset as studioDecor} from '../../studio-one/src/decor.js';
import {decorateAsset as generalDecor} from '../../randal-general/src/decor.js';

function geometryReport(root){
 let triangles=0,meshes=0;
 root.traverse(object=>{
  if(!object.isMesh)return;meshes++;
  const positions=object.geometry.attributes.position;
  assert([...positions.array].every(Number.isFinite),`${object.name}: finite geometry`);
  triangles+=(object.geometry.index?.count??positions.count)/3*(object.isInstancedMesh?object.count:1);
 });
 return {triangles,meshes};
}

test('the soap dispenser has a closed glass wall, contained liquid and a curved readable branded label',()=>{
 const parent=new T.Group(),bottle=addDecorBottle(parent,.1,.8,-.04);
 const glass=bottle.getObjectByName('Flacon'),liquid=bottle.getObjectByName('Savon_ambre'),label=bottle.getObjectByName('Etiquette_Le_Roy_FACTORY');
 assert.equal(label.material.map.userData.brand,'LE ROY FACTORY');
 assert.equal(label.material.map.colorSpace,T.SRGBColorSpace);
 assert.equal(label.geometry.type,'CylinderGeometry');
 assert(glass.material.transmission>0&&glass.material.thickness>0);
 assert(glass.material.ior>liquid.material.ior);
 glass.geometry.computeBoundingBox();liquid.geometry.computeBoundingBox();
 assert(glass.geometry.boundingBox.containsBox(liquid.geometry.boundingBox));
 const body=glass.geometry.parameters.points;
 assert.equal(body[0].x,0);assert.equal(body.at(-1).x,0);
 assert(body.some(p=>p.x>.019)&&body.some(p=>p.x>.018&&p.x<.0195));
 assert(bottle.getObjectByName('Tube_plongeur'));assert(bottle.getObjectByName('Sortie_savon'));
 const bounds=new T.Box3().setFromObject(bottle),size=bounds.getSize(new T.Vector3());
 assert(size.y>.10&&size.y<.12);assert(size.x>.04&&size.x<.05);
 assert(Math.abs(bounds.min.y-.8)<1e-6);
 assert(geometryReport(bottle).triangles<5000);
});

test('textile seams and the foliage retain finite geometry within a mobile scene budget',()=>{
 const group=new T.Group(),towels=addFoldedTowels(group,0,0,0),hanging=addHangingTowel(group,0,0,0),plant=addDecorPlant(group,0,0,0);
 assert.equal(towels.children.length,3);
 const cloth=towels.getObjectByName('Tissu_eponge').material;
 assert(cloth.bumpMap.isDataTexture);assert(cloth.bumpScale<.001);assert(cloth.sheen>0);
 assert(towels.getObjectByName('Ourlet_cousu_gauche'));assert(hanging.getObjectByName('Ourlet_serviette'));
 assert(plant.getObjectByName('Feuillage').isInstancedMesh);
 const report=geometryReport(group);assert(report.triangles<11000);assert(report.meshes<=20);
 const minY=new T.Box3().setFromObject(towels).min.y;assert(minY>-.00001);
});

test('both workshops preserve visibility, saved settings and existing prop placement without duplicating accessories',()=>{
 for(const [decorate,format,height] of [[studioDecor,'three',.933],[generalDecor,'harmony-two',.833]]){
  const asset={root:new T.Group()},settings={width:120,format,top:'sella',decor:true},before=JSON.stringify(settings);
  decorate(asset,'cabinet',settings);const group=asset.root.getObjectByName('Accessoires_decoratifs'),bottle=group.getObjectByName('Flacon_Le_Roy_FACTORY');
  assert.equal(JSON.stringify(settings),before);assert.equal(group.visible,true);
  assert(Math.abs(bottle.position.x-.545)<1e-9);assert.equal(bottle.position.z,-.04);
  assert(Math.abs(bottle.position.y-height)<1e-9);
  decorate(asset,'cabinet',{...settings,decor:false});assert.equal(group.visible,false);
  decorate(asset,'cabinet',settings);assert.equal(group.visible,true);assert.equal(asset.root.children.length,1);
 }
 const asset={root:new T.Group()};studioDecor(asset,'cabinet',{width:80,top:'bare'});
 assert.equal(asset.root.getObjectByName('Accessoires_decoratifs').visible,false);
});


test('a document without Canvas2D keeps the bottle usable while a real context retains its sharp label',async()=>{
 const previous=globalThis.document;
 try{
  const contexts=[undefined,()=>null,()=>{throw new Error('Canvas2D unavailable');}];
  for(const [index,getContext] of contexts.entries()){
   globalThis.document={createElement:()=>getContext?{getContext}:{}};
   const fresh=await import(`../../shared/lrf-3d/basin-decor.js?canvas-fallback=${index}`);
   const bottle=fresh.addDecorBottle(new T.Group(),0,0,0),map=bottle.getObjectByName('Etiquette_Le_Roy_FACTORY').material.map;
   assert(map.isDataTexture);assert.equal(map.userData.brand,'LE ROY FACTORY');
  }
  const text=[],ctx={fillRect(){},strokeRect(){},fillText(value){text.push(value);},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  globalThis.document={createElement:()=>({getContext:()=>ctx})};
  const fresh=await import('../../shared/lrf-3d/basin-decor.js?canvas-capable');
  const map=fresh.addDecorBottle(new T.Group(),0,0,0).getObjectByName('Etiquette_Le_Roy_FACTORY').material.map;
  assert(map.isCanvasTexture);assert.equal(map.image.width,1024);assert(text.includes('LE ROY'));
 }finally{
  if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
 }
});
