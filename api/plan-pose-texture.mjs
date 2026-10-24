import {readFileSync} from 'node:fs';
// Manufacturer images do not expose CORS headers. Only exact catalogue URLs
// can pass through this same-origin endpoint; it never forwards credentials.
const catalogue=JSON.parse(readFileSync(new URL('../assets/js/lrf-plan-pose/catalogue.json',import.meta.url),'utf8'));
const review=JSON.parse(readFileSync(new URL('../assets/js/lrf-plan-pose/catalogue-review.json',import.meta.url),'utf8'));
const allowed=new Set([...catalogue.products,...review.products,...Object.values(review.previews)].map(p=>p.preview).filter(u=>typeof u==='string'&&/^https:\/\/eliosceramica\.com\/wp-content\/uploads\//.test(u)));
export const maxDuration=30;
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 const requested=new URL(req.url,'https://leroyfactory.fr').searchParams.get('url');
 if(!allowed.has(requested))return res.status(400).end('Référence de texture inconnue.');
 try{
  const response=await fetch(requested,{redirect:'error',signal:AbortSignal.timeout(20000)}),type=response.headers.get('content-type')?.split(';')[0]||'';
  if(!response.ok||!/^image\/(jpeg|png|webp|avif)$/.test(type))return res.status(502).end('Visuel fabricant indisponible.');
  const limit=4*1024*1024;if(Number(response.headers.get('content-length'))>limit){await response.body.cancel();return res.status(413).end('Image trop volumineuse.');}
  const reader=response.body.getReader(),chunks=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();return res.status(413).end('Image trop volumineuse.');}chunks.push(value);}
  res.setHeader('Content-Type',type);res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).end(Buffer.concat(chunks));
 }catch{return res.status(502).end('Le visuel fabricant n’a pas pu être récupéré.');}
}
