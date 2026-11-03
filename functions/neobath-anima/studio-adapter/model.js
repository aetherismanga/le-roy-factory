import * as T from 'three';
import {makeModel as studioMakeModel,roundedRect} from '@studio-one-original/model.js';
import {cabinetFormat,cabinetProduct,validWidth} from './configuration.js';
import {FINISHES} from './finishes.js';
import {topSelection} from './anima-data.js';
import {buildAnimaTop} from './tops.js';
import {animaFacadeGeometry,addAnimaDoor,applyAnimaWoodUV} from './facades.js';
import {makeCatalogueMirror} from './mirrors.js';
import {createTopSurfaceController,applyPlanSurfaceUV} from './surface-materials.js';
import {surfaceFamilyForSelection} from './premium-materials.js';
import {applyAnimaBasinAppearance} from './premium-rendering.mjs';
import {animaBasinStyle} from './top-profiles.js';
import {applyAnimaDrawerFinish} from './drawer-finish.js';
export {FINISHES,roundedRect};
export const SPEC={series:'NEOBATH ANIMA · Pura',width:.80,height:.52,depth:.46,bottom:.30,panel:.019,mirrorDiameter:.60,basin:'Lavabo Neobath Anima',cabinetRef:'APUR-PL8052',basinRef:null,mirrorRef:'SP6070'};
function discardGeometry(root){root?.removeFromParent();const seen=new Set();root?.traverse(o=>{if(o.isMesh&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}});}
export function makeMirrorFrame(){return makeCatalogueMirror({mirrorModel:'sp6070-mirror'}).root;}
export function makeModel({width=.80,includeMirror=true,basinLayout,basinTop='bare',topDrawer='siphon',format='two',facadeMode='overlay',hingeSide='left',topSpan=null,topOffset=0,topPlanId=null,topSurfaceId=null,topSurfaceNcs='',topLength=null,topShift=0,topDepth=null,basinOffsetX=0,basinOffsetZ=0,basinBottom='none',basinSupport=false,basinColor='standard',basinPriceKey=null}={}){
  const cm=Math.round(width*100),form=cabinetFormat(format),product=cabinetProduct(format,cm);
  if(!validWidth(cm,format)||!product)throw Error('Ce format Anima n’existe pas dans cette largeur.');
  // Import the real Studio One factory; do not maintain a second carcass,
  // drawer, runners or hardware implementation. Its configuration alias sets
  // the Anima 52/26 cm heights while preserving the established assembly.
  const insideHost=x=>x>=-width/2+.09&&x<=width/2-.09;
  const initial=topSelection(basinTop,cm,format,basinLayout,topSpan||cm,topPlanId,topLength,{topDepth:topDepth??undefined,basinOffsetX,basinOffsetZ,basinBottom,basinSupport,basinColor,basinPriceKey}),initialCentres=(initial?.positions?.length?initial.positions:[]).map(x=>x+(topOffset+topShift)/100).filter(insideHost);
  const asset=studioMakeModel({width,includeMirror:false,basinTop:'plain',topDrawer:form.subtype==='vanity'?topDrawer:'full',format,facadeMode:'overlay',animaPlumbing:initialCentres,animaPlumbingZ:initialCentres.map(x=>{const i=(initial?.positions||[]).findIndex(local=>Math.abs(local+(topOffset+topShift)/100-x)<1e-7);return (initial?.positionsZ?.[i]??.020)+(initial?.previewDepth-initial?.referenceDepth||0)/200;})});
  // These are closed shells with correctly oriented inner and outer walls.
  // Rendering their back faces as well produces extra layers in smoked bowls.
  asset.ceramic.side=T.FrontSide;asset.ceramic.forceSinglePass=true;
  for(const group of [...Object.values(asset.insets),asset.tops.root])discardGeometry(group);
  const actualDepth=product.depth/100,depthScale=actualDepth/.46;
  if(depthScale!==1){asset.cabinet.scale.z=depthScale;asset.cabinet.position.z=actualDepth/2-.23;}
  const ribelle=form.facade==='RIBELLE';
  applyAnimaDrawerFinish(asset);
  if(form.doors){
    for(const group of asset.drawers)discardGeometry(group);
    for(const mesh of [...asset.cabinet.children])if(/Coulisse|Rail_/.test(mesh.name))discardGeometry(mesh);
    const metal=new T.MeshStandardMaterial({color:'#bac0c1',metalness:.9,roughness:.28});
    const doorSet=addAnimaDoor({parent:asset.root,width,height:form.height,bottom:form.base,frontZ:actualDepth-.23-.0095,wood:asset.frontWood,metal,ribelle,count:form.doors,hingeSide,gripEdge:form.subtype==='wall'?'bottom':'top'});
    asset.doors=doorSet.doors;asset.drawers=doorSet.proxies;asset.frontMeshes=doorSet.frontMeshes;
    const glass=new T.MeshPhysicalMaterial({color:'#d8e4df',roughness:.12,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide});
    const shelf=new T.Mesh(new T.BoxGeometry(width-.042,.006,actualDepth-.04),glass);shelf.name='Etagere_verre_Anima';shelf.position.set(0,form.base+form.height/2,actualDepth/2-.23-.008);shelf.receiveShadow=true;asset.root.add(shelf);asset.shelves=[shelf];
  }else{
    for(const [i,front] of asset.frontMeshes.entries()){const cell=form.height/form.trueDrawers,h=cell-.004;front.geometry.dispose();front.geometry=animaFacadeGeometry(width-.004,h,ribelle);front.position.y=form.base+form.height-(i+.5)*cell;front.name=(ribelle?'Ribelle_cannelee':'Pura_lisse')+'_facade_19mm';front.userData.animaGripEdge='top';front.userData.animaOpening={type:'drawer',row:i+1};applyAnimaWoodUV(front,{front:true});}
  }
  // The catalogue base/wall units have a closed carcass top; only the
  // washbasin units retain the open sanitary mounting space (PDF pp.129–132).
  if(form.subtype==='base'||form.subtype==='wall'){
    const ceiling=new T.Mesh(new T.BoxGeometry(width-.038,.019,actualDepth-.020),asset.wood);ceiling.name='Dessus_caisson_Anima_19mm';ceiling.position.set(0,form.base+form.height-.0095,actualDepth/2-.23-.010);ceiling.castShadow=ceiling.receiveShadow=true;ceiling.userData.editTarget='basin';asset.root.add(ceiling);applyAnimaWoodUV(ceiling);asset.carcassTop=ceiling;
  }
  const mirror=includeMirror?makeMirrorFrame():null;if(mirror)asset.root.add(mirror);asset.mirror=mirror;
  asset.spec={...asset.spec,series:'NEOBATH ANIMA · '+form.name,cabinetRef:product.ref||null,basinRef:null,width,height:form.height,depth:actualDepth,bottom:form.base,totalHeight:form.height,sourceProductId:product.id,source:product.source,facade:form.facade};
  asset.root.name='NEOBATH_ANIMA_'+product.id;asset.format=form;asset.facadeMode='overlay';
  const baseSetTopDrawer=asset.setTopDrawer,baseSetBasinCenters=asset.setBasinCenters;let topMode='bare',currentTop=null,selection=null,drawerMode='full',topKey='',supportedPlumbing=[];
  const surfaceController=createTopSurfaceController({wood:asset.frontWood,ceramic:asset.ceramic});
  const whiteGelcoat=asset.ceramic.clone(),coloredGelcoat=asset.ceramic.clone();for(const material of[whiteGelcoat,coloredGelcoat]){applyAnimaBasinAppearance(material,{hex:'#f6f5f1',roughness:.45,clearcoat:.08});material.userData.animaGelcoat=true;}asset.gelcoatMaterials={white:whiteGelcoat,colored:coloredGelcoat};
  let surfaceSettings={topSurfaceId,topSurfaceNcs};asset.planMaterial=surfaceController.material;
  const bareTopHitTarget=new T.Mesh(new T.PlaneGeometry(width,actualDepth),new T.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false,side:T.DoubleSide}));
  bareTopHitTarget.name='Anima_bare_cabinet_top_target';bareTopHitTarget.rotation.x=-Math.PI/2;bareTopHitTarget.position.set(0,form.base+form.height+.00015,actualDepth/2-.23);
  bareTopHitTarget.userData={editTarget:'basin',animaWorktopTarget:true,animaBareTop:true,sourceCabinetId:product.id};asset.root.add(bareTopHitTarget);asset.bareTopHitTarget=bareTopHitTarget;
  const surfaceOwner=new T.Mesh(new T.BufferGeometry(),[asset.planMaterial,whiteGelcoat,coloredGelcoat]);surfaceOwner.name='Anima_surface_material_owner';surfaceOwner.visible=false;asset.root.add(surfaceOwner);
  asset.setSurface=(settings={},options={})=>{
    surfaceSettings={...surfaceSettings,...settings,top:topMode,width:cm,format,basinLayout,topSpan:topSpan||cm,topOffset,topPlanId,topLength,topShift,topDepth,basinOffsetX,basinOffsetZ};
    const normalized=surfaceController.apply(surfaceSettings,selection,options);
    if(animaBasinStyle(selection?.top,selection?.basin).gelcoat==='colored'){coloredGelcoat.color.set(normalized?.surface?.hex||'#f6f5f1');coloredGelcoat.userData.colorAccuracy='visual-approximation';coloredGelcoat.userData.colorNote='Teinte Gelcoat indicative, à confirmer sur le nuancier fabricant.';coloredGelcoat.needsUpdate=true;}
    if(surfaceFamilyForSelection(selection)==='furniture'&&asset.furniturePlanTextures){asset.planMaterial.map=asset.furniturePlanTextures.map;asset.planMaterial.bumpMap=asset.furniturePlanTextures.bump;for(const texture of[asset.planMaterial.map,asset.planMaterial.bumpMap])if(texture){texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;texture.needsUpdate=true;}asset.planMaterial.needsUpdate=true;}
    if(currentTop)applyPlanSurfaceUV(currentTop.root,asset.planMaterial,normalized?.surface?.physicalSize||[.8,.8]);
    asset.spec.topSurfaceId=normalized?.id||null;asset.spec.topSurfaceFamily=normalized?.family||surfaceFamilyForSelection(selection);
    return normalized;
  };
  asset.prepareSurface=()=>surfaceController.ready();asset.disposeSurface=()=>surfaceController.dispose();
  asset.setBasinAppearance=appearance=>{applyAnimaBasinAppearance(asset.ceramic,appearance);asset.setSurface({});};
  const body=asset.faucet.getObjectByName('Corps'),heads=['Bec_courbe','Mousseur','Levier_mitigeur'].map(n=>asset.faucet.getObjectByName(n));
  const headY=heads.map(o=>o.position.y);const rawFaucets=[...asset.faucets];
  // Normalize the original tap's base before a lateral installation rotates
  // it. Its old -.173 local offset would otherwise swing around the wrong axis.
  for(const faucet of rawFaucets){const baseZ=faucet.getObjectByName('Embase').position.z;for(const child of faucet.children)child.position.z-=baseZ;}
  asset.getBasinCenters=()=>selection?.positions?.length?selection.positions.map(x=>x+(topOffset+topShift)/100):[0];
  asset.getBasinPositions=()=>selection?.positions?.map((x,i)=>({x:x+(topOffset+topShift)/100,z:(selection.positionsZ?.[i]??.020)+(currentTop?.root.userData.animaTop?.zOffset||0)}))||[];
  asset.getPlumbingPositions=()=>supportedPlumbing.map(position=>({...position}));
  asset.getTapPositions=()=>{
    const holes=currentTop?.root.userData.animaTop?.tapHoles||[];
    return holes.map(hole=>({...hole,x:hole.x+(topOffset+topShift)/100}));
  };
  asset.setBasinCenters=(centres,depths=[])=>{if(!Array.isArray(centres)||!centres.every(Number.isFinite)||!depths.every(Number.isFinite))return false;supportedPlumbing=centres.map((x,i)=>({x,z:depths[i]??.020}));const result=form.trueDrawers?baseSetBasinCenters?.(centres,depths):true;applyAnimaDrawerFinish(asset);drawerMode=form.trueDrawers&&form.subtype==='vanity'&&centres.length?'siphon':'full';return result;};
  asset.setTopDrawer=value=>{drawerMode=!form.trueDrawers||form.subtype!=='vanity'||!supportedPlumbing.length?'full':'siphon';if(form.trueDrawers)baseSetTopDrawer(drawerMode);applyAnimaDrawerFinish(asset);return drawerMode;};
  asset.getTopDrawer=()=>drawerMode;
  asset.setTop=(mode,settings={})=>{
    const span=Number.isFinite(settings.topSpan)?settings.topSpan:topSpan||cm,offset=Number.isFinite(settings.topOffset)?settings.topOffset:topOffset;
    const nextSettings={topPlanId,basinLayout,topLength,topShift,topDepth,basinOffsetX,basinOffsetZ,basinBottom,basinSupport,basinColor,basinPriceKey};
    for(const key of Object.keys(nextSettings))if(settings[key]!==undefined)nextSettings[key]=settings[key];
    const next=topSelection(mode,cm,format,nextSettings.basinLayout,span,nextSettings.topPlanId,nextSettings.topLength,{topDepth:nextSettings.topDepth??undefined,basinOffsetX:nextSettings.basinOffsetX,basinOffsetZ:nextSettings.basinOffsetZ,basinBottom:nextSettings.basinBottom,basinSupport:nextSettings.basinSupport,basinColor:nextSettings.basinColor,basinPriceKey:nextSettings.basinPriceKey});if(mode!=='bare'&&!next)return false;
    const key=[mode,span,offset,...['topPlanId','basinLayout','topLength','topShift','topDepth','basinOffsetX','basinOffsetZ','basinBottom','basinSupport'].map(key=>nextSettings[key])].join('|');if(topKey===key&&currentTop){selection=next;({topPlanId,basinLayout,topLength,topShift,topDepth,basinOffsetX,basinOffsetZ,basinBottom,basinSupport,basinColor,basinPriceKey}=nextSettings);asset.setSurface(settings);return true;}
    const family=surfaceFamilyForSelection(next),style=animaBasinStyle(next?.top,next?.basin),bowlMaterial=style.gelcoat==='white'?whiteGelcoat:style.gelcoat==='colored'?coloredGelcoat:next?.integrated&&family&&family!=='furniture'?asset.planMaterial:asset.ceramic;
    let nextTop;try{nextTop=buildAnimaTop({selection:next,wood:asset.frontWood,ceramic:asset.ceramic,planMaterial:asset.planMaterial,bowlMaterial,chrome:rawFaucets[0].getObjectByName('Embase').material,surfaceY:form.base+form.height,cabinetDepth:actualDepth});}catch{return false;}
    // Commit one complete assembly only after its geometry succeeds. A failed
    // replacement must not leave an old bowl floating over a second worktop.
    currentTop?.dispose();currentTop=nextTop;selection=next;topMode=mode;topSpan=span;topOffset=offset;topKey=key;
    ({topPlanId,basinLayout,topLength,topShift,topDepth,basinOffsetX,basinOffsetZ,basinBottom,basinSupport,basinColor,basinPriceKey}=nextSettings);
    applyAnimaBasinAppearance(asset.ceramic,{hex:'#f6f5f1',roughness:.56,clearcoat:0});
    currentTop.root.position.x=(topOffset+topShift)/100;
    currentTop.root.userData.sourceCabinetId=product.id;currentTop.root.userData.animaWorktopTarget=true;asset.worktopRoot=currentTop.root;bareTopHitTarget.visible=!selection?.top;
    asset.root.add(currentTop.root);asset.tops=currentTop;asset.insets=currentTop.insets;asset.insetGroup=currentTop.insets[mode]||currentTop.root;asset.basinLayout=selection?.layout||'center';
    asset.spec.basinRef=selection?.reference||null;asset.spec.basin=selection?.product?.label||'Meuble seul';asset.spec.topHeight=(selection?.top?.height||0)/100;asset.spec.basinHeight=currentTop.previewBasinRise??(selection?.basin?.subtype==='countertop'?(selection.basin.height||14)/100:0);
    asset.spec.topSpan=topSpan;asset.spec.topOffset=topOffset;asset.spec.topWidth=selection?.topWidth||0;asset.spec.topLength=topLength;asset.spec.topShift=topShift;asset.spec.topDepth=selection?.previewDepth||actualDepth*100;asset.spec.basinOffsetX=basinOffsetX;asset.spec.basinOffsetZ=basinOffsetZ;
    asset.setSurface(settings);
    const centers=(selection?.positions||[]).map(x=>x+(topOffset+topShift)/100),surface=currentTop.topSurface||form.base+form.height,extra=asset.spec.basinHeight;
    if(form.trueDrawers&&form.subtype==='vanity'){const positions=asset.getBasinPositions().filter(p=>insideHost(p.x));asset.setBasinCenters?.(positions.map(p=>p.x),positions.map(p=>p.z));asset.setTopDrawer(positions.length?'siphon':'full');}
    body.scale.y=(.131+extra)/.131;body.position.y=.911+extra/2;heads.forEach((o,i)=>o.position.y=headY[i]+extra);
    const taps=asset.getTapPositions();asset.spec.tapMount=currentTop.root.userData.animaTop?.tapMount||(taps.length?'deck':null);
    rawFaucets.forEach((f,i)=>{const tap=taps[i];f.position.set(tap?.x||0,surface-.838,tap?.z||0);f.rotation.y=tap?.rotationY||0;f.visible=!!tap;});
    // The second Studio One tap shares geometry/material but has its own nodes.
    const secondBody=rawFaucets[1].getObjectByName('Corps');secondBody.scale.copy(body.scale);secondBody.position.y=body.position.y;
    ['Bec_courbe','Mousseur','Levier_mitigeur'].forEach((n,i)=>rawFaucets[1].getObjectByName(n).position.y=headY[i]+extra);
    return true;
  };
  asset.getTop=()=>topMode;
  asset.setTop(basinTop);if(!currentTop)asset.setTop('bare');asset.setTopDrawer(topDrawer);
  return asset;
}
