import {normalizeBasinUnitSettings} from './basin-unit-data.js';
import {PRODUCT_BY_ID,topSelection} from './anima-data.js';
import {planSettings,premiumPlanChoices} from './premium-controls.js';
import {preferredWorktopContext} from './auto-fit-worktop.js';
import {standaloneSelection,standalonePlanSettings} from './standalone-worktop-data.js';
import {normalizeCabinetRoles} from './cabinet-role.js';
import {validateProject} from './projects.js';
export function basinUnitHostSettings(project,host,unitSettings){
 const unit=normalizeBasinUnitSettings(unitSettings),basin=PRODUCT_BY_ID.get(unit.basinProductId);if(!['cabinet','worktop'].includes(host?.type))return null;
 let next;
 if(host.type==='worktop'){const selected=standaloneSelection(host.settings);if(!selected?.top?.configurableWidth||!basin.compatibleTopIds?.includes(selected.top.id))return null;next=standalonePlanSettings(host.settings,selected.top.id,basin.id);}
 else{const s=host.settings,current=topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan||s.width,s.topPlanId,s.topLength,s);if(current?.top&&!current.top.configurableWidth)return null;
  const choices=premiumPlanChoices(project,host).filter(choice=>basin.compatibleTopIds?.includes(choice.product.id)&&(!current?.top||choice.product.id===current.top.id));
  for(const choice of choices){const group=preferredWorktopContext(choice,s);if(group&&(next=planSettings(project,host,choice.product.id,group,basin.id)))break;}
 }
 if(!next)return null;Object.assign(next,{basinColor:unit.basinColor,basinPriceKey:unit.basinPriceKey,basinBottom:unit.basinBottom,basinSupport:unit.basinSupport,...(unit.ncsCode?{ncsCode:unit.ncsCode}:{})});
 try{const normalized=normalizeCabinetRoles({...project,items:project.items.map(item=>item.id===host.id?{...item,settings:next}:item)});validateProject(normalized);return normalized.items.find(item=>item.id===host.id).settings;}catch{return null;}
}
