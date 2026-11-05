import {inside} from './room.js';
import * as T from 'three';

export const zonePolygon=z=>[[z.x/100,z.y/100],[(z.x+z.width)/100,z.y/100],[(z.x+z.width)/100,(z.y+z.height)/100],[z.x/100,(z.y+z.height)/100]];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const crosses=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-1e-10&&cross(c,d,a)*cross(c,d,b)<-1e-10;
export function validateZones(surface,zones=[]){
 if(!Array.isArray(zones)||zones.length>16)return 'Maximum 16 zones par surface.';
 const floor=surface.group?.userData.editTarget==='floor';
 for(const z of zones){
  if(!z||!['x','y','width','height'].every(k=>Number.isFinite(z[k]))||z.width<5||z.height<5||z.width>1000||z.height>1000)return 'Dimensions de zone invalides.';
  if(zonePolygon(z).some(p=>!inside(p,surface.polygon))||surface.polygon.some(p=>p[0]>z.x/100+.00001&&p[0]<(z.x+z.width)/100-.00001&&p[1]>z.y/100+.00001&&p[1]<(z.y+z.height)/100-.00001))return 'La zone doit rester dans la surface.';
  if(!floor)for(const other of zones){if(other===z)continue;if(z.x<other.x+other.width-.01&&other.x<z.x+z.width-.01&&z.y<other.y+other.height-.01&&other.y<z.y+z.height-.01)return 'Les zones de carrelage ne peuvent pas se superposer.';}
  for(const o of surface.openings||[])if(z.x/100<o.right&&o.left<(z.x+z.width)/100&&z.y/100<o.top&&o.bottom<(z.y+z.height)/100)return 'Placez la zone entre les ouvertures, ou divisez-la en plusieurs zones.';
  for(const hole of surface.baseHoles||[])if(zonePolygon(z).some(p=>inside(p,hole))||hole.some(p=>inside(p,zonePolygon(z)))||hole.some((a,i)=>zonePolygon(z).some((b,j,p)=>crosses(a,hole[(i+1)%hole.length],b,p[(j+1)%p.length]))))return 'Cette zone empiète sur une cloison.';
 }
 return '';
}

export function zoneProfileSegments(surface,zones){
 const output=[];
 for(const [index,z] of zones.entries()){
  if(!z.profile)continue;const p=zonePolygon(z),covers=zones.slice(index+1).map(zonePolygon);
  for(let i=0;i<4;i++){
   const u=p[i],v=p[(i+1)%4],dx=v[0]-u[0],dy=v[1]-u[1],length=Math.hypot(dx,dy),marks=[0,1];
   for(const cover of covers)for(const point of cover){const t=dx?(point[0]-u[0])/dx:(point[1]-u[1])/dy;if(t>0&&t<1)marks.push(t);}
   marks.sort((a,b)=>a-b);
   for(let j=1;j<marks.length;j++){
    const lo=marks[j-1],hi=marks[j],t=(lo+hi)/2,mid=[u[0]+dx*t,u[1]+dy*t],outside=[mid[0]+dy/length*.001,mid[1]-dx/length*.001];
    if(hi-lo<1e-8||covers.some(c=>inside(mid,c))||!inside(outside,surface.polygon)||(surface.baseHoles||[]).some(h=>inside(outside,h)))continue;
    output.push({id:z.id+'-'+i+'-'+j,a:new T.Vector3(u[0]+dx*lo,u[1]+dy*lo,.006),b:new T.Vector3(u[0]+dx*hi,u[1]+dy*hi,.006),color:z.profileColor||'Argent'});
   }
  }
 }
 return output;
}
