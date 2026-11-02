import {topSelection,PRODUCT_BY_ID,TOP_OPTIONS,INTEGRATED_TOP_IDS,VESSEL_TOP_IDS,isIntegratedTop,isVesselTop} from './anima-data.js';
export {topSelection,INTEGRATED_TOP_IDS,VESSEL_TOP_IDS,isIntegratedTop,isVesselTop};
export const BASIN_LAYOUT_NAMES=Object.freeze({center:'Centrée',left:'Décalée à gauche',right:'Décalée à droite',offset:'Décalée',double:'Double vasque'});
const describe=(p,key)=>p?.prices?.find(v=>v.key===key);
function appearance(p,entry){const key=entry.key,label=entry.label||key;return {id:key,name:label,hex:/black|noir/i.test(key+' '+label)?'#292c2a':/anthracite/i.test(key+' '+label)?'#555854':'#f6f5f1',roughness:/gloss|brillant/i.test(key+' '+label)?.14:.56,clearcoat:/gloss|brillant/i.test(key+' '+label)?.8:0,reference:p.ref,source:p.source};}
export const INSET_COLORS=Object.freeze([{id:'white-gloss',name:'Blanc brillant',hex:'#f6f5f1',roughness:.14,clearcoat:.8},{id:'white-matte',name:'Blanc mat',hex:'#f6f5f1',roughness:.56,clearcoat:0},{id:'black-matte',name:'Noir mat',hex:'#292c2a',roughness:.6,clearcoat:0}]);
export const VESSEL_COLORS=INSET_COLORS;
export const TAMPA_REFS=Object.freeze({});
export function basinLayouts(top,width,format,color,span=width){const s=topSelection(top,width,format,'center',span);if(!s||!s.positions.length)return[];const p=s.basin||s.top,entry=describe(p,color)||p.prices?.[0];if(color&&p.prices?.length&&!describe(p,color))return[];return [{layout:s.layout,ref:p.ref||null,color:entry?.key||'standard',ttc:entry?.price==null?null:Math.round(entry.price*120),width:s.topWidth,positions:s.positions,product:p,top:s.top,basin:s.basin}];}
export function resolveBasinLayout(top,width,format,layout,span=width){const options=basinLayouts(top,width,format,undefined,span);return options.find(o=>o.layout===layout)?.layout||options[0]?.layout||null;}
export function basinEntry(top,color,width,format,layout,span=width){return basinLayouts(top,width,format,color,span).find(o=>!layout||o.layout===layout)||null;}
export function basinColors(top,width=80,format,layout,span=width){const s=topSelection(top,width,format,layout,span);if(!s||!s.positions.length)return[];const p=s.basin||s.top;return (p.prices||[]).map(e=>appearance(p,e));}
export function basinReference(top,color,width=80,format,layout,span=width){return basinEntry(top,color,width,format,layout,span)?.ref||null;}
