import * as T from 'three';
import {createSurface,inside} from './room.js';
import {disposeObject} from './composition.js';

export const zonePolygon=z=>[[z.x/100,z.y/100],[(z.x+z.width)/100,z.y/100],[(z.x+z.width)/100,(z.y+z.height)/100],[z.x/100,(z.y+z.height)/100]];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const crosses=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-1e-10&&cross(c,d,a)*cross(c,d,b)<-1e-10;
export function validateZones(surface,zones=[]){
 if(!Array.isArray(zones)||zones.length>16)return 'Maximum 16 zones par surface.';
 for(const z of zones){if(!z||!['x','y','width','height'].every(k=>Number.isFinite(z[k]))||z.width<5||z.height<5||z.width>1000||z.height>1000)return 'Dimensions de zone invalides.';
  if(zonePolygon(z).some(p=>!inside(p,surface.polygon))||surface.polygon.some(p=>p[0]>z.x/100+.00001&&p[0]<(z.x+z.width)/100-.00001&&p[1]>z.y/100+.00001&&p[1]<(z.y+z.height)/100-.00001))return 'La zone doit rester dans la surface.';
  for(const other of zones){if(other===z)continue;if(z.x<other.x+other.width-.01&&other.x<z.x+z.width-.01&&z.y<other.y+other.height-.01&&other.y<z.y+z.height-.01)return 'Les zones de carrelage ne peuvent pas se superposer.';}
  for(const o of surface.openings||[]){if(z.x/100<o.right&&o.left<(z.x+z.width)/100&&z.y/100<o.top&&o.bottom<(z.y+z.height)/100)return 'Placez la zone entre les ouvertures, ou divisez-la en plusieurs zones.';}
  for(const n of surface.niches||[]){if(z.x<n.u+n.width/2&&n.u-n.width/2<z.x+z.width&&z.y<n.bottom+n.height&&n.bottom<z.y+z.height)return 'Divisez la zone pour conserver le creux de la niche.';}
  for(const hole of surface.baseHoles||[]){if(zonePolygon(z).some(p=>inside(p,hole))||hole.some(p=>inside(p,zonePolygon(z)))||hole.some((a,i)=>zonePolygon(z).some((b,j,p)=>crosses(a,hole[(i+1)%hole.length],b,p[(j+1)%p.length]))))return 'Cette zone empiète sur une cloison.';}
 }
 return '';
}
export function renderZones(surface,zones,material,layoutFor){
 const signature=JSON.stringify(zones);if(surface.zoneSignature!==signature){
  for(const z of surface.decorativeZones||[]){z.group.removeFromParent();disposeObject(z.group);}surface.decorativeZones=[];surface.zoneSignature=signature;
  surface.setExtraHoles(zones.map(zonePolygon));
  for(const z of zones){const face=createSurface([[0,0],[z.width/100,0],[z.width/100,z.height/100],[0,z.height/100]],'Zone_'+z.id);face.group.position.set(z.x/100,z.y/100,.001);face.group.userData.editTarget='zone:'+z.id;face.zone=z;face.setLayout(layoutFor(z));surface.group.add(face.group);surface.decorativeZones.push(face);}
 }
 for(const face of surface.decorativeZones||[]){material(face,face.zone);face.grout.material.color.set(face.zone.groutColor||'#d5d0c3');}
 return surface.decorativeZones||[];
}
export function zoneProfileSegments(surface,zones){const output=[];for(const z of zones){if(!z.profile)continue;const p=zonePolygon(z);for(let i=0;i<4;i++){const u=p[i],v=p[(i+1)%4],dx=v[0]-u[0],dy=v[1]-u[1],length=Math.hypot(dx,dy),outside=[(u[0]+v[0])/2+dy/length*.001,(u[1]+v[1])/2-dx/length*.001];if(!inside(outside,surface.polygon)||(surface.baseHoles||[]).some(h=>inside(outside,h)))continue;const a=new T.Vector3(...u,.006),b=new T.Vector3(...v,.006);output.push({id:z.id+'-'+i,a,b,color:z.profileColor||'Argent'});}}return output;}

// Clip joint profiles to the real face, leaving doorways, niches and zones clear.
export function jointProfileSegments(surface,profile){
 const vertical=profile.orientation==='vertical',poly=surface.polygon,holes=[...(surface.holes||[]),...(surface.openings||[]).map(r=>[[r.left,r.bottom],[r.right,r.bottom],[r.right,r.top],[r.left,r.top]]),...(surface.niches||[]).map(n=>zonePolygon({x:n.u-n.width/2,y:n.bottom,width:n.width,height:n.height}))];
 const at=profile.position,values=poly.map(p=>vertical?p[1]:p[0]),cuts=[Math.min(...values),Math.max(...values)];
 for(const contour of [poly,...holes])for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length],aa=vertical?a[0]:a[1],bb=vertical?b[0]:b[1];if(Math.abs(bb-aa)<1e-8)continue;const t=(at-aa)/(bb-aa);if(t>=0&&t<=1)cuts.push((vertical?a[1]:a[0])+t*((vertical?b[1]:b[0])-(vertical?a[1]:a[0])));}
 const sorted=[...new Set(cuts.map(v=>Math.round(v*1e8)/1e8))].sort((a,b)=>a-b),segments=[];
 for(let i=1;i<sorted.length;i++){const low=sorted[i-1],high=sorted[i],mid=vertical?[at,(low+high)/2]:[(low+high)/2,at];if(high-low<.005||!inside(mid,poly)||holes.some(h=>inside(mid,h)))continue;segments.push({id:profile.id+'-'+i,color:profile.color,a:new T.Vector3(vertical?at:low,vertical?low:at,.006),b:new T.Vector3(vertical?at:high,vertical?high:at,.006)});}
 return segments;
}
