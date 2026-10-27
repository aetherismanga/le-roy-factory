// Shared by both ateliers: accepted handle actions retain their existing
// commercial state while their visible mechanisms move at a human pace.
export function advanceVisitOpenings(items,dt,{reduced=false,visitor=null,drawerTravel=()=>.3}={}){
 dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));let moving=false;
 for(const item of items||[]){
  if(!['cabinet','column','door'].includes(item.type))continue;
  const asset=item.asset,motion=item.motion||(item.motion={drawers:[],door:0});
  const assisted=!reduced&&!!visitor?.actuating?.(item),beforeDrawers=[...(motion.drawers||[])],beforeDoor=motion.door||0;
  const gain=1-Math.exp(-dt*(assisted?5:8));let changed=false;
  const advance=(from,to,limit=Infinity)=>{
   const delta=to-from;if(Math.abs(delta)<.00004)return to;
   changed=true;if(reduced)return to;
   return from+Math.max(-limit*dt,Math.min(limit*dt,delta*gain));
  };
  if(item.type==='cabinet'){
   motion.drawers||=[];
   for(let i=0;i<(asset.drawers?.length||0);i++){
    motion.drawers[i]=advance(motion.drawers[i]||0,(item.settings.drawers?.[i]||0)*drawerTravel(i,asset.drawers.length),assisted?.55:Infinity);
    asset.drawers[i].position.z=motion.drawers[i];
   }
  }
  const cabinetDoor=item.type==='cabinet'&&typeof asset.setDoorProgress==='function';
  if(cabinetDoor||item.type==='column'||item.type==='door'){
   const target=item.settings.doorOpen||(cabinetDoor&&item.settings.drawers?.length&&item.settings.drawers.every(Boolean))?1:0;
   const leaves=Math.max(1,asset.doors?.length||1),radius=Math.max(.3,(item.dimensions?.width||.6)/leaves);
   motion.door=advance(motion.door||0,target,assisted?.55/(radius*Math.PI*.55):Infinity);
   applyDoor(item,motion.door);
  }
  if(changed&&assisted&&visitor.constrainOpening?.(item,dt)===false){
   // The body could not take a safe small step back. Restore every mechanism
   // in this frame; the action rollback also restores its requested state.
   motion.drawers=beforeDrawers;motion.door=beforeDoor;
   for(let i=0;i<(asset.drawers?.length||0);i++)asset.drawers[i].position.z=motion.drawers[i]||0;
   if(cabinetDoor||item.type==='column'||item.type==='door')applyDoor(item,beforeDoor);
  }else moving=moving||changed;
 }
 return moving;
}

function applyDoor(item,progress){
 const asset=item.asset;
 if(item.type==='cabinet')asset.setDoorProgress(progress);
 else if(item.type==='door')asset.setOpenProgress?.(progress);
 else if(asset.door?.rotation)asset.door.rotation.y=-progress*Math.PI*.55*(asset.getHingeSign?.()||1);
}
