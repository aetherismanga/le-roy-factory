import {TOP_PRODUCTS,BASIN_PRODUCTS,PRODUCT_BY_ID,topSelection,firstPriceKey} from './anima-data.js';
import {normalizeTopSurface,SURFACE_BY_ID,surfaceFamilyForSelection} from './premium-materials.js';
import {resolveBasinAccessories} from './basin-accessories.js';

export const DEFAULT_STANDALONE_PLAN='tpgea12-linear-top';
export function standaloneSelection(settings={}){
 return topSelection(settings.top||DEFAULT_STANDALONE_PLAN,settings.width??100,'worktop',settings.basinLayout||'center',settings.width??100,settings.topPlanId,settings.width??100,{...settings,standalone:true});
}
export function normalizeStandaloneSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Configuration de plan indépendante invalide.');
 const width=input.width??100;if(typeof width!=='number'||!Number.isFinite(width)||width<=0)throw Error('Longueur de plan invalide.');
 const settings={...input,format:'worktop',width,top:input.top||DEFAULT_STANDALONE_PLAN,topSpan:width,topLength:width,topOffset:0,topShift:0,drawers:[],mounting:'wall'};
 if(['bare','plain'].includes(settings.top))throw Error('Choisissez une référence de plan Anima.');
 for(const field of ['basinColor','topPriceKey','basinPriceKey','topSurfaceId','topSurfaceNcs','topPlanId'])if(settings[field]!==undefined&&(typeof settings[field]!=='string'||settings[field].length>100))throw Error('Identifiant de finition de plan invalide.');
 for(const key of ['topDepth','basinOffsetX','basinOffsetZ'])if(settings[key]!==undefined&&(typeof settings[key]!=='number'||!Number.isFinite(settings[key])))throw Error('Dimensions ou position de vasque invalides.');
 const selection=standaloneSelection(settings);if(!selection?.top)throw Error('Ce plan et cette vasque ne correspondent pas aux dimensions choisies.');
 if(selection.top.subtype==='cover'){settings.finish=settings.finish||selection.top.allowedFinishIds?.[0];if(!selection.top.allowedFinishIds?.includes(settings.finish))throw Error('Finition de plan assorti Anima inconnue.');}
 resolveBasinAccessories(selection,settings);
 for(const [product,key]of [[selection.top,settings.topPriceKey],[selection.basin,settings.basinPriceKey||settings.basinColor]])if(product&&key&&!product.prices?.some(entry=>entry.key===key))throw Error('Cette finition ne correspond pas à la référence de plan ou de vasque.');
 if(settings.basinLayout&&selection.positions.length&&settings.basinLayout!==selection.layout)throw Error('Implantation de vasque incompatible.');
 if(settings.topSurfaceId){const material=normalizeTopSurface(settings,selection),surface=SURFACE_BY_ID.get(settings.topSurfaceId);if(!surface||surface.family!==surfaceFamilyForSelection(selection)||material?.id!==settings.topSurfaceId)throw Error('Matière du plan inconnue ou incompatible.');if(settings.topPriceKey&&settings.topPriceKey!==material.priceKey)throw Error('La couleur du plan ne correspond pas au tarif de sa matière.');if(selection.basin?.subtype==='integrated'&&selection.basin.prices?.some(price=>price.key===material.priceKey)&&(settings.basinPriceKey||settings.basinColor)!==material.priceKey)throw Error('La vasque intégrée doit reprendre la finition du plan.');if(surface.customNcs&&! /^(?:S\s*)?\d{4}-(?:[YRGB](?:\d{2}[YRGB])?|N)$/i.test(settings.topSurfaceNcs||''))throw Error('Renseignez un code NCS complet.');}
 return settings;
}
export function standaloneDimensions(input={}){
 const settings=normalizeStandaloneSettings(input),selection=standaloneSelection(settings),top=selection.top,basin=selection.basin,H=top.height/100;
 const rise=basin?.subtype==='countertop'?(basin.height||14)/100:basin?.subtype==='semi-recessed'?.025:0;
 const below=selection.integrated?Math.max(...(selection.wellProfiles||[]).map(well=>well.innerDepth||.14),.14):basin?.subtype==='semi-recessed'?Math.max(0,(basin.height||12)/100-.025):0;
 return {width:selection.topWidth/100,depth:selection.previewDepth/100,height:H+rise,clearanceBelow:selection.positions.length?Math.max(.20,below-H+.055):0,base:0};
}
function priceKey(product,current){return product.prices?.some(entry=>entry.key===current)?current:firstPriceKey(product);}
export function standalonePlanSettings(current={},planId=DEFAULT_STANDALONE_PLAN,basinId=null){
 const plan=PRODUCT_BY_ID.get(planId);if(!plan||plan.category!=='worktop')return null;
 const currentSelection=standaloneSelection(current),samePlan=currentSelection?.top?.id===plan.id,basin=basinId&&PRODUCT_BY_ID.get(basinId);
 if(basinId&&(!basin||basin.category!=='basin'||!basin.compatibleTopIds?.includes(plan.id)))return null;
 let width=current.width||100;
 if(plan.configurableWidth)width=Math.max(plan.minWidth||60,Math.min(plan.maxWidth||240,width));else width=plan.compatibleWidths?.includes(width)?width:plan.compatibleWidths?.[0]||plan.width;
 const sameBasin=currentSelection?.basin?.id===basin?.id;
 const next={...current,format:'worktop',width,top:basin?.id||plan.id,topPlanId:plan.id,topLength:width,topSpan:width,topShift:0,topOffset:0,topDepth:samePlan?current.topDepth:undefined,basinLayout:'center',basinOffsetX:sameBasin?current.basinOffsetX||0:0,basinOffsetZ:sameBasin?current.basinOffsetZ||0:0,basinBottom:sameBasin?current.basinBottom||'none':'none',basinSupport:sameBasin&&current.basinSupport===true,topPriceKey:priceKey(plan,current.topPriceKey),basinColor:priceKey(basin||plan,current.basinColor),basinPriceKey:basin?priceKey(basin,current.basinPriceKey||current.basinColor):'',topSurfaceId:samePlan?current.topSurfaceId||'':'',topSurfaceNcs:samePlan?current.topSurfaceNcs||'':''};
 const selection=standaloneSelection(next);if(!selection)return null;
 if(selection.positions.length)next.basinLayout=selection.layout;
 const material=normalizeTopSurface(next,selection);if(material){next.topSurfaceId=material.id;next.topPriceKey=material.priceKey;if(basin?.subtype==='integrated'&&basin.prices.some(entry=>entry.key===material.priceKey)){next.basinColor=material.priceKey;next.basinPriceKey=material.priceKey;}}
 try{return normalizeStandaloneSettings(next);}catch{return null;}
}
export function standalonePlanChoices(settings={}){return TOP_PRODUCTS.flatMap(product=>{const next=standalonePlanSettings(settings,product.id);return next?[{product,settings:next,family:product.subtype==='integrated'&&!product.configurableWidth?'integrated':surfaceFamilyForSelection({top:product})||'furniture'}]:[];});}
export function standaloneBasinChoices(settings={}){const selected=standaloneSelection(settings);if(!selected?.top?.configurableWidth)return [];return BASIN_PRODUCTS.flatMap(product=>{const next=standalonePlanSettings(settings,selected.top.id,product.id);return next?[{product,settings:next}]:[];});}
/** Stock format changes keep the manufactured model, bowl count and location.
 * A larger width belonging to another model is never a substitute variant. */
export function standaloneFixedPlanVariants(planOrId){
 const plan=typeof planOrId==='string'?PRODUCT_BY_ID.get(planOrId):planOrId;
 if(!plan||plan.category!=='worktop'||plan.configurableWidth)return [];
 return TOP_PRODUCTS.filter(product=>!product.configurableWidth&&product.subtype===plan.subtype&&product.label===plan.label&&product.basinCount===plan.basinCount&&product.basinPosition===plan.basinPosition&&product.height===plan.height&&product.depth===plan.depth)
  .flatMap(product=>(product.compatibleWidths||[]).map(width=>({product,width}))).sort((a,b)=>a.width-b.width);
}
