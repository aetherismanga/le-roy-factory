import {CABINET_FORMATS,topAvailable} from './configuration.js';
import {CATALOGUE} from './anima-data.js';
import {topSelection} from './anima-data.js';
import {SURFACE_BY_ID,normalizeTopSurface,surfaceFamilyForSelection} from './premium-materials.js';
import {animaWellProfile} from './top-profiles.js';
import {resolveBasinAccessories} from './basin-accessories.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const source=()=>globalThis.NEOBATH_ANIMA_CATALOGUE||CATALOGUE;
const JOINT_TOLERANCE_CM=.1;
const close=(a,b)=>Math.abs(a-b)<=JOINT_TOLERANCE_CM+1e-7;
const rounded=value=>Math.round(value*1e6)/1e6;
// A continuous worktop is attached to one real stock cabinet. Its other
// supports remain independent cabinets with no second plan charged to them.
export function continuousPlanGroups(project,hostId) {
  const host=project?.items?.find(item=>item?.id===hostId&&item.type==='cabinet');
  const hostForm=CABINET_FORMATS.find(form=>form.id===host?.settings?.format);
  if(!host||!hostForm||!['vanity','base'].includes(hostForm.subtype))return [];
  const hp=host.placement||{},hs=host.settings||{};
  if(!Number.isFinite(hp.u)||!Number.isFinite(hp.height)||!hostForm.allowedWidths.includes(hs.width))return [];
  const orientation=Number(hp.rotation||0);
  if(!Number.isFinite(orientation)||Math.abs(((orientation%360)+360)%360)>1e-6)return [];
  const surface=hp.height+hostForm.height*100,depth=hostForm.depth*100,offset=hp.offset||0;
  const candidates=(project.items||[]).flatMap(item=>{
    if(item?.type!=='cabinet'||!item.settings||!item.placement)return [];
    const form=CABINET_FORMATS.find(form=>form.id===item.settings.format),s=item.settings,p=item.placement;
    if(!form||!['vanity','base'].includes(form.subtype)||!form.allowedWidths.includes(s.width))return [];
    if(item.id!==hostId&&s.top&&s.top!=='bare')return [];
    if(p.wall!==hp.wall||!Number.isFinite(p.u)||!Number.isFinite(p.height)||!close(p.height+form.height*100,surface)||!close(form.depth*100,depth)||!close(p.offset||0,offset))return [];
    const rotation=Number(p.rotation||0);if(!Number.isFinite(rotation)||Math.abs(((rotation%360)+360)%360)>1e-6)return [];
    return [{id:item.id,width:s.width,min:p.u-s.width/2,max:p.u+s.width/2}];
  }).sort((a,b)=>a.min-b.min||a.max-b.max);
  const at=candidates.findIndex(item=>item.id===hostId);if(at<0)return [];
  let left=at,right=at;
  while(left>0&&close(candidates[left-1].max,candidates[left].min))left--;
  while(right<candidates.length-1&&close(candidates[right].max,candidates[right+1].min))right++;
  const groups=[];
  for(let a=left;a<=at;a++)for(let b=at;b<=right;b++){
    const members=candidates.slice(a,b+1),span=rounded(members.reduce((sum,item)=>sum+item.width,0));
    if(span>600)continue;
    const min=members[0].min,max=members.at(-1).max;
    groups.push({span,offset:rounded((min+max)/2-hp.u),ids:members.map(item=>item.id),min:rounded(min),max:rounded(max)});
  }
  return groups.sort((a,b)=>a.span-b.span||a.offset-b.offset);
}
export function continuousTopContext(project,item) {
  if(!item||item.type!=='cabinet')return null;
  const s=item.settings||{},span=s.topSpan??s.width,offset=s.topOffset??0;
  if(!Number.isFinite(span)||span<s.width||span>600||!Number.isFinite(offset)||Math.abs(offset)>600)return null;
  if(span===s.width&&offset===0)return {span,offset:0,ids:[item.id],min:item.placement.u-s.width/2,max:item.placement.u+s.width/2};
  return continuousPlanGroups(project,item.id).find(group=>group.ids.length>1&&Math.abs(group.span-span)<1e-6&&close(group.offset,offset))||null;
}
export function continuousTopCompatible(project,hostId,mode,span,offset=0) {
  const item=project?.items?.find(item=>item?.id===hostId&&item.type==='cabinet');if(!item)return false;
  const settings={...item.settings,top:mode,topSpan:span,topOffset:offset},host={...item,settings};
  const prospective={...project,items:project.items.map(item=>item.id===hostId?host:item)};
  const context=continuousTopContext(prospective,host),selection=context&&topSelection(mode,settings.width,settings.format,settings.basinLayout,context.span,settings.topPlanId,settings.topLength,settings);
  if(!selection)return false;
  const shift=settings.topShift??0,length=selection.topLength||context.span;
  if(!Number.isFinite(shift)||Math.abs(shift)>(length-context.span)/2+1e-6)return false;
  if(!selection.positions?.length)return true;
  // A single fixed factory reference is validated by its catalogue fit. Its
  // reconstructed preview bowl is not a published manufacturing cutout.
  if(!selection.top.configurableWidth&&context.ids.length===1&&context.span===settings.width&&shift===0)return CABINET_FORMATS.find(form=>form.id===settings.format)?.subtype==='vanity';
  const supports=context.ids.flatMap(id=>{
    const item=project.items.find(item=>item.id===id),form=CABINET_FORMATS.find(form=>form.id===item?.settings?.format);
    return form?.subtype==='vanity'?[item]:[];
  });
  const count=Number(selection.basin?.basinCount||selection.top?.basinCount||1);
  const profile=animaWellProfile(selection.top,selection.basin,selection.topWidth/100/count),bowlWidth=profile.w*100;
  // Clearance follows the visual cabinet's 19 mm sides and a small running
  // gap. Every bowl must sit over a genuine vanity, not an uncut base drawer.
  const exteriorVessel=selection.basin&&selection.basin.subtype!=='integrated';
  const margin=exteriorVessel?4:bowlWidth/2+2.5;
  return selection.positions.every((position,index)=>{
    const centre=host.placement.u+context.offset+shift+position*100;
    const well=selection.wellProfiles?.[index],z=(selection.positionsZ?.[index]??.02)*100+(selection.previewDepth-selection.referenceDepth)/2,halfDepth=exteriorVessel?4:(well?.depth??profile.d)*50;
    return supports.some(support=>{const form=CABINET_FORMATS.find(form=>form.id===support.settings.format);return Math.abs(centre-support.placement.u)<=support.settings.width/2-(exteriorVessel?margin:(well?.width??profile.w)*50+2.5)+JOINT_TOLERANCE_CM&&Math.abs(z)+halfDepth<=form.depth*50-2.5+JOINT_TOLERANCE_CM;});
  });
}
export class ProjectJournal {
  constructor(limit=50){this.limit=limit;this.entries=[];this.index=-1;}
  seed(value){this.entries=[clone(value)];this.index=0;}
  replaceCurrent(value){if(this.index<0)return false;this.entries[this.index]=clone(value);return true;}
  record(value){const key=JSON.stringify(value);if(this.index>=0&&JSON.stringify(this.entries[this.index])===key)return false;this.entries.splice(this.index+1);this.entries.push(clone(value));if(this.entries.length>this.limit)this.entries.shift();this.index=this.entries.length-1;return true;}
  undo(){if(this.index<=0)return null;return clone(this.entries[--this.index]);}
  redo(){if(this.index>=this.entries.length-1)return null;return clone(this.entries[++this.index]);}
  get canUndo(){return this.index>0;}get canRedo(){return this.index<this.entries.length-1;}
}
export function validateProject(data) {
  if(!data||![1,2].includes(data.version)||!data.room||!Array.isArray(data.items)||data.items.length>64)throw Error('Ce fichier n’est pas un projet NEOBATH ANIMA compatible.');
  if(data.manufacturer&&data.manufacturer!=='neobath-anima')throw Error('Ce fichier appartient à un autre configurateur.');
  if(!Array.isArray(data.room.points)||data.room.points.length<3||data.room.points.length>12||data.room.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v))))throw Error('Plan de pièce invalide.');
  if(data.walls!==undefined&&!Array.isArray(data.walls)||data.layouts?.walls!==undefined&&!Array.isArray(data.layouts.walls))throw Error('Revêtements de projet invalides.');
  const catalogue=source(),finishes=new Set(catalogue.finishes.map(f=>f.id)),products=new Map(catalogue.products.map(p=>[p.id,p]));
  const ids=new Set();
  for(const item of data.items) {
    if(!item||typeof item.id!=='string'||ids.has(item.id)||!item.settings||typeof item.settings!=='object'||!item.placement)throw Error('Éléments de projet invalides.');
    ids.add(item.id);const s=item.settings,p=item.placement;
    if(!Number.isInteger(p.wall)||p.wall<0||p.wall>63||!Number.isFinite(p.u)||!Number.isFinite(p.height)||p.offset!==undefined&&!Number.isFinite(p.offset)||p.rotation!==undefined&&!Number.isFinite(p.rotation))throw Error('Position d’élément invalide.');
    if(item.type==='cabinet'){
      const form=CABINET_FORMATS.find(f=>f.id===s.format);
      if(!form||!form.allowedWidths.includes(s.width)||!finishes.has(s.finish))throw Error('Format ou finition de meuble Anima inconnu.');
      const context=continuousTopContext(data,item);
      if(!context)throw Error('Le plan continu doit reposer sur des meubles juxtaposés, sans autre plan, à la même hauteur.');
      if(!topAvailable(s.top||'bare',s.width,s.format,context.span))throw Error('Le plan / la vasque ne correspond pas à ce meuble Anima.');
      const selected=topSelection(s.top||'bare',s.width,s.format,s.basinLayout,context.span,s.topPlanId,s.topLength,s),product=selected?.product;
      if(!selected)throw Error('Le plan choisi ne correspond pas à cette vasque Anima.');
      resolveBasinAccessories(selected,s);
      for(const field of ['topDepth','basinOffsetX','basinOffsetZ'])if(s[field]!==undefined&&(typeof s[field]!=='number'||!Number.isFinite(s[field])))throw Error('Dimension ou position de vasque invalide.');
      for(const field of ['basinColor','topPriceKey','basinPriceKey','topSurfaceId'])if(s[field]!==undefined&&typeof s[field]!=='string')throw Error('Identifiant de finition Anima invalide.');
      if(s.topPlanId!==undefined&&(typeof s.topPlanId!=='string'||s.topPlanId&&!products.has(s.topPlanId)))throw Error('Référence de plan Anima inconnue.');
      const length=selected.topLength||context.span,shift=s.topShift??0;
      if(!Number.isFinite(shift)||Math.abs(shift)>(length-context.span)/2+1e-6)throw Error('Le plan doit couvrir tous ses supports ; vérifiez les débords gauche et droit.');
      if(!continuousTopCompatible(data,item.id,s.top||'bare',context.span,context.offset))throw Error('Chaque vasque du plan doit être portée par un meuble sous-vasque compatible.');
      if(product?.prices?.length&&s.basinColor&&!product.prices.some(v=>v.key===s.basinColor))throw Error('Finition du plan / de la vasque Anima inconnue.');
      if(s.topPriceKey&&selected.top?.prices?.length&&!selected.top.prices.some(v=>v.key===s.topPriceKey))throw Error('Tarif de finition du plan Anima inconnu.');
      if(s.basinPriceKey&&selected.basin?.prices?.length&&!selected.basin.prices.some(v=>v.key===s.basinPriceKey))throw Error('Tarif de finition de vasque Anima inconnu.');
      if(s.basinLayout&&selected.positions.length&&s.basinLayout!==selected.layout)throw Error('Implantation de vasque Anima incompatible.');
      if(s.ncsCode!==undefined&&(typeof s.ncsCode!=='string'||s.ncsCode.length>40))throw Error('Code NCS invalide.');
      if(s.topSurfaceId!==undefined&&s.topSurfaceId){
        const surface=SURFACE_BY_ID.get(s.topSurfaceId),family=surfaceFamilyForSelection(selected),normalized=normalizeTopSurface(s,selected);
        if(!surface||surface.family!==family||normalized?.id!==s.topSurfaceId)throw Error('Finition de matière du plan Anima inconnue ou incompatible.');
        if(s.topPriceKey&&normalized.priceKey!==s.topPriceKey)throw Error('La couleur du plan ne correspond pas au tarif de sa matière.');
        if(selected.basin?.subtype==='integrated'&&selected.basin.prices?.some(entry=>entry.key===normalized.priceKey)&&(s.basinPriceKey||s.basinColor)!==normalized.priceKey)throw Error('La vasque intégrée doit reprendre la finition de son plan.');
        if(surface.customNcs&&(!s.topSurfaceNcs||! /^(?:S\s*)?\d{4}-(?:[YRGB](?:\d{2}[YRGB])?|N)$/i.test(s.topSurfaceNcs)))throw Error('Renseignez un code NCS complet pour la couleur sur mesure.');
      }
      if(s.topSurfaceNcs!==undefined&&(typeof s.topSurfaceNcs!=='string'||s.topSurfaceNcs.length>40))throw Error('Code NCS du plan invalide.');
    } else if(item.type==='column'){
      if(!finishes.has(s.finish)||s.columnModel&&!['pura-column','ribelle-column'].includes(s.columnModel))throw Error('Colonne Anima inconnue.');
    } else if(item.type==='mirror'){
      const mirror=products.get(s.mirrorModel);
      if(!mirror||mirror.category!=='mirror'||s.width!==mirror.width||s.height!==mirror.height)throw Error('Miroir Anima inconnu.');
    }
  }
  if(JSON.stringify(data).length>500000)throw Error('Projet trop volumineux.');
  return {...data,manufacturer:'neobath-anima'};
}
export function encodeProject(data){const valid=validateProject(data),bytes=new TextEncoder().encode(JSON.stringify(valid));let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function decodeProject(text){if(typeof text!=='string'||text.length>700000)throw Error('Lien de projet invalide.');const binary=atob(text.replace(/-/g,'+').replace(/_/g,'/')),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return validateProject(JSON.parse(new TextDecoder().decode(bytes)));}
// The original Studio One v2 shape already stores independent bathroom objects.
// Version-one project data remains readable without changing unrelated scenery.
export function migrateProject(input){const data=clone(input);data.version=2;data.manufacturer='neobath-anima';return data;}
