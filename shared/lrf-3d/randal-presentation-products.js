// The simplified view delegates every candidate to the existing manufacturer
// catalog and guided validator. It never carries its own references or prices.
export {mirrorSpec} from './mirrors.js';
import {presentationWall} from './randal-presentation-editing.js';

export function createPresentationProducts({catalog:C,normalizeDraft,draftProject,initialDraft}){
 const general=Array.isArray(C.columns),modelOf=d=>C.models.find(m=>m.id===d.format);
 function read(project){
  const cabinet=project.items.find(i=>i.type==='cabinet');
  if(!cabinet)throw Error('Choisissez d’abord un meuble dans votre configuration.');
  const column=project.items.find(i=>i.type==='column'&&i.placement.wall===cabinet.placement.wall),mirror=project.items.find(i=>i.type==='mirror'&&i.placement.wall===cabinet.placement.wall),s=cabinet.settings,m=C.mirrors.find(m=>m.id===mirror?.settings.mirrorModel);
  const d={...initialDraft(),...s,version:1,column:!!column,columnModel:column?.settings.columnModel||null,columnFinish:column?.settings.finish||s.finish,mirror:mirror?.settings.mirrorModel||null,mirrorSize:mirror?m?.sizes.findIndex(v=>v.width===mirror.settings.width&&v.height===mirror.settings.height):0,mirrorFinish:mirror?.settings.mirrorFinish||'Noir'};
  // An imported configuration with unknown references stays untouched.
  if(d.mirrorSize<0||!modelOf(d))throw Error('Cette composition doit être modifiée depuis son configurateur d’origine.');
  return {d:normalizeDraft(d),cabinet,column,mirror};
 }
 function dimensions(item){
  if(item.type==='cabinet'){const m=C.models.find(m=>m.id===item.settings.format);return {w:item.settings.width,h:m.height,center:false};}
  if(item.type==='column'){const c=general?C.columns.find(c=>c.id===item.settings.columnModel):C.column;return {w:c.width||38,h:c.height||132,center:false};}
  return {w:item.settings.width,h:item.settings.height,center:true};
 }
 function placementValid(project){
  const items=project.items.filter(i=>['cabinet','column','mirror'].includes(i.type));
  const boxes=items.map(item=>{const d=dimensions(item),p=item.placement,wall=presentationWall(project.room,p.wall);if(!wall||p.u-d.w/2<1||p.u+d.w/2>wall.length-1||p.height-(d.center?d.h/2:0)<0||p.height+(d.center?d.h/2:d.h)>project.room.height-1)throw Error('Déplacez les éléments pour libérer la place nécessaire.');return {id:item.id,wall:p.wall,left:p.u-d.w/2,right:p.u+d.w/2,bottom:p.height-(d.center?d.h/2:0),top:p.height+(d.center?d.h/2:d.h)};});
  for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const x=boxes[a],y=boxes[b];if(x.wall===y.wall&&Math.min(x.right,y.right)-Math.max(x.left,y.left)>.5&&Math.min(x.top,y.top)-Math.max(x.bottom,y.bottom)>.5)throw Error('Déplacez les éléments pour libérer la place nécessaire.');}
 }
 function apply(project,patch,{validateOnly=false}={}){
  const state=read(project),old=state.d,d={...old,...patch};
  if(Object.hasOwn(patch,'mirror'))d.mirrorSize=0;
  if(Object.hasOwn(patch,'columnModel'))d.column=patch.columnModel!=='none';
  if(general&&d.column&&Object.hasOwn(patch,'columnModel')){const c=C.columns.find(c=>c.id===d.columnModel);if(c&&!c.finishes.includes(d.columnFinish))d.columnFinish=c.finishes.includes(d.finish)?d.finish:c.finishes[0];}
  if(general&&Object.hasOwn(patch,'format')){const m=modelOf(d);if(!m)throw Error('Modèle indisponible.');if(!m.finishes.includes(d.finish))d.finish=m.finishes[0];}
  const normalized=normalizeDraft(d);if(validateOnly)return true;const generated=draftProject(normalized),next=structuredClone(project),keys=Object.keys(patch),changed={cabinet:keys.some(k=>['format','width','finish','facadeMode'].includes(k)),column:keys.some(k=>['column','columnModel','columnFinish'].includes(k)),mirror:keys.some(k=>['mirror','mirrorSize','mirrorFinish'].includes(k))};
  for(const type of ['cabinet','column','mirror']){
   if(!changed[type])continue;const current=state[type],replacement=generated.items.find(i=>i.type===type);
   if(!replacement){if(current)next.items=next.items.filter(i=>i.id!==current.id);continue;}
   const item=structuredClone(replacement);item.id=current?.id||'randal-presentation-'+type;if(!current){const base=item.id;let serial=1;while(next.items.some(i=>i.id===item.id))item.id=base+'-'+serial++;}
   if(current){item.settings={...current.settings,...item.settings};if(type==='column'){item.settings.hingeSide=current.settings.hingeSide||'left';item.settings.doorOpen=current.settings.doorOpen||false;}if(type==='mirror'&&current.settings.mirrorModel===item.settings.mirrorModel)item.settings.led=current.settings.led;if(type==='cabinet'){item.settings.tap=current.settings.tap??item.settings.tap;item.settings.decor=current.settings.decor??item.settings.decor;if(current.settings.format===item.settings.format)item.settings.drawers=current.settings.drawers;}item.placement={...current.placement};if(type==='cabinet'&&Object.hasOwn(patch,'format')){const previous=modelOf(old),m=modelOf(normalized);if(general)item.placement.height=m.base;else if(m.legHeight)item.placement.height=0;else if(previous.legHeight)item.placement.height=28;}}
   else{const origin=generated.items.find(i=>i.type==='cabinet');item.placement={...item.placement,wall:state.cabinet.placement.wall,u:item.placement.u+state.cabinet.placement.u-origin.placement.u,height:item.placement.height+(type==='mirror'?state.cabinet.placement.height-origin.placement.height:0)};}
   const index=next.items.findIndex(i=>i.id===item.id);if(index>=0)next.items[index]=item;else next.items.push(item);
  }
  if(keys.some(k=>['format','width','column','columnModel','mirror','mirrorSize'].includes(k)))placementValid(next);return next;
 }
 function fields(project){
  const {d,cabinet}=read(project),model=modelOf(d),groups=[];
  const field=(key,label,choices,value=d[key])=>({key,label,value:String(value??''),choices:choices.map(([value,label])=>{let error='';try{apply(project,{[key]:typeof d[key]==='number'?Number(value):value},{validateOnly:true});}catch(e){error=e.message;}return {value:String(value??''),label,disabled:!!error,reason:error};}).filter(choice=>key!=='width'||!choice.disabled||choice.value===String(value))});
  groups.push({id:'cabinet',label:'Meuble',fields:[field('format','Modèle',C.models.filter(m=>!general||m.collection===model.collection).map(m=>[m.id,m.name])),field('width','Largeur', (model.widths||Array.from({length:81},(_,i)=>i+40)).map(w=>[w,w+' cm'])),field('finish','Finition',C.finishes.filter(f=>!model.finishes||model.finishes.includes(f.id)).map(f=>[f.id,f.name])),...(!general?[field('facadeMode','Façade',[['overlay','En applique'],['inset','Encastrée']])]:[])]});
  const columns=general?C.columns.filter(c=>c.collection===model.collection):[{id:'studio-column',name:C.column.name}];
  groups.push({id:'column',label:'Colonne',fields:[field('columnModel','Modèle de colonne',[['none','Sans colonne'],...columns.map(c=>[c.id,c.name])],d.column?(general?d.columnModel:'studio-column'):'none'),...(d.column?[field('columnFinish','Finition de colonne',C.finishes.filter(f=>!general||C.columns.find(c=>c.id===d.columnModel)?.finishes.includes(f.id)).map(f=>[f.id,f.name]))]:[])]});
  const mirror=C.mirrors.find(m=>m.id===d.mirror);
  groups.push({id:'mirror',label:'Miroir',fields:[field('mirror','Modèle de miroir',[[null,'Sans miroir'],...C.mirrors.map(m=>[m.id,m.name])]),...(mirror?[field('mirrorSize','Dimensions du miroir',mirror.sizes.map((s,i)=>[i,s.label])),...(mirror.metal?[field('mirrorFinish','Finition du cadre',Object.keys(mirror.sizes[d.mirrorSize].refs).map(id=>[id,id]))]:[])]:[])]});
  return {groups,primary:cabinet.id,multiple:project.items.filter(i=>i.type==='cabinet').length>1};
 }
 return {read,fields,apply};
}
