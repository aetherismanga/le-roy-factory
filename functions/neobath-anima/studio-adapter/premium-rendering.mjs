import * as T from 'three';

export function cropAnimaWoodFrontTexture(texture,{canvasFactory}={}){
 const image=texture?.image,width=image?.width,height=image?.height;
 if(!(width>0&&height>8)||texture.userData?.animaWoodCrop)return texture;
 // The sourced 495×170 Pura sample includes the photographed top-edge shadow
 // in its first eight rows. Mirrored wrapping otherwise reproduces that edge
 // as a false horizontal joint. Copy the remaining source pixels 1:1; never
 // sharpen, recolour, upscale or alter the public manufacturer photograph.
 const inset=Math.max(1,Math.ceil(8*height/170)),croppedHeight=height-inset;
 const canvas=canvasFactory?canvasFactory():typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(width,croppedHeight):typeof document!=='undefined'&&document.createElement?document.createElement('canvas'):null;
 if(!canvas)return texture;
 canvas.width=width;canvas.height=croppedHeight;const context=canvas.getContext?.('2d');if(!context)return texture;
 context.drawImage(image,0,inset,width,croppedHeight,0,0,width,croppedHeight);
 // A clone initially shares its Source with the cached original: replace the
 // Source itself so this inset cannot crop Ribelle or any other map in place.
 texture.source=new T.Source(canvas);texture.userData={...texture.userData,animaWoodCrop:{sourceWidth:width,sourceHeight:height,x:0,y:inset,width,height:croppedHeight,resampled:false}};
 texture.needsUpdate=true;return texture;
}

export function configureAnimaTexture(texture,renderer,{colour=true,singleSheet=false}={}){
 if(!texture)return texture;
 texture.colorSpace=colour?T.SRGBColorSpace:T.NoColorSpace;
 texture.wrapS=texture.wrapT=singleSheet?T.ClampToEdgeWrapping:T.RepeatWrapping;
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
 if(finish.textureMapped===false)tx=null;
 asset.furniturePlanTextures=tx?{map:tx.front,bump:tx.frontBump}:null;
 for(const [material,front]of[[asset.wood,false],[asset.frontWood,['cabinet','column'].includes(type)]]){
  if(!material)continue;
  const map=tx?(front?(ribelle?tx.ribelleFront||tx.front:tx.front):tx.map):null;
  const bump=tx?(front?(ribelle?tx.ribelleFrontBump||tx.frontBump:tx.frontBump):tx.bump):null;
  material.color.set(map?'#ffffff':finish.hex);material.map=configureAnimaTexture(map,renderer);material.bumpMap=configureAnimaTexture(bump,renderer,{colour:false});
  for(const texture of[material.map,material.bumpMap])if(texture)texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;
  material.bumpScale=bump?(finish.bumpScale??.000025):0;material.roughness=finish.roughness??.68;
  material.clearcoat=finish.clearcoat??0;material.clearcoatRoughness=finish.clearcoatRoughness??.68;
  material.metalness=0;material.flatShading=false;material.userData.animaColourIdentity=finish.colourIdentity;material.needsUpdate=true;
 }
}
