import * as T from 'three';

const clamp=(value,min=0,max=1)=>T.MathUtils.clamp(value,min,max);
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
const angle=value=>Math.atan2(Math.sin(value),Math.cos(value));
const vector=value=>value?.isVector3?value.clone():Array.isArray(value)?new T.Vector3(...value):new T.Vector3(value?.x||0,value?.y||0,value?.z||0);
const belongs=(object,parent)=>{for(let o=object;o;o=o.parent)if(o===parent)return true;return false;};
const visible=object=>{for(let o=object;o;o=o.parent)if(o.visible===false)return false;return true;};
const solidMaterial=object=>(Array.isArray(object.material)?object.material:[object.material]).some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>.05));
const bounds=object=>{if(object.isInstancedMesh){object.computeBoundingBox?.();return object.boundingBox;}object.geometry?.computeBoundingBox?.();return object.geometry?.boundingBox;};

function movingPart(item,target,hit){
 if(target.kind==='drawer')return item.asset?.drawers?.[target.index]||null;
 if(target.kind==='lid')return item.asset?.root?.getObjectByName?.('Abattant')||null;
 if(target.kind!=='door')return null;
 const doors=(item.asset?.doors||[]).filter(o=>o?.isObject3D);
 if(Number.isInteger(target.index)&&doors[target.index])return doors[target.index];
 const clicked=doors.find(door=>belongs(hit?.object,door));if(clicked)return clicked;
 return doors[0]||(item.asset?.door?.isObject3D?item.asset.door:null)||item.root?.getObjectByName?.('Ouvrant_porte')||null;
}

// Keep a point on the actual moving front, rather than a cached world-space hit.
// This works for mirrored hinges, parent scales, and the General column's proxy
// `asset.door`, whose real Object3D leaves live in `asset.doors`.
export function resolveVisitorContact({item,target,hit,actorPosition}={}){
 if(!item?.root?.isObject3D||!target)return null;
 const part=movingPart(item,target,hit);if(!part?.isObject3D)return null;
 item.root.updateWorldMatrix(true,true);
 const actor=vector(actorPosition),handles=[];
 part.traverse(object=>{
  if(!object.isMesh||!visible(object)||!solidMaterial(object)||/Zone_tactile|Rosace|_tige|Paumelle|Charniere/i.test(object.name))return;
  if(/Poign[eé]e|Bequille|Bouton/i.test(object.name)||item.asset?.handles?.includes(object))handles.push(object);
 });
 let node=null,point=null,score=Infinity;
 for(const object of handles){
  const box=bounds(object);if(!box||box.isEmpty())continue;
  const p=box.getCenter(new T.Vector3()),near=object.worldToLocal(actor.clone());
  if(box.max.x-box.min.x>.12)p.x=clamp(near.x,box.min.x+.025,box.max.x-.025);
  const distance=object.localToWorld(p.clone()).distanceToSquared(actor);
  if(distance<score){node=object;point=p;score=distance;}
 }
 const source=node?'handle':'edge';
 if(!node){
  const fronts=[];part.traverse(o=>{if(o.isMesh&&visible(o)&&solidMaterial(o)&&/^(Facade|Vantail|Porte_)/i.test(o.name))fronts.push(o);});
  node=fronts[0];
  if(!node&&target.kind==='lid')part.traverse(o=>{if(!node&&o.isMesh&&visible(o)&&solidMaterial(o))node=o;});
  const box=node&&bounds(node);if(!box||box.isEmpty())return null;
  point=box.getCenter(new T.Vector3());
  const near=node.worldToLocal(actor.clone());
  if(target.kind==='drawer'){
   point.x=clamp(near.x,box.min.x+.025,box.max.x-.025);
   point.y=box.max.y-.008;point.z=box.max.z+.003;
  }else if(target.kind==='lid'){
   point.z=box.max.z-.025;point.y=box.max.y+.003;
  }else{
   // 45-degree full-height grips occupy the free edge of the leaf. A mirrored
   // column retains its authored positive-X free edge; a General right-hinged
   // front is authored with a negative-X centre instead.
   const freeSign=part.userData.side==='right'&&node.position.x<0?-1:1;
   point.x=freeSign>0?box.max.x-.009:box.min.x+.009;
   const comfortable=node.worldToLocal(new T.Vector3(actor.x,1.04,actor.z));
   point.y=clamp(comfortable.y,box.min.y+.045,box.max.y-.045);point.z=box.max.z+.003;
  }
 }
 const localPoint=point.clone(),normalAxis=target.kind==='lid'?new T.Vector3(0,1,0):new T.Vector3(0,0,1);
 const initialPoint=node.localToWorld(localPoint.clone()),initialNormal=normalAxis.clone().transformDirection(part.matrixWorld);
 const normalSign=initialNormal.dot(actor.clone().sub(initialPoint))<0?-1:1;
 return {item,part,node,source,
  valid:()=>belongs(part,item.root)&&belongs(node,part)&&visible(node),
  sample(position=actor){
   item.root.updateWorldMatrix(true,true);
   const p=node.localToWorld(localPoint.clone());
   // Select the side facing the visitor at contact, then keep that physical
   // side as the leaf rotates. Reversing it on every sample would snap the
   // wrist through 180 degrees as an opening leaf crosses the visitor's plane.
   const normal=normalAxis.clone().transformDirection(part.matrixWorld).multiplyScalar(normalSign);
   p.addScaledVector(normal,.006);
   return {target:p.toArray(),normal:normal.toArray()};
  }
 };
}

function armReach(root,side,contact,anticipatePosture=true){
 const shoulder=root?.getObjectByName?.('Bip01_'+side+'_UpperArm'),elbow=root?.getObjectByName?.('Bip01_'+side+'_Forearm'),hand=root?.getObjectByName?.('Bip01_'+side+'_Hand');
 if(!shoulder||!elbow||!hand)return null;
 root.updateWorldMatrix(true,true);
 const a=shoulder.getWorldPosition(new T.Vector3()),b=elbow.getWorldPosition(new T.Vector3()),c=hand.getWorldPosition(new T.Vector3());
 const length=a.distanceTo(b)+b.distanceTo(c),target=vector(contact.target),normal=vector(contact.normal);
 // The resident bends its knees with planted feet for a low grip. Evaluate
 // that same bounded posture here; a fixed standing-shoulder test would reject
 // every lower drawer before its crouch could begin.
 const drop=anticipatePosture?clamp(a.y-(target.y+.42),0,.25):0;a.y-=drop;
 const toward=target.clone().sub(a);toward.y=0;
 if(toward.lengthSq()>1e-8)a.addScaledVector(toward.normalize(),Math.min(.04,drop*.2));
 target.addScaledVector(normal,.04);target.y+=.015;
 const distance=a.distanceTo(target);
 return {side,length,distance,drop,reachable:distance<=length*.985+.025};
}

// Reach -> grip/operate -> release. The action callback fires only at contact,
// once, and is discarded when a reach is cancelled before contact.
export function createVisitorInteraction({getActorRoot,getPosition,getHeading=()=>0,getHandContactPosition,isActive=()=>true,onStateChange=()=>{},onError=()=>{}}){
 let current=null,disposed=false,revision=0,commits=0,cancelled=0,fallbacks=0,lastReason='',lastContactDistance=null;
 function cancel(reason='cancelled'){
  if(!current)return false;
  current=null;cancelled++;revision++;lastReason=reason;onStateChange();return true;
 }
 function start({item,target,hit,commit}={}){
  if(disposed)return false;
  cancel('replaced');
  if(!isActive()||typeof commit!=='function')return false;
  const root=getActorRoot?.(),position=vector(getPosition?.());
  if(!root){lastReason='no-contact';return false;}
  root.updateWorldMatrix(true,true);
  // A continuous grip or wide pull is naturally grasped in front of the hand,
  // not at the visitor's centre line. Evaluate each shoulder against its own
  // valid point on the hardware before selecting the easier arm.
  const contacts=['L','R'].map(side=>{
   const shoulder=root.getObjectByName('Bip01_'+side+'_UpperArm');
   const contact=resolveVisitorContact({item,target,hit,actorPosition:shoulder?.getWorldPosition(new T.Vector3())||position});
   if(!contact)return null;
   const sample=contact.sample(position),reach=armReach(root,side,sample);
   return reach?{...reach,contact,sample}:null;
  }).filter(Boolean);
  if(!contacts.length){lastReason='no-contact';return false;}
  const options=contacts.filter(v=>v.reachable).sort((a,b)=>a.distance-b.distance);
  if(!options.length){lastReason='out-of-reach';return false;}
  const {contact,sample}=options[0];
  current={item,target:{...target},contact,commit,committed:false,elapsed:0,contactWait:0,waiting:false,sensorFailed:false,side:options[0].side,startPosition:position,startHeading:getHeading(),parent:item.root.parent,reach:.30,follow:target.kind==='drawer'?.78:.88,release:.34,lastSample:sample,retreat:false};
  revision++;lastReason='';onStateChange();return true;
 }
 function tick(dt){
  const state=current;if(!state||disposed)return null;
  if(!isActive()){cancel('inactive');return null;}
  if(state.item.root.parent!==state.parent||!state.contact.valid()){cancel('target-removed');return null;}
  const position=vector(getPosition?.());
  const moved=Math.hypot(position.x-state.startPosition.x,position.z-state.startPosition.z);
  if(moved>(state.committed?.46:.18)||Math.abs(angle(getHeading()-state.startHeading))>.95){cancel('visitor-moved');return null;}
  const step=clamp(Number.isFinite(dt)?dt:0,0,.1);state.elapsed+=step;
  if(state.elapsed>=state.reach&&!state.committed){
   if(typeof getHandContactPosition==='function'){
    let hand;
    try{if(!state.sensorFailed)hand=getHandContactPosition(state.side);}catch(error){state.sensorFailed=true;onError(error);}
    const contact=state.contact.sample(position),p=hand&&vector(hand),distance=p&&[p.x,p.y,p.z].every(Number.isFinite)?p.distanceTo(vector(contact.target)):Infinity;
    lastContactDistance=Number.isFinite(distance)?distance:null;
    if(distance>.035){
     state.waiting=true;state.contactWait+=step;state.elapsed=state.reach;state.lastSample=contact;
     if(state.contactWait<=.30)return {...contact,weight:1,grip:.1,effort:.18,side:state.side,lookWeight:.8,phase:'reach',kind:state.target.kind,source:state.contact.source,waitingForContact:true};
     // Preserve the requested mechanism action if a changing pose makes a
     // grip impossible. The arm releases; it never pretends to pull remotely.
     state.committed=true;commits++;fallbacks++;revision++;current=null;lastReason='contact-fallback';
     try{state.commit();}catch(error){lastReason='commit-error';onError(error);}
     onStateChange();return null;
    }
    state.waiting=false;
   }
   state.committed=true;commits++;revision++;
   try{state.commit();}catch(error){cancel('commit-error');onError(error);return null;}
   if(current!==state)return null;
  }
  const releaseAt=state.reach+state.follow,total=releaseAt+state.release;
  if(state.elapsed>=total){current=null;revision++;lastReason='complete';onStateChange();return null;}
  let sample=state.contact.sample(position);
  const reach=armReach(getActorRoot?.(),state.side,sample,false);
  // A leaf can move beyond the hand's natural travel. Let go rather than
  // stretching the arm or cancelling an operation that already made contact.
  if(state.committed&&reach&&reach.distance>reach.length+.12&&state.elapsed<releaseAt){state.elapsed=releaseAt;state.retreat=true;}
  if(state.retreat)sample=state.lastSample;else state.lastSample=sample;
  let phase,weight,grip,effort;
  if(state.elapsed<state.reach){const p=state.elapsed/state.reach;phase='reach';weight=ease(p);grip=typeof getHandContactPosition==='function'?.12*ease(p):ease((p-.35)/.65);effort=.18*weight;}
  else if(state.elapsed<releaseAt){const p=(state.elapsed-state.reach)/state.follow;phase='follow';weight=1;grip=1;effort=.25+.45*Math.sin(Math.PI*p);}
  else{const p=(state.elapsed-releaseAt)/state.release;phase='release';weight=1-ease(p);grip=1-ease(p*1.6);effort=.12*weight;}
  return {...sample,weight,grip,effort,side:state.side,lookWeight:weight*.8,phase,kind:state.target.kind,source:state.contact.source};
 }
 return {start,tick,cancel,get active(){return !!current;},
  diagnostics(){return {active:!!current,itemId:current?.item?.id||null,kind:current?.target.kind||null,phase:current?current.waiting||current.elapsed<current.reach?'reach':current.elapsed<current.reach+current.follow?'follow':'release':'idle',waitingForContact:!!current?.waiting,contactDistance:lastContactDistance,committed:!!current?.committed,side:current?.side||null,commits,cancelled,fallbacks,revision,lastReason};},
  dispose(){cancel('disposed');disposed=true;}
 };
}
