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
  const drawers=item.asset?.drawers||[],doors=item.asset?.doors||[];
  for(let object=hit.object;object;object=object.parent){const index=drawers.indexOf(object);if(index>=0)return {kind:'drawer',index};const door=doors.indexOf(object);if(door>=0)return {kind:'door',index:door};if(object===item.root)break;}
  return null;
 }
 if(item.type==='column'||item.type==='door')return {kind:'door'};
 if(item.type==='toilet'&&item.asset?.root?.getObjectByName?.('Abattant'))return {kind:'lid'};
 return null;
}
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));

export function createVisitInteractions({getItems,onChange=()=>{},onBeforeAction=()=>false,onCancelAction=()=>{}}){
 let transient=false,generation=0;const originals=new Map();
 function restore(){
  generation++;onCancelAction();
  const current=new Set(getItems()||[]),restored=[];
  for(const [item,fields]of originals){
   if(!current.has(item))continue;
   for(const [key,record]of Object.entries(fields))if(record.present)item.settings[key]=copy(record.value);else delete item.settings[key];
   const lid=item.asset?.root?.getObjectByName?.('Abattant');if(lid)lid.rotation.x=item.settings.lidOpen?-Math.PI*.48:0;
   restored.push(item);
  }
  originals.clear();transient=false;for(const item of restored)onChange({item,restored:true,transient:true});return restored.length>0;
 }
 return {
  begin({transient:next=false}={}){restore();transient=!!next;if(transient)for(const item of getItems()||[]){if(!['cabinet','column','door','toilet'].includes(item.type))continue;originals.set(item,Object.fromEntries(['drawers','doorOpen','lidOpen'].map(key=>[key,{present:own(item.settings,key),value:copy(item.settings[key])}])));}},
  tap(hit){
   const item=(getItems()||[]).find(value=>value.id===hit?.itemId),target=visitOpeningTarget(item,hit);if(!target)return false;
   const token=++generation,opening=target.kind==='drawer'?!item.settings.drawers?.[target.index]:target.kind==='door'?!item.settings.doorOpen:!item.settings.lidOpen;
   let committed=false;
   // A reachable Ultra visitor commits only when its palm reaches the handle.
   // Tokens also protect locked previews and project replacement from a late
   // contact callback. Ordinary visits and distant clicks remain immediate.
   const commit=()=>{
    if(committed||token!==generation||!(getItems()||[]).includes(item))return false;
    committed=true;
    if(target.kind==='drawer')item.settings.drawers=Array.from({length:item.asset.drawers.length},(_,index)=>index===target.index?Number(opening):Number(!!item.settings.drawers?.[index]));
    else if(target.kind==='door')item.settings.doorOpen=opening;
    else{item.settings.lidOpen=opening;item.asset.root.getObjectByName('Abattant').rotation.x=opening?-Math.PI*.48:0;}
    onChange({item,...target,opening,transient});return true;
   };
   const rollback=()=>{
    if(!committed||token!==generation||!(getItems()||[]).includes(item))return false;
    if(target.kind==='drawer')item.settings.drawers[target.index]=Number(!opening);
    else if(target.kind==='door')item.settings.doorOpen=!opening;
    else{item.settings.lidOpen=!opening;item.asset.root.getObjectByName('Abattant').rotation.x=!opening?-Math.PI*.48:0;}
    onChange({item,...target,opening:!opening,transient,blocked:true});return true;
   };
   if(onBeforeAction({item,target,hit,opening,commit,rollback,transient})!==true){onCancelAction();commit();}
   return true;
  },
  end:restore,
  get transient(){return transient;}
 };
}
