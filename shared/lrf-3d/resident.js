import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const PROFILES={male:{model:'resident-v1.glb',prefix:'m002',head:'male-reference-head-v2.webp',body:'male-reference-body-v2.webp',height:1.72},female:{model:'resident-female-v2.glb',prefix:'f001',head:'female-reference-head-v2.webp',body:'female-reference-body-v2.webp',height:1.67}};
// Real skinned MIT Rocketbox models, with independently personalized albedo maps.
export function createResident(scene,renderer,{profiles=PROFILES,baseURL='/shared/avatar/',prepareModel}={}){
 const pivot=new T.Group();pivot.name='Habitant_LRF';pivot.visible=false;scene.add(pivot);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),g=c.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'rgba(24,23,18,.38)');g.addColorStop(.45,'rgba(24,23,18,.14)');g.addColorStop(1,'rgba(24,23,18,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
 const contact=new T.Mesh(new T.PlaneGeometry(.65,.5),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,toneMapped:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.003;pivot.add(contact);
 const cache=new Map(),jobs=new Set(),released=new WeakSet();let disposed=false,current=null,selected=Object.keys(profiles)[0],failure='',failureDetail='',elapsed=0,phase=0,blend=0,sitBlend=0,gesture='idle',gestureUntil=0,lastMotion={},ticket=0;
 let reach=null,reachWeight=0,reachGrip=0,reachDiagnostics={active:false};
 const point=value=>{const a=Array.isArray(value)?value:value?.isVector3?value.toArray():null;return a?.length>=3&&a.slice(0,3).every(Number.isFinite)?new T.Vector3(...a.slice(0,3)):null;};
 const ledger=()=>({root:null,resources:new Set(),closed:false});
 const base=ledger();
 const free=resource=>{if(!resource||released.has(resource))return;released.add(resource);resource.dispose?.();};
 function remember(job,resource){if(!resource)return resource;job.resources.add(resource);if(job.closed||disposed)free(resource);return resource;}
 function rememberObject(job,root){root.traverse(o=>{if(!o.isMesh)return;remember(job,o.geometry);remember(job,o.skeleton);for(const material of Array.isArray(o.material)?o.material:[o.material]){if(!material)continue;remember(job,material);for(const value of Object.values(material))if(value?.isTexture)remember(job,value);}});}
 function close(job){job.closed=true;job.root?.removeFromParent();for(const resource of job.resources)free(resource);job.resources.clear();jobs.delete(job);}
 function cancelled(){const error=Error('Le personnage a été libéré.');error.name='AbortError';return error;}
 rememberObject(base,contact);
 const v=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion(),dir=new T.Vector3(),direction=new T.Vector3();
 const position=name=>current.root.worldToLocal(current.bones.get('Bip01_'+name).getWorldPosition(new T.Vector3()));
 async function prepare(id){if(disposed)throw cancelled();const spec=profiles[id];if(!spec)throw Error('Personnage inconnu.');if(cache.has(id))return cache.get(id);
 const job=ledger();jobs.add(job);
 const pending=(async()=>{const loader=new T.TextureLoader(),names=['body_color','body_normal','head_color','head_normal',...(spec.noOpacity?[]:['opacity_color'])];
 // Each flight records its own result immediately. If a sibling fails or the
 // visitor is disposed first, later results are released instead of leaking
 // behind the rejected Promise.all or reattaching to a detached pivot.
 const modelFlight=new GLTFLoader().loadAsync(baseURL+spec.model).then(gltf=>{job.root=gltf.scene;rememberObject(job,gltf.scene);if(disposed||job.closed)throw cancelled();return gltf;});
 const mapFlights=names.map(n=>loader.loadAsync(baseURL+(spec.maps?.[n]||(n==='head_color'?spec.head:n==='body_color'?spec.body:spec.prefix+'_'+n+'.webp'))).then(texture=>{remember(job,texture);if(disposed||job.closed)throw cancelled();return texture;}));
 const [gltf,...maps]=await Promise.all([modelFlight,...mapFlights]);if(disposed||job.closed)throw cancelled();
 const textures=Object.fromEntries(names.map((n,i)=>[n,maps[i]]));for(const [name,t]of Object.entries(textures)){t.flipY=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.colorSpace=name.includes('normal')?T.NoColorSpace:T.SRGBColorSpace;}
 const root=gltf.scene,bones=new Map(),rest=new Map(),expressions=new Set();root.name='Habitant_'+id;root.visible=false;pivot.add(root);
 root.traverse(o=>{if(o.isBone){bones.set(o.name,o);rest.set(o.name,{q:o.quaternion.clone(),p:o.position.clone(),s:o.scale.clone()});}if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){const key=/head/.test(m.name)?'head':/opacity/.test(m.name)?'opacity':'body';m.map=textures[key+'_color'];m.color.set('#fff');m.roughness=key==='head'?.67:.9;m.normalMap=textures[key+'_normal']||null;m.normalScale?.set(key==='head'?.13:.32,key==='head'?.13:.32);if(key==='opacity'){m.side=T.DoubleSide;m.alphaTest=.48;m.depthWrite=true;m.transparent=false;}m.needsUpdate=true;}Object.keys(o.morphTargetDictionary||{}).forEach(n=>expressions.add(n));}});
 const pelvis=root.getObjectByName('Bip01');if(!pelvis||!bones.has('Bip01_L_Thigh'))throw Error('Squelette incomplet.');root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);root.scale.setScalar(spec.height/bounds.getSize(new T.Vector3()).y);root.position.y=-bounds.min.y*root.scale.x;root.updateMatrixWorld(true);
 const local=name=>root.worldToLocal(bones.get('Bip01_'+name).getWorldPosition(new T.Vector3())),legs={},arms={};for(const side of ['L','R']){const hip=local(side+'_Thigh'),knee=local(side+'_Calf'),foot=local(side+'_Foot');legs[side]={hip,knee,foot,a:hip.distanceTo(knee),b:knee.distanceTo(foot)};
  const shoulder=local(side+'_UpperArm'),elbow=local(side+'_Forearm'),wrist=local(side+'_Hand'),hand=bones.get('Bip01_'+side+'_Hand');
  const fingers=[1,2,3].map(n=>bones.get('Bip01_'+side+'_Finger'+n)).filter(Boolean);
  const palm=fingers.length?fingers.reduce((p,b)=>p.add(b.getWorldPosition(new T.Vector3())),new T.Vector3()).multiplyScalar(1/fingers.length):hand.localToWorld(new T.Vector3(0,0,4));
  const palmLocal=hand.worldToLocal(palm).multiplyScalar(.64);
  arms[side]={a:shoulder.distanceTo(elbow),b:elbow.distanceTo(wrist),palmLocal};
 }
 prepareModel?.({root,bones,spec});
 const head=bones.get('Bip01_Head'),eye=local('LEye'),headPos=local('Head'),signs=spec.noJewelry?[]:id==='female'?[-1,1]:[-1];if(signs.length){const metal=remember(job,new T.MeshPhysicalMaterial({color:'#bfc4bd',metalness:.93,roughness:.2}));for(const sign of signs){const o=new T.Mesh(remember(job,id==='female'?new T.TorusGeometry(2.3,.13,8,40):new T.SphereGeometry(.28,12,10)),metal);o.name=id==='female'?'Créole_argent':'Puce_argent';const p=new T.Vector3(sign*7.1,eye.y-(id==='female'?8:4.9),headPos.z+3.7);root.localToWorld(p);head.worldToLocal(p);o.position.copy(p);root.getWorldQuaternion(q);head.getWorldQuaternion(parentQ).invert();o.quaternion.copy(parentQ.multiply(q));head.add(o);o.castShadow=true;}}
 rememberObject(job,root);
 return {id,root,bones,rest,expressions,pelvis,pelvisRest:pelvis.position.clone(),legs,arms,scale:root.scale.x,shoulder:local('L_UpperArm'),headHeight:eye.y,blinkMorph:[...expressions].some(name=>/EyeBlink/.test(name)),textures};})().catch(e=>{if(job.root)rememberObject(job,job.root);close(job);cache.delete(id);throw e;});cache.set(id,pending);return pending;}
 async function load(id=selected){if(disposed)return null;const n=++ticket;failure=failureDetail='';try{const next=await prepare(id);if(disposed||n!==ticket)return current?.root||null;if(current)current.root.visible=false;current=next;selected=id;current.root.visible=true;blend=0;reach=null;reachWeight=reachGrip=0;reachDiagnostics={active:false};animate(0,false);return current.root;}catch(e){if(disposed||n!==ticket)return current?.root||null;failureDetail=e?.message||e?.type||String(e);failure='Le personnage n’a pas pu être chargé. Réessayez.';throw Error(failure+' '+failureDetail);}}
 function aim(name,childName,target){const b=current.bones.get('Bip01_'+name),child=current.bones.get('Bip01_'+childName);if(!b||!child)return;b.getWorldPosition(v);child.getWorldPosition(direction);direction.sub(v).normalize();dir.copy(target);current.root.localToWorld(dir);dir.sub(v).normalize();q.setFromUnitVectors(direction,dir);b.getWorldQuaternion(parentQ);q.multiply(parentQ);b.parent.getWorldQuaternion(parentQ).invert();b.quaternion.copy(parentQ.multiply(q));b.updateWorldMatrix(false,true);}
 function palmPosition(side){if(!current)return null;const hand=current.bones.get('Bip01_'+side+'_Hand');return hand?hand.localToWorld(current.arms[side].palmLocal.clone()):null;}
 // Apply a small anatomical bend in the character's frame, independent of
 // the imported Biped bone's local axis conventions.
 function rotateRootAxis(bone,axis,angle){if(!bone||!angle)return;const worldAxis=axis.clone().applyQuaternion(current.root.getWorldQuaternion(new T.Quaternion()));const delta=new T.Quaternion().setFromAxisAngle(worldAxis,angle);bone.getWorldQuaternion(parentQ);delta.multiply(parentQ);bone.parent.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ.multiply(delta));bone.updateWorldMatrix(false,true);}
 function updateReach(input,dt){
  const target=point(input?.target),side=input?.side==='L'?'L':'R';let wanted=target?T.MathUtils.clamp(Number(input.weight)||0,0,1):0;
  // An interrupted interaction changes hands only after the previous hand has
  // released. This also provides a soft return if the caller cancels abruptly.
  if(target&&reach&&reach.side!==side&&reachWeight>.03)wanted=0;
  else if(target){const normal=point(input.normal)||pivot.getWorldPosition(new T.Vector3()).sub(target).setY(0);if(normal.lengthSq()<1e-8)normal.set(0,0,-1).applyQuaternion(pivot.quaternion);normal.normalize();reach={target,normal,side,grip:T.MathUtils.clamp(Number(input.grip)||0,0,1),effort:T.MathUtils.clamp(Number(input.effort)||0,0,1),lookWeight:T.MathUtils.clamp(Number.isFinite(input.lookWeight)?input.lookWeight:1,0,1)};}
  const previous=reachWeight,next=T.MathUtils.damp(previous,wanted,wanted>previous?22:13,dt);
  reachWeight=T.MathUtils.clamp(next,previous-dt*4,previous+dt*5);
  reachGrip=T.MathUtils.damp(reachGrip,(reach?.grip||0)*reachWeight,26,dt);
  if(!wanted&&reachWeight<1e-4){reach=null;reachWeight=reachGrip=0;}
 }
 function reachWrist(){const hand=current.bones.get('Bip01_'+reach.side+'_Hand'),arm=current.arms[reach.side],palmLength=arm.palmLocal.length()*hand.getWorldScale(new T.Vector3()).x;const offset=reach.normal.clone().multiplyScalar(.04);offset.y+=.015;offset.normalize().multiplyScalar(palmLength);return current.root.worldToLocal(reach.target.clone().add(offset));}
 function solveReach(side,weight){
  const {arms,bones}=current,arm=arms[side],shoulder=position(side+'_UpperArm'),idleWrist=position(side+'_Hand');
  const wrist=idleWrist.lerp(reachWrist(),weight),axis=wrist.clone().sub(shoulder),rawDistance=axis.length(),maximum=(arm.a+arm.b)*.985;
  const distance=T.MathUtils.clamp(rawDistance,Math.abs(arm.a-arm.b)+.1,maximum);if(rawDistance<1e-6)return;
  axis.normalize();const along=(arm.a*arm.a-arm.b*arm.b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,arm.a*arm.a-along*along));
  const sign=side==='L'?1:-1,pole=new T.Vector3(sign*.82,-.32,.65);pole.addScaledVector(axis,-pole.dot(axis));if(pole.lengthSq()<1e-6)pole.set(sign,0,0);pole.normalize();
  const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,height),accepted=shoulder.clone().addScaledVector(axis,distance);
  aim(side+'_UpperArm',side+'_Forearm',elbow);aim(side+'_Forearm',side+'_Hand',accepted);
  const hand=bones.get('Bip01_'+side+'_Hand'),w=hand.getWorldPosition(new T.Vector3()),palm=palmPosition(side),actualAxis=palm.clone().sub(w),desiredAxis=reach.target.clone().sub(w);
  if(actualAxis.lengthSq()>1e-8&&desiredAxis.lengthSq()>1e-8){const delta=new T.Quaternion().setFromUnitVectors(actualAxis.normalize(),desiredAxis.normalize()),old=hand.quaternion.clone();hand.getWorldQuaternion(parentQ);delta.multiply(parentQ);hand.parent.getWorldQuaternion(parentQ).invert();hand.quaternion.copy(old).slerp(parentQ.multiply(delta),weight);hand.updateWorldMatrix(false,true);}
  const contact=palmPosition(side);reachDiagnostics={active:weight>.01,side,weight,grip:reachGrip,target:reach.target.toArray(),contact:contact.toArray(),contactDistance:contact.distanceTo(reach.target),clamped:rawDistance>maximum,crouch:reachDiagnostics.crouch||0};
 }
 function animate(dt,motion){
  if(!current)return;
  dt=T.MathUtils.clamp(Number.isFinite(dt)?dt:0,0,.2);
  const m=typeof motion==='boolean'?{moving:motion}:motion||{};
  const measured=Number.isFinite(m.distance)&&Number.isFinite(m.speed);
  const moving=(measured?m.speed>.015:!!m.moving)&&!m.seated;
  const speed=measured?Math.max(0,m.speed):moving?(m.running?2.7:1.6):0;
  lastMotion={...m,moving,speed};elapsed+=dt;
  updateReach(m.interaction,dt);
  const target=moving?T.MathUtils.clamp(speed/1.5,.12,1):0;
  blend=T.MathUtils.damp(blend,target,moving?8:12,dt);
  sitBlend=T.MathUtils.damp(sitBlend,m.seated?1:0,10,dt);
  // A full stride advances with the true distance accepted by collision. When
  // standing still the phase freezes and the feet settle, including at a wall.
  phase+=measured?(moving?Math.max(0,m.distance)/(m.running?1.75:1.25)*Math.PI*2:0):dt*(moving?(m.running?12.5:8.2):0);
  const directionX=measured?T.MathUtils.clamp(m.directionX||0,-1,1):0;
  const directionZ=measured?T.MathUtils.clamp(m.directionZ??1,-1,1):1;
  const {root,bones,rest,pelvis,pelvisRest,legs}=current;
  for(const [name,b]of bones){const r=rest.get(name);b.quaternion.copy(r.q);b.position.copy(r.p);b.scale.copy(r.s);}
  pelvis.position.copy(pelvisRest);root.updateWorldMatrix(true,true);
  const hip=position('L_Thigh'),seatTarget=((m.seatHeight||.52)+.09)/current.scale;
  const breathing=Math.sin(elapsed*1.52),weight=Math.sin(elapsed*.51)*.34*(1-blend)*(1-sitBlend);
  pelvis.position.x+=weight+Math.sin(phase)*blend*.24;
  pelvis.position.y+=breathing*.13+Math.sin(phase*2)*blend*(m.running?1.05:.38)-blend*(m.running?3.3:1.35)+(seatTarget-hip.y)*sitBlend;
  let crouch=0,reachLean=0,reachYaw=0;
  if(reach&&reachWeight>.001&&!m.seated){
   const shoulder=position(reach.side+'_UpperArm'),wrist=reachWrist(),arm=current.arms[reach.side],maximum=(arm.a+arm.b)*.985;
   const horizontal=Math.hypot(wrist.x-shoulder.x,wrist.z-shoulder.z),vertical=Math.sqrt(Math.max(0,maximum*maximum-horizontal*horizontal));
   // A low handle calls for bent knees, not an elongated forearm. Foot IK
   // below retains both original floor contacts while the pelvis lowers.
   crouch=T.MathUtils.clamp(shoulder.y-wrist.y-vertical+.8,0,.25/current.scale)*reachWeight;
   pelvis.position.y-=crouch;
   reachLean=reachWeight*(.02+reach.effort*.025+T.MathUtils.clamp((wrist.z-shoulder.z)/maximum,0,1)*.055);
   reachYaw=T.MathUtils.clamp(Math.atan2(wrist.x-shoulder.x,Math.max(12,wrist.z-shoulder.z)),-.16,.16)*reachWeight;
  }
  reachDiagnostics.crouch=crouch*current.scale;
  // Tiny independent shoulder/torso motion avoids a rigid mannequin without
  // putting a visible wobble into the first-person camera.
  bones.get('Bip01_Spine')?.rotateX(breathing*.004+blend*(m.running?.025:.01));
  bones.get('Bip01_Spine1')?.rotateY(Math.sin(phase)*blend*.016+Math.sin(elapsed*.38)*.005*(1-blend));
  bones.get('Bip01_Spine2')?.rotateZ(-weight*.012);
  rotateRootAxis(bones.get('Bip01_Spine'),new T.Vector3(1,0,0),reachLean);
  rotateRootAxis(bones.get('Bip01_Spine1'),new T.Vector3(1,0,0),reachLean*.4);
  rotateRootAxis(bones.get('Bip01_Spine1'),new T.Vector3(0,1,0),reachYaw);
  root.updateWorldMatrix(true,true);
  for(const sign of [-1,1]){
   const side=sign===1?'L':'R',leg=legs[side],cycle=Math.sin(phase+(sign===1?0:Math.PI)),swing=cycle*blend,ankle=leg.foot.clone();
   const stride=m.running?33:24;
   ankle.z+=swing*stride*directionZ;ankle.x+=swing*stride*directionX*.72;
   ankle.y+=Math.max(0,cycle)*blend*(m.running?10:4.8);
   ankle.lerp(new T.Vector3(sign*11,leg.foot.y,leg.foot.z+37),sitBlend);
   if(m.airborne){ankle.y+=5;ankle.z+=sign*3;}
   const h=position(side+'_Thigh'),axis=ankle.clone().sub(h),dist=T.MathUtils.clamp(axis.length(),Math.abs(leg.a-leg.b)+.1,leg.a+leg.b-.2);axis.normalize();
   const along=(leg.a*leg.a-leg.b*leg.b+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,leg.a*leg.a-along*along));
   const bend=new T.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=h.clone().addScaledVector(axis,along).addScaledVector(bend,height);
   aim(side+'_Thigh',side+'_Calf',knee);aim(side+'_Calf',side+'_Foot',ankle);
   bones.get('Bip01_'+side+'_Foot')?.rotateX(-Math.max(0,cycle)*blend*.07);
   const wave=gesture==='wave'&&elapsed<gestureUntil&&side==='R'&&!reach,arm=-swing,shoulderNow=position(side+'_UpperArm');
   const idle=1-blend,relaxed=Math.sin(elapsed*.84+sign*.7)*1.1*idle;
   const swayX=Math.sin(elapsed*.61+sign*.85)*1.0*idle,swayZ=(Math.sin(elapsed*.47+sign*1.2)*1.6+breathing*.4)*idle;
   const elbow=new T.Vector3(sign*(wave?31:Math.abs(shoulderNow.x)+2.2)+swayX*.45,wave?shoulderNow.y+3:shoulderNow.y-24+relaxed*.55,wave?3:3.2+sign*.5+swayZ*.55+arm*(m.running?17:10));
   const hand=new T.Vector3(sign*(wave?37:Math.abs(shoulderNow.x)+2.9)+swayX,wave?current.headHeight+7:shoulderNow.y-47.5+relaxed,wave?8+Math.sin(elapsed*12)*7:8.5+sign*.7+swayZ+arm*(m.running?24:15));
   elbow.lerp(new T.Vector3(sign*22,seatTarget+24,16),sitBlend);hand.lerp(new T.Vector3(sign*15,seatTarget+6,29),sitBlend);
   if(m.airborne){elbow.z-=8;hand.y+=13;}
   aim(side+'_UpperArm',side+'_Forearm',elbow);aim(side+'_Forearm',side+'_Hand',hand);
   bones.get('Bip01_'+side+'_Hand')?.rotateZ(Math.sin(elapsed*.7+sign)*.012);
   if(reach&&reach.side===side&&reachWeight>.001)solveReach(side,reachWeight);
   // Rocketbox's finger local Z is the flexion axis on both hands. A little
   // relaxed curl keeps the fingers from looking like flat paddles.
   const grasp=reach?.side===side?reachGrip:0;
   for(let finger=1;finger<=4;finger++)for(const [joint,curl,closed]of [['',.035,.25],['1',.11,.66],['2',.075,.46]]){
    bones.get('Bip01_'+side+'_Finger'+finger+joint)?.rotateZ(curl+(finger-1)*.008+grasp*closed);
   }
   bones.get('Bip01_'+side+'_Finger0')?.rotateZ(.025+grasp*.22);
   bones.get('Bip01_'+side+'_Finger01')?.rotateZ(.035+grasp*.3);
  }
  const head=bones.get('Bip01_Head');
  head.rotateX(Math.sin(elapsed*.62)*.012+blend*Math.sin(phase*2)*.006);
  head.rotateY(Math.sin(elapsed*.39)*.016+(m.headYaw||0));
  if(reach&&reachWeight>.001){
   const from=position('Head'),to=root.worldToLocal(reach.target.clone()).sub(from),focus=reachWeight*reach.lookWeight;
   rotateRootAxis(head,new T.Vector3(0,1,0),T.MathUtils.clamp(Math.atan2(to.x,Math.max(.1,to.z)),-.48,.48)*focus);
   rotateRootAxis(head,new T.Vector3(1,0,0),T.MathUtils.clamp(Math.atan2(-to.y,Math.hypot(to.x,to.z)),-.18,.42)*focus);
  }
  if(gesture==='look'&&elapsed<gestureUntil)head.rotateX(Math.sin(elapsed*1.6)*.16);
  const blinkT=(elapsed+1.37)%4.7,blink=blinkT<.16?Math.sin(blinkT/.16*Math.PI):0;
  const softSmile=(.055+Math.sin(elapsed*.41)*.025+Math.sin(elapsed*.73)*.012)*(1-reachWeight)+.012*reachWeight;
  root.traverse(o=>{if(o.morphTargetDictionary)for(const [name,i]of Object.entries(o.morphTargetDictionary))o.morphTargetInfluences[i]=/EyeBlink/.test(name)?blink:/Smile/.test(name)?Math.max(.005,softSmile):0;});
  // The personalized model uses facial joints rather than morph targets.
  // Move its lid joints in the model's vertical axis so blinking also works.
  if(!current.blinkMorph&&blink){
   root.updateWorldMatrix(true,true);
   for(const side of ['L','R'])for(const [part,offset]of [['Top',-.72],['Bottom',.18]]){
    const lid=bones.get('Bip01_'+side+'EyeBlink'+part);if(!lid)continue;
    const p=root.worldToLocal(lid.getWorldPosition(new T.Vector3()));p.y+=offset*blink;
    root.localToWorld(p);lid.position.copy(lid.parent.worldToLocal(p));
   }
  }
  contact.material.opacity=m.airborne?.4:1;
  if(!reach)reachDiagnostics={active:false,weight:0,grip:0,crouch:0};
 }

 return {pivot,load,select:load,get ready(){return !!current;},get selected(){return selected;},get diagnostics(){const dimensions=key=>{const image=current?.textures[key]?.image;return {width:image?.width||image?.naturalWidth||0,height:image?.height||image?.naturalHeight||0};},head=dimensions('head_color');return {loaded:!!current,id:selected,bones:current?.bones.size||0,expressions:current?.expressions.size||0,source:profiles[selected]?.source||'Microsoft Rocketbox · MIT · textures personnalisées',textures:Math.max(head.width,head.height),textureDimensions:{head,body:dimensions('body_color')},failure,failureDetail,gesture:elapsed<gestureUntil?gesture:lastMotion.seated?'sit':lastMotion.airborne?'jump':lastMotion.moving?lastMotion.running?'run':'walk':'idle',height:profiles[selected]?.height,seatBlend:sitBlend,locomotionSpeed:lastMotion.speed||0,gaitBlend:blend,gaitPhase:phase,interaction:{...reachDiagnostics}};},setVisible(v){pivot.visible=!disposed&&v&&!!current;},animate,wave(){gesture='wave';gestureUntil=elapsed+2.7;},look(){gesture='look';gestureUntil=elapsed+3;},place(p,heading){pivot.position.copy(p);pivot.rotation.y=heading;contact.position.y=.003-(lastMotion.jumpHeight||0);},getRoot:()=>current?.root,getHandContactPosition:(side='R')=>palmPosition(side==='L'?'L':'R'),getEyePosition:()=>{if(!current)return null;current.root.updateWorldMatrix(true,true);const eyes=['Bip01_LEye','Bip01_REye'].map(name=>current.bones.get(name)).filter(Boolean);if(!eyes.length)return null;return eyes.reduce((p,b)=>p.add(b.getWorldPosition(new T.Vector3())),new T.Vector3()).multiplyScalar(1/eyes.length);},dispose(){if(disposed)return;disposed=true;ticket++;reach=null;reachWeight=reachGrip=0;reachDiagnostics={active:false};pivot.visible=false;pivot.removeFromParent();rememberObject(base,pivot);for(const job of [...jobs])close(job);close(base);pivot.clear();cache.clear();current=null;}};
}
