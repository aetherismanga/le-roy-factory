import {createDecipheriv} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
const ADMINS=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const FIREBASE_KEY='AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is';
const PRO_SESSION_URL='https://us-central1-le-roy-factory.cloudfunctions.net/validateProSession';
const CLIENT_TARIFF_PARTNERS=Object.freeze(['elios-ceramica','view-ceramica']);
const MAX_BYTES=2*1024*1024;
const ALLOWED_ORIGINS=new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr','https://le-roy-factory.vercel.app','https://randal-catalogue-general-3d.vercel.app']);
let cacheKey='',cacheValue=null;

export const normaliseTariffSlug=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function tariffKey(slug,format){
 const value=String(format||'').replaceAll(',','.').replace(/[×*]/g,'x');
 const match=value.match(/\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?/i);
 return normaliseTariffSlug(slug)+'|'+(match?match[0].replace(/\s/g,'').toLowerCase():normaliseTariffSlug(value))+'|'+(/20\s*mm/i.test(value)?'20':'standard');
}

export function decodeAgentTariffs(envelope,key){
 if(typeof key!=='string'||!/^[0-9a-f]{64}$/i.test(key)||!envelope||envelope.version!==1||envelope.algorithm!=='A256GCM'||envelope.variant!=='site-agent-tariffs')throw Error('Agent tariffs unavailable');
 const field=(name,length)=>{const v=envelope[name];if(typeof v!=='string'||v.length>MAX_BYTES*2||!/^[A-Za-z0-9+/]+={0,2}$/.test(v))throw Error('Invalid encrypted tariffs');const b=Buffer.from(v,'base64');if(b.toString('base64')!==v||length&&b.length!==length)throw Error('Invalid encrypted tariffs');return b;};
 const ciphertext=field('ciphertext'),iv=field('iv',12),tag=field('tag',16);if(ciphertext.length>MAX_BYTES)throw Error('Invalid encrypted tariffs');
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);decipher.setAAD(Buffer.from('lrf-agent-tariffs/v1'));decipher.setAuthTag(tag);
 const clear=Buffer.concat([decipher.update(ciphertext),decipher.final()]);if(clear.length>MAX_BYTES)throw Error('Invalid encrypted tariffs');
 const data=JSON.parse(clear.toString('utf8'));
 if(data.version!==1||!Array.isArray(data.view)||data.view.length>10000||!data.elios||typeof data.elios!=='object'||Array.isArray(data.elios)||Object.keys(data.elios).length>10000)throw Error('Invalid agent tariffs');
 return data;
}

export function readAgentTariffs(url){
 const key=process.env.LRF_AGENT_TARIFFS_KEY||'';
 if(key!==cacheKey){cacheKey=key;cacheValue=null;}
 if(cacheValue)return cacheValue;
 if(!key)return null;
 try{if(statSync(url).size>MAX_BYTES*2)throw Error('Unavailable');cacheValue=decodeAgentTariffs(JSON.parse(readFileSync(url,'utf8')),key);return cacheValue;}catch{return null;}
}

// Google accounts:lookup validates the ID token. Identity is then checked
// against the verified allowlisted account and the live revocation timestamp.
export async function verifyAgentToken(header,{request=fetch,now=Date.now()}={}){
 const match=String(header||'').match(/^Bearer\s+([A-Za-z0-9_.-]{20,8192})$/i);if(!match)return null;
 const token=match[1];let claims;
 try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}catch{return null;}
 if(claims.aud!=='le-roy-factory'||claims.iss!=='https://securetoken.google.com/le-roy-factory'||typeof claims.sub!=='string'||!claims.sub||!Number.isFinite(claims.exp)||claims.exp<=now/1000||!Number.isFinite(claims.auth_time)||claims.email_verified!==true)return null;
 const email=String(claims.email||'').trim().toLowerCase();if(!ADMINS.has(email))return null;
 try{
  const response=await request('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)return null;
  const user=(await response.json()).users?.[0];
  if(!user||user.disabled||user.emailVerified!==true||user.localId!==claims.sub||String(user.email||'').trim().toLowerCase()!==email||!Number.isFinite(claims.auth_time)||claims.auth_time<Number(user.validSince||0))return null;
  return {uid:user.localId,email};
 }catch{return null;}
}

// Reuse the existing Firebase session authority. It checks the opaque token's
// hash, expiry/revocation and current client record, including live permissions.
// Browser-supplied customer IDs, roles and partner lists are never authoritative.
export async function verifyClientToken(token,{request=fetch,now=Date.now()}={}){
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 let response,data;
 try{
  response=await request(PRO_SESSION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken:token}),signal:AbortSignal.timeout(10000)});
  if(response.status===401||response.status===403||response.status===404)return null;
  if(!response.ok)throw Error();
  data=await response.json();
 }catch{throw Error('Professional session verification unavailable');}
 const client=data?.client;
 if(data?.success!==true||!Number.isFinite(data.expiresAt)||data.expiresAt<=now||!client||!/^LRF-\d{5}$/.test(client.codeClient||'')||client.codeClient==='LRF-00001'||!/^(?:\d{2,3}|2A|2B)$/.test(client.departement||'')||!Array.isArray(client.partenaires)||client.partenaires.length>100||client.partenaires.some(p=>typeof p!=='string'||p.length>120))return null;
 const partners=new Set(client.partenaires.map(normaliseTariffSlug));
 const allowedPartners=CLIENT_TARIFF_PARTNERS.filter(partner=>[normaliseTariffSlug(partner),partner==='elios-ceramica'?'elios':'view'].some(alias=>partners.has(alias)));
 return {allowedPartners,expiresAt:data.expiresAt};
}

export function createAgentTariffsHandler({verify=verifyAgentToken,verifyClient=verifyClientToken,read}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('Vary','Authorization, Origin');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers?.origin,host=String(req.headers?.host||'');
  if(origin&&!ALLOWED_ORIGINS.has(origin)&&!(!process.env.VERCEL&&origin==='http://'+host&&/^(localhost|127\.0\.0\.1)(?::\d+)?$/.test(host)))return res.status(403).json({success:false,error:'Origine non autorisée.'});
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>2048)throw Error();}catch{return res.status(400).json({success:false,error:'Requête invalide.'});}
  if(!['bootstrap','document'].includes(body.action))return res.status(400).json({success:false,error:'Action inconnue.'});
  const agent=await verify(req.headers?.authorization);
  // Confidential agent documents remain exclusive to the verified agent path.
  if(body.action==='document'&&!agent)return res.status(401).json({success:false,error:'Connexion à un compte agent vérifié requise.'});
  let client=null;
  if(!agent){
   try{client=await verifyClient(body.sessionToken);}catch{return res.status(503).json({success:false,error:'Vérification de la session professionnelle momentanément indisponible.'});}
   if(!client)return res.status(401).json({success:false,error:'Session professionnelle expirée ou connexion requise.'});
   if(!client.allowedPartners?.length)return res.status(403).json({success:false,error:'Aucun de ces tarifs n’est autorisé pour ce compte.'});
  }
  let data;try{data=await read();}catch{return res.status(503).json({success:false,error:'Tarifs agents momentanément indisponibles.'});}
  if(!data)return res.status(503).json({success:false,error:'Tarifs agents momentanément indisponibles.'});
  if(body.action==='document'){
   if(body.id!=='randal-studio-one-basins')return res.status(404).json({success:false,error:'Document introuvable.'});
   const raw=data.documents?.[body.id];
   if(typeof raw!=='string'||raw.length>MAX_BYTES||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))return res.status(503).json({success:false,error:'Document momentanément indisponible.'});
   const bytes=Buffer.from(raw,'base64');if(bytes.toString('base64')!==raw||bytes.subarray(0,5).toString()!=='%PDF-')return res.status(503).json({success:false,error:'Document momentanément indisponible.'});
   res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','inline; filename="RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf"');
   return res.status(200).send(bytes);
  }
  const allowedPartners=agent?CLIENT_TARIFF_PARTNERS.slice():client.allowedPartners;
  return res.status(200).json({success:true,version:1,accessType:agent?'agent':'client',allowedPartners,expiresAt:agent?Date.now()+300000:client.expiresAt,view:allowedPartners.includes('view-ceramica')?data.view:[],elios:allowedPartners.includes('elios-ceramica')?data.elios:{}});
 };
}
