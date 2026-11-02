import * as T from 'three';

export function configureAnimaTexture(texture,renderer,{colour=true}={}){
 if(!texture)return texture;
 texture.colorSpace=colour?T.SRGBColorSpace:T.NoColorSpace;
 texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;
 texture.anisotropy=Math.max(1,Math.min(16,renderer?.capabilities?.getMaxAnisotropy?.()||8));
 texture.needsUpdate=true;return texture;
}
export function configureAnimaRendering(renderer,scene){
 if(!renderer)return;
 renderer.shadowMap.type=T.PCFSoftShadowMap;
 // Retain Studio One's colour pipeline and exposure. Softer material response
 // comes from the source finishes, with filtered maps and analytic rib normals.
 if(scene&&Number.isFinite(scene.environmentIntensity))scene.environmentIntensity=Math.max(.45,Math.min(.9,scene.environmentIntensity));
}
export function applyAnimaBasinAppearance(material,appearance={}){
 if(!material||appearance.ceramic===false)return;
 if(appearance.hex)material.color.set(appearance.hex);
 material.roughness=appearance.roughness??.56;material.clearcoat=appearance.clearcoat??0;material.clearcoatRoughness=appearance.clearcoatRoughness??.18;
 material.metalness=appearance.metalness??0;material.transmission=appearance.transmission??0;material.thickness=appearance.thickness??.006;
 material.ior=appearance.ior??1.49;material.opacity=appearance.opacity??1;material.transparent=appearance.transparent??false;
 material.attenuationDistance=appearance.attenuationDistance??Infinity;material.attenuationColor.set(appearance.attenuationColor||'#ffffff');
 material.userData.animaBasinAppearance={id:appearance.id,source:appearance.colorSource||appearance.source,colorAccuracy:appearance.colorAccuracy};material.needsUpdate=true;
}
export function setAnimaFurnitureTextures(asset,type,finish,tx,renderer){
 const ribelle=asset.spec?.facade==='RIBELLE';
 asset.furniturePlanTextures=tx?{map:tx.front,bump:tx.frontBump}:null;
 for(const [material,front]of[[asset.wood,false],[asset.frontWood,['cabinet','column'].includes(type)]]){
  if(!material)continue;
  const map=tx?(front?(ribelle?tx.ribelleFront||tx.front:tx.front):tx.map):null;
  const bump=tx?(front?(ribelle?tx.ribelleFrontBump||tx.frontBump:tx.frontBump):tx.bump):null;
  material.color.set(map?'#ffffff':finish.hex);material.map=configureAnimaTexture(map,renderer);material.bumpMap=configureAnimaTexture(bump,renderer,{colour:false});
  for(const texture of[material.map,material.bumpMap])if(texture)texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;
  material.bumpScale=finish.bumpScale??.000025;material.roughness=finish.roughness??.68;
  material.clearcoat=finish.clearcoat??0;material.clearcoatRoughness=finish.clearcoatRoughness??.68;
  material.metalness=0;material.flatShading=false;material.needsUpdate=true;
 }
}
