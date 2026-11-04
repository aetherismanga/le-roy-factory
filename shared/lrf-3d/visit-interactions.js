import {windowAmbience} from './window-ambiences.js';
// A visit permits opening mechanisms without enabling placement or editing.
export function createVisitTapGesture({threshold=7,maxDuration=650}={}){
 const pointers=new Set();let candidate=null;
 return {
  down(event){pointers.add(event.pointerId);if(pointers.size===1&&(event.button===0||event.button===undefined))candidate={id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp};else candidate=null;},
  move(event){if(candidate&&Math.hypot(event.clientX-candidate.x,event.clientY-candidate.y)>threshold)candidate=null;},
  up(event){const tap=candidate;pointers.delete(event.pointerId);candidate=null;return !!tap&&tap.id===event.pointerId&&pointers.size===0&&event.timeStamp-tap.time<maxDuration&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<=threshold;},
  cancel(event={}){pointers.delete(event.pointerId);candidate=null;},
  reset(){pointers.clear();candidate=null;}
 };
}

export function visitOpeningTarget(item,hit){
 if(!item?.settings||!hit)return null;
 if(item.type==='cabinet'){
  const drawers=item.asset?.drawers||[];
  for(let object=hit.object;object;object=object.parent){const index=Math.max(drawers.indexOf(object),(item.asset?.doors||[]).indexOf(object));if(index>=0)return {kind:'drawer',index};if(object===item.root)break;}
  return null;
 }
 if(item.type==='column'||item.type==='door')return {kind:'door'};
 if(item.type==='window'&&typeof item.asset?.setOpenProgress==='function')return {kind:'window'};
 if(item.type==='toilet'&&item.asset?.root?.getObjectByName?.('Abattant'))return {kind:'lid'};
 return null;
}
// A menu action opens the whole mechanism even when the hit was the body.
// A direct visit tap remains precise (only the actual clicked drawer opens).
export function visitOpenState(item){
 if(!item?.settings)return null;
 if(item.type==='cabinet'){
  const count=item.asset?.drawers?.length||0;if(count)return {kind:'cabinet',open:Array.from({length:count},(_,i)=>!!item.settings.drawers?.[i]).every(Boolean)};
  if(item.asset?.doors?.length||item.asset?.setDoorProgress)return {kind:'cabinet',open:!!item.settings.doorOpen};return null;
 }
 if(item.type==='column'||item.type==='door')return {kind:'door',open:!!item.settings.doorOpen};
 if(item.type==='window'&&typeof item.asset?.setOpenProgress==='function')return {kind:'window',open:!!item.settings.windowOpen};
 if(item.type==='toilet'&&item.asset?.root?.getObjectByName?.('Abattant'))return {kind:'lid',open:!!item.settings.lidOpen};
 return null;
}
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));

export function createVisitInteractions({getItems,onChange=()=>{}}){
 let transient=false;const originals=new Map();
 function restore(){
  const current=new Set(getItems()||[]),restored=[];
  for(const [item,{fields,windowPose}]of originals){
   if(!current.has(item))continue;
   for(const [key,record]of Object.entries(fields))if(record.present)item.settings[key]=copy(record.value);else delete item.settings[key];
   const lid=item.asset?.root?.getObjectByName?.('Abattant');if(lid)lid.rotation.x=item.settings.lidOpen?-Math.PI*.48:0;
   if(windowPose){item.asset.setOpenProgress(windowPose.progress);item.motion??={};item.motion.window=windowPose.motion;}
   restored.push(item);
  }
  originals.clear();transient=false;for(const item of restored)onChange({item,restored:true,transient:true});return restored.length>0;
 }
 return {
  begin({transient:next=false}={}){restore();transient=!!next;if(transient)for(const item of getItems()||[]){if(!['cabinet','column','door','toilet','window'].includes(item.type))continue;originals.set(item,{fields:Object.fromEntries(['drawers','doorOpen','lidOpen','windowOpen','exteriorAmbience'].map(key=>[key,{present:own(item.settings,key),value:copy(item.settings[key])}])),windowPose:item.type==='window'&&item.asset?.getOpenProgress?{progress:item.asset.getOpenProgress(),motion:item.motion?.window??item.asset.getOpenProgress()}:null});}},
  tap(hit){
   const item=(getItems()||[]).find(value=>value.id===hit?.itemId),target=visitOpeningTarget(item,hit);if(!target)return false;
   if(target.kind==='drawer'){item.settings.drawers=Array.from({length:item.asset.drawers.length},(_,index)=>index===target.index?!item.settings.drawers?.[index]?1:0:item.settings.drawers?.[index]?1:0);}
   else if(target.kind==='door')item.settings.doorOpen=!item.settings.doorOpen;
   else if(target.kind==='window')item.settings.windowOpen=!item.settings.windowOpen;
   else{item.settings.lidOpen=!item.settings.lidOpen;item.asset.root.getObjectByName('Abattant').rotation.x=item.settings.lidOpen?-Math.PI*.48:0;}
   onChange({item,...target,transient});return true;
  },
  toggle(itemId){
   const item=(getItems()||[]).find(value=>value.id===itemId),target=visitOpenState(item);if(!target)return false;
   const open=!target.open;
   if(target.kind==='cabinet'){const count=item.asset?.drawers?.length||0;if(count)item.settings.drawers=Array(count).fill(open?1:0);else item.settings.doorOpen=open;}
   else if(target.kind==='door')item.settings.doorOpen=open;
   else if(target.kind==='window')item.settings.windowOpen=open;
   else{item.settings.lidOpen=open;item.asset.root.getObjectByName('Abattant').rotation.x=open?-Math.PI*.48:0;}
   onChange({item,...target,transient});return true;
  },
  setAmbience(itemId,id){
   const item=(getItems()||[]).find(value=>value.id===itemId),choice=windowAmbience(id);
   if(item?.type!=='window'||!choice)return false;if(item.settings.exteriorAmbience===choice.id)return true;
   item.settings.exteriorAmbience=choice.id;onChange({item,kind:'ambience',transient});return true;
  },
  end:restore,
  get transient(){return transient;}
 };
}
