import CATALOGUE from '../catalogue.json' with {type:'json'};
import {animaWellProfile} from './top-profiles.js';
import {MATERIAL_FAMILIES} from './materials-data.js';

export {CATALOGUE};
export const PRODUCTS=CATALOGUE.products;
export const PRODUCT_BY_ID=new Map(PRODUCTS.map(p=>[p.id,p]));
export const PRODUCT_BY_REF=new Map(PRODUCTS.filter(p=>p.ref).map(p=>[p.ref,p]));
export const FINISH_IDS=CATALOGUE.finishes.map(f=>f.id);
export const TOP_PRODUCTS=PRODUCTS.filter(p=>p.category==='worktop');
export const BASIN_PRODUCTS=PRODUCTS.filter(p=>p.category==='basin');
export const INTEGRATED_TOP_IDS=Object.freeze([...TOP_PRODUCTS.filter(p=>p.subtype==='integrated').map(p=>p.id),...BASIN_PRODUCTS.filter(p=>p.subtype==='integrated').map(p=>p.id)]);
export const VESSEL_TOP_IDS=Object.freeze(BASIN_PRODUCTS.filter(p=>p.subtype==='countertop').map(p=>p.id));
export const isIntegratedTop=id=>INTEGRATED_TOP_IDS.includes(id);
export const isVesselTop=id=>VESSEL_TOP_IDS.includes(id);
export const isAnimaIntegratedTop=isIntegratedTop;
export const isAnimaVesselTop=isVesselTop;
export const firstPriceKey=p=>p?.prices?.[0]?.key||'standard';
export function productFitsWidth(p,width){
  if(!p||!Number.isFinite(width))return false;
  if(p.compatibleWidths?.length&&!p.compatibleWidths.includes(width))return false;
  if(p.configurableWidth&&(width<(p.minWidth||1)||width>(p.maxWidth||600)))return false;
  if(p.minCompositionWidth&&width<p.minCompositionWidth)return false;
  return true;
}
export function topSelection(mode,width=80,format='two',layout='center',topSpan=width,topPlanId,topLength){
  const span=Number.isFinite(topSpan)&&topSpan>=width?topSpan:width;
  const length=topLength??span;
  if(!Number.isFinite(length)||length<span)return null;
  if(mode==='bare'||!mode)return {mode:'bare',top:null,basin:null,product:null,topWidth:0,billingLength:0,integrated:false,positions:[]};
  let product=PRODUCT_BY_ID.get(mode),top=null,basin=null;
  if(mode==='plain')product=TOP_PRODUCTS.find(p=>p.subtype==='cover'&&p.compatibleWidths?.includes(width))||PRODUCT_BY_ID.get('tpgea12-linear-top');
  if(!product)return null;
  if(product.category==='worktop'){
    if(topPlanId&&topPlanId!==product.id)return null;
    top=product;
  }
  else if(product.category==='basin'){
    basin=product;
    const choices=(product.compatibleTopIds||[]).map(id=>PRODUCT_BY_ID.get(id)).filter(Boolean);
    top=topPlanId?choices.find(p=>p.id===topPlanId&&productFitsWidth(p,length)):choices.find(p=>productFitsWidth(p,length))||(!choices.length?PRODUCT_BY_ID.get('tpgea12-linear-top'):null);
  }
  if(!top||!productFitsWidth(top,top.configurableWidth?length:span)||!top.configurableWidth&&length!==span||basin&&!productFitsWidth(basin,length))return null;
  const notVanity=String(format).includes('-base-')||String(format).endsWith('-wall');
  if(notVanity&&(top.requiresVanity||basin?.requiresVanity||top.subtype==='integrated'||basin?.subtype==='integrated'))return null;
  if(basin&&basin.width&&basin.width>length-.2)return null;
  const finishedWidth=top.width||length,integrated=top.subtype==='integrated'||basin?.subtype==='integrated';
  if(basin&&(basin.subtype==='integrated'&&!top.integratedBasinAllowed||basin.subtype!=='integrated'&&!top.countertopBasinAllowed))return null;
  const count=Number(basin?.basinCount||top.basinCount||1),position=basin&&count===1&&top.configurableWidth&&['left','center','right'].includes(layout)?layout:top.basinPosition||'center';
  const W=finishedWidth/100,well=animaWellProfile(top,basin,W/count),customOffset=Math.min(W*.22,Math.max(0,(W-well.w)/2-.025));
  const positions=count===2?[-W/4,W/4]:[position==='left'?-customOffset:position==='right'?customOffset:0];
  if(basin&&positions.some(position=>Math.abs(position)*100+(basin.width||0)/2>finishedWidth/2-2.5))return null;
  const family=/^TFX/.test(top.ref||'')?'fenix':/^THPL/.test(top.ref||'')?'hpl':/^TGRS/.test(top.ref||'')?'gres':/^TXT/.test(top.ref||'')?'geacril-stone':/^TPGEA/.test(top.ref||'')?'geacril':null;
  const reference=MATERIAL_FAMILIES.find(entry=>entry.id===family);
  return {mode,top,basin,product,topWidth:finishedWidth,billingLength:top.billingLength||length,integrated,topSpan:span,topLength:length,previewDepth:top.depth??reference?.referenceDepth??46.2,previewDepthNote:top.depth?null:reference?.referenceDepthNote||'Profondeur d’implantation à confirmer avant fabrication.',
    positions:mode==='plain'||top.subtype==='cover'||top.subtype==='linear'&&!basin?[]:positions,reference:product.ref||null,format,layout:count===2?'double':position==='left'?'left':position==='right'?'right':'center'};
}
export const TOP_OPTIONS=Object.freeze([
  {id:'bare',name:'Meuble seul — sans plan',description:'Caisson Anima seul',category:'bare',reference:null},
  ...TOP_PRODUCTS.map(p=>({id:p.id,name:p.label+(p.configurableWidth?' · H '+p.height+' cm':' · '+p.width+' cm'),description:(p.ref||'Référence à confirmer')+' · H '+p.height+' cm',category:p.subtype==='integrated'?'integrated':'cover',reference:p.ref,productIds:[p.id],product:p})),
  ...BASIN_PRODUCTS.map(p=>({id:p.id,name:(p.subtype==='countertop'?'Plan + ':'Plan avec ')+p.label,description:(p.ref||'Référence à confirmer')+' · '+(p.width||'Sur mesure')+' × '+(p.depth||'')+' cm',category:p.subtype==='countertop'?'countertop':'integrated',reference:p.ref,productIds:[p.id],product:p}))
]);
