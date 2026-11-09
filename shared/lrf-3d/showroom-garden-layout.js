export const GARDEN_LAYOUT=Object.freeze({
 bounds:{minX:14,maxX:35,minZ:-30,maxZ:-2},poolBounds:{minX:22,maxX:30,minZ:-21,maxZ:-11},floorY:.012,
 terrace:{minX:17.6,maxX:33.5,minZ:-24,maxZ:-8},entrance:{x:14,z:-10.7,width:3.2},
 loungers:[19.5,32.3].flatMap((x,side)=>[-13,-16,-19].map(z=>({x,z,rotation:side?-Math.PI/2:Math.PI/2}))),
 tables:[19.3,32.4].flatMap(x=>[-14.5,-17.5].map(z=>({x,z,radius:.28}))),
 parasols:[{x:19.4,z:-16,radius:1.2},{x:32.3,z:-16,radius:1.2}],
 pergola:{x:19.7,z:-5.8,width:6.6,depth:4.4,height:2.65,rotation:0},fountain:{x:18.2,z:-26,radius:1.25},
 plantZones:[{x:15.5,z:-4.1},{x:25.5,z:-3.7},{x:34.1,z:-7.2,species:'ficus'},{x:34.1,z:-21,species:'areca'},{x:34,z:-29.6},{x:28.7,z:-29},{x:24,z:-29},{x:20.5,z:-29},{x:15.6,z:-29},{x:15.4,z:-19.8,species:'ficus'},{x:16,z:-23.1,species:'monstera',height:1.3},{x:34,z:-25.3,species:'monstera',height:1.4}].map(p=>({...p,species:p.species||'olive',height:p.height||3.6,grounded:true}))
});
export function subtractGardenRect(bounds,hole){
 const ix=Math.max(bounds.minX,hole.minX),ax=Math.min(bounds.maxX,hole.maxX),iz=Math.max(bounds.minZ,hole.minZ),az=Math.min(bounds.maxZ,hole.maxZ);
 if(ix>=ax||iz>=az)return [{...bounds}];
 return [{minX:bounds.minX,maxX:bounds.maxX,minZ:bounds.minZ,maxZ:iz},{minX:bounds.minX,maxX:bounds.maxX,minZ:az,maxZ:bounds.maxZ},{minX:bounds.minX,maxX:ix,minZ:iz,maxZ:az},{minX:ax,maxX:bounds.maxX,minZ:iz,maxZ:az}].filter(b=>b.maxX-b.minX>.001&&b.maxZ-b.minZ>.001);
}
