import {CABINET_FORMATS} from './configuration.js';
import {PRODUCT_BY_ID,topSelection} from './anima-data.js';
import {continuousTopContext} from './projects.js';

const formOf=settings=>CABINET_FORMATS.find(form=>form.id===settings?.format);
export function hasAnimaBasin(settings={}){
 const product=PRODUCT_BY_ID.get(settings.top);
 return !!product&&(product.category==='basin'||product.category==='worktop'&&product.subtype==='integrated');
}
export function cabinetSettingsForRole(settings,hasBasin=hasAnimaBasin(settings)){
 const current=formOf(settings);if(!current)throw Error('Modèle de caisson Anima inconnu.');
 if(current.subtype==='wall'){if(hasBasin)throw Error('Un meuble haut ne peut pas recevoir une vasque.');return {...settings};}
 const role=hasBasin?'vanity':'base';
 const target=CABINET_FORMATS.find(form=>form.subtype===role&&form.facade===current.facade&&form.height===current.height&&form.depth===current.depth&&form.trueDrawers===current.trueDrawers&&form.doors===current.doors&&form.allowedWidths.includes(settings.width));
 if(!target)throw Error('Ce format de '+settings.width+' cm n’existe pas en '+(hasBasin?'sous-vasque':'meuble bas')+' dans le catalogue Anima.');
 return {...settings,format:target.id,topDrawer:hasBasin?'siphon':'full',drawers:Array.from({length:target.drawers},(_,i)=>settings.drawers?.[i]||0)};
}

// Cabinet roles follow the actual bowls on the shared worktop, not the owner
// of its saved record. A bare neighbouring cabinet may carry the second bowl.
// Never change stock width, opening, finish, placement or object identity.
export function normalizeCabinetRoles(project){
 if(!Array.isArray(project?.items))throw Error('Composition Anima invalide.');
 const next={...project,items:project.items.map(item=>item.type==='cabinet'?{...item,settings:cabinetSettingsForRole(item.settings,false)}:{...item})};
 const underBasins=new Set();
 for(const host of next.items){
  if(host.type!=='cabinet'||!hasAnimaBasin(host.settings))continue;
  const s=host.settings,context=continuousTopContext(next,host),selection=context&&topSelection(s.top,s.width,s.format,s.basinLayout,context.span,s.topPlanId,s.topLength,s);
  if(!selection?.positions?.length)throw Error('Cette vasque ne correspond pas au plan choisi.');
  for(const position of selection.positions){
   const center=host.placement.u+context.offset+(s.topShift||0)+position*100;
   const candidates=context.ids.map(id=>next.items.find(item=>item.id===id)).filter(item=>item&&Math.abs(center-item.placement.u)<=item.settings.width/2+.1);
   const support=candidates.find(item=>{try{cabinetSettingsForRole(item.settings,true);return true;}catch{return false;}});
   if(!support)throw Error('La vasque doit se trouver au-dessus d’un format disponible en sous-vasque.');
   underBasins.add(support.id);
  }
 }
 for(const item of next.items)if(item.type==='cabinet')item.settings=cabinetSettingsForRole(item.settings,underBasins.has(item.id));
 return next;
}
