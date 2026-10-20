import {panelThickness,handleFinish,HANDLE_FINISHES} from '../general-specs.js';
import {topAvailable} from '../configuration.js';
import {CATALOG as C} from './catalog.js';
export const money=cents=>Number.isInteger(cents)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100):'Prix sur demande';
export const finish=id=>C.finishes.find(f=>f.id===id);
export function lineItems(item){
 const s=item.settings||{},rows=[];
 const row=(name,ref,ttc,detail='',note='')=>rows.push({itemId:item.id,name,ref:ref||'À confirmer',detail,publicTTC:Number.isInteger(ttc)?ttc:null,note});
 if(item.type==='cabinet'){
  const m=C.models.find(m=>m.id===s.format),f=finish(s.finish),ref=m?.refs[s.width]?.[s.finish];
  if(!m||!f||!ref||!topAvailable(s.top,s.width,s.format)){row('Meuble RANDAL',null,null,'Configuration à vérifier');return rows;}
  row(m.collectionName+' · '+m.name,ref,m.bareTTC[s.width],`${m.collection==='harmony'&&s.width===120?119:s.width} × ${m.height} × ${m.depth} cm · ${f.name} · panneaux ${Math.round(panelThickness(m)*1000)} mm${handleFinish(m,s.finish)?' · poignée '+HANDLE_FINISHES[handleFinish(m,s.finish)].name:''}`);
  if(['sella','tampa'].includes(s.top)){
   const width=s.width===79?80:s.width,r=m.collection==='luce'&&width===120?C.centeredTampa120[s.basinColor||'gloss']:C.inset[s.top]?.[s.basinColor||'gloss']?.[width];
   row('Vasque '+(s.top==='sella'?'Sella':'Tampa'),r?.ref,r?.ttc,`${width} cm · ${C.insetColors.find(c=>c.code===(s.basinColor||'gloss'))?.name||''}${width>=120&&m.collection!=='luce'?' · double vasque':''}`);
  }else if(['plain','neris','torne'].includes(s.top)){
   if(!m.counter){const top=C.topFinishes.find(f=>f.id===s.topFinish);row('Plan pour vasque à poser',top?.refs[s.width],top?.prices[s.width],`${s.width} × 46 × 2 cm · ${top?.name||'Finition à choisir'}`);}
   if(s.top!=='plain'){const color=C.vesselColors.find(c=>c.code===(s.basinColor||'gloss')),name=s.top==='neris'?'Neris':'Torne';row('Vasque '+name,color?.[name],color?C.vesselTTC:null,color?.name);}
  }else if(!['none','compact'].includes(s.top))row('Plan / vasque',null,null,'Configuration à vérifier');
 }else if(item.type==='column'){
  const m=C.columns.find(m=>m.id===s.columnModel),f=finish(s.finish),ref=m?.refs[s.finish];row(m?.name||'Colonne RANDAL',ref,ref?m.ttc:null,m?`${m.width} × ${m.height} × ${m.depth} cm · ${f?.name||''}`:'Modèle à choisir');
 }else if(item.type==='mirror'){
  const m=C.mirrors.find(m=>m.id===s.mirrorModel),size=m?.sizes.find(v=>v.width===s.width&&v.height===s.height),metal=s.mirrorFinish||'Noir',valid=size&&(!m.metal||Object.hasOwn(size.refs,metal));
  row('Miroir '+(m?.name||''),valid?(size.refs?.[metal]||size.ref):null,valid?size.ttc:null,`${s.width} × ${s.height} cm${m?.metal?' · '+metal:''}`);
 }
 return rows;
}
export function quoteProject(project){
 const items=Array.isArray(project?.items)?project.items:[],rows=items.flatMap(lineItems),subtotal=rows.reduce((n,r)=>n+(r.publicTTC??0),0),missing=rows.filter(r=>r.publicTTC===null);
 return {rows,subtotal,publicTTC:missing.length?null:subtotal,missing,indicative:false,excluded:[...items.filter(i=>!['cabinet','column','mirror'].includes(i.type)).map(i=>({id:i.id,type:i.type})),...items.filter(i=>i.type==='cabinet'&&i.settings?.tap).map(i=>({id:i.id+'-tap',type:'attached-tap',reference:i.settings.tap}))],vat:20};
}
