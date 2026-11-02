import * as T from 'three';
import {makeModel as studioMakeModel,roundedRect} from '@studio-one-original/model.js';
import {cabinetFormat,cabinetProduct,validWidth} from './configuration.js';
import {FINISHES} from './finishes.js';
import {topSelection} from './anima-data.js';
import {buildAnimaTop} from './tops.js';
import {animaFacadeGeometry,addAnimaDoor} from './facades.js';
import {makeCatalogueMirror} from './mirrors.js';
export {FINISHES,roundedRect};
export const SPEC={series:'NEOBATH ANIMA · Pura',width:.80,height:.52,depth:.46,bottom:.30,panel:.019,mirrorDiameter:.60,basin:'Lavabo Neobath Anima',cabinetRef:'APUR-PL8052',basinRef:null,mirrorRef:'SP6070'};
function discardGeometry(root){root?.removeFromParent();const seen=new Set();root?.traverse(o=>{if(o.isMesh&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}});}
export function makeMirrorFrame(){return makeCatalogueMirror({mirrorModel:'sp6070-mirror'}).root;}
export function makeModel({width=.80,includeMirror=true,basinLayout,basinTop='bare',topDrawer='siphon',format='two',facadeMode='overlay',hingeSide='left',topSpan=null,topOffset=0}={}){
  const cm=Math.round(width*100),form=cabinetFormat(format),product=cabinetProduct(format,cm);
  if(!validWidth(cm,format)||!product)throw Error('Ce format Anima n’existe pas dans cette largeur.');
  // Import the real Studio One factory; do not maintain a second carcass,
  // drawer, runners or hardware implementation. Its configuration alias sets
  // the Anima 52/26 cm heights while preserving the established assembly.
  const insideHost=x=>x>=-width/2+.09&&x<=width/2-.09;
  const initial=topSelection(basinTop,cm,format,basinLayout,topSpan||cm),initialCentres=(initial?.positions?.length?initial.positions:[0]).map(x=>x+topOffset/100).filter(insideHost);
  const asset=studioMakeModel({width,includeMirror:false,basinTop:'plain',topDrawer:form.subtype==='vanity'?topDrawer:'full',format,facadeMode:'overlay',animaPlumbing:initialCentres});
  for(const group of [...Object.values(asset.insets),asset.tops.root])discardGeometry(group);
  const actualDepth=product.depth/100,depthScale=actualDepth/.46;
  if(depthScale!==1){asset.cabinet.scale.z=depthScale;asset.cabinet.position.z=actualDepth/2-.23;}
  const ribelle=form.facade==='RIBELLE';
  if(form.doors){
    for(const group of asset.drawers)discardGeometry(group);
    for(const mesh of [...asset.cabinet.children])if(/Coulisse|Rail_/.test(mesh.name))discardGeometry(mesh);
    const metal=new T.MeshStandardMaterial({color:'#bac0c1',metalness:.9,roughness:.28});
    const doorSet=addAnimaDoor({parent:asset.root,width,height:form.height,bottom:form.base,frontZ:actualDepth-.23-.0095,wood:asset.frontWood,metal,ribelle,count:form.doors,hingeSide});
    asset.doors=doorSet.doors;asset.drawers=doorSet.proxies;asset.frontMeshes=doorSet.frontMeshes;
    const glass=new T.MeshPhysicalMaterial({color:'#d8e4df',roughness:.12,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide});
    const shelf=new T.Mesh(new T.BoxGeometry(width-.042,.006,actualDepth-.04),glass);shelf.name='Etagere_verre_Anima';shelf.position.set(0,form.base+form.height/2,actualDepth/2-.23-.008);shelf.receiveShadow=true;asset.root.add(shelf);asset.shelves=[shelf];
  }else{
    for(const front of asset.frontMeshes){const h=form.height/form.trueDrawers-.004;front.geometry.dispose();front.geometry=animaFacadeGeometry(width-.004,h,ribelle);front.name=(ribelle?'Ribelle_cannelee':'Pura_lisse')+'_facade_19mm';}
  }
  const mirror=includeMirror?makeMirrorFrame():null;if(mirror)asset.root.add(mirror);asset.mirror=mirror;
  asset.spec={...asset.spec,series:'NEOBATH ANIMA · '+form.name,cabinetRef:product.ref||null,basinRef:null,width,height:form.height,depth:actualDepth,bottom:form.base,totalHeight:form.height,sourceProductId:product.id,source:product.source,facade:form.facade};
  asset.root.name='NEOBATH_ANIMA_'+product.id;asset.format=form;asset.facadeMode='overlay';
  const baseSetTopDrawer=asset.setTopDrawer;let topMode='bare',currentTop=null,selection=null,drawerMode='siphon',topKey='';
  const body=asset.faucet.getObjectByName('Corps'),heads=['Bec_courbe','Mousseur','Levier_mitigeur'].map(n=>asset.faucet.getObjectByName(n));
  const headY=heads.map(o=>o.position.y);const rawFaucets=[...asset.faucets];
  asset.getBasinCenters=()=>selection?.positions?.length?selection.positions.map(x=>x+topOffset/100):[0];
  asset.setTopDrawer=value=>{drawerMode=!form.trueDrawers||form.subtype!=='vanity'?'full':selection?.integrated?'siphon':value==='full'?'full':'siphon';if(form.trueDrawers)baseSetTopDrawer(drawerMode);return drawerMode;};
  asset.getTopDrawer=()=>drawerMode;
  asset.setTop=(mode,settings={})=>{
    const span=Number.isFinite(settings.topSpan)?settings.topSpan:topSpan||cm,offset=Number.isFinite(settings.topOffset)?settings.topOffset:topOffset;
    const next=topSelection(mode,cm,format,basinLayout,span);if(mode!=='bare'&&!next)return false;
    const key=[mode,span,offset].join('|');if(topKey===key&&currentTop)return true;
    currentTop?.dispose();selection=next;topMode=mode;topSpan=span;topOffset=offset;topKey=key;
    asset.ceramic.color.set('#f6f5f1');
    currentTop=buildAnimaTop({selection,wood:asset.frontWood,ceramic:asset.ceramic,chrome:rawFaucets[0].getObjectByName('Embase').material,surfaceY:form.base+form.height,cabinetDepth:actualDepth});
    currentTop.root.position.x=topOffset/100;
    asset.root.add(currentTop.root);asset.tops=currentTop;asset.insets=currentTop.insets;asset.insetGroup=currentTop.insets[mode]||currentTop.root;asset.basinLayout=selection?.layout||'center';
    asset.spec.basinRef=selection?.reference||null;asset.spec.basin=selection?.product?.label||'Meuble seul';asset.spec.topHeight=(selection?.top?.height||0)/100;asset.spec.basinHeight=selection?.basin?.subtype==='countertop'?(selection.basin.height||14)/100:0;
    asset.spec.topSpan=topSpan;asset.spec.topOffset=topOffset;asset.spec.topWidth=selection?.topWidth||0;
    const centers=(selection?.positions||[]).map(x=>x+topOffset/100),surface=currentTop.topSurface||form.base+form.height,extra=asset.spec.basinHeight;
    if(form.trueDrawers&&form.subtype==='vanity'&&centers.length){asset.setBasinCenters?.(centers.filter(insideHost));asset.setTopDrawer(drawerMode);}
    body.scale.y=(.131+extra)/.131;body.position.y=.911+extra/2;heads.forEach((o,i)=>o.position.y=headY[i]+extra);
    rawFaucets.forEach((f,i)=>{f.position.set(centers[i]||0,surface-.838,actualDepth/2-.23);f.visible=centers.length>i;});
    // The second Studio One tap shares geometry/material but has its own nodes.
    const secondBody=rawFaucets[1].getObjectByName('Corps');secondBody.scale.copy(body.scale);secondBody.position.y=body.position.y;
    ['Bec_courbe','Mousseur','Levier_mitigeur'].forEach((n,i)=>rawFaucets[1].getObjectByName(n).position.y=headY[i]+extra);
    return true;
  };
  asset.getTop=()=>topMode;
  asset.setTop(basinTop);if(!currentTop)asset.setTop('bare');asset.setTopDrawer(topDrawer);
  return asset;
}
