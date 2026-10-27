import {createResident} from './resident.js';

const JEROME={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,
 source:'Microsoft Rocketbox · MIT · textures Jérôme personnalisées',
 maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp',opacity_color:'opacity.webp'}}};

// A high automatic rendering profile, or an HD export, is not a request to
// enable the visitor. Only the user's explicit Ultra choice in a live visit is.
export function ultraVisitorEnabled({walking,qualityMode,capturing=false,hidden=false}){
 return walking===true&&qualityMode==='max'&&!capturing&&!hidden;
}

export function mountUltraVisitorAvatar({scene,renderer,walk,getQuality,isCapturing=()=>false,invalidate=()=>{},status=()=>{},prepareModel}){
 let resident=null,loading=null,enabled=false,disposed=false,failure='',revision=0,captures=0,elapsed=0,loadToken=0;
 const wanted=()=>ultraVisitorEnabled({walking:walk.active,qualityMode:getQuality().mode,capturing:isCapturing(),hidden:typeof document!=='undefined'&&document.hidden});

 function sync(){
  const next=!disposed&&wanted();
  if(!next&&(enabled||resident)){loadToken++;resident?.dispose();resident=null;loading=null;elapsed=0;failure='';}
  enabled=next;
  if(resident)resident.setVisible(false);
  if(enabled&&!resident&&!loading&&!failure){
   const actor=createResident(scene,renderer,{profiles:JEROME,baseURL:'/assets/avatar/jerome-v1/',prepareModel:context=>{
    context.root.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
     if(/opacity/i.test(material.name)){material.color.set('#252321');material.roughness=.85;}
     if(/Jerome_(pantalon|chaussures)/i.test(material.name)){material.map=null;material.normalMap=null;material.color.set(/chaussures/i.test(material.name)?'#242121':'#303138');material.roughness=/chaussures/i.test(material.name)?.66:.9;material.needsUpdate=true;}
    }});
    prepareModel?.(context);
   }});resident=actor;
   resident.pivot.name='Jerome_visiteur_Ultra_reflets';
   const token=++loadToken;
   loading=actor.load('jerome').then(()=>{
    if(disposed||token!==loadToken){actor.dispose();return;}
    actor.place({x:walk.position.x,y:0,z:walk.position.z},walk.heading);actor.animate(0,{moving:false});
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
  resident.place({x:walk.position.x,y:0,z:walk.position.z},walk.heading);
  resident.animate(step,{moving:walk.moving,running:walk.running,heading:walk.heading});
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
