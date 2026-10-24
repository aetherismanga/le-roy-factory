// RANDAL V04 p. 38, cross-checked with the supplied PRO HT / -50 % sheet.
// Public TTC only, in cents. Pro HT × 2 × 1.20 matches every PDF public price.
// Left-offset versions are documented; no unverified right-offset reference.
export const BASIN_LAYOUT_NAMES=Object.freeze({center:'Vasque centrée',offset:'Vasque décentrée à gauche',double:'Double vasque'});
const rows=(values)=>Object.fromEntries(values.map(([width,ref,ttc])=>[width,{ref,ttc}]));
const tampaMatte={
 center:rows([[60,'13039',24360],[70,'13040',31680],[80,'13041',31680],[90,'13042',37920],[100,'13043',39840],[120,'13044',57000]]),
 offset:rows([[80,'13550',46080],[90,'13551',49800],[100,'13046',51240],[120,'13047',64680]])
};
export const INTEGRATED_BASINS=Object.freeze({
 sella:{gloss:{
  center:rows([[60,'2215',13800],[70,'2808',15600],[80,'2171',16320],[90,'13237',19800],[100,'3279',21120]]),
  offset:rows([[80,'6205',23040],[90,'13547',30000],[100,'6207',35160],[120,'6389',46200]]),
  double:rows([[120,'2809',38160]])
 }},
 tampa:{
  gloss:{
   center:rows([[60,'6227',14640],[70,'7781',16560],[80,'6228',17040],[90,'7782',20760],[100,'6229',23040],[120,'6232',33480]]),
   offset:rows([[80,'7865',24120],[90,'7463',33840],[100,'6231',36480],[120,'6234',49320]]),
   double:rows([[120,'6235',38760],[140,'6236',80760]])
  },
  matte:{...tampaMatte,double:rows([[120,'13045',59880],[140,'13000',108240]])},
  black:{...tampaMatte,double:rows([[120,'13045',59880]])}
 }
});
export function integratedOptions(kind,width,color='gloss'){
 const w=width===79?80:width;
 return Object.entries(INTEGRATED_BASINS[kind]?.[color]||{}).flatMap(([layout,sizes])=>sizes[w]?[{...sizes[w],layout,name:BASIN_LAYOUT_NAMES[layout],width:w,color}]:[]);
}
export function basinCenters(layout,width){return layout==='double'?[-width/4,width/4]:layout==='offset'?[-Math.max(0,(width-.6)/2)]:[0];}
