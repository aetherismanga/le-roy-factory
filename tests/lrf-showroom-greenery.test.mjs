import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShowroomGreenery} from '../shared/lrf-3d/showroom-greenery.js';

const options={width:30,depth:108.3,stands:Array.from({length:17},()=>({}))};
test('greenery fills the reception and booth gaps while preserving a continuous central aisle',()=>{
 const garden=makeShowroomGreenery(options);
 try{
  const info=garden.diagnostics();assert.equal(info.plants,30);assert.equal(info.interiorPlants,22);assert(info.leaves>4000);
  assert.deepEqual(new Set(garden.root.userData.plants.map(p=>p.species)),new Set(['areca','ficus','monstera','olive']));
  for(const box of garden.colliders){assert(Object.values(box).every(Number.isFinite));assert(box.minX>2.4||box.maxX< -2.4,'the whole four metre main aisle remains open');assert(box.minZ>=-options.depth&&box.maxZ<0);}
  assert(garden.root.userData.plants.filter(p=>p.exterior).every(p=>Math.abs(p.x)>options.width/2+1));
  assert(garden.root.getObjectByName('Decor_Tissu_boucle_ocre'));assert(garden.root.getObjectByName('Decor_Porcelain_emaillee')||garden.root.getObjectByName('Decor_Porcelaine_emaillee'));
 }finally{garden.dispose();}
});

test('botanical leaves are curved native meshes and the complete landscape stays within a mobile draw budget',()=>{
 const garden=makeShowroomGreenery(options);
 try{
  let calls=0,triangles=0,leafMeshes=0;
  garden.root.traverse(object=>{
   if(!object.isMesh)return;calls++;const geometry=object.geometry;assert([...geometry.attributes.position.array].every(Number.isFinite));triangles+=(geometry.index?.count||geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);
   assert.equal(object.userData.visualOnly,true);assert.equal(object.userData.excludeFromProductBounds,true);
   if(object.isInstancedMesh){leafMeshes++;assert.equal(object.material.transparent,false);assert.equal(object.material.alphaTest,0);const positions=geometry.attributes.position;let minZ=Infinity,maxZ=-Infinity;for(let i=0;i<positions.count;i++){minZ=Math.min(minZ,positions.getZ(i));maxZ=Math.max(maxZ,positions.getZ(i));}assert(maxZ-minZ>.10,'leaves have real cup and twist depth');}
  });
  assert.equal(leafMeshes,4);assert(calls<=25);assert(triangles<300000);assert.equal(calls,garden.diagnostics().drawCalls);
  const ray=new T.Raycaster(new T.Vector3(7,1.5,0),new T.Vector3(0,-.1,-1).normalize());assert.equal(ray.intersectObject(garden.root,true).length,0,'decor does not steal collection or furniture picks');
 }finally{garden.dispose();}
});

test('the landscape owns its material maps and can be disposed once through the ordinary editor lifecycle',()=>{
 const a=makeShowroomGreenery(options),b=makeShowroomGreenery(options),geometries=new Set(),materials=new Set(),maps=new Set();let geometryEvents=0,materialEvents=0,mapEvents=0;
 a.root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material){materials.add(object.material);for(const key of ['map','bumpMap'])if(object.material[key])maps.add(object.material[key]);}});
 for(const geometry of geometries)geometry.addEventListener('dispose',()=>geometryEvents++);for(const material of materials)material.addEventListener('dispose',()=>materialEvents++);for(const map of maps)map.addEventListener('dispose',()=>mapEvents++);
 assert.equal(a.prepareNear({x:0,z:-2}),true);const soil=a.root.getObjectByName('Decor_Terreau').material,otherSoil=b.root.getObjectByName('Decor_Terreau').material;assert.notEqual(soil.bumpMap,otherSoil.bumpMap);
 soil.dispose();assert.equal(a.diagnostics().disposed,true);assert.equal(a.prepareNear({x:0,z:-2}),false);a.dispose();assert.equal(geometryEvents,geometries.size);assert.equal(mapEvents,maps.size);
 assert(materialEvents>=materials.size);assert.equal(b.diagnostics().disposed,false);b.dispose();
});
