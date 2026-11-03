const prelude=`
import {setupWorktopDragging as __animaSetupWorktopDrag} from '@anima-adapter/worktop-interaction.js';
let __animaWorktopDrag=null,__animaWorktopVisuals=null;
function __animaSelectWorktopHost(id){
 const item=composition?.items.find(item=>item.id===id&&item.type==='cabinet');if(!item)return false;
 if(composition.selectedId!==id)closeInspector();composition.selectedId=id;model=item.asset;
 for(const key of CABINET_KEYS)state[key]=item.settings[key];
 state.drawers=[...item.settings.drawers];currentDrawers=item.motion.drawers;counterDecor=item.decor;
 renderComposition();refreshWidthUI();refreshBasinUI();invalidate(false,false);return true;
}
function __animaWorktopFrame(item,includePlan=false,depthDelta=0){
 const form=cabinetFormat(item.settings.format),x=includePlan?((item.settings.topOffset||0)+(item.settings.topShift||0))/100:0;
 const z=includePlan?(item.asset.tops?.root.userData.animaTop?.zOffset??form.depth/2-.23):form.depth/2-.23+depthDelta;
 const point=item.asset.root.localToWorld(new T.Vector3(x,form.base+form.height,z));
 const rotation=new T.Euler().setFromQuaternion(item.root.getWorldQuaternion(new T.Quaternion()),'YXZ').y;
 return {id:item.id,center:{x:point.x,y:point.y,z:point.z},rotation,tangent:{x:Math.cos(rotation),z:-Math.sin(rotation)}};
}
function __animaRestoreWorktopVisuals(){
 if(!__animaWorktopVisuals)return;
 for(const saved of __animaWorktopVisuals.objects){saved.object.position.copy(saved.position);saved.object.quaternion.copy(saved.quaternion);saved.object.scale.copy(saved.scale);saved.object.updateMatrixWorld(true);}
 __animaWorktopVisuals=null;invalidate(false,false);
}
function __animaPreviewWorktop({position,rotation,origin}){
 const saved=__animaWorktopVisuals;if(!saved)return;
 const delta=new T.Matrix4().makeTranslation(position.x,position.y,position.z)
  .multiply(new T.Matrix4().makeRotationY((rotation??saved.rotation)-saved.rotation))
  .multiply(new T.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z));
 for(const entry of saved.objects){
  entry.object.parent.updateWorldMatrix(true,false);
  const local=new T.Matrix4().copy(entry.object.parent.matrixWorld).invert().multiply(delta).multiply(entry.world);
  local.decompose(entry.object.position,entry.object.quaternion,entry.object.scale);entry.object.updateMatrixWorld(true);
 }
 invalidate(false,false);
}
function __animaCommitWorktop(result){
 const ids=[...new Set([result.sourceId,result.targetId])],previous=[];
 try{
  validateProject(result.project);
  for(const id of ids){const item=composition.items.find(item=>item.id===id),raw=result.project.items.find(item=>item.id===id);if(!item||!raw||isItemPositionLocked(composition,item))throw Error('Le support du plan a changé.');previous.push({item,settings:item.settings,dimensions:item.dimensions});}
  for(const old of previous){const raw=result.project.items.find(item=>item.id===old.item.id);old.item.settings={...raw.settings,drawers:[...raw.settings.drawers]};old.item.dimensions=itemDimensions('cabinet',old.item.settings);paintAsset(old.item);}
  __animaSyncContinuousTops();__animaSelectWorktopHost(result.targetId);refreshInspector();invalidate();
  placementStatus('Plan aimanté sur '+result.context.ids.length+' meuble'+(result.context.ids.length>1?'s':'')+' · '+result.context.span+' cm de supports.');return true;
 }catch(error){for(const old of previous){old.item.settings=old.settings;old.item.dimensions=old.dimensions;paintAsset(old.item);}__animaSelectWorktopHost(result.sourceId);placementStatus(error.message||'Le plan ne peut pas être posé ici.');return false;}
}
function __animaMountWorktopDrag(){
 __animaWorktopDrag?.dispose();
 const ray=new T.Raycaster();
 __animaWorktopDrag=__animaSetupWorktopDrag({canvas,controls,
  enabled:()=>!projectWorkspace?.locked&&!walkMode?.active&&!tileEditing&&!captureBusy,
  getProject:()=>({...collectProject(),locked:!!composition.locked}),
  getItem:id=>composition?.items.find(item=>item.id===id),
  isLocked:item=>isItemPositionLocked(composition,item),
  pick:event=>{const rect=canvas.getBoundingClientRect();return pickSelection(scene,camera,new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1));},
  pointOnPlane:(event,height)=>{const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);const point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-height),new T.Vector3());return point?{x:point.x,y:point.y,z:point.z}:null;},
  getFrames:()=>{const source=__animaWorktopDrag?.getActive()?.item,form=source&&cabinetFormat(source.settings.format),depthDelta=source?(source.asset.tops?.root.userData.animaTop?.zOffset??form.depth/2-.23)-(form.depth/2-.23):0;return composition.items.filter(item=>item.type==='cabinet').map(item=>__animaWorktopFrame(item,false,depthDelta));},
  getCentre:item=>__animaWorktopFrame(item,true).center,
  onSelect:__animaSelectWorktopHost,
  onTap:hit=>{__animaSelectWorktopHost(hit.itemId);openInspector('basin');},
  onStart:current=>{
   clearTimeout(projectTimer);projectTimer=null;journal?.record(collectProject());closeInspector();viewTween=null;stopOrbit();
   const item=current.item,candidates=[item.asset.worktopRoot||item.asset.tops?.root,item.asset.aquaTap,item.asset.aquaTapExtra,item.asset.root.getObjectByName('Accessoires_decoratifs'),...(item.decor||[]).map(decoration=>decoration.mesh)].filter((object,index,list)=>object&&object.parent&&list.indexOf(object)===index);
   const objects=candidates.filter(object=>!candidates.some(parent=>{for(let node=object.parent;node;node=node.parent)if(node===parent)return true;return false;}));
   scene.updateMatrixWorld(true);__animaWorktopVisuals={rotation:__animaWorktopFrame(item).rotation,objects:objects.map(object=>({object,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone(),world:object.matrixWorld.clone()}))};
   placementStatus('Déplacez le plan vers un meuble compatible. Relâchez pour l’aimanter.');
  },
  onPreview:__animaPreviewWorktop,onRestore:__animaRestoreWorktopVisuals,onCommit:__animaCommitWorktop,
  onEnd:()=>{invalidate(false,false);scheduleProjectCheckpoint();},status:placementStatus
 });
}
`;

/** Called after the standard Anima source adaptations. Studio One stays intact. */
export function transformWorktopInteraction(source){
 if(source.includes('let __animaWorktopDrag=null'))return source;
 if(!source.includes('function setupPicking(){')||!source.includes('function scheduleProjectCheckpoint(){'))throw Error('Studio One worktop interaction contract changed.');
 source=source.replace('function setupPicking(){','function setupPicking(){\n __animaMountWorktopDrag();');
 source=source.replace("if(e.key==='Escape'){partitionDragController?.cancel();", "if(e.key==='Escape'){__animaWorktopDrag?.cancel();partitionDragController?.cancel();");
 source=source.replace('function restoreProject(input){','function restoreProject(input){__animaWorktopDrag?.cancel();');
 source=source.replace('function scheduleProjectCheckpoint(){','function scheduleProjectCheckpoint(){if(__animaWorktopDrag?.getActive()?.dragging)return;');
 return prelude+source;
}
