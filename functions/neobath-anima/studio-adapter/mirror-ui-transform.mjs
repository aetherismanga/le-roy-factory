// Anima-only presentation adaptation. Mirror models, saved settings, collision
// checks and the Studio One renderer keep their original source and exact SKUs.
export const animaMirrorAtelierPrelude=`
import {renderAnimaMirrorControls as __animaMirrorControls,renderAnimaMirrorChooser as __animaMirrorChooser,animaMirrorFamilies as __animaMirrorFamilies} from '@anima-adapter/mirror-controls.js';
`;
export function transformAnimaMirrorUI(source){
 if(source.includes("'@anima-adapter/mirror-controls.js'"))return source;
 const start=source.indexOf('function renderMirrorOptions(parent,item){'),end=source.indexOf('\nfunction setMirrorLED(',start);
 if(start<0||end<0)throw Error('Anima mirror inspector source contract changed.');
 source=source.slice(0,start)+`function renderMirrorOptions(parent,item){if(!item)return;return __animaMirrorControls(parent,{settings:item.settings,onPatch:updateMirror,onError:placementStatus});}\n`+source.slice(end);
 const anchor="function openAddChooser(type){const dialog=$('#add-dialog'),body=$('#add-choices');body.replaceChildren();";
 if(!source.includes(anchor))throw Error('Anima mirror chooser source contract changed.');
 source=source.replace(anchor,anchor+`if(type==='mirror'){$('#add-title').textContent='Choisir un miroir';__animaMirrorChooser(body,{settings:composition?.selected?.type==='mirror'?composition.selected.settings:{},onAdd:options=>{if(addItem('mirror',undefined,options)){dialog.close();setWorkspace('furniture');if(composition.selected)openInspector(itemInspectorTarget(composition.selected));}},onError:placementStatus,bindDrag:(button,selection)=>productDragController?.bind(button,selection)});openElementPanel(dialog);return;}`);
 const count="MIRRORS.length+' modèles'";
 if(!source.includes(count))throw Error('Anima mirror palette source contract changed.');
 source=source.replaceAll(count,"__animaMirrorFamilies().length+' modèles'");
 return animaMirrorAtelierPrelude+source;
}
