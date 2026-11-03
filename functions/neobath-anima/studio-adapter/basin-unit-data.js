import {BASIN_PRODUCTS,PRODUCT_BY_ID,topSelection,firstPriceKey} from './anima-data.js';
import {resolveBasinAccessories} from './basin-accessories.js';
import {normalizeNcsCode} from './premium-materials.js';
import {animaWellProfile} from './top-profiles.js';

// These articles are manufactured vessels, not a hole cut into a slab.
// Integrated custom bowls continue to require an actual compatible plan.
export const BASIN_UNITS=Object.freeze(BASIN_PRODUCTS.filter(product=>['countertop','semi-recessed'].includes(product.subtype)));
export const DEFAULT_BASIN_UNIT=BASIN_UNITS.find(product=>product.ref==='ECLISSE116')?.id||BASIN_UNITS[0]?.id;
export function normalizeBasinUnitSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Configuration de vasque invalide.');
 const product=PRODUCT_BY_ID.get(input.basinProductId||DEFAULT_BASIN_UNIT);
 if(!BASIN_UNITS.includes(product))throw Error('Cette cuve doit être intégrée à un plan compatible.');
 const key=input.basinPriceKey||input.basinColor||firstPriceKey(product);
 if(typeof key!=='string'||!product.prices?.some(entry=>entry.key===key))throw Error('Finition de vasque Anima inconnue.');
 const ncsCode=normalizeNcsCode(input.ncsCode);if(/ncs/i.test(key)&&! /^(?:S\s*)?\d{4}-(?:[YRGB](?:\d{2}[YRGB])?|N)$/i.test(ncsCode))throw Error('Renseignez un code NCS complet pour cette vasque.');
 const settings={...(/ncs/i.test(key)?{ncsCode}:{}),basinProductId:product.id,basinColor:key,basinPriceKey:key,basinBottom:input.basinBottom||'none',basinSupport:input.basinSupport===true};
 if(input.basinSupport!==undefined&&typeof input.basinSupport!=='boolean')throw Error('Support de fond de vasque invalide.');
 resolveBasinAccessories(product,settings);return settings;
}
// Used only as a geometry construction frame. No plan scene object, SKU or
// quote line is created by a basin unit.
export function basinUnitSelection(input={}){
 const settings=normalizeBasinUnitSettings(input),basin=PRODUCT_BY_ID.get(settings.basinProductId);
 for(const planId of basin.compatibleTopIds||[]){
  const plan=PRODUCT_BY_ID.get(planId);if(!plan)continue;
  const width=Math.max(80,Math.ceil((basin.width||50)+10),basin.minCompositionWidth||0,plan.minWidth||0);
  const selection=topSelection(basin.id,width,'worktop','center',width,plan.id,width,{...settings,standalone:true});
  if(selection)return {...selection,settings,constructionWidth:width};
 }
 throw Error('Géométrie de vasque Anima indisponible.');
}
export function basinUnitDimensions(input={}){
 const selection=basinUnitSelection(input),product=selection.basin,profile=animaWellProfile(selection.top,product,selection.constructionWidth/100);
 return {width:(product.width||profile.w*100)/100,depth:(product.depth||profile.d*100)/100,height:(product.height||14)/100,base:0};
}
export function basinUnitConstructionSettings(input={}){
 const selection=basinUnitSelection(input),s=selection.settings;
 return {...s,format:'worktop',width:selection.constructionWidth,top:s.basinProductId,topPlanId:selection.top.id,topSpan:selection.constructionWidth,topLength:selection.constructionWidth,topOffset:0,topShift:0,basinLayout:'center'};
}
