import {resolveUnrealGateway} from './unreal-endpoint.mjs';
const siteOrigins=new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
function cookie(req,name){const item=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));try{return item?decodeURIComponent(item.slice(name.length+1)):'';}catch{return '';}}
export function createUnrealSessionHandler(variant,{endpoint,request=fetch,resolve=resolveUnrealGateway}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
  const origin=req.headers.origin,own='https://'+req.headers.host;
  if(origin&&origin!==own&&!siteOrigins.has(origin))return res.status(403).json({error:'Origine refusée.'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');}
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  try{
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   const app=body.app==='neobath-anima'&&variant==='studio-one'?'neobath-anima':variant;
   if(body.app!==app||JSON.stringify(body).length>2048)return res.status(400).json({error:'Demande de rendu invalide.'});
   const prefix=variant==='studio-one'?'studio_one':'randal_general';
   const bearer=String(req.headers.authorization||'').replace(/^Bearer /,'');
   const token=bearer||(app!=='neobath-anima'?(cookie(req,prefix+'_admin')||cookie(req,prefix+'_pro')):'');
   if(!token)return res.status(401).json({error:'Connectez-vous à votre compte LRF pour utiliser Unreal.'});
   const url=new URL(endpoint||await resolve(request));if(url.protocol!=='https:'||!/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname)||url.username||url.password)throw Error('Gateway unavailable');
   const response=await request(new URL('/session',url),{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({app,aspect:body.aspect}),signal:AbortSignal.timeout(25000)});
   const data=await response.json();
   if(!response.ok)return res.status([400,401,403,429,503].includes(response.status)?response.status:503).json({error:data.error||'Le rendu Unreal est momentanément indisponible.'});
   if(!/^[0-9a-f]{32}$/.test(data.session)||data.apiBase!==url.origin||!data.bridgeUrl?.startsWith(url.origin.replace('https:','wss:')+'/control/')||!data.signallingUrl?.startsWith(url.origin.replace('https:','wss:')+'/video/'))throw Error('Invalid gateway response');
   return res.status(201).json(data);
  }catch{return res.status(503).json({error:'Le PC de rendu est indisponible. Les autres qualités restent accessibles.'});}
 };
}
