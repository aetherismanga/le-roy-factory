// Build-only controls on the original Studio One atelier, restricted to Anima.
export const cabinetAtelierPrelude=`
import {renderAnimaCabinetControls as __animaCabinetControls,renderAnimaCabinetGallery as __animaCabinetGallery} from '@anima-adapter/cabinet-controls.js';
function __animaRenderCabinetControls(parent,item){return __animaCabinetControls(parent,{settings:item.settings,onModel:id=>{if(!changeCabinetFormat(id))refreshInspector();},onWidth:width=>{viewTween=null;if(!setWidth(width,true))placementStatus($('#width-status').textContent||'Cette largeur ne convient pas à cet emplacement.');refreshInspector();},onComposition:showCabinetCombinations,onError:placementStatus});}
function __animaCabinetSidebar(){const section=$('#format-section');if(!section||composition?.selected?.type!=='cabinet')return;let parent=section.querySelector('[data-anima-cabinet-sidebar]');if(!parent){parent=document.createElement('div');parent.dataset.animaCabinetSidebar='true';section.append(parent);}for(const child of section.children)if(child!==parent&&!child.classList.contains('section-heading')&&child.id!=='width-status')child.hidden=true;parent.replaceChildren();__animaRenderCabinetControls(parent,composition.selected);}
function __animaOpenCabinetChooser(dialog,body){$('#add-title').textContent='Choisir un meuble';__animaCabinetGallery(body,{width:state.width||80,onChoose:format=>{if(addItem('cabinet',undefined,{format})){dialog.close();setWorkspace('furniture');openInspector('furniture');}},onCard:(button,form)=>productDragController?.bind(button,{type:'cabinet',options:{format:form.id}})});openElementPanel(dialog);}
`;
export function transformAnimaCabinetUI(source){
 if(source.includes('function __animaRenderCabinetControls('))return source;
 const controlsStart=source.indexOf('function renderCabinetSizeControls('),controlsEnd=source.indexOf('\nfunction changeCabinetFacade(',controlsStart);
 if(controlsStart<0||controlsEnd<0)throw Error('Studio One cabinet controls contract changed.');
 source=source.slice(0,controlsStart)+'function renderCabinetSizeControls(parent,item){return __animaRenderCabinetControls(parent,item);}\n'+source.slice(controlsEnd);
 const shared="if(['furniture','basin'].includes(editTarget)&&composition?.selected?.type==='cabinet')renderCabinetSizeControls(body,composition.selected);";
 if(!source.includes(shared))throw Error('Studio One inspector cabinet target contract changed.');
 source=source.replace(shared,"if(editTarget==='furniture'&&composition?.selected?.type==='cabinet')renderCabinetSizeControls(body,composition.selected);")
  .replace("basin:'La vasque'","basin:'Plans et vasques'")
  .replace("function refreshWidthUI(){","function refreshWidthUI(){__animaCabinetSidebar();")
  .replace("function openAddChooser(type){const dialog=$('#add-dialog'),body=$('#add-choices');body.replaceChildren();","function openAddChooser(type){const dialog=$('#add-dialog'),body=$('#add-choices');body.replaceChildren();if(type==='cabinet'){__animaOpenCabinetChooser(dialog,body);return;}")
  .replace("if(renovation?.tap(hit))return;","if(hit?.editTarget==='basin'&&hit?.itemId&&composition?.items.some(item=>item.id===hit.itemId&&item.type==='cabinet')){tileEditing=false;selectedTile=null;highlightIndividualTile();selectItem(hit.itemId);openInspector('basin');return;}if(renovation?.tap(hit))return;")
  .replace("if(item.type==='cabinet'){\n   renderTopDrawerControl(body);","if(item.type==='cabinet'&&editTarget!=='basin'){\n   renderTopDrawerControl(body);");
 return cabinetAtelierPrelude+source;
}
