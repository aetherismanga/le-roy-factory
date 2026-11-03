import {topSelection,PRODUCT_BY_ID,TOP_OPTIONS,INTEGRATED_TOP_IDS,VESSEL_TOP_IDS,isIntegratedTop,isVesselTop} from './anima-data.js';
import {OCRITECH_REFERENCE_FINISHES} from './materials-data.js';
export {topSelection,INTEGRATED_TOP_IDS,VESSEL_TOP_IDS,isIntegratedTop,isVesselTop};
export const BASIN_LAYOUT_NAMES=Object.freeze({center:'Centrée',left:'Décalée à gauche',right:'Décalée à droite',offset:'Décalée',double:'Double vasque'});
const describe=(p,key)=>p?.prices?.find(v=>v.key===key);
export const ECLISSE_VISUAL_COLOURS=Object.freeze({
 'fume-matte':{hex:'#b5bcb8',roughness:.23,clearcoat:.18,transmission:.82,thickness:.006,attenuationDistance:.24},
 'bronze-matte':{hex:'#c0a58b',roughness:.23,clearcoat:.18,transmission:.80,thickness:.006,attenuationDistance:.24}
});
function appearance(p,entry){
 const key=entry.key,label=entry.label||key,gloss=/gloss|brillant/i.test(key+' '+label);
 const base={id:key,name:label,hex:/black|noir/i.test(key+' '+label)?'#292c2a':/anthracite/i.test(key+' '+label)?'#555854':'#f6f5f1',roughness:gloss?.14:.56,clearcoat:gloss?.8:0,transmission:0,opacity:1,reference:p.ref,source:p.source};
 if(!/^ECLISSE/.test(p.ref||'')||!ECLISSE_VISUAL_COLOURS[key])return base;
 const reference=OCRITECH_REFERENCE_FINISHES.find(finish=>finish.priceKey===key||finish.id===key);
 return {...base,...ECLISSE_VISUAL_COLOURS[key],swatchHex:reference.hex,attenuationColor:reference.hex,swatch:reference.swatch,ior:1.49,colorAccuracy:'visual-approximation',colorNote:'Rendu indicatif : référence générique de matière Ocritech, non calibrée pour Neobath.',colorSource:{kind:'visual-approximation',material:'Ocritech Fumé / Bronze',catalogue:p.source,reference:reference.source,rendering:'transmissive-resin-neutral-base-with-coloured-absorption'}};
}
export const INSET_COLORS=Object.freeze([{id:'white-gloss',name:'Blanc brillant',hex:'#f6f5f1',roughness:.14,clearcoat:.8},{id:'white-matte',name:'Blanc mat',hex:'#f6f5f1',roughness:.56,clearcoat:0},{id:'black-matte',name:'Noir mat',hex:'#292c2a',roughness:.6,clearcoat:0}]);
export const VESSEL_COLORS=INSET_COLORS;
export const TAMPA_REFS=Object.freeze({});
export function basinLayouts(top,width,format,color,span=width,topPlanId,topLength,options={}){const initial=topSelection(top,width,format,'center',span,topPlanId,topLength,options);if(!initial||!initial.positions.length)return[];const p=initial.basin||initial.top,entry=describe(p,color)||p.prices?.[0];if(color&&p.prices?.length&&!describe(p,color))return[];const layouts=initial.basin&&initial.top.configurableWidth&&Number(p.basinCount||1)===1?['center','left','right']:[initial.layout];const seen=new Set();return layouts.flatMap(layout=>{const s=topSelection(top,width,format,layout,span,topPlanId,topLength,options);if(!s||seen.has(s.positions.join('|')))return [];seen.add(s.positions.join('|'));return s?[{layout:s.layout,name:BASIN_LAYOUT_NAMES[s.layout],ref:p.ref||null,color:entry?.key||'standard',ttc:entry?.price==null?null:Math.round(entry.price*120),width:s.topWidth,positions:s.positions,product:p,top:s.top,basin:s.basin}]:[];});}
export function resolveBasinLayout(top,width,format,layout,span=width,topPlanId,topLength,options={}){const choices=basinLayouts(top,width,format,undefined,span,topPlanId,topLength,options);return choices.find(o=>o.layout===layout)?.layout||choices[0]?.layout||null;}
export function basinEntry(top,color,width,format,layout,span=width,topPlanId,topLength,options={}){return basinLayouts(top,width,format,color,span,topPlanId,topLength,options).find(o=>!layout||o.layout===layout)||null;}
export function basinColors(top,width=80,format,layout,span=width,topPlanId,topLength,options={}){const s=topSelection(top,width,format,layout,span,topPlanId,topLength,options);if(!s||!s.positions.length)return[];const p=s.basin||s.top;return (p.prices||[]).map(e=>appearance(p,e));}
export function basinReference(top,color,width=80,format,layout,span=width,topPlanId,topLength,options={}){return basinEntry(top,color,width,format,layout,span,topPlanId,topLength,options)?.ref||null;}
