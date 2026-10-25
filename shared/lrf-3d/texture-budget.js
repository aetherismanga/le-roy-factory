// Editing derivatives are resampled in memory. Original manufacturer files are never changed.
export const TEXTURE_LIMITS=Object.freeze({fluid:512,balanced:1024,max:4096});
// Working native-face sets stay small even when an exact SKU offers dozens of
// faces. Capture explicitly requests all native max faces and original detail.
export const SURFACE_FACE_LIMITS=Object.freeze({fluid:4,balanced:6,max:40});
export function surfaceFaceLimit(profile,{mobile=false,export:exporting=false}={}){return exporting?40:mobile&&profile==='max'?8:SURFACE_FACE_LIMITS[profile]||SURFACE_FACE_LIMITS.balanced;}
export function textureLimit(profile,renderer){
 const deviceLimit=renderer?.capabilities?.maxTextureSize||4096;
 return Math.min(deviceLimit,TEXTURE_LIMITS[profile]||TEXTURE_LIMITS.balanced);
}
