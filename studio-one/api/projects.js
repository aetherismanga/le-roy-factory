// The Firebase service verifies the original LRF/Firebase token and owns project state.
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
 const origin=req.headers.origin;if(origin&&origin!=='https://'+req.headers.host&&!(!process.env.VERCEL&&origin==='http://'+req.headers.host))return res.status(403).json({error:'Origine non autorisée.'});
 const cookies=Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim().split('=')));
 let token=String(req.headers.authorization||'').replace(/^Bearer\s*/i,'').trim();
 try{if(!token)token=decodeURIComponent(cookies.studio_one_admin||cookies.studio_one_pro||'').trim();}catch{return res.status(401).json({success:false,error:'Session LRF non reconnue.'});}
 if(!token)return res.status(401).json({success:false,error:'Connectez votre compte client LRF pour synchroniser et envoyer ce projet.'});
 const authorization='Bearer '+token;
 try{const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(JSON.stringify(b).length>700000)return res.status(413).json({error:'Projet trop volumineux.'});
 const response=await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/randalProjects',{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({...b,variant:'studio-one'}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();res.status(response.status).json(result);
 }catch{return res.status(503).json({error:'Service projets LRF indisponible. Votre copie locale est conservée.'});}
}
