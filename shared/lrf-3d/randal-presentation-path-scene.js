import * as T from 'three';

// Capture the genuine visible composition. The raster reflector's screen-space
// shader is replaced by the same physical reflecting surface for traced rays.
// All original materials, textures and geometry remain owned by the live view.
export function createPathTracingScene(source,{environment=null}={}){
 source.updateMatrixWorld(true);
 const scene=new T.Scene(),materials=new Map(),ownedMaterials=new Set(),geometries=new Set(),textures=new Set();
 scene.background=source.background?.isColor?source.background.clone():source.background;
 scene.environment=environment;scene.environmentIntensity=source.environmentIntensity??1;
 scene.backgroundIntensity=source.backgroundIntensity??1;scene.environmentRotation.copy(source.environmentRotation);scene.backgroundRotation.copy(source.backgroundRotation);
 const stats={meshes:0,triangles:0,textureSources:0,mirrors:0,lights:0};
 function inLED(object){for(let parent=object;parent;parent=parent.parent)if(/Anneau_LED|Bande_LED|Ruban_LED/.test(parent.name))return true;return false;}
 function materialFor(original,object){
  if(object.isReflector){const material=new T.MeshPhysicalMaterial({color:'#ffffff',metalness:1,roughness:.012,side:T.FrontSide});material.name='Miroir · réflexion physique';ownedMaterials.add(material);return material;}
  if(materials.has(original))return materials.get(original);
  let material;
  if(original.isMeshBasicMaterial){material=new T.MeshPhysicalMaterial({color:original.color,roughness:.82,map:original.map,side:original.side,transparent:original.transparent,opacity:original.opacity});if(inLED(object)){material.emissive.copy(original.color);material.emissiveIntensity=2.2;material.color.set('#ffffff');}}
  else if(original.isShaderMaterial){material=new T.MeshPhysicalMaterial({transparent:true,opacity:0,depthWrite:false});}
  else material=original.clone();
  material.name=original.name;ownedMaterials.add(material);materials.set(original,material);
  for(const value of Object.values(material))if(value?.isTexture)textures.add(value.source.uuid+':'+value.colorSpace);
  return material;
 }
 source.traverseVisible(object=>{
  if(object.isMesh){
   const originals=Array.isArray(object.material)?object.material:[object.material];
   if(object.userData.presentationRasterOnly||!object.geometry?.attributes.position||!originals.length||!object.isReflector&&originals.every(m=>m?.isShaderMaterial||!m||m.visible===false))return;
   const geometry=object.geometry.clone();geometries.add(geometry);
   const materials=originals.map(m=>materialFor(m,object)),mesh=new T.Mesh(geometry,Array.isArray(object.material)?materials:materials[0]);
   mesh.name=object.name;mesh.matrix.copy(object.matrixWorld);mesh.matrixAutoUpdate=false;mesh.castShadow=object.castShadow;mesh.receiveShadow=object.receiveShadow;scene.add(mesh);
   stats.meshes++;stats.triangles+=(geometry.index?.count||geometry.attributes.position.count)/3;if(object.isReflector)stats.mirrors++;
  }else if(object.isRectAreaLight||object.isDirectionalLight||object.isPointLight||object.isSpotLight){
   const light=object.clone(false);light.matrix.copy(object.matrixWorld);light.matrixAutoUpdate=false;scene.add(light);
   if(object.target){light.target=new T.Object3D();light.target.position.setFromMatrixPosition(object.target.matrixWorld);scene.add(light.target);}
   stats.lights++;
  }
 });
 stats.textureSources=textures.size;scene.updateMatrixWorld(true);
 let disposed=false;
 return {scene,stats,dispose(){if(disposed)return;disposed=true;for(const geometry of geometries)geometry.dispose();for(const material of ownedMaterials)material.dispose();scene.clear();}};
}
