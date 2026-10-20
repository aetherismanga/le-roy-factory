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
export function basinColors(top){return top==='sella'?INSET_COLORS.slice(0,1):top==='tampa'?INSET_COLORS.slice(0,1):top==='neris'||top==='torne'?VESSEL_COLORS:[];}
export function basinReference(top,color,width){if(top==='tampa')return TAMPA_REFS[color==='gloss'?'gloss':'matte'][width];return VESSEL_COLORS.find(c=>c.id===color)?.[top];}
