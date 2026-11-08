import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createUltraPipeline} from './ultra-rendering.js';
import {renderPixelRatio} from './performance.js';

// This policy belongs only to the restricted fullscreen. It never changes the
// user's workshop preference or any of the three existing quality profiles.
export function presentationRenderProfile({mobile=false,memory=8,cores=8,maxTextureSize=8192,floatTargets=true}={}){
 // Chromium caps reported deviceMemory at eight; twelve is unreachable even
 // on high-end desktops. Combine the reported bucket with CPU/GPU limits.
 const limited=mobile||memory<6||cores<4||maxTextureSize<4096,strong=!limited&&memory>=8&&cores>=8&&maxTextureSize>=8192;
 return Object.freeze(limited?
  {id:'presentation-balanced',texture:'balanced',textureDimension:Math.min(2048,maxTextureSize),pixelRatio:1.6,supersampling:1.25,pixels:1500000,shadow:Math.min(1024,maxTextureSize),reflection:Math.min(1024,maxTextureSize),reflectionMax:Math.min(2048,maxTextureSize),reflectionPixels:1100000,reflectionBytes:32*1024*1024,reflectionSamples:0,ao:false,anisotropy:8}:
  {id:'presentation-ultra',texture:'max',textureDimension:Math.min(4096,maxTextureSize),pixelRatio:strong?2.5:2,supersampling:1.5,pixels:strong?8300000:6000000,shadow:Math.min(strong?4096:2048,maxTextureSize),reflection:Math.min(2048,maxTextureSize),reflectionMax:Math.min(4096,maxTextureSize),reflectionPixels:strong?8300000:4200000,reflectionBytes:(strong?160:96)*1024*1024,reflectionSamples:2,ao:floatTargets,anisotropy:16});
}
// Reduce optical work before display definition. Zooming must not replace HD
// material sources or suddenly shrink the canvas to the old 1.5 MP budget.
export function reducedPresentationProfile(profile){return Object.freeze({...profile,id:'presentation-efficient',shadow:Math.min(profile.shadow,2048),ao:false});}

export function presentationReflectionSize(profile,{width=0,height=0,ratio=1,zoomed=false,count=1,maxSamples=0}={}){
 const aspect=width>0&&height>0?width/height:1,viewportEdge=Math.max(width,height)*ratio;
 const needed=viewportEdge>0?2**Math.ceil(Math.log2(Math.max(64,viewportEdge))):profile.reflection;
 const edge=Math.min(zoomed?profile.reflectionMax:profile.reflection,needed);
 let w=aspect>=1?edge:edge*aspect,h=aspect>=1?edge/aspect:edge;
 const budget=profile.reflectionPixels/Math.max(1,count),scale=Math.min(1,Math.sqrt(budget/Math.max(1,w*h)));
 w=Math.max(1,Math.floor(w*scale/16)*16);h=Math.max(1,Math.floor(h*scale/16)*16);
 // Full-resolution reflection targets already supersample the visible mirror.
 // Avoid a 4K half-float target plus four multisample colour/depth attachments.
 let samples=w*h<=3000000?Math.min(profile.reflectionSamples,maxSamples):0;
 const bytesPerPixel=sampleCount=>8*4/3+4+sampleCount*12;
 if(w*h*bytesPerPixel(samples)>profile.reflectionBytes/Math.max(1,count))samples=0;
 return {width:w,height:h,samples};
}
function mirrorScreenCoverage(object,camera){
 const geometry=object.geometry;if(!geometry?.attributes?.position)return 0;if(!geometry.boundingBox)geometry.computeBoundingBox();
 const box=geometry.boundingBox,point=new T.Vector3();let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity,inFront=false;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){point.set(x,y,z).applyMatrix4(object.matrixWorld).project(camera);if(point.z>=-1&&point.z<=1)inFront=true;left=Math.min(left,point.x);right=Math.max(right,point.x);bottom=Math.min(bottom,point.y);top=Math.max(top,point.y);}
 if(!inFront||right<=-1||left>=1||top<=-1||bottom>=1)return 0;
 return Math.max(Math.min(1,right)-Math.max(-1,left),Math.min(1,top)-Math.max(-1,bottom))*.5;
}
export function presentationBrightness(value){const number=Number(value);return Number.isFinite(number)?T.MathUtils.clamp(number,25,150):100;}

export function createPresentationRendering({renderer,scene,camera,canvas,sun,invalidate,now=()=>performance.now()}){
 const nav=globalThis.navigator||{},mobile=globalThis.matchMedia?.('(max-width: 700px), (pointer: coarse)').matches||false;
 let profile=presentationRenderProfile({mobile,memory:nav.deviceMemory||8,cores:nav.hardwareConcurrency||8,maxTextureSize:renderer.capabilities.maxTextureSize,floatTargets:renderer.extensions.has('EXT_color_buffer_float')});
 let pipeline=null,width=0,height=0,ratio=1,appliedProfile=null,disposed=false,lost=false,slow=0,frames=0,downgrades=0,restoredEnvironment=null,active=true,brightness=100;
 const surfaceQuality={},reflectors=new Set(),reflectionState=new WeakMap();
 function syncSurfaceQuality(){Object.assign(surfaceQuality,{textureProfile:profile.texture,maxTextureDimension:profile.textureDimension,maxSurfaceFaces:profile.texture==='max'?4:1,anisotropy:profile.anisotropy});}syncSurfaceQuality();
 const guardedReflectors=new WeakSet(),prior={environmentIntensity:scene.environmentIntensity,exposure:renderer.toneMappingExposure};
 // A neutral daylight key, broad fill and overhead softbox reveal the original
 // PBR materials. There is no camera-dependent exposure or colour adjustment.
 scene.environmentIntensity=.72;renderer.toneMappingExposure=1;
 function setBrightness(value){if(disposed)return brightness;const next=presentationBrightness(value);if(next!==brightness){brightness=next;renderer.toneMappingExposure=brightness/100;invalidate();}return brightness;}
 const existing=scene.children.filter(o=>o.isLight),lightState=existing.map(light=>[light,light.intensity]);
 for(const light of existing){if(light.isHemisphereLight)light.intensity=.22;else if(light.isRectAreaLight)light.intensity*=1.25;}
 sun.intensity=1.35;sun.shadow.normalBias=.001;sun.shadow.bias=-.00006;sun.shadow.camera.updateProjectionMatrix();
 const overhead=new T.RectAreaLight('#fff9ee',2.4,3,1.8);overhead.name='Présentation_softbox';overhead.position.set(0,3.4,1.4);overhead.lookAt(0,.7,0);scene.add(overhead);scene.add(sun.target);
 function setShadowSize(size){if(sun.shadow.mapSize.x===size)return;sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);sun.shadow.needsUpdate=true;}
 function guardReflector(object){if(!object.isReflector||guardedReflectors.has(object))return;guardedReflectors.add(object);const render=object.onBeforeRender;object.onBeforeRender=function(...args){if(scene.overrideMaterial)return;return render.apply(this,args);};}
 function prepareModel(group){
  reflectors.clear();
  group?.traverse(object=>{guardReflector(object);if(object.isReflector)reflectors.add(object);
   for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){if(material.isMeshStandardMaterial||material.isMeshPhysicalMaterial){material.envMapIntensity=1;material.needsUpdate=true;}}
  });
  updateReflections();
  if(!group)return;const box=new T.Box3().setFromObject(group);if(box.isEmpty())return;const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(1.5,size.x,size.y,size.z)*.8+1;
  sun.target.position.copy(center);sun.position.copy(center).add(new T.Vector3(-2.5,4,3));sun.target.updateMatrixWorld();Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:.1,far:16});sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;
 }
 function updateReflections(){
  if(!reflectors.size)return;scene.updateMatrixWorld(true);camera.updateMatrixWorld();
  for(const object of reflectors){
   const priorState=reflectionState.get(object)||{zoomed:false};
   // Once enlarged, keep the target until the viewport/model changes. Small
   // pointer movements cannot oscillate allocations across a zoom threshold.
   if(mirrorScreenCoverage(object,camera)>.34)priorState.zoomed=true;
   const size=presentationReflectionSize(profile,{width,height,ratio,zoomed:priorState.zoomed,count:reflectors.size,maxSamples:renderer.capabilities.maxSamples||0}),target=object.getRenderTarget();
   const samplesChanged=target.samples!==size.samples;
   if(samplesChanged)target.samples=size.samples;
   if(target.width!==size.width||target.height!==size.height)target.setSize(size.width,size.height);else if(samplesChanged)target.dispose();
   const texture=target.texture;if(texture){texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=Math.min(profile.anisotropy,renderer.capabilities.getMaxAnisotropy());}
   reflectionState.set(object,priorState);
  }
 }
 function discardPipeline(){pipeline?.dispose();pipeline=null;}
 function makePipeline(){if(!profile.ao||pipeline||!width||!height||lost)return;
  try{pipeline=createUltraPipeline(renderer,scene,camera);pipeline.ao.blendIntensity=.3;pipeline.ao.updateGtaoMaterial({radius:.09,thickness:.035,distanceFallOff:.45,samples:24,screenSpaceRadius:false});
   const original=pipeline.ao._renderOverride.bind(pipeline.ao);pipeline.ao._renderOverride=(...args)=>{const hidden=[];scene.traverseVisible(object=>{if(object.isMesh&&!object.isReflector&&(Array.isArray(object.material)?object.material:[object.material]).some(m=>m.transparent&&m.depthWrite===false)){hidden.push(object);object.visible=false;}});try{return original(...args);}finally{for(const object of hidden)object.visible=true;}};
   pipeline.resize(width,height,ratio);
  }catch{discardPipeline();profile=reducedPresentationProfile(profile);syncSurfaceQuality();downgrades++;}
 }
 function resize(w,h){if(disposed||!w||!h)return;const nextRatio=renderPixelRatio(profile,w,h,globalThis.devicePixelRatio||1);if(w===width&&h===height&&ratio===nextRatio&&appliedProfile===profile.id)return;width=w;height=h;ratio=nextRatio;renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);setShadowSize(profile.shadow);makePipeline();const fallbackRatio=renderPixelRatio(profile,w,h,globalThis.devicePixelRatio||1);if(ratio!==fallbackRatio){ratio=fallbackRatio;renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);}appliedProfile=profile.id;pipeline?.resize(w,h,ratio);updateReflections();}
 function downgrade(){if(profile.id!=='presentation-ultra')return;profile=reducedPresentationProfile(profile);syncSurfaceQuality();downgrades++;discardPipeline();resize(width,height);invalidate();}
 function render(){if(disposed||lost||!active)return;updateReflections();const start=now();
  try{if(pipeline)pipeline.render(0);else renderer.render(scene,camera);}catch(error){if(!pipeline)throw error;discardPipeline();downgrade();renderer.render(scene,camera);}
  const duration=now()-start;frames++;if(frames>3){slow=duration>48?slow+1:Math.max(0,slow-1);if(slow>=6)downgrade();}
 }
 function contextLost(event){event.preventDefault();lost=true;discardPipeline();}
 function contextRestored(){if(disposed)return;lost=false;appliedProfile=null;restoredEnvironment?.dispose();const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();try{restoredEnvironment=pmrem.fromScene(room);scene.environment=restoredEnvironment.texture;}finally{room.dispose();pmrem.dispose();}resize(width,height);invalidate();}
 canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
 return {setBrightness,getBrightness:()=>brightness,get profile(){return profile;},setActive(value){active=!!value;},surfaceQuality:()=>surfaceQuality,fitTexture(texture){const image=texture.image,limit=Math.min(surfaceQuality.maxTextureDimension,renderer.capabilities.maxTextureSize);if(image&&Math.max(image.width,image.height)>limit){const scale=limit/Math.max(image.width,image.height),sample=document.createElement('canvas');sample.width=Math.max(1,Math.round(image.width*scale));sample.height=Math.max(1,Math.round(image.height*scale));const context=sample.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,sample.width,sample.height);texture.image=sample;}texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=Math.min(profile.anisotropy,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;return texture;},resize,render,prepareModel,diagnostics:()=>({profile:profile.id,brightness,contactOcclusion:!!pipeline,pixels:Math.round(width*height*ratio*ratio),shadow:profile.shadow,reflection:profile.reflection,reflections:[...reflectors].map(object=>{const target=object.getRenderTarget();return {width:target.width,height:target.height,samples:target.samples};}),textureDimension:surfaceQuality.maxTextureDimension,frames,downgrades,contextLost:lost}),dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);discardPipeline();reflectors.clear();restoredEnvironment?.dispose();scene.remove(overhead);scene.remove(sun.target);for(const [light,intensity]of lightState)light.intensity=intensity;scene.environmentIntensity=prior.environmentIntensity;renderer.toneMappingExposure=prior.exposure;}};
}
