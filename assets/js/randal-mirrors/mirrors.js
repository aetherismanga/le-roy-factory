/* Product-shaped LED diffusers and real planar reflections, without photometric claims. */
(()=>{'use strict';
function shape(T,w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
class Mirrors{
 constructor(T,renderer,scene,invalidate){Object.assign(this,{T,renderer,scene,invalidate});this.targets=new Map();this.mirrors=new Set();this.frame=0;this.reflecting=false;this.originalRender=renderer.render.bind(renderer);this.wrapper=(s,c)=>{if(!this.reflecting)this.frame++;return this.originalRender(s,c)};renderer.render=this.wrapper;
  this.rig=new T.Group();this.rig.name='reflection-room';
  // Mirror only: opposite tiled wall and towel rail, without a fake window.
  const plane=(w,h,x,y,z,color,parent=this.rig)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}));m.position.set(x,y,z);m.layers.set(30);m.raycast=()=>{};parent.add(m);return m};
  this.reflectionWall=plane(3,2.5,0,1.25,0,'#ece7dd');
  this.towel=new T.Group();this.rig.add(this.towel);
  plane(.56,.76,0,.96,-.055,'#e8e1d6',this.towel);
  plane(.50,.12,0,.64,-.066,'#d8cfc3',this.towel);
  plane(.66,.027,0,1.36,-.085,'#929795',this.towel);
  plane(.024,.06,-.32,1.34,-.078,'#929795',this.towel);
  plane(.024,.06,.32,1.34,-.078,'#929795',this.towel);
  scene.add(this.rig);
 }
 setRoom(size,wall,back=-.245){
  if(!size||!this.reflectionWall)return;
  this.rig.position.z=back+size.depth-.04;
  this.reflectionWall.position.y=size.height/2;
  const params=this.reflectionWall.geometry.parameters;
  if(params.width!==size.width||params.height!==size.height){
   this.reflectionWall.geometry.dispose();
   this.reflectionWall.geometry=new this.T.PlaneGeometry(size.width,size.height);
  }
  this.towel.position.x=Math.min(1.2,size.width*.3);
  const dest=this.reflectionWall.material,source=wall?.material;
  if(source&&(dest.map!==source.map||dest.color.getHex()!==source.color.getHex())){
   dest.map=source.map||null;dest.color.copy(source.color);dest.needsUpdate=true;
  }
 }
 target(key){let e=this.targets.get(key);if(!e){if(this.targets.size>=4){const[k,v]=this.targets.entries().next().value;v.target.dispose();this.targets.delete(k)}const T=this.T,n=innerWidth<1100?256:512;e={target:new T.WebGLRenderTarget(n,n,{type:this.renderer.capabilities.isWebGL2?T.HalfFloatType:T.UnsignedByteType}),frame:-1};this.targets.set(key,e)}return e}
 create(name,w,h,{on=false,frameColor='#b7bbb8',wallZ=-.014}={}){const T=this.T,g=new T.Group(),round=/rond/i.test(name),capsule=/cápsula|capsula/i.test(name),metal=/métallique|metallique/i.test(name),led=/LED/i.test(name),zen=/Zen/i.test(name),r=round||capsule?w/2:metal?.035:.005,border=metal?.012:.004;
  g.name='mirror-visual';const back=new T.Mesh(new T.ExtrudeGeometry(shape(T,w,h,r),{depth:.018,bevelEnabled:false,curveSegments:40}),new T.MeshStandardMaterial({color:frameColor,metalness:metal?.8:.05,roughness:metal?.3:.6}));back.position.z=-.01;g.add(back);
  const glass=new window.RandalReflector(new T.ShapeGeometry(shape(T,w-border*2,h-border*2,Math.max(0,r-border)),40),{manager:this,color:'#bcbcbc',clipBias:.002,multisample:0});glass.position.z=.012;glass.name='mirror-reflective-glass';g.add(glass);
  Object.assign(g.userData,{ledCapable:led,ledOn:on,ledProgress:on?1:0,ledObjects:[],style:zen?'front-strip':led?'backlit':'unlit'});
  if(led){const mat=new T.MeshBasicMaterial({color:'#fff7e8',transparent:true,opacity:0,toneMapped:false});
   if(zen){const strip=new T.Mesh(new T.PlaneGeometry(w*.72,.028),mat);strip.position.set(0,h/2-.075,.015);strip.raycast=()=>{};g.add(strip);g.userData.ledObjects.push(strip)}else{
    const diffuser=new T.Mesh(new T.ShapeGeometry(shape(T,w+.008,h+.008,r+.004),40),mat);diffuser.position.z=-.014;diffuser.raycast=()=>{};g.add(diffuser);g.userData.ledObjects.push(diffuser);
    const shader=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{size:{value:new T.Vector2(w,h)},radius:{value:r},alpha:{value:0},color:{value:new T.Color('#fff0d5')}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform vec2 size;uniform float radius;uniform float alpha;uniform vec3 color;void main(){vec2 p=(v-.5)*(size+.24);vec2 q=abs(p)-(size*.5-radius);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;float a=alpha*exp(-max(d,0.)*30.)*smoothstep(-.006,.008,d);gl_FragColor=vec4(color,a);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'});const halo=new T.Mesh(new T.PlaneGeometry(w+.24,h+.24),shader);halo.position.z=wallZ;halo.raycast=()=>{};g.add(halo);g.userData.ledHalo=halo;
   }
   const light=new T.PointLight('#fff4e3',0,1.3,2);light.position.set(0,zen?h/2-.075:0,.09);g.add(light);g.userData.ledLight=light;
  }return g;
 }
 setLED(g,on){if(!g?.userData.ledCapable)return;const changed=g.userData.ledOn!==!!on;g.userData.ledOn=!!on;if(changed)this.invalidate()}
 tick(dt){let moving=false,lights=0;this.scene.traverse(g=>{const u=g.userData;if(!u.ledCapable)return;const goal=u.ledOn?1:0;u.ledProgress+=(goal-u.ledProgress)*(1-Math.exp(-dt*12));if(Math.abs(goal-u.ledProgress)<.002)u.ledProgress=goal;else moving=true;u.ledObjects.forEach(o=>o.material.opacity=u.ledProgress);if(u.ledHalo)u.ledHalo.material.uniforms.alpha.value=.6*u.ledProgress;if(u.ledLight)u.ledLight.intensity=(lights++<(innerWidth<1100?2:4)?1:0)*.32*u.ledProgress});return moving}
 release(root){root.traverse(o=>{if(o.isReflector)o.dispose()})}
 diagnostics(){return{mirrors:this.mirrors.size,renderTargets:this.targets.size,reflectionSize:innerWidth<1100?256:512,led:[...this.mirrors].map(m=>({style:m.parent.userData.style,on:m.parent.userData.ledOn,progress:m.parent.userData.ledProgress}))}}
 dispose(){this.targets.forEach(e=>e.target.dispose());this.targets.clear();if(this.renderer.render===this.wrapper)this.renderer.render=this.originalRender;this.rig.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});this.scene.remove(this.rig);this.mirrors.clear()}
}
window.RandalMirrorRenderer=Mirrors;
})();
