import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

export const SHOWROOM_SESSION_TTL_SECONDS=8*60*60;
const MAX_BODY_BYTES=4096,MAX_PASSWORD_ATTEMPTS=12,ATTEMPT_WINDOW_MS=15*60*1000,MAX_ATTEMPT_KEYS=2048;
const ORIGINS=new Set([
 'https://leroyfactory.fr','https://www.leroyfactory.fr',
 'https://studio-one-beta-test-v2.vercel.app','https://studio-one-beta-test-v2-hugol-trading.vercel.app',
 'https://randal-catalogue-general-3d.vercel.app','https://randal-catalogue-general-3d-hugol-trading.vercel.app',
 'https://us-central1-le-roy-factory.cloudfunctions.net'
]);
const digest=value=>createHash('sha256').update(value).digest();
const signature=(payload,secret)=>createHmac('sha256',secret).update(payload).digest();
const reply=(res,status,error)=>res.status(status).json({allowed:false,error});

function allowedOrigin(origin,env){
 if(ORIGINS.has(origin))return true;
 // Vercel supplies these exact deployment hosts. Never allow every preview
 // origin, a client-supplied host, or a suffix match against the request.
 return ['VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL'].some(key=>{
  const host=env[key];return typeof host==='string'&&/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(host)&&origin==='https://'+host;
 });
}

function readBody(req){
 const length=String(req.headers?.['content-length']??'');
 if(length&&(!/^\d+$/.test(length)||Number(length)>MAX_BODY_BYTES))throw {status:413};
 let body=req.body;
 if(Buffer.isBuffer(body))body=body.toString('utf8');
 if(typeof body==='string'){
  if(Buffer.byteLength(body)>MAX_BODY_BYTES)throw {status:413};
  try{body=JSON.parse(body);}catch{throw {status:400};}
 }
 if(!body||typeof body!=='object'||Array.isArray(body))throw {status:400};
 let serialized;try{serialized=JSON.stringify(body);}catch{throw {status:400};}
 if(Buffer.byteLength(serialized)>MAX_BODY_BYTES)throw {status:413};
 const keys=Object.keys(body);
 if(keys.length!==1||!['password','token'].includes(keys[0]))throw {status:400};
 const key=keys[0],value=body[key];
 if(typeof value!=='string'||!value.length||value.length>(key==='password'?1024:2048))throw {status:400};
 return {key,value};
}

function issueToken(secret,now){
 const iat=Math.floor(now/1000),exp=iat+SHOWROOM_SESSION_TTL_SECONDS;
 const payload=Buffer.from(JSON.stringify({v:1,scope:'lrf-showroom',iat,exp,nonce:randomBytes(16).toString('base64url')})).toString('base64url');
 return {token:payload+'.'+signature(payload,secret).toString('base64url'),expiresAt:exp*1000};
}

function verifyToken(token,secret,now){
 const parts=token.split('.');
 if(parts.length!==2||parts.some(part=>!/^[A-Za-z0-9_-]+$/.test(part)))return null;
 const [payload,encodedSignature]=parts,actual=Buffer.from(encodedSignature,'base64url'),expected=signature(payload,secret);
 if(actual.length!==expected.length||actual.toString('base64url')!==encodedSignature||!timingSafeEqual(actual,expected))return null;
 try{
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')),seconds=Math.floor(now/1000);
  if(data.v!==1||data.scope!=='lrf-showroom'||!Number.isInteger(data.iat)||!Number.isInteger(data.exp)||data.iat>seconds+30||data.exp<=seconds||data.exp-data.iat!==SHOWROOM_SESSION_TTL_SECONDS||!/^[A-Za-z0-9_-]{22}$/.test(data.nonce))return null;
  return {token,expiresAt:data.exp*1000};
 }catch{return null;}
}

export function createShowroomAccessHandler({getEnv=()=>process.env,now=()=>Date.now()}={}){
 const attempts=new Map();
 function allowPasswordAttempt(req){
  const forwarded=req.headers?.['x-vercel-forwarded-for']||req.headers?.['x-forwarded-for']||req.socket?.remoteAddress||'unknown';
  const key=String(forwarded).split(',')[0].trim().slice(0,128),time=now(),recent=(attempts.get(key)||[]).filter(value=>time-value<ATTEMPT_WINDOW_MS);
  if(recent.length>=MAX_PASSWORD_ATTEMPTS)return false;
  recent.push(time);attempts.delete(key);attempts.set(key,recent);
  if(attempts.size>MAX_ATTEMPT_KEYS)attempts.delete(attempts.keys().next().value);
  return true;
 }
 return async function showroomAccess(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
  const env=getEnv(),origin=String(req.headers?.origin||'');
  if(origin&&!allowedOrigin(origin,env))return reply(res,403,'Origine non autorisée.');
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){
   if(req.headers?.['access-control-request-method']&&req.headers['access-control-request-method']!=='POST')return reply(res,405,'Méthode non autorisée.');
   return res.status(204).end();
  }
  if(req.method!=='POST'){res.setHeader('Allow','POST, OPTIONS');return reply(res,405,'Méthode non autorisée.');}
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(String(req.headers?.['content-type']||'')))return reply(res,415,'Format de requête non autorisé.');
  let body;try{body=readBody(req);}catch(error){return reply(res,error.status||400,error.status===413?'Requête trop volumineuse.':'Requête invalide.');}
  const password=env.LRF_SHOWROOM_PASSWORD,secret=env.LRF_SHOWROOM_SESSION_SECRET;
  if(typeof password!=='string'||!password||typeof secret!=='string'||Buffer.byteLength(secret)<32)return reply(res,503,'Accès au showroom momentanément indisponible.');
  if(body.key==='token'){
   const session=verifyToken(body.value,secret,now());
   return session?res.status(200).json({allowed:true,...session}):reply(res,401,'Accès showroom expiré ou non valide.');
  }
  if(!allowPasswordAttempt(req)){res.setHeader('Retry-After',String(ATTEMPT_WINDOW_MS/1000));return reply(res,429,'Trop de tentatives. Réessayez dans quelques minutes.');}
  if(!timingSafeEqual(digest(body.value),digest(password)))return reply(res,401,'Code d’accès incorrect.');
  return res.status(200).json({allowed:true,...issueToken(secret,now())});
 };
}

export default createShowroomAccessHandler();
