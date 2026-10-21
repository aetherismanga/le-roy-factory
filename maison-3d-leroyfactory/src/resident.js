import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Rocketbox Male_Adult_01, Microsoft MIT. Facial rig, eyes and hair are retained.
// All assets are served with this independent preview; no avatar service/account is used.
export function createResident(scene,renderer){
 const pivot=new T.Group();pivot.name='Habitant_LRF';pivot.visible=false;scene.add(pivot);
 const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=128;const c=shadeCanvas.getContext('2d'),gradient=c.createRadialGradient(64,64,5,64,64,62);gradient.addColorStop(0,'rgba(24,23,18,.4)');gradient.addColorStop(.45,'rgba(24,23,18,.16)');gradient.addColorStop(1,'rgba(24,23,18,0)');c.fillStyle=gradient;c.fillRect(0,0,128,128);
 const contact=new T.Mesh(new T.PlaneGeometry(.65,.5),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadeCanvas),transparent:true,depthWrite:false,toneMapped:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.003;contact.name='Contact_habitant';pivot.add(contact);
 let root=null,pending=null,pelvis=null,pelvisRest=null,failure='',elapsed=0,phase=0,gestureUntil=0,gesture='idle',blend=0;
 const bones=new Map(),rest=new Map(),expressionNames=new Set(),v=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion(),dir=new T.Vector3(),current=new T.Vector3();
 const info={loaded:false,bones:0,expressions:0,source:'Microsoft Rocketbox · MIT',textures:2048};
 async function load(){
  if(root)return root;if(pending)return pending;
  failure='';pending=(async()=>{
   const loader=new T.TextureLoader(),textureNames=['body_color','body_normal','head_color','head_normal','opacity_color'];
   const [gltf,...maps]=await Promise.all([new GLTFLoader().loadAsync('/assets/avatar/resident-v1.glb'),...textureNames.map(n=>loader.loadAsync('/assets/avatar/m002_'+n+'.webp'))]);
   const textures=Object.fromEntries(textureNames.map((n,i)=>[n,maps[i]]));
   for(const [name,tx]of Object.entries(textures)){tx.flipY=true;tx.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());tx.colorSpace=name.includes('normal')?T.NoColorSpace:T.SRGBColorSpace;}
   root=gltf.scene;root.scale.setScalar(.0096);pivot.add(root);
   root.traverse(o=>{
    if(o.isBone){bones.set(o.name,o);rest.set(o.name,{quaternion:o.quaternion.clone(),position:o.position.clone()});}
    if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
     for(const m of Array.isArray(o.material)?o.material:[o.material]){
      const key=/head/.test(m.name)?'head':/opacity/.test(m.name)?'opacity':'body';m.map=textures[key+'_color'];m.color.set('#ffffff');m.roughness=key==='head'?.65:.88;
      m.normalMap=textures[key+'_normal']||null;m.normalScale?.set(.45,.45);
      if(key==='opacity'){m.side=T.DoubleSide;m.alphaTest=.48;m.depthWrite=true;m.transparent=false;}
      m.needsUpdate=true;
     }
     Object.keys(o.morphTargetDictionary||{}).forEach(n=>expressionNames.add(n));
    }
   });
   // Put the shoe sole on the navigation ground, preserving real human proportions.
   root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root);root.position.y-=b.min.y;
   pelvis=root.getObjectByName('Bip01');if(!pelvis||!bones.has('Bip01_L_Thigh'))throw Error('Squelette du personnage incomplet.');pelvisRest=pelvis.position.clone();
   info.bones=bones.size;info.expressions=expressionNames.size;animate(0,false);info.loaded=true;return root;
  })().catch(e=>{info.loaded=false;info.failureDetail=e.message;root?.removeFromParent();root=null;bones.clear();rest.clear();expressionNames.clear();failure='Le personnage n’a pas pu être chargé. Réessayez avec votre connexion disponible.';pending=null;throw Error(failure);});return pending;
 }
 function aim(name,childName,target){
  const bone=bones.get('Bip01_'+name),child=bones.get('Bip01_'+childName);if(!bone||!child)return;
  bone.getWorldPosition(v);child.getWorldPosition(current);current.sub(v).normalize();
  dir.copy(target);root.localToWorld(dir);dir.sub(v).normalize();q.setFromUnitVectors(current,dir);
  bone.getWorldQuaternion(parentQ);q.multiply(parentQ);bone.parent.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ.multiply(q));bone.updateWorldMatrix(false,true);
 }
 function animate(dt,moving){
  if(!root)return;elapsed+=dt;blend=T.MathUtils.damp(blend,moving?1:0,8,dt);phase+=dt*(moving?8.7:1.2);
  for(const [name,b]of bones){b.quaternion.copy(rest.get(name).quaternion);b.position.copy(rest.get(name).position);}
  root.updateWorldMatrix(true,true);
  pelvis.position.copy(pelvisRest);pelvis.position.y-=blend*3;pelvis.position.y+=Math.sin(phase*2)*blend*.6+Math.sin(elapsed*1.6)*.18;
  root.updateWorldMatrix(true,true);
  for(const sign of [-1,1]){
   const side=sign===1?'L':'R',swing=Math.sin(phase+(sign===1?0:Math.PI))*blend;
   // Analytic two-bone leg solve; the planted ankle stays at shoe height.
   const hip=bones.get('Bip01_'+side+'_Thigh').getWorldPosition(new T.Vector3());root.worldToLocal(hip);
   const ankle=new T.Vector3(sign*10,10+Math.max(0,swing)*6,swing*18),axis=ankle.clone().sub(hip),dist=Math.min(79.3,axis.length());axis.normalize();
   const a=39.9,b=39.67,along=(a*a-b*b+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,a*a-along*along));
   const bend=new T.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=hip.clone().addScaledVector(axis,along).addScaledVector(bend,height);
   if(blend>.001){aim(side+'_Thigh',side+'_Calf',knee);aim(side+'_Calf',side+'_Foot',ankle);}
   const wave=gesture==='wave'&&elapsed<gestureUntil&&side==='R',armSwing=-swing;
   const elbow=new T.Vector3(sign*(wave?32:23),wave?145:120,wave?4:armSwing*13),hand=new T.Vector3(sign*(wave?39:24),wave?174:96,wave?9+Math.sin(elapsed*13)*8:8+armSwing*20);
   aim(side+'_UpperArm',side+'_Forearm',elbow);aim(side+'_Forearm',side+'_Hand',hand);
  }
  const head=bones.get('Bip01_Head');head.rotateX(Math.sin(elapsed*.62)*.022);if(gesture==='look'&&elapsed<gestureUntil)head.rotateX(Math.sin(elapsed*2.1)*.18);head.rotateY(Math.sin(elapsed*.39)*.035);
  const blinkPhase=elapsed%4.1,blink=blinkPhase<.15?Math.sin(blinkPhase/.15*Math.PI):0;
  root.traverse(o=>{if(!o.morphTargetDictionary)return;for(const [name,index]of Object.entries(o.morphTargetDictionary))o.morphTargetInfluences[index]=/EyeBlink/.test(name)?blink:/Smile/.test(name)?.16:0;});
 }
 return {pivot,load,get ready(){return !!root;},get diagnostics(){return {...info,failure,gesture:elapsed<gestureUntil?gesture:movingGesture()};},setVisible(v){pivot.visible=v&&!!root;},animate,
  wave(){gesture='wave';gestureUntil=elapsed+2.8;},look(){gesture='look';gestureUntil=elapsed+3;},
  place(position,heading){pivot.position.set(position.x,position.y,position.z);pivot.rotation.y=heading;},
  getRoot:()=>root};
 function movingGesture(){return blend>.2?'walk':'idle';}
}
