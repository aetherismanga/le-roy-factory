import * as T from 'three';
import {buildAnimaTop} from './tops.js';
import {animaBasinStyle} from './top-profiles.js';
import {normalizeStandaloneSettings,standaloneSelection,standaloneDimensions} from './standalone-worktop-data.js';
import {createTopSurfaceController,applyPlanSurfaceUV} from './surface-materials.js';
import {surfaceFamilyForSelection} from './premium-materials.js';
import {basinColors} from './basins.js';
import {FINISHES} from './finishes.js';
import {applyAnimaBasinAppearance,configureAnimaTexture} from './premium-rendering.mjs';
export {normalizeStandaloneSettings,standaloneSelection,standaloneDimensions};

export function makeStandaloneWorktop(input={}){
 const root=new T.Group();root.name='NEOBATH_ANIMA_PLAN_INDEPENDANT';root.userData.editTarget='worktop';
 const wood=new T.MeshPhysicalMaterial({color:'#c2a482',roughness:.66}),ceramic=new T.MeshPhysicalMaterial({color:'#f6f5f1',roughness:.45,clearcoat:.08,side:T.FrontSide}),chrome=new T.MeshStandardMaterial({color:'#bec4c5',metalness:1,roughness:.23}),white=ceramic.clone(),colored=ceramic.clone();
 const surface=createTopSurfaceController({wood,ceramic});let current=null,settings,selection,key='',finishKey='',finishRevision=0,finishReady=Promise.resolve(),woodTexture=null,disposed=false;
 wood.addEventListener('dispose',()=>{disposed=true;finishRevision++;woodTexture?.dispose();woodTexture=null;});
 function applyFurnitureFinish(next,options){
  const finish=FINISHES.find(entry=>entry.id===next.finish)||FINISHES[0];if(finishKey===finish.id)return;finishKey=finish.id;const ticket=++finishRevision;
  woodTexture?.dispose();woodTexture=null;wood.map=null;wood.color.set(finish.hex);wood.roughness=finish.roughness;wood.clearcoat=finish.clearcoat;wood.needsUpdate=true;
  if(finish.textureMapped&&typeof document!=='undefined')finishReady=new T.TextureLoader().loadAsync(finish.texture).then(texture=>{if(disposed||ticket!==finishRevision){texture.dispose();return;}woodTexture=configureAnimaTexture(texture,null,{singleSheet:true});wood.map=woodTexture;wood.color.set('#ffffff');wood.needsUpdate=true;if(selection?.top.subtype==='cover')surface.apply(settings,selection,options);options.onReady?.();}).catch(()=>{});else finishReady=Promise.resolve();
 }
 const owner=new T.Mesh(new T.BufferGeometry(),[wood,ceramic,chrome,white,colored,surface.material]);owner.name='Anima_independent_material_owner';owner.visible=false;root.add(owner);
 const asset={root,wood,frontWood:wood,ceramic,planMaterial:surface.material,drawers:[],faucets:[],spec:{bottom:0,series:'NEOBATH ANIMA · plan indépendant',cabinetRef:null},format:{subtype:'worktop'}};
 asset.setSettings=(patch={},options={})=>{
  let next,selected,nextTop;try{next=normalizeStandaloneSettings({...settings,...patch});selected=standaloneSelection(next);}catch{return false;}
  const geometryKey=[selected.mode,selected.top.id,next.width,next.topDepth,next.basinLayout,next.basinOffsetX,next.basinOffsetZ,next.basinBottom,next.basinSupport].join('|');
  if(!current||key!==geometryKey){
   const style=animaBasinStyle(selected.top,selected.basin),family=surfaceFamilyForSelection(selected),bowl=style.gelcoat==='white'?white:style.gelcoat==='colored'?colored:selected.integrated&&family&&family!=='furniture'?surface.material:ceramic;
   try{nextTop=buildAnimaTop({selection:selected,wood,ceramic,chrome,planMaterial:surface.material,bowlMaterial:bowl,surfaceY:0,cabinetDepth:selected.referenceDepth/100});}catch{return false;}
   // A standalone slab is wall-referenced, with its rear edge at local z=-.23.
   nextTop.root.position.z=0;
   nextTop.root.traverse(object=>{object.userData.editTarget='worktop';if(object.isMesh)object.userData.animaStandalonePlan=true;});
   current?.dispose();current=nextTop;root.add(current.root);asset.tops=current;key=geometryKey;
  }
  settings=next;selection=selected;asset.settings=settings;asset.selection=selected;
  if(selection.top.subtype==='cover')applyFurnitureFinish(settings,options);
  const normalized=surface.apply(settings,selection,options);if(animaBasinStyle(selection.top,selection.basin).gelcoat==='colored'){colored.color.set(normalized?.surface?.hex||'#f6f5f1');colored.userData.colorAccuracy='visual-approximation';}
  const colour=basinColors(settings.top,settings.width,'worktop',settings.basinLayout,settings.width,settings.topPlanId,settings.width,settings).find(entry=>entry.id===(settings.basinPriceKey||settings.basinColor));applyAnimaBasinAppearance(ceramic,colour||{hex:'#f6f5f1',roughness:.45});applyPlanSurfaceUV(current.root,surface.material);
  asset.spec={...asset.spec,width:selected.topWidth/100,depth:selected.previewDepth/100,height:standaloneDimensions(settings).height,base:0,topHeight:selected.top.height/100,basinHeight:current.previewBasinRise||0,basinRef:selected.reference,topSurfaceId:normalized?.id||null,sourceProductId:selected.top.id,source:selected.top.source,standalone:true,fixingsIncluded:false};
  root.userData.animaStandalonePlan=true;return true;
 };
 asset.prepareSurface=()=>Promise.all([surface.ready(),finishReady]);asset.disposeSurface=()=>{disposed=true;finishRevision++;woodTexture?.dispose();surface.dispose();};
 asset.getTapPositions=()=>{const meta=current?.root.userData.animaTop;return (meta?.tapHoles||[]).map(hole=>({...hole,z:hole.z+current.root.position.z,surfaceY:hole.surfaceY??meta.topSurface,basinHeight:current.previewBasinRise||0}));};
 asset.getBasinCenters=()=>asset.getBasinPositions().map(point=>point.x);
 asset.getBasinPositions=()=>{const meta=current?.root.userData.animaTop;return (meta?.wells||[]).map(well=>({x:well.x,z:well.z+current.root.position.z}));};
 asset.setBasinAppearance=appearance=>applyAnimaBasinAppearance(ceramic,appearance);
 asset.dispose=()=>{current?.dispose();asset.disposeSurface();for(const material of[wood,ceramic,chrome,white,colored])material.dispose();owner.geometry.dispose();root.removeFromParent();};
 if(!asset.setSettings(input))throw Error('Ce plan indépendant Anima ne peut pas être construit.');return asset;
}
