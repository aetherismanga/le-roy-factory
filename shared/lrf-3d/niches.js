import {isNicheProfileFinish} from './niche-profile-options.js';
export function wallSlots(room){
 const slots=room.points.map((a,i)=>({key:'boundary-'+i,length:Math.hypot(room.points[(i+1)%room.points.length][0]-a[0],room.points[(i+1)%room.points.length][1]-a[1]),height:room.height,thickness:10}));
 for(const [i,p] of (room.partitions||[]).entries())for(const side of [0,1])slots.push({key:'partition-'+(p.id||'index-'+i)+'-'+side,length:Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]),height:p.height,thickness:p.thickness,partition:i,side});
 return slots;
}
export function validateNiches(room){
 const list=room.niches||[];if(!Array.isArray(list)||list.length>16)return 'Maximum 16 niches.';
 const slots=wallSlots(room),ids=new Set();
 for(const n of list){
  const wall=n&&slots.find(w=>w.key===n.wallKey);if(!n||typeof n.id!=='string'||!/^niche-[a-z0-9-]{1,70}$/i.test(n.id)||ids.has(n.id)||!wall)return 'Emplacement de niche invalide.';ids.add(n.id);
  if(n.profileEdges!==undefined&&(!n.profileEdges||typeof n.profileEdges!=='object'||Array.isArray(n.profileEdges)||Object.entries(n.profileEdges).some(([edge,color])=>!['left','right','top','bottom'].includes(edge)||color!=='none'&&!isNicheProfileFinish(color))))return 'Profilés de niche invalides.';
  if(n.profileEnabled!==undefined&&typeof n.profileEnabled!=='boolean'||n.profileFinish!==undefined&&!isNicheProfileFinish(n.profileFinish))return 'Profilés de niche invalides.';
  if(n.locked!==undefined&&typeof n.locked!=='boolean'||n.positionUnlocked!==undefined&&typeof n.positionUnlocked!=='boolean')return 'Verrouillage de niche invalide.';
  if(n.covering!==undefined){const c=n.covering;if(!c||!['inherit','all','split'].includes(c.mode))return 'Revêtement de niche invalide.';for(const f of c.mode==='split'?[c.back,c.reveal]:c.mode==='all'?[c.back]:[]){if(!f||['collection','color','format'].some(k=>typeof f[k]!=='string'||!f[k]||f[k].length>160))return 'Référence de carrelage de niche invalide.';}}
  if(!['u','bottom','width','height','depth'].every(k=>Number.isFinite(n[k])))return 'Dimensions de niche invalides.';
  if(n.width<10||n.height<10||n.width>200||n.height>200||n.bottom<2||n.bottom+n.height>wall.height-2||n.u-n.width/2<2||n.u+n.width/2>wall.length-2)return 'La niche doit rester à 2 cm des bords du mur.';
  if(n.depth<2||n.depth>wall.thickness-2)return 'Profondeur maximale : '+(wall.thickness-2)+' cm. Augmentez l’épaisseur de la cloison pour une niche plus profonde.';
  for(const other of list){if(wall.partition!==undefined&&other!==n){const ow=slots.find(w=>w.key===other?.wallKey);if(ow?.partition===wall.partition&&ow.side!==wall.side&&Math.abs(n.u-(wall.length-other.u))<(n.width+other.width)/2&&n.bottom<other.bottom+other.height&&other.bottom<n.bottom+n.height&&n.depth+other.depth>wall.thickness-2)return 'Les profondeurs des niches opposées se croisent.';}if(other===n||other.wallKey!==n.wallKey)continue;if(Math.abs(n.u-other.u)<(n.width+other.width)/2+2&&n.bottom<other.bottom+other.height+2&&other.bottom<n.bottom+n.height+2)return 'Laissez 2 cm entre les niches.';}
 }
 return '';
}
export function nicheRect(n){return {left:(n.u-n.width/2)/100,right:(n.u+n.width/2)/100,bottom:n.bottom/100,top:(n.bottom+n.height)/100};}

// The back may share its tile with all reveals, or use a separate tile.
// Legacy niches inherit the wall until the user chooses their own finish.
export function nicheSurfaceFinish(niche,part,wallFinish={}){
 const covering=niche?.covering;if(!covering||covering.mode==='inherit')return wallFinish;
 return covering.mode==='split'&&part!=='back'?covering.reveal||wallFinish:covering.back||wallFinish;
}
export function collectNicheFinishes(config){
 return (config?.niches||[]).flatMap(n=>n.covering?.mode==='all'?[n.covering.back]:n.covering?.mode==='split'?[n.covering.back,n.covering.reveal]:[]).filter(Boolean);
}
