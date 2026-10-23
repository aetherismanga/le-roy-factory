// Dimension annotations are laid out once, after every room has been painted.
// This keeps grouped/nested room fills from covering their neighbours' labels.
const overlaps=(a,b,gap=0)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+gap&&Math.abs(a.y-b.y)<(a.height+b.height)/2+gap;
export function layoutDimensions(items,{scale,viewport,reserved=[]}){
 const used=reserved.map(b=>({...b})),result=[],seen=new Set(),padding=5*scale;
 for(const item of [...items].sort((a,b)=>(b.priority||0)-(a.priority||0))){if(item.key&&seen.has(item.key))continue;if(item.key)seen.add(item.key);const {width,height}=item,origin={x:item.x,y:item.y},normal=item.normal||[0,-1],tangent=[-normal[1],normal[0]],candidates=[];
 for(let ring=0;ring<28;ring++)for(const shift of ring===0?[0]:[0,1,-1,2,-2]){const d=ring*(height+9*scale),along=shift*Math.max(width*.65,30*scale),x=origin.x+normal[0]*d+tangent[0]*along,y=origin.y+normal[1]*d+tangent[1]*along;candidates.push({x:Math.max(viewport.x+width/2+padding,Math.min(viewport.x+viewport.w-width/2-padding,x)),y:Math.max(viewport.y+height/2+padding,Math.min(viewport.y+viewport.h-height/2-padding,y)),width,height});}
 let box=candidates.find(b=>!used.some(q=>overlaps(b,q,padding)));if(!box){for(let y=viewport.y+height/2+padding;y<viewport.y+viewport.h-height/2;y+=height+padding){for(let x=viewport.x+width/2+padding;x<viewport.x+viewport.w-width/2;x+=width+padding){const b={x,y,width,height};if(!used.some(q=>overlaps(b,q,padding))){box=b;break;}}if(box)break;}}
 box ||= candidates[0];used.push(box);result.push({...item,...box,origin});
 }return result;
}
export function rectangularRoom(room){if(room.points.length!==4)return false;return room.points.every((a,i)=>{const b=room.points[(i+1)%4],c=room.points[(i+2)%4],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]];return Math.abs(u[0]*v[0]+u[1]*v[1])<Math.hypot(...u)*Math.hypot(...v)*1e-6;});}
export function assemblyDimensionKey(room,index){const a=room.points[index],b=room.points[(index+1)%room.points.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);let u=[(b[0]-a[0])/len,(b[1]-a[1])/len];if(u[0]<-1e-8||Math.abs(u[0])<1e-8&&u[1]<0)u=u.map(v=>-v);const extents=[a,b].map(p=>p[0]*u[0]+p[1]*u[1]).sort((a,b)=>a-b);return [room.groupId,...u,...extents].map(v=>typeof v==='number'?v.toFixed(5):v).join('|');}
