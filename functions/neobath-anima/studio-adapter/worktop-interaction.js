import {normalizeCabinetRoles} from './cabinet-role.js';
import {CABINET_FORMATS} from './configuration.js';
import {topSelection} from './anima-data.js';
import {continuousPlanGroups,continuousTopContext,validateProject} from './projects.js';

// The deck and its basin-mounted mixer change owner together. Stock furniture,
// hardware and placements keep their identities. Source tariffs travel with the deck.
export const WORKTOP_SETTINGS=Object.freeze(['tap','tapMode','tapWallIds','tapPreferredRef','top','topPlanId','topSpan','topOffset','topLength','topShift','topAutoFit','topDepth','basinOffsetX','basinOffsetZ','topSurfaceId','topSurfaceNcs','topPriceKey','basinPriceKey','basinColor','basinLayout','basinBottom','basinSupport']);
const clone=value=>structuredClone(value);
const formOf=item=>CABINET_FORMATS.find(form=>form.id===item?.settings?.format);
const cabinet=(project,id)=>project?.items?.find(item=>item.id===id&&item.type==='cabinet');
const locked=(project,item)=>!!item&&(project?.locked?item.positionUnlocked!==true:!!item.locked);
const selectionOf=item=>item&&topSelection(item.settings.top,item.settings.width,item.settings.format,item.settings.basinLayout,item.settings.topSpan??item.settings.width,item.settings.topPlanId,item.settings.topLength,item.settings);
const round=value=>Math.round(value*1000000)/1000000;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const add=(point,tangent,distance)=>({x:point.x+tangent.x*distance,y:point.y,z:point.z+tangent.z*distance});
function bareSettings(settings){const result={...settings};for(const key of WORKTOP_SETTINGS)if(key!=='tap'||selectionOf({settings})?.positions?.length)delete result[key];return {...result,top:'bare',topSpan:settings.width,topOffset:0};}
function occupiedSupports(project,exceptId){const occupied=new Set();for(const item of project.items||[]){if(item.type!=='cabinet'||item.id===exceptId||!item.settings.top||item.settings.top==='bare')continue;const context=continuousTopContext(project,item);for(const id of context?.ids||[item.id])occupied.add(id);}return occupied;}

export function isCustomWorktop(item){return !!selectionOf(item)?.top?.configurableWidth;}
export function isWorktopHit(hit){for(let object=hit?.object;object;object=object.parent)if(object.userData?.animaWorktopTarget||object.userData?.animaTop)return true;return !!hit?.animaWorktopTarget;}

/** Pure reattachment: reject invalid supports before touching the live scene. */
export function transferPlan(project,sourceId,targetId,{supportIds,topShift=0}={}){
 const source=cabinet(project,sourceId),target=cabinet(project,targetId);
 if(!source||!target||!isCustomWorktop(source))throw Error('Choisissez un plan sur mesure.');
 if(locked(project,source)||locked(project,target))throw Error('Déverrouillez le meuble avant de déplacer son plan.');
 const carriesBasin=!!selectionOf(source)?.positions?.length;
 const payload=Object.fromEntries(WORKTOP_SETTINGS.filter(key=>(key!=='tap'||carriesBasin)&&Object.hasOwn(source.settings,key)).map(key=>[key,clone(source.settings[key])]));
 const next=clone(project),from=cabinet(next,sourceId),to=cabinet(next,targetId);
 from.settings=bareSettings(from.settings);
 const occupied=occupiedSupports(next,sourceId);
 if(occupied.has(targetId))throw Error('Ce meuble porte déjà un autre plan.');
 const groups=continuousPlanGroups(next,targetId);
 const ids=supportIds||[targetId];
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('Supports de plan invalides.');
 const context=groups.find(group=>group.ids.length===ids.length&&group.ids.every(id=>ids.includes(id)));
 if(!context||context.ids.some(id=>occupied.has(id)||locked(next,cabinet(next,id))))throw Error('Le plan doit reposer sur des meubles libres, juxtaposés et à la même hauteur.');
 if(!Number.isFinite(topShift))throw Error('Décalage de plan invalide.');
 to.settings={...to.settings,...payload,topSpan:context.span,topOffset:context.offset,topShift:round(topShift),topAutoFit:false};
 const normalized=normalizeCabinetRoles(next);validateProject(normalized);
 return {project:normalized,sourceId,targetId,context,topShift:round(topShift)};
}

/** Frames are real cabinet surface centres in metres, supplied by the scene. */
export function findWorktopSnap(project,sourceId,desired,{frames=[],maxDistance=.28,maxHeight=.20,snapDistance=.08}={}){
 const source=cabinet(project,sourceId),selection=selectionOf(source);if(!source||!selection?.top?.configurableWidth||!desired||![desired.x,desired.y,desired.z].every(Number.isFinite))return null;
 const empty=clone(project);cabinet(empty,sourceId).settings=bareSettings(source.settings);
 const framesById=new Map(frames.map(frame=>[frame.id,frame]));let best=null;
 for(const target of empty.items){
  const frame=framesById.get(target.id),form=formOf(target);
  if(!frame||target.type!=='cabinet'||!['vanity','base'].includes(form?.subtype)||locked(project,target))continue;
  for(const context of continuousPlanGroups(empty,target.id)){
   const centre=add(frame.center,frame.tangent,context.offset/100);
   if(Math.abs(desired.y-centre.y)>maxHeight)continue;
   const available=(selection.topLength-context.span)/2;if(available<0)continue;
   const projected=((desired.x-centre.x)*frame.tangent.x+(desired.z-centre.z)*frame.tangent.z)*100;
   const shift=Math.abs(projected)<snapDistance*100?0:Math.max(-available,Math.min(available,projected));
   const position=add(centre,frame.tangent,shift/100),distance=dist(desired,position);
   if(distance>maxDistance)continue;
   let transfer;try{transfer=transferPlan(project,sourceId,target.id,{supportIds:context.ids,topShift:shift});}catch{continue;}
   // Prefer a generous real bearing surface when two placements are equally
   // close; retaining the owner avoids pointless transfers on the same deck.
   const score=distance+Math.abs(desired.y-centre.y)*.15-context.span*.00001+(target.id===sourceId?-.000001:0);
   if(!best||score<best.score)best={...transfer,position,rotation:frame.rotation??0,distance,score};
  }
 }
 return best;
}

/** A capture listener installed before Studio One's cabinet drag handler. */
export function setupWorktopDragging({canvas,controls,enabled=()=>true,getProject,getItem,pick,pointOnPlane,getFrames,getCentre,isLocked=()=>false,onTap=()=>{},onSelect=()=>{},onStart=()=>{},onPreview=()=>{},onRestore=()=>{},onCommit=()=>false,onEnd=()=>{},status=()=>{}}){
 let active=null;const listeners=[],suppressed=new Set();
 const consume=event=>{event.preventDefault?.();event.stopImmediatePropagation?.();};
 const finish=(cancel,event)=>{
  const current=active;if(!current)return;active=null;
  onRestore(current);controls.enabled=current.controlsEnabled;
  try{if(canvas.hasPointerCapture?.(current.pointerId))canvas.releasePointerCapture(current.pointerId);}catch{}
  if(current.dragging){
   let committed=false;
   if(!cancel&&enabled()&&!isLocked(current.item)&&current.snap){try{committed=onCommit(current.snap)!==false;}catch{committed=false;}}
   if(!committed)status(cancel?'Déplacement du plan annulé.':'Rapprochez le plan d’un meuble compatible ; sa position initiale a été rétablie.');
   onEnd({cancelled:!committed,snap:committed?current.snap:null});
  }else if(!cancel&&event&&Math.hypot(event.clientX-current.x,event.clientY-current.y)<=6&&event.timeStamp-current.time<650){onTap({...current.hit,editTarget:'basin',itemId:current.item.id});}
 };
 const down=event=>{
  if(suppressed.size){suppressed.add(event.pointerId);consume(event);return;}
  if(active&&event.pointerId!==active.pointerId){suppressed.add(active.pointerId);suppressed.add(event.pointerId);consume(event);finish(true);return;}
  if(event.button!==0||!enabled())return;
  const hit=pick(event),item=hit?.itemId&&getItem(hit.itemId);
  if(!item||item.type!=='cabinet'||!isWorktopHit(hit))return;
  const centre=getCentre(item);if(!centre)return;
  const point=pointOnPlane(event,centre.y);if(!point)return;
  consume(event);
  active={pointerId:event.pointerId,item,hit,x:event.clientX,y:event.clientY,time:event.timeStamp,point,centre,controlsEnabled:controls.enabled,dragging:false,movable:isCustomWorktop(item)&&!isLocked(item),snap:null};
  controls.enabled=false;onSelect(item.id);
  try{canvas.setPointerCapture(event.pointerId);}catch{}
 };
 const move=event=>{
  if(suppressed.has(event.pointerId)){consume(event);return;}
  const current=active;if(!current||event.pointerId!==current.pointerId)return;
  consume(event);if(!enabled()||isLocked(current.item)&&current.dragging){finish(true);return;}
  if(!current.movable||Math.hypot(event.clientX-current.x,event.clientY-current.y)<6&&!current.dragging)return;
  const point=pointOnPlane(event,current.centre.y);if(!point)return;
  if(!current.dragging){current.dragging=true;onStart(current);}
  const desired={x:current.centre.x+point.x-current.point.x,y:current.centre.y,z:current.centre.z+point.z-current.point.z};
  const project=getProject();
  if(!cabinet(project,current.item.id)){finish(true);return;}
  current.snap=findWorktopSnap(project,current.item.id,desired,{frames:getFrames()});
  onPreview({item:current.item,position:current.snap?.position||desired,rotation:current.snap?.rotation,snapped:!!current.snap,origin:current.centre});
 };
 const up=event=>{if(suppressed.delete(event.pointerId)){consume(event);return;}if(active?.pointerId!==event.pointerId)return;consume(event);finish(false,event);};
 const cancel=event=>{if(suppressed.delete(event.pointerId)){consume(event);return;}if(active?.pointerId===event.pointerId){consume(event);finish(true);}};
 const lost=event=>{if(active?.pointerId===event.pointerId)finish(true);};
 for(const [name,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',lost]]){canvas.addEventListener(name,handler,true);listeners.push([name,handler]);}
 return {cancel:()=>finish(true),getActive:()=>active,dispose(){finish(true);suppressed.clear();for(const [name,handler]of listeners)canvas.removeEventListener(name,handler,true);}};
}
