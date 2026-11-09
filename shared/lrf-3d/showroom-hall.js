import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';
import {makeShowroomSurfaces} from './showroom-surfaces.js';
import {makeShowroomFixtures} from './showroom-fixtures.js';
import {makeShowroomGreenery} from './showroom-greenery.js';
import {makeShowroomSky} from './showroom-sky.js';
import {makeShowroomLayout,showroomPoint} from './showroom-layout.js';

const NO_RAYCAST=()=>{},PAGE_SIZE=4;
const WALL_SCHEMES=[['creta-ginepro','creta-biscotto'],['creta-pepe','roma-palatino'],['creta-caramello','shell-grey'],['biopietra-borgo','creta-malto'],['slate-dark','creta-ginepro'],['slate-river','creta-caramello']];
function textMaterial(text,{width=512,height=96,color='#eee7d9',background='#272e2b',size=34}={}){
 const material=new T.MeshBasicMaterial({color:background,toneMapped:false});
 if(typeof document==='undefined')return material;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)return material;
 ctx.fillStyle=background;ctx.fillRect(0,0,width,height);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
 let font=size;const line=String(text||'').replace(/\s+/g,' ').trim();do{ctx.font=`500 ${font}px Arial, sans-serif`;if(ctx.measureText(line).width<width-24)break;font--;}while(font>12);
 ctx.fillText(line,width/2,height/2,width-18);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=T.LinearFilter;material.map=map;material.color.set('#ffffff');material.addEventListener('dispose',()=>map.dispose());return material;
}


/** Open material atrium. Permanent architecture and a continuous mineral floor
 * remain visible; only sample textures and product detail change with proximity. */
export function makeShowroomHall({manufacturers=[],onReady=()=>{},loadTexture=loadQueuedTexture,maxTextures=16,textureSize=768}={}){
 const root=new T.Group();root.name='Hall_exposition_Le_Roy_Factory';root.visible=false;root.userData={visualOnly:true,excludeFromProductBounds:true,showroom:true};
 const layout=makeShowroomLayout(manufacturers),{width,height,depth}=layout,half=width/2;
 const dimensions={width,height,depth,wallHeight:layout.wallHeight,layout:'open-atrium'};
 const navigableBounds={minX:-half+.12,maxX:half-.12,minZ:-depth+.14,maxZ:.02};
 const colliders=[],panels=[],interactions=[],stands=[],walls=[],floorPatches=[];
 const geometries=new Set(),materials=new Set(),textureRecords=new Set();let disposed=false,mergedSequence=0,lastPosition=new T.Vector3(),hasPosition=false,shadowDirty=true,lightFocus=null;
 const invalidate=()=>{shadowDirty=true;onReady();};
 const surfaces=makeShowroomSurfaces({manufacturers,onReady:invalidate,coordinateRoot:root}),sky=makeShowroomSky({onReady:invalidate});root.add(sky.root);
 const palette={charcoal:new T.MeshStandardMaterial({color:'#292f2b',roughness:.64,metalness:.10}),bronze:new T.MeshStandardMaterial({color:'#8d7958',roughness:.42,metalness:.7}),oak:new T.MeshStandardMaterial({color:'#76634b',roughness:.75}),edge:new T.MeshStandardMaterial({color:'#d0c4b1',roughness:.87}),diffuser:new T.MeshBasicMaterial({color:'#ffe5b9',toneMapped:false})};
 for(const mat of Object.values(palette))materials.add(mat);const staticMaterials=new Set(Object.values(palette));
 const glass=new T.MeshPhysicalMaterial({color:'#dce7e4',transparent:true,opacity:.045,roughness:.045,metalness:0,depthWrite:false,side:T.DoubleSide});glass.userData.architecturalGlass=true;materials.add(glass);
 const mesh=(geometry,material,x,y,z,name,parent=root)=>{geometries.add(geometry);const object=new T.Mesh(geometry,material);object.position.set(x,y,z);object.name=name;object.castShadow=false;object.receiveShadow=true;object.raycast=NO_RAYCAST;object.userData={visualOnly:true,excludeFromProductBounds:true};parent.add(object);return object;};
 const box=(w,h,d,x,y,z,material,name,parent=root,bevel=0)=>mesh(bevel?new RoundedBoxGeometry(w,h,d,2,Math.min(bevel,w/4,h/4,d/4)):new T.BoxGeometry(w,h,d),material,x,y,z,name,parent);
 function collider(x,z,w,d,parent=root,rotation=0){
  parent.updateWorldMatrix(true,false);const relative=new T.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),parent.matrixWorld),points=[];
  const c=Math.cos(rotation),s=Math.sin(rotation);
  for(const [a,b]of [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]])points.push(new T.Vector3(x+c*a+s*b,0,z-s*a+c*b).applyMatrix4(relative));
  colliders.push({minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))});
 }
 function sign(text,w,h,x,y,z,{rotation=0,...options}={},parent=root){const mat=textMaterial(text,options);materials.add(mat);const object=mesh(new T.BoxGeometry(w,h,.006),mat,x,y,z,'Signaletique_'+text,parent);object.rotation.y=rotation;return object;}
 function mergeArchitecture(parent){
  const batches=new Map();for(const object of [...parent.children])if(object.isMesh&&!object.isInstancedMesh&&staticMaterials.has(object.material)&&!object.userData.showroomAction){const parts=batches.get(object.material)||[];parts.push(object);batches.set(object.material,parts);}
  for(const [material,objects]of batches){if(objects.length<2)continue;const pieces=objects.map(object=>{object.updateMatrix();const piece=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();piece.applyMatrix4(object.matrix);return piece;});const combined=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();if(!combined)continue;combined.computeBoundingSphere();combined.computeBoundingBox();const batch=mesh(combined,material,0,0,0,'Architecture_groupee',parent);batch.userData.architecturalParts=objects.map(o=>o.name);for(const object of objects)object.removeFromParent();mergedSequence++;}
 }
 function floor(bounds,recipeId,y=.002){const patch=surfaces.createFloorPatch({bounds,recipeId,y,direction:recipeId.startsWith('yosemite')?'vertical':undefined});patch.userData.architecturalPersistent=true;floorPatches.push(patch);root.add(patch);return patch;}
 function wall(w,h,recipeId,x,z,rotation=0,parent=root,{boundary=false}={}){
  const group=surfaces.createWall({width:w,height:h,recipeId,position:[x,0,z],rotation});group.name='Mur_collection_'+recipeId;group.userData.wallHeight=h;group.userData.exhibitionWall=true;group.userData.architecturalPersistent=true;group.traverse(o=>{if(o.isMesh)o.castShadow=true;});parent.add(group);walls.push(group);collider(x,z,w,.09,parent,rotation);
  if(!boundary){const recipe=surfaces.recipes[recipeId];sign(recipe.manufacturer+' · '+recipe.collection+' · '+recipe.color,Math.min(w-.14,3),.105,x+Math.sin(rotation)*.057,h-.12,z+Math.cos(rotation)*.057,{rotation,size:27,width:768,height:64},parent);}
  return group;
 }
 // Continuous 120x120 mineral field. It never disappears with supplier LOD;
 // collection floors are shallow inlays, without holes or a timber runway.
 const mainFloor=floor({minX:-half,maxX:half,minZ:-depth,maxZ:0},'creta-biscotto',.002);mainFloor.name='Dallage_continu_Creta_Biscotto_120';
 const portalHalf=.49,wing=half-portalHalf;
 for(const side of [-1,1])wall(wing,2.35,side<0?'creta-caramello':'creta-ginepro',side*(portalHalf+wing/2),-.12,Math.PI,root,{boundary:true});
 box(.98,.22,.1,0,2.19,-.12,palette.oak,'Linteau_portail');sign('RETOUR AU CONFIGURATEUR',2.1,.16,0,2.48,-.18,{size:28,width:768});
 wall(width,2.65,'creta-pepe',0,-depth,0,root,{boundary:true});
 for(const side of [-1,1]){
  wall(depth,.32,'slate-river',side*half,-depth/2,-side*Math.PI/2,root,{boundary:true});
  const facade=mesh(new T.PlaneGeometry(depth,height-.34),glass,side*half,(height+.34)/2,-depth/2,'Grande_baie_vitree');facade.rotation.y=Math.PI/2;facade.receiveShadow=false;facade.userData.glazing=true;
  for(let z=0;z>=-depth;z-=8.3)box(.065,height,.065,side*(half-.015),height/2,z,palette.charcoal,'Montant_baie_vitree');
  for(const y of [.33,height-.04])box(.07,.055,depth,side*(half-.015),y,-depth/2,palette.charcoal,'Traverse_baie_vitree');
 }
 const roof=mesh(new T.PlaneGeometry(width,depth),glass,0,height,-depth/2,'Plafond_vitre_panoramique');roof.rotation.x=-Math.PI/2;roof.userData.glazing=true;roof.receiveShadow=false;
 for(let z=-.15;z>=-depth;z-=8.3)box(width,.12,.085,0,height-.06,z,palette.charcoal,'Poutre_verriere_atrium');
 for(const x of [-half,-6.6,6.6,half])box(.055,.065,depth,x,height-.025,-depth/2,palette.charcoal,'Profil_verriere');
 // Welcome is offset so the first sightline reaches furnished scenes.
 const welcomeX=-9.2,welcomeZ=-2.05;
 box(2.5,.87,.66,welcomeX,.435,welcomeZ,palette.oak,'Comptoir_accueil',root,.035);collider(welcomeX,welcomeZ,2.5,.70);
 const face=surfaces.createWall({width:2.45,height:.8,recipeId:'creta-ginepro',position:[welcomeX,.025,welcomeZ+.341]});root.add(face);walls.push(face);
 box(2.62,.05,.76,welcomeX,.905,welcomeZ,palette.bronze,'Plan_accueil',root,.01);sign('LE ROY FACTORY',2.05,.17,welcomeX,.49,welcomeZ+.35,{background:'#303d34',size:30});
 const receptionStone=wall(3.2,2.35,'biopietra-borgo',welcomeX,-.19,Math.PI,root,{boundary:true});receptionStone.name='Mur_parement_BioPietra_Borgo_Antico';
 sign('LE SALON DES MATIÈRES',4.1,.23,3.1,2.85,-11.28,{size:34,width:1024});
 function clearRecord(record){record.generation++;record.controller?.abort();record.controller=null;if(record.texture){record.texture.dispose();record.texture=null;}record.mesh.material.map=null;record.mesh.material.color.set('#8b8271');record.mesh.material.needsUpdate=true;record.state='idle';}
 function setLabel(record,text){const old=record.label.material;materials.delete(old);old.dispose();record.label.material=textMaterial(text,{width:384,height:64,size:24,background:'#333c35'});materials.add(record.label.material);}
 function setPage(stand,page){const count=stand.manufacturer.collections?.length||0,total=Math.max(1,Math.ceil(count/PAGE_SIZE));stand.page=(page%total+total)%total;for(const record of stand.panels){clearRecord(record);record.collection=stand.manufacturer.collections[stand.page*PAGE_SIZE+record.index]||null;record.mesh.userData.showroomCollection={manufacturer:stand.manufacturer,collection:record.collection};record.mount.visible=!!record.collection;if(record.collection)setLabel(record,record.collection.name);}
  const old=stand.pageSign.material;materials.delete(old);old.dispose();stand.pageSign.material=textMaterial(`${stand.page+1} / ${total} · ${count} collections`,{width:512,height:64,size:27});materials.add(stand.pageSign.material);if(hasPosition)prepareNear(lastPosition);onReady();return true;}

 const ownWalls={
  'view-ceramica':['view-corso-beige','view-golden-carbon'],
  'la-fenice':['fenice-travertino-almond','fenice-xmetal-bronzo'],
  'biopietra':['biopietra-borgo','biopietra-borgo'],
  'bulbo':['bulbo-chevron','creta-pepe'],
  'pecchioli-firenze':['pecchioli-specchi-oro','creta-biscotto']
 };
 for(const display of layout.displays){
  const {manufacturer,index,rotation}=display,w=display.width,d=display.depth,h=display.height;
  const group=new T.Group();group.position.set(display.x,0,display.z);group.rotation.y=rotation;group.name='Ilot_'+manufacturer.id;group.userData={visualOnly:true,excludeFromProductBounds:true,showroomManufacturer:manufacturer.id,openSides:display.returnSide?2:3,architecturalPersistent:true};root.add(group);
  const scheme=ownWalls[manufacturer.id]||WALL_SCHEMES[index%WALL_SCHEMES.length];
  const standWalls=[wall(w,h,scheme[0],0,0,0,group)];
  // A short return suggests a bathroom without shutting it off from the atrium.
  if(display.returnSide)standWalls.push(wall(1.1,h,scheme[1],display.returnSide*w/2,.55,-display.returnSide*Math.PI/2,group));
  floor(display.bounds,display.floor,.012);
  const stand={manufacturer,index,group,rotation,layout:display,fixtureLayout:display.fixtureLayout,front:display.bounds.maxZ,back:display.bounds.minZ,minX:display.bounds.minX,maxX:display.bounds.maxX,page:0,panels:[],walls:standWalls,pageSize:PAGE_SIZE,bounds:display.bounds,approach:display.approach};stands.push(stand);
  if(index<6||manufacturer.id==='randal-pro'){
   box(w+.12,.075,.70,0,h+.47,.20,palette.charcoal,'Casquette_suspendue',group);
   box(w-.18,.018,.035,0,h+.42,.52,palette.diffuser,'Lavage_chaud_du_mur',group);
  }
  sign(manufacturer.name.toUpperCase(),Math.min(w-.12,4.6),.145,0,h+.20,.025,{width:1024,height:64,size:36},group);
  const featured=display.fixtureLayout.kind!=='none',rackX=featured?w/2-.55:0,rackZ=featured?d-.4:.52;
  box(1.06,.64,.42,rackX,.32,rackZ,palette.oak,'Bibliotheque_echantillons',group,.012);collider(rackX,rackZ,1.08,.46,group);
  box(1.12,.025,.46,rackX,.655,rackZ,palette.bronze,'Plan_bibliotheque',group);
  for(let i=0;i<PAGE_SIZE;i++){
   const mount=new T.Group();mount.position.set(rackX+(i-1.5)*.25,0,rackZ-.025);mount.rotation.y=(i-1.5)*-.045;group.add(mount);
   box(.235,.61,.022,0,1.035,0,palette.charcoal,'Cadre_echantillon',mount);
   const material=new T.MeshStandardMaterial({color:'#8b8271',roughness:.75});materials.add(material);const sample=mesh(new T.PlaneGeometry(1,1),material,0,1.035,.016,'Collection_cliquable',mount);sample.scale.set(.215,.572,1);
   const label=sign('',.235,.075,0,.695,.018,{width:384,height:64,size:22},mount),point=showroomPoint(display,mount.position.x,mount.position.z);
   const record={mesh:sample,label,mount,manufacturer,collection:null,index:i,texture:null,controller:null,state:'idle',generation:0,localPosition:new T.Vector3(point.x,0,point.z)};stand.panels.push(record);panels.push(record);textureRecords.add(record);
  }
  stand.pageSign=sign('',.78,.075,rackX,.49,rackZ+.217,{width:512,height:64,size:27},group);
  for(const direction of [-1,1]){const button=sign(direction<0?'‹':'›',.13,.14,rackX+direction*.46,.48,rackZ+.222,{width:64,height:64,size:48,color:'#272e2b',background:'#d2c6ac'},group);button.userData.showroomAction={kind:'page',manufacturerId:manufacturer.id,direction};interactions.push(button);}
  const catalogue=sign('COLLECTIONS · HD',.92,.10,rackX,.32,rackZ+.222,{width:512,height:64,size:28},group);catalogue.userData.showroomAction={kind:'catalogue',manufacturerId:manufacturer.id};interactions.push(catalogue);
  setPage(stand,0);mergeArchitecture(group);
 }
 const fixtures=makeShowroomFixtures({stands,onReady:invalidate});root.add(fixtures.root);colliders.push(...fixtures.colliders);
 const greenery=makeShowroomGreenery({width,depth,stands,layout,onReady:invalidate});root.add(greenery.root);colliders.push(...greenery.colliders);mergeArchitecture(root);
 // One coherent daylight shadow, rather than two rooms' overlapping light rigs.
 const hemi=new T.HemisphereLight('#e9f0f0','#807564',.68);hemi.name='Lumiere_diffuse_atrium';root.add(hemi);
 const sun=new T.DirectionalLight('#fff2df',1.5);sun.name='Soleil_atrium';sun.position.set(-15,22,8);sun.target.position.set(1,0,-16);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-21,right:21,top:23,bottom:-23,near:1,far:75});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00016;sun.shadow.normalBias=.018;sun.shadow.radius=3;root.add(sun,sun.target);
 const spots=[];for(let i=0;i<2;i++){const light=new T.SpotLight(i?'#f5efe2':'#ffe6c7',i?14:18,9,.82,.65,2);light.name='Accent_collection_'+i;light.castShadow=false;root.add(light,light.target);spots.push(light);}
 function updateLighting(position,renderer){
  const nearest=layout.displays.filter(d=>d.index<6).sort((a,b)=>Math.hypot(a.approach.x-position.x,a.approach.z-position.z)-Math.hypot(b.approach.x-position.x,b.approach.z-position.z)).slice(0,2);
  const focus=nearest.map(d=>d.index).join(','),changed=lightFocus!==focus||shadowDirty;lightFocus=focus;
  for(const [i,light]of spots.entries()){const display=nearest[i];if(!display){light.visible=false;continue;}const p=showroomPoint(display,0,1.8),target=showroomPoint(display,0,.08);light.position.set(p.x,3.15,p.z);light.target.position.set(target.x,1.15,target.z);light.visible=true;}
  if(renderer?.shadowMap){renderer.shadowMap.enabled=true;if(shadowDirty){renderer.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true;}}shadowDirty=false;return changed;
 }
 function textureURL(record){return surfaceAssetURL(record.collection?.preview||record.collection?.image||'');}
 async function loadRecord(record){if(disposed||record.state!=='idle'||!record.collection||!textureURL(record))return false;if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return false;const generation=record.generation,controller=new AbortController();record.controller=controller;record.state='loading';
  try{const texture=await loadTexture(textureURL(record),{signal:controller.signal,maxDimension:textureSize});if(disposed||generation!==record.generation||controller.signal.aborted){texture.dispose();return false;}texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;const image=texture.image,w=image?.naturalWidth||image?.width||1,h=image?.naturalHeight||image?.height||1,ratio=w/h;const fittedWidth=Math.min(.215,.572*ratio);record.mesh.scale.set(fittedWidth,fittedWidth/ratio,1);record.mesh.material.map=texture;record.mesh.material.color.set('#ffffff');record.mesh.material.needsUpdate=true;record.texture=texture;record.state='ready';onReady();return true;}catch{if(generation===record.generation)record.state=controller.signal.aborted?'idle':'error';return false;}finally{if(record.controller===controller)record.controller=null;}}

 function cullDetails(position){
  // Floors, collection walls and brand signs are permanent architectural forms.
  for(const stand of stands)stand.group.visible=true;
  for(const record of textureRecords){record.distance=Math.hypot(record.localPosition.x-position.x,record.localPosition.z-position.z);record.mount.visible=!!record.collection&&record.distance<18;}
 }
 cullDetails(new T.Vector3());
 function prepareNear(position){if(disposed||!position)return Promise.resolve([]);lastPosition.copy(position);hasPosition=true;cullDetails(position);surfaces.prepareNear(position);sky.prepareNear(position);fixtures.prepareNear(position);greenery.prepareNear(position);
  const selected=[...textureRecords].filter(p=>p.collection&&p.distance<18).sort((a,b)=>a.distance-b.distance).slice(0,maxTextures),keep=new Set(selected);for(const record of textureRecords){record.mount.visible=keep.has(record);if(!keep.has(record)&&(record.texture||record.controller))clearRecord(record);}return Promise.all(selected.map(loadRecord));}
 function activateAction(action){if(action?.kind!=='page')return false;const stand=stands.find(s=>s.manufacturer.id===action.manufacturerId);return stand?setPage(stand,stand.page+(action.direction<0?-1:1)):false;}
 function dispose(){if(disposed)return;disposed=true;for(const record of textureRecords)clearRecord(record);fixtures.dispose();greenery.dispose();surfaces.dispose();sky.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();sun.dispose();for(const light of spots)light.dispose();root.removeFromParent();}
 palette.charcoal.addEventListener('dispose',()=>{if(!disposed)dispose();});
 return {root,dimensions,layout,navigableBounds,colliders,panels,interactions,stands,walls,floorPatches,prepareNear,activateAction,dispose,greenery,fixtures,sky,surfaces,updateLighting,get skyTexture(){return sky.texture},surfaceRecipes:surfaces.recipes,appearance:{environmentIntensity:.58,exposure:.92,toneMapping:T.ACESFilmicToneMapping,fogNear:27,fogFar:90,fogColor:'#7c837c'},diagnostics:()=>({manufacturers:stands.length,collections:manufacturers.reduce((n,m)=>n+(m.collections?.length||0),0),panels:panels.filter(p=>p.collection).length,pageSize:PAGE_SIZE,loaded:[...textureRecords].filter(p=>p.texture).length,loading:[...textureRecords].filter(p=>p.controller).length,maxTextures,textureSize,visibleStands:stands.filter(s=>s.group.visible).length,visiblePanels:panels.filter(p=>p.collection&&p.mount.visible).length,architectureBatches:mergedSequence,wallHeight:layout.wallHeight,layout:'open-atrium',fixtures:fixtures.diagnostics(),surfaces:surfaces.diagnostics()})};
}
