const prelude=`
import {prepareAnimaBasinProduct as __animaPrepareBasinProduct} from '@anima-adapter/basin-interaction.js';
let __animaBasinDragActive=false,__animaBasinDragCommitted=false;
function __animaBindBasinCard(button,choice){productDragController?.bind(button,{type:'basin',options:{basinProductId:choice.product.id,basinSourceSettings:choice.settings}});}
function __animaCommitBasinDrop(options){
 if(projectWorkspace?.locked||walkMode?.active||!options?.basinTargetId||!options.basinSettings)return false;
 const target=composition?.items.find(item=>item.id===options.basinTargetId&&item.type==='cabinet');if(!target||isItemPositionLocked(composition,target)){placementStatus('Déverrouillez le meuble pour y intégrer cette vasque.');return false;}
 const previous=composition.selectedId;
 if(!__animaSelectWorktopHost(target.id))return false;
 const done=__animaPremiumApply(options.basinSettings);__animaBasinDragCommitted=done;
 if(done){setWorkspace('furniture');openInspector('basin');}
 else if(previous&&previous!==target.id)__animaSelectWorktopHost(previous);
 return done;
}
`;
export function transformAnimaBasinDragAtelier(source){
 if(source.includes('function __animaBindBasinCard('))return source;
 const control='onPatch:__animaPremiumApply,onError:placementStatus';
 if(!source.includes(control))throw Error('Anima basin card callback contract changed.');
 source=source.replace(control,control+',onBasinCard:__animaBindBasinCard');
 const prepare='prepareProduct:(type,options)=>{const {settings,asset,preferred}=';
 if(!source.includes(prepare))throw Error('Studio One product drag preparation contract changed.');
 source=source.replace(prepare,"prepareProduct:(type,options)=>{if(type==='basin')return __animaPrepareBasinProduct(options.basinProductId,options.basinSourceSettings,collectProject());const {settings,asset,preferred}=");
 const commit='commitProduct:({type,options,placement})=>addItem(type,placement.wall,{...options,placement,strictPlacement:true})';
 if(!source.includes(commit))throw Error('Studio One product drag commit contract changed.');
 source=source.replace(commit,"commitProduct:({type,options,placement})=>type==='basin'?__animaCommitBasinDrop(options):addItem(type,placement.wall,{...options,placement,strictPlacement:true})");
 source=source.replace('onStart:()=>{viewTween=null;stopOrbit();closeInspector();},onEnd:()=>invalidate(),invalidate:()=>invalidate(false,false)',"onStart:descriptor=>{if(descriptor.type==='basin'){__animaBasinDragActive=true;__animaBasinDragCommitted=false;clearTimeout(projectTimer);projectTimer=null;journal?.record(collectProject());}viewTween=null;stopOrbit();closeInspector();},onEnd:()=>{if(__animaBasinDragActive){__animaBasinDragActive=false;if(!__animaBasinDragCommitted)scheduleProjectCheckpoint();}invalidate();},invalidate:()=>invalidate(false,false)");
 source=source.replace('invalidate:()=>invalidate(false,false)});\n}\nfunction setupPicking(){','invalidate:()=>invalidate(false,false)});\n __animaPremiumSidebar();\n}\nfunction setupPicking(){');
 return prelude+source;
}
export function transformAnimaBasinDragShared(source){
 if(source.includes('resolveAnimaBasinDrop as __animaBasinDrop'))return source;
 const resolve="export function resolveProductPlacement({ray,composition,product,preferredWall=0}){";
 const transform='export function productPreviewTransform(room,product,placement){';
 const preview='function createPreview(product){';
 if(![resolve,transform,preview].every(token=>source.includes(token)))throw Error('Studio One product drag resolver contract changed.');
 source=source.replace(resolve,resolve+"\n if(product?.type==='basin')return __animaBasinDrop({ray,composition,product});")
  .replace(transform,transform+"\n if(product?.type==='basin')return __animaBasinPreviewTransform(placement);")
  .replace(preview,preview+"\n if(product?.type==='basin'){const basin=__animaBasinGhost(product);ghost=basin.root;materials=basin.materials;geometries=basin.geometries;scene.add(ghost);return;}")
  .replace("listen(doc,'pointercancel',e=>{if(active?.id===e.pointerId)finish(true);},true);","listen(doc,'pointercancel',e=>{if(active?.id===e.pointerId)finish(true);},true);listen(doc,'lostpointercapture',e=>{if(active?.id===e.pointerId&&active.descriptor.type==='basin')finish(true,'Placement de vasque annulé.');},true);");
 return "import {resolveAnimaBasinDrop as __animaBasinDrop,animaBasinPreviewTransform as __animaBasinPreviewTransform} from '@anima-adapter/basin-interaction.js';\nimport {createAnimaBasinPreview as __animaBasinGhost} from '@anima-adapter/basin-preview.js';\n"+source;
}
