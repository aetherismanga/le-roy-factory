import * as T from 'three';
import {COLLECTIONS,formatsForColor} from './surface-catalog.js';
import {loadQueuedTexture,surfaceAssetURL} from './texture-loader.js';

function collectionRecipe(collection,color,format){
 const record=COLLECTIONS[collection],colour=record?.colors.find(value=>value.id===color),size=formatsForColor(collection,color).find(value=>value.id===format);
 if(!colour||!size||!colour.file)throw Error('Matière d’exposition indisponible : '+[collection,color,format].join(' / '));
 // A material sample is not a photographed installation. Keep the original
 // canonical source and physical format, without inventing extra tile faces.
 return Object.freeze({manufacturer:record.brand,collection,color:colour.name,colorId:color,format,width:size.width,height:size.height,source:colour.source||record.source,image:surfaceAssetURL(colour.file),nativeFaces:!!colour.nativeFaces,definition:colour.definition||'Échantillon matière fabricant',roughness:record.roughness??.78,bump:record.bump??.0005});
}
export const SHOWROOM_MATERIAL_RECIPES=Object.freeze({
 floor:collectionRecipe('Creta','avena','120x120'),
 darkFloor:collectionRecipe('Slate','dark','60x60'),
 sageFloor:collectionRecipe('Creta','ginepro','60x120'),
 stone:Object.freeze({manufacturer:'BioPietra',collection:'Borgo Antico',color:'Mix Borgo Antico',format:'Parement mixte',width:1.2,height:1.2,source:'https://biopietra.com/prodotto/borgo-antico/',image:'https://leroyfactory.fr/assets/img/biopietra-20261101/8edbae0fda02fe39a1.webp',original:'https://biopietra.com/wp-content/uploads/2016/08/Borgo-Antico_muro-870x870.jpg',definition:'Photographie fabricant de parement de face · dérivé natif512×512',roughness:.96,bump:.0035})
});

function microFinish(kind='plaster'){
 const edge=128,data=new Uint8Array(edge*edge*4);let seed=769;
 for(let y=0;y<edge;y++)for(let x=0;x<edge;x++){
  seed=(seed*1664525+1013904223)>>>0;
  const grain=kind==='wood'?Math.sin(x*.12+Math.sin(y*.035)*1.1)*15+Math.sin(x*.6)*5:kind==='stone'?Math.sin(x*.19+y*.11)*7:0;
  const value=T.MathUtils.clamp(128+grain+((seed>>>24)-128)*(kind==='plaster'?.12:.2),0,255),i=(y*edge+x)*4;
  data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,edge,edge,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.repeat.set(kind==='wood'?3:4,kind==='wood'?1:4);texture.needsUpdate=true;return texture;
}

// Continuous UVs preserve the true product format across a long hall surface.
// Call before merging static geometry: the metre grid is baked into the UVs.
export function applyShowroomSurfaceUV(geometry,{plane='floor',width=1.2,height=1.2,offsetX=0,offsetY=0}={}){
 if(!geometry?.attributes?.position||![width,height].every(value=>Number.isFinite(value)&&value>0))throw Error('Échelle de matière invalide.');
 const position=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv||new T.BufferAttribute(new Float32Array(position.count*2),2);
 for(let index=0;index<position.count;index++){
  let x,y;
  if(plane==='floor'){x=position.getX(index);y=-position.getZ(index);}
  else if(plane==='wallX'){x=position.getZ(index);y=position.getY(index);}
  else if(plane==='auto'&&normal&&Math.abs(normal.getX(index))>.5){x=position.getZ(index);y=position.getY(index);}
  else{x=position.getX(index);y=position.getY(index);}
  uv.setXY(index,(x+offsetX)/width,(y+offsetY)/height);
 }
 uv.needsUpdate=true;geometry.setAttribute('uv',uv);return geometry;
}

function fitNativeSample(texture,recipe){
 const image=texture.image,iw=image?.naturalWidth||image?.width||1,ih=image?.naturalHeight||image?.height||1,target=recipe.width/recipe.height,aspect=iw/ih;
 texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;
 // Samples may be rectangular even when the reviewed product is square.
 // Crop the longer axis rather than stretching the manufacturer's grain.
 if(aspect>target){texture.repeat.set(target/aspect,1);texture.offset.set((1-target/aspect)/2,0);}
 else if(aspect<target){texture.repeat.set(1,aspect/target);texture.offset.set(0,(1-aspect/target)/2);}
 texture.userData.showroomNativeSample={collection:recipe.collection,color:recipe.color,format:recipe.format,crop:true};texture.needsUpdate=true;
}

export function createShowroomMaterials({onReady=()=>{},loadTexture=loadQueuedTexture}={}){
 let disposed=false,task=null;const controller=new AbortController(),ownedTextures=new Set(),state={};
 const plaster=microFinish(),mineral=microFinish('stone'),grain=microFinish('wood');for(const texture of [plaster,mineral,grain])ownedTextures.add(texture);
 const materials={
  floor:new T.MeshPhysicalMaterial({color:'#c9bda8',roughness:.63,clearcoat:.13,clearcoatRoughness:.73,bumpMap:null,bumpScale:0}),
  darkFloor:new T.MeshPhysicalMaterial({color:'#373c38',roughness:.81,clearcoat:.03,bumpMap:null,bumpScale:0}),
  sageFloor:new T.MeshPhysicalMaterial({color:'#737c5b',roughness:.83,clearcoat:.03,bumpMap:null,bumpScale:0}),
  stone:new T.MeshStandardMaterial({color:'#a9a491',roughness:.96,bumpMap:mineral,bumpScale:.0035}),
  terracotta:new T.MeshStandardMaterial({color:'#b56548',roughness:.88,bumpMap:plaster,bumpScale:.0008}),
  sage:new T.MeshStandardMaterial({color:'#728778',roughness:.86,bumpMap:plaster,bumpScale:.0007}),
  petrol:new T.MeshStandardMaterial({color:'#2c555a',roughness:.8,bumpMap:plaster,bumpScale:.0007}),
  ivory:new T.MeshStandardMaterial({color:'#e6ddca',roughness:.87,bumpMap:plaster,bumpScale:.0005}),
  oak:new T.MeshStandardMaterial({color:'#9b7853',roughness:.58,bumpMap:grain,bumpScale:.0007}),
  brass:new T.MeshStandardMaterial({color:'#a78b58',metalness:.8,roughness:.33})
 };
 for(const [name,recipe]of Object.entries(SHOWROOM_MATERIAL_RECIPES)){materials[name].name=recipe.manufacturer+' '+recipe.collection+' · '+recipe.color;materials[name].userData.showroomRecipe=recipe;state[name]={status:'idle',source:recipe.image};}
 const prepareNear=()=>{
  if(disposed)return Promise.resolve(false);if(task)return task;
  if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return Promise.resolve(false);
  task=Promise.all(Object.entries(SHOWROOM_MATERIAL_RECIPES).map(async([name,recipe])=>{
   state[name].status='loading';
   try{
    const texture=await loadTexture(recipe.image,{signal:controller.signal,maxDimension:name==='stone'?512:1024});
    if(disposed){texture.dispose();return false;}
    fitNativeSample(texture,recipe);ownedTextures.add(texture);const material=materials[name];material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;state[name].status='ready';onReady();return true;
   }catch(error){if(!disposed){state[name].status='error';state[name].error=String(error?.message||error);}return false;}
  })).then(results=>results.some(Boolean));return task;
 };
 function dispose(){if(disposed)return;disposed=true;controller.abort();for(const texture of ownedTextures)texture.dispose();ownedTextures.clear();for(const material of Object.values(materials))material.dispose();}
 // Root's normal material disposal owns all maps and cancels late downloads.
 for(const material of Object.values(materials))material.addEventListener('dispose',dispose);
 return {materials,recipes:SHOWROOM_MATERIAL_RECIPES,prepareNear,dispose,materialForStand:(_manufacturer,index=0)=>[materials.sageFloor,materials.darkFloor,materials.floor][Math.abs(index)%3],diagnostics:()=>({disposed,textures:ownedTextures.size,status:structuredClone(state)})};
}
