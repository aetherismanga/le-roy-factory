import * as T from 'three';
import {PRODUCT_BY_ID} from './anima-data.js';
import {validateProject} from './projects.js';
import {standaloneSelection,standalonePlanSettings,normalizeStandaloneSettings} from './standalone-worktop-data.js';

const mean=values=>values.reduce((sum,value)=>sum+value,0)/(values.length||1);
const rounded=value=>Math.round(value*1000)/1000;
function sourceVariant(settings,product,sourceSettings){
 const key=sourceSettings?.basinPriceKey||sourceSettings?.basinColor;
 if(!product.prices?.some(price=>price.key===key)||product.category==='basin'&&product.subtype==='integrated')return settings;
 const candidate={...settings,basinColor:key,...(product.category==='basin'?{basinPriceKey:key,basinBottom:sourceSettings.basinBottom||'none',basinSupport:sourceSettings.basinSupport===true}:{topPriceKey:key})};
 try{return normalizeStandaloneSettings(candidate);}catch{return settings;}
}
function slabHit(ray,item){
 const root=item.asset?.root,meta=item.asset?.tops?.root?.userData.animaTop;if(!root||!meta)return null;
 root.updateWorldMatrix(true,false);
 const point=root.localToWorld(new T.Vector3(0,meta.topSurface,meta.zOffset)),world=ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-point.y),new T.Vector3());
 if(!world)return null;const local=root.worldToLocal(world.clone());
 if(Math.abs(local.x)>meta.width/2+.015||Math.abs(local.z-meta.zOffset)>meta.depth/2+.015)return null;
 return {item,local,world,meta,distance:world.distanceTo(ray.origin)};
}
function validateCandidate(project,host,settings){
 try{const normalized=normalizeStandaloneSettings(settings),next={...project,items:project.items.map(item=>item.id===host.id?{...item,settings:normalized}:item)};validateProject(next);return normalized;}catch{return null;}
}
/** A basin dropped on an independent slab replaces its basin setting. It never
 * creates a duplicate scene item, stretches a factory reference, or changes
 * the selected material family to force an incompatible installation. */
export function resolveStandaloneBasinDrop({ray,composition,product}){
 const r=ray?.ray||ray,project=product?.project,source=PRODUCT_BY_ID.get(product?.basinId);
 if(!r||!project?.items||!source)return null;
 const hits=(composition?.items||[]).filter(item=>item.type==='worktop').map(item=>slabHit(r,item)).filter(Boolean).sort((a,b)=>a.distance-b.distance);
 if(!hits.length)return null;
 let error='Cette vasque n’est pas compatible avec la matière ou les dimensions de ce plan.';
 for(const hit of hits){
  const host=project.items.find(item=>item.id===hit.item.id);if(!host)continue;
  if(hit.item.locked||composition?.locked){error='Déverrouillez le plan avant d’y intégrer une vasque.';continue;}
  const old=standaloneSelection(host.settings),fixed=source.category==='worktop';
  if(!old?.top||fixed&&!source.compatibleWidths?.includes(host.settings.width)||!fixed&&(!old.top.configurableWidth||!source.compatibleTopIds?.includes(old.top.id)))continue;
  const initial=standalonePlanSettings(host.settings,fixed?source.id:old.top.id,fixed?null:source.id);if(!initial)continue;
  const settings=sourceVariant(initial,source,product.sourceSettings),selected=standaloneSelection(settings);if(!selected)continue;
  const x=mean(selected.positions),z=(selected.previewDepth/200-.23)+mean(selected.positionsZ||selected.positions.map(()=>.02));
  const desired=fixed?settings:{...settings,basinOffsetX:rounded((settings.basinOffsetX||0)+(hit.local.x-x)*100),basinOffsetZ:rounded((settings.basinOffsetZ||0)+(hit.local.z-z)*100)};
  const options=[desired,...(!fixed?[settings]:[])];
  for(const candidate of options){
   const normalized=validateCandidate(project,host,candidate);if(!normalized)continue;
   const actual=standaloneSelection(normalized),cx=mean(actual.positions),cz=actual.previewDepth/200-.23+mean(actual.positionsZ||actual.positions.map(()=>.02));
   if(candidate!==desired&&Math.hypot(cx-hit.local.x,cz-hit.local.z)>.18)continue;
   const point=hit.item.asset.root.localToWorld(new T.Vector3(fixed?0:cx,fixed?0:actual.top.height/100,fixed?actual.previewDepth/200-.23:cz)),rotation=new T.Euler().setFromQuaternion(hit.item.asset.root.getWorldQuaternion(new T.Quaternion()),'YXZ').y;
   return {placement:{...host.placement,animaBasinTarget:host.id,animaBasinSettings:normalized,animaBasinPreview:{x:point.x,y:point.y,z:point.z,rotation}},error:'',options:{basinTargetId:host.id,basinSettings:normalized},item:hit.item,distance:hit.distance};
  }
  error='La cuve doit rester entièrement dans le plan. Rapprochez-la du centre ou augmentez les dimensions du plan.';
 }
 return {placement:null,error,item:hits[0].item,distance:hits[0].distance};
}
/** Keep the nearest visible supporting surface when a pointer ray crosses
 * both a cabinet and an independent wall slab at different heights. */
export function resolveBasinDropWithStandalone(args,cabinetResolver){
 const standalone=resolveStandaloneBasinDrop(args),cabinet=cabinetResolver(args);
 if(!standalone)return cabinet;if(!cabinet?.placement)return standalone;
 const ray=args.ray?.ray||args.ray,hit=slabHit(ray,cabinet.item);
 return !hit||standalone.distance<=hit.distance?standalone:cabinet;
}
