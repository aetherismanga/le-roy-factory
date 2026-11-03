import {parse} from 'acorn';
function replaceFunction(source,name,replacement){const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);if(!node)throw Error('Anima faucet compatibility contract changed: '+name);return source.slice(0,node.start)+replacement+source.slice(node.end);}
export const tapCompatibilityPrelude=`
import {planTapCompatibility as __animaTapCheck,compatibleAnimaTaps as __animaTapChoices,exactAnimaTap as __animaExactTap} from '@anima-adapter/tap-compatibility-runtime.js';
function __animaClearAttachedTaps(asset){for(const key of ['aquaTap','aquaTapExtra']){const tap=asset?.[key];if(tap){tap.removeFromParent();disposeObject(tap);asset[key]=null;}}for(const tap of asset?.faucets||[asset?.faucet])if(tap)tap.visible=false;}
`;
export function transformAnimaTapCompatibility(source){
 if(source.includes('function __animaClearAttachedTaps('))return source;
 source=source.replace("if(type==='cabinet')installCabinetTap(result.item)","if(['cabinet','worktop'].includes(type))installCabinetTap(result.item)");
 source=source.replace('function renderTapChooser(','function __animaLegacyRenderTapChooser(');
 source+=`\nfunction renderTapChooser(parent,item){
  if(!item||!['cabinet','worktop'].includes(item.type))return __animaLegacyRenderTapChooser(parent,item);
  const box=document.createElement('div');box.className='tap-chooser';const title=document.createElement('strong');title.textContent='AQUA HOME · mitigeurs compatibles';box.append(title);
  const products=__animaTapChoices(item.asset),selected=products.find(product=>product.reference===item.settings.tap),none=document.createElement('small');
  if(!products.length){none.textContent=item.asset?.tops?.root?.userData?.animaTop?.wells?.length?'Aucun mitigeur de plan proposé ne correspond à cette pose. Choisissez une pose murale adaptée.':'Ajoutez une vasque pour choisir un mitigeur adapté.';box.append(none);parent.append(box);return;}
  const group=product=>tapModelKey(product)+'|'+product.use,families=[...new Set(products.map(group))];field(box,'Modèle',selected?group(selected):'',[{id:'',name:'Sans mitigeur'},...families.map(id=>{const product=products.find(product=>group(product)===id);return {id,name:tapModelLabel(product)+(product.use==='basin-xl'?' · XL':' · standard')};})],id=>{if(!id){setCabinetTap('');return;}const product=products.find(product=>group(product)===id&&product.finish===selected?.finish)||products.find(product=>group(product)===id);setCabinetTap(product.reference);});if(selected)field(box,'Finition',selected.reference,products.filter(product=>group(product)===group(selected)).map(product=>({id:product.reference,name:product.finish})),reference=>setCabinetTap(reference));
  if(selected){const ref=document.createElement('small');ref.textContent='Réf. '+selected.reference;box.append(ref);renderAquahomeProductPreview(box,selected);renderAquahomeModelChoices(box,{products:products.filter(product=>product.use===selected.use),selected,onSelect:product=>setCabinetTap(product.reference)});}else if(item.asset?.tapCompatibilityReason){none.textContent=item.asset.tapCompatibilityReason;box.append(none);}
  parent.append(box);
 }\n`;
 source=replaceFunction(source,'installCabinetTap',`function installCabinetTap(item){
  if(!item||!['cabinet','worktop'].includes(item.type))return;const asset=item.asset;if(!asset)return;
  for(const tap of asset.faucets||[asset.faucet])if(tap)tap.visible=false;
  if(!item.settings.tap){__animaClearAttachedTaps(asset);return;}
  const product=__animaExactTap(item.settings.tap),check=__animaTapCheck(asset,product);
  if(!check.compatible){asset.tapCompatibilityReason=check.reason;item.settings.tap=null;__animaClearAttachedTaps(asset);return;}
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
  if(reference){const product=__animaExactTap(reference),check=__animaTapCheck(item.asset,product);if(!check.compatible){placementStatus(check.reason);return false;}}
  item.settings.tap=reference||null;installCabinetTap(item);refreshInspector();invalidate();scheduleProjectCheckpoint();return true;
 }`);
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
