export const WIDTH_RANGE=Object.freeze({min:40,max:120,step:1});
export const WIDTH_PRESETS=Object.freeze([60,70,80,90,100,120]);
export const DRAWER_TRAVEL=Object.freeze([.200,.315]);
export const SELLA_REFS=Object.freeze({60:'2215',70:'2808',80:'2171',90:'13237',100:'3279',120:'6389'});
export function validWidth(cm){return Number.isInteger(cm)&&cm>=WIDTH_RANGE.min&&cm<=WIDTH_RANGE.max;}
export function topAvailable(mode,cm){if(!validWidth(cm))return false;if((mode==='sella'||mode==='tampa'))return Object.hasOwn(SELLA_REFS,cm);if(mode==='neris')return cm>=50;return mode==='bare'||mode==='plain'||mode==='torne';}
export const BRIGHTNESS_RANGE=Object.freeze({min:40,max:180,default:100});

export const CABINET_FORMATS=Object.freeze([
 {id:'two',name:'2 tiroirs',height:.54,drawers:2,base:.28,reference:'13692'},
 {id:'three',name:'3 tiroirs',height:.91,drawers:3,base:0,reference:'13693'},
 {id:'one-xl',name:'1 tiroir XL',height:.375,drawers:1,base:.28,reference:'13691'},
 {id:'two-xl',name:'2 tiroirs XL',height:.75,drawers:2,base:.28,reference:'14176'}
]);
export const cabinetFormat=id=>CABINET_FORMATS.find(f=>f.id===id)||CABINET_FORMATS[0];
export const drawerTravel=(index,count)=>count===1?.315:index===0?.200:index===count-1?.315:.26;
