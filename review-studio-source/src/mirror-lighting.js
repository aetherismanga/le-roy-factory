import * as T from 'three';
import {mirrorSpec} from './mirrors.js';

// Two bounded area lights per mirror, no extra shadow maps. The soft wall halo
// is an analytic raster approximation; the actual lights also illuminate PBR
// surfaces. Reflection remains the separate, genuine planar reflector.
export function applyMirrorLighting(item,lightweight=false){
 if(item?.type!=='mirror')return;
 const spec=mirrorSpec(item.settings),root=item.asset.root,enabled=!!(item.settings.led&&(spec.led||spec.metal));
 let group=root.getObjectByName('Eclairage_LED');
 if(!group){
  group=new T.Group();group.name='Eclairage_LED';root.add(group);
  const back=new T.RectAreaLight('#ffe8d0',6,spec.width*.86,spec.height*.86);back.name='Retro_eclairage';back.position.z=-.021;group.add(back);
  const front=new T.RectAreaLight('#fff2e3',spec.id==='zen'?2.5:1.8,spec.width*.8,spec.id==='zen'?.018:spec.height*.7);front.name='Eclairage_visage';front.position.set(0,spec.id==='zen'?spec.height/2-.035:0,.016);front.rotation.y=Math.PI;group.add(front);
  const margin=.28,w=spec.width,h=spec.height,r=spec.shape==='round'?w/2:spec.shape==='capsule'?w/2:spec.shape==='rounded'?.025:.004;
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending,uniforms:{size:{value:new T.Vector2(w,h)},radius:{value:r},extent:{value:new T.Vector2(w+margin*2,h+margin*2)},tint:{value:new T.Color('#ffe1b6')}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 vUv;uniform vec2 size;uniform vec2 extent;uniform float radius;uniform vec3 tint;
   void main(){vec2 q=abs((vUv-.5)*extent)-(size*.5-vec2(radius));float d=length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;if(d<-.006)discard;float a=.34*exp(-pow(max(d,0.0)/.048,1.35))+.075*exp(-pow(max(d,0.0)/.13,1.5));if(a<.001)discard;gl_FragColor=vec4(tint,a);}`});
  const halo=new T.Mesh(new T.PlaneGeometry(w+margin*2,h+margin*2),material);halo.name='Halo_mural_LED';halo.position.z=-.0275;halo.raycast=()=>{};group.add(halo);
 }
 group.visible=enabled;
 for(const name of ['Retro_eclairage','Eclairage_visage'])group.getObjectByName(name).visible=enabled&&!lightweight;
 const ring=root.getObjectByName('Anneau_LED');if(ring){ring.visible=enabled;ring.traverse(o=>{if(o.isMesh){o.material.color.setRGB(2.8,2.25,1.65);o.material.toneMapped=true;}});}
 return group;
}
