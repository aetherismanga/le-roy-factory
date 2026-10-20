// Same-origin session gateway. Tokens are kept in Secure HttpOnly cookies.
// This module deliberately contains no professional tariffs or guessed discounts.
const UPSTREAM='https://us-central1-le-roy-factory.cloudfunctions.net/';
const COOKIE='studio_one_pro';
const json=(res,status,value)=>res.status(status).json(value);
export async function upstream(name,body){
 const response=await fetch(UPSTREAM+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const data=await response.json();if(!response.ok||!data.success)throw Object.assign(Error(response.status===401||response.status===403?'Identifiant refusé ou session expirée.':'Service LRF momentanément indisponible.'),{status:response.status===401||response.status===403?401:503});return data;
}
export function cookieToken(req){const match=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));return match?decodeURIComponent(match.slice(COOKIE.length+1)):'';}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return json(res,405,{error:'Méthode non autorisée.'});
 const origin=req.headers.origin;
 if(origin&&origin!=='https://'+req.headers.host&&!(!process.env.VERCEL&&origin==='http://'+req.headers.host))return json(res,403,{error:'Origine non autorisée.'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(JSON.stringify(body).length>110000)return json(res,413,{error:'Requête trop volumineuse.'});
  if(body.action==='logout'){res.setHeader('Set-Cookie',COOKIE+'=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');return json(res,200,{client:null});}
  let token=cookieToken(req),data;
  if(body.action==='identify'){
   const codeClient=String(body.codeClient||'').trim().toUpperCase(),departement=String(body.departement||'').trim().toUpperCase();
   if(!/^LRF-\d{5}$/.test(codeClient)||!/^([0-9]{2,3}|2A|2B)$/.test(departement))return json(res,400,{error:'Indiquez votre code LRF et votre département.'});
   data=await upstream('createProSession',{codeClient,departement});token=data.sessionToken;
   res.setHeader('Set-Cookie',COOKIE+'='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=43200');
  }else if(['session','quote'].includes(body.action)){
   if(!token)return json(res,200,{client:null,proHT:null,proStatus:'unauthenticated'});
   data=await upstream('validateProSession',{sessionToken:token});
  }else return json(res,400,{error:'Action inconnue.'});
  const c=data.client;
  if(!c||!/^LRF-\d{5}$/.test(c.codeClient||''))return json(res,401,{error:'Compte LRF non vérifié.'});
  const allowed=(c.partenaires||[]).some(p=>['randal','randalpro'].includes(String(p).toLowerCase().replace(/[^a-z]/g,'')));
  // The existing validator returns identity/partner access, never individual
  // RANDAL terms. Fail closed until a real server-side terms source is connected.
  // No request body (code, partner, HT, discount) can grant a professional price.
  return json(res,200,{client:{codeClient:c.codeClient,societe:c.societe||'Client professionnel'},randalAllowed:allowed,proHT:null,proStatus:allowed?'conditions-unavailable':'partner-not-authorized'});
 }catch(e){return json(res,e.status||503,{error:e.status===401?e.message:'Connexion au service LRF indisponible. Réessayez.',client:null,proHT:null});}
}
