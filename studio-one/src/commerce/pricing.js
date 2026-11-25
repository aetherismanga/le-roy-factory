import {PAIRED_FIXING_NOTE} from '../../../shared/lrf-3d/paired-basin-placement.js';
import {AQUAHOME} from '../../../shared/lrf-3d/aquahome-catalog.js';
import {matchingDrain} from '../../../shared/lrf-3d/plumbing-catalog.js';
import {cabinetUnitWidth,topAvailable,PAIRED_WIDTH} from '../configuration.js';
import {solidPlan,solidDescription,SOLID_SURFACE_LEAD_TIME,integratedTop,defaultBasinColor} from '../solid-surface-catalog.js';
import {basinEntry,BASIN_LAYOUT_NAMES} from '../basins.js';
import {CATALOG as C} from './catalog.js';
export const money=cents=>Number.isInteger(cents)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100):'Prix sur demande';
export const finish=id=>C.finishes.find(f=>f.id===id);
const drainSummary=s=>{const d=matchingDrain(AQUAHOME.find(p=>p.reference===s.tap)?.finish||s.drainFinish);return ' · clic-clac '+d.finish+' · réf. '+d.reference+' (hors chiffrage)';};
export function lineItems(item){
 const s=item.settings||{},f=finish(s.finish),rows=[];
 const row=(name,ref,ttc,detail='',note='')=>rows.push({itemId:item.id,name,ref:ref||'À confirmer',detail,publicTTC:Number.isInteger(ttc)?ttc:null,note});
 if(item.type==='cabinet'){
  const m=C.models.find(m=>m.id===s.format),unit=cabinetUnitWidth(s.width),b=C.sizes.findIndex(b=>unit>=b.lo&&unit<=b.hi),top=s.top;
  if(!m||!f||!Number.isInteger(s.width)||b<0||!topAvailable(top,s.width)){row('Meuble STUDIO ONE',null,null,'Configuration à vérifier');return rows;}
  const hasPlan=['plain','neris','torne'].includes(top),ref=(hasPlan?m.top:m.base)+' '+C.sizes[b].ref+'@'+f.refCode;
  // Each physical cabinet retains its own orderable SKU and unit price.
  const sides=s.width===PAIRED_WIDTH?['gauche','droit']:[''];
  for(const side of sides)row('STUDIO ONE · '+m.name+(side?' · caisson '+side:''),ref,(hasPlan?m.topTTC:m.bareTTC)[b],`${unit} × ${m.height} × 46 cm${m.legHeight?' · caisson '+m.bodyHeight+' cm + pieds '+m.legHeight+' cm':''} · ${f.name}${s.facadeMode==='inset'?' · Façade encastrée · chants latéraux de 19 mm':''} · ${hasPlan?'plan assorti':top==='bare'?'meuble seul · sans plan ni vasque':'sans plan bois'}`,s.width===40?'40 cm : à confirmer usine':'');
  if(sides.length===2)rows.at(-1).detail+=' · '+PAIRED_FIXING_NOTE;
  if(integratedTop(top)){
   const color=s.basinColor||defaultBasinColor(top),r=basinEntry(top,color,s.width,s.format,s.basinLayout);
   const plan=solidPlan(top,s.width,r?.layout),name=plan?.name||(top==='sella'?'Sella':'Tampa');
   const detail=plan?solidDescription(plan):`${s.width} cm · ${C.insetColors.find(c=>c.code===color)?.name||color}${r?' · '+r.name:''}`;
   row('Vasque '+name,r?.ref,r?.ttc,detail+drainSummary(s)+(plan?' · '+SOLID_SURFACE_LEAD_TIME:''));
  }else if(['neris','torne'].includes(top)){
   const color=C.vesselColors.find(c=>c.code===(s.basinColor||'gloss')),name=top==='neris'?'Neris':'Torne';
   row('Vasque '+name,color?.[name],color&&s.width>=(top==='neris'?50:40)?C.vesselTTC:null,(color?.name||'Couleur à vérifier')+' · '+(BASIN_LAYOUT_NAMES[s.basinLayout]||BASIN_LAYOUT_NAMES.center)+drainSummary(s));
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
 return {rows,subtotal,publicTTC:missing.length?null:subtotal,missing,indicative:rows.some(r=>r.note),excluded:[...items.filter(i=>!['cabinet','column','mirror'].includes(i.type)).map(i=>({id:i.id,type:i.type,...(i.type==='tap'&&i.settings?.tap?{reference:i.settings.tap}:{})})),...items.filter(i=>i.type==='cabinet'&&i.settings?.tap).map(i=>({id:i.id+'-tap',type:'attached-tap',reference:i.settings.tap}))],vat:20};
}
