import {cabinetFormat} from './configuration.js';
import {integratedOptions,BASIN_LAYOUT_NAMES} from './integrated-basins.js';
export {BASIN_LAYOUT_NAMES};
// RANDAL V04 catalogue, pp. 38 and 41. Colour chips are catalogue references,
// not spectrophotometric measurements; PBR roughness is a rendering estimate.
export const TAMPA_REFS=Object.freeze({gloss:{60:'6227',70:'7781',80:'6228',90:'7782',100:'6229',120:'6232'},matte:{60:'13039',70:'13040',80:'13041',90:'13042',100:'13043',120:'13044'}});
const gloss={id:'gloss',name:'Blanc brillant',hex:'#f6f5f1',roughness:.14,clearcoat:.8};
const matte={id:'matte',name:'Blanc mat',hex:'#ffffff',roughness:.62,clearcoat:0};
const black={id:'black',name:'Noir mat',hex:'#403f41',roughness:.65,clearcoat:0};
export const INSET_COLORS=Object.freeze([gloss,matte,black]);
export const VESSEL_COLORS=Object.freeze([
 {...gloss,neris:'9567',torne:'9559'},
 {id:'pure',name:'Blanc pur',hex:'#ffffff',roughness:.60,clearcoat:0,neris:'9560',torne:'9552'},
 {id:'anthracite',name:'Anthracite',hex:'#808285',roughness:.62,clearcoat:0,neris:'9564',torne:'9556'},
 {...black,neris:'11371',torne:'10444'},
 {id:'taupe',name:'Taupe',hex:'#a39686',roughness:.62,clearcoat:0,neris:'9561',torne:'9553'},
 {id:'namibie',name:'Vert Namibie',hex:'#6d6e5c',roughness:.62,clearcoat:0,neris:'9562',torne:'9554'},
 {id:'ivory',name:'Blanc ivoire',hex:'#e6e5da',roughness:.62,clearcoat:0,neris:'9563',torne:'9555'},
 {id:'pink',name:'Rose Nadir',hex:'#c2a597',roughness:.62,clearcoat:0,neris:'9566',torne:'9558'},
 {id:'blue',name:'Bleu Kivu',hex:'#012f53',roughness:.62,clearcoat:0,neris:'9565',torne:'9557'}
]);
export function basinLayouts(top,width,format,color='gloss'){
 const form=cabinetFormat(format),w=width===79?80:width;
 let options=integratedOptions(top,w,color);
  return options;
}
export function resolveBasinLayout(top,width,format,layout){
 const options=basinLayouts(top,width,format);if(!options.length)return null;
 if(options.some(o=>o.layout===layout))return layout;
 const preferred=width===120&&top==='sella'?'offset':'center';
 return options.find(o=>o.layout===preferred)?.layout||options[0].layout;
}
export function basinEntry(top,color,width,format,layout){
 const actual=layout??resolveBasinLayout(top,width,format);
 return basinLayouts(top,width,format,color).find(o=>o.layout===actual)||null;
}
export function basinColors(top,width,format,layout){
 if(top==='sella'||top==='tampa')return INSET_COLORS.filter(c=>!width?top==='tampa'||c.id==='gloss':!!basinEntry(top,c.id,width,format,layout));
 return top==='neris'||top==='torne'?VESSEL_COLORS:[];
}
export function basinReference(top,color,width,format,layout){return ['sella','tampa'].includes(top)?basinEntry(top,color,width,format,layout)?.ref:VESSEL_COLORS.find(c=>c.id===color)?.[top];}
