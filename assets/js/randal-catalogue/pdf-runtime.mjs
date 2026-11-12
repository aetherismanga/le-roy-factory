// Reuse the PDF.js library and matching worker already hosted by LRF. The
// catalogue must also open when a browser or a network blocks an external CDN.
let runtimePromise;

async function moduleBlob(name){
 const response=await fetch(new URL('../../vendor/lrf-plan-pose/'+name,import.meta.url));
 if(!response.ok)throw Error('Le lecteur PDF est momentanément indisponible.');
 let bytes=await response.arrayBuffer();
 const signature=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
 // A host may already have decompressed a .gz response through Content-Encoding.
 if(signature[0]===0x1f&&signature[1]===0x8b){
  bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 }
 if(!bytes.byteLength)throw Error('Le lecteur PDF reçu est vide.');
 return new Blob([bytes],{type:'text/javascript'});
}

export function loadPdfRuntime(){
 if(!runtimePromise)runtimePromise=(async()=>{
  const [libraryBlob,workerBlob]=await Promise.all([moduleBlob('pdf.min.mjs.gz'),moduleBlob('pdf.worker.min.mjs.gz')]);
  const libraryURL=URL.createObjectURL(libraryBlob);
  try{
   const library=await import(libraryURL);
   library.GlobalWorkerOptions.workerSrc=URL.createObjectURL(workerBlob);
   return library;
  }finally{URL.revokeObjectURL(libraryURL);}
 })().catch(error=>{runtimePromise=null;throw error;});
 return runtimePromise;
}

export async function openPdfDocument(library,url){
 let task=library.getDocument({url,isEvalSupported:false,rangeChunkSize:131072,disableAutoFetch:true,disableStream:true});
 try{return await task.promise;}
 catch(error){
  await task.destroy();
  // Some networks interrupt or reject HTTP byte ranges. A normal streaming
  // request recovers automatically before showing the retry screen.
  task=library.getDocument({url,isEvalSupported:false,disableRange:true});
  try{return await task.promise;}
  catch(retryError){await task.destroy();throw retryError;}
 }
}
