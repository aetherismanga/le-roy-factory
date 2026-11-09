import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShowroomGreenery} from '../shared/lrf-3d/showroom-greenery.js';
import {makeShowroomLayout,showroomPoint} from '../shared/lrf-3d/showroom-layout.js';
import {SHOWROOM_MANUFACTURERS} from '../shared/lrf-3d/showroom-catalog.js';

const layout=makeShowroomLayout(SHOWROOM_MANUFACTURERS),options={width:layout.width,depth:layout.depth,stands:layout.displays,layout};
const blocked=(garden,point,r=.25)=>garden.colliders.some(box=>point.x+r>box.minX&&point.x-r<box.maxX&&point.z+r>box.minZ&&point.z-r<box.maxZ);
test('the six reserved garden pockets replace row planting and leave each island approach clear',()=>{
 const garden=makeShowroomGreenery(options);
 try{
  const info=garden.diagnostics();assert.equal(info.interiorPlants,layout.plantZones.length+2,'only two corner pockets receive a low companion');assert.equal(info.plants,info.interiorPlants+8);assert(info.leaves>2500);
  assert.deepEqual(new Set(garden.root.userData.plants.map(p=>p.species)),new Set(['areca','ficus','monstera','olive']));
  const plants=garden.root.userData.plants.filter(p=>!p.exterior);for(const zone of layout.plantZones)assert(plants.some(plant=>plant.x===zone.x&&plant.z===zone.z),'the scene uses the reserved pocket at '+JSON.stringify(zone));
  for(const box of garden.colliders){assert(Object.values(box).every(Number.isFinite));assert(box.minX>-options.width/2&&box.maxX<options.width/2);assert(box.minZ>=-options.depth&&box.maxZ<0);}
  for(const display of layout.displays){assert.equal(blocked(garden,display.approach,.4),false,'the actual island entrance remains accessible: '+display.manufacturer.id);for(const box of garden.colliders)assert(box.maxX<=display.bounds.minX||box.minX>=display.bounds.maxX||box.maxZ<=display.bounds.minZ||box.minZ>=display.bounds.maxZ,'landscape does not occupy a furnished scene');}
  assert.equal(blocked(garden,layout.arrival,.6),false);
  assert(garden.root.userData.plants.filter(p=>p.exterior).every(p=>Math.abs(p.x)>options.width/2+1));
  assert(garden.root.getObjectByName('Decor_Tissu_boucle_ocre'));assert(garden.root.getObjectByName('Decor_Porcelain_emaillee')||garden.root.getObjectByName('Decor_Porcelaine_emaillee'));
 }finally{garden.dispose();}
});

test('the compact lounge and its collision bounds share the supplied rotation inside the side gap',()=>{
 const garden=makeShowroomGreenery(options);
 try{
  const lounge=garden.root.userData.lounge;assert.equal(lounge.x,layout.lounge.x);assert.equal(lounge.z,layout.lounge.z);assert.equal(lounge.rotation,Math.PI/2);assert.equal(lounge.colliders.length,3);
  const minZ=Math.min(...lounge.colliders.map(box=>box.minZ)),maxZ=Math.max(...lounge.colliders.map(box=>box.maxZ));assert(maxZ-minZ<3.5,'sofa, coffee table and vase pair fit the reserved side gap');assert(minZ>-12.8&&maxZ<-8.5,'the lounge stays between the right-hand front and middle islands');
  for(const [name,index]of [['Decor_Tissu_boucle_ocre',0],['Decor_Chene_huile',1]]){const mesh=garden.root.getObjectByName(name),bounds=new T.Box3().setFromObject(mesh),collider=lounge.colliders[index];assert(bounds.min.x>=collider.minX-1e-6&&bounds.max.x<=collider.maxX+1e-6);assert(bounds.min.z>=collider.minZ-1e-6&&bounds.max.z<=collider.maxZ+1e-6);assert(bounds.min.y>.01&&bounds.max.y<1.3,'furniture is grounded at human scale');}
  for(const box of lounge.colliders)assert(blocked(garden,{x:(box.minX+box.maxX)/2,z:(box.minZ+box.maxZ)/2},0),'world-space furniture footprints are active');
 }finally{garden.dispose();}
});

test('lounge collisions follow arbitrary plan rotations and an omitted plan derives the current layout',()=>{
 const placement={x:3,z:-10,rotation:.37},garden=makeShowroomGreenery({layout:{...layout,plantZones:[],lounge:placement}}),fallback=makeShowroomGreenery({stands:layout.displays});
 try{
  const sofa=garden.root.getObjectByName('Decor_Tissu_boucle_ocre'),bounds=new T.Box3().setFromObject(sofa),collision=garden.root.userData.lounge.colliders[0];assert(bounds.min.x>=collision.minX&&bounds.max.x<=collision.maxX);assert(bounds.min.z>=collision.minZ&&bounds.max.z<=collision.maxZ);
  const corners=[[-1.27,-.48],[1.27,-.48],[1.27,.48],[-1.27,.48]].map(([x,z])=>showroomPoint(placement,x,z));assert(Math.abs(collision.minX-Math.min(...corners.map(p=>p.x)))<1e-8);assert(Math.abs(collision.maxZ-Math.max(...corners.map(p=>p.z)))<1e-8);
  const fallbackPlants=fallback.root.userData.plants.filter(p=>!p.exterior);assert.equal(fallbackPlants.length,8,'seventeen stands no longer generate seventeen rows of plants');for(const zone of layout.plantZones)assert(fallbackPlants.some(plant=>plant.x===zone.x&&plant.z===zone.z));assert.equal(fallback.root.userData.lounge.x,layout.lounge.x);assert.equal(fallback.root.userData.lounge.z,layout.lounge.z);
 }finally{garden.dispose();fallback.dispose();}
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
