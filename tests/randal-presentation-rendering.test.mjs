import {test} from 'node:test';
import assert from 'node:assert/strict';
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

function fixture({duration=2,floatTargets=false,loadProgressive}={}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),sun=new T.DirectionalLight('#fff',.9),fill=new T.HemisphereLight('#fff','#888',.35);scene.add(sun,fill);
 const listeners=new Map(),controlListeners=new Map(),sizes=[],statuses=[],size=new T.Vector2(1,1);let pixelRatio=1,draws=0,clock=0;
 const canvas={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 const renderer={capabilities:{maxTextureSize:8192,getMaxAnisotropy:()=>16},extensions:{has:()=>floatTargets},toneMappingExposure:1,getPixelRatio:()=>pixelRatio,setPixelRatio:v=>pixelRatio=v,getSize:v=>v.copy(size),setSize(w,h){size.set(w,h);sizes.push([w,h]);},render(){draws++;},shadowMap:{}};
 const controls={addEventListener:(type,fn)=>controlListeners.set(type,fn),removeEventListener:type=>controlListeners.delete(type)};
 const helper=createPresentationRendering({renderer,scene,camera,controls,canvas,sun,invalidate(){},onRenderStatus:s=>statuses.push(s),loadProgressive,now(){clock+=duration;return clock;}});
 return {helper,scene,sun,fill,renderer,listeners,controlListeners,sizes,statuses,get draws(){return draws;}};
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


test('brightness adjusts the common raster and path-tracer exposure without changing lights or other profiles',()=>{
 const f=fixture(),light=f.fill.intensity;
 assert.equal(f.helper.getBrightness(),100);assert.equal(f.helper.setBrightness(65),65);assert.equal(f.renderer.toneMappingExposure,.65);
 assert.equal(f.helper.setBrightness(999),150);assert.equal(f.renderer.toneMappingExposure,1.5);
 assert.equal(f.helper.setBrightness(-5),25);assert.equal(f.renderer.toneMappingExposure,.25);
 assert.equal(f.helper.setBrightness(NaN),100);assert.equal(f.renderer.toneMappingExposure,1);assert.equal(f.fill.intensity,light);
 f.helper.dispose();assert.equal(f.renderer.toneMappingExposure,1);f.helper.setBrightness(50);assert.equal(f.renderer.toneMappingExposure,1);
});

const withWorker=async fn=>{const previous=globalThis.Worker;globalThis.Worker=class{};try{return await fn();}finally{if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;}};
function prepareFurniture(f){const group=new T.Group();group.add(new T.Mesh(new T.BoxGeometry(.8,.8,.45),new T.MeshStandardMaterial()));f.scene.add(group);f.helper.prepareModel(group);}

test('photo engine import is manual-only and changes cancel synchronously without automatic restart',()=>withWorker(async()=>{
 let imports=0,starts=0,changes=0,cancels=0,disposed=0;
 const engine={start:async()=>{starts++;return true;},changed:()=>changes++,cancel:()=>cancels++,getPhotoCapture:()=>null,setActive(){},diagnostics:()=>({}),dispose:()=>disposed++};
 const f=fixture({floatTargets:true,loadProgressive:async()=>{imports++;return {createProgressivePresentation:()=>engine};}});prepareFurniture(f);for(let i=0;i<5;i++)f.helper.render();f.helper.setActive(false);f.helper.setActive(true);assert.equal(imports,0);assert.equal(starts,0);assert.equal(f.statuses.length,0);
 assert.equal(await f.helper.startPhotoRender(),true);assert.equal(imports,1);assert.equal(starts,1);const before=changes;f.controlListeners.get('change')();assert.equal(changes,before+1);f.helper.setBrightness(80);assert.equal(changes,before+2);f.helper.render();assert.equal(starts,1);assert.equal(imports,1);f.helper.cancelPhotoRender();assert.equal(cancels,1);f.helper.dispose();assert.equal(disposed,1);assert.equal(f.controlListeners.size,0);
}));

test('a changed composition or closed fullscreen cancels pending module import before any worker allocation',()=>withWorker(async()=>{
 for(const close of [false,true]){let resume,created=0;const f=fixture({floatTargets:true,loadProgressive:()=>new Promise(resolve=>resume=resolve)});prepareFurniture(f);const pending=f.helper.startPhotoRender();if(close)f.helper.dispose();else f.controlListeners.get('change')();resume({createProgressivePresentation(){created++;throw Error('stale request allocated');}});assert.equal(await pending,false);assert.equal(created,0);f.helper.dispose();}
}));

test('an unsupported device reports unavailability only when photo is requested and never imports the engine',async()=>{
 let imported=false;const f=fixture({loadProgressive:async()=>{imported=true;}});prepareFurniture(f);f.helper.render();assert.equal(f.statuses.length,0);assert.equal(await f.helper.startPhotoRender(),false);assert.equal(imported,false);assert.equal(f.statuses.at(-1).mode,'fallback');assert.equal(f.statuses.at(-1).available,false);f.helper.dispose();
});
