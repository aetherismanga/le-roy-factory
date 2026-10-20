import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
// Screen-space contact occlusion is reserved for the explicitly selected
// Ultra HD tier. Standard and Light allocate none of these render targets.
export function createUltraPipeline(renderer,scene,camera){
 const composer=new EffectComposer(renderer),beauty=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera),output=new OutputPass(),antialias=new ShaderPass(FXAAShader);
 ao.output=GTAOPass.OUTPUT.Default;ao.blendIntensity=.35;ao.updateGtaoMaterial({radius:.12,thickness:.06,distanceFallOff:.4,samples:16,screenSpaceRadius:false});
 // Transparent panes must not become opaque occluders in the normal/depth
 // prepass. Mirrors keep their plane but never capture during override passes.
 const original=ao._renderOverride.bind(ao);ao._renderOverride=(...args)=>{const panes=[];scene.traverseVisible(o=>{if(o.isMesh&&[...(Array.isArray(o.material)?o.material:[o.material])].some(m=>m.userData?.architecturalGlass)){panes.push(o);o.visible=false;}});try{return original(...args);}finally{panes.forEach(o=>o.visible=true);}};
 composer.addPass(beauty);composer.addPass(ao);composer.addPass(output);composer.addPass(antialias);
 return {composer,ao,resize(width,height,ratio){composer.setPixelRatio(ratio);composer.setSize(width,height);ao.setSize(Math.max(1,Math.round(width*ratio*.5)),Math.max(1,Math.round(height*ratio*.5)));antialias.material.uniforms.resolution.value.set(1/(width*ratio),1/(height*ratio));},render(dt){composer.render(dt);},dispose(){ao.dispose();ao.gtaoMaterial.dispose();ao.blendMaterial.dispose();output.dispose();antialias.dispose();beauty.dispose();composer.dispose();}};
}
export function applyArchitecturalGlass(scene,lightweight){if(!scene)return;scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m?.userData?.architecturalGlass)continue;const transmission=lightweight?0:.82,opacity=lightweight?.25:1;if(m.transmission!==transmission||m.opacity!==opacity){m.transmission=transmission;m.opacity=opacity;m.needsUpdate=true;}}});}
