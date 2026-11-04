import {parse} from 'acorn';
function replaceFunction(source,name,replacement){const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);if(!node)throw Error('Anima faucet compatibility contract changed: '+name);return source.slice(0,node.start)+replacement+source.slice(node.end);}
export const tapCompatibilityPrelude=`
import {planTapCompatibility as __animaTapCheck,exactAnimaTap as __animaExactTap} from '@anima-adapter/tap-compatibility-runtime.js';
import {normalizeAnimaLiveTaps as __animaNormalizeLiveTaps,animaPlanTapContext as __animaPlanTapContext,animaProspectiveTapCheck as __animaProspectiveTapCheck,animaCompatibleTapProducts as __animaTapProducts,animaWallTapProposal as __animaWallTapProposal} from '@anima-adapter/tap-automation-runtime.js';
let __animaSyncingTaps=false;
function __animaClearAttachedTaps(asset){for(const key of ['aquaTap','aquaTapExtra']){const tap=asset?.[key];if(tap){tap.removeFromParent();disposeObject(tap);asset[key]=null;}}for(const tap of asset?.faucets||[asset?.faucet])if(tap)tap.visible=false;}
function __animaTapSnapshot(){return {version:2,manufacturer:'neobath-anima',room:cloneRoom(roomConfig),locked:!!composition.locked,items:composition.snapshot()};}
function __animaSyncTapInstallations(){
 if(!composition||__animaSyncingTaps||projectWorkspace?.locked||restoring)return;
 const project=__animaTapSnapshot();
 try{const next=__animaNormalizeLiveTaps(project,composition.items);if(next===project)return;__animaSyncingTaps=true;try{__animaCommitCabinetProject(next,{checkpoint:false});}finally{__animaSyncingTaps=false;}}catch(error){placementStatus(error.message||'Vérifiez la pose du mitigeur.');}
}
function __animaCommitTapSettings(item,patch){
 if(!item||!['cabinet','worktop'].includes(item.type)||projectWorkspace?.locked)return false;
 if(isItemPositionLocked(composition,item)){placementStatus('Déverrouillez cet élément pour modifier sa robinetterie.');return false;}
 const project=__animaTapSnapshot(),draft={...project,items:project.items.map(raw=>raw.id===item.id?{...raw,settings:{...raw.settings,...patch}}:raw)};
 try{const next=__animaNormalizeLiveTaps(draft,composition.items);__animaSyncingTaps=true;try{return __animaCommitCabinetProject(next);}finally{__animaSyncingTaps=false;}}catch(error){placementStatus(error.message);return false;}
}
function __animaSetAutomaticTap(){const item=composition?.selected;return __animaCommitTapSettings(item,{tap:null,tapMode:'auto'});}
function __animaChooseTapProduct(product){
 if(!product||projectWorkspace?.locked)return false;
 let host=composition?.selected;
 if(!['cabinet','worktop'].includes(host?.type)){const candidates=composition.items.filter(item=>['cabinet','worktop'].includes(item.type)&&__animaPlanTapContext(item)?.top?.wells?.length);host=candidates.length===1?candidates[0]:null;}
 if(['basin','basin-xl'].includes(product.use)){
  if(!host){placementStatus('Sélectionnez la vasque à équiper dans la pièce.');return false;}
  selectItem(host.id);return setCabinetTap(product.reference);
 }
 const settings={use:product.use,tap:product.reference,metal:product.finish};
 if(product.use==='basin-wall'&&host){
  if(isItemPositionLocked(composition,host)){placementStatus('Déverrouillez la vasque pour modifier son installation.');return false;}
  const wells=__animaPlanTapContext(host)?.top?.wells||[];if(wells.length&&wells.every((_,index)=>host.settings.tapWallIds?.[index])){placementStatus('Cette vasque est déjà équipée. Sélectionnez son mitigeur mural dans la pièce pour le modifier.');return false;}
  let prepared;try{prepared=prepareProductAddition('tap',host.placement.wall,settings);const proposal=__animaWallTapProposal(__animaTapSnapshot(),host,product,prepared.asset);if(!proposal){placementStatus('La portée de ce mitigeur mural ne convient pas à cette vasque.');return false;}return !!addItem('tap',proposal.placement.wall,{...settings,placement:proposal.placement,strictPlacement:true});}finally{if(prepared?.asset)disposeObject(prepared.asset.root);}
 }
 return !!addItem('tap',undefined,settings);
}
function __animaWallTapLockedHost(id){return composition?.items.find(host=>['cabinet','worktop'].includes(host.type)&&host.settings.tapWallIds?.includes(id)&&isItemPositionLocked(composition,host));}
`;
export function transformAnimaTapCompatibility(source){
 if(source.includes('function __animaClearAttachedTaps('))return source;
 source=source.replace("if(type==='cabinet')installCabinetTap(result.item)","if(['cabinet','worktop'].includes(type))installCabinetTap(result.item)");
 source=source.replace("'topShift','topAutoFit'","'tapMode','tapWallIds','tapPreferredRef','topShift','topAutoFit'");
 for(const s of ['s','state','settings'])source=source.replaceAll('topPlanId:'+s+'.topPlanId,','tapMode:'+s+'.tapMode,tapWallIds:'+s+'.tapWallIds,topPlanId:'+s+'.topPlanId,');
 source=source.replace('function renderTapChooser(','function __animaLegacyRenderTapChooser(');
 source+=`\nfunction renderTapChooser(parent,item){
  if(!item||!['cabinet','worktop'].includes(item.type))return __animaLegacyRenderTapChooser(parent,item);
  return __animaRenderTapChooser(parent,{item,products:__animaTapProducts(item),onChoose:product=>setCabinetTap(product.reference),onAuto:__animaSetAutomaticTap,onNone:()=>setCabinetTap(''),onWall:__animaOpenWallTapChooser,renderPreview:renderAquahomeProductPreview,renderModels:renderAquahomeModelChoices});
 }\n`;
 source=replaceFunction(source,'installCabinetTap',`function installCabinetTap(item){
  if(!item||!['cabinet','worktop'].includes(item.type))return;const asset=item.asset;if(!asset)return;
  for(const tap of asset.faucets||[asset.faucet])if(tap)tap.visible=false;
  if(!item.settings.tap){__animaClearAttachedTaps(asset);return;}
  const product=__animaExactTap(item.settings.tap),check=__animaTapCheck(asset,product);
  if(!check.compatible){asset.tapCompatibilityReason=check.reason;item.settings.tapPreferredRef=item.settings.tap;item.settings.tap=null;__animaClearAttachedTaps(asset);return;}
  asset.tapCompatibilityReason='';const keys=['aquaTap','aquaTapExtra'];
  for(const [index,placement]of check.placements.entries()){
   const key=keys[index];if(!key)continue;if(asset[key]?.userData.reference!==product.reference){if(asset[key]){asset[key].removeFromParent();disposeObject(asset[key]);}asset[key]=makeTap(product);asset[key].userData.editTarget='basin';asset.root.add(asset[key]);}
   asset[key].position.set(placement.x,placement.y,placement.z);asset[key].rotation.y=placement.rotationY;asset[key].visible=true;
  }
  for(let index=check.placements.length;index<keys.length;index++){const key=keys[index];if(asset[key]){asset[key].removeFromParent();disposeObject(asset[key]);asset[key]=null;}}
  if(item.type==='cabinet')syncCabinetDrain(item,product.finish);
 }`);
 source=replaceFunction(source,'setCabinetTap',`function setCabinetTap(reference){
  const item=composition?.selected;if(!item||!['cabinet','worktop'].includes(item.type)||projectWorkspace?.locked)return false;
  if(reference){const check=__animaProspectiveTapCheck(item,reference);if(!check.compatible){placementStatus(check.reason);return false;}}
  return __animaCommitTapSettings(item,reference?{tap:reference,tapPreferredRef:reference,tapMode:'manual'}:{tap:null,tapMode:'none'});
 }`);
 source=source.replace('function renderComposition(){','function renderComposition(){__animaSyncTapInstallations();');
 source=source.replace('function collectProject(){__animaSyncContinuousTops();','function collectProject(){__animaSyncContinuousTops();__animaSyncTapInstallations();');
 source=source.replace('function removeItem(','function __animaRemoveItemWithoutTapGuard(');
 source+='\nfunction removeItem(id){if(__animaWallTapLockedHost(id)){placementStatus(\'Déverrouillez la vasque avant de retirer son mitigeur mural.\');return false;}return __animaRemoveItemWithoutTapGuard(id);}\n';
 source=source.replace('function updateFixture(patch){','function updateFixture(patch){if(__animaWallTapLockedHost(composition?.selected?.id)){placementStatus(\'Déverrouillez la vasque avant de modifier son mitigeur mural.\');return false;}');
 return tapCompatibilityPrelude+source;
}

export function transformAnimaTapPreview(source){
 if(source.includes('syncAnimaPreviewTap as __animaPreviewTap'))return source;
 const build='const wrapper=new T.Group(),w=walls[raw.placement.wall]';
 const repaint="if(item.type==='cabinet'||item.type==='column'){const f=";
 if(!source.includes(build)||!source.includes(repaint))throw Error('Anima faucet preview contract changed.');
 source=source.replace(build,"if(['cabinet','worktop'].includes(raw.type))__animaPreviewTap(asset,s);"+build)
  .replace(repaint,"if(['cabinet','worktop'].includes(item.type))__animaPreviewTap(item.asset,s);"+repaint);
 return "import {syncAnimaPreviewTap as __animaPreviewTap} from '@anima-adapter/tap-compatibility-runtime.js';\n"+source;
}
