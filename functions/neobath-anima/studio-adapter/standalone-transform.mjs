const atelierPrelude=`
import {makeStandaloneWorktop as __animaMakeStandalone} from '@anima-adapter/standalone-worktop.js';
import {normalizeStandaloneSettings as __animaStandaloneSettings,standaloneDimensions as __animaStandaloneDimensions} from '@anima-adapter/standalone-worktop-data.js';
import {renderStandalonePlanChooser as __animaStandaloneChooser,renderStandalonePlanControls as __animaStandaloneControls} from '@anima-adapter/standalone-worktop-controls.js';
function __animaSelectStandalone(id){const item=composition?.items.find(item=>item.id===id&&item.type==='worktop');if(!item)return false;if(composition.selectedId!==id)closeInspector();composition.selectedId=id;model=item.asset;renderComposition();invalidate(false,false);return true;}
function __animaStandaloneAddition(wallIndex,options={}){const selected=composition.selected,settings=__animaStandaloneSettings(options),dimensions=__animaStandaloneDimensions(settings),wall=wallIndex??selected?.placement.wall??0,preferred={wall,u:selected?selected.placement.u+(selected.dimensions.width+dimensions.width)*50+3:composition.room.walls[wall].length*50,height:82,offset:0,...(options.placement||{})};return {settings,asset:__animaMakeStandalone(settings),preferred};}
function __animaMountStandaloneEntry(){
 if(document.getElementById('anima-independent-plans'))return;const section=document.createElement('section');section.id='anima-independent-plans';section.className='setting-section';section.dataset.stepSection='furniture';const title=document.createElement('h3');title.textContent='Plans de travail';const button=document.createElement('button');button.type='button';button.id='add-worktop';button.className='room-viewer-button';button.textContent='+ Plan indépendant';button.onclick=()=>openAddChooser('worktop');const note=document.createElement('small');note.className='control-note';note.textContent='Avec ou sans vasque · sans meuble';section.append(title,button,note);const format=document.getElementById('format-section');format?.parentNode.insertBefore(section,format);const menu=document.getElementById('add-menu');if(menu&&!document.getElementById('add-menu-worktop')){const item=document.createElement('button');item.type='button';item.id='add-menu-worktop';item.textContent='Plan de travail indépendant';item.onclick=()=>openAddChooser('worktop');menu.append(item);}
}
function __animaOpenStandaloneChooser(dialog,body){$('#add-title').textContent='Plans de travail indépendants';__animaStandaloneChooser(body,{onAdd:settings=>{if(addItem('worktop',undefined,settings)){dialog.close();setWorkspace('furniture');openInspector('worktop');}},onCard:(button,settings)=>productDragController?.bind(button,{type:'worktop',options:settings})});openElementPanel(dialog);}
function __animaApplyStandalone(next){
 const item=composition?.selected;if(item?.type!=='worktop'||projectWorkspace?.locked)return false;if(isItemPositionLocked(composition,item)){placementStatus('Déverrouillez le plan pour le modifier.');return false;}
 const previous=item.settings,oldDimensions=item.dimensions;try{const settings=__animaStandaloneSettings(next),project=collectProject();validateProject({...project,items:project.items.map(raw=>raw.id===item.id?{...raw,settings}:raw)});const dimensions=__animaStandaloneDimensions(settings),error=composition.validate(item,item.placement,dimensions);if(error)throw Error(error);if(!item.asset.setSettings(settings,{onReady:()=>invalidate(false,false)}))throw Error('Cette vasque ne peut pas être intégrée au plan.');item.settings=settings;item.dimensions=dimensions;composition.sync(item);installCabinetTap(item);renderComposition();refreshInspector();invalidate();scheduleProjectCheckpoint();return true;}catch(error){item.settings=previous;item.dimensions=oldDimensions;item.asset.setSettings(previous);placementStatus(error.message||'Dimensions du plan incompatibles.');return false;}
}
function __animaRenderStandaloneInspector(body){
 const item=composition.selected;$('#object-editor-title').textContent='Plan de travail indépendant';__animaStandaloneControls(body,{item,onPatch:__animaApplyStandalone,onPosition:patch=>{if(projectWorkspace?.locked)return;const result=composition.move(item.id,patch);placementStatus(result.error||'Position du plan appliquée.');renderComposition();refreshInspector();invalidate();if(!result.error)scheduleProjectCheckpoint();},onError:placementStatus,onBasinCard:(button,choice)=>__animaBindBasinCard?.(button,choice)});
 renderTapChooser(body,item);const actions=document.createElement('div');actions.className='object-actions';button(actions,'Dupliquer',duplicateSelected);const remove=button(actions,'Supprimer',()=>removeItem(item.id));remove.className='remove-object';body.append(actions);
}
`;
export function transformStandaloneSource(source,relativePath){
 if(relativePath==='shared/lrf-3d/product-placement-drag.js'){
  if(source.includes('resolveBasinDropWithStandalone as __animaIndependentBasinDrop'))return source;
  const resolver="if(product?.type==='basin')return __animaBasinDrop({ray,composition,product});";
  if(!source.includes(resolver))throw Error('Studio One independent basin resolver contract changed.');
  return "import {resolveBasinDropWithStandalone as __animaIndependentBasinDrop} from '@anima-adapter/standalone-basin-interaction.js';\n"+source.replace(resolver,"if(product?.type==='basin')return __animaIndependentBasinDrop({ray,composition,product},__animaBasinDrop);");
 }
 if(relativePath==='composition.js'){
  if(source.includes('standaloneDimensions as __animaStandaloneDimensions'))return source;
  if(!source.includes('export function itemDimensions(type,settings={}){return '))throw Error('Studio One independent dimensions contract changed.');
  return "import {standaloneDimensions as __animaStandaloneDimensions} from '@anima-adapter/standalone-worktop-data.js';\n"+source.replace('export function itemDimensions(type,settings={}){return ','export function itemDimensions(type,settings={}){return type===\'worktop\'?__animaStandaloneDimensions(settings):').replace("['cabinet','column','mirror'].includes(item.type)","['cabinet','column','mirror','worktop'].includes(item.type)");
 }
 if(relativePath==='commerce/preview-model.js'){
  if(source.includes('makeStandaloneWorktop as __animaMakeStandalone'))return source;
  return "import {makeStandaloneWorktop as __animaMakeStandalone} from '@anima-adapter/standalone-worktop.js';\n"+source.replace("['cabinet','column','mirror'].includes(i.type)","['cabinet','column','mirror','worktop'].includes(i.type)").replace("if(item.type==='cabinet'){","if(item.type==='worktop'){item.asset.setSettings(s);}else if(item.type==='cabinet'){").replace("if(raw.type==='cabinet'){","if(raw.type==='worktop'){asset=__animaMakeStandalone(s);}else if(raw.type==='cabinet'){");
 }
 if(relativePath!=='app.js')return source;
 if(source.includes('function __animaStandaloneAddition('))return source;
 const replacements=[
 ['function makeUI(){','function makeUI(){__animaMountStandaloneEntry();'],
 ['function prepareProductAddition(type,wallIndex,options={}){',"function prepareProductAddition(type,wallIndex,options={}){if(type==='worktop')return __animaStandaloneAddition(wallIndex,options);"],
 ["!['cabinet','column','mirror','window','door','bath','shower','screen','tap','towel','toilet','washstand'].includes(type)","!['worktop','cabinet','column','mirror','window','door','bath','shower','screen','tap','towel','toilet','washstand'].includes(type)"],
 ['function makeSceneAsset(type,s){',"function makeSceneAsset(type,s){if(type==='worktop')return __animaMakeStandalone(s);"],
 ["!['cabinet','column','mirror','window','door','bath','shower','screen','tap','towel','toilet','washstand'].includes(raw.type)","!['worktop','cabinet','column','mirror','window','door','bath','shower','screen','tap','towel','toilet','washstand'].includes(raw.type)"],
 ["const asset=raw.type==='cabinet'?makeModel(","const asset=raw.type==='worktop'?__animaMakeStandalone(s):raw.type==='cabinet'?makeModel("],
 ['function paintAsset(item){',"function paintAsset(item){if(item.type==='worktop'){item.asset.setSettings(item.settings,{onReady:()=>invalidate(false,false)});installCabinetTap(item);return;}"],
 ["function openAddChooser(type){const dialog=$('#add-dialog'),body=$('#add-choices');body.replaceChildren();","function openAddChooser(type){const dialog=$('#add-dialog'),body=$('#add-choices');body.replaceChildren();if(type==='worktop'){__animaOpenStandaloneChooser(dialog,body);return;}"],
 ["stage.classList.add('editing-object');body.replaceChildren();","stage.classList.add('editing-object');body.replaceChildren();if(composition?.selected?.type==='worktop'){__animaRenderStandaloneInspector(body);return;}"],
 ["const counts={cabinet:0,column:0,mirror:0,","const counts={worktop:0,cabinet:0,column:0,mirror:0,"],
 ["const label={cabinet:'Meuble',column:'Colonne',mirror:'Miroir',","const label={worktop:'Plan indépendant',cabinet:'Meuble',column:'Colonne',mirror:'Miroir',"],
 ["label+(item.type==='cabinet'?' · '+item.settings.width+' cm'","label+(item.type==='worktop'?' · '+Math.round(item.dimensions.width*1000)/10+' × '+Math.round(item.dimensions.depth*1000)/10+' cm':item.type==='cabinet'?' · '+item.settings.width+' cm'"],
 ["if(['cabinet','column','mirror'].includes(item.type)){","if(['cabinet','column','mirror','worktop'].includes(item.type)){"],
 ["async function prepareActiveTextures(profile=quality.profile.id){","async function prepareActiveTextures(profile=quality.profile.id){await Promise.all((composition?.items||[]).filter(item=>item.type==='worktop').map(item=>item.asset.prepareSurface?.()));"]
 ];
 for(const [before,after]of replacements){if(!source.includes(before))throw Error('Studio One standalone worktop contract changed: '+before.slice(0,85));source=source.replace(before,after);}
 const drag=[
  ["item.id===options.basinTargetId&&item.type==='cabinet'","item.id===options.basinTargetId&&['cabinet','worktop'].includes(item.type)"],
  ["if(!__animaSelectWorktopHost(target.id))return false;","if(!(target.type==='worktop'?__animaSelectStandalone(target.id):__animaSelectWorktopHost(target.id)))return false;"],
  ['const done=__animaPremiumApply(options.basinSettings);',"const done=target.type==='worktop'?__animaApplyStandalone(options.basinSettings):__animaPremiumApply(options.basinSettings);"],
  ['else if(previous&&previous!==target.id)__animaSelectWorktopHost(previous);',"else if(previous&&previous!==target.id){if(composition.items.find(item=>item.id===previous)?.type==='worktop')__animaSelectStandalone(previous);else __animaSelectWorktopHost(previous);}"]
 ];
 for(const [before,after]of drag){if(!source.includes(before))throw Error('Studio One independent basin commit contract changed.');source=source.replace(before,after);}
 return atelierPrelude+source;
}
