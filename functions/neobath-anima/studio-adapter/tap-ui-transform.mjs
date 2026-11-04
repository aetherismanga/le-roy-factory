const prelude=`
import {renderAnimaTapChooser as __animaRenderTapChooser,renderAnimaTapAdditionChooser as __animaTapAdditionChooser} from '@anima-adapter/tap-controls.js';
let __animaTapCatalogueUse='basin';
function __animaOpenWallTapChooser(){__animaTapCatalogueUse='basin-wall';openAddChooser('tap');}
function __animaOpenTapAddition(dialog,body){
 $('#add-title').textContent='Choisir un mitigeur';
 __animaTapAdditionChooser(body,{products:AQUAHOME,initialUse:__animaTapCatalogueUse,onSelect:product=>{if(__animaChooseTapProduct(product)===false)return false;dialog.close();setWorkspace('furniture');const selected=composition?.selected;if(selected)openInspector(selected.type==='cabinet'?'basin':selected.type==='worktop'?'worktop':selected.type);return true;},onCard:(button,product)=>{if(['basin','basin-xl'].includes(product.use))return;productDragController?.bind(button,{type:'tap',options:{use:product.use,tap:product.reference,metal:product.finish}});}});
 __animaTapCatalogueUse='basin';openElementPanel(dialog);
}
`;
export function transformAnimaTapUI(source,path){
 if(path!=='app.js'||source.includes('function __animaOpenTapAddition('))return source;
 const target="function openAddChooser(type){const dialog=$('#add-dialog'),body=$('#add-choices');body.replaceChildren();";
 if(!source.includes(target))throw Error('Anima lavabo catalogue entry contract changed.');
 return prelude+source.replace(target,target+"if(type==='tap'){__animaOpenTapAddition(dialog,body);return;}");
}
