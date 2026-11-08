import {LinearFilter,LinearMipmapLinearFilter,SRGBColorSpace} from 'three';

// Preserve the manufacturer's native detail in the restricted presentation.
// A colour photograph is not a measured height field: no bump is synthesized.
export function preparePresentationFinish(texture,renderer){
 const image=texture.image,w=image?.naturalWidth||image?.width,h=image?.naturalHeight||image?.height;
 const limit=Math.min(4096,renderer.capabilities.maxTextureSize||4096);
 if(w>0&&h>0){
  texture.userData.presentationSourceSize=[w,h];
  if(Math.max(w,h)>limit){
   const scale=limit/Math.max(w,h),sample=document.createElement('canvas');sample.width=Math.max(1,Math.round(w*scale));sample.height=Math.max(1,Math.round(h*scale));
   const context=sample.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,sample.width,sample.height);texture.image=sample;
  }
 }
 texture.colorSpace=SRGBColorSpace;texture.magFilter=LinearFilter;texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;
 texture.anisotropy=Math.min(16,Math.max(1,renderer.capabilities.getMaxAnisotropy()));texture.needsUpdate=true;return texture;
}
