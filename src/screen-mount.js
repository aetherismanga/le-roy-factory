import * as T from 'three';
export const SCREEN_EDGES=[{id:'left',name:'Bord gauche'},{id:'right',name:'Bord droit'},{id:'front',name:'Bord avant'},{id:'back',name:'Bord contre le mur'}];
export function screenMount(tray,screen,edge=screen.settings.edge||'left',shift=screen.settings.edgeShift||0){
 const td=tray.dimensions,sd=screen.dimensions,p=tray.placement,side=edge==='left'||edge==='right',span=side?td.depth:td.width;
 if(sd.width>span+.001||sd.depth>(side?td.width:td.depth)-.01)return null;
 const along=T.MathUtils.clamp(Number(shift)||0,-(span-sd.width)*50,(span-sd.width)*50)/100,inset=.006,angle={left:90,right:270,front:180,back:0}[edge];if(angle===undefined)return null;
 const x=side?(edge==='left'?-1:1)*(td.width/2-sd.depth/2-inset):along,z=side?along:(edge==='back'?-1:1)*(td.depth/2-sd.depth/2-inset),a=(p.rotation||0)*Math.PI/180;
 return {placement:{wall:p.wall,u:p.u+(Math.cos(a)*x+Math.sin(a)*z)*100,offset:(p.offset||0)+td.depth*50+(-Math.sin(a)*x+Math.cos(a)*z)*100-sd.depth*50,height:td.height*100,rotation:((p.rotation||0)+angle)%360},edge,edgeShift:along*100,trayId:tray.id};
}
export function nearestScreenMount(trays,screen,desired,lockedTray=null){
 const candidates=[];for(const tray of trays){if(lockedTray&&tray.id!==lockedTray)continue;for(const {id:edge}of SCREEN_EDGES){
  // Project the desired centre into the tray's local axes for sliding along
  // one edge; mounting height and the perpendicular coordinate are fixed.
  const a=(tray.placement.rotation||0)*Math.PI/180,du=(desired.u-tray.placement.u)/100,dz=((desired.offset||0)+screen.dimensions.depth*50-(tray.placement.offset||0)-tray.dimensions.depth*50)/100;
  const localX=Math.cos(a)*du-Math.sin(a)*dz,localZ=Math.sin(a)*du+Math.cos(a)*dz,shift=(edge==='left'||edge==='right'?localZ:localX)*100,m=screenMount(tray,screen,edge,shift);if(!m)continue;
  const score=(m.placement.u-desired.u)**2+(m.placement.offset-(desired.offset||0))**2+(desired.wall===tray.placement.wall?0:1e8);candidates.push({...m,score});
 }}return candidates.sort((a,b)=>a.score-b.score)[0]||null;
}
