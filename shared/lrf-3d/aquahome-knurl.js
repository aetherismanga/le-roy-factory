import {BufferGeometry,Float32BufferAttribute,Vector3} from 'three';

// Raised diamond facets, with outward winding. The manufacturer photograph
// shows machined metal over the entire side of the Flip handle, not painted
// lines or a second finish. The top and bottom remain separate smooth caps.
export function diamondKnurlGeometry(radius,height,{columns=64,rows=Math.max(7,Math.round(height/.0043)),relief=.00022}={}){
 const positions=[],pitch=Math.PI*2/columns,step=height/rows,half=height/2;
 const clip=(polygon,bound,keepAbove)=>{
  const result=[];
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],insideA=keepAbove?a[1]>=bound:a[1]<=bound,insideB=keepAbove?b[1]>=bound:b[1]<=bound;
   if(insideA)result.push(a);
   if(insideA!==insideB){const t=(bound-a[1])/(b[1]-a[1]);result.push([a[0]+(b[0]-a[0])*t,bound]);}
  }
  return result;
 };
 const point=(angle,y,r)=>new Vector3(Math.sin(angle)*r,y,Math.cos(angle)*r);
 for(let row=0;row<=rows*2;row++)for(let column=0;column<columns;column++){
  const angle=(column+(row%2)*.5)*pitch,y=-half+row*step/2;
  let polygon=[[angle,y-step/2],[angle+pitch/2,y],[angle,y+step/2],[angle-pitch/2,y]];
  polygon=clip(clip(polygon,-half,true),half,false);
  const peak=point(angle,y,radius+(row===0||row===rows*2?0:relief));
  for(let i=0;i<polygon.length;i++){
   const a=point(...polygon[i],radius),b=point(...polygon[(i+1)%polygon.length],radius);
   const normal=a.clone().sub(peak).cross(b.clone().sub(peak));
   // Clipped diamonds meet the cap with no horizontal or degenerate faces.
   if(normal.lengthSq()<1e-20||Math.abs(a.y-peak.y)<1e-9&&Math.abs(b.y-peak.y)<1e-9)continue;
   positions.push(...peak.toArray(),...a.toArray(),...b.toArray());
  }
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
 geometry.userData={pattern:'diamond-knurl',columns,rows,relief};return geometry;
}
