// The Firebase service verifies the original LRF/Firebase token and owns project state.
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
 const origin=req.headers.origin;if(origin&&origin!=='https://'+req.headers.host&&!(!process.env.VERCEL&&origin==='http://'+req.headers.host))return res.status(403).json({error:'Origine non autorisée.'});
 const cookies=Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim().split('=')));
 const authorization=String(req.headers.authorization||'')||('Bearer '+decodeURIComponent(cookies.randal_general_admin||cookies.randal_general_pro||''));
 try{const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(JSON.stringify(b).length>700000)return res.status(413).json({error:'Projet trop volumineux.'});
 const response=await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/randalProjects',{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({...b,variant:'randal-general'}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();res.status(response.status).json(result);
 }catch{return res.status(503).json({error:'Service projets LRF indisponible. Votre copie locale est conservée.'});}
}
