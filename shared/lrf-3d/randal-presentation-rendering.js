import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createUltraPipeline} from './ultra-rendering.js';
import {renderPixelRatio} from './performance.js';
import {progressivePresentationPolicy} from './randal-presentation-path-policy.js';

// This policy belongs only to the restricted fullscreen. It never changes the
// user's workshop preference or any of the three existing quality profiles.
export function presentationRenderProfile({mobile=false,memory=8,cores=8,maxTextureSize=8192,floatTargets=true}={}){
 const limited=mobile||memory<6||cores<4||maxTextureSize<4096;
 return Object.freeze(limited?
  {id:'presentation-balanced',texture:'balanced',pixelRatio:1.6,supersampling:1.2,pixels:1500000,shadow:Math.min(1024,maxTextureSize),reflection:Math.min(512,maxTextureSize),ao:false,anisotropy:8}:
  {id:'presentation-ultra',texture:'max',pixelRatio:2,supersampling:1.35,pixels:5000000,shadow:Math.min(memory>=12&&cores>=8?4096:2048,maxTextureSize),reflection:Math.min(1024,maxTextureSize),ao:floatTargets,anisotropy:16});
}
export function reducedPresentationProfile(profile){return Object.freeze({...profile,id:'presentation-balanced',texture:'balanced',pixelRatio:Math.min(profile.pixelRatio,1.4),supersampling:1,pixels:1500000,shadow:Math.min(profile.shadow,1024),reflection:Math.min(profile.reflection,512),ao:false});}
export function presentationBrightness(value){const number=Number(value);return Number.isFinite(number)?T.MathUtils.clamp(number,25,150):100;}

export function createPresentationRendering({renderer,scene,camera,controls,canvas,sun,invalidate,onRenderStatus=()=>{},onPhotoCapture=()=>{},loadProgressive=()=>import('./randal-presentation-progressive.js'),now=()=>performance.now()}){
 const nav=globalThis.navigator||{},mobile=globalThis.matchMedia?.('(max-width: 700px), (pointer: coarse)').matches||false;
 let profile=presentationRenderProfile({mobile,memory:nav.deviceMemory||8,cores:nav.hardwareConcurrency||8,maxTextureSize:renderer.capabilities.maxTextureSize,floatTargets:renderer.extensions.has('EXT_color_buffer_float')});
 let pipeline=null,width=0,height=0,ratio=1,appliedProfile=null,disposed=false,lost=false,slow=0,frames=0,downgrades=0,restoredEnvironment=null,progressive=null,progressiveLoading=false,active=true,loadRevision=0,modelReady=false,lastRenderStatus=null,brightness=100;
 function report(value){lastRenderStatus=value;onRenderStatus(value);}
 const progressivePolicy=progressivePresentationPolicy({mobile,memory:nav.deviceMemory||8,cores:nav.hardwareConcurrency||8,maxTextureSize:renderer.capabilities.maxTextureSize,floatTargets:renderer.extensions.has('EXT_color_buffer_float'),workers:typeof Worker==='function'});
 async function startPhotoRender(){
  if(disposed||lost||!active||progressiveLoading)return false;
  if(!modelReady){report({mode:'fallback',available:true,samples:0,maxSamples:progressivePolicy.maxSamples,message:'La composition doit être chargée avant de lancer le rendu photo.'});return false;}
  if(!progressivePolicy.enabled||downgrades){report({mode:'fallback',available:false,samples:0,maxSamples:progressivePolicy.maxSamples,message:'Le rendu photo nécessite un appareil graphique compatible.',reason:downgrades?'Budget graphique réduit après des images coûteuses.':'Cibles flottantes, calcul parallèle ou mémoire insuffisants.'});return false;}
  const turn=++loadRevision;progressiveLoading=true;report({mode:'requested',available:true,samples:0,maxSamples:progressivePolicy.maxSamples,message:'Rendu photo demandé · chargement du moteur…'});
  try{
   // No module import, HDR fetch, worker or GPU allocation before this method
   // is explicitly invoked. A redraw while loading cancels this request.
   if(!progressive){const {createProgressivePresentation}=await loadProgressive();if(disposed||lost||!active||turn!==loadRevision)return false;
    progressive=createProgressivePresentation({renderer,scene,camera,canvas,policy:progressivePolicy,onStatus:report,onPhotoCapture,onRestoreRaster:()=>{if(!disposed&&!lost&&active)invalidate();}});
   }
   if(disposed||lost||!active||turn!==loadRevision)return false;
   const accepted=await progressive.start();return !!accepted&&!disposed&&!lost&&active&&turn===loadRevision;
  }catch(error){if(!disposed&&turn===loadRevision)report({mode:'fallback',available:true,samples:0,maxSamples:progressivePolicy.maxSamples,message:'Le moteur photo n’a pas pu être chargé. Vous pouvez réessayer.',reason:error.message});return false;}
  finally{if(turn===loadRevision)progressiveLoading=false;}
 }
 function photoChanged(){if(progressiveLoading){loadRevision++;progressiveLoading=false;if(!progressive)report({mode:'interactive',available:true,samples:0,maxSamples:progressivePolicy.maxSamples,message:'Aperçu interactif · relancez le rendu photo après vos modifications.'});}progressive?.changed();}
 function cancelPhotoRender(){if(disposed)return;const loading=progressiveLoading;loadRevision++;progressiveLoading=false;progressive?.cancel();if(loading&&!progressive)report({mode:'cancelled',available:true,samples:0,maxSamples:progressivePolicy.maxSamples,message:'Calcul photo annulé · aperçu interactif.'});if(active&&!lost)invalidate();}
 const surfaceQuality={};
 function syncSurfaceQuality(){Object.assign(surfaceQuality,{textureProfile:profile.texture,maxTextureDimension:profile.texture==='max'?3072:1536,maxSurfaceFaces:profile.texture==='max'?4:1,anisotropy:profile.anisotropy});}syncSurfaceQuality();
 const guardedReflectors=new WeakSet(),prior={environmentIntensity:scene.environmentIntensity,exposure:renderer.toneMappingExposure};
 // A neutral daylight key, broad fill and overhead softbox reveal the original
 // PBR materials. There is no camera-dependent exposure or colour adjustment.
 scene.environmentIntensity=.72;renderer.toneMappingExposure=1;
 function setBrightness(value){if(disposed)return brightness;const next=presentationBrightness(value);if(next!==brightness){photoChanged();brightness=next;renderer.toneMappingExposure=brightness/100;invalidate();}return brightness;}
 const existing=scene.children.filter(o=>o.isLight),lightState=existing.map(light=>[light,light.intensity]);
 for(const light of existing){if(light.isHemisphereLight)light.intensity=.22;else if(light.isRectAreaLight)light.intensity*=1.25;}
 sun.intensity=1.35;sun.shadow.normalBias=.001;sun.shadow.bias=-.00006;sun.shadow.camera.updateProjectionMatrix();
 const overhead=new T.RectAreaLight('#fff9ee',2.4,3,1.8);overhead.name='Présentation_softbox';overhead.position.set(0,3.4,1.4);overhead.lookAt(0,.7,0);scene.add(overhead);scene.add(sun.target);
 function setShadowSize(size){if(sun.shadow.mapSize.x===size)return;sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);sun.shadow.needsUpdate=true;}
 function guardReflector(object){if(!object.isReflector||guardedReflectors.has(object))return;guardedReflectors.add(object);const render=object.onBeforeRender;object.onBeforeRender=function(...args){if(scene.overrideMaterial)return;return render.apply(this,args);};}
 function prepareModel(group){
  photoChanged();
  group?.traverse(object=>{guardReflector(object);if(object.isReflector){const target=object.getRenderTarget();if(target.width!==profile.reflection||target.height!==profile.reflection)target.setSize(profile.reflection,profile.reflection);}
   for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){if(material.isMeshStandardMaterial||material.isMeshPhysicalMaterial){material.envMapIntensity=1;material.needsUpdate=true;}}
  });
  if(!group)return;const box=new T.Box3().setFromObject(group);if(box.isEmpty())return;modelReady=true;const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(1.5,size.x,size.y,size.z)*.8+1;
  sun.target.position.copy(center);sun.position.copy(center).add(new T.Vector3(-2.5,4,3));sun.target.updateMatrixWorld();Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:.1,far:16});sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;
 }
 function discardPipeline(){pipeline?.dispose();pipeline=null;}
 function makePipeline(){if(!profile.ao||pipeline||!width||!height||lost)return;
  try{pipeline=createUltraPipeline(renderer,scene,camera);pipeline.ao.blendIntensity=.3;pipeline.ao.updateGtaoMaterial({radius:.09,thickness:.035,distanceFallOff:.45,samples:24,screenSpaceRadius:false});
   const original=pipeline.ao._renderOverride.bind(pipeline.ao);pipeline.ao._renderOverride=(...args)=>{const hidden=[];scene.traverseVisible(object=>{if(object.isMesh&&!object.isReflector&&(Array.isArray(object.material)?object.material:[object.material]).some(m=>m.transparent&&m.depthWrite===false)){hidden.push(object);object.visible=false;}});try{return original(...args);}finally{for(const object of hidden)object.visible=true;}};
   pipeline.resize(width,height,ratio);
  }catch{discardPipeline();profile=reducedPresentationProfile(profile);syncSurfaceQuality();downgrades++;}
 }
 function resize(w,h){if(disposed||!w||!h)return;const nextRatio=renderPixelRatio(profile,w,h,globalThis.devicePixelRatio||1);if(w===width&&h===height&&ratio===nextRatio&&appliedProfile===profile.id)return;photoChanged();width=w;height=h;ratio=nextRatio;renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);setShadowSize(profile.shadow);makePipeline();const fallbackRatio=renderPixelRatio(profile,w,h,globalThis.devicePixelRatio||1);if(ratio!==fallbackRatio){ratio=fallbackRatio;renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);}appliedProfile=profile.id;pipeline?.resize(w,h,ratio);}
 function downgrade(){if(profile.id==='presentation-balanced')return;profile=reducedPresentationProfile(profile);syncSurfaceQuality();downgrades++;discardPipeline();scene.traverse(object=>{if(object.isReflector){const target=object.getRenderTarget();target.setSize(profile.reflection,profile.reflection);}});resize(width,height);invalidate();}
 function render(){if(disposed||lost||!active)return;photoChanged();const start=now();
  try{if(pipeline)pipeline.render(0);else renderer.render(scene,camera);}catch(error){if(!pipeline)throw error;discardPipeline();downgrade();renderer.render(scene,camera);}
  const duration=now()-start;frames++;if(frames>3){slow=duration>48?slow+1:Math.max(0,slow-1);if(slow>=6)downgrade();}
 }
 function contextLost(event){event.preventDefault();lost=true;discardPipeline();loadRevision++;progressive?.dispose();progressive=null;progressiveLoading=false;}
 function contextRestored(){if(disposed)return;lost=false;appliedProfile=null;restoredEnvironment?.dispose();const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();try{restoredEnvironment=pmrem.fromScene(room);scene.environment=restoredEnvironment.texture;}finally{room.dispose();pmrem.dispose();}resize(width,height);invalidate();}
 controls?.addEventListener?.('change',photoChanged);
 canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
 return {startPhotoRender,cancelPhotoRender,getPhotoCapture:()=>progressive?.getPhotoCapture()||null,setBrightness,getBrightness:()=>brightness,get profile(){return profile;},setActive(value){active=!!value;if(!active){loadRevision++;progressiveLoading=false;}progressive?.setActive(active);},surfaceQuality:()=>surfaceQuality,fitTexture(texture){const image=texture.image,limit=Math.min(surfaceQuality.maxTextureDimension,renderer.capabilities.maxTextureSize);if(image&&Math.max(image.width,image.height)>limit){const scale=limit/Math.max(image.width,image.height),sample=document.createElement('canvas');sample.width=Math.max(1,Math.round(image.width*scale));sample.height=Math.max(1,Math.round(image.height*scale));sample.getContext('2d').drawImage(image,0,0,sample.width,sample.height);texture.image=sample;}texture.anisotropy=Math.min(profile.anisotropy,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;return texture;},resize,render,prepareModel,diagnostics:()=>({profile:profile.id,brightness,contactOcclusion:!!pipeline,pixels:Math.round(width*height*ratio*ratio),shadow:profile.shadow,reflection:profile.reflection,frames,downgrades,contextLost:lost,renderStatus:lastRenderStatus,progressive:progressive?.diagnostics()||{eligible:progressivePolicy.enabled,loading:progressiveLoading}}),dispose(){if(disposed)return;disposed=true;loadRevision++;progressive?.dispose();progressive=null;controls?.removeEventListener?.('change',photoChanged);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);discardPipeline();restoredEnvironment?.dispose();scene.remove(overhead);scene.remove(sun.target);for(const [light,intensity]of lightState)light.intensity=intensity;scene.environmentIntensity=prior.environmentIntensity;renderer.toneMappingExposure=prior.exposure;}};
}
