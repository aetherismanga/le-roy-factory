import {parse} from 'acorn';
function replaceFunction(source,name,replacement){const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);if(!node)throw Error('Anima cabinet role contract changed: '+name);return source.slice(0,node.start)+replacement+source.slice(node.end);}
export const cabinetRolePrelude=`
import {normalizeCabinetRoles as __animaNormalizeRoles,cabinetSettingsForRole as __animaCabinetRole} from '@anima-adapter/cabinet-role.js';
import {planSettings as __animaRolePlanSettings} from '@anima-adapter/premium-controls.js';
function __animaRefreshRoleSelection(){const item=composition?.selected;if(item?.type!=='cabinet')return;model=item.asset;for(const key of CABINET_KEYS)state[key]=item.settings[key];state.drawers=[...item.settings.drawers];currentDrawers=item.motion.drawers;counterDecor=item.decor;}
function __animaChangeCabinetFacade(id){
 const item=composition?.selected;if(item?.type!=='cabinet')return null;
 const current=cabinetFormat(item.settings.format),next=CABINET_FORMATS.find(form=>form.id===id);if(!next)return null;
 if(next.id===current.id)return true;
 const sameShape=['subtype','height','depth','trueDrawers','doors'].every(key=>next[key]===current[key]);
 if(!sameShape||next.facade===current.facade||!next.allowedWidths.includes(item.settings.width))return null;
 const project=collectProject();return __animaCommitCabinetProject({...project,items:project.items.map(raw=>raw.id===item.id?{...raw,settings:{...raw.settings,format:next.id}}:raw)});
}
function __animaCommitCabinetProject(project,{checkpoint=true}={}){
 const saved=[],staged=[];
 try{
  if(typeof projectWorkspace!=='undefined'&&projectWorkspace?.locked)throw Error('Ce projet est en lecture seule.');const normalized=__animaNormalizeRoles(project);validateProject(normalized);
  const planned=composition.items.map(item=>{const raw=normalized.items.find(raw=>raw.id===item.id);return raw?.type==='cabinet'?{...item,settings:raw.settings,placement:raw.placement||item.placement,dimensions:itemDimensions('cabinet',raw.settings)}:item;});
  const changes=planned.filter(item=>{const old=composition.items.find(old=>old.id===item.id);return item.type==='cabinet'&&(JSON.stringify(item.settings)!==JSON.stringify(old.settings)||JSON.stringify(item.placement)!==JSON.stringify(old.placement));});if(!changes.length)return true;
  for(const next of changes){const item=composition.items.find(item=>item.id===next.id);if(isItemPositionLocked(composition,item))throw Error('Déverrouillez le meuble avant de modifier son plan ou sa vasque.');const error=composition.validate(item,next.placement,next.dimensions,planned);if(error)throw Error(error);if(item.settings.format!==next.settings.format){const asset=makeSceneAsset('cabinet',next.settings);staged.push({id:item.id,asset});}}
  for(const next of changes){const item=composition.items.find(item=>item.id===next.id),replacement=staged.find(entry=>entry.id===item.id)?.asset;saved.push({item,settings:item.settings,placement:item.placement,dimensions:item.dimensions,asset:item.asset,decor:item.decor,motion:item.motion.drawers});
   if(replacement){item.root.remove(item.asset.root);item.root.add(replacement.root);item.asset=replacement;item.decor=[];}
   item.settings={...next.settings,drawers:[...next.settings.drawers]};item.placement={...next.placement};item.dimensions=next.dimensions;const priorMotion=saved.at(-1).motion;item.motion.drawers=item.asset.drawers.map((_,i)=>priorMotion[i]||0);item.asset.drawers.forEach((drawer,i)=>drawer.position.z=item.motion.drawers[i]);composition.sync(item);
   if(!item.asset.setTop(item.settings.top,item.settings))throw Error('La vasque ne peut pas être assemblée à ce plan.');paintAsset(item);
  }
  __animaSyncContinuousTops();__animaRefreshRoleSelection();
  for(const old of saved)if(old.item.asset!==old.asset)disposeObject(old.asset.root);
  renderComposition();refreshWidthUI();refreshBasinUI();refreshInspector();invalidate();if(checkpoint)scheduleProjectCheckpoint();return true;
 }catch(error){
  for(const old of saved.slice().reverse()){const current=old.item.asset;if(current!==old.asset){old.item.root.remove(current.root);old.item.root.add(old.asset.root);}Object.assign(old.item,{asset:old.asset,settings:old.settings,placement:old.placement,dimensions:old.dimensions,decor:old.decor});old.item.motion.drawers=old.motion;try{old.asset.setTop(old.settings.top,old.settings);composition.sync(old.item);paintAsset(old.item);}catch{}}
  for(const entry of staged)if(!composition.items.some(item=>item.asset===entry.asset))disposeObject(entry.asset.root);
  __animaRefreshRoleSelection();placementStatus(error.message||'Cette implantation de vasque ne convient pas au caisson.');return false;
 }
}
`;
export function transformCabinetRoles(source){
 source=source.replace('model=makeModel();scene.add(model.root);',"model=makeModel({format:state.format,basinTop:state.top,topDrawer:state.topDrawer,includeMirror:true});scene.add(model.root);");
 source=source.replaceAll("format:'two'","format:'pura-base-two'").replaceAll("settings.format=options.format||'two'","settings.format=options.format||'pura-base-two'");
 source=source.replace('function saveCabinetState(){state.topDrawer=normalizeTopDrawer(state.topDrawer,state.top);',"function saveCabinetState(){state.topDrawer=cabinetFormat(state.format).subtype==='vanity'?'siphon':'full';");
 source=source.replace('const asset=makeSceneAsset(type,settings);',"if(type==='cabinet')Object.assign(settings,__animaCabinetRole(settings));const asset=makeSceneAsset(type,settings);");
 source=source.replace('migrateProject(validateProject(input))','migrateProject(validateProject(__animaNormalizeRoles(input)))');
 source=source.replace('function collectProject(){__animaSyncContinuousTops();return publicProjectData(', 'function collectProject(){__animaSyncContinuousTops();return publicProjectData(__animaNormalizeRoles(').replace('items:composition?.snapshot()||[]});}', 'items:composition?.snapshot()||[]}));}');
 source=source.replace("if(!topAvailable(value.top,value.width,id))value.top='bare';return value;", "if(!topAvailable(value.top,value.width,id))value.top='bare';return __animaCabinetRole(value);")
  .replace('format:id,facadeMode:settings.facadeMode','format:settings.format,facadeMode:settings.facadeMode');
 source=source.replace("state.basinColor=color?.id||'standard';","state.basinColor=color?.id||'standard';if(!['fume-matte','bronze-matte'].includes(state.basinColor)){state.basinBottom='none';state.basinSupport=false;}const priceSelection=__animaTopSelection(state.top,state.width,state.format,state.basinLayout,state.topSpan,state.topPlanId,state.topLength,state);if(priceSelection?.basin)state.basinPriceKey=state.basinColor;if(priceSelection?.top&&(!priceSelection.basin||priceSelection.basin.subtype==='integrated'&&priceSelection.top.prices?.some(entry=>entry.key===state.basinColor))){if(state.topPriceKey!==state.basinColor)state.topSurfaceId='';state.topPriceKey=state.basinColor;}");
 source=source.replace("if(color){model.ceramic.color.set(color.hex);","model.setTop(state.top,{...state});if(color){model.ceramic.color.set(color.hex);");
 source=replaceFunction(source,'__animaPremiumApply',`function __animaPremiumApply(settings,options={}){const item=composition?.selected;if(item?.type!=='cabinet')return false;const project=collectProject();return __animaCommitCabinetProject({...project,items:project.items.map(raw=>raw.id===item.id?{...raw,settings:{...raw.settings,...settings},...(options.placement?{placement:{...raw.placement,...options.placement}}:{})}:raw)});}`);
 source=replaceFunction(source,'__animaCommitWorktop',`function __animaCommitWorktop(result){const ok=__animaCommitCabinetProject(result.project,{checkpoint:false});if(ok){__animaSelectWorktopHost(result.targetId);placementStatus('Plan aimanté · caissons et passages de siphon adaptés.');}return ok;}`);
 // Direct top selection remains a public test/legacy API, and must use the
 // same atomic role conversion as the illustrated plan controls.
 const original='function selectTop(id){';
 if(!source.includes(original))throw Error('Studio One selectTop contract changed.');
 source=source.replace(original,"function selectTop(id){if(state.ready&&composition?.selected?.type==='cabinet'&&id!==state.top){const item=composition.selected,project=collectProject(),next={...item.settings,top:id};if(id==='bare')Object.assign(next,{topPlanId:'',topSpan:next.width,topOffset:0,topLength:next.width,topShift:0,topDepth:undefined,basinOffsetX:0,basinOffsetZ:0,basinBottom:'none',basinSupport:false,topSurfaceId:'',topSurfaceNcs:'',topPriceKey:'',basinPriceKey:''});else {const selected=__animaTopSelection(id,item.settings.width,item.settings.format,undefined,item.settings.topSpan||item.settings.width);if(!selected?.top)return false;const planned=__animaRolePlanSettings(project,item,selected.top.id,{span:item.settings.topSpan||item.settings.width,offset:item.settings.topOffset||0},selected.basin?.id);return planned?__animaPremiumApply(planned):false;}return __animaPremiumApply(next);}");
 for(const name of ['changeCabinetFormat','removeItem','setWidth','applyCabinetCombination']){
  const declaration='function '+name+'(';if(!source.includes(declaration))throw Error('Studio One role mutation contract changed: '+name);
  source=source.replace(declaration,'function __animaOriginal_'+name+'(');
  source+=name==='setWidth'?'\nfunction setWidth(...args){const ready=state.ready;state.ready=false;let ok;try{ok=__animaOriginal_setWidth(...args);}finally{state.ready=ready;}if(ok&&composition?.items?.length)__animaCommitCabinetProject(collectProject());return ok;}\n':name==='changeCabinetFormat'?'\nfunction changeCabinetFormat(id){const facade=__animaChangeCabinetFacade(id);if(facade!==null)return facade;const ok=__animaOriginal_changeCabinetFormat(id);if(ok&&composition?.items?.length)__animaCommitCabinetProject(collectProject());return ok;}\n':'\nfunction '+name+'(...args){const ok=__animaOriginal_'+name+'(...args);if(ok&&composition?.items?.length)__animaCommitCabinetProject(collectProject());return ok;}\n';
 }
 return cabinetRolePrelude+source;
}
