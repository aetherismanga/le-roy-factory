import * as T from 'three';
import {inside} from './room.js';
import {renderSurfaceZones} from '../../shared/lrf-3d/zone-rendering.js';
import {disposeObject} from './composition.js';

import {zonePolygon} from '../../shared/lrf-3d/zone-validation.js';
export {zonePolygon,validateZones,zoneProfileSegments} from '../../shared/lrf-3d/zone-validation.js';
// Keep the local furniture-disposal adapter while sharing zone rendering.
export const renderZones=(surface,zones,material,layoutFor)=>renderSurfaceZones(surface,zones,material,layoutFor,disposeObject,zonePolygon);


// Clip joint profiles to the real face, leaving doorways, niches and zones clear.
export function jointProfileSegments(surface,profile){
 const vertical=profile.orientation==='vertical',poly=surface.polygon,holes=[...(surface.holes||[]),...(surface.openings||[]).map(r=>[[r.left,r.bottom],[r.right,r.bottom],[r.right,r.top],[r.left,r.top]]),...(surface.niches||[]).map(n=>zonePolygon({x:n.u-n.width/2,y:n.bottom,width:n.width,height:n.height}))];
 const at=profile.position,values=poly.map(p=>vertical?p[1]:p[0]),cuts=[Math.min(...values),Math.max(...values)];
 for(const contour of [poly,...holes])for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length],aa=vertical?a[0]:a[1],bb=vertical?b[0]:b[1];if(Math.abs(bb-aa)<1e-8)continue;const t=(at-aa)/(bb-aa);if(t>=0&&t<=1)cuts.push((vertical?a[1]:a[0])+t*((vertical?b[1]:b[0])-(vertical?a[1]:a[0])));}
 const sorted=[...new Set(cuts.map(v=>Math.round(v*1e8)/1e8))].sort((a,b)=>a-b),segments=[];
 for(let i=1;i<sorted.length;i++){const low=sorted[i-1],high=sorted[i],mid=vertical?[at,(low+high)/2]:[(low+high)/2,at];if(high-low<.005||!inside(mid,poly)||holes.some(h=>inside(mid,h)))continue;segments.push({id:profile.id+'-'+i,color:profile.color,a:new T.Vector3(vertical?at:low,vertical?low:at,.006),b:new T.Vector3(vertical?at:high,vertical?high:at,.006)});}
 return segments;
}
