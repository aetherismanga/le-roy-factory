import {openingBathroomProject} from '../../../shared/lrf-3d/opening-project.js';
import {normalizeTopDrawer} from '../../../shared/lrf-3d/drawer-options.js';
import {basinEntry,basinLayouts,resolveBasinLayout} from '../basins.js';
import {CATALOG as C} from './catalog.js';
import {integratedTop,defaultBasinColor} from '../../../shared/lrf-3d/solid-surface-catalog.js';
import {topAvailable,defaultTop,validWidth} from '../configuration.js';
import {columnHandleColor} from '../general-specs.js';
export const DRAFT_KEY='randal-general-guided-v1',TRANSFER_KEY='randal-general-guided-transfer-v1';
export function columnsForGuidedCollection(collection){
 const columnCollection=collection==='aruba-rainure'?'aruba':collection;
 return C.columns.filter(column=>column.collection===columnCollection);
}
function smoothArubaFinish(column,finish){
 const match=finish.replace(/^aruba-rainure--/,'aruba--').replace(/-acanalado$/,'');
 return column.finishes.includes(match)?match:column.finishes[0];
}
export const initialDraft=(collection='harmony')=>{
 const m=C.models.find(m=>m.collection===collection)||C.models[0],column=columnsForGuidedCollection(m.collection)[0];
 const columnFinish=m.collection==='aruba-rainure'&&column?smoothArubaFinish(column,m.finishes[0]):m.finishes[0];
 return {version:1,engaged:false,collection:m.collection,step:0,format:m.id,width:m.widths.includes(80)?80:m.widths[0],finish:m.finishes[0],top:defaultTop(m.id),basinColor:'gloss',topDrawer:'siphon',topFinish:'plan--blanco-mate',
  column:false,columnModel:column?.id||null,columnFinish,columnHandleColor:column?columnHandleColor(column):null,columnHingeSide:'left',
  mirror:null,mirrorSize:0,mirrorFinish:'Noir'};
};
export function updateDraft(input,patch){
 const next={...input,...patch,engaged:true};
 if(patch.format){const model=C.models.find(m=>m.id===patch.format);if(!model)throw Error('Choisissez un modèle du catalogue général RANDAL.');if(!validWidth(next.width,model.id))next.width=model.widths[0];if(!model.finishes.includes(next.finish))next.finish=model.finishes[0];}
 if(next.collection==='aruba-rainure'&&!next.column&&Object.hasOwn(patch,'finish')){
  const col=columnsForGuidedCollection(next.collection).find(c=>c.id===next.columnModel);
  if(col)next.columnFinish=smoothArubaFinish(col,next.finish);
 }
 if(!topAvailable(next.top,next.width,next.format)){next.top=defaultTop(next.format,next.width);next.basinColor='gloss';}
 if(next.top==='tampa'&&!C.inset.tampa[next.basinColor]?.[next.width===79?80:next.width])next.basinColor='gloss';
 // An integrated double bowl is not a countertop-bowl placement. Resolve the
 // previous choice against the new top before validating or updating the scene.
 if(integratedTop(next.top)||['neris','torne'].includes(next.top)){
  next.basinLayout=resolveBasinLayout(next.top,next.width,next.format,next.basinLayout,Object.hasOwn(patch,'basinLayout')?undefined:input);
  if(!basinEntry(next.top,next.basinColor,next.width,next.format,next.basinLayout))next.basinColor=defaultBasinColor(next.top);
 }
 return normalizeDraft(next);
}
export function normalizeDraft(input){
 const m=C.models.find(m=>m.id===input?.format);if(!m)throw Error('Choisissez un modèle du catalogue général RANDAL.');
 const d={...initialDraft(m.collection),...input,collection:m.collection};
 if(d.version!==1||!m.finishes.includes(d.finish)||!validWidth(d.width,m.id))throw Error('Dimensions ou finition indisponibles pour cette collection.');
 if(!topAvailable(d.top,d.width,d.format))throw Error('Cette vasque ou ce plan ne correspond pas au meuble.');
 if((['sella','compact'].includes(d.top)&&d.basinColor!=='gloss')||(d.top==='tampa'&&!C.inset.tampa[d.basinColor]?.[d.width===79?80:d.width]))throw Error('Cette configuration est proposée en blanc brillant.');
 if(['neris','torne'].includes(d.top)&&!C.vesselColors.some(c=>c.code===d.basinColor))throw Error('Finition de vasque indisponible.');
 if(['plain','neris','torne'].includes(d.top)&&!C.topFinishes.some(f=>f.id===d.topFinish))throw Error('Finition de plan indisponible.');
 if(integratedTop(d.top)){d.basinLayout=d.basinLayout??resolveBasinLayout(d.top,d.width,d.format);if(!basinEntry(d.top,d.basinColor,d.width,d.format,d.basinLayout))throw Error('Implantation de vasque indisponible dans cette largeur et cette finition.');}
 if(['neris','torne'].includes(d.top)){d.basinLayout=d.basinLayout??'center';if(!basinLayouts(d.top,d.width,d.format,d.basinColor).some(o=>o.layout===d.basinLayout))throw Error('Implantation de vasque à poser incompatible avec la largeur du plan.');}
 const columns=columnsForGuidedCollection(m.collection);
 if(m.collection==='aruba-rainure'&&!d.columnModel)d.columnModel=columns[0]?.id||null;
 const column=columns.find(c=>c.id===d.columnModel);
 if(m.collection==='aruba-rainure'&&column&&!column.finishes.includes(d.columnFinish))d.columnFinish=smoothArubaFinish(column,d.finish);
 if(d.column&&!column?.finishes.includes(d.columnFinish))throw Error('Colonne incompatible avec cette collection.');
 d.columnHandleColor=column?columnHandleColor(column,d.columnHandleColor):null;
 d.columnHingeSide=d.columnHandleColor&&d.columnHingeSide==='right'?'right':'left';
 if(d.mirror!==null){const mirror=C.mirrors.find(m=>m.id===d.mirror),size=mirror?.sizes[d.mirrorSize];if(!size||size.refs&&!Object.hasOwn(size.refs,d.mirrorFinish))throw Error('Miroir non reconnu.');}
 d.topDrawer=normalizeTopDrawer(d.topDrawer,d.top);if(!m.drawers)d.topDrawer='siphon';d.column=!!d.column;d.step=Math.min(4,Math.max(0,Number.isInteger(d.step)?d.step:0));return d;
}
export function draftProject(input){
 const d=normalizeDraft(input),m=C.models.find(m=>m.id===d.format),items=[{id:'guided-cabinet',type:'cabinet',settings:{format:d.format,width:d.width,finish:d.finish,top:d.top,topDrawer:d.topDrawer,basinLayout:d.basinLayout??null,topFinish:d.topFinish,basinColor:d.basinColor,tampaColor:d.basinColor,vesselColor:d.basinColor,drawers:Array(m.drawers).fill(0),decor:true,tap:null},placement:{wall:0,u:125,height:m.base}}];
 const selectedMirror=d.mirror?C.mirrors.find(v=>v.id===d.mirror).sizes[d.mirrorSize]:null;
 if(d.column){
  const col=C.columns.find(c=>c.id===d.columnModel);
  const settings={columnModel:col.id,finish:d.columnFinish,hingeSide:d.columnHingeSide,doorOpen:false};
  if(d.columnHandleColor)settings.handleColor=d.columnHandleColor;
  items.push({id:'guided-column',type:'column',settings,placement:{wall:0,u:125+Math.max(d.width,selectedMirror?.width||0)/2+col.width/2+10,height:col.base}});
 }
 if(d.mirror){const mirror=C.mirrors.find(m=>m.id===d.mirror),size=mirror.sizes[d.mirrorSize];items.push({id:'guided-mirror',type:'mirror',settings:{mirrorModel:d.mirror,width:size.width,height:size.height,mirrorFinish:d.mirrorFinish,led:['zen','ilse','capsule'].includes(d.mirror)},placement:{wall:0,u:125,height:Math.max(109,m.height+m.base+2+(d.top==='neris'?14:d.top==='torne'?12:0)+10)+size.height/2}});}
 const opening=openingBathroomProject();
 return {...opening,catalogue:'randal-general-v04',title:'Ma composition RANDAL · '+m.collectionName,items:[...items,...opening.items]};
}
