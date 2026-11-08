import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {presentationRenderProfile,presentationReflectionSize,createPresentationRendering} from '../shared/lrf-3d/randal-presentation-rendering.js';

test('fullscreen budgets reserve half-resolution contact occlusion and HD material sources for capable desktops',()=>{
 const desktop=presentationRenderProfile({memory:16,cores:12});
 assert.equal(desktop.ao,true);assert.equal(desktop.texture,'max');assert.equal(desktop.shadow,4096);assert.equal(desktop.reflection,2048);assert.equal(desktop.reflectionMax,4096);assert.equal(desktop.textureDimension,4096);
 for(const limits of [{mobile:true},{memory:4},{cores:2},{maxTextureSize:2048}]){
  const profile=presentationRenderProfile(limits);assert.equal(profile.ao,false);assert.equal(profile.texture,'balanced');assert.ok(profile.reflection<=1024);assert.ok(profile.pixels<=1500000);
 }
 assert.equal(presentationRenderProfile({floatTargets:false}).ao,false);
});

function fixture({duration=2,floatTargets=false}={}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),sun=new T.DirectionalLight('#fff',.9),fill=new T.HemisphereLight('#fff','#888',.35);scene.add(sun,fill);
 const listeners=new Map(),sizes=[],size=new T.Vector2(1,1);let pixelRatio=1,draws=0,clock=0,invalidations=0;
 const canvas={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 const renderer={capabilities:{maxTextureSize:8192,maxSamples:4,getMaxAnisotropy:()=>16},extensions:{has:()=>floatTargets},toneMappingExposure:1,getPixelRatio:()=>pixelRatio,setPixelRatio:v=>pixelRatio=v,getSize:v=>v.copy(size),setSize(w,h){size.set(w,h);sizes.push([w,h]);},render(){draws++;},shadowMap:{}};
 const helper=createPresentationRendering({renderer,scene,camera,canvas,sun,invalidate(){invalidations++;},now(){clock+=duration;return clock;}});
 return {helper,scene,camera,sun,fill,renderer,listeners,sizes,get draws(){return draws;},get invalidations(){return invalidations;}};
}

test('fullscreen rendering is on demand, identical resizes do not reallocate and context loss suspends draws',()=>{
 const f=fixture();f.helper.resize(1600,900);for(let i=0;i<10;i++)f.helper.resize(1600,900);assert.equal(f.sizes.length,1);
 assert.equal(f.draws,0);f.helper.render();assert.equal(f.draws,1);assert.ok(f.helper.diagnostics().pixels<=8300000);
 let prevented=false;f.listeners.get('webglcontextlost')({preventDefault(){prevented=true;}});f.helper.render();assert.equal(f.draws,1);assert.equal(prevented,true);assert.equal(f.helper.diagnostics().contextLost,true);
 const bright=f.fill.intensity;f.helper.dispose();assert.equal(f.listeners.size,0);assert.equal(f.fill.intensity,.35);assert.notEqual(bright,f.fill.intensity);f.helper.render();assert.equal(f.draws,1);
});

test('real physical furniture and reflectors retain their materials while override passes never trigger mirror captures',()=>{
 const f=fixture(),model=new T.Group(),material=new T.MeshPhysicalMaterial({roughness:.37,clearcoat:.15}),cabinet=new T.Mesh(new T.BoxGeometry(.8,.8,.45),material);model.add(cabinet);let reflected=0;
 const target=new T.WebGLRenderTarget(64,64),mirror=new T.Mesh(new T.PlaneGeometry(.5,.8),new T.MeshBasicMaterial());mirror.isReflector=true;mirror.getRenderTarget=()=>target;mirror.onBeforeRender=()=>reflected++;model.add(mirror);f.scene.add(model);
 f.helper.prepareModel(model);f.helper.prepareModel(model);assert.equal(cabinet.material,material);assert.equal(material.roughness,.37);assert.equal(material.clearcoat,.15);assert.equal(target.width,2048);
 mirror.onBeforeRender();assert.equal(reflected,1);f.scene.overrideMaterial=new T.MeshNormalMaterial();mirror.onBeforeRender();assert.equal(reflected,1);f.scene.overrideMaterial=null;
 assert.ok(f.sun.shadow.camera.left<-.8&&f.sun.shadow.camera.right>.8);f.helper.dispose();target.dispose();
});

test('sustained expensive renders reduce optical work once while preserving HD definition and stable lighting',()=>{
 const f=fixture({duration:65});f.helper.resize(1920,1080);const surfaceQuality=f.helper.surfaceQuality(),originalPixels=f.helper.diagnostics().pixels,intensity=f.fill.intensity,exposure=f.renderer.toneMappingExposure;
 for(let i=0;i<20;i++)f.helper.render();const state=f.helper.diagnostics();assert.equal(state.downgrades,1);assert.equal(state.profile,'presentation-efficient');assert.equal(state.pixels,originalPixels);assert.equal(f.helper.surfaceQuality(),surfaceQuality);assert.equal(surfaceQuality.maxSurfaceFaces,4);assert.equal(surfaceQuality.textureProfile,'max');assert.equal(surfaceQuality.maxTextureDimension,4096);assert.equal(f.fill.intensity,intensity);assert.equal(f.renderer.toneMappingExposure,exposure);f.helper.dispose();
});


test('brightness adjusts raster exposure without changing lights or other profiles',()=>{
 const f=fixture(),light=f.fill.intensity;
 assert.equal(f.helper.getBrightness(),100);assert.equal(f.helper.setBrightness(65),65);assert.equal(f.renderer.toneMappingExposure,.65);
 assert.equal(f.helper.setBrightness(999),150);assert.equal(f.renderer.toneMappingExposure,1.5);
 assert.equal(f.helper.setBrightness(-5),25);assert.equal(f.renderer.toneMappingExposure,.25);
 assert.equal(f.helper.setBrightness(NaN),100);assert.equal(f.renderer.toneMappingExposure,1);assert.equal(f.fill.intensity,light);
 f.helper.dispose();assert.equal(f.renderer.toneMappingExposure,1);f.helper.setBrightness(50);assert.equal(f.renderer.toneMappingExposure,1);
});

test('restricted fullscreen has no photo engine dependency, loader, status or capture API',()=>{
 const source=readFileSync(new URL('../shared/lrf-3d/randal-presentation-rendering.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/randal-presentation-(?:progressive|path-policy|photo-finish)|import\s*\(|onPhotoCapture|onRenderStatus/);
 const f=fixture();for(const key of ['startPhotoRender','cancelPhotoRender','getPhotoCapture'])assert.equal(key in f.helper,false);
 const diagnostics=f.helper.diagnostics();assert.equal('progressive' in diagnostics,false);assert.equal('renderStatus' in diagnostics,false);f.helper.dispose();
});

test('brightness and reactivation stay on demand and never create a background rendering loop',()=>{
 const f=fixture(),model=new T.Group();model.add(new T.Mesh(new T.BoxGeometry(.8,.8,.45),new T.MeshStandardMaterial()));f.scene.add(model);f.helper.prepareModel(model);
 assert.equal(f.draws,0);assert.equal(f.invalidations,0);f.helper.setBrightness(110);assert.equal(f.invalidations,1);assert.equal(f.draws,0);f.helper.setBrightness(110);assert.equal(f.invalidations,1);
 f.helper.setActive(false);f.helper.render();assert.equal(f.draws,0);f.helper.setActive(true);assert.equal(f.draws,0);f.helper.render();assert.equal(f.draws,1);assert.equal(f.invalidations,1);f.helper.dispose();
});


test('reflection targets match the viewport aspect and hardware-bounded zoom definition across several mirrors',()=>{
 for(const input of [{memory:16,cores:12},{memory:8,cores:8},{mobile:true,memory:4,cores:4},{maxTextureSize:2048}]){
  const profile=presentationRenderProfile(input);
  for(const count of [1,2,4,8])for(const [width,height]of [[2560,1440],[900,1600]]){
   const size=presentationReflectionSize(profile,{width,height,ratio:1.5,zoomed:true,count,maxSamples:4});
   assert(size.width<=profile.reflectionMax&&size.height<=profile.reflectionMax);assert(size.width*size.height*count<=profile.reflectionPixels);
   const bytes=size.width*size.height*count*(8*4/3+4+size.samples*12);assert(bytes<=profile.reflectionBytes);assert(size.samples<=2);
   assert(Math.abs(size.width/size.height-width/height)<.12);
  }
 }
 const strong=presentationRenderProfile({memory:16,cores:12}),hd=presentationReflectionSize(strong,{width:2560,height:1440,ratio:1.5,zoomed:true,maxSamples:4});assert(hd.width>=3800);assert(hd.height>=2100);assert.equal(hd.samples,0);
});

test('zoom upgrades real reflected detail once and never reallocates at every gesture or when zooming back out',()=>{
 const f=fixture(),model=new T.Group(),target=new T.WebGLRenderTarget(64,64),mirror=new T.Mesh(new T.PlaneGeometry(.6,.8),new T.MeshBasicMaterial());let allocations=0;target.addEventListener('dispose',()=>allocations++);mirror.isReflector=true;mirror.getRenderTarget=()=>target;mirror.onBeforeRender=()=>{};model.add(mirror);f.scene.add(model);
 f.camera.aspect=16/9;f.camera.position.set(0,0,6);f.camera.lookAt(0,0,0);f.camera.updateProjectionMatrix();f.helper.resize(2400,1350);f.helper.prepareModel(model);const initial={width:target.width,height:target.height},before=allocations;
 assert.equal(initial.width,2048);assert(initial.height<initial.width);assert.equal(target.texture.minFilter,T.LinearMipmapLinearFilter);assert.equal(target.texture.magFilter,T.LinearFilter);assert.equal(target.texture.generateMipmaps,true);assert.equal(target.texture.anisotropy,16);
 f.camera.position.z=1.4;f.camera.updateMatrixWorld();f.helper.render();assert(target.width>initial.width);assert(target.width*target.height<=8300000);assert.equal(allocations,before+1);const upgraded=[target.width,target.height];
 for(const distance of [1.3,1.42,1.5,1.45,6,6.1]){f.camera.position.z=distance;f.camera.updateMatrixWorld();f.helper.render();assert.deepEqual([target.width,target.height],upgraded);}
 f.helper.prepareModel(model);assert.equal(allocations,before+1);f.helper.dispose();target.dispose();
});

test('finish filtering preserves native 4K pixels and uses mipmaps and supported anisotropy without inventing detail',()=>{
 const f=fixture(),image={width:4096,height:2048},texture=new T.Texture(image);f.renderer.capabilities.getMaxAnisotropy=()=>4;
 f.helper.fitTexture(texture);assert.equal(texture.image,image);assert.equal(texture.image.width,4096);assert.equal(texture.generateMipmaps,true);assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);assert.equal(texture.magFilter,T.LinearFilter);assert.equal(texture.anisotropy,4);f.helper.dispose();texture.dispose();
});


test('Chromium eight-GB privacy bucket reaches 4K reflections only with sufficient CPU and GPU limits',()=>{
 const profile=presentationRenderProfile({memory:8,cores:8,maxTextureSize:8192});
 assert.equal(profile.pixels,8300000);assert.equal(profile.reflectionPixels,8300000);assert.equal(profile.reflectionBytes,160*1024*1024);
 const size=presentationReflectionSize(profile,{width:2560,height:1440,ratio:1.5,zoomed:true,maxSamples:4});
 assert(size.width>=3840&&size.height>=2160);assert(size.width*size.height<=8300000);assert.equal(size.samples,0);
 for(const limits of [{memory:4,cores:8,maxTextureSize:8192},{memory:8,cores:4,maxTextureSize:8192},{memory:8,cores:8,maxTextureSize:4096},{mobile:true,memory:8,cores:8,maxTextureSize:8192}]){
  const bounded=presentationRenderProfile(limits);assert(bounded.reflectionPixels<8300000);assert(bounded.pixels<8300000);
 }
});

test('fullscreen reads the capped browser hardware report and allocates a 3840-by-2160 zoom target',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');let f,target;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{deviceMemory:8,hardwareConcurrency:8}});
 try{
  f=fixture();f.camera.aspect=16/9;f.camera.position.set(0,0,1.4);f.camera.lookAt(0,0,0);f.camera.updateProjectionMatrix();f.helper.resize(2560,1440);
  const group=new T.Group(),mirror=new T.Mesh(new T.PlaneGeometry(.6,.8),new T.MeshBasicMaterial());target=new T.WebGLRenderTarget(64,64);mirror.isReflector=true;mirror.getRenderTarget=()=>target;mirror.onBeforeRender=()=>{};group.add(mirror);f.scene.add(group);f.helper.prepareModel(group);
  assert.equal(f.helper.profile.pixels,8300000);assert.equal(target.width,3840);assert.equal(target.height,2160);assert.equal(target.samples,0);
 }finally{f?.helper.dispose();target?.dispose();if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}
});
