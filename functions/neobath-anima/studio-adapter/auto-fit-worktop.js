import {topSelection} from './anima-data.js';
import {continuousPlanGroups,continuousTopContext,continuousTopCompatible,validateProject} from './projects.js';
import {normalizeCabinetRoles} from './cabinet-role.js';

const selectionOf=s=>topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan??s.width,s.topPlanId,s.topLength,s);
const close=(a,b)=>Math.abs(a-b)<.000001;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/(values.length||1);
const round=value=>Math.round(value*1000000)/1000000;
const locked=(project,item)=>project.locked?item.positionUnlocked!==true:!!item.locked;

// Old projects have no flag. Only their flush, unshifted slabs are inferred to
// be automatic; a deliberate overhang or offset remains a manual dimension.
export function worktopFitsAutomatically(settings={}){
 if(settings.topAutoFit!==undefined)return settings.topAutoFit===true;
 return close(settings.topLength??settings.topSpan??settings.width,settings.topSpan??settings.width)&&close(settings.topShift||0,0);
}

/** Illustrated controls use the whole valid group by default, never a resized
 * stock reference. Contexts have already passed catalogue and bowl-fit checks. */
export function preferredWorktopContext(choice,settings={}){
 const contexts=choice?.contexts||[];
 if(!contexts.length)return null;
 if(choice.product?.configurableWidth&&worktopFitsAutomatically(settings))return [...contexts].sort((a,b)=>b.span-a.span||Math.abs(a.offset)-Math.abs(b.offset))[0];
 return contexts.find(context=>close(context.span,settings.topSpan??settings.width)&&close(context.offset,settings.topOffset||0))||contexts[0];
}

/** Fit a continuous slab to the current stock supports. Bowl centres keep
 * their position over the existing caissons whenever the new slab allows it. */
export function automaticWorktopSettings(settings,group){
 const before=selectionOf(settings);
 if(!before?.top?.configurableWidth)return null;
 let next={...settings,topAutoFit:true,topSpan:group.span,topOffset:group.offset,topLength:group.span,topShift:0};
 const after=selectionOf(next);if(!after)return null;
 if(before.positions.length!==after.positions.length)return null;
 if(before.positions.length){
  const oldCentre=(settings.topOffset||0)+(settings.topShift||0)+mean(before.positions)*100;
  const newCentre=group.offset+mean(after.positions)*100;
  next.basinOffsetX=round((next.basinOffsetX||0)+oldCentre-newCentre);
  const fitted=selectionOf(next);if(!fitted)return null;
  // The catalogue's double layout spaces bowls by slab width. One shared
  // offset can preserve the mean while silently moving both cutouts. Until
  // independent cutout positions exist, refuse that automatic resize.
  if(before.positions.some((x,i)=>!close((settings.topOffset||0)+(settings.topShift||0)+x*100,next.topOffset+fitted.positions[i]*100)||!close((before.positionsZ?.[i]??.020)*100,(fitted.positionsZ?.[i]??.020)*100)))return null;
 }
 return next;
}

// Pure project transaction: unrelated settings/placements are retained. The
// live adapter commits the resulting furniture/vanity changes atomically.
export function normalizeAutomaticWorktops(project){
 let current=project;
 for(const original of project.items||[]){
  const host=current.items.find(item=>item.id===original.id);
  if(host?.type!=='cabinet'||locked(current,host)||!worktopFitsAutomatically(host.settings))continue;
  const selected=selectionOf(host.settings);if(!selected?.top?.configurableWidth)continue;
  const occupied=new Set(current.items.flatMap(item=>item.type==='cabinet'&&item.id!==host.id&&selectionOf(item.settings)?.top?(continuousTopContext(current,item)?.ids||[item.id]):[]));
  const groups=[...continuousPlanGroups(current,host.id)].sort((a,b)=>b.span-a.span||Math.abs(a.offset)-Math.abs(b.offset));
  for(const group of groups){
   if(group.ids.some(id=>occupied.has(id)||locked(current,current.items.find(item=>item.id===id))))continue;
   const s=host.settings;
   if(close(group.span,s.topSpan??s.width)&&close(group.offset,s.topOffset||0)&&close(s.topLength??group.span,group.span)&&close(s.topShift||0,0))break;
   const settings=automaticWorktopSettings(s,group);if(!settings)continue;
   let candidate={...current,items:current.items.map(item=>item.id===host.id?{...item,settings}:item)};
   try{
    candidate=normalizeCabinetRoles(candidate);
    const fitted=candidate.items.find(item=>item.id===host.id);
    if(!continuousTopCompatible(candidate,host.id,fitted.settings.top,group.span,group.offset))continue;
    if(candidate.room)validateProject(candidate);
   }catch{continue;}
   current=candidate;break;
  }
 }
 return current;
}
