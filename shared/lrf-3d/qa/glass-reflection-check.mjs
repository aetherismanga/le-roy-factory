import assert from 'node:assert/strict';
import * as T from 'three';
import {glassPlaneSpec,createGlassReflections} from '../glass-reflection.js';

const front=glassPlaneSpec(new T.BoxGeometry(1.2,2,.008));
assert.equal(front.axis,'z');assert(Math.abs(front.width-1.2)<1e-7);assert.equal(front.height,2);
const side=glassPlaneSpec(new T.BoxGeometry(.008,2,.4));
assert.equal(side.axis,'x');assert(Math.abs(side.width-.4)<1e-7);
assert.equal(glassPlaneSpec(new T.BoxGeometry(1,1,1)),null,'Only thin glazing receives a planar reflection');

const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,1,.035,50);
camera.position.set(0,1.1,3);camera.lookAt(0,1.1,0);camera.updateMatrixWorld();
const glassMaterial=new T.MeshPhysicalMaterial({transmission:.82,transparent:true,thickness:.008});
glassMaterial.userData.architecturalGlass=true;
const panes=[];
for(let i=0;i<5;i++){const pane=new T.Mesh(new T.BoxGeometry(.9,2,.008),glassMaterial);pane.position.set((i-2)*.35,1,0);scene.add(pane);panes.push(pane);}
const mirror=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial());mirror.isReflector=true;scene.add(mirror);
const visitor=new T.Group();visitor.name='Visitor';visitor.position.set(0,0,3);visitor.visible=false;scene.add(visitor);
const originalTarget={name:'original'},renders=[];let target=originalTarget,throwCapture=false;
const renderer={
 capabilities:{maxTextureSize:2048},xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:true,
 getRenderTarget:()=>target,setRenderTarget:value=>{target=value;},
 state:{buffers:{depth:{setMask(){}}},viewport(){}},
 render(current,virtualCamera){
  assert.equal(current,scene);assert.equal(visitor.visible,true,'Capture wrapper exposes visitor only to reflection camera');
  assert.equal(mirror.visible,false,'Mirror is excluded from glass capture');
  assert.equal(renderer.xr.enabled,false);assert.equal(renderer.shadowMap.autoUpdate,false);
  assert(virtualCamera.position.z<0,'Real camera is reflected through the glass plane');
  const projected=new T.Vector3(0,1.1,2.8).project(virtualCamera);assert(projected.z>=-1&&projected.z<=1,'Oblique plane retains the visitor on the camera side');
  if(throwCapture)throw Error('simulated context loss');
  renders.push(virtualCamera.position.clone());
 }
};
const manager=createGlassReflections({scene,renderer,camera,maxPlanes:2,captureScene:(_reflector,capture)=>{
 const previous=visitor.visible;visitor.visible=true;try{return capture();}finally{visitor.visible=previous;}
}});
manager.sync(false);assert.equal(manager.update(0,'initial',{size:512}),0);assert.equal(manager.diagnostics().targets,0);
manager.sync(true);assert.equal(manager.diagnostics().panes,5);assert.equal(manager.update(0,'initial',{size:512}),2);
assert.equal(manager.diagnostics().targets,2,'GPU targets bounded independently of pane count');
const initialScans=manager.diagnostics().scans;
for(let i=0;i<20;i++)manager.sync(true);
assert.equal(manager.diagnostics().scans,initialScans,'Unchanged scene topology is not rescanned on animation frames');
const nested=new T.Group();scene.add(nested);const added=new T.Mesh(new T.BoxGeometry(.6,1,.008),glassMaterial);nested.add(added);manager.sync(true);
assert.equal(manager.diagnostics().panes,6,'Nested additions discovered while Ultra visit is active');
added.removeFromParent();manager.sync(true);assert.equal(manager.diagnostics().panes,5,'Nested removals release scene membership');nested.removeFromParent();manager.sync(true);
assert.equal(visitor.visible,false);assert.equal(mirror.visible,true);assert.equal(target,originalTarget);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
assert.equal(glassMaterial.transmission,.82,'Original glass transmission is preserved');
assert.equal(manager.update(100,'initial',{size:512}),0,'Static scenes reuse captured textures');
assert.equal(manager.update(110,'moving',{size:512}),2,'Avatar animation invalidation refreshes both panes');
assert.equal(manager.update(111,'moving-again',{size:512}),0,'Captures are rate limited');
let overlays=[];scene.traverse(object=>{if(object.userData.glassReflection)overlays.push(object);});assert.equal(overlays.length,2);
assert(overlays.every(overlay=>overlay.visible));
assert.throws(()=>manager.withHidden(()=>{assert(overlays.every(overlay=>!overlay.visible));throw Error('interrupted mirror');}));
assert(overlays.every(overlay=>overlay.visible),'Mirror capture visibility restored after failure');
assert.equal(manager.update(200,'resize',{size:1024}),2);assert(overlays.every(overlay=>overlay.getRenderTarget().width===1024));
throwCapture=true;const warn=console.warn;console.warn=()=>{};
try{manager.update(300,'failure',{size:512});}finally{console.warn=warn;}
assert(manager.diagnostics().failure.includes('context loss'));assert(overlays.every(overlay=>!overlay.visible),'Failed textures never appear');
assert.equal(visitor.visible,false);assert.equal(mirror.visible,true);assert.equal(target,originalTarget);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
let released=0;for(const overlay of overlays)overlay.getRenderTarget().addEventListener('dispose',()=>released++);
manager.sync(false);assert.equal(released,2);assert.equal(manager.diagnostics().targets,0);assert.equal(manager.diagnostics().panes,0);assert(overlays.every(overlay=>!overlay.parent));
assert.equal(scene._listeners?.childadded?.length||0,0,'Topology listeners released when Ultra visit ends');
manager.dispose();manager.sync(true);assert.equal(manager.update(1000,'after-dispose'),0);
console.log(JSON.stringify({passed:true,checks:['two pane orientations','genuine reflected camera and visitor clipping','explicit activation','bounded GPU targets','cached topology scan with nested addition/removal discovery','preserved transmission','animation invalidation and frame budget','failed captures stay invisible','renderer and visibility restoration','Ultra exit disposes GPU targets and listeners']},null,2));
