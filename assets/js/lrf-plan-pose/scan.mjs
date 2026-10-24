import {clone,newRoom,uid,roomError,distance,bounds} from './core.mjs?v=20261024-1';

// Split only partitions that actually join two opposite faces. Partial dividers
// stay as dividers; no room shape is inferred from furniture or text.
export function splitArchitecture(room,scale){
 let rooms=[clone(room)];
 for(const partition of room.partitions||[]){const axis=Math.abs(partition.a[0]-partition.b[0])<.01?0:Math.abs(partition.a[1]-partition.b[1])<.01?1:-1;if(axis<0)continue;
  rooms=rooms.flatMap(r=>{if(r.points.length!==4)return [r];const box=bounds(r.points),low=[box.minX,box.minY],high=[box.maxX,box.maxY],cross=1-axis,p=partition.a[axis],half=partition.thickness/(scale*2),span=[partition.a[cross],partition.b[cross]].sort((a,b)=>a-b);
   if(Math.abs(span[0]-low[cross])>2/scale||Math.abs(span[1]-high[cross])>2/scale||p-half<=low[axis]+20/scale||p+half>=high[axis]-20/scale)return [r];
   return [[low[axis],p-half],[p+half,high[axis]]].map(([a,b],i)=>{const lo=low.slice(),hi=high.slice();lo[axis]=a;hi[axis]=b;const next={...clone(r),id:uid(),name:r.name+' '+(i+1),points:[[lo[0],lo[1]],[hi[0],lo[1]],[hi[0],hi[1]],[lo[0],hi[1]]],openings:[],confirmed:false};next.partitions=(r.partitions||[]).filter(x=>x.id!==partition.id&&[x.a,x.b].every(v=>v[axis]>=a&&v[axis]<=b));return next;});
  });
 }
 return rooms.filter(r=>!roomError(r,scale));
}

// Conservative proposals: an interruption in a dark wall band. Dimensions still
// require review; a symbol alone never changes a measured outline.
export function scanOpenings(rgba,width,height,room,scale){
 const openings=[];for(let wall=0;wall<room.points.length;wall++){
  const a=room.points[wall],b=room.points[(wall+1)%room.points.length],len=distance(a,b),ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len,profile=[];
  for(let u=0;u<len;u++){let ink=0,total=0;for(let n=-6;n<=6;n++){const x=Math.round(a[0]+u*ux-n*uy),y=Math.round(a[1]+u*uy+n*ux);if(x<0||y<0||x>=width||y>=height)continue;const i=(y*width+x)*4;ink+=rgba[i]*.2126+rgba[i+1]*.7152+rgba[i+2]*.0722<155?1:0;total++;}profile.push(total?ink/total:0);}
  if(profile.filter(v=>v>.35).length<profile.length*.45)continue;
  let start=-1;for(let i=0;i<=profile.length;i++){if(i<profile.length&&profile[i]<.22){if(start<0)start=i;}else if(start>=0){const w=(i-start)*scale;if(start*scale>5&&(len-i)*scale>5&&w>=55&&w<=360){const o={id:uid(),type:w>145?'window':'door',kind:w>145?'bay':'door',wall,start:Math.round(start*scale),width:Math.round(w),height:w>145?215:204,sill:0,color:'white',ral:'9016',proposed:true};if(o.height<=room.height)openings.push(o);}start=-1;}}
 }return openings;
}
