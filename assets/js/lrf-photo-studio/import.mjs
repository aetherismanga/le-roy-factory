const TYPES=new Set(['image/jpeg','image/png','image/webp']);
export const WORK_MAX=1100,EXPORT_MAX=2600;
function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
export function fitSize(width,height,maxSide){const s=Math.min(1,maxSide/Math.max(width,height));return {width:Math.max(1,Math.round(width*s)),height:Math.max(1,Math.round(height*s))};}
export async function canvasBlob(value,type='image/jpeg',quality=.95){return new Promise((resolve,reject)=>value.toBlob(blob=>blob?resolve(blob):reject(new Error('Impossible de créer le fichier image.')),type,quality));}
export async function decodeBlob(blob) {
  if(typeof createImageBitmap==='function')try{return await createImageBitmap(blob,{imageOrientation:'from-image'});}catch{/* Safari / decoder fallback below. */}
  const url=URL.createObjectURL(blob),img=new Image();
  try{img.src=url;await img.decode();return img;}finally{URL.revokeObjectURL(url);}
}
export async function importPhoto(file,{signal}={}) {
  if(signal?.aborted)throw new DOMException('Import annulé.','AbortError');
  if(!file || !file.size)throw new Error('Choisissez une photo JPEG, PNG ou WebP.');
  if(/hei[cf]/i.test(file.type)||/\.hei[cf]$/i.test(file.name||''))throw new Error('Cette photo HEIC/HEIF ne peut pas être ouverte ici. Exportez-la au format JPEG depuis votre galerie, puis importez ce JPEG.');
  if(!TYPES.has(file.type))throw new Error('Format non pris en charge. Choisissez une photo JPEG, PNG ou WebP.');
  if(file.size>40*1024*1024)throw new Error('Cette photo dépasse 40 Mo. Exportez une copie réduite en JPEG, puis réessayez.');
  let decoded;
  try{decoded=await decodeBlob(file);}catch{throw new Error('Cette image ne peut pas être lue. Le fichier est peut-être endommagé ; choisissez une autre photo.');}
  try {
    if(signal?.aborted)throw new DOMException('Import annulé.','AbortError');
    const originalWidth=decoded.width||decoded.naturalWidth,originalHeight=decoded.height||decoded.naturalHeight;
    if(!(originalWidth>0&&originalHeight>0)||originalWidth*originalHeight>80000000)throw new Error('La définition de cette photo est trop importante. Importez une copie réduite à moins de 80 mégapixels.');
    const fullSize=fitSize(originalWidth,originalHeight,EXPORT_MAX),workSize=fitSize(fullSize.width,fullSize.height,WORK_MAX);
    const photo=canvas(fullSize.width,fullSize.height),work=canvas(workSize.width,workSize.height);
    photo.getContext('2d').drawImage(decoded,0,0,photo.width,photo.height);
    work.getContext('2d').drawImage(photo,0,0,work.width,work.height);
    // Retain a bounded, correctly oriented source for local resume, rather than the full camera file.
    const sourceBlob=await canvasBlob(photo,'image/png');
    return {sourceBlob,photo,work,originalWidth,originalHeight,reduced:Math.max(originalWidth,originalHeight)>EXPORT_MAX};
  } finally {decoded.close?.();}
}
