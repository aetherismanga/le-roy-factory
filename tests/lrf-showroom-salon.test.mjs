import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShowroomHall} from '../shared/lrf-3d/showroom-hall.js';
import {SHOWROOM_MANUFACTURERS} from '../shared/lrf-3d/showroom-catalog.js';
import {makeDoorInterior} from '../shared/lrf-3d/door-interior.js';
import {makeShowroomSurfaces,SHOWROOM_SURFACE_RECIPES} from '../shared/lrf-3d/showroom-surfaces.js';
import {disposeObject} from '../studio-one/src/composition.js';
import {createShowroomLighting} from '../shared/lrf-3d/showroom-lighting.js';

const blocked=(hall,x,z,r=.2)=>hall.colliders.some(b=>x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ);
function nativeHits(root,origin,direction){
 root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction)),hits=[];
 root.traverseVisible(object=>{if(object.isMesh)(object.isInstancedMesh?T.InstancedMesh.prototype:T.Mesh.prototype).raycast.call(object,ray,hits);});
 return hits.sort((a,b)=>a.distance-b.distance);
}

test('the seventeen supplier salon uses room-scale volumes instead of a long empty warehouse',()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS});
 try{
  assert.equal(hall.stands.length,17);assert.equal(hall.dimensions.width,22);assert.equal(hall.dimensions.height,3.8);
  assert(hall.dimensions.depth<60,'the walk is compact enough to keep products in the foreground');
  assert(hall.dimensions.width*hall.dimensions.depth<1350,'showroom footprint is less than half the former3249m²');
  for(const stand of hall.stands){
   const bounds=stand.bounds;assert(bounds.maxX-bounds.minX<8);assert(bounds.maxZ-bounds.minZ<5.1);
  }
 }finally{hall.dispose();}
});

test('both central walking lanes and the front entrances of every compact booth remain clear',async()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS});
 try{
  await hall.prepareNear(new T.Vector3(0,1.58,-12));
  for(let z=-.6;z>-hall.dimensions.depth+.6;z-=.12)for(const x of [-1.25,0,1.25])assert.equal(blocked(hall,x,z),false,`continuous main route ${x},${z}`);
  for(const stand of hall.stands){
   const front=stand.front??stand.bounds.maxZ,side=(stand.bounds.minX+stand.bounds.maxX)<0?-1:1;
   // Enter across the front, then move behind the aisle partition. This tests
   // a complete human-width turn rather than a single isolated clear point.
   for(let x=side*.4;Math.abs(x)<=3.15;x+=side*.1)assert.equal(blocked(hall,x,front+.35),false,`approach ${stand.manufacturer.id}`);
   for(let z=front+.3;z>front-1.2;z-=.1)assert.equal(blocked(hall,side*3.0,z),false,`booth turn ${stand.manufacturer.id}`);
  }
 }finally{hall.dispose();}
});

test('the return doorway has no coincident visible vestibule and salon wall faces',()=>{
 const vestibule=makeDoorInterior();vestibule.setVisible(true);vestibule.setInnerOpen(true);
 try{
  // This ray previously hit two differently shaded wall surfaces at exactly
  // z=-3.54 and produced the striped white edge in the user's screenshot.
  const hits=nativeHits(vestibule.root,[-.5,1.05,-4.25],[0,0,1]),unique=[];
  for(const hit of hits)if(!unique.some(other=>other.object===hit.object&&Math.abs(other.distance-hit.distance)<1e-5))unique.push(hit);
  assert(unique.length,'the opening is surrounded by physical architecture');
  const first=unique[0];
  assert(!unique.some((hit,index)=>index>0&&hit.object!==first.object&&Math.abs(hit.distance-first.distance)<.001),'two front faces must not compete for the same depth sample');
 }finally{disposeObject(vestibule.root);}
});

test('Yosemite uses four native plank faces with real one-third staggering across neighbouring rows',()=>{
 const surfaces=makeShowroomSurfaces(),recipe=SHOWROOM_SURFACE_RECIPES['yosemite-honey'];
 try{
  const floor=surfaces.createFloorPatch({bounds:{minX:-1.5,maxX:1.5,minZ:-6,maxZ:0},recipeId:recipe.id});
  assert.equal(recipe.collection,'Yosemite');assert.equal(recipe.pattern,'third');assert.equal(recipe.width,1.195);assert.equal(recipe.height,.234);
  assert.equal(recipe.images.length,4);assert(recipe.images.every(image=>!/(reconstruct|generated|synthetic)/i.test(image)));
  assert.equal(recipe.provenance.generated,false);assert.equal(recipe.provenance.resized,false);
  assert(recipe.provenance.faces.every(face=>face.width===1000&&face.height===200));
  const cells=floor.userData.cells;assert(cells.length>40);assert(cells.every(cell=>cell.width===recipe.width&&cell.height===recipe.height));
  // The long axis runs along the walk. Compare actual nominal piece centres,
  // including cut edge pieces, rather than merely inspecting a pattern string.
  const rows=new Map();for(const cell of cells){const [column,row]=cell.key.split(':').map(Number);if(column===0)rows.set(row,cell.center[1]);}
  const ordered=[...rows.entries()].sort((a,b)=>a[0]-b[0]);assert(ordered.length>=4);
  for(let i=1;i<ordered.length;i++)if(ordered[i][0]===ordered[i-1][0]+1){const delta=((ordered[i][1]-ordered[i-1][1])%recipe.width+recipe.width)%recipe.width;assert(Math.abs(delta-recipe.width/3)<1e-8,'adjacent plank rows are staggered by39.83cm');}
  const faces=floor.children.filter(child=>child.name.startsWith('Surface_'));assert.equal(faces.length,4);
  for(const face of faces){const uv=face.geometry.attributes.uv;for(const value of uv.array)assert(value>=-1e-6&&value<=1+1e-6,'each tile samples a native plank instead of stretching a room photo across the hall');}
 }finally{surfaces.dispose();}
});

test('each full-scale collection wall retains one exact HD target and stays outside editing picks',()=>{
 const surfaces=makeShowroomSurfaces();
 try{
  for(const recipeId of ['creta-ginepro','slate-dark','yosemite-natural','biopietra-borgo']){
   const wall=surfaces.createWall({width:3.1,height:2.3,recipeId,position:[0,0,-2]}),recipe=wall.userData.showroomRecipe,entry=wall.userData.showroomCollection;
   assert(entry);assert.equal(entry.collection.name,recipe.collection);assert.equal(entry.collection.hdImage,recipe.hdImage);assert(entry.collection.hdImages.length);
   assert.equal(entry.collection.selectedColor,recipe.color);assert.equal(entry.collection.selectedFormat,recipe.format);
   wall.updateMatrixWorld(true);const hits=nativeHits(wall,[.12,1.2,0],[0,0,-1]);assert(hits.length);const hit=hits[0];
   for(let object=hit.object;object;object=object.parent)if(object.userData.showroomCollection)assert.equal(object.userData.showroomCollection.collection.hdImage,recipe.hdImage);
   assert.equal(new T.Raycaster(new T.Vector3(.12,1.2,0),new T.Vector3(0,0,-1)).intersectObject(wall,true).length,0,'visiting must not register these surfaces as editable bathroom items');
  }
 }finally{surfaces.dispose();}
});

test('the real salon applies ACES contrast and restores the exact bathroom renderer and fog on return',()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS}),scene=new T.Scene(),camera=new T.PerspectiveCamera();
 const originalEnvironment=new T.Texture(),originalFog=new T.Color('#a28b70');scene.environment=originalEnvironment;scene.environmentIntensity=.41;scene.fog=new T.Fog(originalFog,14,63);
 const renderer={toneMapping:T.NoToneMapping,toneMappingExposure:1.17,shadowMap:{enabled:false,autoUpdate:false,needsUpdate:false,type:T.BasicShadowMap}};
 hall.root.position.set(8.2,0,-5.4);hall.root.rotation.y=.43;hall.root.updateMatrixWorld(true);
 const lighting=createShowroomLighting({scene,renderer,camera,getHall:()=>hall,makeEnvironment:()=>{throw Error('sky is not loaded in this CPU test');}});
 try{
  camera.position.copy(hall.root.localToWorld(new T.Vector3(0,1.58,-4)));assert.equal(lighting.update(),true);
  assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);assert.equal(renderer.toneMappingExposure,.90);assert.equal(scene.environmentIntensity,.58);
  assert.equal(scene.fog.near,hall.appearance.fogNear);assert.equal(scene.fog.far,hall.appearance.fogFar);assert(scene.fog.color.equals(new T.Color(hall.appearance.fogColor)));
  assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(renderer.shadowMap.type,T.BasicShadowMap);
  camera.position.copy(hall.root.localToWorld(new T.Vector3(0,1.58,1)));assert.equal(lighting.update(),false);
  assert.equal(renderer.toneMapping,T.NoToneMapping);assert.equal(renderer.toneMappingExposure,1.17);assert.equal(renderer.shadowMap.enabled,false);assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(renderer.shadowMap.type,T.BasicShadowMap);
  assert.equal(scene.environment,originalEnvironment);assert.equal(scene.environmentIntensity,.41);assert.equal(scene.fog.near,14);assert.equal(scene.fog.far,63);assert(scene.fog.color.equals(originalFog));
  camera.position.copy(hall.root.localToWorld(new T.Vector3(0,1.58,-4)));lighting.update();lighting.dispose();assert.equal(renderer.toneMapping,T.NoToneMapping);assert.equal(renderer.shadowMap.enabled,false,'disposing an active visit also restores the bathroom');
 }finally{lighting.dispose();hall.dispose();originalEnvironment.dispose();}
});

test('nearby spotlights keep a bounded shadow budget, update by row and release each GPU target once',()=>{
 const hall=makeShowroomHall({manufacturers:SHOWROOM_MANUFACTURERS}),spots=[],shadowLights=[];
 hall.root.traverse(object=>{if(object.isSpotLight)spots.push(object);if(object.isLight&&object.castShadow)shadowLights.push(object);});
 const renderer={shadowMap:{enabled:false,needsUpdate:false}},disposed=[];
 try{
  assert.equal(spots.length,3);assert.equal(shadowLights.length,2,'only the two nearby display walls render shadow maps');
  assert.equal(shadowLights.reduce((sum,light)=>sum+light.shadow.mapSize.x*light.shadow.mapSize.y,0),2*512*512);
  assert.equal(hall.updateLighting(new T.Vector3(0,1.58,-4),renderer),true);assert.equal(renderer.shadowMap.needsUpdate,true);
  const first=spots.map(light=>light.position.clone());renderer.shadowMap.needsUpdate=false;
  assert.equal(hall.updateLighting(new T.Vector3(.3,1.58,-4.1),renderer),false);assert.equal(renderer.shadowMap.needsUpdate,false,'walking within a booth row does not request new static shadow maps');
  assert.equal(hall.updateLighting(new T.Vector3(0,1.58,-15),renderer),true);assert.equal(renderer.shadowMap.needsUpdate,true);
  for(const [i,light]of spots.entries()){assert(light.position.z<first[i].z-5,'the same small light rig follows the reached scenes');assert(light.position.y<hall.dimensions.height);}
  for(const [i,light]of shadowLights.entries()){
   light.shadow.map={dispose(){disposed.push('map-'+i);}};light.shadow.mapPass={dispose(){disposed.push('pass-'+i);}};
  }
  hall.dispose();hall.dispose();assert.equal(disposed.length,4);assert.equal(new Set(disposed).size,4,'each shadow target is released exactly once, including repeated cleanup');
 }finally{hall.dispose();}
});
