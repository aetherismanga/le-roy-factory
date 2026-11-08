import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShowroomHall} from '../shared/lrf-3d/showroom-hall.js';
import {makeShowroomSky,SHOWROOM_SKY} from '../shared/lrf-3d/showroom-sky.js';
import {createShowroomLighting} from '../shared/lrf-3d/showroom-lighting.js';
import {COLLECTIONS,formatsForColor} from '../shared/lrf-3d/surface-catalog.js';

const manufacturers=Array.from({length:4},(_,index)=>({id:'supplier-'+index,name:'Usine '+index,category:'Carrelage',href:'https://leroyfactory.fr/partenaires.html',collections:[{id:'collection-'+index,name:'Collection '+index,image:'https://leroyfactory.fr/sample-'+index+'.webp',href:'https://leroyfactory.fr/univers.html'}]}));
function nativeHits(root,origin,direction){
 root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction)),hits=[];
 root.traverseVisible(object=>{if(!object.isMesh)return;(object.isInstancedMesh?T.InstancedMesh.prototype:T.Mesh.prototype).raycast.call(object,ray,hits);});
 return hits.sort((a,b)=>a.distance-b.distance);
}
const isBlocked=(hall,x,z,r=.20)=>hall.colliders.some(box=>x+r>box.minX&&x-r<box.maxX&&z+r>box.minZ&&z-r<box.maxZ);

test('the roof and side windows reveal the photographic sky through real glazing instead of an opaque ceiling',()=>{
 const hall=makeShowroomHall({manufacturers});hall.root.visible=true;
 try{
  for(const [origin,direction,name]of [[[1.8,1.58,-2.2],[0,1,0],'Plafond_vitre_panoramique'],[[14,1.58,-2.2],[1,0,0],'Grande_baie_vitree'],[[-14,1.58,-2.2],[-1,0,0],'Grande_baie_vitree']]){
   const hits=nativeHits(hall.root,origin,direction);assert(hits.length>=2);
   assert.equal(hits[0].object.name,name);assert.equal(hits[0].object.material.transparent,true);assert(hits[0].object.material.opacity<.4);
   const sky=hits.find(hit=>hit.object.name==='Panorama_ciel_nuages_reels');assert(sky,'the native camera ray reaches the real sky surface');
   const opaqueBeforeSky=hits.filter(hit=>hit.distance<sky.distance&&hit.object.material.transparent!==true);
   assert.equal(opaqueBeforeSky.length,0,'no hidden ceiling or masonry backs the glass');
  }
  const sky=hall.root.getObjectByName('Panorama_ciel_nuages_reels');assert.equal(sky.material.fog,false);assert.equal(sky.material.depthWrite,false);assert.equal(sky.material.side,T.BackSide);
 }finally{hall.dispose();}
});

test('stand floors use canonical physical tile formats and the wall colours and BioPietra stone are bound to architecture',()=>{
 const hall=makeShowroomHall({manufacturers});
 try{
  const floor=hall.root.getObjectByName('Dallage_pierre_120x120');assert(floor?.isInstancedMesh);assert.equal(floor.material.userData.showroomRecipe.collection,'Creta');assert.equal(floor.material.userData.showroomRecipe.format,'120x120');
  const standColors=new Set(),standRecipes=new Set();
  for(const stand of hall.stands){
   const walls=stand.group.children.filter(object=>object.userData.architecturalParts?.includes('Mur_collections_fond'));assert(walls.length);
   standColors.add(walls[0].material.color.getHexString());
   const surfaces=stand.group.children.filter(object=>object.isMesh&&object.material.userData.showroomRecipe);assert(surfaces.length);
   for(const mesh of surfaces){const recipe=mesh.material.userData.showroomRecipe,color=COLLECTIONS[recipe.collection]?.colors.find(value=>value.id===recipe.colorId),format=formatsForColor(recipe.collection,recipe.colorId).find(value=>value.id===recipe.format);assert(color?.nativeFaces,'actual native manufacturer sample');assert(format);assert.equal(format.width,recipe.width);assert.equal(format.height,recipe.height);standRecipes.add(recipe.collection+'/'+recipe.colorId+'/'+recipe.format);}
  }
  assert.equal(standColors.size,4,'individually coloured exhibition walls');assert.equal(standRecipes.size,3,'three physically different tile schemes');
  const stone=[];hall.root.traverse(object=>{if(object.isMesh&&object.material.userData.showroomRecipe?.manufacturer==='BioPietra')stone.push(object);});
  assert(stone.length,'the tactile wall actually uses the BioPietra material');for(const mesh of stone){assert.equal(mesh.material.userData.showroomRecipe.collection,'Borgo Antico');assert.match(mesh.material.userData.showroomRecipe.original,/Borgo-Antico_muro/);assert(mesh.material.bumpScale>.002);}
 }finally{hall.dispose();}
});

test('vegetation and lounge retain their collisions while all central walking routes remain open',()=>{
 const hall=makeShowroomHall({manufacturers});
 try{
  assert(hall.greenery.diagnostics().interiorPlants>=6);assert(hall.greenery.diagnostics().leaves>1000);
  for(let z=-.4;z>-hall.dimensions.depth+.5;z-=.1)for(const x of [-1.5,0,1.5])assert.equal(isBlocked(hall,x,z),false,'uninterrupted aisle at '+x+','+z);
  for(const box of hall.greenery.colliders){assert(hall.colliders.includes(box),'navigation uses the actual landscape footprints');assert.equal(isBlocked(hall,(box.minX+box.maxX)/2,(box.minZ+box.maxZ)/2),true);}
  const foliage=[];hall.greenery.root.traverse(object=>{if(object.isInstancedMesh)foliage.push(object);});assert(foliage.length>=4);for(const leaf of foliage){assert.equal(leaf.material.transparent,false);assert.equal(leaf.material.alphaTest,0,'foliage has curved geometry instead of alpha cards');}
 }finally{hall.dispose();}
});

test('hall disposal releases both architectural window panes and the complete roof geometry',()=>{
 const hall=makeShowroomHall({manufacturers:[]}),glazing=[];hall.root.traverse(object=>{if(object.userData.glazing)glazing.push(object);});assert.equal(glazing.length,3);
 const disposed=new Map(glazing.map(object=>[object.geometry,0]));for(const geometry of disposed.keys())geometry.addEventListener('dispose',()=>disposed.set(geometry,disposed.get(geometry)+1));
 hall.dispose();for(const count of disposed.values())assert.equal(count,1,'unique glazing geometry is released with the hall');
});

test('the native photographic sky loads once, follows walking position, and owns its bitmap',async()=>{
 let requests=0,wakes=0,disposals=0;const map=new T.Texture({width:4096,height:2048});map.addEventListener('dispose',()=>disposals++);
 const sky=makeShowroomSky({onReady:()=>wakes++,loadTexture:async(url,options)=>{requests++;assert.equal(url,SHOWROOM_SKY.file);assert.equal(options.maxDimension,4096);assert(options.signal instanceof AbortSignal);return map;}});
 assert.equal(requests,0);assert.equal(sky.texture,null);await sky.prepareNear({x:3,z:-6});await sky.prepareNear({x:8,z:-43});
 assert.equal(requests,1);assert.equal(wakes,1);assert.deepEqual(sky.root.position.toArray(),[8,0,-43]);assert.equal(sky.texture,map);assert.equal(map.colorSpace,T.SRGBColorSpace);assert.equal(map.mapping,T.EquirectangularReflectionMapping);assert.equal(sky.root.userData.ready,true);
 sky.dispose();sky.dispose();assert.equal(disposals,1);assert.equal(sky.texture,null);
});

test('late sky downloads are aborted and discarded after the hall is removed',async()=>{
 let resolveTexture,signal,disposals=0,wakes=0;
 const sky=makeShowroomSky({onReady:()=>wakes++,loadTexture:(_url,options)=>{signal=options.signal;return new Promise(resolve=>resolveTexture=resolve);}}),task=sky.prepareNear({x:0,z:-3});await Promise.resolve();sky.dispose();assert.equal(signal.aborted,true);
 const texture=new T.Texture();texture.addEventListener('dispose',()=>disposals++);resolveTexture(texture);assert.equal(await task,false);assert.equal(disposals,1);assert.equal(wakes,0);assert.equal(sky.texture,null);
});

test('showroom daylight uses the photographic environment and restores the exact bathroom lighting on exit',()=>{
 const scene=new T.Scene(),originalEnvironment=new T.Texture(),renderer={toneMappingExposure:1.13};scene.environment=originalEnvironment;scene.environmentIntensity=.43;scene.fog=new T.Fog('#ccaabb',15,55);const originalFog=scene.fog.color.clone(),camera=new T.PerspectiveCamera();
 const root=new T.Group();root.position.set(12,0,8);root.rotation.y=Math.PI/2;root.updateMatrixWorld(true);let hall={root,dimensions:{width:30},navigableBounds:{minX:-15,maxX:15,minZ:-45,maxZ:0},skyTexture:null},created=0,released=0,originalDisposals=0,failEnvironment=false;originalEnvironment.addEventListener('dispose',()=>originalDisposals++);
 const lighting=createShowroomLighting({scene,renderer,camera,getHall:()=>hall,makeEnvironment:texture=>{created++;assert.equal(texture,hall.skyTexture);if(failEnvironment)throw Error('GPU conversion unavailable');return {texture:new T.Texture(),dispose(){released++;}};}});
 camera.position.copy(root.localToWorld(new T.Vector3(0,1.58,-4)));assert.equal(lighting.update(),true);assert.equal(lighting.active,true);assert.equal(scene.environment,originalEnvironment,'keep existing environment until sky is ready');assert.equal(renderer.toneMappingExposure,.88);
 hall.skyTexture=new T.Texture();lighting.update();const firstEnvironment=scene.environment;lighting.update();assert.equal(created,1,'PMREM is generated once for the loaded panorama');assert.notEqual(firstEnvironment,originalEnvironment);assert.equal(scene.environmentIntensity,.88);assert.equal(scene.fog.near,32);assert.equal(scene.fog.far,105);
 hall.skyTexture=new T.Texture();lighting.update();assert.equal(created,2);assert.equal(released,1,'previous sky environment released on replacement');
 camera.position.copy(root.localToWorld(new T.Vector3(0,1.58,1)));assert.equal(lighting.update(),false);assert.equal(lighting.active,false);assert.equal(scene.environment,originalEnvironment);assert.equal(scene.environmentIntensity,.43);assert.equal(renderer.toneMappingExposure,1.13);assert.equal(scene.fog.near,15);assert.equal(scene.fog.far,55);assert(scene.fog.color.equals(originalFog));assert.equal(released,2);assert.equal(originalDisposals,0,'bathroom texture remains caller owned');
 failEnvironment=true;camera.position.copy(root.localToWorld(new T.Vector3(0,1.58,-4)));assert.doesNotThrow(()=>lighting.update(),'unsupported GPU conversion cannot stop the visit loop');assert.equal(scene.environment,originalEnvironment,'existing environment remains available after a failed GPU conversion');
 lighting.dispose();assert.equal(released,2);assert.equal(renderer.toneMappingExposure,1.13);assert(scene.fog.color.equals(originalFog));originalEnvironment.dispose();
});
