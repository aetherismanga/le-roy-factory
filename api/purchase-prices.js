// Private same-origin gateway: only the Firebase administrator credential is
// forwarded. Client PRO session cookies never grant access to purchase prices.
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
 const origin=req.headers.origin;if(origin&&origin!=='https://'+req.headers.host&&!(!process.env.VERCEL&&origin==='http://'+req.headers.host))return res.status(403).json({success:false,error:'Origine non autorisée.'});
 const cookie=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('studio_one_admin='));let token='';try{token=decodeURIComponent(cookie?.slice('studio_one_admin='.length)||'');}catch{}
 if(!token)return res.status(401).json({success:false,error:'Connectez votre compte agent LRF pour consulter les achats.'});
 try{const response=await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/getConfiguratorPurchasePrices',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({variant:'studio-one'}),signal:AbortSignal.timeout(15000)});return res.status(response.status).json(await response.json());}
 catch{return res.status(503).json({success:false,error:'Tarifs agents momentanément indisponibles.'});}
}
