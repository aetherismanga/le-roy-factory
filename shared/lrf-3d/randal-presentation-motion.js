import {Box3,Vector3} from 'three';

export const PRESENTATION_OPENING_DURATION=900;
// Same stepped travel as both native configurators, in local model metres.
export const presentationDrawerTravel=(index,count)=>count===1?.315:index===0?.2:index===count-1?.315:.26;
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const doorAngle=Math.PI*.55,cabinetDoorAngle=Math.PI*.52;

export function presentationDrawerTargets(asset,drawerTravel=presentationDrawerTravel){
 const depth=Number(asset.spec?.depth)>0?Number(asset.spec.depth):.46;
 // Sort the real geometry, rather than assuming an array's assembly order.
 // The General's shallower models scale their complete drawer parent in Z;
 // this local limit therefore scales with the physical carcass as well.
 const drawers=(asset.drawers||[]).map((drawer,index)=>{
  const bounds=new Box3().setFromObject(drawer),height=bounds.isEmpty()?drawer.position.y:bounds.getCenter(new Vector3()).y;
  return {drawer,index,height};
 }).sort((a,b)=>b.height-a.height||a.index-b.index);
 const distances=drawers.map((_,index)=>Math.max(0,Number(drawerTravel(index,drawers.length))||0)),maximum=Math.max(0,...distances),scale=maximum?Math.min(1,depth*.8/maximum):1;
 return drawers.map((entry,index)=>({...entry,travel:distances[index]*scale}));
}

export function createPresentationMotion({getItems,invalidate=()=>{},refresh=()=>{},drawerTravel=presentationDrawerTravel,duration=PRESENTATION_OPENING_DURATION,now=()=>performance.now(),requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id),reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false}){
 let opened=false,disposed=false,frame=null,revision=0;
 function setOpened(value){
  if(disposed)return false;opened=!!value;const turn=++revision;
  if(frame!==null)cancelFrame(frame);frame=null;
  const changes=[];
  for(const item of getItems()||[]){
   const asset=item.asset;
   for(const {drawer,travel}of presentationDrawerTargets(asset,drawerTravel))changes.push({from:drawer.position.z,to:opened?travel:0,set:value=>drawer.position.z=value});
   if(asset.door){
    const from=clamp(Math.abs(asset.door.rotation.y)/doorAngle);
    changes.push({from,to:opened?1:0,set:progress=>{asset.door.rotation.y=progress?-progress*doorAngle*(asset.getHingeSign?.()||1):0;}});
   }else if(asset.setDoorProgress){
    const from=clamp(Math.abs(asset.doors?.[0]?.rotation.y||0)/cabinetDoorAngle);
    changes.push({from,to:opened?1:0,set:progress=>asset.setDoorProgress(progress)});
   }else for(const [index,door]of (asset.doors||[]).entries())changes.push({from:clamp(Math.abs(door.rotation.y)/doorAngle),to:opened?1:0,set:progress=>door.rotation.y=progress?progress*(index%2?1:-1)*doorAngle:0});
  }
  const start=now(),reduced=reducedMotion();
  const tick=time=>{
   frame=null;if(disposed||turn!==revision)return;
   const progress=reduced?1:clamp((time-start)/Math.max(1,duration)),ease=progress*progress*(3-2*progress);
   for(const change of changes)change.set(change.from+(change.to-change.from)*ease);
   refresh();invalidate();if(progress<1)frame=requestFrame(tick);
  };
  if(reduced)tick(start);else frame=requestFrame(tick);
  return true;
 }
 return {setOpened,get opened(){return opened;},dispose(){if(disposed)return;disposed=true;revision++;if(frame!==null)cancelFrame(frame);frame=null;}};
}
