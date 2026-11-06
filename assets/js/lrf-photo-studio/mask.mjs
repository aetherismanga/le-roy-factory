/** One byte per photo pixel; 0 preserves the original, 255 replaces the floor. */
export function createMask(width,height,data) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('Dimensions du masque invalides.');
  if(data && data.length!==width*height)throw new Error('Taille du masque incohérente.');
  return {width,height,data:data?new Uint8ClampedArray(data):new Uint8ClampedArray(width*height)};
}
export function resampleMask(mask,width,height) {
  const out=createMask(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)out.data[y*width+x]=mask.data[Math.min(mask.height-1,Math.floor(y*mask.height/height))*mask.width+Math.min(mask.width-1,Math.floor(x*mask.width/width))];
  return out;
}
export function brushStroke(mask,from,to,radius,mode='add') {
  const distance=Math.hypot(to.x-from.x,to.y-from.y), steps=Math.max(1,Math.ceil(distance/Math.max(1,radius*.3)));
  radius=Math.max(1,radius);
  for(let s=0;s<=steps;s++) {
    const cx=from.x+(to.x-from.x)*s/steps,cy=from.y+(to.y-from.y)*s/steps;
    const x0=Math.max(0,Math.floor(cx-radius-1)),x1=Math.min(mask.width-1,Math.ceil(cx+radius+1)),y0=Math.max(0,Math.floor(cy-radius-1)),y1=Math.min(mask.height-1,Math.ceil(cy+radius+1));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const coverage=Math.max(0,Math.min(1,radius+.5-Math.hypot(x+.5-cx,y+.5-cy)));
      const i=y*mask.width+x;
      mask.data[i]=mode==='remove'?Math.min(mask.data[i],Math.round((1-coverage)*255)):Math.max(mask.data[i],Math.round(coverage*255));
    }
  }
  return mask;
}
export function fillContour(mask,points,mode='add') {
  if(points.length<3)throw new Error('Placez au moins trois points autour du sol.');
  // Scanline fill in photo coordinates: no dependency on viewport size or zoom.
  const minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))),maxY=Math.min(mask.height-1,Math.ceil(Math.max(...points.map(p=>p.y))));
  for(let y=minY;y<=maxY;y++) {
    const yy=y+.5,crossings=[];
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length];
      if((a.y<=yy&&b.y>yy)||(b.y<=yy&&a.y>yy))crossings.push(a.x+(yy-a.y)*(b.x-a.x)/(b.y-a.y));
    }
    crossings.sort((a,b)=>a-b);
    for(let i=0;i+1<crossings.length;i+=2)for(let x=Math.max(0,Math.ceil(crossings[i]-.5));x<Math.min(mask.width,Math.ceil(crossings[i+1]-.5));x++)mask.data[y*mask.width+x]=mode==='remove'?0:255;
  }
  return mask;
}
export function maskCoverage(mask){return mask.data.reduce((sum,n)=>sum+(n>127),0)/mask.data.length;}
export class MaskHistory {
  constructor(limit=20){this.limit=limit;this.past=[];this.future=[];}
  push(mask){this.past.push(new Uint8ClampedArray(mask.data));if(this.past.length>this.limit)this.past.shift();this.future=[];}
  undo(mask){if(!this.past.length)return false;this.future.push(new Uint8ClampedArray(mask.data));mask.data.set(this.past.pop());return true;}
  redo(mask){if(!this.future.length)return false;this.past.push(new Uint8ClampedArray(mask.data));mask.data.set(this.future.pop());return true;}
}
