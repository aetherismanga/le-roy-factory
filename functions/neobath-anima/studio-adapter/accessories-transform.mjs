const prelude=`
import {renderFurnitureAccessoryControls as __animaFurnitureAccessoryControls} from '@anima-adapter/furniture-accessory-controls.js';
import {updateFurnitureAccessoryGeometry as __animaFurnitureAccessoryGeometry} from '@anima-adapter/furniture-accessory-geometry.js';
import {setupFurnitureAccessoryPicking as __animaSetupFurnitureAccessoryPicking} from '@anima-adapter/furniture-accessory-interaction.js';
let __animaFurnitureAccessoryPicking=null;
function __animaRenderFurnitureAccessories(parent,item){if(item?.type!=='cabinet')return null;return __animaFurnitureAccessoryControls(parent,{settings:item.settings,placement:item.placement,onPatch:(settings,placement)=>__animaApplyFurnitureAccessories(settings,placement),onError:placementStatus});}
function __animaRenderCabinetControls(parent,item){const result=__animaRenderCabinetBaseControls(parent,item);__animaRenderFurnitureAccessories(parent,item);return result;}
function __animaMountFurnitureAccessoryPicking(){
 __animaFurnitureAccessoryPicking?.dispose();
 __animaFurnitureAccessoryPicking=__animaSetupFurnitureAccessoryPicking({canvas,controls,enabled:()=>!projectWorkspace?.locked&&!walkMode?.active&&!captureBusy,
 pick:event=>{const rect=canvas.getBoundingClientRect();return pickSelection(scene,camera,new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1));},
 onTap:hit=>{if(!composition?.items.some(item=>item.id===hit.itemId&&item.type==='cabinet'))return;tileEditing=false;selectedTile=null;highlightIndividualTile();selectItem(hit.itemId);openInspector('cabinet-accessories');}
 });
}
`;
export function transformFurnitureAccessoryAtelier(source){
 if(source.includes('let __animaFurnitureAccessoryPicking=null'))return source;
 const wrapper='function __animaRenderCabinetControls(parent,item){';if(!source.includes(wrapper))throw Error('Anima furniture accessory cabinet controls contract changed.');
 source=source.replace(wrapper,'function __animaRenderCabinetBaseControls(parent,item){');
 const allowed="if(!['furniture','basin','floor'";if(!source.includes(allowed))throw Error('Studio One accessory inspector target contract changed.');
 source=source.replace(allowed,"if(!['cabinet-accessories','furniture','basin','floor'")
  .replace(/furniture:'(Meuble & plan|Le meuble)',/,"'cabinet-accessories':'Accessoires du meuble',furniture:'$1',")
  .replace("else if(editTarget==='profile'){grid.hidden=true;renderProfileInspector(body);}","else if(editTarget==='profile'){grid.hidden=true;renderProfileInspector(body);}\n else if(editTarget==='cabinet-accessories'){grid.hidden=true;__animaRenderFurnitureAccessories(body,composition.selected);}")
  .replace("function setupPicking(){","function setupPicking(){__animaMountFurnitureAccessoryPicking();")
  .replace("if(e.key==='Escape'){","if(e.key==='Escape'){__animaFurnitureAccessoryPicking?.cancel();")
  .replace("function restoreProject(input){","function restoreProject(input){__animaFurnitureAccessoryPicking?.cancel();")
  .replace("if(renovation?.tap(hit))return;","if(hit?.editTarget==='cabinet-accessories'&&hit.itemId){tileEditing=false;selectedTile=null;highlightIndividualTile();selectItem(hit.itemId);openInspector('cabinet-accessories');return;}if(renovation?.tap(hit))return;");
 const paint='installCabinetTap(item);}else item.asset.setHingeSide';if(!source.includes(paint))throw Error('Anima furniture accessory paint contract changed.');
 source=source.replace(paint,'__animaFurnitureAccessoryGeometry(item.asset,item.settings);installCabinetTap(item);}else item.asset.setHingeSide');
 return prelude+source;
}
export function transformFurnitureAccessoryPreview(source){
 if(source.includes('updateFurnitureAccessoryGeometry as __animaFurnitureAccessoryGeometry'))return source;
 source=source.replaceAll('item.asset.setTop(s.top,s);','item.asset.setTop(s.top,s);__animaFurnitureAccessoryGeometry(item.asset,s);')
  .replace(/(?<![\w.])asset\.setTop\(s\.top,s\);/g,'asset.setTop(s.top,s);__animaFurnitureAccessoryGeometry(asset,s);');
 return "import {updateFurnitureAccessoryGeometry as __animaFurnitureAccessoryGeometry} from '@anima-adapter/furniture-accessory-geometry.js';\n"+source;
}
