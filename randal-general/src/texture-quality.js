import {LinearFilter,LinearMipmapLinearFilter} from 'three';
export function textureLimit(profile,renderer){return Math.min(renderer?.capabilities?.maxTextureSize||4096,profile==='fluid'?256:profile==='balanced'?1024:4096);}
// Resampling never changes colour space, white balance, grain direction or UVs.
export function fitTexture(texture,profile,renderer){
 const limit=textureLimit(profile,renderer),image=texture.image;
 if(image&&Math.max(image.width,image.height)>limit){const scale=limit/Math.max(image.width,image.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);texture.image=canvas;}
 texture.anisotropy=Math.min(profile==='fluid'?1:profile==='balanced'?8:16,renderer?.capabilities?.getMaxAnisotropy?.()||1);texture.magFilter=LinearFilter;texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;texture.userData.qualityProfile=profile;return texture;
}
export function disposeTextures(bundle){const seen=new Set();function dispose(value){if(!value||seen.has(value))return;if(typeof value==='object')seen.add(value);if(value.isTexture)value.dispose();else if(Array.isArray(value))value.forEach(dispose);else if(typeof value==='object')Object.values(value).forEach(dispose);}dispose(bundle);}
