import {PRODUCTS,topSelection} from './anima-data.js';
const modules=PRODUCTS.filter(p=>p.category==='module');
const formatId=p=>p.subtype==='column'?p.facade.toLowerCase()+'-column':p.subtype==='wall'?p.facade.toLowerCase()+'-wall':p.subtype==='vanity'?(p.drawers===2?(p.facade==='PURA'?'two':'ribelle-two'):p.facade.toLowerCase()+'-'+(p.drawers?'one':'doors')):p.facade.toLowerCase()+'-base-'+(p.drawers===2?'two':p.drawers===1?'one':p.doors===2?'doors':'door');
const groups=new Map();
for(const p of modules.filter(p=>p.subtype!=='column')){
  const id=formatId(p);let group=groups.get(id);
  if(!group){group={id,name:(p.facade==='PURA'?'Pura':'Ribelle')+' · '+({vanity:'Sous-vasque',base:'Meuble bas',wall:'Meuble haut'}[p.subtype])+' · '+(p.drawers?p.drawers+' tiroir'+(p.drawers>1?'s':''):p.doors+' porte'+(p.doors>1?'s':'')),height:p.height/100,depth:p.depth/100,drawers:p.drawers||p.doors,trueDrawers:p.drawers,doors:p.doors,opening:p.doors?'doors':'drawers',base:p.subtype==='wall'?1.10:p.height===26?.56:.30,reference:p.ref,subtype:p.subtype,facade:p.facade,allowedWidths:[],productsByWidth:{}};groups.set(id,group);}
  group.allowedWidths.push(p.width);group.productsByWidth[p.width]=p;
}
export const CABINET_FORMATS=Object.freeze([...groups.values()].map(g=>Object.freeze({...g,allowedWidths:Object.freeze(g.allowedWidths.sort((a,b)=>a-b)),productsByWidth:Object.freeze(g.productsByWidth)})));
export const WIDTH_RANGE=Object.freeze({min:40,max:120,step:20});
export const WIDTH_PRESETS=Object.freeze([40,60,80,100,120]);
export const DRAWER_TRAVEL=Object.freeze([.200,.315]);
export const SELLA_REFS=Object.freeze({});
export const BRIGHTNESS_RANGE=Object.freeze({min:40,max:180,default:100});
export function cabinetFormat(id='two'){const f=CABINET_FORMATS.find(f=>f.id===id);if(!f)throw Error('Format Neobath Anima inconnu : '+id);return f;}
export function validWidth(cm,format){return Number.isInteger(cm)&&(format?cabinetFormat(format).allowedWidths:WIDTH_PRESETS).includes(cm);}
export function topAvailable(mode,cm,format,topSpan=cm){if(!validWidth(cm,format))return false;if(mode==='bare')return true;if(format&&cabinetFormat(format).subtype==='wall')return false;return !!topSelection(mode,cm,format,'center',topSpan);}
export function cabinetProduct(format,width){return cabinetFormat(format).productsByWidth[width]||null;}
export function cabinetHeightLabel(format){const f=typeof format==='string'?cabinetFormat(format):format;return 'H '+(f.height*100).toLocaleString('fr-FR')+' cm · P '+(f.depth*100).toLocaleString('fr-FR')+' cm';}
export const drawerTravel=(index,count)=>count===1?.315:index===0?.200:index===count-1?.315:.26;
export function animaCabinetDimensions(settings={}){const f=cabinetFormat(settings.format),selection=topSelection(settings.top,settings.width||80,settings.format,settings.basinLayout,settings.topSpan||settings.width,settings.topPlanId,settings.topLength,settings);return {width:(settings.width||80)/100,height:f.height+(selection?.top?.height||0)/100+(selection?.basin?.subtype==='countertop'?(selection.basin.height||14)/100:0),depth:Math.max(f.depth,(selection?.previewDepth||selection?.top?.depth||0)/100),base:f.base};}
export function animaColumnDimensions(settings={}){const p=modules.find(p=>p.subtype==='column'&&p.facade===(settings.columnModel==='ribelle-column'||settings.facade==='RIBELLE'?'RIBELLE':'PURA'));return {width:p.width/100,height:p.height/100,depth:p.depth/100,base:.30};}
