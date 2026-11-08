import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {COLLECTIONS,formatsForColor} from '../shared/lrf-3d/surface-catalog.js';
import {rowShift} from '../shared/lrf-3d/tile-layout.js';
import {makeShowroomSurfaces,SHOWROOM_SURFACE_RECIPES} from '../shared/lrf-3d/showroom-surfaces.js';
import sources from '../shared/lrf-3d/media/showroom/yosemite-native-sources.json' with {type:'json'};
import manufacturerSources from '../shared/lrf-3d/media/showroom/manufacturer-photo-sources.json' with {type:'json'};
import pecchioliSources from '../shared/lrf-3d/media/showroom/pecchioli-native-sources.json' with {type:'json'};

function jpegSize(buffer){
 for(let offset=2;offset<buffer.length-8;){
  assert.equal(buffer[offset],255);const marker=buffer[offset+1],length=buffer.readUInt16BE(offset+2);
  if([0xc0,0xc1,0xc2].includes(marker))return [buffer.readUInt16BE(offset+7),buffer.readUInt16BE(offset+5)];
  offset+=length+2;
 }
 return null;
}

test('the selected Creta formats are real and Yosemite uses native SKU photographs without generated faces or upscaling',()=>{
 for(const [id,recipe]of Object.entries(SHOWROOM_SURFACE_RECIPES)){
  assert.equal(recipe.generated,false,id);assert(recipe.images.length);assert(recipe.images.every(url=>!url.includes('reconstructed')));
  if(recipe.manufacturer!=='Elios Ceramica')continue;
  const color=COLLECTIONS[recipe.collection].colors.find(c=>c.id===recipe.colorId),format=formatsForColor(recipe.collection,recipe.colorId).find(f=>f.id===recipe.format);
  assert(color);assert(format);assert.equal(recipe.width,format.width);assert.equal(recipe.height,format.height);
 }
 assert.equal(sources.length,8);
 for(const source of sources){
  const file=readFileSync(new URL('../shared/lrf-3d/media/showroom/'+source.file,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),source.sha256);
  assert.deepEqual(jpegSize(file),[1000,200]);assert.deepEqual([source.width,source.height],[1000,200]);assert.equal(source.generated,false);assert.equal(source.resized,false);
  assert.match(source.productSource,new RegExp(source.reference.toLowerCase()+'$'));
 }
 assert.equal(SHOWROOM_SURFACE_RECIPES['yosemite-honey'].provenance.reference,'03H2D40');
 assert.equal(SHOWROOM_SURFACE_RECIPES['yosemite-natural'].provenance.reference,'03H2D60');
});

test('Yosemite floor has clipped physical plank cuts, metre scale, per-tile UV and the actual one-third stagger',()=>{
 const manager=makeShowroomSurfaces(),bounds={minX:-2,maxX:2,minZ:-4,maxZ:0},floor=manager.createFloorPatch({bounds,recipeId:'yosemite-honey'});
 try{
  const {cells}=floor.userData,recipe=floor.userData.showroomRecipe;assert.equal(floor.userData.showroomLayout.pattern,'third');assert.equal(floor.userData.showroomLayout.direction,'vertical');
  assert(cells.length>40);assert(cells.every(cell=>cell.width===1.195&&cell.height===.234));
  const groups=new Map();for(const cell of cells){const [col,row]=cell.key.split(':').map(Number);const list=groups.get(col)||[];list.push({row,cell});groups.set(col,list);}
  const rows=[...groups.values()].find(list=>list.length>6).sort((a,b)=>a.row-b.row);let offsets=0;
  for(let index=1;index<rows.length;index++)if(rows[index].row===rows[index-1].row+1){const a=rows[index-1],b=rows[index];assert(Math.abs((b.cell.center[1]-a.cell.center[1])-(rowShift('third',b.row,recipe.width)-rowShift('third',a.row,recipe.width)))<1e-8);offsets++;}
  assert(offsets>=6,'multiple continuous rows carry the real third-plank displacement');
  const surfaces=floor.children.filter(object=>object.name.startsWith('Surface_'));assert.equal(surfaces.length,4,'four original plank faces share four bounded batches');
  for(const mesh of surfaces){const position=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;for(let i=0;i<position.count;i++){assert(position.getX(i)>=bounds.minX-1e-6&&position.getX(i)<=bounds.maxX+1e-6);assert(position.getZ(i)>=bounds.minZ-1e-6&&position.getZ(i)<=bounds.maxZ+1e-6);assert(uv.getX(i)>-1e-6&&uv.getX(i)<1+1e-6);assert(uv.getY(i)>-1e-6&&uv.getY(i)<1+1e-6);}}
 }finally{manager.dispose();}
});

test('whole low walls and all their visible meshes open the matching native collection rather than an unrelated poster',()=>{
 const manager=makeShowroomSurfaces(),wall=manager.createWall({width:4.8,height:2.3,recipeId:'creta-ginepro',position:[4,0,-10],rotation:Math.PI/2});
 try{
  assert.deepEqual(wall.position.toArray(),[4,0,-10]);assert.equal(wall.rotation.y,Math.PI/2);
  const target=wall.userData.showroomCollection;assert.equal(target.manufacturer.name,'Elios Ceramica');assert.equal(target.collection.name,'Creta');assert.equal(target.collection.selectedColor,'Ginepro');assert.equal(target.collection.selectedFormat,'60x120');assert(target.collection.hdImages.length>=6);
  wall.traverse(object=>{if(!object.isMesh)return;assert.equal(object.userData.showroomCollection,target);const hits=[];object.raycast({},hits);assert.equal(hits.length,0,'editor picking remains isolated');});
  wall.updateMatrixWorld(true);const box=new T.Box3().setFromObject(wall);assert(Math.abs(box.min.y)<1e-7&&Math.abs(box.max.y-2.3)<1e-6,'baseY convention and human-height wall');
 }finally{manager.dispose();}
});

test('both sides of a booth wall expose native tile faces and the same HD collection with one batch per material',async()=>{
 const manager=makeShowroomSurfaces({loadTexture:async()=>new T.Texture({width:1400,height:700})}),wall=manager.createWall({width:4.8,height:2.3,recipeId:'creta-ginepro'});
 try{
  await manager.prepareNear({x:0,z:2});wall.updateMatrixWorld(true);assert.equal(wall.children.length,2,'front and rear share one tiled batch plus the grout support');
  const surface=wall.children.find(object=>object.name.startsWith('Surface_')),geometry=surface.geometry,{position,normal,uv}=geometry.attributes,count=position.count/2;assert.equal(geometry.userData.surfaceSides,2);assert(surface.material.map,'real native map is bound');
  for(let i=0;i<count;i++){assert(Math.abs(position.getX(i+count)+position.getX(i))<1e-6);assert(Math.abs(position.getY(i+count)-position.getY(i))<1e-6);assert(Math.abs(position.getZ(i+count)+position.getZ(i)+.052)<1e-6);assert(Math.abs(normal.getZ(i+count)+normal.getZ(i))<1e-6);assert.equal(uv.getX(i+count),uv.getX(i));assert.equal(uv.getY(i+count),uv.getY(i));}
  for(const [z,direction,plane,sign]of [[2,-1,0,1],[-2,1,-.052,-1]]){
   const ray=new T.Raycaster(new T.Vector3(.35,1.1,z),new T.Vector3(0,0,direction)),hits=[];wall.traverse(object=>{if(object.isMesh)T.Mesh.prototype.raycast.call(object,ray,hits);});hits.sort((a,b)=>a.distance-b.distance);
   assert(hits.length);assert.equal(hits[0].object,surface,'the exterior view hits ceramic before plain support');assert(Math.abs(hits[0].point.z-plane)<1e-6);assert.equal(hits[0].face.normal.z,sign);assert.equal(hits[0].object.userData.showroomCollection,wall.userData.showroomCollection);assert.equal(hits[0].object.userData.showroomCollection.collection.selectedColor,'Ginepro');assert(hits[0].uv.x>=0&&hits[0].uv.x<=1&&hits[0].uv.y>=0&&hits[0].uv.y<=1);
  }
  const support=wall.children.find(object=>object.name.startsWith('Support_'));support.geometry.computeBoundingBox();assert(support.position.z+support.geometry.boundingBox.min.z>-.052,'rear tile face stands ahead of the support and cannot flicker with it');
 }finally{manager.dispose();}
});

test('manufacturer stands retain their own brand, real collection and original flat product photograph',()=>{
 const manager=makeShowroomSurfaces();
 try{
  for(const [id,brand,collection]of [['view-corso-beige','View Ceramica','CORSO'],['view-golden-carbon','View Ceramica','GOLDEN STONE'],['view-marmi-sahara','View Ceramica','I MARMI DI VIEW'],['fenice-travertino-almond','La Fenice','Il Travertino'],['fenice-xmetal-bronzo','La Fenice','X Metal'],['bulbo-chevron','Bulbo','Chevron']]){
   const wall=manager.createWall({width:4.8,height:2.3,recipeId:id}),target=wall.userData.showroomCollection,recipe=SHOWROOM_SURFACE_RECIPES[id];
   assert.equal(target.manufacturer.name,brand);assert.equal(target.collection.name,collection);assert.equal(target.collection.surfaceRecipe,recipe);assert.equal(recipe.generated,false);assert(target.collection.hdImages.some(image=>image.url===recipe.hdImage&&image.native&&!image.generated));
   if(brand==='View Ceramica'){const record=COLLECTIONS[recipe.collection],color=record.colors.find(c=>c.id===recipe.colorId);assert.equal(record.brand,'VIEW');assert.equal(color.nativeFaces,true);assert(formatsForColor(recipe.collection,recipe.colorId).some(size=>size.id===recipe.format&&size.width===recipe.width&&size.height===recipe.height));}
  }
  for(const source of manufacturerSources){
   const file=readFileSync(new URL('../shared/lrf-3d/media/showroom/'+source.file,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),source.sha256);assert.deepEqual(jpegSize(file),[source.pixelWidth,source.pixelHeight]);assert.equal(source.generated,false);assert.equal(source.resized,false);
  }
  const fenice=JSON.parse(readFileSync(new URL('../assets/data/fenice-catalogue.json',import.meta.url))),bulbo=JSON.parse(readFileSync(new URL('../assets/data/bulbo-catalogue.json',import.meta.url)));
  for(const source of manufacturerSources.filter(item=>item.manufacturer==='La Fenice')){const record=fenice.collections.find(c=>c.name===source.collection);assert(record.formats.includes(source.format));assert(record.swatches.some(swatch=>swatch.name===source.color&&swatch.original===source.source));}
  const chevron=bulbo.collections.find(c=>c.slug==='chevron');assert(chevron.formats.includes('120 × 279 cm'));assert(chevron.images.some(image=>image.originalUrl===SHOWROOM_SURFACE_RECIPES['bulbo-chevron'].source));
 }finally{manager.dispose();}
});

test('Pecchioli gold original keeps its four 20cm tiles in a 40cm module and exact collection target',()=>{
 const source=pecchioliSources[0],file=readFileSync(new URL('../shared/lrf-3d/media/showroom/'+source.file,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),source.sha256);assert.deepEqual(jpegSize(file),[1614,1604]);assert.equal(source.generated,false);assert.equal(source.resized,false);
 const manager=makeShowroomSurfaces(),wall=manager.createWall({width:2.4,height:2.3,recipeId:'pecchioli-specchi-oro'});
 try{const recipe=wall.userData.showroomRecipe,target=wall.userData.showroomCollection;assert.equal(recipe.width,.4);assert.equal(recipe.height,.4);assert.equal(recipe.format,'20x20');assert(wall.userData.cells.every(cell=>cell.width===.4&&cell.height===.4));assert.equal(target.manufacturer.name,'Pecchioli Firenze');assert.equal(target.collection.name,'Specchi Oro');assert.equal(target.collection.selectedFormat,'Module de 4 carreaux 20 × 20 cm');assert.equal(target.collection.surfaceRecipe.provenance.module.subtileWidth,.2);assert.equal(target.collection.surfaceRecipe.provenance.module.subtileHeight,.2);assert.equal(target.collection.hdImage,'assets/showroom/'+source.file);}finally{manager.dispose();}
});

test('native map loading is lazy, proximity-bounded and releases maps while the visitor changes areas',async()=>{
 let loads=0,released=0;const requests=[];
 const manager=makeShowroomSurfaces({maxResidentMaps:6,loadTexture:async(url,options)=>{loads++;requests.push({url,options});const texture=new T.Texture({width:1000,height:200});texture.addEventListener('dispose',()=>released++);return texture;}});
 manager.createFloorPatch({bounds:{minX:-2,maxX:2,minZ:-4,maxZ:0},recipeId:'yosemite-honey'});manager.createWall({width:4,height:2.3,recipeId:'creta-ginepro'});manager.createWall({width:4,height:2.3,recipeId:'slate-dark',position:[100,0,-3]});
 assert.equal(loads,0);await manager.prepareNear({x:0,z:-2});assert.equal(manager.diagnostics().residentMaps,5);assert(requests.every(r=>r.options.maxDimension===2048));assert(requests.every(r=>!r.url.includes('reconstructed')));
 await manager.prepareNear({x:100,z:-3});assert(released>=5);assert(manager.diagnostics().residentMaps<=6);
 manager.dispose();assert.equal(released,loads,'each owned native bitmap is disposed once');
});

test('leaving the exhibition aborts pending native downloads and late completions cannot wake the renderer',async()=>{
 const resolvers=[];let released=0,wakes=0;
 const manager=makeShowroomSurfaces({onReady:()=>wakes++,loadTexture:(_url,options)=>new Promise(resolve=>resolvers.push({resolve,signal:options.signal}))});
 manager.createFloorPatch({bounds:{minX:-2,maxX:2,minZ:-4,maxZ:0},recipeId:'yosemite-honey'});const task=manager.prepareNear({x:0,z:-2});manager.dispose();assert(resolvers.every(r=>r.signal.aborted));
 for(const pending of resolvers){const texture=new T.Texture();texture.addEventListener('dispose',()=>released++);pending.resolve(texture);}await task;assert.equal(released,4);assert.equal(wakes,0);assert.equal(manager.diagnostics().residentMaps,0);
});

test('a transient complete download failure is retried after leaving and returning to that exhibition area',async()=>{
 let fail=true,requests=0;
 const manager=makeShowroomSurfaces({loadTexture:async()=>{requests++;if(fail)throw Error('temporary connection failure');return new T.Texture({width:1400,height:700});}});
 manager.createWall({width:4,height:2.3,recipeId:'creta-ginepro'});await manager.prepareNear({x:0,z:-2});assert.equal(requests,1);assert.equal(manager.diagnostics().residentMaps,0);
 await manager.prepareNear({x:0,z:-2});assert.equal(requests,1,'holding the view must not storm the network');await manager.prepareNear({x:100,z:-2});fail=false;await manager.prepareNear({x:0,z:-2});assert.equal(requests,2);assert.equal(manager.diagnostics().residentMaps,1);manager.dispose();
});
