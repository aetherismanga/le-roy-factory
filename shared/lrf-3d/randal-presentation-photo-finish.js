import {Vector2,Vector4} from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {DenoiseMaterial} from 'three-gpu-pathtracer/src/materials/fullscreen/DenoiseMaterial.js';

// The pinned tracer accumulates linear HDR radiance. Its bilateral denoiser
// preserves colour edges and performs the same tone mapping/output conversion
// as the native path-tracer canvas pass. Filtering an already converted PNG
// would both lose radiance and apply the conversion twice.
export function createPresentationPhotoFinish({renderer,canvas,createMaterial=()=>new DenoiseMaterial({sigma:2.5,kSigma:1,threshold:.1}),createQuad=material=>new FullScreenQuad(material),captureTimeoutMs=10000}={}){
 let disposed=false,material=null,quad=null,pendingCapture=null;
 async function finish({target,samples,onStage=()=>{},isCurrent=()=>true}={}){
  if(disposed||!isCurrent())return null;
  if(!target?.texture||!(target.width>0&&target.height>0))throw Error('Le rendu photo ne contient pas d’image finale.');
  if(typeof canvas.toBlob!=='function')throw Error('La capture PNG n’est pas disponible sur cet appareil.');
  onStage('denoising');
  if(disposed||!isCurrent())return null;
  material||=createMaterial();quad||=createQuad(material);material.map=target.texture;
  const previous={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new Vector4()),scissor:renderer.getScissor(new Vector4()),scissorTest:renderer.getScissorTest(),autoClear:renderer.autoClear};
  let capture;
  try{
   // Always draw to the entire visible framebuffer, even when the last sample
   // used a tiled/scissored render target. Start PNG encoding synchronously in
   // this frame: preserveDrawingBuffer=false must not capture a later frame.
   const size=renderer.getSize(new Vector2());
   renderer.setRenderTarget(null);renderer.setViewport(0,0,size.x,size.y);renderer.setScissorTest(false);renderer.autoClear=true;
   quad.render(renderer);
   if(disposed||!isCurrent())return null;
   onStage('capturing');
   if(disposed||!isCurrent())return null;
   capture=new Promise((resolve,reject)=>{
    let settled=false;
    const settle=(blob,error)=>{if(settled)return;settled=true;clearTimeout(timeout);pendingCapture=null;if(error)reject(error);else resolve(blob);};
    const timeout=setTimeout(()=>settle(null,Error('La capture PNG a dépassé le délai disponible.')),captureTimeoutMs);
    pendingCapture=()=>settle(null);
    try{canvas.toBlob(blob=>{if(blob?.size)settle(blob);else settle(null,Error('La capture PNG est vide.'));},'image/png');}
    catch(error){settle(null,error);}
   });
  }finally{
   renderer.setRenderTarget(previous.target);renderer.setViewport(previous.viewport);renderer.setScissor(previous.scissor);renderer.setScissorTest(previous.scissorTest);renderer.autoClear=previous.autoClear;
  }
  const blob=await capture;if(!blob||disposed||!isCurrent())return null;
  return {blob,width:canvas.width,height:canvas.height,nativeWidth:target.width,nativeHeight:target.height,samples,denoised:true,denoiser:'edge-preserving-bilateral',filename:'composition-randal.png',createdAt:new Date().toISOString()};
 }
 return {finish,dispose(){if(disposed)return;disposed=true;pendingCapture?.();quad?.dispose();material?.dispose();quad=material=null;}};
}
