import {isItemPositionLocked} from './position-lock.js';

// Previously saved projects may contain two independent 70 cm cabinets.
// Only offer a shared top when their carcasses, fronts and mounting align.
export function adjoiningCabinets(composition,item){
 if(item?.type!=='cabinet'||item.settings.width!==70||isItemPositionLocked(composition,item))return [];
 const p=item.placement,s=item.settings;
 return composition.items.filter(other=>{
  if(other.id===item.id||other.type!=='cabinet'||other.settings.width!==70||isItemPositionLocked(composition,other))return false;
  const q=other.placement,t=other.settings;
  return s.format===t.format&&s.finish===t.finish&&(s.facadeMode||'overlay')===(t.facadeMode||'overlay')&&
   (!s.tap||!t.tap||s.tap===t.tap)&&p.wall===q.wall&&Math.abs(p.height-q.height)<.1&&
   Math.abs((p.offset||0)-(q.offset||0))<.1&&Math.abs((p.rotation||0)-(q.rotation||0))<.1&&
   Math.abs(Math.abs(p.u-q.u)-70)<=1.01;
 });
}

// Validate and construct the replacement before changing the live composition.
export function joinBasinCabinets(composition,item,other,{topAvailable,makeAsset,itemDimensions,dispose}){
 if(!adjoiningCabinets(composition,item).includes(other))return {error:'Ces caissons ne peuvent pas recevoir un plan commun.'};
 const p=item.placement,s=item.settings,top=topAvailable(s.top,140,s.format)&&!['bare','none'].includes(s.top)?s.top:'tampa';
 const settings={...s,width:140,top,basinLayout:'double',basinColor:top==='tampa'?(s.basinColor==='matte'?'matte':'gloss'):'matte',tap:s.tap||other.settings.tap||null,topDrawer:'siphon'};
 const placement={...p,u:(p.u+other.placement.u)/2},dimensions=itemDimensions('cabinet',settings);
 const error=composition.validate(item,placement,dimensions,composition.items.filter(i=>i!==other));
 if(error)return {error};
 const asset=makeAsset('cabinet',settings),old=item.asset;
 composition.remove(other.id);old.root.removeFromParent();item.root.add(asset.root);
 Object.assign(item,{settings,asset,dimensions,placement,decor:[]});composition.sync(item);
 dispose(old.root);dispose(other.root);return {item};
}
