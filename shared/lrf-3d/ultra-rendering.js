import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Vector2} from 'three';
// Screen-space contact occlusion is reserved for the explicitly selected
// Ultra HD tier. Standard and Light allocate none of these render targets.
export function createUltraPipeline(renderer,scene,camera){
 const size=renderer.getSize(new Vector2());let lastWidth=size.x,lastHeight=size.y,lastRatio=renderer.getPixelRatio();
 const half=value=>Math.max(1,Math.round(value*.5));
 const composer=new EffectComposer(renderer),beauty=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera,half(lastWidth*lastRatio),half(lastHeight*lastRatio)),output=new OutputPass(),antialias=new ShaderPass(FXAAShader);
 // Composer sizes every pass, including during setPixelRatio(). Keep all
 // three GTAO buffers at their intended half resolution throughout that
 // lifecycle instead of allocating full buffers and immediately shrinking.
 const sizeAO=ao.setSize.bind(ao);ao.setSize=(width,height)=>sizeAO(half(width),half(height));
 ao.output=GTAOPass.OUTPUT.Default;ao.blendIntensity=.35;ao.updateGtaoMaterial({radius:.12,thickness:.06,distanceFallOff:.4,samples:16,screenSpaceRadius:false});
 // Transparent panes must not become opaque occluders in the normal/depth
 // prepass. Mirrors keep their plane but never capture during override passes.
 const original=ao._renderOverride.bind(ao);ao._renderOverride=(...args)=>{const panes=[];scene.traverseVisible(o=>{if(o.isMesh&&[...(Array.isArray(o.material)?o.material:[o.material])].some(m=>m.userData?.architecturalGlass)){panes.push(o);o.visible=false;}});try{return original(...args);}finally{panes.forEach(o=>o.visible=true);}};
 composer.addPass(beauty);composer.addPass(ao);composer.addPass(output);composer.addPass(antialias);
 antialias.material.uniforms.resolution.value.set(1/(lastWidth*lastRatio),1/(lastHeight*lastRatio));
 return {composer,ao,resize(width,height,ratio){
  if(width===lastWidth&&height===lastHeight&&ratio===lastRatio)return;
  const ratioChanged=ratio!==lastRatio,dimensionsChanged=width!==lastWidth||height!==lastHeight;
  lastWidth=width;lastHeight=height;lastRatio=ratio;
  if(ratioChanged)composer.setPixelRatio(ratio);
  if(dimensionsChanged)composer.setSize(width,height);
  antialias.material.uniforms.resolution.value.set(1/(width*ratio),1/(height*ratio));
 },render(dt){composer.render(dt);},dispose(){ao.dispose();ao.gtaoMaterial.dispose();ao.blendMaterial.dispose();output.dispose();antialias.dispose();beauty.dispose();composer.dispose();}};
}
// A scene may contain several physical glazing recipes and many panes may
// share one material. Capture the native recipe only on entry into Light;
// repeated traversal must never capture the already simplified values.
const lightweightGlassState=new WeakMap();
export function applyArchitecturalGlass(scene,lightweight){
 if(!scene)return;
 scene.traverse(object=>{
  if(!object.isMesh)return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!material?.userData?.architecturalGlass)continue;
   let native=lightweightGlassState.get(material);
   if(lightweight){if(!native){native={transmission:material.transmission,opacity:material.opacity};lightweightGlassState.set(material,native);}}
   else{if(!native)continue;lightweightGlassState.delete(material);}
   const transmission=lightweight?0:native.transmission,opacity=lightweight?.25:native.opacity;
   if(material.transmission!==transmission||material.opacity!==opacity){material.transmission=transmission;material.opacity=opacity;material.needsUpdate=true;}
  }
 });
}
