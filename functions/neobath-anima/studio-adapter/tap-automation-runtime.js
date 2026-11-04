import {AQUAHOME} from '@studio-one-original/taps.js';
import {aquahomeProfile} from '../../../shared/lrf-3d/aquahome-profiles.js';
import {cabinetFormat} from './configuration.js';
import {topSelection} from './anima-data.js';
import {planTapContext} from './tap-drilling.js';
import {checkAnimaTapCompatibility} from './tap-compatibility.js';
import {normalizeAnimaProjectTaps,matchAnimaWallTaps,recommendedAnimaWallOutlet} from './tap-installation.js';

export const animaTapPolicyOptions={products:AQUAHOME,profileForProduct:aquahomeProfile};
export function animaPlanTapContext(item){
 if(!item||!['cabinet','worktop'].includes(item.type))return null;
 const s=item.settings,p=item.placement;if(!p||Math.abs(Number(p.rotation||0)%360)>1e-7)return null;
 const form=item.type==='cabinet'?cabinetFormat(s.format):null;
 const selection=topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan||s.width,s.topPlanId,s.topLength,s);if(!selection?.top)return null;
 const context=planTapContext(selection,{surfaceY:form?form.base+form.height:0,cabinetDepth:form?.depth??selection.referenceDepth/100});
 const topOffset=((s.topOffset||0)+(s.topShift||0))/100;
 return {...context,holes:context.holes.map(hole=>({...hole,x:hole.x+topOffset})),topOffset,origin:{u:p.u/100,y:p.height/100-(form?.base||0),z:.23+(p.offset||0)/100}};
}
function aeratorPosition(asset,relativeRoot=asset?.root){
 const outlet=asset?.root?.getObjectByName('Mousseur');if(!outlet||!relativeRoot)return null;
 relativeRoot.updateWorldMatrix(true,true);const point=outlet.getWorldPosition(outlet.position.clone());relativeRoot.worldToLocal(point);return point;
}
export function animaWallTapContext(item,live){
 if(item?.type!=='tap'||item.settings?.use!=='basin-wall'||!live?.asset)return null;
 const point=aeratorPosition(live.asset,live.root),p=item.placement;if(!point||!p)return null;
 return {outlet:{x:p.u/100+point.x,y:p.height/100+point.y,z:.23+(p.offset||0)/100+point.z}};
}
export function normalizeAnimaLiveTaps(project,liveItems=[]){
 return normalizeAnimaProjectTaps(project,{...animaTapPolicyOptions,contextForItem:animaPlanTapContext,wallContextForItem:item=>animaWallTapContext(item,liveItems.find(live=>live.id===item.id))});
}
export function animaProspectiveTapCheck(item,reference){
 const product=AQUAHOME.find(product=>product.reference===reference);
 const context=animaPlanTapContext({...item,settings:{...item.settings,tapMode:'manual'}});
 let profile;try{profile=product&&aquahomeProfile(product);}catch{}
 return checkAnimaTapCompatibility(product,context,profile);
}
export function animaCompatibleTapProducts(item){
 const context=animaPlanTapContext({...item,settings:{...item.settings,tapMode:'auto'}});
 return AQUAHOME.filter(product=>['basin','basin-xl'].includes(product.use)).filter(product=>{try{return checkAnimaTapCompatibility(product,context,aquahomeProfile(product)).compatible;}catch{return false;}});
}
export function animaWallTapProposal(project,host,product,asset){
 if(product?.use!=='basin-wall')return null;
 const context=animaPlanTapContext(host),local=aeratorPosition(asset);if(!context?.top?.wells?.length||!local)return null;
 // Preserve the model's real wall rosettes at offset zero. The spout must
 // reach the existing opening; a short mixer is never moved off the wall.
 const indices=context.top.wells.map((_,index)=>index).filter(index=>!host.settings.tapWallIds?.[index]);
 for(const index of indices){
  const target=recommendedAnimaWallOutlet(context,index);if(!target)continue;
  const placement={wall:host.placement.wall,u:(target.x-local.x)*100,height:(target.y-local.y)*100,offset:0};
  const candidate={id:'anima-prospective-wall-tap',type:'tap',settings:{use:'basin-wall',tap:product.reference,metal:product.finish},placement};
  const draft={...project,items:project.items.concat(candidate)};
  const matches=matchAnimaWallTaps(draft,{products:AQUAHOME,contextForItem:animaPlanTapContext,wallContextForItem:item=>item.id===candidate.id?{outlet:{x:placement.u/100+local.x,y:placement.height/100+local.y,z:.23+local.z}}:null});
  const ids=matches.byHost?.[host.id];
  if(ids?.[index]===candidate.id)return {placement,wellIndex:index};
 }
 return null;
}
