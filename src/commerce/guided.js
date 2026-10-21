import {basinEntry,resolveBasinLayout} from '../basins.js';
import {CATALOG as C} from './catalog.js';
export const DRAFT_KEY='studio-one-guided-v1';
export const TRANSFER_KEY='studio-one-guided-transfer-v1';
export const initialDraft=()=>({version:1,step:0,format:'two',width:80,finish:'ROBLE',top:'sella',basinColor:'gloss',column:false,columnFinish:'ROBLE',mirror:null,mirrorSize:0,mirrorFinish:'Noir'});
export function normalizeDraft(input){
 const d={...initialDraft(),...input};
 if(d.version!==1||!C.models.some(m=>m.id===d.format)||!C.finishes.some(f=>f.id===d.finish)||!Number.isInteger(d.width)||d.width<40||d.width>120)throw Error('Choisissez une largeur entière entre 40 et 120 cm.');
 if(!['plain','sella','tampa','neris','torne'].includes(d.top))throw Error('Plan non reconnu.');
 if(['sella','tampa'].includes(d.top)&&!C.inset[d.top]?.[d.basinColor]?.[d.width])throw Error('Cette vasque n’est pas disponible dans cette largeur et cette finition.');
 if(['sella','tampa'].includes(d.top)){d.basinLayout=d.basinLayout??resolveBasinLayout(d.top,d.width,d.format);if(!basinEntry(d.top,d.basinColor,d.width,d.format,d.basinLayout))throw Error('Implantation de vasque indisponible dans cette largeur et cette finition.');}
 if(['neris','torne'].includes(d.top)&&(!C.vesselColors.some(c=>c.code===d.basinColor)||d.width<(d.top==='neris'?50:40)))throw Error('Vasque à poser incompatible.');
 if(!C.finishes.some(f=>f.id===d.columnFinish))throw Error('Finition de colonne inconnue.');
 if(d.mirror!==null){const m=C.mirrors.find(m=>m.id===d.mirror),size=m?.sizes[d.mirrorSize];if(!size||size.refs&&!Object.hasOwn(size.refs,d.mirrorFinish))throw Error('Miroir non reconnu.');}
 d.column=!!d.column;d.step=Math.min(4,Math.max(0,Number.isInteger(d.step)?d.step:0));return d;
}
// This serializable payload is understood by the existing 3D project loader.
// No prices, accounts or session tokens are included in saved projects/links.
export function draftProject(input){
 const d=normalizeDraft(input),m=C.models.find(m=>m.id===d.format),items=[{id:'guided-cabinet',type:'cabinet',settings:{format:d.format,width:d.width,finish:d.finish,top:d.top,basinLayout:d.basinLayout??null,basinColor:d.basinColor,tampaColor:d.basinColor,vesselColor:d.basinColor,drawers:Array(m.id==='three'?3:m.id==='one-xl'?1:2).fill(0),decor:true,tap:null},placement:{wall:0,u:125,height:m.id==='three'?0:28}}];
 const selectedMirror=d.mirror?C.mirrors.find(v=>v.id===d.mirror).sizes[d.mirrorSize]:null;
 if(d.column)items.push({id:'guided-column',type:'column',settings:{finish:d.columnFinish,hingeSide:'left',doorOpen:false},placement:{wall:0,u:125+Math.max(d.width,selectedMirror?.width||0)/2+24,height:28}});
 if(d.mirror){const mirror=C.mirrors.find(m=>m.id===d.mirror),size=mirror.sizes[d.mirrorSize];items.push({id:'guided-mirror',type:'mirror',settings:{mirrorModel:d.mirror,width:size.width,height:size.height,mirrorFinish:d.mirrorFinish,led:d.mirror==='zen'||d.mirror==='ilse'||d.mirror==='capsule'},placement:{wall:0,u:125,height:Math.max(109,m.height+(m.id==='three'?0:28)+2+(d.top==='neris'?14:d.top==='torne'?12:0)+10)+size.height/2}});}
 return {version:2,title:'Ma composition STUDIO ONE',room:{points:[[0,0],[450,0],[450,450],[0,450]],height:260,partitions:[]},floor:{collection:'Creta',color:'caramello',groutColor:'Gris clair'},walls:Array.from({length:4},()=>({collection:'Peinture',color:'white'})),lighting:'day',brightness:100,items};
}
