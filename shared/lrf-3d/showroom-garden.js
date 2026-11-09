import * as T from 'three';
import {makeShowroomSurfaces,SHOWROOM_SURFACE_RECIPES} from './showroom-surfaces.js';
import {makeShowroomGreenery} from './showroom-greenery.js';
import {makeGardenDecor} from './showroom-garden-decor.js';
import {SHOWROOM_MANUFACTURERS} from './showroom-catalog.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';
import {GARDEN_LAYOUT,subtractGardenRect} from './showroom-garden-layout.js';
const noRaycast=()=>{};
export function makeShowroomGarden({onReady=()=>{},loadTexture=loadQueuedTexture,layout=GARDEN_LAYOUT}={}){
 const root=new T.Group();root.name='Jardin_exposition_piscine_terrasse';root.userData={visualOnly:true,excludeFromProductBounds:true,garden:true};
 const {bounds,poolBounds,terrace}=layout,colliders=[{...poolBounds,kind:'pool-no-entry'}],ownedMaterials=new Set(),ownedGeometry=new Set(),ownedTextures=new Set(),boards=[];
 const surfaces=makeShowroomSurfaces({coordinateRoot:root,onReady,loadTexture,maxResidentMaps:8});let disposed=false,poolManager=null,poolRoot=null,selected='slate-river',time=0;
 const action={kind:'pool-finish'};
 function add(g,m,x,y,z,name){ownedGeometry.add(g);ownedMaterials.add(m);const mesh=new T.Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);mesh.raycast=noRaycast;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={visualOnly:true,excludeFromProductBounds:true};root.add(mesh);return mesh;}
 const edge=new T.MeshStandardMaterial({color:'#d4c7b1',roughness:.83}),dark=new T.MeshStandardMaterial({color:'#293b34',roughness:.8}),soil=new T.MeshStandardMaterial({color:'#45583c',roughness:1});
 function floor(b,recipe,y=.002,manager=surfaces,parent=root){const p=manager.createFloorPatch({bounds:b,recipeId:recipe,y,direction:recipe.startsWith('yosemite')?'vertical':undefined});parent.add(p);return p;}
 for(const b of subtractGardenRect(bounds,poolBounds))floor(b,'creta-biscotto');
 for(const b of subtractGardenRect(terrace,poolBounds))floor(b,'yosemite-natural',.014);
 for(const side of [-1,1]){const x=side<0?bounds.minX+.42:bounds.maxX-.42,bed={minX:x-.38,maxX:x+.38,minZ:bounds.minZ+.25,maxZ:bounds.maxZ-.25},opening={minX:bounds.minX-1,maxX:bounds.minX+1,minZ:layout.entrance.z-layout.entrance.width/2,maxZ:layout.entrance.z+layout.entrance.width/2};for(const b of side<0?subtractGardenRect(bed,opening):[bed])add(new T.BoxGeometry(b.maxX-b.minX,.12,b.maxZ-b.minZ),soil,(b.minX+b.maxX)/2,.01,(b.minZ+b.maxZ)/2,'Massif_paysager');}
 add(new T.BoxGeometry(bounds.maxX-bounds.minX,.12,.7),soil,(bounds.minX+bounds.maxX)/2,.01,bounds.minZ+.35,'Massif_fond_du_jardin');
 for(const [x,z,w,d]of [[26,-10.78,8.46,.44],[26,-21.22,8.46,.44],[21.78,-16,.44,10],[30.22,-16,.44,10]]){const coping=add(new T.BoxGeometry(w,.14,d),edge,x,.025,z,'Margelle_piscine');coping.userData.showroomAction=action;}
 const choices=['slate-river','slate-gold','slate-dark','creta-biscotto','creta-ginepro','shell-grey'].filter(id=>SHOWROOM_SURFACE_RECIPES[id]).map(id=>{const r=SHOWROOM_SURFACE_RECIPES[id],manufacturer=SHOWROOM_MANUFACTURERS.find(m=>m.id==='elios-ceramica'),base=manufacturer.collections.find(c=>c.name===r.collection);return{id,label:r.collection+' · '+r.color,preview:r.image,manufacturer,collection:{...base,name:r.collection,selectedColor:r.color,selectedFormat:r.format,hdImage:r.hdImage,hdImages:r.hdImages}};});
 function setPoolCollection(id){
  if(disposed||!choices.some(c=>c.id===id))return false;
  poolManager?.dispose();poolRoot?.removeFromParent();selected=id;poolRoot=new T.Group();poolRoot.name='Revetement_reel_du_bassin';poolRoot.userData={showroomAction:action,poolFinish:id};root.add(poolRoot);
  poolManager=makeShowroomSurfaces({coordinateRoot:root,onReady,loadTexture,maxResidentMaps:3});
  floor(poolBounds,id,-1.28,poolManager,poolRoot);
  const w=poolBounds.maxX-poolBounds.minX,d=poolBounds.maxZ-poolBounds.minZ,cx=(poolBounds.minX+poolBounds.maxX)/2,cz=(poolBounds.minZ+poolBounds.maxZ)/2;
  for(const spec of [{width:w,position:[cx,-1.28,poolBounds.minZ],rotation:0},{width:w,position:[cx,-1.28,poolBounds.maxZ],rotation:Math.PI},{width:d,position:[poolBounds.minX,-1.28,cz],rotation:Math.PI/2},{width:d,position:[poolBounds.maxX,-1.28,cz],rotation:-Math.PI/2}])poolRoot.add(poolManager.createWall({...spec,height:1.28,recipeId:id}));
  poolRoot.traverse(o=>{if(o.isMesh)o.userData.showroomAction=action;});poolManager.prepareNear({x:cx,z:cz});onReady();return true;
 }
 setPoolCollection(selected);
 const size=96,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data[i]=128+Math.round(21*Math.cos(x*.31+y*.13));data[i+1]=128+Math.round(18*Math.sin(y*.28-x*.19));data[i+2]=250;data[i+3]=255;}
 const normal=new T.DataTexture(data,size,size,T.RGBAFormat);normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.repeat.set(7,9);normal.needsUpdate=true;ownedTextures.add(normal);
 const waterMaterial=new T.MeshPhysicalMaterial({color:'#9bd7d3',roughness:.12,metalness:.07,transparent:true,opacity:.53,depthWrite:false,clearcoat:1,clearcoatRoughness:.08,normalMap:normal,normalScale:new T.Vector2(.065,.065),side:T.DoubleSide});
 const water=add(new T.PlaneGeometry(8,10,1,1),waterMaterial,26,-.17,-16,'Eau_piscine_reflets');water.rotation.x=-Math.PI/2;water.castShadow=false;water.userData.showroomAction=action;
 function sign(text,w,h,x,y,z,rotation=0){const mat=new T.MeshBasicMaterial({color:'#263c33',toneMapped:false});if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#263c33';ctx.fillRect(0,0,768,96);ctx.fillStyle='#efe8d8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 31px Arial';ctx.fillText(text,384,48,740);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;ownedTextures.add(map);mat.map=map;mat.color.set('#ffffff');}}const label=add(new T.PlaneGeometry(w,h),mat,x,y,z,text);label.rotation.y=rotation;label.castShadow=false;return label;}
 const rev=SHOWROOM_MANUFACTURERS.find(m=>m.id==='reviglass'),bio=SHOWROOM_MANUFACTURERS.find(m=>m.id==='biopietra');
 function board(manufacturer,collection,x,z,rotation=0){
  const frame=add(new T.BoxGeometry(1.42,2.1,.11),dark,x,1.05,z,'Panneau_'+manufacturer.name);frame.rotation.y=rotation;frame.userData.showroomCollection={manufacturer,collection};colliders.push({minX:x-.74,maxX:x+.74,minZ:z-.12,maxZ:z+.12});
  const material=new T.MeshStandardMaterial({color:'#c8c4b6',roughness:.65}),face=add(new T.PlaneGeometry(1.30,1.68),material,x+Math.sin(rotation)*.066,1.18,z+Math.cos(rotation)*.066,'Collection_'+collection.name);face.rotation.y=rotation;face.userData.showroomCollection={manufacturer,collection};
  sign(manufacturer.name+' · '+collection.name,1.32,.13,x+Math.sin(rotation)*.069,.22,z+Math.cos(rotation)*.069,rotation);
  boards.push({mesh:face,material,url:surfaceAssetURL(collection.image),state:'idle',texture:null,controller:null});
 }
 const revNames=['ST-04 Sukabumi','ST-05 Sumatra','ST-01 Carrara','ST-06 Vulcano'];revNames.forEach((name,i)=>{const c=rev.collections.find(c=>c.name===name);if(c)board(rev,c,23+i*1.75,-28.35);});
 sign('REVIGLASS · MOSAÏQUES DE PISCINE',7.2,.25,25.7,2.45,-28.4);
 const stoneWall=surfaces.createWall({width:6.4,height:2.35,recipeId:'biopietra-borgo',position:[34.5,0,-25.8],rotation:-Math.PI/2});root.add(stoneWall);colliders.push({minX:34.42,maxX:34.58,minZ:-29,maxZ:-22.6});
 for(const [i,name]of ['Borgo Antico','Acropoli','Alviano'].entries()){const c=bio.collections.find(c=>c.name===name);if(c)board(bio,c,33.1-i*1.6,-29.1);}
 sign('BIOPIETRA · PIERRES & PAREMENTS',5.3,.23,31.5,2.45,-29.15);
 sign('PISCINE · TOUCHER POUR CHANGER LE REVÊTEMENT',6,.18,26,.78,-10.65);
 const decor=makeGardenDecor({layout,onReady});root.add(decor.root);colliders.push(...decor.colliders);
 const planting=makeShowroomGreenery({width:70,depth:32,layout:{plantZones:layout.plantZones,lounge:null},plantsOnly:true,exteriorSides:[]});root.add(planting.root);colliders.push(...planting.colliders);
 async function loadBoard(record){if(record.state!=='idle'||disposed)return;if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return;record.state='loading';record.controller=new AbortController();try{const map=await loadTexture(record.url,{signal:record.controller.signal,maxDimension:1024});if(disposed||record.controller.signal.aborted){map.dispose();return;}map.colorSpace=T.SRGBColorSpace;record.texture=map;ownedTextures.add(map);record.material.map=map;record.material.color.set('#ffffff');const image=map.image,w=image?.naturalWidth||image?.width||1,h=image?.naturalHeight||image?.height||1,ratio=w/h,fw=Math.min(1.3,1.68*ratio);record.mesh.scale.set(fw/1.3,fw/ratio/1.68,1);record.material.needsUpdate=true;record.state='ready';onReady();}catch{record.state='error';}}
 function prepareNear(position){if(disposed)return Promise.resolve([]);decor.prepareNear(position);planting.prepareNear(position);const nearby=boards.filter(b=>Math.hypot(b.mesh.position.x-position.x,b.mesh.position.z-position.z)<20);return Promise.all([surfaces.prepareNear(position),poolManager?.prepareNear(position),...nearby.map(loadBoard)]);}
 function update(seconds){if(disposed)return false;time=Number.isFinite(seconds)?seconds:time;normal.offset.set(time*.009,time*.005);decor.update(time);return true;}
 function dispose(){if(disposed)return;disposed=true;boards.forEach(b=>b.controller?.abort());poolManager?.dispose();surfaces.dispose();decor.dispose();planting.dispose();for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterials)m.dispose();for(const t of ownedTextures)t.dispose();root.removeFromParent();}
 return{root,bounds,poolBounds,layout,colliders,choices,water,decor,planting,prepareNear,update,dispose,setPoolCollection,get selectedCollectionId(){return selected},get poolSurface(){return poolRoot},diagnostics:()=>({disposed,selectedCollectionId:selected,reviglassPanels:boards.filter(b=>b.mesh.userData.showroomCollection.manufacturer===rev).length,biopietraPanels:boards.filter(b=>b.mesh.userData.showroomCollection.manufacturer===bio).length,loadedPanels:boards.filter(b=>b.texture).length,decor:decor.diagnostics(),planting:planting.diagnostics()})};
}
