// Pure geometry checks in metres. The AquaHome profile is supplied by the
// existing renderer's catalogue adapter; this module has no browser/Three.js
// dependency and never treats reconstructed dimensions as certified drilling.
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const fail=reason=>({compatible:false,reason,placements:[]});
export function animaTapDimensions(product,profile){
 if(!product||!['basin','basin-xl'].includes(product.use)||!profile)return null;
 const xl=product.use==='basin-xl',height=xl?profile.xlHeight:profile.height,reach=xl?profile.xlReach:profile.reach;
 if(!finite(height)||!finite(reach)||height<=0||reach<=0)return null;
 const spout=xl?(profile.xlOutlet??height-profile.headGap):(profile.outlet??height-profile.headGap);
 const classic=profile.shape==='classic',tube=['round-tube','knurled'].includes(profile.shape);
 const outletHeight=classic?height-.057:tube?spout:spout-.015,outletReach=classic||tube?reach:reach-.010;
 const baseRadius=classic?.031:['square','swept'].includes(profile.shape)?.0235:(profile.radius??.021)+.004;
 if(![outletHeight,outletReach,baseRadius].every(finite)||outletHeight<=0||outletReach<=0)return null;
 return {height,outletHeight,outletReach,baseRadius,source:'aquahome-renderer-profile',approximate:true};
}
function insideOpening(point,well,margin=0){
 const halfWidth=well.width/2-margin,halfDepth=well.depth/2-margin;
 if(halfWidth<=0||halfDepth<=0)return false;
 const power=well.power??(well.kind==='integrated'?4:2);
 return Math.abs((point.x-well.x)/halfWidth)**power+Math.abs((point.z-well.z)/halfDepth)**power<=1+1e-8;
}
export function checkAnimaTapCompatibility(product,context,profile){
 const dimensions=animaTapDimensions(product,profile);if(!dimensions)return fail('Ce mitigeur ne possède pas de géométrie de pose compatible connue.');
 const {top,holes=[],topOffset=0}=context||{},wells=top?.wells||[];
 if(!top||!wells.length)return fail('Ajoutez une vasque avant de choisir un mitigeur.');
 if(top.tapMount==='wall'||!holes.length)return fail('Cette vasque nécessite un mitigeur mural indépendant.');
 if(holes.length!==wells.length)return fail('Les perçages du plan ne correspondent pas aux cuves.');
 if(![top.width,top.depth,top.topSurface,top.zOffset??0,topOffset].every(finite))return fail('Les cotes de pose du plan ne sont pas disponibles.');
 const actualWells=wells.map(well=>({...well,x:well.x+topOffset,openingCenterX:(well.openingCenterX??well.x)+topOffset,openingCenterZ:well.openingCenterZ??well.z}));
 if(actualWells.some(well=>![well.x,well.z,well.width,well.depth].every(finite)||well.width<=0||well.depth<=0))return fail('Les cotes de la vasque ne sont pas disponibles.');
 const placements=[],used=new Set();
 for(const hole of holes){
  const angle=hole.rotationY??0;if(![hole.x,hole.z,angle].every(finite))return fail('Position de perçage inconnue.');
  const localX=hole.x-topOffset,localZ=hole.z-(top.zOffset??0),edge=.002,mountY=hole.surfaceY??top.topSurface;
  if(!finite(mountY))return fail('La hauteur du perçage n’est pas connue.');
  if(hole.mount==='basin'){const bowl=actualWells[hole.wellIndex??0];if(!bowl||!insideOpening(hole,bowl,dimensions.baseRadius+edge))return fail('L’embase du mitigeur dépasse la plage de la vasque.');}
  else if(Math.abs(localX)+dimensions.baseRadius>top.width/2-edge||Math.abs(localZ)+dimensions.baseRadius>top.depth/2-edge)return fail('L’embase du mitigeur dépasse le bord du plan.');
  // A real circular flange may not overlap the bowl's outside wall. Expanding
  // the source envelope is conservative where an industrial mounting template
  // is unavailable; it never invents a new hole or moves an existing one.
  const openings=actualWells.map(well=>({...well,x:well.openingCenterX,z:well.openingCenterZ,width:well.openingWidth??well.width,depth:well.openingDepth??well.depth,power:well.openingPower??well.power}));
  if((hole.mount==='basin'?openings:actualWells).some(well=>insideOpening(hole,well,-dimensions.baseRadius-.002)))return fail('L’embase du mitigeur touche la vasque.');
  const outlet={x:hole.x+Math.sin(angle)*dimensions.outletReach,z:hole.z+Math.cos(angle)*dimensions.outletReach};
  const index=openings.findIndex((well,index)=>!used.has(index)&&insideOpening(outlet,well,.014));
  if(index<0)return fail('La portée du bec ne permet pas de verser dans la cuve.');
  const well=actualWells[index],rimRise=well.kind==='integrated'?0:well.rimRise??well.height;
  if(!finite(rimRise))return fail('La hauteur du bord de vasque n’est pas connue.');
  if(mountY+dimensions.outletHeight<top.topSurface+rimRise+.020-1e-7)return fail('Le bec du mitigeur est trop bas pour le bord de cette vasque.');
  used.add(index);placements.push({x:hole.x,y:mountY,z:hole.z,rotationY:angle,outlet:{...outlet,y:mountY+dimensions.outletHeight},wellIndex:index});
 }
 return {compatible:true,reason:'',placements,dimensions,approximate:true};
}
