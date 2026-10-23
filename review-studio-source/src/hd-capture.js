// Keep a single capture transaction. Restoration runs even when a download,
// GPU render or PNG encoder fails, and a second click reuses the same work.
export function createHDCapture({snapshot,prepare,render,restore}){
 let pending=null;
 return function capture(options={}){
  if(pending)return pending;
  pending=(async()=>{
   const previous=snapshot();
   try{await prepare(previous,options);return await render(options);}
   finally{await restore(previous);}
  })().finally(()=>{pending=null;});
  return pending;
 };
}

export function captureSize(width,aspect,maxSize=16384,maxPixels=16777216){
 const requested=Math.max(1920,Math.round(Number(width)||1920));
 let w=requested,h=Math.max(1,Math.round(requested/Math.max(.1,aspect)));
 const scale=Math.min(1,maxSize/w,maxSize/h,Math.sqrt(maxPixels/(w*h)));
 w=Math.max(1,Math.floor(w*scale));h=Math.max(1,Math.floor(h*scale));
 return {width:w,height:h};
}
