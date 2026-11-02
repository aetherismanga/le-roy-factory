// Serializable manufacturer surface choices. This module is deliberately free
// of Three.js so project validation and pricing use the same source catalogue.
import {MATERIAL_FAMILIES,MANUFACTURER_SURFACES} from './materials-data.js';
import {topSelection} from './anima-data.js';
export {MATERIAL_FAMILIES,MANUFACTURER_SURFACES};
export const SURFACE_BY_ID=new Map(MANUFACTURER_SURFACES.map(surface=>[surface.id,surface]));

export function surfaceFamilyForSelection(selection){
 const top=selection?.top;if(!top)return null;
 const ref=String(top.ref||top.id||'').toUpperCase();
 if(/^TFX/.test(ref))return 'fenix';
 if(/^THPL/.test(ref))return 'hpl';
 if(/^TGRS/.test(ref))return 'gres';
 if(/^TXT/.test(ref))return 'geacril-stone';
 if(/^TPGEA/.test(ref)||top.material==='geacril')return 'geacril';
 return top.subtype==='cover'?'furniture':null;
}
export function settingsTopSelection(settings={}){return topSelection(settings.top,settings.width,settings.format,settings.basinLayout,settings.topSpan||settings.width,settings.topPlanId,settings.topLength);}
export function surfaceOptions(settings={},selection=settingsTopSelection(settings)){
 const family=surfaceFamilyForSelection(selection);
 return MANUFACTURER_SURFACES.filter(surface=>surface.family===family);
}
export const normalizeNcsCode=value=>String(value||'').toUpperCase().trim().replace(/\s+/g,' ').slice(0,40);
export function normalizeTopSurface(settings={},selection=settingsTopSelection(settings)){
 const family=surfaceFamilyForSelection(selection),options=surfaceOptions(settings,selection);
 if(!options.length)return null;
 const selected=SURFACE_BY_ID.get(settings.topSurfaceId),byPrice=options.find(surface=>surface.priceKey===settings.basinColor);
 const surface=selected?.family===family?selected:byPrice||options[0];
 const ncsCode=surface.customNcs?normalizeNcsCode(settings.topSurfaceNcs):'';
 const prices=selection?.top?.prices||[],priceKey=surface.priceKey||(/ncs/i.test(surface.id)?prices.find(price=>/ncs/i.test(price.key))?.key:null)||prices.find(price=>price.key===settings.basinColor)?.key||prices[0]?.key||null;
 return {id:surface.id,family,surface,ncsCode,priceKey};
}
