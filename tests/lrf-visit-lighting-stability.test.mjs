import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {AdaptiveQuality,interactionProfile} from '../shared/lrf-3d/performance.js';
import {RenderActivity} from '../shared/lrf-3d/render-activity.js';
import {AdaptiveQuality as AnimaQuality} from '../functions/neobath-anima/studio-adapter/render-quality.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

const studio=readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8');
const variants=[
 ['Studio One',studio,AdaptiveQuality],
 ['Catalogue Général',readFileSync(new URL('../randal-general/src/app.js',import.meta.url),'utf8'),AdaptiveQuality],
 ['Neobath Anima',transformCommonStudioSource(studio,'app.js'),AnimaQuality]
];

// Execute the actual native controllers, including Anima's build-time adapted
// controller. A camera-only visit must keep the optical recipe and cached
// shadows; a physical drawer/window animation must still invalidate its map.
for(const [name,source,Quality] of variants){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const body=identifier=>{
  const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===identifier);
  assert.ok(node,`${name} production ${identifier}`);
  return source.slice(node.start,node.end);
 };
 function fixture(mode='balanced'){
  const quality=new Quality();quality.setMode(mode);
  const counts={lights:0,reflectionResets:0,glass:0,render:0,ultra:0,raf:0};
  const shadowUpdates=[];
  let context;
  const draw=kind=>{counts[kind]++;shadowUpdates.push(context.renderer.shadowMap.needsUpdate);};
  context=vm.createContext({unrealRender:null,
   quality,renderActivity:new RenderActivity(),interactionProfile,captureBusy:false,isMobile:false,
   renderer:{shadowMap:{enabled:true,autoUpdate:false,needsUpdate:false},transmissionResolutionScale:quality.profile.transmission,toneMappingExposure:.84,render:()=>draw('render')},
   ultraPipeline:{render:()=>draw('ultra')},
   scene:{environmentIntensity:.351},camera:{position:new T.Vector3(0,1.5,1)},roomGroup:{visible:true},roomScene:null,showroomLighting:null,wall:{visible:true},
   composition:{items:[]},profileAsset:null,plinthAsset:null,
   applyArchitecturalGlass:()=>counts.glass++,fitCompositionLights:()=>counts.lights++,
   shadowsDirty:false,sceneRevision:7,
   state:{ready:true,orbit:false},document:{hidden:false},running:true,lastTime:0,lastMove:1000,frames:0,
   walkMode:{active:true,tick:()=>false},visitorAvatar:{tick:()=>false},
   controls:{update:()=>false,target:new T.Vector3(0,1.5,0)},viewTween:null,
   dragController:null,partitionDragController:null,productDragController:null,
   renderDimensions(){},applyQuality(){},prepareActiveTextures:async()=>{},
   requestAnimationFrame:()=>counts.raf++,reduced:false,drawerTravel:()=>.3,
   updateWindowMotion:()=>false
  });
  vm.runInContext(['renderProfile','applyRenderPhase','animate'].map(body).join('\n'),context);
  return {context,counts,shadowUpdates,run:code=>vm.runInContext(code,context)};
 }

 for(const mode of ['fluid','balanced','max'])test(`${name}: ${mode} walking keeps the same shadow, transmission and AO recipe`,()=>{
  const f=fixture(mode),c=f.context,p=c.quality.profile;
  c.applyRenderPhase();
  const stable={exposure:c.renderer.toneMappingExposure,environment:c.scene.environmentIntensity,revision:c.sceneRevision};
  f.counts.lights=f.counts.reflectionResets=f.counts.glass=0;
  c.composition.items=[{asset:{reflector:{userData:{reflectionSchedule:{reset:()=>f.counts.reflectionResets++}}}}}];
  for(const [time,moving] of [[100,true],[140,true],[320,false]]){
   c.renderActivity.update(time,moving);c.applyRenderPhase();
   assert.equal(c.renderer.shadowMap.enabled,true,'sampling existing shadows must remain enabled while the camera moves');
   assert.equal(c.renderProfile().shadow,p.shadow,'the window sun cannot become unoccluded during a gesture');
   assert.equal(c.renderProfile().ao,p.ao,'Ultra must not switch from contact occlusion to a brighter renderer path');
   assert.equal(c.renderer.transmissionResolutionScale,p.transmission,'gesture changes must not resize the transmission target');
   assert.equal(c.renderer.toneMappingExposure,stable.exposure);assert.equal(c.scene.environmentIntensity,stable.environment);
   assert.equal(c.shadowsDirty,false,'camera phases reuse cached shadow maps');
   assert.equal(c.sceneRevision,stable.revision,'view movement is not a geometry change');
   if(moving)assert.equal(f.counts.reflectionResets,0,'starting motion must not force all mirrors to capture simultaneously');
  }
  assert.equal(f.counts.lights,0,'the physical light fit is unchanged by start/stop');
  assert.equal(f.counts.reflectionResets,1,'one settled capture must refresh a camera view left behind by mirror throttling');
 });

 test(`${name}: first-person camera motion reuses cached shadows and retains the Ultra pass`,()=>{
  const f=fixture('max'),c=f.context;
  c.walkMode.tick=()=>true;c.animate(1000);c.animate(1016);
  c.walkMode.tick=()=>false;c.animate(1196);
  assert.equal(f.counts.ultra,3);assert.equal(f.counts.render,0);
  assert.ok(f.shadowUpdates.every(value=>value===false),'walking does not change physical shadow occluders');
  assert.equal(f.counts.lights,0);assert.equal(c.sceneRevision,7);assert.equal(c.renderer.shadowMap.enabled,true);
 });

 test(`${name}: a camera viewpoint tween does not masquerade as moving scene geometry`,()=>{
  const f=fixture(),c=f.context;
  c.viewTween={start:1000,duration:850,from:new T.Vector3(0,1.5,1),to:new T.Vector3(1,1.5,2),fromTarget:new T.Vector3(),toTarget:new T.Vector3(0,1,0)};
  c.animate(1100);c.animate(1200);
  assert.ok(c.camera.position.x>0,'the native camera really moved');
  assert.ok(f.shadowUpdates.every(value=>value===false),'a viewpoint tween must not recapture the physical shadow map');
  assert.equal(f.counts.lights,0);assert.equal(c.sceneRevision,7);
 });

 test(`${name}: moving physical drawers still update shadows`,()=>{
  const f=fixture(),c=f.context;
  const drawer={position:{z:0}};
  c.composition.items=[{type:'cabinet',settings:{drawers:[1]},motion:{drawers:[0]},asset:{drawers:[drawer]}}];
  c.animate(1000);
  assert.ok(drawer.position.z>0,'the actual drawer animation advanced');
  assert.ok(f.shadowUpdates.includes(true),'a drawer is a moving shadow occluder');
  assert.ok(c.sceneRevision>7,'mirrors must observe the geometry revision');
 });

 test(`${name}: opening physical windows still update shadows`,()=>{
  const f=fixture(),c=f.context;
  let windowTicks=0;
  c.composition.items=[{type:'window',asset:{}}];c.updateWindowMotion=()=>{windowTicks++;return true;};
  c.animate(1000);
  assert.equal(windowTicks,1);assert.ok(f.shadowUpdates.includes(true),'opening leaves move in the real scene');
  assert.ok(c.sceneRevision>7);
 });
}
