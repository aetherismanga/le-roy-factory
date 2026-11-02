import * as T from 'three';
import {normalizeTopSurface,surfaceFamilyForSelection} from './premium-materials.js';
import {configureAnimaTexture} from './premium-rendering.mjs';

export function applyPlanSurfaceUV(root,material,period=[.8,.8]){
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material!==material||!mesh.geometry?.attributes.position)return;
  const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
  let uv=geometry.attributes.uv;if(!uv){uv=new T.Float32BufferAttribute(new Float32Array(p.count*2),2);geometry.setAttribute('uv',uv);}
  for(let i=0;i<p.count;i++){
   const x=p.getX(i)+mesh.position.x,y=p.getY(i)+mesh.position.y,z=p.getZ(i)+mesh.position.z,nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));
   if(ny>=nx&&ny>=Math.abs(n.getZ(i)))uv.setXY(i,x/period[0]+.5,z/period[1]+.5);
   else if(nx>.6)uv.setXY(i,z/period[1]+.5,y/period[0]+.5);
   else uv.setXY(i,x/period[0]+.5,y/period[1]+.5);
  }
  uv.needsUpdate=true;
 });
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
  const promise=loader.loadAsync(url).then(source=>{const texture=source.clone();texture.userData={...source.userData,animaSurfaceURL:url};owned.add(texture);if(textureLoader==null)source.dispose();configureAnimaTexture(texture);if(disposed||!cache.has(url)){texture.dispose();owned.delete(texture);}else loaded.set(url,texture);return texture;});
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
