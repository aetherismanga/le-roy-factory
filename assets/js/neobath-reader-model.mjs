// Pure navigation and memory limits shared by the two protected PDF readers.
export function clampPage(value,total){
 const maximum=Number.isFinite(Number(total))?Math.max(1,Math.floor(Number(total))):1;
 const number=Number(value);return Math.max(1,Math.min(maximum,Number.isFinite(number)?Math.round(number):1));
}
export function swipeStep({startX,startY,endX,endY,zoom=1,multiTouch=false}){
 if(multiTouch||zoom>1.05||![startX,startY,endX,endY].every(Number.isFinite))return 0;
 const dx=endX-startX,dy=endY-startY;
 return Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.6?(dx<0?1:-1):0;
}
export function fitPageScale({pageWidth,pageHeight=pageWidth,frameWidth,frameHeight,zoom=1}){
 if(!(pageWidth>0))return 1;
 const width=Math.max(1,frameWidth-24),height=Math.max(1,frameHeight-24);
 return Math.max(.001,Math.min(1,width/pageWidth,height/pageHeight)*zoom);
}
export function pixelRatio({width,height,dpr=1,maxPixels=3000000}){
 return Math.max(Number.MIN_VALUE,Math.min(Number.isFinite(dpr)&&dpr>0?dpr:1,2,Math.sqrt(maxPixels/Math.max(1,width*height))));
}
export function createBoundedCache(limit,onEvict=()=>{}){
 const entries=new Map(),capacity=Math.max(1,Math.floor(limit)||1);
 return {get size(){return entries.size;},get(key){if(!entries.has(key))return;const value=entries.get(key);entries.delete(key);entries.set(key,value);return value;},set(key,value){if(entries.has(key)){const old=entries.get(key);entries.delete(key);if(old!==value)onEvict(old,key);}entries.set(key,value);while(entries.size>capacity){const oldest=entries.keys().next().value,old=entries.get(oldest);entries.delete(oldest);onEvict(old,oldest);}return value;},clear(){for(const [key,value] of entries)onEvict(value,key);entries.clear();}};
}
