import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';
import {makeShowroomSurfaces} from './showroom-surfaces.js';
import {makeShowroomFixtures} from './showroom-fixtures.js';
import {makeShowroomGreenery} from './showroom-greenery.js';
import {makeShowroomSky} from './showroom-sky.js';

const NO_RAYCAST=()=>{},PAGE_SIZE=4;
const WALL_HEIGHT=2.3,ROW_PITCH=5.3,BOOTH_DEPTH=4.6;
const WALL_SCHEMES=[['creta-ginepro','creta-biscotto','slate-dark'],['creta-pepe','roma-palatino','yosemite-natural'],['creta-caramello','shell-grey','creta-pepe'],['biopietra-borgo','creta-malto','slate-river'],['creta-biscotto','slate-dark','creta-ginepro'],['slate-river','creta-caramello','creta-pepe']];
const FLOOR_SCHEMES=['creta-malto','creta-pepe','creta-caramello','creta-ginepro','creta-biscotto','yosemite-natural'];

function textMaterial(text,{width=512,height=96,color='#eee7d9',background='#272e2b',size=34}={}){
 const material=new T.MeshBasicMaterial({color:background,toneMapped:false});
 if(typeof document==='undefined')return material;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)return material;
 ctx.fillStyle=background;ctx.fillRect(0,0,width,height);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
 let font=size;const line=String(text||'').replace(/\s+/g,' ').trim();do{ctx.font=`500 ${font}px Arial, sans-serif`;if(ctx.measureText(line).width<width-24)break;font--;}while(font>12);
 ctx.fillText(line,width/2,height/2,width-18);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=T.LinearFilter;material.map=map;material.color.set('#ffffff');material.addEventListener('dispose',()=>map.dispose());return material;
}

/** A room-scale materials salon: low full-collection walls, furnished bathroom
 * scenes and native floor patterns. It remains independent of saved projects. */
export function makeShowroomHall({manufacturers=[],onReady=()=>{},loadTexture=loadQueuedTexture,maxTextures=16,textureSize=512}={}){
 const root=new T.Group();root.name='Hall_exposition_Le_Roy_Factory';root.visible=false;root.userData={visualOnly:true,excludeFromProductBounds:true,showroom:true};
 const width=22,height=3.8,rows=Math.max(1,Math.ceil(manufacturers.length/2)),depth=Math.max(20,7.2+rows*ROW_PITCH),half=width/2;
 const dimensions={width,height,depth,wallHeight:WALL_HEIGHT,rowPitch:ROW_PITCH,boothDepth:BOOTH_DEPTH};
 const navigableBounds={minX:-half+.12,maxX:half-.12,minZ:-depth+.14,maxZ:.02};
 const colliders=[],panels=[],interactions=[],stands=[],walls=[],floorPatches=[];
 const geometries=new Set(),materials=new Set(),textureRecords=new Set();let disposed=false,mergedSequence=0,lastPosition=new T.Vector3(),hasPosition=false,shadowRow=null;
 const surfaces=makeShowroomSurfaces({manufacturers,onReady}),sky=makeShowroomSky({onReady});root.add(sky.root);
 const palette={charcoal:new T.MeshStandardMaterial({color:'#292f2b',roughness:.54,metalness:.12}),bronze:new T.MeshStandardMaterial({color:'#998460',roughness:.35,metalness:.75}),oak:new T.MeshStandardMaterial({color:'#765a3b',roughness:.62}),edge:new T.MeshStandardMaterial({color:'#d0c4b1',roughness:.82}),diffuser:new T.MeshBasicMaterial({color:'#ffe8be',toneMapped:false})};
 for(const mat of Object.values(palette))materials.add(mat);const staticMaterials=new Set(Object.values(palette));
 const glass=new T.MeshPhysicalMaterial({color:'#d8e8e6',transparent:true,opacity:.11,roughness:.04,metalness:.04,clearcoat:.75,depthWrite:false,side:T.DoubleSide});glass.userData.architecturalGlass=true;materials.add(glass);
 const mesh=(geometry,material,x,y,z,name,parent=root)=>{geometries.add(geometry);const object=new T.Mesh(geometry,material);object.position.set(x,y,z);object.name=name;object.castShadow=false;object.receiveShadow=true;object.raycast=NO_RAYCAST;object.userData={visualOnly:true,excludeFromProductBounds:true};parent.add(object);return object;};
 const box=(w,h,d,x,y,z,material,name,parent=root,bevel=0)=>mesh(bevel?new RoundedBoxGeometry(w,h,d,2,Math.min(bevel,w/4,h/4,d/4)):new T.BoxGeometry(w,h,d),material,x,y,z,name,parent);
 const collider=(x,z,w,d)=>colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
 function sign(text,w,h,x,y,z,{rotation=0,...options}={},parent=root){const mat=textMaterial(text,options);materials.add(mat);const object=mesh(new T.BoxGeometry(w,h,.006),mat,x,y,z,'Signaletique_'+text,parent);object.rotation.y=rotation;object.castShadow=false;return object;}
 function mergeArchitecture(parent){
  const batches=new Map();for(const object of [...parent.children])if(object.isMesh&&!object.isInstancedMesh&&staticMaterials.has(object.material)&&!object.userData.showroomAction){const parts=batches.get(object.material)||[];parts.push(object);batches.set(object.material,parts);}
  for(const [material,objects]of batches){if(objects.length<2)continue;const pieces=objects.map(object=>{object.updateMatrix();const piece=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();piece.applyMatrix4(object.matrix);return piece;});const combined=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();if(!combined)continue;combined.computeBoundingSphere();combined.computeBoundingBox();const batch=mesh(combined,material,0,0,0,'Architecture_groupee',parent);batch.userData.architecturalParts=objects.map(o=>o.name);for(const object of objects)object.removeFromParent();mergedSequence++;}
 }
 function floor(bounds,recipeId,y=.002,parent=root){const patch=surfaces.createFloorPatch({bounds,recipeId,y,direction:recipeId.startsWith('yosemite')?'vertical':undefined});floorPatches.push(patch);parent.add(patch);return patch;}
 function wall(w,h,recipeId,x,z,rotation=0,parent=root,{boundary=false}={}){
  const group=surfaces.createWall({width:w,height:h,recipeId,position:[x,0,z],rotation});group.name='Mur_collection_'+recipeId;group.userData.wallHeight=h;group.userData.exhibitionWall=true;group.traverse(o=>{if(o.isMesh)o.castShadow=true;});parent.add(group);walls.push(group);
  if(Math.abs(Math.sin(rotation))>.5)collider(x,z,.09,w);else collider(x,z,w,.09);
  if(!boundary){const recipe=surfaces.recipes[recipeId];const label=sign(recipe.manufacturer+' · '+recipe.collection+' · '+recipe.color,Math.min(w-.16,3),.13,x,2.14,z+.015,{rotation,size:28,width:768,height:64},parent);if(rotation!==0){label.position.set(x+Math.sin(rotation)*.015,2.14,z);}}
  return group;
 }
 // The central route is actual native Honey planks in one-third bond, not a
 // stretched wood photograph or the former pale procedural floor.
 // Exclude the seventeen room floors rather than drawing hidden parquet
 // underneath them. Native cells keep the same global grid across every cut;
 // merging by the four face materials leaves just five floor submissions.
 const roomBounds=manufacturers.map((_,index)=>{const side=index%2===0?-1:1,front=-6-Math.floor(index/2)*ROW_PITCH;return {minX:side<0?-9.4:1.9,maxX:side<0?-1.9:9.4,minZ:front-BOOTH_DEPTH,maxZ:front};});
 const marks=[...new Set([0,-depth,...roomBounds.flatMap(b=>[b.minZ,b.maxZ])])].sort((a,b)=>b-a),walkPatches=[];
 for(let i=1;i<marks.length;i++){const minZ=marks[i],maxZ=marks[i-1],mid=(minZ+maxZ)/2,occupied=roomBounds.filter(b=>mid>b.minZ&&mid<b.maxZ).sort((a,b)=>a.minX-b.minX);let x=-half;
  for(const b of [...occupied,{minX:half,maxX:half}]){if(b.minX>x+.001)walkPatches.push(surfaces.createFloorPatch({bounds:{minX:x,maxX:b.minX,minZ,maxZ},recipeId:'yosemite-honey',direction:'vertical',y:.002}));x=Math.max(x,b.maxX);}
 }
 const mainFloor=new T.Group();mainFloor.name='Dallage_Yosemite_Honey_tiers';mainFloor.userData={...walkPatches[0].userData,cells:walkPatches.flatMap(p=>p.userData.cells),tileCount:walkPatches.reduce((n,p)=>n+p.userData.tileCount,0)};root.add(mainFloor);floorPatches.push(mainFloor);
 const floorBatches=new Map();for(const patch of walkPatches){patch.updateMatrixWorld(true);for(const object of patch.children){const parts=floorBatches.get(object.material)||[];const piece=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();piece.applyMatrix4(object.matrixWorld);parts.push(piece);floorBatches.set(object.material,parts);}}
 for(const [material,pieces]of floorBatches){const geometry=mergeGeometries(pieces,false);pieces.forEach(p=>p.dispose());const object=mesh(geometry,material,0,0,0,'Surface_Yosemite_tiers_groupee',mainFloor);object.userData={...mainFloor.userData};delete object.userData.cells;}

 // Front faces are set12cm in front of the vestibule rear wall. This removes
 // the duplicated coplanar entrance skins visible as stripes in the old view.
 const portalHalf=.49,wing=half-portalHalf;
 for(const side of [-1,1])wall(wing,WALL_HEIGHT,side<0?'creta-caramello':'creta-ginepro',side*(portalHalf+wing/2),-.12,Math.PI,root,{boundary:true});
 box(.98,.22,.10,0,2.19,-.12,palette.oak,'Linteau_portail');
 sign('RETOUR AU CONFIGURATEUR',2.10,.16,0,2.48,-.18,{size:28,width:768});
 wall(width,WALL_HEIGHT,'creta-pepe',0,-depth,0,root,{boundary:true});
 for(const side of [-1,1]){
  wall(depth,.54,'slate-river',side*half,-depth/2,-side*Math.PI/2,root,{boundary:true});
  const facade=mesh(new T.PlaneGeometry(depth,height-.62),glass,side*half,2.15,-depth/2,'Grande_baie_vitree');facade.rotation.y=Math.PI/2;facade.receiveShadow=false;facade.userData.glazing=true;
  for(let z=0;z>=-depth;z-=ROW_PITCH)box(.075,height,.075,side*(half-.015),height/2,z,palette.charcoal,'Montant_baie_vitree');
  for(const y of [.56,height-.04])box(.075,.055,depth,side*(half-.015),y,-depth/2,palette.charcoal,'Traverse_baie_vitree');
 }
 const roof=mesh(new T.PlaneGeometry(width,depth),glass,0,height,-depth/2,'Plafond_vitre_panoramique');roof.rotation.x=-Math.PI/2;roof.userData.glazing=true;roof.receiveShadow=false;
 for(let z=-.1;z>=-depth;z-=ROW_PITCH){box(width,.14,.12,0,height-.10,z,palette.charcoal,'Poutre_basse_salon');for(const x of [-7,-2.4,2.4,7]){box(.045,.045,4.5,x,height-.25,z-2.2,palette.charcoal,'Rail_spots');box(.018,.015,3.7,x,height-.28,z-2.2,palette.diffuser,'Lumiere_lineaire');}}
 for(const x of [-half,-5,0,5,half])box(.055,.075,depth,x,height-.02,-depth/2,palette.bronze,'Profil_verriere');
 // A compact material-clad welcome desk leaves useful room for the first scenes.
 box(2.85,.85,.65,-5.7,.425,-2.1,palette.oak,'Comptoir_accueil',root,.025);collider(-5.7,-2.1,2.85,.65);
 const counterFace=surfaces.createWall({width:2.80,height:.78,recipeId:'creta-pepe',position:[-5.7,.025,-1.765]});counterFace.name='Comptoir_revetu_Creta_Pepe';root.add(counterFace);walls.push(counterFace);
 const counterRear=surfaces.createWall({width:2.80,height:.78,recipeId:'creta-ginepro',position:[-5.7,.025,-2.435],rotation:Math.PI});root.add(counterRear);walls.push(counterRear);
 box(2.95,.06,.75,-5.7,.88,-2.1,palette.oak,'Plan_accueil',root,.008);sign('LE ROY FACTORY',2.25,.19,-5.7,.49,-1.717,{background:'#303d34',size:30});
 sign('LE SALON DES MATIÈRES',3.8,.21,0,3.08,-4.55,{size:34,width:1024});
 const receptionStone=wall(3.1,2.3,'biopietra-borgo',-5.7,-.19,Math.PI,root,{boundary:true});receptionStone.name='Mur_parement_BioPietra_Borgo_Antico';
 for(const x of [-7.32,-4.08])box(.07,2.4,.065,x,1.2,-.23,palette.oak,'Cadre_parement_accueil');
 // Four native catalogue samples on a small leaf rack supplement (rather than
 // replace) full-size tile walls and the furnished room scenes.
 function clearRecord(record){record.generation++;record.controller?.abort();record.controller=null;if(record.texture){record.texture.dispose();record.texture=null;}record.mesh.material.map=null;record.mesh.material.color.set('#8b8271');record.mesh.material.needsUpdate=true;record.state='idle';}
 function setLabel(record,text){const old=record.label.material;materials.delete(old);old.dispose();record.label.material=textMaterial(text,{width:384,height:64,size:24,background:'#333c35'});materials.add(record.label.material);}
 function setPage(stand,page){const count=stand.manufacturer.collections?.length||0,total=Math.max(1,Math.ceil(count/PAGE_SIZE));stand.page=(page%total+total)%total;for(const record of stand.panels){clearRecord(record);record.collection=stand.manufacturer.collections[stand.page*PAGE_SIZE+record.index]||null;record.mesh.userData.showroomCollection={manufacturer:stand.manufacturer,collection:record.collection};record.mount.visible=!!record.collection;if(record.collection)setLabel(record,record.collection.name);}
  const old=stand.pageSign.material;materials.delete(old);old.dispose();stand.pageSign.material=textMaterial(`${stand.page+1} / ${total} · ${count} collections`,{width:512,height:64,size:27});materials.add(stand.pageSign.material);if(hasPosition)prepareNear(lastPosition);onReady();return true;}
 for(const [index,manufacturer]of manufacturers.entries()){
  const side=index%2===0?-1:1,row=Math.floor(index/2),front=-6-row*ROW_PITCH,back=front-BOOTH_DEPTH,minX=side<0?-9.4:1.9,maxX=side<0?-1.9:9.4,centerX=(minX+maxX)/2;
  const group=new T.Group();group.name='Stand_'+manufacturer.id;group.userData={visualOnly:true,excludeFromProductBounds:true,showroomManufacturer:manufacturer.id};root.add(group);
  const ownWalls={
   'view-ceramica':['view-corso-beige','view-golden-carbon','view-corso-beige'],
   'la-fenice':['fenice-travertino-almond','fenice-xmetal-bronzo','fenice-travertino-almond'],
   'biopietra':['biopietra-borgo','biopietra-borgo','biopietra-borgo'],
   'bulbo':['bulbo-chevron','creta-pepe','creta-biscotto'],
   'pecchioli-firenze':['pecchioli-specchi-oro','creta-pepe','creta-biscotto']
  };
  const scheme=ownWalls[manufacturer.id]||WALL_SCHEMES[index%WALL_SCHEMES.length],standWalls=[];
  floor({minX,maxX,minZ:back,maxZ:front},FLOOR_SCHEMES[index%FLOOR_SCHEMES.length],.012,group);
  standWalls.push(wall(maxX-minX,WALL_HEIGHT,scheme[0],centerX,back,0,group));
  standWalls.push(wall(BOOTH_DEPTH,WALL_HEIGHT,scheme[1],minX,(front+back)/2,Math.PI/2,group));
  standWalls.push(wall(BOOTH_DEPTH,WALL_HEIGHT,scheme[2],maxX,(front+back)/2,-Math.PI/2,group));
  box(maxX-minX,.18,.06,centerX,2.45,back,palette.charcoal,'Enseigne_stand',group);
  sign(manufacturer.name.toUpperCase(),maxX-minX-.18,.14,centerX,2.45,back+.037,{width:1024,height:64,size:38},group);
  const stand={manufacturer,index,group,front,back,minX,maxX,page:0,panels:[],walls:standWalls,pageSize:PAGE_SIZE,bounds:{minX,maxX,minZ:back-.05,maxZ:front+.05}};stands.push(stand);
  const rackX=side*(9.4-1.0),rackZ=front-.70;
  box(1.46,.72,.48,rackX,.36,rackZ,palette.oak,'Bibliotheque_echantillons',group,.008);collider(rackX,rackZ,1.46,.54);
  box(1.52,.025,.56,rackX,.73,rackZ,palette.bronze,'Plan_bibliotheque',group);
  for(let i=0;i<PAGE_SIZE;i++){
   const mount=new T.Group();mount.position.set(rackX+(i-1.5)*.34,0,rackZ-.05);mount.rotation.y=(i-1.5)*-.055;group.add(mount);
   box(.315,.79,.024,0,1.20,0,palette.charcoal,'Cadre_echantillon',mount);
   const material=new T.MeshStandardMaterial({color:'#8b8271',roughness:.65});materials.add(material);const face=mesh(new T.PlaneGeometry(1,1),material,0,1.20,.016,'Collection_cliquable',mount);face.scale.set(.292,.752,1);
   const label=sign('',.315,.085,0,.775,.018,{width:384,height:64,size:22},mount);
   const record={mesh:face,label,mount,manufacturer,collection:null,index:i,texture:null,controller:null,state:'idle',generation:0,localPosition:new T.Vector3(mount.position.x,0,mount.position.z)};stand.panels.push(record);panels.push(record);textureRecords.add(record);
  }
  stand.pageSign=sign('',1.15,.10,rackX,.56,rackZ+.247,{width:512,height:64,size:27},group);
  for(const direction of [-1,1]){const button=sign(direction<0?'‹':'›',.15,.16,rackX+direction*.63,.55,rackZ+.252,{width:64,height:64,size:48,color:'#272e2b',background:'#d2c6ac'},group);button.userData.showroomAction={kind:'page',manufacturerId:manufacturer.id,direction};interactions.push(button);}
  const catalogue=sign('TOUTES LES COLLECTIONS · HD',1.35,.11,rackX,.37,rackZ+.251,{width:768,height:64,size:28},group);catalogue.userData.showroomAction={kind:'catalogue',manufacturerId:manufacturer.id};interactions.push(catalogue);
  setPage(stand,0);mergeArchitecture(group);
 }
 const fixtures=makeShowroomFixtures({stands,onReady});root.add(fixtures.root);colliders.push(...fixtures.colliders);
 const greenery=makeShowroomGreenery({width,depth,stands,onReady});root.add(greenery.root);colliders.push(...greenery.colliders);mergeArchitecture(root);
 // A bounded nearby light rig keeps highlights and contact shadows coherent.
 const sun=new T.DirectionalLight('#fff3df',.85);sun.position.set(-12,18,-5);sun.target.position.set(0,0,-12);sun.castShadow=false;root.add(sun,sun.target);
 const spots=[];for(let i=0;i<3;i++){const light=new T.SpotLight(i===2?'#e6eef5':'#ffe3be',i===2?28:65,12,.92,.70,2);light.name='Eclairage_local_exposition_'+i;light.castShadow=i<2;light.shadow.mapSize.set(512,512);light.shadow.bias=-.00015;light.shadow.normalBias=.008;light.shadow.radius=3;root.add(light,light.target);spots.push(light);}
 function updateLighting(position,renderer){
  const row=Math.max(0,Math.min(rows-1,Math.floor((-position.z-3)/ROW_PITCH)));const changed=shadowRow!==row;shadowRow=row;
  for(const [i,light]of spots.entries()){const side=i===0?-1:i===1?1:0,z=-6-row*ROW_PITCH-1.4;light.position.set(side*5.4,3.35,z+1.2);light.target.position.set(side*5.4,.75,z-2.2);light.visible=true;}
  if(renderer?.shadowMap){renderer.shadowMap.enabled=true;if(changed)renderer.shadowMap.needsUpdate=true;}
  return changed;
 }
 function textureURL(record){return surfaceAssetURL(record.collection?.preview||record.collection?.image||'');}
 async function loadRecord(record){if(disposed||record.state!=='idle'||!record.collection||!textureURL(record))return false;if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return false;const generation=record.generation,controller=new AbortController();record.controller=controller;record.state='loading';
  try{const texture=await loadTexture(textureURL(record),{signal:controller.signal,maxDimension:textureSize});if(disposed||generation!==record.generation||controller.signal.aborted){texture.dispose();return false;}texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;const image=texture.image,w=image?.naturalWidth||image?.width||1,h=image?.naturalHeight||image?.height||1,ratio=w/h;const fittedWidth=Math.min(.292,.752*ratio);record.mesh.scale.set(fittedWidth,fittedWidth/ratio,1);record.mesh.material.map=texture;record.mesh.material.color.set('#ffffff');record.mesh.material.needsUpdate=true;record.texture=texture;record.state='ready';onReady();return true;}catch{if(generation===record.generation)record.state=controller.signal.aborted?'idle':'error';return false;}finally{if(record.controller===controller)record.controller=null;}}
 function cullDetails(position){for(const stand of stands){const b=stand.bounds,dx=Math.max(b.minX-position.x,0,position.x-b.maxX),dz=Math.max(b.minZ-position.z,0,position.z-b.maxZ);stand.group.visible=Math.hypot(dx,dz)<21;}for(const record of textureRecords){record.distance=Math.hypot(record.localPosition.x-position.x,record.localPosition.z-position.z);record.mount.visible=!!record.collection&&record.distance<14;}}
 cullDetails(new T.Vector3());
 function prepareNear(position){if(disposed||!position)return Promise.resolve([]);lastPosition.copy(position);hasPosition=true;cullDetails(position);surfaces.prepareNear(position);sky.prepareNear(position);fixtures.prepareNear(position);greenery.prepareNear(position);
  const selected=[...textureRecords].filter(p=>p.collection&&p.distance<14).sort((a,b)=>a.distance-b.distance).slice(0,maxTextures),keep=new Set(selected);for(const record of textureRecords)if(!keep.has(record)&&(record.texture||record.controller))clearRecord(record);return Promise.all(selected.map(loadRecord));}
 function activateAction(action){if(action?.kind!=='page')return false;const stand=stands.find(s=>s.manufacturer.id===action.manufacturerId);return stand?setPage(stand,stand.page+(action.direction<0?-1:1)):false;}
 function dispose(){if(disposed)return;disposed=true;for(const record of textureRecords)clearRecord(record);fixtures.dispose();greenery.dispose();surfaces.dispose();sky.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();for(const light of spots)light.dispose();root.removeFromParent();}
 palette.charcoal.addEventListener('dispose',()=>{if(!disposed)dispose();});
 return {root,dimensions,navigableBounds,colliders,panels,interactions,stands,walls,floorPatches,prepareNear,activateAction,dispose,greenery,fixtures,sky,surfaces,updateLighting,get skyTexture(){return sky.texture},surfaceRecipes:surfaces.recipes,appearance:{environmentIntensity:.58,exposure:.90,toneMapping:T.ACESFilmicToneMapping,fogNear:depth*.94,fogFar:depth*2.8,fogColor:'#6b736e'},diagnostics:()=>({manufacturers:stands.length,collections:manufacturers.reduce((n,m)=>n+(m.collections?.length||0),0),panels:panels.filter(p=>p.collection).length,pageSize:PAGE_SIZE,loaded:[...textureRecords].filter(p=>p.texture).length,loading:[...textureRecords].filter(p=>p.controller).length,maxTextures,textureSize,visibleStands:stands.filter(s=>s.group.visible).length,visiblePanels:panels.filter(p=>p.collection&&p.mount.visible&&p.mount.parent.visible).length,architectureBatches:mergedSequence,wallHeight:WALL_HEIGHT,fixtures:fixtures.diagnostics(),surfaces:surfaces.diagnostics()})};
}
