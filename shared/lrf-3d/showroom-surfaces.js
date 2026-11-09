import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {COLLECTIONS,formatsForColor} from './surface-catalog.js';
import {buildTileGeometry} from './tile-layout.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';
import {SHOWROOM_MANUFACTURERS} from './showroom-catalog.js';
import yosemiteSources from './media/showroom/yosemite-native-sources.json' with {type:'json'};
import slateSources from './media/showroom/slate-native-sources.json' with {type:'json'};
import manufacturerSources from './media/showroom/manufacturer-photo-sources.json' with {type:'json'};
import pecchioliSources from './media/showroom/pecchioli-native-sources.json' with {type:'json'};

const noRaycast=()=>{};
const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const nativeGallery=collection=>COLLECTIONS[collection].colors.flatMap(color=>{
 if(color.nativeFaces!==true||!color.file)return [];
 return [{url:surfaceAssetURL(color.file),label:collection+' · '+color.name,kind:'tile',native:true,generated:false}];
});
function nativeRecipe(collection,colorId,format,{id,pattern='straight',fallback='#8a806e',grout='#6d6559',roughness}={}){
 const record=COLLECTIONS[collection],color=record?.colors.find(c=>c.id===colorId),size=formatsForColor(collection,colorId).find(f=>f.id===format);
 if(!color||!size||!color.file)throw Error('Revêtement réel indisponible : '+[collection,colorId,format].join(' / '));
 if(!color.nativeFaces&&!(color.source===color.file&&/^https:\/\/eliosceramica.com\//.test(color.source)))throw Error('Une matière reconstruite ne peut pas servir de revêtement de salon.');
 const native=color.faces?.length?color.faces:[color.file],images=native.slice(0,collection==='Slate'?2:1).map(surfaceAssetURL);
 const manufacturer=({ELIOS:'Elios Ceramica',VIEW:'View Ceramica'})[record.brand];
 if(!manufacturer)throw Error('Fabricant du revêtement non identifié : '+record.brand);
 return Object.freeze({id:id||key(collection)+'-'+colorId,manufacturer,collection,color:color.name,colorId,format,width:size.width,height:size.height,pattern,direction:'horizontal',images,image:images[0],hdImage:surfaceAssetURL(color.file),hdImages:nativeGallery(collection),source:color.source||record.source,nativeFaces:true,generated:false,fallback,grout,roughness:roughness??(collection==='Shell'?.56:.8),provenance:{kind:'canonical-native-manufacturer-sample',generated:false,source:color.source||record.source}});
}
const manufacturerPhotoSources=[...manufacturerSources,...pecchioliSources.map(source=>({...source,id:'pecchioli-specchi-oro',color:'NOR 71 · '+source.color,colorId:'nor-71',pixelWidth:source.width,pixelHeight:source.height,width:source.module.width,height:source.module.height,formatLabel:source.module.label,fallback:'#716041',grout:'#3d3930',roughness:.36}))];
function manufacturerRecipe(id){
 const source=manufacturerPhotoSources.find(item=>item.id===id);
 if(!source||source.generated||source.resized)throw Error('Photographie fabricant originale indisponible : '+id);
 const image='assets/showroom/'+source.file;
 return Object.freeze({...source,image,images:[image],hdImage:image,hdImages:[{url:image,label:source.manufacturer+' · '+source.collection+' · '+source.color+(source.formatLabel?' · '+source.formatLabel:''),kind:'tile',native:true,generated:false,width:source.pixelWidth,height:source.pixelHeight,source:source.source}],pattern:'straight',direction:'horizontal',nativeFaces:true,generated:false,provenance:{kind:'manufacturer-front-facing-product-photograph',generated:false,resized:false,source:source.source,productSource:source.productSource,width:source.pixelWidth,height:source.pixelHeight,sha256:source.sha256,...(source.module?{module:source.module}:{})}});
}
function yosemiteRecipe(colorId){
 // The published range includes strong natural shade variation. A small wood
 // inset uses two observed, tonally close faces rather than the full shade mix;
 // the complete, untouched originals remain available in the HD gallery.
 const selected=colorId==='honey'?['02','05']:['04','12'],color=COLLECTIONS.Yosemite.colors.find(c=>c.id===colorId),size=formatsForColor('Yosemite',colorId).find(f=>f.id==='23.4x119.5'),sources=selected.map(face=>yosemiteSources.find(s=>s.color===colorId&&s.file.endsWith('-'+face+'.jpg'))),images=sources.filter(Boolean).map(s=>'assets/showroom/'+s.file);
 if(!color||!size||sources.some(source=>!source))throw Error('Les planches originales Yosemite sont indisponibles.');
 return Object.freeze({id:'yosemite-'+colorId,manufacturer:'Elios Ceramica',collection:'Yosemite',color:color.name,colorId,format:size.id,width:size.width,height:size.height,pattern:'third',direction:'vertical',images,image:images[0],hdImage:images[0],hdImages:yosemiteSources.map(s=>({url:'assets/showroom/'+s.file,label:'Yosemite · '+s.color+' · '+s.reference+' · face '+s.file.match(/-(\d+)\.jpg$/)?.[1],kind:'tile',native:true,generated:false,width:s.width,height:s.height,source:s.source})),source:sources[0].productSource,nativeFaces:true,generated:false,fallback:colorId==='honey'?'#b69466':'#97816a',grout:colorId==='honey'?'#a48b69':'#897865',roughness:.84,clearcoat:.005,provenance:{kind:'manufacturer-brand-product-platform-native-tile',generated:false,resized:false,reference:sources[0].reference,source:sources[0].productSource,selection:'two-tonally-close-native-faces',faces:sources.map(s=>({source:s.source,width:s.width,height:s.height,sha256:s.sha256}))}});
}
function slateRecipe(colorId,options){
 const recipe=nativeRecipe('Slate',colorId,'60x120',options),sources=slateSources.filter(source=>source.color===colorId),images=sources.map(source=>'assets/showroom/'+source.file);
 if(sources.length<2)throw Error('Les dalles originales Slate sont indisponibles.');
 return Object.freeze({...recipe,images,image:images[0],hdImage:images[0],hdImages:slateSources.map(source=>({url:'assets/showroom/'+source.file,label:'Slate · '+source.color+' · '+source.reference+' · face '+source.file.match(/-(\d+)\.jpg$/)?.[1],kind:'tile',native:true,generated:false,width:source.width,height:source.height,source:source.source})),orientToFormat:true,provenance:{kind:'manufacturer-brand-product-platform-native-tile',generated:false,resized:false,reference:sources[0].reference,source:sources[0].productSource,faces:sources.map(source=>({source:source.source,width:source.width,height:source.height,sha256:source.sha256})),orientation:'native-portrait-face-rotated-to-physical-landscape-format'}});
}
export const SHOWROOM_SURFACE_RECIPES=Object.freeze({
 'yosemite-honey':yosemiteRecipe('honey'),
 'yosemite-natural':yosemiteRecipe('natural'),
 'creta-biscotto':nativeRecipe('Creta','biscotto','120x120',{fallback:'#a48b68',grout:'#88775f'}),
 'creta-caramello':nativeRecipe('Creta','caramello','60x120',{fallback:'#976d44',grout:'#7c5d40'}),
 'creta-ginepro':nativeRecipe('Creta','ginepro','60x120',{fallback:'#64705c',grout:'#54604f'}),
 'creta-pepe':nativeRecipe('Creta','pepe','60x120',{fallback:'#4c4d46',grout:'#3c3d36'}),
 'creta-malto':nativeRecipe('Creta','malto','120x120',{fallback:'#8e6d4e',grout:'#755c46'}),
 'creta-avena':nativeRecipe('Creta','avena','120x120',{fallback:'#b8a98b',grout:'#998d78'}),
 'shell-grey':nativeRecipe('Shell','grey','60x120',{fallback:'#767b77',grout:'#5a625c'}),
 'slate-dark':slateRecipe('dark',{fallback:'#343d3b',grout:'#2e3431'}),
 'slate-river':slateRecipe('river',{fallback:'#5b6a71',grout:'#555d56'}),
 'slate-gold':slateRecipe('gold',{fallback:'#b2a388',grout:'#93866e'}),
 'roma-palatino':nativeRecipe('Roma','palatino','61x61',{fallback:'#af9c83',grout:'#91836f'}),
 'view-corso-beige':nativeRecipe('Corso','beige','60x120',{id:'view-corso-beige',fallback:'#b5a388',grout:'#98896f'}),
 'view-golden-carbon':nativeRecipe('Golden Stone','carbon','120x120',{id:'view-golden-carbon',fallback:'#575a53',grout:'#464a43'}),
 'view-marmi-sahara':nativeRecipe('I MARMI DI VIEW','sahara-noir','60x120',{id:'view-marmi-sahara',fallback:'#302c28',grout:'#2a2721',roughness:.39}),
 'fenice-travertino-almond':manufacturerRecipe('fenice-travertino-almond'),
 'fenice-xmetal-bronzo':manufacturerRecipe('fenice-xmetal-bronzo'),
 'bulbo-chevron':manufacturerRecipe('bulbo-chevron'),
 'pecchioli-specchi-oro':manufacturerRecipe('pecchioli-specchi-oro'),
 'biopietra-borgo':Object.freeze({id:'biopietra-borgo',manufacturer:'BioPietra',collection:'Borgo Antico',color:'Borgo Antico',colorId:'borgo-antico',format:'Parement',width:2.4,height:2.4,pattern:'straight',direction:'horizontal',images:['https://leroyfactory.fr/assets/img/biopietra-20261101/8edbae0fda02fe39a1.webp'],image:'https://leroyfactory.fr/assets/img/biopietra-20261101/8edbae0fda02fe39a1.webp',hdImage:'https://biopietra.com/wp-content/uploads/2016/08/Borgo-Antico_muro-870x870.jpg',hdImages:[{url:'https://biopietra.com/wp-content/uploads/2016/08/Borgo-Antico_muro-870x870.jpg',label:'BioPietra · Borgo Antico · original fabricant',kind:'tile',native:true,generated:false,width:870,height:870}],source:'https://biopietra.com/prodotto/borgo-antico/',nativeFaces:true,generated:false,fallback:'#867f6d',grout:'#6e685b',roughness:.96,provenance:{kind:'manufacturer-front-facing-stone-sample',generated:false,width:870,height:870,source:'https://biopietra.com/prodotto/borgo-antico/'}})
});

function entryFor(recipe,manufacturers){
 const all=[...manufacturers,...SHOWROOM_MANUFACTURERS],manufacturer=all.find(m=>key(m.name)===key(recipe.manufacturer)||key(m.name).includes(key(recipe.manufacturer))||key(recipe.manufacturer).includes(key(m.name))),source=manufacturer?.collections?.find(c=>key(c.name)===key(recipe.collection));
 if(!manufacturer||!source)return null;
 return {manufacturer,collection:{...source,hdImage:recipe.hdImage,hdImages:recipe.hdImages,selectedColor:recipe.color,selectedFormat:recipe.formatLabel||recipe.format,surfaceRecipe:recipe}};
}
// Mix all coordinate bits before selecting a face. A low-bit string modulo
// repeats the same shade along diagonals and makes an artificial checkerboard.
const hashCell=(cell,seed=2166136261)=>{let n=seed;for(const c of cell)n=Math.imul(n^c.charCodeAt(0),16777619);n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;};
function splitFaces(geometry,count,wood=false){
 if(count===1)return [geometry];
 const records=Array.from({length:count},()=>({position:[],normal:[],uv:[],faceCells:[]})),attributes=geometry.attributes,cells=geometry.userData.faceCells;
 for(let triangle=0;triangle<cells.length;triangle++){
  const cell=cells[triangle],record=records[hashCell(cell)%count];record.faceCells.push(cell);
  const [col,row]=cell.split(':').map(Number),rotate=wood&&((Math.abs(col*13+row*7)%2===1)!==(hashCell(cell,0x9e3779b9)%2===1));
  for(const name of ['position','normal','uv']){const attribute=attributes[name],begin=triangle*3*attribute.itemSize,end=begin+3*attribute.itemSize;for(let i=begin;i<end;i++)record[name].push(name==='uv'&&rotate?1-attribute.array[i]:attribute.array[i]);}
 }
 const result=records.map((record,index)=>{const part=new T.BufferGeometry();for(const [name,size]of [['position',3],['normal',3],['uv',2]])part.setAttribute(name,new T.Float32BufferAttribute(record[name],size));part.userData={...geometry.userData,faceCells:record.faceCells,faceIndex:index};part.computeBoundingBox();part.computeBoundingSphere();return part;});
 geometry.dispose();return result;
}
function cladBothSides(front){
 const rear=front.clone().rotateY(Math.PI).translate(0,0,-.052),combined=mergeGeometries([front,rear],false);
 if(!combined){rear.dispose();throw Error('Le parement double face du salon est indisponible.');}
 combined.userData={...front.userData,faceCells:[...front.userData.faceCells,...front.userData.faceCells],surfaceSides:2};combined.computeBoundingBox();combined.computeBoundingSphere();front.dispose();rear.dispose();return combined;
}
function fitSample(texture,recipe){
 const image=texture.image,w=image?.naturalWidth||image?.width||1,h=image?.naturalHeight||image?.height||1,target=recipe.width/recipe.height,portrait=w/h,rotate=recipe.orientToFormat&&Math.abs(Math.log(portrait/target))>Math.abs(Math.log(1/portrait/target)),aspect=rotate?1/portrait:portrait;
 let repeatX=1,repeatY=1;if(aspect>target)repeatX=target/aspect;else if(aspect<target)repeatY=aspect/target;
 texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
 if(rotate){texture.center.set(.5,.5);texture.rotation=Math.PI/2;texture.repeat.set(repeatY,repeatX);texture.offset.set(0,0);}
 else{texture.center.set(0,0);texture.rotation=0;texture.repeat.set(repeatX,repeatY);texture.offset.set((1-repeatX)/2,(1-repeatY)/2);}
 texture.anisotropy=8;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 texture.userData.showroomRecipe=recipe.id;texture.userData.nativeSource=true;
}

/** Full-scale ceramic and stone surfaces. Every rendered cell carries local
 * 0..1 UVs, its real manufacturer format and the same HD collection target.
 * Texture maps stay bounded by proximity; no enlarged thumbnails or AI faces. */
export function makeShowroomSurfaces({manufacturers=SHOWROOM_MANUFACTURERS,onReady=()=>{},loadTexture=loadQueuedTexture,maxResidentMaps=20,coordinateRoot=null}={}){
 let disposed=false;const records=new Map(),objects=[],geometries=new Set(),backings=new Map(),ownedTextures=new Set();
 const getRecord=id=>{
  const recipe=SHOWROOM_SURFACE_RECIPES[id];if(!recipe)throw Error('Revêtement de salon inconnu : '+id);
  if(records.has(id))return records.get(id);
  const materials=recipe.images.map(()=>new T.MeshPhysicalMaterial({color:recipe.fallback,roughness:recipe.roughness,metalness:0,clearcoat:recipe.clearcoat??.04,clearcoatRoughness:.78}));
  for(const material of materials){material.name=recipe.manufacturer+' · '+recipe.collection+' · '+recipe.color;material.userData.showroomRecipe=recipe;}
  const record={recipe,materials,patches:[],textures:[],controller:null,task:null,generation:0,state:'idle',distance:Infinity};records.set(id,record);return record;
 };
 const backingFor=recipe=>{if(!backings.has(recipe.grout))backings.set(recipe.grout,new T.MeshStandardMaterial({color:recipe.grout,roughness:.93}));return backings.get(recipe.grout);};
 const mesh=(geometry,material,name,entry,recipe)=>{
  const object=new T.Mesh(geometry,material);object.name=name;object.receiveShadow=true;object.castShadow=false;object.raycast=noRaycast;object.userData={visualOnly:true,excludeFromProductBounds:true,showroomRecipe:recipe,...(entry?{showroomCollection:entry}:{})};geometries.add(geometry);return object;
 };
 function patch({recipeId,polygon,floor=false,y=0,width,height,position=[0,0,0],rotation=0,direction}){
  const record=getRecord(recipeId),recipe=record.recipe,entry=entryFor(recipe,manufacturers),root=new T.Group();root.name=(floor?'Sol_':'Mur_')+recipe.collection+'_'+recipe.color;root.userData={visualOnly:true,excludeFromProductBounds:true,showroomRecipe:recipe,showroomLayout:{pattern:recipe.pattern,direction:direction||recipe.direction,width:recipe.width,height:recipe.height},...(entry?{showroomCollection:entry}:{})};
  const layout={width:recipe.width,height:recipe.height,pattern:recipe.pattern,direction:direction||recipe.direction,groutWidth:2};
  const geometry=buildTileGeometry(polygon,layout),parts=splitFaces(geometry,record.materials.length,recipe.collection==='Yosemite');
  root.userData.tileCount=geometry.userData.tileCount;root.userData.cells=geometry.userData.cells;
  for(const [index,part]of parts.entries()){if(floor)part.rotateX(-Math.PI/2);const visible=floor?part:cladBothSides(part);root.add(mesh(visible,record.materials[index],'Surface_'+recipe.id+'_face_'+index,entry,recipe));}
  const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=maxX-minX,h=maxY-minY;
  if(floor){const base=mesh(new T.BoxGeometry(w,.018,h),backingFor(recipe),'Joints_'+recipe.id,entry,recipe);base.position.set((minX+maxX)/2,-.010,-(minY+maxY)/2);root.add(base);root.position.y=y;}
  else{const base=mesh(new T.BoxGeometry(width,height,.04),backingFor(recipe),'Support_mur_'+recipe.id,entry,recipe);base.position.set(0,height/2,-.026);root.add(base);root.position.fromArray(position);root.rotation.y=rotation;}
  const center=floor?new T.Vector3((minX+maxX)/2,0,-(minY+maxY)/2):new T.Vector3(0,height/2,0),radius=Math.hypot(w,h)/2;record.patches.push({root,center,radius});objects.push(root);return root;
 }
 function createFloorPatch({bounds,recipeId='yosemite-honey',y=.012,direction}={}){
  if(!bounds||![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ].every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Zone de sol invalide.');
  return patch({recipeId,y,floor:true,direction,polygon:[[bounds.minX,-bounds.maxZ],[bounds.maxX,-bounds.maxZ],[bounds.maxX,-bounds.minZ],[bounds.minX,-bounds.minZ]]});
 }
 function createWall({width,height,recipeId='creta-ginepro',position=[0,0,0],rotation=0,direction='horizontal'}={}){
  if(![width,height].every(v=>Number.isFinite(v)&&v>.1)||!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw Error('Mur de salon invalide.');
  return patch({recipeId,width,height,position,rotation,direction,polygon:[[-width/2,0],[width/2,0],[width/2,height],[-width/2,height]]});
 }
 function clear(record){record.generation++;record.controller?.abort();record.controller=null;for(const texture of record.textures){texture.dispose();ownedTextures.delete(texture);}record.textures=[];record.task=null;record.state='idle';for(const material of record.materials){material.map=null;material.color.set(record.recipe.fallback);material.needsUpdate=true;}}
 function load(record){
  if(record.task||record.state==='ready'||disposed)return record.task||Promise.resolve(true);
  if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return Promise.resolve(false);
  const generation=record.generation,controller=new AbortController();record.controller=controller;record.state='loading';
  record.task=Promise.all(record.recipe.images.map(async(url,index)=>{
   let texture;try{texture=await loadTexture(url,{signal:controller.signal,maxDimension:2048});if(disposed||controller.signal.aborted||generation!==record.generation){texture.dispose();return false;}fitSample(texture,record.recipe);record.materials[index].map=texture;record.materials[index].color.set('#ffffff');record.materials[index].needsUpdate=true;record.textures.push(texture);ownedTextures.add(texture);onReady();return true;}
   catch(error){if(!disposed&&generation===record.generation)record.error=String(error?.message||error);return false;}
  })).then(results=>{if(generation===record.generation&&!disposed){record.state=results.every(Boolean)?'ready':'error';record.controller=null;}return results.some(Boolean);});return record.task;
 }
 function prepareNear(position){
  if(disposed)return Promise.resolve([]);
  const p=new T.Vector3(position.x,position.y||0,position.z),ordered=[...records.values()];
  for(const record of ordered)record.distance=Math.min(...record.patches.map(({root,center,radius})=>{const actual=root.localToWorld(center.clone());if(coordinateRoot)coordinateRoot.worldToLocal(actual);return Math.max(0,Math.hypot(p.x-actual.x,p.z-actual.z)-radius);}));
  ordered.sort((a,b)=>a.distance-b.distance);let count=0;const keep=new Set();
  for(const record of ordered)if(record.distance<24&&count+record.materials.length<=maxResidentMaps){keep.add(record);count+=record.materials.length;}
  for(const record of ordered)if(!keep.has(record)&&(record.textures.length||record.controller||record.state==='error'))clear(record);
  return Promise.all([...keep].map(load));
 }
 function dispose(){if(disposed)return;disposed=true;for(const record of records.values()){clear(record);for(const material of record.materials)material.dispose();}for(const material of backings.values())material.dispose();for(const geometry of geometries)geometry.dispose();for(const root of objects)root.removeFromParent();}
 return {recipes:SHOWROOM_SURFACE_RECIPES,createFloorPatch,createWall,prepareNear,dispose,diagnostics:()=>({disposed,recipes:records.size,residentMaps:ownedTextures.size,loading:[...records.values()].filter(r=>r.controller).length,maxResidentMaps})};
}
