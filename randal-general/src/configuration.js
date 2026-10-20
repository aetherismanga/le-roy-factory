import {CATALOG as C} from './commerce/catalog.js';
export const WIDTH_RANGE=Object.freeze({min:40,max:140,step:1});
export const WIDTH_PRESETS=Object.freeze([40,60,70,79,80,90,100,120,140]);
export const DRAWER_TRAVEL=Object.freeze([.2,.315]);
export const SELLA_REFS=Object.freeze({60:'2215',70:'2808',80:'2171',90:'13237',100:'3279',120:'2809'});
export const CABINET_FORMATS=Object.freeze(C.models.map(m=>({...m,height:m.height/100,depth:m.depth/100,base:m.base/100,legHeight:m.legHeight/100,reference:Object.values(m.refs[m.widths[0]])[0]})));
export const cabinetFormat=id=>CABINET_FORMATS.find(m=>m.id===id)||CABINET_FORMATS[0];
export const columnFormat=id=>C.columns.find(m=>m.id===id)||C.columns[0];
export const formatsFor=id=>CABINET_FORMATS.filter(m=>m.collection===cabinetFormat(id).collection);
export function validWidth(cm,format){return Number.isInteger(cm)&&(format?cabinetFormat(format).widths.includes(cm):WIDTH_PRESETS.includes(cm));}
export function topAvailable(mode,cm,format){
 if(!validWidth(cm,format))return false;
 const m=format?cabinetFormat(format):null;
 if(m?.collection==='less')return mode==='compact';
 if(m?.counter)return ['plain','neris','torne'].includes(mode);
 if(mode==='none')return true;
 const w=cm===79?80:cm;
 if(['sella','tampa'].includes(mode))return !(m?.collection==='luce'&&mode==='sella')&&!(cm===140&&mode==='sella')&&!!C.inset[mode]?.gloss?.[w];
 return ['plain','neris','torne'].includes(mode)&&C.topFinishes.some(f=>f.refs[cm]);
}
export const finishesFor=(format,type='cabinet')=>{const m=type==='column'?columnFormat(format):cabinetFormat(format);return C.finishes.filter(f=>m.finishes.includes(f.id));};
export const defaultTop=format=>cabinetFormat(format).collection==='less'?'compact':cabinetFormat(format).counter?'neris':cabinetFormat(format).collection==='luce'||cabinetFormat(format).collection==='brent'?'tampa':'sella';
export const BRIGHTNESS_RANGE=Object.freeze({min:40,max:180,default:100});
export const drawerTravel=(index,count)=>count===1?.315:index===0?.2:index===count-1?.315:.26;
