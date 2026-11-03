import * as T from 'three';
import {PRODUCT_BY_ID,topSelection} from './anima-data.js';
import {cabinetFormat} from './configuration.js';
import {continuousPlanGroups,validateProject} from './projects.js';
import {planSettings} from './premium-controls.js';
import {normalizeCabinetRoles} from './cabinet-role.js';

const number=value=>Math.round(value*1000)/1000;
const selectionOf=s=>topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan||s.width,s.topPlanId,s.topLength,s);
const failure=error=>({placement:null,error});
export function prepareAnimaBasinProduct(productId,settings,project){
 const basin=PRODUCT_BY_ID.get(productId);
 if(!basin||!(basin.category==='basin'||basin.category==='worktop'&&basin.subtype==='integrated'))throw Error('Cette référence ne correspond pas à une vasque Anima.');
 return {type:'basin',basinId:basin.id,sourceBasin:basin,sourceSettings:{...settings},project:structuredClone(project),dimensions:{width:(basin.width||50)/100,depth:(basin.depth||30)/100,height:Math.max(.08,(basin.height||14)/100)}};
}
function normalizedPatch(project,host,settings){
 const next=normalizeCabinetRoles({...project,items:project.items.map(item=>item.id===host.id?{...item,settings}:item)});
 validateProject(next);return {project:next,settings:next.items.find(item=>item.id===host.id).settings};
}
function preserveSourceVariant(settings,product,sourceSettings){
 const colour=sourceSettings?.basinPriceKey||sourceSettings?.basinColor;
 if(!product.prices?.some(entry=>entry.key===colour))return settings;
 // Integrated custom bowls inherit the target slab's finish, while an
 // independent vessel (and a complete fixed top) keeps its chosen variant.
 if(product.category==='basin'&&product.subtype==='integrated')return settings;
 const next={...settings,basinColor:colour,...(product.category==='basin'?{basinPriceKey:colour,basinBottom:sourceSettings.basinBottom||'none',basinSupport:sourceSettings.basinSupport===true}:{topPriceKey:colour})};
 return selectionOf(next)?next:settings;
}
function settingsForBasin(project,host,product,preference,sourceSettings){
 const old=selectionOf(host.settings),fixed=product.category==='worktop',groups=continuousPlanGroups(project,host.id);
 if(!fixed&&old?.top&&!old.top.configurableWidth)return [];
 const ids=fixed?[product.id]:old?.top?[old.top.id]:[preference,...(product.compatibleTopIds||[])].filter((id,i,a)=>id&&a.indexOf(id)===i);
 const currentSpan=host.settings.topSpan||host.settings.width,currentOffset=host.settings.topOffset||0;
 const ordered=groups.sort((a,b)=>(a.span===currentSpan&&Math.abs(a.offset-currentOffset)<.001?-1:0)-(b.span===currentSpan&&Math.abs(b.offset-currentOffset)<.001?-1:0)||a.span-b.span);
 const results=[];
 for(const id of ids){
  if(!fixed&&!product.compatibleTopIds?.includes(id))continue;
  for(const group of ordered){
   if(old?.top&&!fixed&&(group.span!==currentSpan||Math.abs(group.offset-currentOffset)>.001))continue;
   const settings=planSettings(project,host,id,group,fixed?null:product.id);
   if(settings){results.push({settings:preserveSourceVariant(settings,product,sourceSettings),group});break;}
  }
  if(results.length)break;
 }
 return results;
}
function topFrame(item){
 const form=cabinetFormat(item.settings.format);if(form.subtype==='wall'||!item.asset?.root)return null;
 const s=item.settings,selection=selectionOf(s),description=item.asset.tops?.root?.userData?.animaTop;
 const width=selection?.topWidth/100||s.width/100,depth=selection?.previewDepth/100||form.depth;
 const x=((s.topOffset||0)+(s.topShift||0))/100,z=description?.zOffset??(form.depth/2-.23+(selection?.top?(selection.previewDepth-selection.referenceDepth)/200:0));
 item.asset.root.updateWorldMatrix(true,false);
 const point=item.asset.root.localToWorld(new T.Vector3(x,form.base+form.height+(selection?.top?.height||0)/100,z));
 return {form,selection,width,depth,x,z,point};
}
function mean(values){return values.reduce((sum,n)=>sum+n,0)/(values.length||1);}
function placementFor(project,host,settings,local,product,group){
 const selection=selectionOf(settings);if(!selection)return null;
 const form=cabinetFormat(settings.format),x=((settings.topOffset||0)+(settings.topShift||0))/100,z=form.depth/2-.23+(selection.previewDepth-selection.referenceDepth)/200;
 const fixed=product.category==='worktop',baseX=mean(selection.positions),baseZ=mean(selection.positionsZ||selection.positions.map(()=>.020));
 const candidate=fixed?settings:{...settings,basinOffsetX:number((settings.basinOffsetX||0)+(local.x-x-baseX)*100),basinOffsetZ:number((settings.basinOffsetZ||0)+(local.z-z-baseZ)*100)};
 const possibilities=[candidate];
 if(!fixed){
  possibilities.push(settings);
  // A near miss at the joint can magnetise onto a real vanity centre. This
  // never stretches a bowl or silently changes the supporting stock widths.
  if(selection.positions.length===1)for(const id of group.ids){const support=project.items.find(item=>item.id===id);if(!support)continue;possibilities.push({...settings,basinOffsetX:number((settings.basinOffsetX||0)+(support.placement.u-host.placement.u)/100*100-x*100-baseX*100)});}
 }
 let nearest=null;
 for(const value of possibilities){
  let normalized;try{normalized=normalizedPatch(project,host,value);}catch{continue;}
  const actual=selectionOf(normalized.settings);if(!actual)continue;
  const centreX=x+mean(actual.positions),centreZ=z+mean(actual.positionsZ||actual.positions.map(()=>.020)),distance=Math.hypot(centreX-local.x,centreZ-local.z);
  if(!fixed&&value!==candidate&&distance>.18)continue;
  if(nearest&&nearest.distance<=distance)continue;
  nearest={...normalized,selection:actual,distance,centreX,centreZ,form};
 }
 return nearest;
}
/** Shared product-drag extension: a basin becomes an existing cabinet setting,
 * never a second scene item or a layer placed on top of its previous basin. */
export function resolveAnimaBasinDrop({ray,composition,product}){
 const r=ray?.ray||ray,project=product?.project,source=PRODUCT_BY_ID.get(product?.basinId);
 if(!r||!source||!project?.items)return failure('Choisissez une vasque du catalogue.');
 const hits=[];
 for(const item of composition?.items||[]){
  if(item.type!=='cabinet')continue;
  const frame=topFrame(item);if(!frame)continue;
  const world=r.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-frame.point.y),new T.Vector3());if(!world)continue;
  const local=item.asset.root.worldToLocal(world.clone());
  if(Math.abs(local.x-frame.x)>frame.width/2+.015||Math.abs(local.z-frame.z)>frame.depth/2+.015)continue;
  hits.push({item,frame,world,local,distance:world.distanceTo(r.origin)});
 }
 hits.sort((a,b)=>a.distance-b.distance||(b.frame.selection?.top?1:0)-(a.frame.selection?.top?1:0));
 let error='Déposez la vasque sur le dessus d’un meuble compatible.';
 for(const hit of hits){
  const host=project.items.find(item=>item.id===hit.item.id);if(!host)continue;
  if(hit.item.locked){error='Déverrouillez le meuble avant d’y déposer une vasque.';continue;}
  const choices=settingsForBasin(project,host,source,product.sourceSettings?.topPlanId,product.sourceSettings);
  if(!choices.length){error=hit.frame.selection?.top&&!hit.frame.selection.top.configurableWidth&&source.category==='basin'?'Ce plan-vasque est une référence complète. Choisissez un plan sur mesure pour y intégrer cette vasque.':'Aucune référence de plan et de sous-vasque catalogue ne permet cette installation.';continue;}
  for(const choice of choices){
   const candidate=placementFor(project,host,choice.settings,hit.local,source,choice.group);if(!candidate)continue;
   const fixed=source.category==='worktop',position=hit.item.asset.root.localToWorld(new T.Vector3(fixed?((candidate.settings.topOffset||0)+(candidate.settings.topShift||0))/100:candidate.centreX,candidate.form.base+candidate.form.height+(fixed?0:(candidate.selection.top.height||0)/100),fixed?hit.frame.z:candidate.centreZ));
   const rotation=new T.Euler().setFromQuaternion(hit.item.asset.root.getWorldQuaternion(new T.Quaternion()),'YXZ').y;
   return {placement:{...host.placement,animaBasinTarget:host.id,animaBasinSettings:candidate.settings,animaBasinPreview:{x:position.x,y:position.y,z:position.z,rotation}},error:'',options:{basinTargetId:host.id,basinSettings:candidate.settings},item:hit.item};
  }
  error='La cuve doit rester dans le plan et au-dessus d’un sous-vasque compatible. Rapprochez-la du centre du meuble.';
 }
 return failure(error);
}
export function animaBasinPreviewTransform(placement){
 const p=placement?.animaBasinPreview;if(!p)return null;
 return {position:new T.Vector3(p.x,p.y,p.z),rotation:p.rotation};
}
