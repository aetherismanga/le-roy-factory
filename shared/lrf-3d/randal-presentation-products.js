// Every candidate uses the existing manufacturer catalog and guided validator.
// Context identifies the actual clicked item; unrelated project data stays intact.
export {mirrorSpec} from './mirrors.js';
import {MIRROR_METALS} from './mirrors.js';
import {presentationWall} from './randal-presentation-editing.js';
import {integratedOptions,vesselLayoutOptions} from './integrated-basins.js';
import {fullTopDrawerAvailable} from './drawer-options.js';
import {presentationMaterialPreview,presentationAssetURL} from './randal-presentation-choice-previews.js';

export function createPresentationProducts({catalog:C,finishes=C.finishes,normalizeDraft,draftProject,initialDraft}){
 const general=Array.isArray(C.columns),modelOf=d=>C.models.find(m=>m.id===d.format);
 const cabinetKeys=['format','width','finish','facadeMode','top','basinColor','basinLayout','topFinish','topDrawer'];
 const columnKeys=['column','columnModel','columnFinish'],mirrorKeys=['mirror','mirrorSize','mirrorFinish'];
 const topNames={bare:'Meuble seul — sans plan',none:'Meuble seul — sans plan',compact:'Vasque Compact intégrée',plain:general?'Plan seul':'Plan assorti seul',sella:'Sella encastrée',tampa:'Tampa encastrée',neris:'Plan + Neris à poser',torne:'Plan + Torne à poser'};
 function read(project,context={}){
  const selected=context.itemId?project.items.find(i=>i.id===context.itemId):null;
  if(context.itemId&&!selected)throw Error('Cet élément ne fait plus partie de la composition.');
  if(selected&&!['cabinet','column','mirror'].includes(selected.type))throw Error('Cet élément se modifie dans son configurateur d’origine.');
  const selectedColumn=selected?.type==='column'&&general?C.columns.find(c=>c.id===selected.settings.columnModel):null;
  const compatibleCabinet=i=>i.type==='cabinet'&&modelOf(i.settings)&&(!selectedColumn||modelOf(i.settings).collection===selectedColumn.collection);
  const candidates=project.items.filter(compatibleCabinet),sameWall=selected?candidates.filter(i=>i.placement.wall===selected.placement.wall):candidates;
  const nearest=list=>list.slice().sort((a,b)=>Math.abs((a.placement.u||0)-(selected?.placement.u||0))-Math.abs((b.placement.u||0)-(selected?.placement.u||0)))[0];
  let cabinet=selected?.type==='cabinet'?selected:context.itemId?(nearest(sameWall)||nearest(candidates)):candidates[0],synthetic=false;
  if(!cabinet){
   if(!selected)throw Error('Choisissez d’abord un meuble dans votre configuration.');
   cabinet=draftProject(initialDraft(selectedColumn?.collection)).items.find(i=>i.type==='cabinet');synthetic=true;
  }
  const companion=type=>project.items.filter(i=>i.type===type&&i.placement.wall===cabinet.placement.wall).sort((a,b)=>Math.abs(a.placement.u-cabinet.placement.u)-Math.abs(b.placement.u-cabinet.placement.u))[0];
  const column=selected?.type==='column'?selected:companion('column'),mirror=selected?.type==='mirror'?selected:companion('mirror'),s=cabinet.settings,m=C.mirrors.find(m=>m.id===mirror?.settings.mirrorModel);
  const d={...initialDraft(modelOf(s)?.collection),...s,version:1,column:!!column,columnModel:column?.settings.columnModel||null,columnFinish:column?.settings.finish||s.finish,mirror:mirror?.settings.mirrorModel||null,mirrorSize:mirror?m?.sizes.findIndex(v=>v.width===mirror.settings.width&&v.height===mirror.settings.height):0,mirrorFinish:mirror?.settings.mirrorFinish||'Noir'};
  // Other accessories must not prevent editing the clicked element. Their
  // identities and settings are never reconstructed unless explicitly changed.
  if(selected?.type==='cabinet'){d.column=false;d.mirror=null;d.mirrorSize=0;}
  else if(selected?.type==='column'){d.mirror=null;d.mirrorSize=0;}
  else if(selected?.type==='mirror')d.column=false;
  if(d.mirrorSize<0||!modelOf(d))throw Error('Cette composition doit être modifiée depuis son configurateur d’origine.');
  return {d:normalizeDraft(d),cabinet,column,mirror,selected: selected||cabinet,synthetic};
 }
 function dimensions(item){
  if(item.type==='cabinet'){const m=modelOf(item.settings);if(!m)throw Error('Modèle de meuble non reconnu.');return {w:item.settings.width,h:m.height,center:false};}
  if(item.type==='column'){const c=general?C.columns.find(c=>c.id===item.settings.columnModel):C.column;if(!c)throw Error('Modèle de colonne non reconnu.');return {w:c.width||38,h:c.height||132,center:false};}
  return {w:item.settings.width,h:item.settings.height,center:true};
 }
 function placementValid(project){
  const items=project.items.filter(i=>['cabinet','column','mirror'].includes(i.type));
  const boxes=items.map(item=>{const d=dimensions(item),p=item.placement,wall=presentationWall(project.room,p.wall);if(!wall||p.u-d.w/2<1||p.u+d.w/2>wall.length-1||p.height-(d.center?d.h/2:0)<0||p.height+(d.center?d.h/2:d.h)>project.room.height-1)throw Error('Déplacez les éléments pour libérer la place nécessaire.');return {id:item.id,wall:p.wall,left:p.u-d.w/2,right:p.u+d.w/2,bottom:p.height-(d.center?d.h/2:0),top:p.height+(d.center?d.h/2:d.h)};});
  for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const x=boxes[a],y=boxes[b];if(x.wall===y.wall&&Math.min(x.right,y.right)-Math.max(x.left,y.left)>.5&&Math.min(x.top,y.top)-Math.max(x.bottom,y.bottom)>.5)throw Error('Déplacez les éléments pour libérer la place nécessaire.');}
 }
 function reflowResizedCabinet(project,id){
  const item=project.items.find(i=>i.id===id),d=dimensions(item),p=item.placement,wall=presentationWall(project.room,p.wall);
  if(!wall)throw Error('Le mur du meuble n’est plus disponible.');
  const min=1+d.w/2,max=wall.length-1-d.w/2,bottom=p.height,top=bottom+d.h;
  const obstacles=project.items.filter(i=>i.id!==id&&['cabinet','column','mirror'].includes(i.type)&&i.placement.wall===p.wall).map(i=>{const s=dimensions(i),q=i.placement,b=q.height-(s.center?s.h/2:0);return {left:q.u-s.w/2,right:q.u+s.w/2,bottom:b,top:b+s.h};}).filter(b=>Math.min(top,b.top)-Math.max(bottom,b.bottom)>.5);
  const fits=u=>u>=min&&u<=max&&obstacles.every(b=>Math.min(u+d.w/2,b.right)-Math.max(u-d.w/2,b.left)<=.5);
  if(fits(p.u))return;
  // Keep every neighbouring item and its identity untouched. Only the resized
  // cabinet slides to the nearest free position on its existing wall.
  const candidates=[Math.max(min,Math.min(max,p.u)),min,max,...obstacles.flatMap(b=>[b.left-d.w/2-1,b.right+d.w/2+1])].filter(fits).sort((a,b)=>Math.abs(a-p.u)-Math.abs(b-p.u)||a-b);
  if(!candidates.length)throw Error('Le mur ne dispose pas de la place nécessaire pour cette largeur. Déplacez les éléments avant de réessayer.');
  p.u=candidates[0];
 }
 function cabinetHeight(old,d,current){
  const previous=modelOf(old),m=modelOf(d);return general?m.base:m.legHeight?0:previous.legHeight?28:current;
 }
 function normalizedCandidate(state,patch){
  const d={...state.d,...patch};
  if(Object.hasOwn(patch,'mirror'))d.mirrorSize=0;
  if(Object.hasOwn(patch,'columnModel'))d.column=patch.columnModel!=='none';
  if(general&&d.column&&Object.hasOwn(patch,'columnModel')){const c=C.columns.find(c=>c.id===d.columnModel);if(c&&!c.finishes.includes(d.columnFinish))d.columnFinish=c.finishes.includes(d.finish)?d.finish:c.finishes[0];}
  if(general&&Object.hasOwn(patch,'format')){const m=modelOf(d);if(!m)throw Error('Modèle indisponible.');if(!m.finishes.includes(d.finish))d.finish=m.finishes[0];}
  if(Object.hasOwn(patch,'top')){
   // A newly chosen basin starts with a real compatible layout/color. Width
   // remains explicit: selecting a basin never silently resizes the cabinet.
   d.basinLayout=undefined;
   const colors=[...new Set([d.basinColor,'gloss',...C.insetColors.map(c=>c.code),...C.vesselColors.map(c=>c.code)])];
   let failure;for(const color of colors){try{return normalizeDraft({...d,basinColor:color});}catch(e){failure=e;}}throw failure;
  }
  try{return normalizeDraft(d);}catch(error){
   if(!Object.hasOwn(patch,'basinLayout')&&['width','format'].some(key=>Object.hasOwn(patch,key))&&['sella','tampa','neris','torne'].includes(d.top)){
    // A 100 cm centred Sella has no centred 120 cm SKU. Preserve an existing
    // compatible layout; otherwise prefer a real 120 cm double, then let the
    // native catalogue resolve its own compatible layout at the chosen width.
    const options=['neris','torne'].includes(d.top)?vesselLayoutOptions(d.top,d.width):integratedOptions(d.top,d.width,d.basinColor);
    const layouts=[...(d.width>=120&&options.some(o=>o.layout==='double')?['double']:[]),undefined,...options.map(o=>o.layout)];
    for(const basinLayout of layouts){try{return normalizeDraft({...d,basinLayout});}catch{}}
   }
   throw error;
  }
 }
 function apply(project,patch,context={}){
  const {validateOnly=false}=context,state=read(project,context),keys=Object.keys(patch);
  const allowed=context.itemId?(state.selected.type==='column'?columnKeys:state.selected.type==='mirror'?mirrorKeys:cabinetKeys):[...cabinetKeys,...columnKeys,...mirrorKeys];
  if(!keys.length||keys.some(key=>!allowed.includes(key)))throw Error('Ce choix ne correspond pas à l’élément sélectionné.');
  const old=state.d,normalized=normalizedCandidate(state,patch),resizing=keys.some(k=>['format','width'].includes(k));
  if(validateOnly){
   if(resizing){const candidate=structuredClone(project),item=candidate.items.find(i=>i.id===state.cabinet.id);Object.assign(item.settings,{format:normalized.format,width:normalized.width});if(Object.hasOwn(patch,'format'))item.placement.height=cabinetHeight(old,normalized,item.placement.height);reflowResizedCabinet(candidate,item.id);placementValid(candidate);}
   return true;
  }
  const generated=draftProject(normalized),next=structuredClone(project),changed={cabinet:keys.some(k=>cabinetKeys.includes(k)),column:keys.some(k=>columnKeys.includes(k)),mirror:keys.some(k=>mirrorKeys.includes(k))};
  for(const type of ['cabinet','column','mirror']){
   if(!changed[type])continue;const current=state[type],replacement=generated.items.find(i=>i.type===type);
   if(!replacement){if(current)next.items=next.items.filter(i=>i.id!==current.id);continue;}
   const item=structuredClone(replacement);item.id=current?.id||'randal-presentation-'+type;if(!current){const base=item.id;let serial=1;while(next.items.some(i=>i.id===item.id))item.id=base+'-'+serial++;}
   if(current){item.settings={...current.settings,...item.settings};if(type==='column'){item.settings.hingeSide=current.settings.hingeSide||'left';item.settings.doorOpen=current.settings.doorOpen||false;}if(type==='mirror'&&current.settings.mirrorModel===item.settings.mirrorModel)item.settings.led=current.settings.led;if(type==='cabinet'){item.settings.tap=current.settings.tap??item.settings.tap;item.settings.decor=current.settings.decor??item.settings.decor;if(current.settings.format===item.settings.format)item.settings.drawers=current.settings.drawers;}item.placement={...current.placement};if(type==='cabinet'&&Object.hasOwn(patch,'format'))item.placement.height=cabinetHeight(old,normalized,item.placement.height);}
   else{const origin=generated.items.find(i=>i.type==='cabinet');item.placement={...item.placement,wall:state.cabinet.placement.wall,u:item.placement.u+state.cabinet.placement.u-origin.placement.u,height:item.placement.height+(type==='mirror'?state.cabinet.placement.height-origin.placement.height:0)};}
   const index=next.items.findIndex(i=>i.id===item.id);if(index>=0)next.items[index]=item;else next.items.push(item);
  }
  if(resizing)reflowResizedCabinet(next,state.cabinet.id);
  if(keys.some(k=>['format','width','column','columnModel','mirror','mirrorSize'].includes(k)))placementValid(next);return next;
 }
 function fields(project,context={}){
  const state=read(project,context),{d,cabinet}=state,model=modelOf(d),groups=[];
  function previewFor(key,value){
   if(['finish','columnFinish','topFinish'].includes(key)){
    const native=C.finishes.find(f=>f.id===value);if(!native)return null;
    return presentationMaterialPreview({...native,...finishes.find(f=>f.id===value)});
   }
   if(key==='basinColor')return presentationMaterialPreview((['sella','tampa'].includes(d.top)?C.insetColors:C.vesselColors).find(c=>c.code===value));
   if(key==='mirrorFinish')return presentationMaterialPreview(MIRROR_METALS.find(f=>f.id===value),{label:value});
   let product;
   if(key==='format')product=C.models.find(m=>m.id===value);
   if(key==='columnModel')product=general?C.columns.find(c=>c.id===value):value==='studio-column'?C.column:null;
   if(key==='mirror')product=C.mirrors.find(m=>m.id===value);
   if(product){const src=presentationAssetURL(product.photoImage||product.image);return src?{type:'image',src,alt:product.name,caption:product.name+' · Illustration catalogue'}:null;}
   if(key==='top'&&['sella','tampa','neris','torne'].includes(value)&&C.media)return {type:'image',src:C.media+'accessories/hd/basin-'+value+'.webp',alt:topNames[value],caption:topNames[value]+' · Illustration catalogue'};
   return null;
  }
  const field=(key,label,choices,value=d[key],{compact=false}={})=>({key,label,value:String(value??''),choices:choices.map(([value,label])=>{let error='';try{apply(project,{[key]:typeof d[key]==='number'?Number(value):value},{...context,validateOnly:true});}catch(e){error=e.message;}return {value:String(value??''),label,disabled:!!error,reason:error,preview:previewFor(key,value)};}).filter(choice=>!(compact||key==='width')||!choice.disabled||choice.value===String(value))});
  function basinFields(){
   const result=[field('top','Plan et vasque',Object.entries(topNames).filter(([id])=>general?id!=='bare':!['none','compact'].includes(id)),d.top,{compact:true})];
   if(['sella','tampa','neris','torne'].includes(d.top)){
    const colors=['sella','tampa'].includes(d.top)?C.insetColors:C.vesselColors;
    result.push(field('basinColor','Couleur de la vasque',colors.map(c=>[c.code,c.name]),d.basinColor,{compact:true}));
    const options=['neris','torne'].includes(d.top)?vesselLayoutOptions(d.top,d.width):integratedOptions(d.top,d.width,d.basinColor);
    result.push(field('basinLayout','Implantation de la vasque',options.map(o=>[o.layout,o.name]),d.basinLayout,{compact:true}));
   }
   if(general&&['plain','neris','torne'].includes(d.top))result.push(field('topFinish','Finition du plan',C.topFinishes.map(f=>[f.id,f.name]),d.topFinish,{compact:true}));
   if(fullTopDrawerAvailable(d.top)&&(!general||model.drawers))result.push(field('topDrawer','Tiroir supérieur',[['siphon','Avec passage de siphon'],['full','Plein — sans découpe siphon']]));
   return result;
  }
  const cabinetFields=()=>[field('format','Modèle',C.models.filter(m=>!general||m.collection===model.collection).map(m=>[m.id,m.name])),field('width','Largeur',(model.widths||Array.from({length:81},(_,i)=>i+40)).map(w=>[w,w+' cm'])),field('finish','Finition',C.finishes.filter(f=>!model.finishes||model.finishes.includes(f.id)).map(f=>[f.id,f.name])),...(!general?[field('facadeMode','Façade',[['overlay','En applique'],['inset','Encastrée']])]:[])];
  const columnFields=()=>{const columns=general?C.columns.filter(c=>c.collection===model.collection):[{id:'studio-column',name:C.column.name}];return [field('columnModel','Modèle de colonne',[['none','Sans colonne'],...columns.map(c=>[c.id,c.name])],d.column?(general?d.columnModel:'studio-column'):'none'),...(d.column?[field('columnFinish','Finition de colonne',C.finishes.filter(f=>!general||C.columns.find(c=>c.id===d.columnModel)?.finishes.includes(f.id)).map(f=>[f.id,f.name]))]:[])];};
  const mirrorFields=()=>{const mirror=C.mirrors.find(m=>m.id===d.mirror);return [field('mirror','Modèle de miroir',[[null,'Sans miroir'],...C.mirrors.map(m=>[m.id,m.name])]),...(mirror?[field('mirrorSize','Dimensions du miroir',mirror.sizes.map((s,i)=>[i,s.label])),...(mirror.metal?[field('mirrorFinish','Finition du cadre',Object.keys(mirror.sizes[d.mirrorSize].refs).map(id=>[id,id]))]:[])]:[])];};
  if(context.itemId){
   if(state.selected.type==='column')groups.push({id:'column',label:'Colonne',fields:columnFields()});
   else if(state.selected.type==='mirror')groups.push({id:'mirror',label:'Miroir',fields:mirrorFields()});
   else if(['basin','top','tap'].includes(context.part))groups.push({id:'basin',label:context.part==='top'?'Plan et vasque':'Vasque',fields:basinFields()});
   else groups.push({id:'cabinet',label:'Meuble',fields:[...cabinetFields(),...basinFields()]});
  }else groups.push({id:'cabinet',label:'Meuble',fields:cabinetFields()},{id:'column',label:'Colonne',fields:columnFields()},{id:'mirror',label:'Miroir',fields:mirrorFields()});
  return {groups,primary:context.itemId||cabinet.id,multiple:!context.itemId&&project.items.filter(i=>i.type==='cabinet').length>1};
 }
 return {read,fields,apply};
}
