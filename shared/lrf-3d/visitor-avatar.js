import {createResident} from './resident.js';

const JEROME={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,
 source:'Microsoft Rocketbox · MIT · textures Jérôme personnalisées',
 maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp',opacity_color:'opacity.webp'}}};

// A high automatic rendering profile, or an HD export, is not a request to
// enable the visitor. Only the user's explicit Ultra choice in a live visit is.
export function ultraVisitorEnabled({walking,qualityMode,capturing=false,hidden=false}){
 return walking===true&&qualityMode==='max'&&!capturing&&!hidden;
}

// Measure the accepted displacement, never the joystick/key intent. A visitor
// pushing against a basin therefore eases back to idle instead of marching on
// the spot. The body follows the gaze with a short, shortest-angle turn while
// the neck absorbs the remaining small offset.
export function createVisitorMotionSampler(){
 let previous=null,bodyHeading=0;
 const angle=value=>Math.atan2(Math.sin(value),Math.cos(value));
 return {
  reset(position,heading=0){previous={x:position.x,z:position.z};bodyHeading=heading;},
  sample(position,heading,dt,{running=false}={}){
   if(!previous)this.reset(position,heading);
   const step=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.2));
   let dx=position.x-previous.x,dz=position.z-previous.z;
   previous={x:position.x,z:position.z};
   let distance=Math.hypot(dx,dz);
   // Restores/spawn corrections are relocation, not a several-metre stride.
   if(!Number.isFinite(distance)||distance>Math.max(.45,step*4.5)||!step){dx=dz=distance=0;bodyHeading=heading;}
   bodyHeading+=angle(heading-bodyHeading)*(1-Math.exp(-10*step));
   const speed=step?distance/step:0,moving=speed>.015;
   const x=dx*Math.cos(bodyHeading)-dz*Math.sin(bodyHeading),z=dx*Math.sin(bodyHeading)+dz*Math.cos(bodyHeading);
   return {moving,running:running&&speed>2.05,speed,distance: moving?distance:0,
    directionX:moving?x/distance:0,directionZ:moving?z/distance:1,
    heading:bodyHeading,headYaw:Math.max(-.45,Math.min(.45,angle(heading-bodyHeading)))};
  }
 };
}

export function mountUltraVisitorAvatar({scene,renderer,walk,getQuality,isCapturing=()=>false,invalidate=()=>{},status=()=>{},prepareModel}){
 let resident=null,loading=null,enabled=false,disposed=false,failure='',revision=0,captures=0,elapsed=0,loadToken=0;
 const motionSampler=createVisitorMotionSampler();
 const wanted=()=>ultraVisitorEnabled({walking:walk.active,qualityMode:getQuality().mode,capturing:isCapturing(),hidden:typeof document!=='undefined'&&document.hidden});

 function sync(){
  const next=!disposed&&wanted();
  if(!next&&(enabled||resident)){loadToken++;resident?.dispose();resident=null;loading=null;elapsed=0;failure='';}
  enabled=next;
  if(resident)resident.setVisible(false);
  if(enabled&&!resident&&!loading&&!failure){
   const actor=createResident(scene,renderer,{profiles:JEROME,baseURL:'/assets/avatar/jerome-v1/',prepareModel:context=>{
    context.root.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
     if(/head/i.test(material.name)){material.roughness=.64;material.normalScale?.set(.1,.1);}
     if(/body/i.test(material.name)){material.roughness=.92;material.normalScale?.set(.18,.18);}
     if(/opacity/i.test(material.name)){material.color.set('#252321');material.roughness=.85;}
     if(/Jerome_(pantalon|chaussures)/i.test(material.name)){material.map=null;material.normalMap=null;material.color.set(/chaussures/i.test(material.name)?'#242121':'#303138');material.roughness=/chaussures/i.test(material.name)?.66:.9;material.needsUpdate=true;}
    }});
    prepareModel?.(context);
   }});resident=actor;
   resident.pivot.name='Jerome_visiteur_Ultra_reflets';
   const token=++loadToken;
   loading=actor.load('jerome').then(()=>{
    if(disposed||token!==loadToken){actor.dispose();return;}
    motionSampler.reset(walk.position,walk.heading);
    actor.place({x:walk.position.x,y:0,z:walk.position.z},walk.heading);actor.animate(0,{moving:false,speed:0,distance:0});
    actor.setVisible(false);revision++;invalidate(false,false);
   }).catch(error=>{
    actor.dispose();if(disposed||token!==loadToken)return;
    failure=error?.message||String(error);resident=null;
    status('Le personnage n’a pas pu être chargé. La visite reste disponible.');
   }).finally(()=>{if(token===loadToken)loading=null;});
  }
  return enabled;
 }

 function tick(dt){
  sync();if(!enabled||!resident?.ready)return false;
  elapsed+=Math.max(0,Math.min(dt,.1));
  if(elapsed<1/30)return false;
  const step=elapsed;elapsed=0;
  const motion=motionSampler.sample(walk.position,walk.heading,step,{running:walk.running});
  resident.place({x:walk.position.x,y:0,z:walk.position.z},motion.heading);
  resident.animate(step,motion);
  resident.pivot.updateMatrixWorld(true);revision++;
  return true;
 }

 // The first-person camera never sees its own head/body, including during the
 // transmission and AO passes. Only a real reflected-scene capture reveals it.
 function withReflection(capture){
  if(!enabled||!resident?.ready||!wanted())return capture();
  const previous=resident.pivot.visible;
  resident.setVisible(true);captures++;
  try{return capture();}finally{resident.pivot.visible=previous;}
 }

 function dispose(){if(disposed)return;disposed=true;enabled=false;loadToken++;loading=null;resident?.dispose();resident=null;}
 return {sync,tick,withReflection,dispose,get ready(){return !!resident?.ready;},get enabled(){return enabled;},
  diagnostics(){return {...(resident?.diagnostics||{}),id:'jerome',loaded:!!resident?.ready,enabled,loading:!!loading,visible:!!resident?.pivot.visible,reflectionOnly:true,reflectionRevision:revision,captureCount:captures,position:walk.position.toArray(),heading:walk.heading,failure};}};
}
