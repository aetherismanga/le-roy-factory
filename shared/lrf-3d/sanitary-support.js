import {COLLECTIONS,formatsForColor,normalizeLayout} from './surface-catalog.js';
import {selectedFormat} from './surface-picker.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const HEX=/^#[a-f0-9]{6}$/i;
export function supportCoveringMode(settings={}){
 const mode=settings.supportCovering?.mode;
 if(['inherit','all','split','paint'].includes(mode))return mode;
 // Preserve a consciously chosen legacy solid colour; the previous menu's
 // default beige becomes inherited wall covering rather than a forced paint.
 return HEX.test(settings.supportColor||'')&&settings.supportColor.toLowerCase()!=='#d6cabb'?'paint':'inherit';
}
export function supportSurfaceFinish(settings,part,wallFinish={}){
 const mode=supportCoveringMode(settings),covering=settings.supportCovering;
 if(mode==='inherit'||mode==='paint')return wallFinish;
 return mode==='split'&&part!=='front'?covering?.reveal||wallFinish:covering?.back||wallFinish;
}
export function collectSupportFinishes(items=[]){
 return items.filter(item=>item.type==='toilet'&&item.settings?.support).flatMap(item=>{
  const c=item.settings.supportCovering,mode=supportCoveringMode(item.settings);
  return mode==='all'?[c?.back]:mode==='split'?[c?.back,c?.reveal]:[];
 }).filter(Boolean);
}
export function supportCoveringError(settings={}){
 const covering=settings.supportCovering;if(covering===undefined)return '';
 if(!covering||typeof covering!=='object'||Array.isArray(covering)||!['inherit','all','split','paint'].includes(covering.mode))return 'Revêtement du bâti-support invalide.';
 if(covering.mode==='paint')return HEX.test(settings.supportColor||'')?'':'Couleur du bâti-support invalide.';
 for(const finish of covering.mode==='split'?[covering.back,covering.reveal]:covering.mode==='all'?[covering.back]:[]){
  if(!finish||!COLLECTIONS[finish.collection]?.colors.some(color=>color.id===finish.color)||!formatsForColor(finish.collection,finish.color).some(format=>format.id===finish.format))return 'Choisissez un carrelage et un format disponibles pour le bâti-support.';
 }
 return '';
}

// The front uses the wall's physical grid, including its origin. Extruded
// faces unfold from that same grid, keeping horizontal joints at equal height.
export function supportFaceLayout(item,face,wallLayout={},finish={}){
 const size=face.supportDimensions,{width,height,depth}=size,left=item.placement.u/100-width/2,bottom=(item.placement.height||0)/100;
 const layout=normalizeLayout({...wallLayout},finish.collection,finish.format,finish.color);
 const x=left+(face.supportPart==='left'?-depth:face.supportPart==='right'?width:0),y=bottom+(face.supportPart==='top'?height:0);
 return {...layout,x:(Number(layout.x)||0)-x*100,y:(Number(layout.y)||0)-y*100,planAxes:false};
}
export function applySupportCladding(item,wallSurface,wallFinish={},applyMaterial,{force=false}={}){
 if(item?.type!=='toilet'||!item.settings?.support||!item.asset?.supportSurfaces?.length||!wallSurface)return [];
 const mode=supportCoveringMode(item.settings),paint=mode==='paint';
 const inherited={...wallFinish,format:wallFinish.format||selectedFormat(wallFinish.collection,wallFinish.color,wallSurface.layout)};
 return item.asset.supportSurfaces.map(face=>{
  const finish=supportSurfaceFinish(item.settings,face.supportPart,inherited),layout=supportFaceLayout(item,face,wallSurface.layout,finish);
  const layoutKey=JSON.stringify(layout),finishKey=JSON.stringify([mode,finish,item.settings.supportColor,wallSurface.grout?.material?.color?.getHexString()]);
  const layoutChanged=face.supportLayoutKey!==layoutKey,finishChanged=face.supportFinishKey!==finishKey;
  face.supportFinish=clone(finish);
  face.refreshTileColors=()=>{
   if(paint){face.setPaint(true);const material=face.material;material.color.set(item.settings.supportColor||'#d6cabb');material.map=material.bumpMap=null;material.roughness=.72;material.clearcoat=0;material.needsUpdate=true;}
   else applyMaterial(face,face.supportFinish);
  };
  // Geometry is stable during selection/scroll/re-render; a changed placement
  // only rebuilds faces when their physical wall-grid phase really changes.
  if(layoutChanged){
   face.supportLayoutKey=layoutKey;const refresh=face.refreshTileColors;face.refreshTileColors=null;
   try{face.setLayout(layout);}finally{face.refreshTileColors=refresh;}
  }
  if(wallSurface.grout?.material?.color)face.grout.material.color.copy(wallSurface.grout.material.color);
  if(force||layoutChanged||finishChanged)face.refreshTileColors();
  face.supportFinishKey=finishKey;
  return {surface:face,finish:face.supportFinish,label:'Bâti-support · '+({front:'façade',left:'côté gauche',right:'côté droit',top:'dessus'}[face.supportPart]||face.supportPart)};
 });
}
