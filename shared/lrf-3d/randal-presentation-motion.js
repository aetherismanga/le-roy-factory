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
 let allTarget=false,disposed=false,frame=null,revision=0;
 const states=new Map();
 const eligible=item=>['cabinet','column'].includes(item.type)&&!!(item.asset?.drawers?.length||item.asset?.door||item.asset?.doors?.length);
 const keyFor=item=>item.id??item.asset;
 function channelsFor(asset){
  const channels=presentationDrawerTargets(asset,drawerTravel).map(({drawer,travel})=>({read:()=>drawer.position.z,full:travel,write:value=>drawer.position.z=value}));
  if(asset.door)channels.push({read:()=>clamp(Math.abs(asset.door.rotation.y)/doorAngle),full:1,write:progress=>{asset.door.rotation.y=progress?-progress*doorAngle*(asset.getHingeSign?.()||1):0;}});
  else if(asset.setDoorProgress&&asset.doors?.length)channels.push({read:()=>clamp(Math.abs(asset.doors[0].rotation.y)/cabinetDoorAngle),full:1,write:progress=>asset.setDoorProgress(progress)});
  else for(const [index,door]of (asset.doors||[]).entries())channels.push({read:()=>clamp(Math.abs(door.rotation.y)/doorAngle),full:1,write:progress=>door.rotation.y=progress?progress*(index%2?1:-1)*doorAngle:0});
  return channels;
 }
 const remember=state=>state.values=state.channels.map(channel=>channel.read());
 const progressOf=state=>{const channels=state.channels.map((channel,index)=>({channel,value:state.values[index]})).filter(({channel})=>channel.full>0);return channels.length?channels.reduce((sum,{channel,value})=>sum+clamp(value/channel.full),0)/channels.length:0;};
 const applyProgress=(state,progress)=>{for(const channel of state.channels)channel.write(channel.full*clamp(progress));remember(state);};
 const paint=()=>{refresh();invalidate();};
 function stopFrame(){if(frame!==null)cancelFrame(frame);frame=null;revision++;}
 function schedule(){
  if(disposed)return;
  if(![...states.values()].some(state=>state.animation)){if(frame!==null)stopFrame();return;}
  if(frame!==null)return;
  const turn=revision;frame=requestFrame(time=>{if(disposed||turn!==revision)return;frame=null;tick(time);});
 }
 function start(state,value,time,remaining=duration){
  const opened=!!value;
  if(state.opened===opened&&state.animation)return false;
  state.opened=opened;
  const changes=state.channels.map(channel=>({channel,from:channel.read(),to:opened?channel.full:0}));
  if(reducedMotion()||remaining<=0){for(const change of changes)change.channel.write(change.to);state.animation=null;}
  else state.animation=changes.some(change=>Math.abs(change.to-change.from)>1e-9)?{start:time,duration:Math.max(1,remaining),changes}:null;
  remember(state);
  return true;
 }
 // A finish/format replacement must not close another object's open drawers.
 // Keep its normalized progress, then finish only its own pending motion.
 function sync(time){
  const items=(getItems()||[]).filter(eligible),present=new Set();let changed=false;
  for(const item of items){
   const key=keyFor(item);present.add(key);let state=states.get(key);
   if(!state){state={asset:item.asset,channels:channelsFor(item.asset),opened:allTarget,animation:null,values:[]};remember(state);states.set(key,state);if(allTarget){state.opened=false;start(state,true,time);changed=true;}}
   else if(state.asset!==item.asset){
    const progress=progressOf(state),animation=state.animation,remaining=animation?animation.start+animation.duration-time:0;
    state.asset=item.asset;state.channels=channelsFor(item.asset);state.animation=null;
    applyProgress(state,animation&&remaining>0?progress:state.opened?1:0);
    if(animation&&remaining>0)start(state,state.opened,time,remaining);
    changed=true;
   }else{
    // Native preview settings can reset drawer positions on the same model.
    // Only this controller changes restricted opening state; restore its last
    // applied values before continuing, without opening any other item.
    state.channels.forEach((channel,index)=>{if(Math.abs(channel.read()-state.values[index])>1e-9){channel.write(state.values[index]);changed=true;}});
   }
  }
  for(const key of states.keys())if(!present.has(key)){states.delete(key);changed=true;}
  return {items,changed};
 }
 function tick(time){
  sync(time);
  for(const state of states.values())if(state.animation){
   const animation=state.animation,progress=clamp((time-animation.start)/animation.duration),ease=progress*progress*(3-2*progress);
   for(const change of animation.changes)change.channel.write(change.from+(change.to-change.from)*ease);
   remember(state);
   if(progress===1)state.animation=null;
  }
  paint();schedule();
 }
 function reconcile(){if(disposed)return [];const {items,changed}=sync(now());if(changed){paint();schedule();}return items;}
 function capabilities(){
  const items=reconcile(),values=items.map(item=>states.get(keyFor(item)).opened),some=values.some(Boolean),opened=values.length>0&&values.every(Boolean);
  return {openable:values.length>0,opened,partlyOpened:some&&!opened};
 }
 function itemCapabilities(id){
  const item=reconcile().find(item=>item.id===id);return {openable:!!item,opened:!!item&&states.get(keyFor(item)).opened};
 }
 function setItemOpened(id,value){
  if(disposed)return false;const time=now(),{items}=sync(time),item=items.find(item=>item.id===id);if(!item)return false;
  if(start(states.get(keyFor(item)),value,time)){stopFrame();paint();schedule();}return true;
 }
 function setOpened(value){
  if(disposed)return false;const time=now(),{items}=sync(time);allTarget=!!value;
  for(const item of items)start(states.get(keyFor(item)),allTarget,time);
  stopFrame();paint();schedule();return true;
 }
 return {setOpened,setItemOpened,itemCapabilities,isItemOpened:id=>itemCapabilities(id).opened,refresh:reconcile,capabilities,get opened(){return capabilities().opened;},get partlyOpened(){return capabilities().partlyOpened;},dispose(){if(disposed)return;disposed=true;stopFrame();states.clear();}};
}
