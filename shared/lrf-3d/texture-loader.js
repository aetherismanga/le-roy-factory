import {Texture} from 'three';
import {runTextureTask,textureAbortError} from './texture-queue.mjs';

export const isTextureAbort=error=>error?.name==='AbortError';

// Keep download, decode and resampling in the same queue slot. The previous
// TextureLoader slot ended before the caller resized the full decoded image;
// timeout only rejected the Promise and left its network/decode work alive.
export function loadQueuedTexture(url,{timeout=45000,signal,maxDimension=Infinity}={}){
 return runTextureTask(async()=>{
  const controller=new AbortController(),cancel=()=>controller.abort(textureAbortError(signal));
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();
  const timer=setTimeout(()=>controller.abort(Object.assign(Error('Délai de chargement de la texture dépassé. Réessayez.'),{name:'TimeoutError'})),timeout);
  let objectURL,image;
  try{
   const response=await fetch(url,{signal:controller.signal,mode:'cors',credentials:'omit'});
   if(!response.ok)throw Error('Image fabricant indisponible (HTTP '+response.status+').');
   const blob=await response.blob();
   if(controller.signal.aborted)throw textureAbortError(controller.signal);
   objectURL=URL.createObjectURL(blob);image=new Image();
   await new Promise((resolve,reject)=>{
    const abort=()=>{image.removeAttribute('src');reject(textureAbortError(controller.signal));};
    const cleanup=()=>{image.onload=image.onerror=null;controller.signal.removeEventListener('abort',abort);};
    image.onload=()=>{cleanup();resolve();};image.onerror=()=>{cleanup();reject(Error('Image fabricant illisible.'));};
    controller.signal.addEventListener('abort',abort,{once:true});
    if(controller.signal.aborted){cleanup();abort();return;}image.src=objectURL;
   });
   if(controller.signal.aborted)throw textureAbortError(controller.signal);
   const sourceDimensions=[image.naturalWidth,image.naturalHeight];let fitted=image;const edge=Math.max(...sourceDimensions),limit=Number(maxDimension);
   if(limit>0&&edge>limit){const scale=limit/edge,canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)throw Error('Redimensionnement de la matière indisponible.');context.drawImage(image,0,0,canvas.width,canvas.height);fitted=canvas;image.removeAttribute('src');}
   const texture=new Texture(fitted);texture.needsUpdate=true;texture.userData.sourceDimensions=sourceDimensions;if(fitted===image)texture.addEventListener('dispose',()=>image.removeAttribute('src'));return texture;
  }catch(error){image?.removeAttribute('src');throw controller.signal.aborted?textureAbortError(controller.signal):error;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);if(objectURL)URL.revokeObjectURL(objectURL);}
 },{signal});
}

export function surfaceAssetURL(file){
 const value=String(file||'');
 if(value.startsWith('https://eliosceramica.com/'))return '/manufacturer-materials/elios/'+value.slice('https://eliosceramica.com/'.length);
 if(value.startsWith('/assets/img/lrf-plan-pose/faces/'))return 'https://leroyfactory.fr'+value;
 if(/^(shell|creta)-[^/]+\.webp$/.test(value)||value.startsWith('elios-restored/'))return 'https://leroyfactory.fr/review-studio/assets/'+value;
 return /^(https?:|data:|blob:)/.test(value)?value:'assets/'+value;
}
