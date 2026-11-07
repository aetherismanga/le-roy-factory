import * as T from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {WebGLPathTracer} from 'three-gpu-pathtracer/src/core/WebGLPathTracer.js';
import {GradientEquirectTexture} from 'three-gpu-pathtracer/src/textures/GradientEquirectTexture.js';
import {PresentationBVHWorker} from './randal-presentation-bvh.js';
import {createPathTracingScene} from './randal-presentation-path-scene.js';
import {createPresentationPhotoFinish} from './randal-presentation-photo-finish.js';
export {progressivePresentationPolicy} from './randal-presentation-path-policy.js';

// Version-pinned cleanup: 0.0.24's public dispose omits its unused low-resolution
// renderer, BVH geometry and uniform-owned GPU textures. Source maps belong to
// the live preview and must never be disposed here.
export function disposePinnedPathTracer(path){
 if(!path)return;
 const resources=new Set(),materials=new Set();
 for(const pass of [path._pathTracer,path._lowResPathTracer])if(pass){
  const material=pass.material;if(material&&!materials.has(material)){materials.add(material);for(const [key,uniform]of Object.entries(material.uniforms||{}))if(key!=='backgroundMap'&&uniform.value?.dispose)resources.add(uniform.value);}
  if(pass._blendQuad?.material)materials.add(pass._blendQuad.material);
 }
 path.dispose();path._lowResPathTracer?.dispose();path._generator?.geometry?.dispose();path._colorBackground?.dispose();path._internalBackground?.dispose();
 for(const resource of resources)resource.dispose();for(const material of materials)material.dispose();
}

async function loadStudioEnvironment(signal){
 const controller=new AbortController(),cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
 const timeout=setTimeout(cancel,20000);
 try{
  const response=await fetch(new URL('assets/randal-presentation/studio.hdr',document.baseURI),{signal:controller.signal,credentials:'same-origin'});
  if(!response.ok)throw Error('HDR indisponible');
  const buffer=await response.arrayBuffer();if(signal.aborted)throw Error('Affichage fermé.');
  const parsed=new HDRLoader().parse(buffer),texture=new T.DataTexture(parsed.data,parsed.width,parsed.height,T.RGBAFormat,parsed.type);
  texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.LinearSRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.flipY=true;texture.needsUpdate=true;return texture;
 }finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);}
}

export function createProgressivePresentation({renderer,scene,camera,canvas,policy,onStatus=()=>{},onFallback=()=>{},onRestoreRaster=()=>{},onPhotoCapture=()=>{},createPathTracer=r=>new WebGLPathTracer(r),createBVHWorker=()=>new PresentationBVHWorker(),createPhotoFinish=options=>createPresentationPhotoFinish(options),loadEnvironment=loadStudioEnvironment,clock=()=>performance.now(),scheduleFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id)}){
 let disposed=false,active=true,revision=0,job=null,phase='idle',environmentSource='not-loaded',lastStatusTime=-Infinity,lastMode='',failureReason=null,latestCapture=null,lastSamples=0;
 const pointers=new Set();
 const current=work=>!disposed&&active&&job===work&&work.id===revision;
 function status(mode,message,samples=job?.samples||lastSamples){
  const time=clock();if(mode===lastMode&&time-lastStatusTime<500&&!['ready','fallback','incomplete','cancelled'].includes(mode))return;
  phase=lastMode=mode;lastStatusTime=time;onStatus({mode,message,samples,maxSamples:policy.maxSamples,available:true,engine:'three-gpu-pathtracer',engineVersion:'0.0.24',environment:environmentSource,reason:failureReason});
 }
 function release(work){
  if(!work||work.released)return;work.released=true;work.abort.abort();if(work.frame!==null)cancelFrame(work.frame);work.frame=null;
  work.worker?.dispose();work.worker=null;disposePinnedPathTracer(work.path);work.path=null;work.snapshot?.dispose();work.snapshot=null;work.environment?.dispose();work.environment=null;work.finish?.dispose();work.finish=null;
 }
 function cancel({mode='cancelled',restore=true}={}){
  if(disposed)return;const work=job,hadPhoto=!!work||phase==='ready';revision++;job=null;release(work);
  if(hadPhoto){status(mode,mode==='interactive'?'Aperçu interactif · cliquez sur « Rendu photo » pour calculer une nouvelle image.':'Calcul photo annulé · aperçu interactif.',work?.samples||lastSamples);if(restore&&active)onRestoreRaster();}
 }
 function changed(){cancel({mode:'interactive',restore:false});}
 function fail(work,error){
  if(!current(work))return;failureReason=error?.message||'Photo indisponible';lastSamples=work.samples;job=null;revision++;release(work);
  const incomplete=error?.code==='incomplete';status(incomplete?'incomplete':'fallback',incomplete?'Calcul photo interrompu avant la qualité finale · relancez le rendu.':'Aperçu interactif · le calcul photo n’a pas pu être terminé.',lastSamples);onFallback(error);onRestoreRaster();
 }
 function incomplete(message){const error=Error(message);error.code='incomplete';return error;}
 async function start(){
  if(disposed||!active||pointers.size)return false;
  cancel({restore:false});failureReason=null;lastSamples=0;environmentSource='loading';
  const work={id:++revision,abort:new AbortController(),frame:null,path:null,worker:null,snapshot:null,environment:null,finish:null,released:false,samples:0,building:true,started:0,slow:0,lastSample:-1};job=work;
  status('requested','Rendu photo demandé · préparation de la lumière…',0);
  try{
   let environment;
   try{environment=await loadEnvironment(work.abort.signal);if(current(work))environmentSource='studio-hdr';}
   catch(error){if(!current(work)||work.abort.signal.aborted)throw error;environmentSource='gradient-fallback';environment=new GradientEquirectTexture(128);environment.topColor.set('#d8e1e7');environment.bottomColor.set('#55534e');environment.update();}
   if(!current(work)){environment?.dispose();return false;}work.environment=environment;
   status('preparing','Préparation du rendu photo…',0);
   const path=work.path=createPathTracer(renderer);work.worker=createBVHWorker();path.setBVHWorker(work.worker);path.bounces=policy.bounces;path.transmissiveBounces=4;path.filterGlossyFactor=.45;path.multipleImportanceSampling=true;path.tiles.set(policy.tiles,policy.tiles);path.textureSize.set(policy.textureSize,policy.textureSize);path.rasterizeScene=false;path.dynamicLowRes=false;path.renderDelay=0;path.minSamples=2;path.fadeDuration=0;
   // The native asynchronous compile must report failure without keeping a
   // rejected promise alive after a cancelled/closed presentation.
   for(const pass of [path._pathTracer,path._lowResPathTracer])if(pass?.compileMaterial){const compile=pass.compileMaterial.bind(pass);pass.compileMaterial=(...args)=>Promise.resolve(compile(...args)).catch(error=>fail(work,error));}
   work.snapshot=createPathTracingScene(scene,{environment});
   if(work.snapshot.stats.triangles>policy.maxTriangles||work.snapshot.stats.textureSources>policy.maxTextureSources)throw Error('La composition dépasse le budget du rendu photo.');
   const textureSize=work.snapshot.stats.textureSources>24?Math.min(512,policy.textureSize):policy.textureSize;path.textureSize.set(textureSize,textureSize);
   const size=renderer.getDrawingBufferSize(new T.Vector2());path.renderScale=Math.min(1,Math.sqrt(policy.pixels/Math.max(1,size.x*size.y)));
   // 0.0.24 compares unchanged material lists through an undeclared `length`.
   // Regenerate indices for this complete immutable presentation snapshot.
   if(path._generator)path._generator._materialUuids=null;
   await path.setSceneAsync(work.snapshot.scene,camera,{onProgress:value=>{if(current(work))status('preparing','Préparation du rendu photo · '+Math.round(value*100)+' %',0);}});
   if(!current(work))return false;work.building=false;work.started=clock();work.frame=scheduleFrame(()=>sample(work));return true;
  }catch(error){if(current(work))fail(work,error);return false;}
 }
 async function complete(work){
  if(!current(work))return;
  try{
   work.finish=createPhotoFinish({renderer,canvas});
   const capture=await work.finish.finish({target:work.path.target,samples:work.samples,isCurrent:()=>current(work),onStage:mode=>{if(current(work))status(mode,mode==='denoising'?'Réduction du bruit · conservation des détails…':'Capture automatique de l’image finale…',work.samples);}});
   if(!current(work)||!capture)return;
   latestCapture=capture;lastSamples=work.samples;
   // The PNG is available before any UI can call the image ready. It contains
   // the denoised, tone-mapped frame, not a later interactive redraw.
   onPhotoCapture(capture);if(!current(work))return;
   status('ready','Rendu photo terminé · capture enregistrée.',work.samples);job=null;release(work);
  }catch(error){fail(work,error);}
 }
 function sample(work){
  work.frame=null;if(!current(work)||pointers.size)return;
  try{
   const before=clock();work.path.renderSample();const duration=clock()-before;
   work.samples=Math.floor(work.path.samples);lastSamples=work.samples;
   work.slow=duration>(policy.maxTileMs||500)?work.slow+1:Math.max(0,work.slow-1);
   if(work.slow>=(policy.slowTiles||6))throw incomplete('Le calcul photo dépasse le budget graphique de cet appareil.');
   const elapsed=clock()-work.started;
   if(work.path.isCompiling){if(elapsed>(policy.compileTimeMs||60000))throw incomplete('La compilation graphique a dépassé le délai disponible.');status('preparing','Préparation du rendu photo · compilation graphique…',work.samples);}
   else if(work.samples!==work.lastSample){work.lastSample=work.samples;status('photoreal','Rendu photo progressif · '+work.samples+' / '+policy.maxSamples,work.samples);}
   if(!work.path.isCompiling&&work.samples>=policy.maxSamples){void complete(work);return;}
   if(elapsed>(policy.maxTimeMs||600000))throw incomplete('Le délai maximal a été atteint avant la convergence du rendu photo.');
   work.frame=scheduleFrame(()=>sample(work));
  }catch(error){fail(work,error);}
 }
 function down(event){pointers.add(event.pointerId);const hadPhoto=!!job||phase==='ready';changed();if(hadPhoto)onRestoreRaster();}
 function up(event){pointers.delete(event.pointerId);}
 const listeners=[['pointerdown',down],['pointerup',up],['pointercancel',up],['lostpointercapture',up]];
 for(const [type,fn]of listeners)canvas.addEventListener(type,fn,{capture:true});
 return {start,cancel,changed,getPhotoCapture:()=>latestCapture,setActive(value){active=!!value;if(!active)cancel({restore:false});},diagnostics:()=>({engine:'three-gpu-pathtracer',engineVersion:'0.0.24',environment:environmentSource,failureReason,samples:job?.samples||lastSamples,maxSamples:policy.maxSamples,building:!!job?.building,ready:phase==='ready',phase,active,pixels:policy.pixels,stats:job?.snapshot?.stats||null,hasCapture:!!latestCapture}),dispose(){if(disposed)return;const work=job;disposed=true;active=false;revision++;job=null;release(work);latestCapture=null;for(const [type,fn]of listeners)canvas.removeEventListener(type,fn,{capture:true});}};
}
