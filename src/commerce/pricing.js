import {CATALOG as C} from './catalog.js';
export const money=cents=>Number.isInteger(cents)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100):'Prix sur demande';
export const finish=id=>C.finishes.find(f=>f.id===id);
export function lineItems(item){
 const s=item.settings||{},f=finish(s.finish),rows=[];
 const row=(name,ref,ttc,detail='',note='')=>rows.push({itemId:item.id,name,ref:ref||'À confirmer',detail,publicTTC:Number.isInteger(ttc)?ttc:null,note});
 if(item.type==='cabinet'){
  const m=C.models.find(m=>m.id===s.format),b=C.sizes.findIndex(b=>s.width>=b.lo&&s.width<=b.hi),top=s.top;
  if(!m||!f||!Number.isInteger(s.width)||b<0||!['plain','sella','tampa','neris','torne'].includes(top)){row('Meuble STUDIO ONE',null,null,'Configuration à vérifier');return rows;}
  const hasPlan=['plain','neris','torne'].includes(top),ref=(hasPlan?m.top:m.base)+' '+C.sizes[b].ref+'@'+f.refCode;
  row('STUDIO ONE · '+m.name,ref,(hasPlan?m.topTTC:m.bareTTC)[b],`${s.width} × ${m.height} × 46 cm · ${f.name} · ${hasPlan?'plan assorti':'sans plan bois'}`,s.width===40?'40 cm : à confirmer usine':'');
  if(['sella','tampa'].includes(top)){
   const color=s.basinColor||'gloss',r=C.inset[top]?.[color]?.[s.width];
   row('Vasque '+(top==='sella'?'Sella':'Tampa'),r?.ref,r?.ttc,`${s.width} cm · ${C.insetColors.find(c=>c.code===color)?.name||color}`);
  }else if(['neris','torne'].includes(top)){
   const color=C.vesselColors.find(c=>c.code===(s.basinColor||'gloss')),name=top==='neris'?'Neris':'Torne';
   row('Vasque '+name,color?.[name],color&&s.width>=(top==='neris'?50:40)?C.vesselTTC:null,color?.name||'Couleur à vérifier');
  }
 }else if(item.type==='column'){
  row(C.column.name,f?C.column.ref+' '+f.refCode:null,f?C.column.ttc:null,`38 × 132 × 27 cm · ${f?.name||'Finition à vérifier'}`);
 }else if(item.type==='mirror'){
  const m=C.mirrors.find(m=>m.id===s.mirrorModel),size=m?.sizes.find(v=>v.width===s.width&&v.height===s.height),metal=s.mirrorFinish||'Noir';
  const valid=size&&(!m.metal||Object.hasOwn(size.refs,metal));
  row('Miroir '+(m?.name||''),valid?(size.refs?.[metal]||size.ref):null,valid?size.ttc:null,`${m?.id==='basic'&&s.rotated?s.height:s.width} × ${m?.id==='basic'&&s.rotated?s.width:s.height} cm${m?.metal?' · '+metal:''}`);
 }
 return rows;
}
export function quoteProject(project){
 const items=Array.isArray(project?.items)?project.items:[],rows=items.flatMap(lineItems),subtotal=rows.reduce((n,r)=>n+(r.publicTTC??0),0),missing=rows.filter(r=>r.publicTTC===null);
 return {rows,subtotal,publicTTC:missing.length?null:subtotal,missing,indicative:rows.some(r=>r.note),excluded:[...items.filter(i=>!['cabinet','column','mirror'].includes(i.type)).map(i=>({id:i.id,type:i.type})),...items.filter(i=>i.type==='cabinet'&&i.settings?.tap).map(i=>({id:i.id+'-tap',type:'attached-tap',reference:i.settings.tap}))],vat:20};
}
