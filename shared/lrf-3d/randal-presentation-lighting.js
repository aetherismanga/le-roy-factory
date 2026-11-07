import * as T from 'three';
import {applyMirrorLighting} from './mirror-lighting.js';

// Presentation-only lighting recipe. The existing workshop recipe is kept.
// LED strips are emissive physical surfaces, also usable by the path tracer.
export function applyPresentationMirrorLighting(item){
 const group=applyMirrorLighting(item,false);if(!group)return;
 const halo=group.getObjectByName('Halo_mural_LED');
 if(halo){
  halo.userData.presentationRasterOnly=true;
  halo.material.uniforms.tint.value.set('#fff3e0');
  if(!halo.material.userData.presentationSoftened){
   halo.material.fragmentShader=halo.material.fragmentShader.replace('vec4(tint,a)','vec4(tint,a*.22)');
   halo.material.userData.presentationSoftened=true;halo.material.needsUpdate=true;
  }
 }
 const back=group.getObjectByName('Retro_eclairage'),front=group.getObjectByName('Eclairage_visage');
 if(back){back.color.set('#fff1dd');back.intensity=3.2;}
 if(front){front.color.set('#fff5e7');front.intensity=.8;}
 const ring=item.asset.root.getObjectByName('Anneau_LED'),replacements=new Map();
 ring?.traverse(object=>{
  if(!object.isMesh)return;const previous=object.material;
  if(!previous.isMeshPhysicalMaterial){
   if(!replacements.has(previous))replacements.set(previous,new T.MeshPhysicalMaterial({color:'#f6f4ee',roughness:.34,metalness:0,emissive:'#fff1dc',emissiveIntensity:2.5,toneMapped:true}));
   object.material=replacements.get(previous);
  }
  object.material.color.set('#f6f4ee');object.material.emissive.set('#fff1dc');object.material.emissiveIntensity=2.5;
 });
 for(const material of replacements.keys())material.dispose();
 return group;
}
