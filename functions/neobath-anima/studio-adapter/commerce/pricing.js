import {CATALOG as C,PRODUCTS,modelProduct,publicPrice,sourceNote,productImage} from './catalog.js';
import {topSelection} from '../anima-data.js';
import {continuousTopContext,continuousTopCompatible} from '../projects.js';
import {normalizeTopSurface} from '../premium-materials.js';
import {resolveBasinAccessories} from '../basin-accessories.js';

export const money = cents => Number.isInteger(cents) ? new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100) : 'Prix sur demande';
export const finish = id => C.finishes.find(f=>f.id===id);
const variantKey = (product,key) => product?.prices?.some(p=>p.key===key) ? key : product?.prices?.[0]?.key;
// Room openings and construction geometry are context for the 3D scene. They
// are not unpriced furniture articles in the manufacturer's recap.
const UNPRICED_EQUIPMENT_TYPES=new Set(['bath','shower','tap','screen','towel','toilet','washstand']);
export function lineItems(item,project=null) {
  const s=item.settings||{},f=finish(s.finish),rows=[];
  const row=(product,name,detail='',key,width,extra=0)=>{
    const price=publicPrice(product,variantKey(product,key),width);
    rows.push({itemId:item.id,productId:product?.id,name,ref:product?.ref||'À confirmer',detail,
      publicTTC:Number.isInteger(price)?Math.round(price*(1+extra)):null,note:sourceNote(product),image:productImage(product)});
  };
  if(item.type==='cabinet') {
    try{resolveBasinAccessories(PRODUCTS.get(s.top),s);}catch(error){rows.push({itemId:item.id,name:'Option de fond de vasque incompatible',ref:'À confirmer',detail:error.message,publicTTC:null,note:'Choisissez une tablette et une vasque compatibles avant de chiffrer le projet.'});return rows;}
    const m=C.models.find(m=>m.id===s.format),p=modelProduct(s.format,s.width);
    if(!m||!p||!f){rows.push({itemId:item.id,name:'Meuble NEOBATH ANIMA',ref:'À confirmer',detail:'Configuration à vérifier',publicTTC:null,note:'Choisissez une référence Anima valide.'});return rows;}
    const grass=s.grass===true&&p.drawers?(p.height===26?.15:.20):0;
    row(p,'ANIMA · '+m.name,`${p.width} × ${p.height} × ${p.depth} cm · ${f.name}${grass?' · Coulisses GRASS +'+Math.round(grass*100)+' %':''}`,s.priceKey,undefined,grass);
    if(s.top&&s.top!=='bare') {
      const context=(s.topSpan??s.width)>s.width||s.topOffset?continuousTopContext(project,item):{span:s.width,offset:0,ids:[item.id]};
      const supported=context&&(!(context.span>s.width||s.topLength!==undefined||s.topShift)||continuousTopCompatible(project,item.id,s.top,context.span,context.offset));
      const selection=supported&&topSelection(s.top,s.width,s.format,s.basinLayout,context.span,s.topPlanId,s.topLength,s);
      if(!selection){rows.push({itemId:item.id,name:'Plan / vasque Anima',ref:'À confirmer',detail:'Implantation à vérifier',publicTTC:null,note:'Le plan ne correspond pas à cette largeur.'});return rows;}
      const {top,basin}=selection;
      if(top) {
        const material=normalizeTopSurface(s,selection),key=variantKey(top,s.topPriceKey||(s.topSurfaceId?material?.priceKey:s.basinColor)),length=selection.billingLength||selection.topWidth||s.width;
        const color=s.topSurfaceId&&material?material.surface.name:top.prices?.find(p=>p.key===key)?.label||'';
        row(top,top.subtype==='integrated'?'Plan-vasque '+top.label:'Plan '+top.label,
          `${selection.topWidth||top.width||s.width} × ${top.height||''} × ${selection.previewDepth||top.depth||46.2} cm · ${color}${context.span>s.width?' · plan continu sur '+context.span+' cm, '+context.ids.length+' meubles · décalage '+context.offset+' cm':''}${selection.topLength>context.span?' · débords G '+((selection.topLength-context.span)/2-(s.topShift||0))+' / D '+((selection.topLength-context.span)/2+(s.topShift||0))+' cm':''}${top.unit==='cm'?' · facturé '+length+' cm':''}${/ncs/i.test(key||'')?' · NCS '+(s.topSurfaceNcs||s.ncsCode||'à préciser avant commande'):''}`,key,length);
        if(selection.customDepth){rows.at(-1).publicTTC=null;rows.at(-1).note='Profondeur sur mesure : faisabilité et tarif à confirmer par le fabricant.';}
      }
      if(basin) {
        const key=variantKey(basin,s.basinPriceKey||s.basinColor),color=basin.prices?.find(p=>p.key===key)?.label||'';
        row(basin,'Vasque '+basin.label,[basin.width&&basin.depth?`${basin.width} × ${basin.depth} cm`:'',color,basin.basinCount===2?'Deux cuves (tarif de la paire)':'',/ncs/i.test(key||'')?'NCS '+(s.ncsCode||'à préciser avant commande'):''].filter(Boolean).join(' · '),key);
        for(const accessory of selection.basinAccessoryProducts||[])row(accessory,accessory.label,accessory.ref+' · option de la vasque '+basin.ref);
      }
    }
    for(const [id,key] of [[s.lightId,s.lightPriceKey],[s.accessoryId,s.accessoryPriceKey]]){const p=PRODUCTS.get(id);if(p&&!rows.some(row=>row.productId===p.id))row(p,p.label,p.prices?.find(v=>v.key===key)?.label||'',key);}
  } else if(item.type==='column') {
    const c=C.columns.find(c=>c.id===s.columnModel)||C.columns.find(c=>c.facade===String(s.facade||'PURA').toUpperCase())||C.columns[0];
    const p=PRODUCTS.get(c?.productId);
    row(p,c?.name||'Colonne Anima',`40 × 140 × 22 cm · ${f?.name||'Finition à vérifier'}`);
  } else if(item.type==='mirror') {
    const p=PRODUCTS.get(s.mirrorModel);
    row(p,'Miroir '+(p?.label||''),p?`${p.width} × ${p.height} cm${p.backlit?' · LED':''}`:'Référence à vérifier',s.mirrorPriceKey);
    const light=PRODUCTS.get(s.lightId);if(light)row(light,light.label,'Éclairage associé',s.lightPriceKey);
  }
  return rows;
}
export function quoteProject(project) {
  const items=Array.isArray(project?.items)?project.items:[],rows=items.flatMap(item=>lineItems(item,project)),subtotal=rows.reduce((n,r)=>n+(r.publicTTC??0),0),missing=rows.filter(r=>r.publicTTC===null);
  return {rows,subtotal,publicTTC:missing.length?null:subtotal,missing,indicative:rows.some(r=>r.note),
    excluded:[...items.filter(i=>UNPRICED_EQUIPMENT_TYPES.has(i.type)).map(i=>({id:i.id,type:i.type,...(i.type==='tap'&&i.settings?.tap?{reference:i.settings.tap}:{})})),...items.filter(i=>i.type==='cabinet'&&i.settings?.tap).map(i=>({id:i.id+'-tap',type:'attached-tap',reference:i.settings.tap}))],vat:20};
}
