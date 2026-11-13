import {validLease,verifyLiveHost} from './protocol.mjs';
export function createRegistry({key,read,replace,request=fetch,now=Date.now}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(req.method==='GET'){
    const record=await read();
    return validLease(record,key,now())?res.status(200).json(record):res.status(503).json({error:'PC hors ligne.'});
   }
   if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
   if(!String(req.headers['content-type']||'').startsWith('application/json')||JSON.stringify(req.body||{}).length>2048||!validLease(req.body,key,now()))return res.status(401).json({error:'Signature du PC invalide.'});
   const {host,origin,issuedAt,expiresAt,nonce,signature}=req.body;
   const record={host,origin,issuedAt,expiresAt,nonce,signature};
   await verifyLiveHost(origin,key,request);
   if(!await replace(record))return res.status(409).json({error:'Annonce déjà remplacée.'});
   return res.status(200).json({registered:true,expiresAt});
  }catch{return res.status(503).json({error:'PC temporairement indisponible.'});}
 };
}
export function mayReplace(previous,next){return !previous||next.issuedAt>previous.issuedAt||(next.issuedAt===previous.issuedAt&&next.signature===previous.signature);}
