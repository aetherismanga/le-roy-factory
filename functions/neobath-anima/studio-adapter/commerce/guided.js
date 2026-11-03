import {cabinetSettingsForRole} from '../cabinet-role.js';
import {openingBathroomProject} from '../../../../shared/lrf-3d/opening-project.js';
import {basinColors,basinLayouts,resolveBasinLayout,topSelection} from '../basins.js';
import {topAvailable,cabinetFormat,animaColumnDimensions} from '../configuration.js';
import {CATALOG as C} from './catalog.js';

export const DRAFT_KEY='neobath-anima-studio-guided-v1';
export const TRANSFER_KEY='neobath-anima-studio-guided-transfer-v1';
export const initialDraft=()=>({version:1,step:0,format:'pura-base-two',facadeMode:'overlay',width:80,finish:'rovere-alba',top:'bare',basinColor:'standard',topDrawer:'full',grass:false,ncsCode:'',column:false,columnModel:'pura-column',columnFinish:'rovere-alba',mirror:null,mirrorSize:0,mirrorFinish:'standard'});
export function normalizeDraft(input) {
  let d={...initialDraft(),...input};d=cabinetSettingsForRole(d);const m=C.models.find(m=>m.id===d.format);
  if(d.version!==1||!m||!C.finishes.some(f=>f.id===d.finish)||!Number.isInteger(d.width)||!m.allowedWidths.includes(d.width))throw Error('Choisissez une largeur disponible pour ce meuble Anima.');
  d.facadeMode='overlay';
  if(d.topSpan!==undefined&&d.topSpan!==d.width||d.topOffset!==undefined&&d.topOffset!==0)throw Error('Configurez le plan continu dans l’atelier, sur des meubles juxtaposés.');
  if(!topAvailable(d.top,d.width,d.format))throw Error('Ce plan / cette vasque ne correspond pas au meuble choisi.');
  const selection=topSelection(d.top,d.width,d.format,d.basinLayout);
  const basinChoices=basinColors(d.top,d.width,d.format,d.basinLayout);
  const colors=basinChoices.length?basinChoices:(selection?.product?.prices||[]).map(p=>({id:p.key}));
  if(colors.length&&!colors.some(c=>c.id===d.basinColor))d.basinColor=colors[0].id;
  const layouts=basinLayouts(d.top,d.width,d.format,d.basinColor);
  d.basinLayout=layouts.length?(layouts.some(o=>o.layout===d.basinLayout)?d.basinLayout:resolveBasinLayout(d.top,d.width,d.format)):null;
  d.topDrawer=d.topDrawer==='full'&&m.subtype==='base'?'full':'siphon';
  d.grass=d.grass===true&&m.trueDrawers>0;d.ncsCode=String(d.ncsCode||'').replace(/[\u0000-\u001f]/g,'').toUpperCase().slice(0,40);
  if(!C.finishes.some(f=>f.id===d.columnFinish))throw Error('Finition de colonne Anima inconnue.');
  if(!C.columns.some(c=>c.id===d.columnModel))throw Error('Façade de colonne Anima inconnue.');
  if(d.mirror!==null){const m=C.mirrors.find(m=>m.id===d.mirror);if(!m?.sizes[d.mirrorSize])throw Error('Miroir Anima non reconnu.');}
  d.column=!!d.column;d.step=Math.min(4,Math.max(0,Number.isInteger(d.step)?d.step:0));return d;
}
export function draftProject(input) {
  const d=normalizeDraft(input),m=C.models.find(m=>m.id===d.format),form=cabinetFormat(d.format);
  const bottom=Math.round((form.base??(m.height===26?.56:.30))*100);
  const items=[{id:'guided-cabinet',type:'cabinet',settings:{format:d.format,facadeMode:'overlay',width:d.width,finish:d.finish,top:d.top,topDrawer:d.topDrawer,
    basinLayout:d.basinLayout,basinColor:d.basinColor,tampaColor:d.basinColor,vesselColor:d.basinColor,grass:d.grass,ncsCode:d.ncsCode,
    drawers:Array(m.drawers||0).fill(0),decor:true,tap:null},placement:{wall:0,u:125,height:bottom}}];
  const mirror=d.mirror?C.mirrors.find(m=>m.id===d.mirror):null,size=mirror?.sizes[d.mirrorSize];
  if(d.column)items.push({id:'guided-column',type:'column',settings:{finish:d.columnFinish,columnModel:d.columnModel,facade:d.columnModel.startsWith('ribelle')?'RIBELLE':'PURA',hingeSide:'left',doorOpen:false},placement:{wall:0,u:125+Math.max(d.width,size?.width||0)/2+25,height:Math.round(animaColumnDimensions({columnModel:d.columnModel}).base*100)}});
  if(mirror)items.push({id:'guided-mirror',type:'mirror',settings:{mirrorModel:d.mirror,width:size.width,height:size.height,mirrorFinish:'standard',led:mirror.led},placement:{wall:0,u:125,height:Math.max(109,m.height+bottom+12)+size.height/2}});
  const opening=openingBathroomProject();
  return {...opening,manufacturer:'neobath-anima',title:'Ma composition NEOBATH ANIMA',items:[...items,...opening.items]};
}
