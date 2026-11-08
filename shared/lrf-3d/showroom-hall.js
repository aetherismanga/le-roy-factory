import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';
import {createShowroomMaterials,applyShowroomSurfaceUV} from './showroom-materials.js';
import {makeShowroomGreenery} from './showroom-greenery.js';
import {makeShowroomSky} from './showroom-sky.js';

const NO_RAYCAST=()=>{};
const PANEL_PAGE_SIZE=16;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

// Every sign uses ordinary canvas type. Images of the collections are loaded
// separately, so no part of a manufacturer's visual is replaced or invented.
function textMaterial(text,{width=512,height=128,color='#292923',background='#eee9df',size=36}={}){
 const material=new T.MeshBasicMaterial({color:background,toneMapped:false});
 if(typeof document==='undefined')return material;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)return material;
 ctx.fillStyle=background;ctx.fillRect(0,0,width,height);ctx.fillStyle=color;
 ctx.textAlign='center';ctx.textBaseline='middle';
 const line=String(text||'').replace(/\s+/g,' ').trim();let fontSize=size;
 do{ctx.font=`500 ${fontSize}px Arial, sans-serif`;if(ctx.measureText(line).width<width-30)break;fontSize--;}while(fontSize>12);
 ctx.fillText(line,width/2,height/2,width-24);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=T.LinearFilter;
 material.color.set('#ffffff');material.map=map;material.addEventListener('dispose',()=>map.dispose());return material;
}

/**
 * Architectural showroom, independent from commercial/editable project items.
 * Local entry (0,0) faces -Z. Geometry is created only after the sas door opens.
 * Sixteen physical panels per stand can page through the entire real catalogue.
 */
export function makeShowroomHall({manufacturers=[],onReady=()=>{},loadTexture=loadQueuedTexture,maxTextures=20,textureSize=384}={}){
 const root=new T.Group();root.name='Hall_exposition_Le_Roy_Factory';root.visible=false;
 root.userData={visualOnly:true,excludeFromProductBounds:true,showroom:true};
 const colliders=[],panels=[],interactions=[],stands=[];let mergedSequence=0;
 const width=30,height=6,boothDepth=9.2,rowPitch=10.7,rows=Math.max(1,Math.ceil(manufacturers.length/2));
 const depth=Math.max(45,12+rows*rowPitch),half=width/2;
 const navigableBounds={minX:-half+.18,maxX:half-.18,minZ:-depth+.18,maxZ:.02};
 const dimensions={width,height,depth};
 let disposed=false,lastPosition=new T.Vector3(),hasPosition=false;
 const geometries=new Map(),materials=new Set(),textureRecords=new Set();
 const surfaceMaterials=createShowroomMaterials({onReady});
 const photographicSky=makeShowroomSky({onReady});root.add(photographicSky.root);
 let greenery=null;
 const palette={
  wall:new T.MeshStandardMaterial({color:'#ded9cf',roughness:.86,emissive:'#c9c0af',emissiveIntensity:.08}),
  ceiling:new T.MeshStandardMaterial({color:'#e9e7df',roughness:.88,emissive:'#d4cfc3',emissiveIntensity:.12,side:T.DoubleSide}),
  floor:surfaceMaterials.materials.floor,
  grout:new T.MeshStandardMaterial({color:'#a8a59c',roughness:.86}),
  dark:new T.MeshStandardMaterial({color:'#292c2b',roughness:.51,metalness:.12}),
  metal:new T.MeshStandardMaterial({color:'#938779',metalness:.82,roughness:.29}),
  brass:new T.MeshStandardMaterial({color:'#bba27a',metalness:.76,roughness:.31}),
  booth:new T.MeshStandardMaterial({color:'#f1eee7',roughness:.71,emissive:'#d9d3c7',emissiveIntensity:.10}),
  oak:new T.MeshStandardMaterial({color:'#927654',roughness:.6}),
  diffuser:new T.MeshBasicMaterial({color:'#fff1d9',toneMapped:false}),
  sky:new T.MeshBasicMaterial({color:'#d2e1e5',toneMapped:false})
 };
 Object.assign(palette,surfaceMaterials.materials);
 const glass=new T.MeshPhysicalMaterial({color:'#d5e9e8',roughness:.035,metalness:.08,transparent:true,opacity:.19,depthWrite:false,side:T.DoubleSide,clearcoat:1,clearcoatRoughness:.025});materials.add(glass);
 glass.userData.architecturalGlass=true;
 Object.values(palette).forEach(material=>materials.add(material));
 const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 function collectionForRecipe(recipe){
  if(!recipe)return null;
  const manufacturer=manufacturers.find(m=>key(m.name).includes(key(recipe.manufacturer))&&key(recipe.manufacturer));
  const collection=manufacturer?.collections?.find(c=>key(c.name)===key(recipe.collection));
  return collection?{manufacturer,collection}:null;
 }
 const geometry=(w,h,d,bevel=0)=>{
  const key=[w,h,d,bevel].join(',');if(!geometries.has(key))geometries.set(key,bevel?new RoundedBoxGeometry(w,h,d,2,bevel):new T.BoxGeometry(w,h,d));return geometries.get(key);
 };
 function mesh(geom,material,x,y,z,name,parent=root){
  const object=new T.Mesh(geom,material);object.position.set(x,y,z);object.name=name;
  object.castShadow=false;object.receiveShadow=true;object.raycast=NO_RAYCAST;
  object.userData={visualOnly:true,excludeFromProductBounds:true};const entry=collectionForRecipe(material.userData?.showroomRecipe);if(entry)object.userData.showroomCollection=entry;parent.add(object);return object;
 }
 const box=(w,h,d,x,y,z,material,name,parent=root,bevel=0)=>mesh(geometry(w,h,d,bevel),material,x,y,z,name,parent);
 // Architectural pieces share a handful of physical materials. Baking their
 // local transforms into one geometry per material removes hundreds of calls;
 // interactive pictures, signs and page-dependent frames stay independent.
 const staticMaterials=new Set(Object.values(palette));
 function mergeArchitecture(parent){
  const batches=new Map();
  for(const object of [...parent.children])if(object.isMesh&&!object.isInstancedMesh&&staticMaterials.has(object.material)){
   const list=batches.get(object.material)||[];list.push(object);batches.set(object.material,list);
  }
  for(const [material,objects]of batches){
   if(objects.length<2)continue;
   const pieces=objects.map(object=>{object.updateMatrix();const piece=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();piece.applyMatrix4(object.matrix);return piece;});
   const combined=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();
   if(!combined)continue;combined.computeBoundingBox();combined.computeBoundingSphere();
   geometries.set('architecture-'+mergedSequence++,combined);
   const batch=mesh(combined,material,0,0,0,'Architecture_groupee',parent);batch.userData.architecturalParts=objects.map(object=>object.name);
   for(const object of objects)object.removeFromParent();
  }
 }

 function collider(x,z,w,d){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
 function sign(text,w,h,x,y,z,{rotation=0,color,background,size=36,textureWidth=512,textureHeight=128}={},parent=root){
  const material=textMaterial(text,{width:textureWidth,height:textureHeight,color,background,size});materials.add(material);
  const plane=mesh(geometry(w,h,.006),material,x,y,z,'Signaletique_'+text,parent);plane.rotation.y=rotation;return plane;
 }
 // Only the actual entrance is open: the outside hallway cannot be walked
 // through any of the perimeter walls. Parent handles the passage into the sas.
 box(width,.12,depth,0,-.075,-depth/2,palette.grout,'Dalle_hall');
 const tileGeometry=geometry(1.196,.018,1.196),columns=Math.ceil(width/1.2),tileRows=Math.ceil(depth/1.2);
 const tiles=new T.InstancedMesh(tileGeometry,palette.floor,columns*tileRows);tiles.name='Dallage_pierre_120x120';tiles.raycast=NO_RAYCAST;
 tiles.userData={visualOnly:true,excludeFromProductBounds:true,showroomRecipe:surfaceMaterials.recipes.floor};const floorEntry=collectionForRecipe(surfaceMaterials.recipes.floor);if(floorEntry)tiles.userData.showroomCollection=floorEntry;tiles.receiveShadow=true;const matrix=new T.Matrix4();
 for(let r=0,i=0;r<tileRows;r++)for(let c=0;c<columns;c++,i++){matrix.makeTranslation(-width/2+.6+c*1.2,-.006,-.6-r*1.2);tiles.setMatrixAt(i,matrix);}
 tiles.instanceMatrix.needsUpdate=true;root.add(tiles);
 for(const side of [-1,1]){
  // Full-height picture windows: masonry only below the sill and above the glass.
  const sill=box(.18,.60,depth,side*(half+.09),.30,-depth/2,palette.stone,'Soubassement_parement_baie');sill.geometry=sill.geometry.clone();applyShowroomSurfaceUV(sill.geometry,{plane:'wallX',width:1.2,height:1.2});geometries.set('stone-sill-'+side,sill.geometry);
  box(.18,.52,depth,side*(half+.09),height-.26,-depth/2,palette.ivory,'Linteau_baie_vitree');
  const facade=mesh(new T.PlaneGeometry(depth,4.88),glass,side*half,3.04,-depth/2,'Grande_baie_vitree');geometries.set('facade-glass-'+side,facade.geometry);facade.rotation.y=Math.PI/2;facade.castShadow=false;facade.receiveShadow=false;facade.userData.glazing=true;
  for(let z=0;z>=-depth;z-=3.6)box(.09,5.5,.075,side*(half-.015),2.75,z,palette.dark,'Montant_baie_vitree');
  for(const y of [.62,3.25,5.48])box(.08,.055,depth,side*(half-.015),y,-depth/2,palette.dark,'Traverse_baie_vitree');
  collider(side*(half+.09),-depth/2,.18,depth);
  const wing=(width-.98)/2;
  box(wing,height,.18,side*(.49+wing/2),height/2,.09,side<0?palette.sage:palette.petrol,'Mur_entree_hall');collider(side*(.49+wing/2),.09,wing,.18);
  box(.025,.095,depth,side*(half-.012),.0475,-depth/2,palette.brass,'Plinthe_peripherique');
 }
 box(.98,height-2.12,.18,0,(height+2.12)/2,.09,palette.wall,'Linteau_entree_hall');
 box(width,height,.18,0,height/2,-depth-.09,palette.petrol,'Mur_fond_salon');collider(0,-depth-.09,width,.18);
 // The ceiling is genuinely open to a glazed roof and the real photographic sky.
 for(const x of [-half+.22,half-.22])box(.44,.18,depth,x,height,-depth/2,palette.ivory,'Rive_toiture_verriere');
 const roof=mesh(new T.PlaneGeometry(width-.88,depth),glass,0,height,-depth/2,'Plafond_vitre_panoramique');geometries.set('roof-glass',roof.geometry);roof.rotation.x=-Math.PI/2;roof.receiveShadow=false;roof.userData.glazing=true;
 for(let z=0;z>=-depth;z-=3.6)box(width-.8,.075,.06,0,5.98,z,palette.metal,'Profil_verriere_transversale');
 for(const x of [-10,-5,0,5,10])box(.06,.085,depth,x,5.98,-depth/2,palette.metal,'Profil_verriere_longitudinale');
 // Exposed rafters, skylights and suspended tracks give the hall a true scale.
 for(let z=-5;z>-depth;z-=10.7){
  box(width,.15,.15,0,5.74,z,palette.dark,'Poutre_charpente');
  for(const x of [-12,-4,4,12]){
   box(.06,.06,8,x,5.57,z-2.5,palette.dark,'Rail_lumiere');
   box(.026,.018,7.4,x,5.53,z-2.5,palette.diffuser,'Ligne_LED');
  }
  for(const x of [-8,8]){
   for(const dx of [-2.75,2.75])box(.06,.08,4.25,x+dx,5.92,z-2,palette.metal,'Cadre_verriere');
   for(const dz of [-2.1,0,2.1])box(5.55,.08,.06,x,5.92,z-2+dz,palette.metal,'Traverse_verriere');
  }
 }
 for(let z=-6;z>-depth;z-=21.4)for(const x of [-14.6,14.6]){
  box(.23,5.7,.23,x,2.85,z,palette.dark,'Poteau_structure');collider(x,z,.23,.23);
 }
 // Reception stays beside the arrival axis; a four metre central aisle runs
 // uninterrupted between every stand and makes return navigation unambiguous.
 box(4.6,.98,.72,-6.1,.49,-3.25,palette.terracotta,'Comptoir_accueil',root,.035);collider(-6.1,-3.25,4.6,.72);
 box(4.7,.07,.85,-6.1,1.015,-3.25,palette.oak,'Plan_comptoir',root,.012);
 box(4.35,.045,.025,-6.1,.12,-2.875,palette.brass,'Socle_accueil');
 sign('LE ROY FACTORY',3.8,.46,-6.1,.58,-2.878,{background:'#f1eee7',color:'#303630',size:42});
 box(7.1,1.13,.10,0,4.38,-6.40,palette.dark,'Totem_suspendu_accueil');
 for(const x of [-2.9,2.9])box(.025,1.05,.025,x,5.43,-6.40,palette.metal,'Suspente_totem');
 sign('LE ROY FACTORY',6.8,.68,0,4.58,-6.34,{background:'#292c2b',color:'#f1e5cf',size:48,textureWidth:1024,textureHeight:128});
 sign('LE SALON DES MATIÈRES',5.8,.32,0,3.98,-6.34,{background:'#292c2b',color:'#d8c9ad',size:32,textureWidth:1024,textureHeight:96});
 sign('ACCUEIL',1.6,.24,-6.1,1.4,-3.23,{background:'#ded9cf',size:32});
 const stoneWall=geometry(5.1,3.4,.09).clone();geometries.set('reception-stone',stoneWall);applyShowroomSurfaceUV(stoneWall,{plane:'wall',width:1.2,height:1.2});mesh(stoneWall,palette.stone,-6.1,1.7,-.055,'Mur_parement_BioPietra_Borgo_Antico');
 // Vertical oak slats and a bronze skirting ground the tactile reception wall.
 for(let x=-8.9;x<-3.25;x+=.145)if(x<-8.65||x>-3.55)box(.055,3.65,.055,x,1.825,-.14,palette.oak,'Lame_chene_accueil');
 // Exit sign is legible from the salon side and leads back to the user's room.
 sign('RETOUR AU CONFIGURATEUR',3.4,.3,0,2.58,-.014,{background:'#292c2b',color:'#f5e9d4',size:34});
 for(const x of [-2.28,2.28])box(.018,.008,depth-6,x,.009,-(depth+6)/2,palette.brass,'Liseret_allee');
 const daylight=new T.DirectionalLight('#eef5ff',1.65);daylight.position.set(-18,32,-10);daylight.target.position.set(0,0,-18);daylight.castShadow=false;root.add(daylight,daylight.target);
 const entranceLight=new T.PointLight('#fff0d7',22,12,2);entranceLight.position.set(0,4.8,-4.7);entranceLight.castShadow=false;root.add(entranceLight);
 // Four short-range lights, rather than a light per panel, keep the shader and
 // scene costs bounded even when the supplier catalogue contains many pages.
 for(const [i,side]of [-1,1,-1,1].entries()){
  const light=new T.PointLight('#fff3df',35,15,2);light.position.set(side*7.5,4.6,-13-i*(Math.min(depth,70)-13)/3);light.castShadow=false;root.add(light);
 }

 function clearRecord(record){
  record.generation++;record.controller?.abort();record.controller=null;
  if(record.texture){record.texture.dispose();record.texture=null;}
  record.mesh.material.map=null;record.mesh.material.color.set('#d3cec3');record.mesh.material.needsUpdate=true;
  record.state='idle';
 }
 function setLabel(record,text){
  const old=record.label.material;materials.delete(old);old.dispose();
  const material=textMaterial(text,{width:256,height:48,size:22,background:'#f1eee7',color:'#3c3a33'});materials.add(material);record.label.material=material;
 }
 function makePanel(parent,x,z,rotation,manufacturer,index,{floor=false}={}){
  const mount=new T.Group();mount.position.set(x,0,z);mount.rotation.y=rotation;parent.add(mount);
  box(1.38,floor?.12:1.87,floor?1.1:.075,0,floor?.06:1.48,0,palette.dark,floor?'Socle_box_carrelage':'Cadre_panneau_collection',mount);
  if(floor)collider(x,z,1.38,1.1);
  const panelMaterial=new T.MeshStandardMaterial({color:'#d3cec3',roughness:.55,emissive:'#c4bcae',emissiveIntensity:.09});materials.add(panelMaterial);
  const face=mesh(new T.PlaneGeometry(1,1),panelMaterial,0,floor?.125:1.48,floor?0:.042,'Carreau_collection_cliquable',mount);
  if(floor)face.rotation.x=-Math.PI/2;
  face.scale.set(1.22,floor?.94:1.66,1);
  const label=sign('',1.31,.18,0,floor?.25:.42,floor?.5:.045,{textureWidth:384,textureHeight:64},mount);
  const record={mesh:face,label,mount,manufacturer,collection:null,index,floor,localPosition:new T.Vector3(x,0,z),texture:null,controller:null,state:'idle',generation:0};
  face.userData.showroomCollection={manufacturer,collection:null};panels.push(record);textureRecords.add(record);return record;
 }
 function setPage(stand,page){
  const count=stand.manufacturer.collections?.length||0,total=Math.max(1,Math.ceil(count/PANEL_PAGE_SIZE));
  stand.page=(page%total+total)%total;
  for(const record of stand.panels){
   clearRecord(record);const index=stand.page*PANEL_PAGE_SIZE+record.index,collection=stand.manufacturer.collections[index]||null;
   record.collection=collection;record.mesh.userData.showroomCollection={manufacturer:stand.manufacturer,collection};
   record.mount.visible=!!collection||record.floor;record.mesh.visible=!!collection;record.label.visible=!!collection;
   if(collection)setLabel(record,collection.name+(collection.imageKind==='catalogue'?' · Catalogue':''));
  }
  const old=stand.pageSign.material;materials.delete(old);old.dispose();
  stand.pageSign.material=textMaterial(`${stand.page+1} / ${total} · ${count} collections`,{width:512,height:64,size:28,background:'#292c2b',color:'#f2e7d3'});materials.add(stand.pageSign.material);
  if(hasPosition)prepareNear(lastPosition);onReady();return true;
 }
 for(const [index,manufacturer]of manufacturers.entries()){
  const side=index%2===0?-1:1,row=Math.floor(index/2),front=-8-row*rowPitch,back=front-boothDepth;
  const minX=side<0?-13.7:3.05,maxX=side<0?-3.05:13.7,centerX=(minX+maxX)/2,boothWidth=maxX-minX;
  const group=new T.Group();group.name='Stand_'+manufacturer.id;group.userData={visualOnly:true,excludeFromProductBounds:true,showroomManufacturer:manufacturer.id};root.add(group);
  const standFloor=surfaceMaterials.materialForStand(manufacturer,index),recipe=standFloor.userData.showroomRecipe;
  const floorGeometry=geometry(boothWidth,.024,boothDepth).clone();geometries.set('stand-floor-'+index,floorGeometry);applyShowroomSurfaceUV(floorGeometry,{width:recipe.width,height:recipe.height,offsetX:centerX,offsetY:-(front+back)/2});
  mesh(floorGeometry,standFloor,centerX,.018,(front+back)/2,'Sol_box_'+recipe.collection+'_'+recipe.format,group).userData.showroomRecipe=recipe;
  // Thin physical grout lines retain the actual60/120cm format at human scale.
  for(let x=minX+recipe.width;x<maxX;x+=recipe.width)box(.0025,.001,boothDepth,x,.031,(front+back)/2,palette.grout,'Joint_sol_box',group);
  for(let z=front-recipe.height;z>back;z-=recipe.height)box(boothWidth,.001,.0025,centerX,.031,z,palette.grout,'Joint_sol_box',group);
  const standPaint=[palette.sage,palette.terracotta,palette.petrol,palette.ivory][index%4];
  box(boothWidth,3.12,.10,centerX,1.56,back,standPaint,'Mur_collections_fond',group);collider(centerX,back,boothWidth,.10);
  // Side partitions stop short of the main aisle and allow an open, legible
  // entrance to every booth. Panels face inward on each side.
  for(const x of [minX,maxX]){
   box(.10,3.12,boothDepth,x,1.56,(front+back)/2,standPaint,'Cloison_stand',group);collider(x,(front+back)/2,.10,boothDepth);
  }
  box(boothWidth,.36,.12,centerX,3.33,front,palette.dark,'Enseigne_stand',group);
  sign(manufacturer.name.toUpperCase(),boothWidth-.35,.29,centerX,3.33,front+.068,{background:'#292c2b',color:'#f1e5ce',size:48,textureWidth:1024,textureHeight:96},group);
  sign(manufacturer.category||'Collections & matières',boothWidth-.5,.21,centerX,2.85,back+.062,{background:'#f1eee7',color:'#6e6658',size:28,textureWidth:768,textureHeight:64},group);
  for(const x of [minX+.12,maxX-.12])box(.028,.025,boothDepth-.3,x,3.09,(front+back)/2,palette.diffuser,'Eclairage_rasant_stand',group);
  const stand={manufacturer,group,page:0,panels:[],pageSign:null,bounds:{minX,maxX,minZ:back-.1,maxZ:front+.1}};stands.push(stand);
  for(let i=0;i<6;i++)stand.panels.push(makePanel(group,minX+1.16+i*1.66,back+.09,0,manufacturer,i));
  for(let i=0;i<5;i++){
   const z=front-1-i*1.67;
   stand.panels.push(makePanel(group,minX+.09,z,Math.PI/2,manufacturer,6+i));
   stand.panels.push(makePanel(group,maxX-.09,z,-Math.PI/2,manufacturer,11+i));
  }
  // Three real collection samples are also presented on low exhibition boxes.
  // They use the same catalogue records and change with the wall-panel page.
  for(let i=0;i<3;i++)stand.panels.push(makePanel(group,minX+1.42+i*2.65,front-2.1,0,manufacturer,i,{floor:true}));
  box(3.7,.30,.08,centerX,3.71,front,palette.dark,'Support_compteur_collections',group);
  for(const dx of [-1.65,1.65])box(.02,.25,.02,centerX+dx,3.57,front,palette.metal,'Fixation_compteur',group);
  stand.pageSign=sign('',3.5,.23,centerX,3.71,front+.048,{background:'#292c2b',color:'#f1e5ce',textureHeight:64},group);
  box(3.15,1.55,.12,centerX,.775,front-.09,palette.dark,'Borne_catalogue_stand',group);
  for(const dx of [-1.2,1.2])box(.10,.04,.48,centerX+dx,.02,front-.09,palette.metal,'Pied_borne_stand',group);
  collider(centerX,front-.09,3.15,.48);
  for(const [direction,x]of [[-1,centerX-1.35],[1,centerX+1.35]]){
   const button=sign(direction<0?'PRÉCÉDENT':'SUIVANT',1.18,.25,x,1.08,front+.05,{background:'#ded3bb',color:'#30342f',size:27,textureWidth:256,textureHeight:64},group);
   button.userData.showroomAction={kind:'page',manufacturerId:manufacturer.id,direction};interactions.push(button);
  }
  const catalogue=sign('TOUTES LES COLLECTIONS',2.85,.24,centerX,1.46,front+.05,{background:'#292c2b',color:'#f1e5ce',size:28,textureWidth:512,textureHeight:64},group);
  catalogue.userData.showroomAction={kind:'catalogue',manufacturerId:manufacturer.id};interactions.push(catalogue);
  setPage(stand,0);mergeArchitecture(group);
 }
 greenery=makeShowroomGreenery({width,depth,stands});root.add(greenery.root);colliders.push(...greenery.colliders);
 mergeArchitecture(root);
 function textureURL(collection){const image=String(collection?.image||collection?.preview||'');return image?surfaceAssetURL(image):'';}
 async function loadRecord(record){
  if(disposed||record.state!=='idle'||!record.collection||!textureURL(record.collection))return false;
  if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return false;
  const generation=record.generation,controller=new AbortController();record.controller=controller;record.state='loading';
  try{
   const texture=await loadTexture(textureURL(record.collection),{signal:controller.signal,maxDimension:textureSize});
   if(disposed||generation!==record.generation||controller.signal.aborted){texture.dispose();return false;}
   texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.anisotropy=4;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
   const image=texture.image,w=image?.naturalWidth||image?.width||1,h=image?.naturalHeight||image?.height||1;
   const maxWidth=1.22,maxHeight=record.floor?.94:1.66,ratio=w/h;
   const fittedWidth=Math.min(maxWidth,maxHeight*ratio),fittedHeight=fittedWidth/ratio;
   record.mesh.scale.set(fittedWidth,fittedHeight,1);record.texture=texture;record.mesh.material.map=texture;record.mesh.material.color.set('#ffffff');record.mesh.material.needsUpdate=true;record.state='ready';onReady();return true;
  }catch(error){if(generation===record.generation){record.state=controller.signal.aborted?'idle':'error';record.error=String(error?.message||error);}return false;}
  finally{if(record.controller===controller)record.controller=null;}
 }
 function cullDetails(position){
  for(const stand of stands){
   const b=stand.bounds,dx=Math.max(b.minX-position.x,0,position.x-b.maxX),dz=Math.max(b.minZ-position.z,0,position.z-b.maxZ);
   stand.group.visible=Math.hypot(dx,dz)<=30;
  }
  for(const record of textureRecords){
   record.distance=Math.hypot(record.localPosition.x-position.x,record.localPosition.z-position.z);
   // Collection availability is independent from distance: walking back must
   // restore panels that were hidden on the previous frame or catalogue page.
   record.mount.visible=(!!record.collection||record.floor)&&record.distance<=20;
  }
 }
 cullDetails(new T.Vector3());
 function prepareNear(position){
  if(disposed||!position)return Promise.resolve([]);lastPosition.copy(position);hasPosition=true;cullDetails(position);
  surfaceMaterials.prepareNear(position);photographicSky.prepareNear(position);greenery?.prepareNear(position);daylight.visible=position.z<-.1;
  const candidates=[];
  for(const record of textureRecords){
   if(!record.collection)continue;
   const distance=record.distance;
   if(distance<18)candidates.push({record,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const selected=candidates.slice(0,Math.max(1,maxTextures)).map(({record})=>record),keep=new Set(selected);
  for(const record of textureRecords)if(!keep.has(record)&&(record.texture||record.controller))clearRecord(record);
  return Promise.all(selected.map(record=>loadRecord(record)));
 }
 function activateAction(action){
  if(action?.kind!=='page')return false;const stand=stands.find(value=>value.manufacturer.id===action.manufacturerId);
  return stand?setPage(stand,stand.page+(action.direction<0?-1:1)):false;
 }
 function dispose(){
  if(disposed)return;disposed=true;for(const record of textureRecords)clearRecord(record);surfaceMaterials.dispose();photographicSky.dispose();greenery?.dispose();
  for(const material of materials)material.dispose();for(const geom of geometries.values())geom.dispose();
  for(const record of panels)record.mesh.geometry.dispose();root.removeFromParent();
 }
 // Removing a door through the editor's normal disposal also aborts the hall's
 // pending transfers, even when the caller does not invoke dispose explicitly.
 palette.wall.addEventListener('dispose',()=>{if(!disposed){disposed=true;for(const record of textureRecords)clearRecord(record);}});
 return {root,dimensions,navigableBounds,get skyTexture(){return photographicSky.texture},surfaceRecipes:surfaceMaterials.recipes,greenery,sky:photographicSky,colliders,panels,interactions,stands,prepareNear,activateAction,dispose,
  diagnostics:()=>({manufacturers:stands.length,collections:manufacturers.reduce((n,m)=>n+(m.collections?.length||0),0),panels:panels.filter(p=>p.collection).length,loaded:[...textureRecords].filter(p=>p.texture).length,loading:[...textureRecords].filter(p=>p.controller).length,maxTextures,textureSize,visibleStands:stands.filter(s=>s.group.visible).length,visiblePanels:panels.filter(p=>p.collection&&p.mount.visible&&p.mount.parent.visible).length,architectureBatches:mergedSequence})};
}
