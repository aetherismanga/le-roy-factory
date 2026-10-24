import allowedURLs from './plan-pose-texture-urls.json' with {type:'json'};
const allowed=new Set(allowedURLs);
const publicOrigin=origin=>['https://leroyfactory.fr','https://www.leroyfactory.fr','https://le-roy-factory.vercel.app'].includes(origin)||/^https:\/\/le-roy-factory-[a-z0-9-]+-hugol-trading\.vercel\.app$/.test(origin);
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
 const origin=String(req.headers.origin||'');if(origin){if(!publicOrigin(origin))return res.status(403).end('Origine non autorisée.');res.setHeader('Access-Control-Allow-Origin',origin);}
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 const requested=new URL(req.url,'https://randal-catalogue-general-3d.vercel.app').searchParams.get('url');
 if(!allowed.has(requested))return res.status(400).end('Référence de texture inconnue.');
 try{
  const response=await fetch(requested,{redirect:'error',signal:AbortSignal.timeout(20000)}),type=response.headers.get('content-type')?.split(';')[0]||'';
  if(!response.ok||!/^image\/(jpeg|png|webp|avif)$/.test(type))return res.status(502).end('Visuel fabricant indisponible.');
  const limit=4*1024*1024;if(Number(response.headers.get('content-length'))>limit){await response.body.cancel();return res.status(413).end('Image trop volumineuse.');}
  const reader=response.body.getReader(),chunks=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();return res.status(413).end('Image trop volumineuse.');}chunks.push(value);}
  res.setHeader('Content-Type',type);res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');return res.status(200).end(Buffer.concat(chunks));
 }catch{return res.status(502).end('Le visuel fabricant n’a pas pu être récupéré.');}
}
