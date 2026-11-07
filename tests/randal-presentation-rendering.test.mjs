import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {presentationRenderProfile,createPresentationRendering} from '../shared/lrf-3d/randal-presentation-rendering.js';

test('fullscreen budgets reserve half-resolution contact occlusion and HD material sources for capable desktops',()=>{
 const desktop=presentationRenderProfile({memory:16,cores:12});
 assert.equal(desktop.ao,true);assert.equal(desktop.texture,'max');assert.equal(desktop.shadow,4096);assert.equal(desktop.reflection,1024);
 for(const limits of [{mobile:true},{memory:4},{cores:2},{maxTextureSize:2048}]){
  const profile=presentationRenderProfile(limits);assert.equal(profile.ao,false);assert.equal(profile.texture,'balanced');assert.ok(profile.reflection<=512);assert.ok(profile.pixels<=1500000);
 }
 assert.equal(presentationRenderProfile({floatTargets:false}).ao,false);
});

function fixture({duration=2,floatTargets=false}={}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),sun=new T.DirectionalLight('#fff',.9),fill=new T.HemisphereLight('#fff','#888',.35);scene.add(sun,fill);
 const listeners=new Map(),sizes=[],size=new T.Vector2(1,1);let pixelRatio=1,draws=0,clock=0,invalidations=0;
 const canvas={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 const renderer={capabilities:{maxTextureSize:8192,getMaxAnisotropy:()=>16},extensions:{has:()=>floatTargets},toneMappingExposure:1,getPixelRatio:()=>pixelRatio,setPixelRatio:v=>pixelRatio=v,getSize:v=>v.copy(size),setSize(w,h){size.set(w,h);sizes.push([w,h]);},render(){draws++;},shadowMap:{}};
 const helper=createPresentationRendering({renderer,scene,camera,canvas,sun,invalidate(){invalidations++;},now(){clock+=duration;return clock;}});
 return {helper,scene,sun,fill,renderer,listeners,sizes,get draws(){return draws;},get invalidations(){return invalidations;}};
}

test('fullscreen rendering is on demand, identical resizes do not reallocate and context loss suspends draws',()=>{
 const f=fixture();f.helper.resize(1600,900);for(let i=0;i<10;i++)f.helper.resize(1600,900);assert.equal(f.sizes.length,1);
 assert.equal(f.draws,0);f.helper.render();assert.equal(f.draws,1);assert.ok(f.helper.diagnostics().pixels<=5000000);
 let prevented=false;f.listeners.get('webglcontextlost')({preventDefault(){prevented=true;}});f.helper.render();assert.equal(f.draws,1);assert.equal(prevented,true);assert.equal(f.helper.diagnostics().contextLost,true);
 const bright=f.fill.intensity;f.helper.dispose();assert.equal(f.listeners.size,0);assert.equal(f.fill.intensity,.35);assert.notEqual(bright,f.fill.intensity);f.helper.render();assert.equal(f.draws,1);
});

test('real physical furniture and reflectors retain their materials while override passes never trigger mirror captures',()=>{
 const f=fixture(),model=new T.Group(),material=new T.MeshPhysicalMaterial({roughness:.37,clearcoat:.15}),cabinet=new T.Mesh(new T.BoxGeometry(.8,.8,.45),material);model.add(cabinet);let reflected=0;
 const target=new T.WebGLRenderTarget(64,64),mirror=new T.Mesh(new T.PlaneGeometry(.5,.8),new T.MeshBasicMaterial());mirror.isReflector=true;mirror.getRenderTarget=()=>target;mirror.onBeforeRender=()=>reflected++;model.add(mirror);f.scene.add(model);
 f.helper.prepareModel(model);f.helper.prepareModel(model);assert.equal(cabinet.material,material);assert.equal(material.roughness,.37);assert.equal(material.clearcoat,.15);assert.equal(target.width,1024);
 mirror.onBeforeRender();assert.equal(reflected,1);f.scene.overrideMaterial=new T.MeshNormalMaterial();mirror.onBeforeRender();assert.equal(reflected,1);f.scene.overrideMaterial=null;
 assert.ok(f.sun.shadow.camera.left<-.8&&f.sun.shadow.camera.right>.8);f.helper.dispose();target.dispose();
});

test('sustained expensive renders reduce memory once and keep the scene lighting and material exposure stable',()=>{
 const f=fixture({duration:65});f.helper.resize(1920,1080);const surfaceQuality=f.helper.surfaceQuality(),intensity=f.fill.intensity,exposure=f.renderer.toneMappingExposure;
 for(let i=0;i<20;i++)f.helper.render();const state=f.helper.diagnostics();assert.equal(state.downgrades,1);assert.equal(state.profile,'presentation-balanced');assert.ok(state.pixels<=1500000);assert.equal(f.helper.surfaceQuality(),surfaceQuality);assert.equal(surfaceQuality.maxSurfaceFaces,1);assert.equal(surfaceQuality.textureProfile,'balanced');assert.equal(f.fill.intensity,intensity);assert.equal(f.renderer.toneMappingExposure,exposure);f.helper.dispose();
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
