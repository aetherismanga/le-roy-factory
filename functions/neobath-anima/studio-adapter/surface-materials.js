import * as T from 'three';
import {normalizeTopSurface,surfaceFamilyForSelection} from './premium-materials.js';
import {configureAnimaTexture} from './premium-rendering.mjs';

export function applyPlanSurfaceUV(root,material){
 // One source image covers the whole continuous slab. A centimetre-based
 // repeating tile would add conspicuous duplicate bands when a custom top is
 // lengthened. Project in the top's own frame, including nested transforms:
 // moving/snapping the plan cannot move the texture underneath it, and the
 // deck, cut-outs and matching integrated bowl share one continuous field.
 root.updateWorldMatrix(true,true);
 const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),meshes=[],bounds=new T.Box3();
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material!==material||!mesh.geometry?.attributes.position)return;
  const transform=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(transform));meshes.push({mesh,transform});
 });
 if(!meshes.length||bounds.isEmpty())return;
 const top=root.userData.animaTop||{},width=top.width||bounds.max.x-bounds.min.x,depth=top.depth||bounds.max.z-bounds.min.z;
 if(!(width>0&&depth>0))return;
 const originX=top.width?-width/2:bounds.min.x,originZ=top.depth?(top.zOffset||0)-depth/2:bounds.min.z,point=new T.Vector3();
 for(const {mesh,transform}of meshes){
  const geometry=mesh.geometry,p=geometry.attributes.position;
  let uv=geometry.attributes.uv;if(!uv){uv=new T.Float32BufferAttribute(new Float32Array(p.count*2),2);geometry.setAttribute('uv',uv);}
  for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(transform);uv.setXY(i,(point.x-originX)/width,(point.z-originZ)/depth);}
  uv.needsUpdate=true;geometry.userData.animaSurfaceUV='continuous-single-sheet';
 }
 root.userData.animaSurfaceUV={mode:'continuous-single-sheet',width,depth,anchor:'plan-local',sourceLayout:'sample-fitted-to-preview'};
}

// A plan owns its material and texture clones. Furniture finish changes and
// basin colour changes cannot repaint a separate Fenix/HPL/stone worktop.
export function createTopSurfaceController({wood,ceramic,textureLoader=null}={}){
 const material=new T.MeshPhysicalMaterial({color:'#f6f5f1',metalness:0,roughness:.62,clearcoat:0});
 const owned=new Set(),cache=new Map(),loaded=new Map();let revision=0,disposed=false,current=null,pending=Promise.resolve();
 function release(){for(const texture of owned)texture.dispose();owned.clear();cache.clear();loaded.clear();}
 const onDispose=()=>{disposed=true;revision++;release();};material.addEventListener('dispose',onDispose);
 function load(url){
  if(cache.has(url)){const value=cache.get(url);cache.delete(url);cache.set(url,value);return value;}
  const loader=textureLoader||new T.TextureLoader();
  const promise=loader.loadAsync(url).then(source=>{const texture=source.clone();texture.userData={...source.userData,animaSurfaceURL:url,animaMapping:'continuous-single-sheet'};owned.add(texture);if(textureLoader==null)source.dispose();configureAnimaTexture(texture,null,{singleSheet:true});if(disposed||!cache.has(url)){texture.dispose();owned.delete(texture);}else loaded.set(url,texture);return texture;});
  cache.set(url,promise);promise.catch(()=>cache.delete(url));
  while(cache.size>4){const key=cache.keys().next().value;cache.delete(key);const texture=loaded.get(key);if(texture){texture.dispose();loaded.delete(key);owned.delete(texture);}}
  return promise;
 }
 function apply(settings,selection,{onReady}={}){
  const ticket=++revision;current=normalizeTopSurface(settings,selection);
  if(!current){
   const source=surfaceFamilyForSelection(selection)==='furniture'?wood:ceramic;
   if(source)material.copy(source);material.name='NEOBATH_plan_'+(selection?.top?.ref||'sans_plan');material.userData.animaSurface={family:surfaceFamilyForSelection(selection),id:null};material.needsUpdate=true;
   pending=Promise.resolve(material);return current;
  }
  const surface=current.surface;
  material.name='NEOBATH_surface_'+surface.id;material.color.set(surface.hex||'#f6f5f1');material.map=null;material.bumpMap=null;material.normalMap=null;
  material.metalness=0;material.roughness=surface.roughness??(current.family==='fenix'?.82:current.family==='gres'?.46:.62);
  material.clearcoat=surface.clearcoat??(current.family==='fenix'?0:.025);material.clearcoatRoughness=.65;material.ior=1.48;material.transparent=false;material.opacity=1;material.side=T.FrontSide;
  material.userData.animaSurface={id:surface.id,family:current.family,code:surface.code,source:surface.source,ncsCode:current.ncsCode};material.needsUpdate=true;
  const officialUniform=current.family==='fenix'&&surface.colorSource==='manufacturer field_background_color';
  material.userData.animaSurface.colourIdentity=officialUniform?'manufacturer-rgb':'manufacturer-texture';
  if(surface.texture&&!officialUniform&&(textureLoader||typeof document!=='undefined'))pending=load(surface.texture).then(texture=>{
   if(disposed||ticket!==revision)return material;
   material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;onReady?.();return material;
  }).catch(()=>material);
  else pending=Promise.resolve(material);
  return current;
 }
 return {material,apply,get current(){return current;},ready:()=>pending,dispose(){if(!disposed)material.dispose();}};
}
