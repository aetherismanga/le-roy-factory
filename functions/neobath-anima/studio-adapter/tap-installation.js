import {checkAnimaTapCompatibility} from './tap-compatibility.js';
import {normalizeTapDrilling} from './tap-drilling.js';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const hosts=new Set(['cabinet','worktop']);
const deckUses=new Set(['basin','basin-xl']);
const allowedModes=new Set(['auto','manual','none']);
const locked=(project,item)=>project.locked?item.positionUnlocked!==true:!!item.locked;
const rotation=item=>Math.abs(Number(item.placement?.rotation||0)%360)<1e-7;
const reference=(products,id)=>products.find(product=>product.reference===id)||null;
const profileFor=(product,profileForProduct)=>{try{return profileForProduct(product);}catch{return null;}};

/** Project-safe field checks. Source reference validation remains supplied by
 * the caller's canonical AquaHome catalogue; no catalogue/renderer is copied. */
export function validateAnimaTapInstallation(settings={}, {project,hostId,wellCount}={}){
 normalizeTapDrilling(settings);
 if(settings.tapMode!==undefined&&!allowedModes.has(settings.tapMode))throw Error('Mode de mitigeur inconnu.');
 for(const key of ['tap','tapPreferredRef'])if(settings[key]!==undefined&&settings[key]!==null&&(typeof settings[key]!=='string'||settings[key].length>120))throw Error('Référence de mitigeur invalide.');
 const ids=settings.tapWallIds||[],actual=ids.filter(Boolean);
 if(new Set(actual).size!==actual.length)throw Error('Un mitigeur mural ne peut desservir deux vasques.');
 if(wellCount!==undefined&&(ids.length>wellCount||!Number.isInteger(wellCount)||wellCount<0||wellCount>2))throw Error('Association de mitigeur mural hors de la vasque.');
 if(project){
  const host=project.items?.find(item=>item.id===hostId);
  for(const id of actual){
   const item=project.items?.find(item=>item.id===id);
   if(!item||item.type!=='tap'||item.settings?.use!=='basin-wall'||host&&item.placement?.wall!==host.placement?.wall)throw Error('Le mitigeur mural associé ne correspond pas à cette vasque.');
  }
 }
 return true;
}

/** Every returned product has passed the actual bore/base, reach and rim
 * checks. Height preference selects a normal mixer for an integrated bowl or
 * semi-recessed rim and an XL mixer for a raised countertop vessel. */
export function chooseAnimaAutomaticTap(context,settings={}, {products=[],profileForProduct=()=>null}={}){
 const wells=context?.top?.wells||[],preferredUse=wells.some(well=>well.kind==='countertop'||(well.rimRise??0)>.065)?'basin-xl':'basin';
 const current=reference(products,settings.tap||settings.tapPreferredRef),preferredFinish=settings.tapFinish||current?.finish||'Chrome brillant';
 const candidates=products.filter(product=>deckUses.has(product.use)).filter(product=>checkAnimaTapCompatibility(product,context,profileFor(product,profileForProduct)).compatible);
 const rank=product=>(product.use===preferredUse?0:4)+(product.finish===preferredFinish?0:product.finish==='Chrome brillant'?1:2);
 return candidates.map((product,index)=>({product,index,rank:rank(product)})).sort((a,b)=>a.rank-b.rank||a.index-b.index)[0]?.product||null;
}

export function resolveAnimaTapSettings(settings={},context,options={}){
 const products=options.products||[],wells=context?.top?.wells||[],count=wells.length;
 const mode=settings.tapMode??(settings.tap?'manual':'auto');
 validateAnimaTapInstallation({...settings,tapMode:mode},{wellCount:count});
 const tapWallIds=Array.from({length:count},(_,index)=>settings.tapWallIds?.[index]||null);
 const previous=reference(products,settings.tap||settings.tapPreferredRef);
 let tap=null,tapMode=mode,tapPreferredRef=previous&&deckUses.has(previous.use)?previous.reference:null;
 if(count&&mode!=='none'&&context?.holes?.length){
  const selected=previous,preferredUse=wells.some(well=>well.kind==='countertop'||(well.rimRise??0)>.065)?'basin-xl':'basin';
  if(selected&&deckUses.has(selected.use)&&(mode==='manual'||selected.use===preferredUse)&&checkAnimaTapCompatibility(selected,context,profileFor(selected,options.profileForProduct||(()=>null))).compatible)tap=selected.reference;
  else{tap=chooseAnimaAutomaticTap(context,settings,options)?.reference||null;tapMode='auto';}
 }
 if(tap)tapPreferredRef=tap;
 return {...settings,tap,tapMode,tapWallIds,...(tapPreferredRef?{tapPreferredRef}:{})};
}

function opening(context,index){
 const well=context?.top?.wells?.[index],origin=context?.origin;
 if(!well||!origin||![origin.u,origin.y,origin.z].every(finite))return null;
 const top=context.top,offset=context.topOffset||0,x=origin.u+(well.openingCenterX??well.x)+offset,z=origin.z+(well.openingCenterZ??well.z),width=well.openingWidth??well.width,depth=well.openingDepth??well.depth;
 const rise=well.kind==='integrated'?0:well.rimRise??well.height;
 if(![x,z,width,depth,rise,top.topSurface].every(finite)||width<=.028||depth<=.028)return null;
 return {x,z,width,depth,power:well.openingPower??well.power??(well.kind==='integrated'?4:2),rim:origin.y+top.topSurface+rise};
}

export function recommendedAnimaWallOutlet(context,index=0){const well=opening(context,index);return well?{x:well.x,y:well.rim+.10,z:well.z}:null;}

/** Wall-local metres come from the actual equipment aerator after native
 * assembly/normalization. A bathroom wall tap is never inferred from a bath
 * mixer, shared wall alone, or proximity to the caisson's rectangular bounds. */
export function matchAnimaWallTaps(project,{contextForItem=()=>null,wallContextForItem=()=>null,products=[]}={}){
 const byHost=Object.create(null),byWall=Object.create(null),candidates=[],reserved=new Set();
 for(const host of project.items||[]){
  if(!hosts.has(host.type))continue;
  const context=contextForItem(host,project),count=context?.top?.wells?.length||0;
  byHost[host.id]=Array(count).fill(null);
  if(locked(project,host)){for(const id of host.settings.tapWallIds||[])if(id)reserved.add(id);continue;}
  if(!rotation(host))continue;
  for(const wall of project.items||[]){
   if(wall.type!=='tap'||wall.settings?.use!=='basin-wall'||wall.placement?.wall!==host.placement?.wall||!rotation(wall))continue;
   const product=reference(products,wall.settings.tap);if(product?.use!=='basin-wall')continue;
   const outlet=wallContextForItem(wall,project)?.outlet;if(!outlet||![outlet.x,outlet.y,outlet.z].every(finite))continue;
   for(let index=0;index<count;index++){
    const well=opening(context,index);if(!well)continue;
    const dx=(outlet.x-well.x)/(well.width/2-.014),dz=(outlet.z-well.z)/(well.depth/2-.014),gap=outlet.y-well.rim;
    if(Math.abs(dx)**well.power+Math.abs(dz)**well.power>1+1e-8||gap<.020-1e-7||gap>.35+1e-7)continue;
    candidates.push({hostId:host.id,index,wallId:wall.id,score:dx*dx+dz*dz+Math.abs(gap-.10)});
   }
  }
 }
 candidates.sort((a,b)=>a.score-b.score||a.hostId.localeCompare(b.hostId)||a.index-b.index||a.wallId.localeCompare(b.wallId));
 for(const candidate of candidates){if(reserved.has(candidate.wallId)||byWall[candidate.wallId]||byHost[candidate.hostId][candidate.index])continue;byHost[candidate.hostId][candidate.index]=candidate.wallId;byWall[candidate.wallId]={hostId:candidate.hostId,wellIndex:candidate.index};}
 return {byHost,byWall};
}

const settingsSame=(a,b)=>a.tap===b.tap&&a.tapMode===b.tapMode&&a.tapPreferredRef===b.tapPreferredRef&&JSON.stringify(a.tapWallIds)===JSON.stringify(b.tapWallIds);
export function normalizeAnimaProjectTaps(project,options={}){
 if(options.readOnly)return project;
 const matches=matchAnimaWallTaps(project,options);let changed=false;
 const items=(project.items||[]).map(host=>{
  if(!hosts.has(host.type)||locked(project,host))return host;
  const assigned=matches.byHost[host.id]||[],candidate={...host,settings:{...host.settings,tapWallIds:assigned}},context=options.contextForItem?.(candidate,project);
  const next=resolveAnimaTapSettings(candidate.settings,context,options);
  if(!context?.top?.wells?.length&&host.settings.tap==null&&host.settings.tapMode===undefined&&host.settings.tapWallIds===undefined)return host;
  if(settingsSame(host.settings,next))return host;
  changed=true;return {...host,settings:next};
 });
 return changed?{...project,items}:project;
}
