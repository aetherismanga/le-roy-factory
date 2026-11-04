// Keep the manufacturer's textures and canonical material properties untouched.
// The editing shader omits the extra clearcoat layer and background bump sampling;
// furniture keeps its sourced bump detail as well as its geometric relief.
// base colour, normal maps, metal, roughness and environment reflections remain.
// Three r180 emits these defines before the onBeforeCompile shader source.
const LIGHTWEIGHT_MACROS = [
 '#undef USE_CLEARCOAT',
 '#undef USE_CLEARCOATMAP',
 '#undef USE_CLEARCOAT_NORMALMAP',
 '#undef USE_CLEARCOAT_ROUGHNESSMAP',
 ];
const lightweightShader=material=>[...LIGHTWEIGHT_MACROS,...(material.userData?.lrfFurnitureDetail?[]:['#undef USE_BUMPMAP']),''].join('\n');

export function createLightweightMaterials(){
 const active=new Map();
 function restoreMaterial(material,entry){
  let changed=false;
  if(material.onBeforeCompile===entry.compile){material.onBeforeCompile=entry.originalCompile;changed=true;}
  if(material.customProgramCacheKey===entry.key){material.customProgramCacheKey=entry.originalKey;changed=true;}
  material.removeEventListener('dispose',entry.dispose);
  active.delete(material);
  if(changed)material.needsUpdate=true;
 }
 function simplify(material){
  if(!material?.isMeshStandardMaterial)return;
  const previous=active.get(material);
  if(previous&&material.onBeforeCompile===previous.compile&&material.customProgramCacheKey===previous.key)return;
  // A later custom shader hook must remain part of the lightweight variant.
  const originalCompile=material.onBeforeCompile===previous?.compile?previous.originalCompile:material.onBeforeCompile;
  const originalKey=material.customProgramCacheKey===previous?.key?previous.originalKey:material.customProgramCacheKey;
  if(previous)material.removeEventListener('dispose',previous.dispose);
  const entry={originalCompile,originalKey};
  entry.compile=function(shader,renderer){
   const result=originalCompile.call(this,shader,renderer);
   const prefix=lightweightShader(material);
   shader.vertexShader=prefix+shader.vertexShader;
   shader.fragmentShader=prefix+shader.fragmentShader;
   return result;
  };
  entry.key=function(){return originalKey.call(this)+'|lrf-lightweight-v1|'+(material.userData?.lrfFurnitureDetail?'furniture-bump|':'')+originalCompile.toString();};
  entry.dispose=()=>restoreMaterial(material,entry);
  active.set(material,entry);
  material.onBeforeCompile=entry.compile;
  material.customProgramCacheKey=entry.key;
  material.addEventListener('dispose',entry.dispose);
  material.needsUpdate=true;
 }
 function restore(){for(const [material,entry]of active)restoreMaterial(material,entry);}
 return {
  apply(scene,lightweight){
   if(!lightweight){restore();return;}
   scene?.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material])simplify(material);});
  },
  restore,
  diagnostics:()=>({materials:active.size})
 };
}
