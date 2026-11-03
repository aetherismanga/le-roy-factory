import * as T from 'three';
import {normalizeTopSurface,surfaceFamilyForSelection} from './premium-materials.js';
import {configureAnimaTexture} from './premium-rendering.mjs';

const MAPPING_MODE='fixed-metric-face-unfold',SURFACE_REFERENCE_SHORT_SIDE=.80;
// A material owns one current plan. This weak association is deliberately kept
// out of userData: Three.js serializes userData and a scene object is circular.
const currentRootByMaterial=new WeakMap();
const dimensions=value=>Array.isArray(value)&&value.length===2&&value.every(v=>Number.isFinite(v)&&v>0)?value:null;
export function resolvePlanSurfaceScale(surface={},image=null){
 const physical=dimensions(surface.physicalSize),pixels=dimensions(surface.source?.runtimeSize)||dimensions(surface.source?.nativeSize)||dimensions([image?.width,image?.height]);
 if(physical)return {size:[...physical],status:'explicit-physical-size',pixels: pixels?[...pixels]:null};
 const aspect=pixels?pixels[0]/pixels[1]:1;
 return {size:aspect>=1?[SURFACE_REFERENCE_SHORT_SIDE*aspect,SURFACE_REFERENCE_SHORT_SIDE]:[SURFACE_REFERENCE_SHORT_SIDE,SURFACE_REFERENCE_SHORT_SIDE/aspect],status:pixels?'fixed-preview-reference-from-image-aspect':'fixed-preview-reference-square-fallback',pixels:pixels?[...pixels]:null,referenceShortSide:SURFACE_REFERENCE_SHORT_SIDE,approximate:true};
}
function scaleForMaterial(material){
 const surface=material.userData.animaSurface||{};
 // Furniture maps already carry Studio One's approved image transform. Do not
// count the portrait image aspect again on a matching furniture cover.
 if(surface.family==='furniture')return {size:[.80,.70],status:'existing-furniture-metre-reference',approximate:true};
 return resolvePlanSurfaceScale(surface,material.map?.image);
}
export function applyPlanSurfaceUV(root,material){
 root.updateWorldMatrix(true,true);
 const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),meshes=[],bounds=new T.Box3();
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material!==material||!mesh.geometry?.attributes.position)return;
  const transform=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(transform));meshes.push({mesh,transform});
 });
 if(!meshes.length||bounds.isEmpty())return;
 currentRootByMaterial.set(material,root);
 const top=root.userData.animaTop||{},width=top.width||bounds.max.x-bounds.min.x,depth=top.depth||bounds.max.z-bounds.min.z;
 if(!(width>0&&depth>0))return;
 const scale=scaleForMaterial(material),[scaleX,scaleZ]=scale.size,topY=Number.isFinite(top.topSurface)?top.topSurface:bounds.max.y,midZ=Number.isFinite(top.zOffset)?top.zOffset:(bounds.min.z+bounds.max.z)/2,rearZ=midZ-depth/2,frontZ=midZ+depth/2,leftX=-width/2,rightX=width/2;
 const point=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),centre=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();
 for(const {mesh,transform}of meshes){
  const geometry=mesh.geometry;
  // The same BufferGeometry remains in buildAnimaTop's disposal registry. A
  // chart boundary may split a shared vertex; replacing mesh.geometry would
  // otherwise leave the replacement GPU buffers outside that registry.
  if(geometry.index){const split=geometry.toNonIndexed();geometry.dispose();geometry.copy(split);split.dispose();}
  const p=geometry.attributes.position;let uv=geometry.attributes.uv;
  if(!uv){uv=new T.Float32BufferAttribute(new Float32Array(p.count*2),2);geometry.setAttribute('uv',uv);}
  const role=mesh.userData.animaSurfaceRole,chartCounts={deck:0,front:0,side:0,basinWall:0};
  for(let i=0;i<p.count;i+=3){
   a.fromBufferAttribute(p,i).applyMatrix4(transform);b.fromBufferAttribute(p,i+1).applyMatrix4(transform);c.fromBufferAttribute(p,i+2).applyMatrix4(transform);normal.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a));centre.copy(a).add(b).add(c).multiplyScalar(1/3);
   const axis=Math.abs(normal.y)>=Math.max(Math.abs(normal.x),Math.abs(normal.z))?'y':Math.abs(normal.x)>Math.abs(normal.z)?'x':'z';
   const well=(top.wells||[]).filter(well=>(['bowl','basin-floor'].includes(role)||normal.x*(centre.x-well.x)+normal.z*(centre.z-well.z)<0)&&Math.abs(centre.x-well.x)<=well.width/2+.015&&Math.abs(centre.z-well.z)<=well.depth/2+.015).sort((x,y)=>Math.hypot(centre.x-x.x,centre.z-x.z)-Math.hypot(centre.x-y.x,centre.z-y.z))[0];
   if(axis==='y')chartCounts.deck++;else if(well)chartCounts.basinWall++;else chartCounts[axis==='x'?'side':'front']++;
   const sign=axis==='x'?(centre.x>=(well?.x??0)?1:-1):(centre.z>=(well?.z??midZ)?1:-1);
   for(let j=0;j<3;j++){
    point.copy(j===0?a:j===1?b:c);let x=point.x,z=point.z;
    if(axis==='x'){if(well){const power=well.power||24,along=Math.min(1,Math.abs(point.z-well.z)/(well.depth/2)),rim=well.x+sign*well.width/2*Math.pow(Math.max(0,1-Math.pow(along,power)),1/power);x=rim+sign*Math.hypot(topY-point.y,rim-point.x);}else x=(sign>0?rightX:leftX)+sign*(topY-point.y);}
    else if(axis==='z'){if(well){const power=well.power||24,along=Math.min(1,Math.abs(point.x-well.x)/(well.width/2)),rim=well.z+sign*well.depth/2*Math.pow(Math.max(0,1-Math.pow(along,power)),1/power);z=rim+sign*Math.hypot(topY-point.y,rim-point.z);}else z=(sign>0?frontZ:rearZ)+sign*(topY-point.y);}
    uv.setXY(i+j,x/scaleX+.5,(z-rearZ)/scaleZ);
   }
  }
  uv.needsUpdate=true;geometry.userData.animaSurfaceUV=MAPPING_MODE;geometry.userData.animaSurfaceCharts=chartCounts;
 }
 material.userData.animaSurfaceMapping={mode:MAPPING_MODE,...scale};
 root.userData.animaSurfaceUV={mode:MAPPING_MODE,width,depth,physicalSize:[...scale.size],scaleStatus:scale.status,sourcePixels:scale.pixels||null,approximate:scale.approximate===true,anchor:'plan-local-centre-x-rear-edge-z',sourceLayout:'fixed-density-image-aspect',verticalFaces:'unfolded-from-top-edge',basinWalls:'unfolded-from-own-rim',panelSeams:'manufactured-corners-and-floor-junctions'};
}

// A plan owns its material and texture clones. Furniture finish changes and
// basin colour changes cannot repaint a separate Fenix/HPL/stone worktop.
export function createTopSurfaceController({wood,ceramic,textureLoader=null}={}){
 const material=new T.MeshPhysicalMaterial({color:'#f6f5f1',metalness:0,roughness:.62,clearcoat:0});
 const owned=new Set(),cache=new Map(),loaded=new Map();let revision=0,disposed=false,current=null,pending=Promise.resolve();
 function release(){for(const texture of owned)texture.dispose();owned.clear();cache.clear();loaded.clear();currentRootByMaterial.delete(material);}
 const onDispose=()=>{disposed=true;revision++;release();};material.addEventListener('dispose',onDispose);
 function load(url){
  if(cache.has(url)){const value=cache.get(url);cache.delete(url);cache.set(url,value);return value;}
  const loader=textureLoader||new T.TextureLoader();
  const promise=loader.loadAsync(url).then(source=>{const texture=source.clone();texture.userData={...source.userData,animaSurfaceURL:url,animaMapping:MAPPING_MODE};owned.add(texture);if(textureLoader==null)source.dispose();configureAnimaTexture(texture,null);texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;texture.repeat.set(1,1);texture.offset.set(0,0);texture.center.set(0,0);texture.rotation=0;if(disposed||!cache.has(url)){texture.dispose();owned.delete(texture);}else loaded.set(url,texture);return texture;});
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
  material.userData.animaSurface={id:surface.id,family:current.family,code:surface.code,source:surface.source,physicalSize:surface.physicalSize,ncsCode:current.ncsCode};material.userData.animaSurfaceMapping={mode:MAPPING_MODE,...scaleForMaterial(material)};material.needsUpdate=true;
  const officialUniform=current.family==='fenix'&&surface.colorSource==='manufacturer field_background_color';
  material.userData.animaSurface.colourIdentity=officialUniform?'manufacturer-rgb':'manufacturer-texture';
  if(surface.texture&&!officialUniform&&(textureLoader||typeof document!=='undefined'))pending=load(surface.texture).then(texture=>{
   if(disposed||ticket!==revision)return material;
   material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;const root=currentRootByMaterial.get(material);if(root)applyPlanSurfaceUV(root,material);onReady?.();return material;
  }).catch(()=>material);
  else pending=Promise.resolve(material);
  return current;
 }
 return {material,apply,get current(){return current;},ready:()=>pending,dispose(){if(!disposed)material.dispose();}};
}
