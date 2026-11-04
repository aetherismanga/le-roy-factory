import {animaWellLayout} from './top-profiles.js';
import {animaVesselProfile} from './vessel-profile-data.js';

export const TAP_MODES=Object.freeze(['auto','manual','none']);
export function normalizeTapDrilling(options={}){
 const tapMode=options.tapMode===undefined?'auto':options.tapMode,tapWallIds=options.tapWallIds===undefined?[]:options.tapWallIds;
 if(!TAP_MODES.includes(tapMode)||!Array.isArray(tapWallIds)||tapWallIds.length>2||tapWallIds.some(id=>id!==null&&(typeof id!=='string'||!id.trim()||id.length>120)))throw Error('Mode de pose ou association du mitigeur invalide.');
 return {tapMode,tapWallIds:[...tapWallIds]};
}
export const tapDrillingKey=settings=>{const s=normalizeTapDrilling(settings);return JSON.stringify([s.tapMode,s.tapWallIds]);};
export function tapHoleActive(selection,index){const s=normalizeTapDrilling(selection);return s.tapMode!=='none'&&!s.tapWallIds[index];}

/** The same pure pose is used by the real mesh, compatibility and quotation.
 * Published stock/ledge holes stay physical when their deck mixer is removed:
 * a wall mixer cannot manufacture a new unperforated factory SKU. */
export function planTapContext(selection,{surfaceY=0,cabinetDepth=(selection?.referenceDepth??46.2)/100}={}){
 const drilling=normalizeTapDrilling(selection||{}),top=selection?.top,basin=selection?.basin;
 if(!top)return {top:null,holes:[],candidateHoles:[],physicalHoles:[]};
 const W=selection.topWidth/100,H=top.height/100,D=(selection.previewDepth??top.depth??46.2)/100,Z=cabinetDepth/2-.23+(selection.previewDepth-(selection.referenceDepth??selection.previewDepth))/200;
 const description={productId:top.id,reference:top.ref,width:W,height:H,depth:D,surfaceY,topSurface:surfaceY+H,zOffset:Z,wells:[],tapHoles:[],tapCandidates:[],retainedFactoryTapHoles:[],factoryPreDrilled:false,...drilling};
 if(selection.integrated){
  const wells=selection.wellProfiles||animaWellLayout(selection)||[];
  for(const [wellIndex,well]of wells.entries()){
   description.wells.push({...well,z:Z+well.z,wellIndex,kind:'integrated'});
   description.tapCandidates.push({x:well.tapX,z:Z+well.tapZ,radius:well.tapRadius,rotationY:0,wellIndex,mount:'deck',factoryPreDrilled:!top.configurableWidth});
  }
 }else if(basin){
  const profile=animaVesselProfile(basin),x=selection.positions?.[0]??0,z=selection.positionsZ?.[0]??.020,semi=basin.subtype==='semi-recessed',rimRise=semi?.025:profile.height;
  description.wells.push({x,z:Z+z,width:profile.width,depth:profile.depth,power:profile.power,openingWidth:profile.openingWidth,openingDepth:profile.openingDepth,openingCenterX:x,openingCenterZ:Z+z+profile.openingOffsetZ,height:basin.height==null?null:basin.height/100,rimRise,recessDepth:semi?Math.max(0,profile.height-.025):0,wellIndex:0,kind:semi?'semi-recessed':'countertop',reconstruction:profile.reconstruction});
  const radius=.017,clearance=.012,edge=.007,rearZ=z-profile.depth/2-clearance-radius;
  let tap=profile.tap?{...profile.tap,x:x+profile.tap.x,z:z+profile.tap.z,rotationY:0,surfaceY:surfaceY+H+rimRise,wellIndex:0,factoryPreDrilled:true}:rearZ-radius>=-D/2+edge?{x,z:rearZ,radius,rotationY:0,wellIndex:0,mount:'deck',factoryPreDrilled:!top.configurableWidth}:null;
  if(!tap){const side=x>0?-1:1,sideX=x+side*(profile.width/2+clearance+radius);if(Math.abs(sideX)+radius<=W/2-edge)tap={x:sideX,z,radius,rotationY:side>0?-Math.PI/2:Math.PI/2,wellIndex:0,mount:'deck',factoryPreDrilled:!top.configurableWidth};}
  if(tap)description.tapCandidates.push({...tap,z:Z+tap.z});
 }
 description.tapHoles=description.tapCandidates.filter(hole=>tapHoleActive(selection,hole.wellIndex));
 description.retainedFactoryTapHoles=description.tapCandidates.filter(hole=>hole.factoryPreDrilled&&!tapHoleActive(selection,hole.wellIndex));
 description.factoryPreDrilled=description.tapCandidates.some(hole=>hole.factoryPreDrilled);
 description.tapHolesPhysical=description.tapCandidates.filter(hole=>hole.factoryPreDrilled||tapHoleActive(selection,hole.wellIndex));
 const wallCount=description.wells.filter(well=>drilling.tapWallIds[well.wellIndex]).length;
 description.tapMount=description.tapHoles.length?(wallCount?'mixed':description.tapHoles[0].mount||'deck'):description.wells.length?'wall':null;
 return {top:description,holes:description.tapHoles,candidateHoles:description.tapCandidates,physicalHoles:description.tapHolesPhysical};
}
