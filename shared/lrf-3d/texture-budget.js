// Editing derivatives are resampled in memory. Original manufacturer files are never changed.
export const TEXTURE_LIMITS=Object.freeze({fluid:512,balanced:1024,max:4096});
export function textureLimit(profile,renderer){
 const deviceLimit=renderer?.capabilities?.maxTextureSize||4096;
 return Math.min(deviceLimit,TEXTURE_LIMITS[profile]||TEXTURE_LIMITS.balanced);
}
