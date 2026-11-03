import {PRODUCT_VISUALS as studioVisuals,productVisual as studioProductVisual} from '@studio-one-original/catalogue-product-visuals.js';
import {PRODUCTS} from './anima-data.js';
import {cabinetFormat} from './configuration.js';
import {columnProduct} from './column-data.js';
import VISUALS from '../../../assets/data/neobath-anima-visuals.json' with {type:'json'};
const visuals=()=>globalThis.NEOBATH_ANIMA_VISUALS||VISUALS;
export const animaProductPhoto=p=>{const v=visuals().products?.[p?.id];const src=typeof v==='string'?v:v?.image;return src?{src,alt:'NEOBATH ANIMA · '+p.label+(p.ref?' · '+p.ref:''),width:v.width||242,height:v.height||167,kind:'manufacturer-photograph',provenance:'Visuel du catalogue NEOBATH ANIMA',depictsCompleteComposition:!!p.configurableWidth}:null;};
const photo=animaProductPhoto;
export function productVisual(type,settings={}){
 if(type==='cabinet'){const form=cabinetFormat(settings.format||'two');return photo(form.productsByWidth[settings.width||80]||Object.values(form.productsByWidth)[0]);}
 if(type==='column')return photo(columnProduct(settings));
 if(type==='mirror')return photo(PRODUCTS.find(p=>p.category==='mirror'&&p.id===settings.mirrorModel)||PRODUCTS.find(p=>p.category==='mirror'));
 if(type==='basin-unit')return photo(PRODUCTS.find(p=>p.id===settings.basinProductId)||PRODUCTS.find(p=>p.category==='basin'&&p.ref==='ECLISSE116'));
 if(type==='worktop'||type==='basin')return photo(PRODUCTS.find(p=>p.id===(type==='worktop'?settings.topPlanId||settings.top:settings.top)));
 return studioProductVisual(type,settings);
}
export const PRODUCT_VISUALS={...studioVisuals,cabinet:productVisual('cabinet'),column:productVisual('column'),mirror:productVisual('mirror')};
