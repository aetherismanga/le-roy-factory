import {columnModelId,columnName} from '../column-data.js';
import {CABINET_FORMATS} from '../configuration.js';
import {CATALOGUE} from '../anima-data.js';
import VISUALS from '../../../../assets/data/neobath-anima-visuals.json' with {type:'json'};
export {TOP_OPTIONS,topSelection} from '../anima-data.js';

const raw = globalThis.NEOBATH_ANIMA_CATALOGUE || CATALOGUE;
const visuals = globalThis.NEOBATH_ANIMA_VISUALS || VISUALS;
const absolute = value => value ? new URL(value, 'https://leroyfactory.fr/').href : '';
export const RAW_CATALOGUE = raw;
export const PRODUCTS = new Map(raw.products.map(p => [p.id,p]));
export const publicPrice = (product, key, width) => {
  if (!product) return null;
  const option = product.prices?.find(p => p.key === key) || (!key ? product.prices?.[0] : null);
  let price = option?.price ?? (!product.prices?.length ? product.pricePublicHT : null);
  if (typeof price !== 'number' || !Number.isFinite(price)) return null;
  if (['cm','cml','linear-cm'].includes(product.unit)) {
    if (!Number.isFinite(width)) return null;
    price *= width;
  } else if (['m','ml','linear-metre'].includes(product.unit)) {
    if (!Number.isFinite(width)) return null;
    price *= width / 100;
  }
  return Math.round(price * 120);
};
export function productImage(product) {
  if (!product) return '';
  const entry = visuals.products?.[product.id] || visuals.products?.[product.ref];
  return absolute(typeof entry === 'string' ? entry : entry?.image || entry?.photo || product.image);
}
function moduleMatches(product, form) {
  const facade = String(form.facade || (form.id.includes('ribelle') ? 'ribelle' : 'pura')).toUpperCase();
  const subtype = form.subtype || 'vanity';
  const doors = form.doors || 0;
  const drawers = form.trueDrawers ?? (doors ? 0 : form.drawers);
  return product.category === 'module' && product.facade === facade && product.subtype === subtype && product.drawers === drawers && product.doors === doors && product.height === Math.round(form.height * 100);
}
export function createAnimaCommerceCatalogue(source = raw) {
  const columns = source.products.filter(p => p.category === 'module' && ['column','wall'].includes(p.subtype)).sort((a,b)=>b.height-a.height||a.facade.localeCompare(b.facade)).map(p => ({...p,id:columnModelId(p),productId:p.id,name:columnName(p),ttc:publicPrice(p),image:productImage(p)}));
  const models = CABINET_FORMATS.map(form => {
    const products = source.products.filter(p => moduleMatches(p,form));
    const byWidth = Object.fromEntries(products.map(p => [p.width,p]));
    const example = products.find(p => p.width === 80) || products[0];
    return {...form,height:Math.round(form.height*100),depth:Math.round((form.depth||.46)*100),bodyHeight:Math.round(form.height*100),
      name:form.name,facade:String(form.facade || (form.id.includes('ribelle')?'ribelle':'pura')).toUpperCase(),
      allowedWidths:products.map(p=>p.width),productsByWidth:byWidth,base:example?.ref,top:null,
      bareTTC:[40,60,80,100,120].map(w=>publicPrice(byWidth[w])),topTTC:[null,null,null,null,null],
      image:productImage(example),photoImage:productImage(example),photoWidth:visuals.products?.[example?.id]?.width,photoHeight:visuals.products?.[example?.id]?.height,sourceProduct:example};
  }).filter(m=>m.allowedWidths.length);
  const finishes = source.finishes.map(f => {
    const entry = visuals.finishes?.[f.id] || {};
    return {...f,refCode:f.id,hex:entry.hex||entry.color||f.color,swatch:absolute(entry.swatch||entry.image||f.texture),texture:absolute(entry.texture||f.texture)};
  });
  const mirrors = source.products.filter(p=>p.category==='mirror').map(p=>({
    id:p.id,name:p.label,shape:p.shape||p.subtype,led:p.backlit===true,metal:false,image:productImage(p),sourceProduct:p,
    sizes:[{label:(p.shape==='round'?'Ø '+p.width:p.width+' × '+p.height)+' cm · réf. '+(p.ref||'à confirmer'),width:p.width,height:p.height,ref:p.ref,ttc:publicPrice(p),productId:p.id}]
  }));
  return {source:{manufacturer:'NEOBATH',collection:'ANIMA',vat:20,priceBasis:source.priceBasis,priceBasisNote:source.priceBasisNote},
    media:'https://leroyfactory.fr/assets/img/neobath-anima-2026/',hero:absolute(visuals.compositions?.['13']?.image||source.presets[0]?.image),
    models,finishes,mirrors,columns,column:columns[0],sizes:[40,60,80,100,120].map(w=>({lo:w,hi:w,ref:String(w),label:w+' cm'})),
    inset:{},insetColors:[],vesselColors:[],products:source.products,presets:source.presets,visuals};
}
export const CATALOG = createAnimaCommerceCatalogue();
export const modelProduct = (format,width) => CATALOG.models.find(m=>m.id===format)?.productsByWidth[width] || null;
export const sourceNote = product => product?.codeStatus && !product.codeStatus.startsWith('verified') ? (product.sourceNote || 'Référence fabricant à confirmer avant commande.') : '';
