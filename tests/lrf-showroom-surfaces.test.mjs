import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {COLLECTIONS,formatsForColor} from '../shared/lrf-3d/surface-catalog.js';
import {rowShift} from '../shared/lrf-3d/tile-layout.js';
import {makeShowroomSurfaces,SHOWROOM_SURFACE_RECIPES} from '../shared/lrf-3d/showroom-surfaces.js';
import sources from '../shared/lrf-3d/media/showroom/yosemite-native-sources.json' with {type:'json'};
import slateSources from '../shared/lrf-3d/media/showroom/slate-native-sources.json' with {type:'json'};
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
  const surfaces=floor.children.filter(object=>object.name.startsWith('Surface_'));assert.equal(surfaces.length,2,'two tonally close original plank faces share two bounded batches');
  for(const mesh of surfaces){const position=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;for(let i=0;i<position.count;i++){assert(position.getX(i)>=bounds.minX-1e-6&&position.getX(i)<=bounds.maxX+1e-6);assert(position.getZ(i)>=bounds.minZ-1e-6&&position.getZ(i)<=bounds.maxZ+1e-6);assert(uv.getX(i)>-1e-6&&uv.getX(i)<1+1e-6);assert(uv.getY(i)>-1e-6&&uv.getY(i)<1+1e-6);}}
 }finally{manager.dispose();}
});

test('Yosemite inset faces retain their native colour with a close shade range and an irregular distribution',()=>{
 for(const color of ['honey','natural']){
  const recipe=SHOWROOM_SURFACE_RECIPES['yosemite-'+color],selected=recipe.images.map(url=>sources.find(source=>url.endsWith('/'+source.file)));
  assert.equal(selected.length,2);assert(selected.every(source=>source.color===color));assert.equal(recipe.hdImages.length,8,'all unmodified supplier faces stay available for HD inspection');
  for(let channel=0;channel<3;channel++)assert(Math.max(...selected.map(source=>source.meanSRGB[channel]))-Math.min(...selected.map(source=>source.meanSRGB[channel]))<8,'native mean channel difference stays below8/255 rather than creating light/dark plank blocks');
  const manager=makeShowroomSurfaces(),floor=manager.createFloorPatch({bounds:{minX:-4,maxX:4,minZ:-5,maxZ:5},recipeId:recipe.id});
  try{
   const assignments=new Map();for(const surface of floor.children.filter(object=>object.name.startsWith('Surface_')))for(const cell of surface.geometry.userData.faceCells)assignments.set(cell,surface.geometry.userData.faceIndex);
   let equal=0,total=0;for(const [cell,face]of assignments){const [col,row]=cell.split(':').map(Number),next=assignments.get((col+1)+':'+(row+1));if(next===undefined)continue;total++;if(face===next)equal++;}assert(total>100);assert(equal/total>.25&&equal/total<.75,'adjacent diagonals cannot repeat a shade lattice');
  }finally{manager.dispose();}
 }
});

test('the wood grain follows the physical long plank axis and native maps use cropped aspect, mipmaps and restrained matt response',async()=>{
 const manager=makeShowroomSurfaces({loadTexture:async()=>new T.Texture({width:1000,height:200})}),floor=manager.createFloorPatch({bounds:{minX:-2,maxX:2,minZ:-3,maxZ:1},recipeId:'yosemite-natural'});
 try{
  await manager.prepareNear({x:0,z:-1});let checked=0;
  for(const surface of floor.children.filter(object=>object.name.startsWith('Surface_'))){
   const {position,normal,uv}=surface.geometry.attributes,map=surface.material.map;assert(map);assert.equal(map.colorSpace,T.SRGBColorSpace);assert.equal(map.minFilter,T.LinearMipmapLinearFilter);assert.equal(map.magFilter,T.LinearFilter);assert.equal(map.generateMipmaps,true);assert.equal(map.wrapS,T.ClampToEdgeWrapping);assert.equal(map.wrapT,T.ClampToEdgeWrapping);assert.equal(map.repeat.x,1);assert(Math.abs(map.repeat.y-5/(1.195/.234))<1e-8);assert.equal(map.offset.y,(1-map.repeat.y)/2);assert(surface.material.roughness>=.8);assert(surface.material.clearcoat<.01);
   for(let i=0;i<position.count;i+=3){if(normal.getY(i)<.99)continue;const ax=position.getX(i+1)-position.getX(i),az=position.getZ(i+1)-position.getZ(i),bx=position.getX(i+2)-position.getX(i),bz=position.getZ(i+2)-position.getZ(i),det=ax*bz-bx*az;if(Math.abs(det)<1e-6)continue;
    const au=uv.getX(i+1)-uv.getX(i),bu=uv.getX(i+2)-uv.getX(i),av=uv.getY(i+1)-uv.getY(i),bv=uv.getY(i+2)-uv.getY(i),dux=(au*bz-bu*az)/det,duz=(ax*bu-bx*au)/det,dvx=(av*bz-bv*az)/det,dvz=(ax*bv-bx*av)/det;
    assert(Math.abs(dux)<2e-4&&Math.abs(dvz)<2e-4,'grain never turns90degrees across the plank');assert(Math.abs(Math.abs(duz)-1/1.195)<2e-4);assert(Math.abs(Math.abs(dvx)-1/.234)<2e-4);checked++;
   }
  }
  assert(checked>30,'real clipped triangles preserve metre-based native grain mapping');
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

test('Slate Gold, River and Dark use native 500x1000 product faces and preserve the whole portrait slab in a landscape format',async()=>{
 assert.equal(slateSources.length,6);
 for(const source of slateSources){const file=readFileSync(new URL('../shared/lrf-3d/media/showroom/'+source.file,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),source.sha256);assert.deepEqual(jpegSize(file),[500,1000]);assert.equal(source.generated,false);assert.equal(source.resized,false);assert.match(source.productSource,new RegExp(source.reference.toLowerCase()+'$'));}
 for(const color of ['gold','river','dark']){
  const id='slate-'+color,recipe=SHOWROOM_SURFACE_RECIPES[id],manager=makeShowroomSurfaces({loadTexture:async()=>new T.Texture({width:500,height:1000})}),wall=manager.createWall({recipeId:id,width:3,height:1.2});
  try{
   assert.equal(recipe.collection,'Slate');assert.equal(recipe.colorId,color);assert.equal(recipe.format,'60x120');assert.equal(recipe.images.length,2);assert.equal(recipe.hdImages.length,6);assert(recipe.provenance.reference.startsWith('03F6A'));await manager.prepareNear({x:0,z:1});
   for(const surface of wall.children.filter(object=>object.name.startsWith('Surface_'))){const map=surface.material.map;assert.equal(map.rotation,Math.PI/2);assert.deepEqual(map.repeat.toArray(),[1,1],'the original slab is rotated whole rather than cropped to its central quarter');map.updateMatrix();const corners=[[0,0],[1,0],[1,1],[0,1]].map(point=>new T.Vector2(...point).applyMatrix3(map.matrix));assert(corners.every(point=>Math.abs(point.x-Math.round(point.x))<1e-7&&Math.abs(point.y-Math.round(point.y))<1e-7));assert(map.matrix.determinant()>.9999,'orientation preserves the original without a mirror');assert.equal(surface.userData.showroomCollection.collection.name,'Slate');assert.equal(surface.userData.showroomCollection.collection.selectedColor,recipe.color);}
  }finally{manager.dispose();}
 }
});

test('a dedicated pool lining shares two native maps across its floor and four walls and releases them once on replacement',async()=>{
 let requests=0,released=0;const manager=makeShowroomSurfaces({maxResidentMaps:2,loadTexture:async()=>{requests++;const texture=new T.Texture({width:500,height:1000});texture.addEventListener('dispose',()=>released++);return texture;}}),lining=new T.Group();
 lining.add(manager.createFloorPatch({bounds:{minX:-2,maxX:2,minZ:-3,maxZ:3},recipeId:'slate-gold',y:-1.25}));
 for(const spec of [{width:4,position:[0,-1.25,-3],rotation:0},{width:4,position:[0,-1.25,3],rotation:Math.PI},{width:6,position:[-2,-1.25,0],rotation:Math.PI/2},{width:6,position:[2,-1.25,0],rotation:-Math.PI/2}])lining.add(manager.createWall({...spec,height:1.25,recipeId:'slate-gold'}));
 try{await manager.prepareNear({x:0,z:0});assert.equal(requests,2);assert.equal(manager.diagnostics().residentMaps,2);const maps=new Set();lining.traverse(object=>{if(object.isMesh&&object.name.startsWith('Surface_')){maps.add(object.material.map);assert.equal(object.userData.showroomCollection.collection.selectedColor,'Gold');assert.equal(object.userData.showroomRecipe.format,'60x120');}});assert.equal(maps.size,2);manager.dispose();manager.dispose();assert.equal(released,2,'changing the selected lining can dispose one dedicated owner without leaking shared native maps');assert.equal(lining.children.length,0);}finally{manager.dispose();}
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
 assert.equal(loads,0);await manager.prepareNear({x:0,z:-2});assert.equal(manager.diagnostics().residentMaps,3);assert(requests.every(r=>r.options.maxDimension===2048));assert(requests.every(r=>!r.url.includes('reconstructed')));
 await manager.prepareNear({x:100,z:-3});assert(released>=3);assert(manager.diagnostics().residentMaps<=6);
 manager.dispose();assert.equal(released,loads,'each owned native bitmap is disposed once');
});

test('leaving the exhibition aborts pending native downloads and late completions cannot wake the renderer',async()=>{
 const resolvers=[];let released=0,wakes=0;
 const manager=makeShowroomSurfaces({onReady:()=>wakes++,loadTexture:(_url,options)=>new Promise(resolve=>resolvers.push({resolve,signal:options.signal}))});
 manager.createFloorPatch({bounds:{minX:-2,maxX:2,minZ:-4,maxZ:0},recipeId:'yosemite-honey'});const task=manager.prepareNear({x:0,z:-2});manager.dispose();assert(resolvers.every(r=>r.signal.aborted));
 for(const pending of resolvers){const texture=new T.Texture();texture.addEventListener('dispose',()=>released++);pending.resolve(texture);}await task;assert.equal(released,2);assert.equal(wakes,0);assert.equal(manager.diagnostics().residentMaps,0);
});

test('a transient complete download failure is retried after leaving and returning to that exhibition area',async()=>{
 let fail=true,requests=0;
 const manager=makeShowroomSurfaces({loadTexture:async()=>{requests++;if(fail)throw Error('temporary connection failure');return new T.Texture({width:1400,height:700});}});
 manager.createWall({width:4,height:2.3,recipeId:'creta-ginepro'});await manager.prepareNear({x:0,z:-2});assert.equal(requests,1);assert.equal(manager.diagnostics().residentMaps,0);
 await manager.prepareNear({x:0,z:-2});assert.equal(requests,1,'holding the view must not storm the network');await manager.prepareNear({x:100,z:-2});fail=false;await manager.prepareNear({x:0,z:-2});assert.equal(requests,2);assert.equal(manager.diagnostics().residentMaps,1);manager.dispose();
});

test('nested rotated islands load in hall coordinates, evict at the real distance and retry a late failure on return',async()=>{
 const world=new T.Group(),hall=new T.Group(),island=new T.Group();world.position.set(130,0,-80);world.rotation.y=.6;hall.position.set(-7,0,12);hall.rotation.y=-.4;world.add(hall);island.position.set(60,0,-5);island.rotation.y=Math.PI/2;hall.add(island);
 let requests=0,releases=0,wakes=0,finish;const manager=makeShowroomSurfaces({coordinateRoot:hall,onReady:()=>wakes++,loadTexture:()=>{requests++;return new Promise((resolve,reject)=>{finish={resolve,reject};});}}),wall=manager.createWall({width:4,height:2.3,recipeId:'creta-ginepro',position:[0,0,-3]});island.add(wall);
 try{
  await manager.prepareNear({x:0,z:-3});assert.equal(requests,0,'the untransformed local origin must not load a distant island');
  const task=manager.prepareNear({x:57,z:-5});assert.equal(requests,1,'the actual rotated island is near in hall coordinates');finish.reject(Error('late native download failure'));await task;assert.equal(manager.diagnostics().residentMaps,0);assert.equal(wakes,0);
  await manager.prepareNear({x:57,z:-5});assert.equal(requests,1,'a held view cannot retry every frame');await manager.prepareNear({x:0,z:-3});const retry=manager.prepareNear({x:57,z:-5});assert.equal(requests,2);
  const texture=new T.Texture({width:1400,height:700});texture.addEventListener('dispose',()=>releases++);finish.resolve(texture);await retry;assert.equal(manager.diagnostics().residentMaps,1);assert.equal(wakes,1);
  await manager.prepareNear({x:0,z:-3});assert.equal(manager.diagnostics().residentMaps,0);assert.equal(releases,1,'walking away from the real transformed zone releases its GPU map');
 }finally{manager.dispose();}
});

test('an independent surface manager measures a nested patch in world coordinates without a coordinate root',async()=>{
 let requests=0;const parent=new T.Group();parent.position.set(-50,0,20);parent.rotation.y=Math.PI/2;const manager=makeShowroomSurfaces({loadTexture:async()=>{requests++;return new T.Texture({width:1400,height:700});}}),wall=manager.createWall({width:4,height:2.3,recipeId:'creta-ginepro',position:[0,0,-4]});parent.add(wall);
 try{await manager.prepareNear({x:0,z:-4});assert.equal(requests,0);await manager.prepareNear({x:-54,z:20});assert.equal(requests,1);assert.equal(manager.diagnostics().residentMaps,1);}finally{manager.dispose();}
});
