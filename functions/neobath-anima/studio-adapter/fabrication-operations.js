import {PRODUCT_BY_ID} from './anima-data.js';

/** Anima pp.70–74 list MFR separately (66 public HT per tap hole).
 * A factory plan already contains its specified holes. For a custom slab,
 * count the deck holes actually assembled by tops.js, including a hole whose
 * mixer has not yet been selected. A basin's own rear ledge is not the slab. */
export function planFabricationOperations(selection){
 if(!selection?.top?.configurableWidth||!selection.positions?.length)return [];
 let count=0;
 if(selection.integrated)count=selection.wellProfiles?.length||selection.positions.length;
 else if(selection.basin){
  const basin=selection.basin,ref=String(basin.ref||'').toUpperCase();
  const basinMounted=/^ECLISSE114\s*\/\s*S$/.test(ref);
  if(!basinMounted){
   const W=selection.topWidth/100,D=selection.previewDepth/100,x=selection.positions[0]||0,z=selection.positionsZ?.[0]??.020;
   const radius=.017,clearance=.012,edge=.007,w=(basin.width||40)/100,d=(basin.depth||40)/100;
   const rearZ=z-d/2-clearance-radius;
   if(rearZ-radius>=-D/2+edge)count=1;
   else {const side=x>0?-1:1,sideX=x+side*(w/2+clearance+radius);if(Math.abs(sideX)+radius<=W/2-edge)count=1;}
  }
 }
 const product=PRODUCT_BY_ID.get('mfr-accessory');
 return count&&product?[{product,quantity:count,kind:'tap-hole',planReference:selection.top.ref}]:[];
}
