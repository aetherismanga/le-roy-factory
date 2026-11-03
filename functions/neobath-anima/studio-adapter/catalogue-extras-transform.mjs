const prelude=`
import {resolveFurnitureAccessories as __animaFurnitureAccessories,furnitureAccessoryOptions as __animaFurnitureOptions,furnitureAccessoryProposal as __animaFurnitureProposal} from '@anima-adapter/furniture-accessories.js';
import {continuousTopContext as __animaAccessoryContext} from '@anima-adapter/projects.js';
function __animaApplyFurnitureAccessories(settings,placement){
 const selected=composition?.selected;if(selected?.type!=='cabinet')return false;
 try{
  const project=collectProject(),before=__animaFurnitureAccessories(selected.settings),after=__animaFurnitureAccessories(settings),changed=before.supportId!==after.supportId;
  let ids=[selected.id];
  if(changed){for(const host of project.items){if(host.type!=='cabinet'||host.settings.top==='bare')continue;const context=__animaAccessoryContext(project,host);if(context?.ids.includes(selected.id)&&context.ids.length>ids.length)ids=context.ids;}}
  const next={...project,items:project.items.map(raw=>{
   if(!ids.includes(raw.id))return raw;
   if(raw.id===selected.id)return {...raw,settings,placement};
   const support=after.support?__animaFurnitureOptions(raw.settings).supports.find(option=>option.height===after.support.height):null;
   if(after.support&&!support)throw Error('Un caisson du plan continu ne possède pas de structure compatible à cette hauteur.');
   const proposal=__animaFurnitureProposal(raw.settings,{supportId:support?.id||'',supportFinish:'black-matte'},raw.placement);return {...raw,...proposal};
  })};
  const ok=__animaCommitCabinetProject(next);if(ok&&ids.length>1)placementStatus('Piètements appliqués aux '+ids.length+' caissons supports du plan continu.');return ok;
 }catch(error){placementStatus(error.message);return false;}
}
`;
export function transformCatalogueExtras(source,path){
 if(path!=='app.js')return source;
 source=source.replace("'basinSupport','topSurfaceId'","'basinSupport','towelSide','towelFinish','supportId','supportFinish','supportSuspendedHeight','topSurfaceId'");
 source=source.replace('placement={...item.placement,height:form.base*100}',"placement={...item.placement,height:settings.supportId?__animaFurnitureAccessories(settings).support.height:form.base*100}");
 source=source.replace('function setWidth(...args){','function __animaAccessorySetWidth(...args){');
 source+='\nfunction setWidth(value,...args){const item=composition?.selected;if(item?.type!==\'cabinet\'||(!item.settings.supportId&&(!item.settings.towelSide||item.settings.towelSide===\'none\')))return __animaAccessorySetWidth(value,...args);const previousId=item.settings.supportId,previousStateId=state.supportId;try{const width=Number(value),current=__animaFurnitureAccessories(item.settings);if(current.support&&width!==item.settings.width&&validWidth(width,state.format)){const next=__animaFurnitureOptions({...item.settings,width}).supports.find(option=>option.height===current.support.height);if(!next)throw Error(\'Cette largeur ne possède pas de structure Bridge compatible. Revenez à une pose suspendue pour la choisir.\');item.settings.supportId=next.id;state.supportId=next.id;}const ok=__animaAccessorySetWidth(value,...args);if(!ok){item.settings.supportId=previousId;state.supportId=previousStateId;}else paintAsset(item);return ok;}catch(error){item.settings.supportId=previousId;state.supportId=previousStateId;placementStatus(error.message);return false;}}\n';
 source=source.replace('function changeCabinetFormat(id){','function __animaAccessoryChangeCabinetFormat(id){');
 source+='\nfunction changeCabinetFormat(id){try{const ok=__animaAccessoryChangeCabinetFormat(id);if(ok&&composition?.selected?.type===\'cabinet\')paintAsset(composition.selected);return ok;}catch(error){placementStatus(error.message);return false;}}\n';
 return prelude+source;
}
