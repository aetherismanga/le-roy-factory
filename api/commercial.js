// Same-origin gateway. All PRO amounts and roles require live server verification.
import {purchaseQuote,privateReference} from '../server/purchase.js';
const UPSTREAM='https://us-central1-le-roy-factory.cloudfunctions.net/',COOKIE='studio_one_pro',ADMIN_COOKIE='studio_one_admin';
const FIREBASE_KEY='AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',ADMINS=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const json=(res,status,value)=>res.status(status).json(value),clean=(v,n=180)=>String(v??'').trim().slice(0,n);
const fail=(message,status=401)=>Object.assign(Error(message),{status});
export async function upstream(name,body){const r=await fetch(UPSTREAM+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const d=await r.json();if(!r.ok||!d.success)throw fail('Identifiant refusé ou service LRF indisponible.',r.status===401||r.status===403?401:503);return d;}
export function cookieToken(req,name=COOKIE){const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));return value?decodeURIComponent(value.slice(name.length+1)):'';}
function cookie(name,token,age){return name+'='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age='+age;}
async function firebase(method,payload){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:'+method+'?key='+FIREBASE_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});const data=await r.json();if(!r.ok)throw fail('Connexion administrateur refusée.');return data;}
async function administrator(token){const data=await firebase('lookup',{idToken:token}),u=data.users?.[0],email=clean(u?.email).toLowerCase();if(!u||u.disabled||!ADMINS.has(email))throw fail('Compte administrateur non autorisé.');let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));}catch{throw fail('Jeton administrateur invalide.');}if(claims.aud!=='le-roy-factory'||claims.iss!=='https://securetoken.google.com/le-roy-factory'||claims.sub!==u.localId||claims.exp<=Date.now()/1000||claims.auth_time<Number(u.validSince||0))throw fail('Session administrateur expirée ou révoquée.');return {isAdmin:true,role:'administrator',client:{societe:email.startsWith('jerome@')?'Jérôme Hugol':'Coryne',email,contact:'Administrateur',codeClient:''},randalAllowed:true};}
const profiles=new Map(),attempts=new Map();
function allowLogin(req){const key=clean(req.headers['x-forwarded-for']||req.headers.host,100),now=Date.now(),a=(attempts.get(key)||[]).filter(t=>now-t<900000);if(a.length>=12)return false;a.push(now);attempts.set(key,a);if(attempts.size>2000)attempts.clear();return true;}
async function customer(c){const key=c.id||c.codeClient,old=profiles.get(key);let p=old&&old.until>Date.now()?old.profile:null;
 if(!p){try{p=(await upstream('getAccountClientPrefill',{codeClient:c.codeClient,departement:c.departement})).client;}catch{p={};}profiles.set(key,{profile:p,until:Date.now()+300000});if(profiles.size>500)profiles.delete(profiles.keys().next().value);}
 return Object.fromEntries(['societe','contact','email','telephone','adresse','codePostal','ville','siret'].map(k=>[k,clean(p?.[k]||c[k],k==='adresse'?400:180)]).concat([['codeClient',c.codeClient]]));}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return json(res,405,{error:'Méthode non autorisée.'});const origin=req.headers.origin;
 if(origin&&origin!=='https://'+req.headers.host&&!(!process.env.VERCEL&&origin==='http://'+req.headers.host))return json(res,403,{error:'Origine non autorisée.'});
 try{const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(JSON.stringify(body).length>115000)return json(res,413,{error:'Requête trop volumineuse.'});
  if(body.action==='logout'){res.setHeader('Set-Cookie',[cookie(COOKIE,'',0),cookie(ADMIN_COOKIE,'',0)]);return json(res,200,{client:null,proHT:null});}
  let identity,token=cookieToken(req),adminToken=cookieToken(req,ADMIN_COOKIE),data;const bearer=String(req.headers.authorization||'').replace(/^Bearer /,'');if(bearer){if(bearer.includes('.'))adminToken=bearer;else token=bearer;}
  if(['identify','admin','exchange','admin-token'].includes(body.action)&&!allowLogin(req))return json(res,429,{error:'Trop de tentatives. Réessayez dans quelques minutes.'});
  if(body.action==='admin'||body.action==='admin-token'){
   if(body.action==='admin'){const email=clean(body.email).toLowerCase();if(!ADMINS.has(email))throw fail('Compte administrateur non autorisé.');const result=await firebase('signInWithPassword',{email,password:String(body.password||'').slice(0,1024),returnSecureToken:true});adminToken=result.idToken;}
   else adminToken=clean(body.idToken,5000);
   identity=await administrator(adminToken);res.setHeader('Set-Cookie',[cookie(ADMIN_COOKIE,adminToken,3500),cookie(COOKIE,'',0)]);
  }else if(body.action==='identify'){
   const codeClient=clean(body.codeClient,20).toUpperCase(),departement=clean(body.departement,3).toUpperCase();if(!/^LRF-\d{5}$/.test(codeClient)||!/^([0-9]{2,3}|2A|2B)$/.test(departement))return json(res,400,{error:'Indiquez votre code LRF et votre département.'});
   data=await upstream('createProSession',{codeClient,departement});token=data.sessionToken;res.setHeader('Set-Cookie',[cookie(COOKIE,token,43200),cookie(ADMIN_COOKIE,'',0)]);
  }else if(body.action==='exchange'){
   token=clean(body.sessionToken,256);if(token.length<32)throw fail('Session LRF non reconnue.');data=await upstream('validateProSession',{sessionToken:token});res.setHeader('Set-Cookie',[cookie(COOKIE,token,43200),cookie(ADMIN_COOKIE,'',0)]);
  }else if(['session','quote'].includes(body.action)){
   if(adminToken)identity=await administrator(adminToken);
   else if(token)data=await upstream('validateProSession',{sessionToken:token});
   else return json(res,200,{client:null,proHT:null,proStatus:'unauthenticated'});
  }else return json(res,400,{error:'Action inconnue.'});
  if(!identity){const c=data?.client;if(!c||!/^LRF-\d{5}$/.test(c.codeClient||''))throw fail('Compte LRF non vérifié.');const allowed=(c.partenaires||[]).some(p=>['randal','randalpro'].includes(String(p).toLowerCase().replace(/[^a-z]/g,'')));identity={client:await customer(c),isAdmin:false,randalAllowed:allowed};}
  let quote=null;if(body.project&&identity.randalAllowed){try{quote=purchaseQuote(body.project);}catch{throw fail('La composition ne peut pas être chiffrée.',400);}}
  return json(res,200,{...identity,...(['identify','exchange','admin','admin-token'].includes(body.action)?{accessToken:identity.isAdmin?adminToken:token}:{}),proHT:quote?.proHT??null,proRows:quote?.rows.map(r=>({ref:r.ref,itemId:r.itemId,proHT:r.proHT}))||[],privateCode:privateReference(identity.client.codeClient,quote?.proHT),proStatus:!identity.randalAllowed?'partner-not-authorized':quote?'historical-grid':'authenticated',priceSource:quote?.source||''});
 }catch(e){return json(res,e.status||503,{error:e.status===401?e.message:e.status===400?e.message:'Connexion au service LRF indisponible. Réessayez.',client:null,proHT:null,isAdmin:false});}
}
