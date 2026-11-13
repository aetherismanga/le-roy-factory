'use strict';
const crypto=require('node:crypto');
function publicImageURL(value){try{if(typeof value!=='string'||!value.trim())return '';const u=new URL(value,'https://leroyfactory.fr/');return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
// Images come from server-rebuilt catalogue rows, never request-supplied URLs.
// A slow or unavailable image keeps its canonical link in the complete email.
async function selectionImageAttachments(rows,{fetchImage=fetch,maxBytes=5000000,deadlineMs=12000}={}){
 const attachments=[],unique=new Map(),started=Date.now();let used=0;
 for(const row of rows){row.image=publicImageURL(row.image);if(row.image&&!unique.has(row.image))unique.set(row.image,[]);unique.get(row.image)?.push(row);}
 const entries=[...unique.entries()];
 for(let start=0;start<entries.length&&Date.now()-started<deadlineMs&&used<maxBytes;start+=4){
  const batch=await Promise.all(entries.slice(start,start+4).map(async([url,lines])=>{try{const response=await fetchImage(url,{signal:AbortSignal.timeout(4000),redirect:'error'});if(!response.ok||Number(response.headers.get('content-length'))>1200000)return null;const bytes=Buffer.from(await response.arrayBuffer());if(!bytes.length||bytes.length>1200000)return null;const type=bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'?'png':bytes[0]===0xff&&bytes[1]===0xd8?'jpeg':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':bytes.subarray(0,3).toString()==='GIF'?'gif':null;if(!type)return null;return {url,lines,bytes,type};}catch{return null;}}));
  for(const image of batch){if(!image||used+image.bytes.length>maxBytes)continue;const id=crypto.createHash('sha256').update(image.url).digest('hex').slice(0,20),cid='elios-article-'+id+'@leroyfactory.fr';for(const row of image.lines)row.imageCID=cid;used+=image.bytes.length;attachments.push({filename:'ELIOS-'+id+'.'+(image.type==='jpeg'?'jpg':image.type),content:image.bytes,contentType:'image/'+image.type,cid,contentDisposition:'inline'});}
 }
 return attachments;
}
module.exports={publicImageURL,selectionImageAttachments};
