import * as T from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {WebGLPathTracer} from 'three-gpu-pathtracer/src/core/WebGLPathTracer.js';
import {GradientEquirectTexture} from 'three-gpu-pathtracer/src/textures/GradientEquirectTexture.js';
import {PresentationBVHWorker} from './randal-presentation-bvh.js';
import {createPathTracingScene} from './randal-presentation-path-scene.js';
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

export function createProgressivePresentation({renderer,scene,camera,canvas,policy,onStatus=()=>{},onFallback=()=>{},createPathTracer=r=>new WebGLPathTracer(r),createBVHWorker=()=>new PresentationBVHWorker(),loadEnvironment=loadStudioEnvironment,clock=()=>performance.now(),scheduleFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id),scheduleIdle=(fn,ms)=>setTimeout(fn,ms),cancelIdle=id=>clearTimeout(id)}){
 let disposed=false,active=true,revision=0,building=false,pending=false,timer=null,frame=null,path=null,worker=null,snapshot=null,environment=null,environmentSource='loading',ready=false,started=0,slow=0,lastSample=-1,lastStatusTime=-Infinity,lastMode='',failureReason=null;
 const abort=new AbortController(),pointers=new Set();
 function status(mode,message,samples=0){const time=clock();if(mode===lastMode&&time-lastStatusTime<500&&!['ready','fallback'].includes(mode))return;lastMode=mode;lastStatusTime=time;onStatus({mode,message,samples,maxSamples:policy.maxSamples,engine:'three-gpu-pathtracer',engineVersion:'0.0.24',environment:environmentSource,reason:failureReason});}
 function cancel(){if(timer!==null)cancelIdle(timer);if(frame!==null)cancelFrame(frame);timer=frame=null;}
 function release(){worker?.dispose();worker=null;disposePinnedPathTracer(path);path=null;snapshot?.dispose();snapshot=null;environment?.dispose();environment=null;}
 function fail(error){if(disposed)return;cancel();revision++;ready=false;active=false;failureReason=error?.message||'Photo indisponible';release();status('fallback','Aperçu interactif · le calcul photo n’est pas disponible sur cet appareil.');onFallback(error);}
 const environmentReady=Promise.resolve().then(()=>loadEnvironment(abort.signal)).then(texture=>{environmentSource='studio-hdr';return texture;}).catch(error=>{if(disposed||abort.signal.aborted)throw error;environmentSource='gradient-fallback';const texture=new GradientEquirectTexture(128);texture.topColor.set('#d8e1e7');texture.bottomColor.set('#55534e');texture.update();return texture;}).then(texture=>{if(disposed){texture.dispose();return null;}environment=texture;return texture;});
 // A rejection during closure is intentionally consumed; no late continuation
 // is allowed to allocate a renderer or touch the disposed WebGL context.
 environmentReady.catch(()=>{});
 function schedule(){if(disposed||!active||pointers.size)return;if(timer!==null)cancelIdle(timer);timer=scheduleIdle(()=>{timer=null;if(building){pending=true;return;}void build();},policy.idle);}
 function changed(){if(disposed)return;revision++;ready=false;cancel();path?.reset();if(active)status('interactive','Aperçu interactif · le rendu photo s’affine lorsque vous arrêtez de bouger.');schedule();}
 async function build(){
  if(disposed||!active||pointers.size)return;
  const turn=revision;building=true;pending=false;status('preparing','Préparation du rendu photo…');
  try{
   await environmentReady;if(disposed||!active||turn!==revision)return;
   if(!path){path=createPathTracer(renderer);worker=createBVHWorker();path.setBVHWorker(worker);path.bounces=policy.bounces;path.transmissiveBounces=4;path.filterGlossyFactor=.45;path.tiles.set(policy.tiles,policy.tiles);path.textureSize.set(policy.textureSize,policy.textureSize);path.rasterizeScene=false;path.dynamicLowRes=false;path.renderDelay=0;path.minSamples=2;path.fadeDuration=0;
    for(const pass of [path._pathTracer,path._lowResPathTracer])if(pass?.compileMaterial){const compile=pass.compileMaterial.bind(pass);pass.compileMaterial=(...args)=>Promise.resolve(compile(...args)).catch(error=>{if(!disposed&&active)fail(error);});}
   }
   snapshot?.dispose();snapshot=createPathTracingScene(scene,{environment});
   if(snapshot.stats.triangles>policy.maxTriangles||snapshot.stats.textureSources>policy.maxTextureSources)throw Error('La composition dépasse le budget du rendu photo.');
   path.textureSize.set(snapshot.stats.textureSources>24?Math.min(512,policy.textureSize):policy.textureSize,snapshot.stats.textureSources>24?Math.min(512,policy.textureSize):policy.textureSize);
   const size=renderer.getDrawingBufferSize(new T.Vector2());path.renderScale=Math.min(1,Math.sqrt(policy.pixels/Math.max(1,size.x*size.y)));
   // Upstream 0.0.24 references an undeclared `length` when comparing an
   // unchanged material list. Invalidate that private comparison explicitly;
   // material indices are safely regenerated for this complete snapshot.
   if(path._generator)path._generator._materialUuids=null;
   await path.setSceneAsync(snapshot.scene,camera,{onProgress:value=>{if(!disposed&&turn===revision)status('preparing','Préparation du rendu photo · '+Math.round(value*100)+' %');}});
   if(disposed||!active||turn!==revision)return;
   ready=true;started=clock();slow=0;lastSample=-1;frame=scheduleFrame(()=>sample(turn));
  }catch(error){if(!disposed&&turn===revision)fail(error);}
  finally{building=false;if(!disposed&&active&&(pending||turn!==revision))schedule();}
 }
 function sample(turn){
  frame=null;if(disposed||!active||!ready||turn!==revision||pointers.size)return;
  try{
   const before=clock();path.renderSample();const duration=clock()-before;
   slow=duration>250?slow+1:Math.max(0,slow-1);if(slow>=3)throw Error('Le calcul photo est trop coûteux pour cet appareil.');
   const samples=Math.floor(path.samples),elapsed=clock()-started;
   if(path.isCompiling){if(elapsed>30000)throw Error('La préparation graphique a dépassé le délai disponible.');status('preparing','Préparation du rendu photo · compilation graphique…');}
   else if(samples!==lastSample){lastSample=samples;status('photoreal','Rendu photo progressif · '+samples+' / '+policy.maxSamples,samples);}
   if(samples>=policy.maxSamples||elapsed>90000&&samples>=8){status('ready','Rendu photo · '+samples+' échantillons calculés',samples);return;}
   frame=scheduleFrame(()=>sample(turn));
  }catch(error){fail(error);}
 }
 function down(event){pointers.add(event.pointerId);changed();}
 function up(event){pointers.delete(event.pointerId);if(!pointers.size)schedule();}
 const listeners=[['pointerdown',down],['pointerup',up],['pointercancel',up],['lostpointercapture',up]];
 for(const [type,fn]of listeners)canvas.addEventListener(type,fn,{capture:true});
 return {changed,setActive(value){active=!!value;cancel();if(active)changed();},diagnostics:()=>({engine:'three-gpu-pathtracer',engineVersion:'0.0.24',environment:environmentSource,failureReason,samples:path?.samples||0,maxSamples:policy.maxSamples,building,ready,active,pixels:policy.pixels,stats:snapshot?.stats||null}),dispose(){if(disposed)return;disposed=true;active=false;revision++;cancel();abort.abort();for(const [type,fn]of listeners)canvas.removeEventListener(type,fn,{capture:true});release();}};
}
