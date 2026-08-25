const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const db = admin.firestore();
const bucket = admin.storage().bucket();
const { setCors, requireAgent } = require('./security');

const AGENTS=['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];
const STAT_DOCS=['meta','elios-2026-07','view-2026-07','mid-2025','end-2025','randal-end-2025','periods'];
const TARIFF_PATHS=[
  'pro-tarifs/elios-ceramica/elios2026.pdf','pro-tarifs/view-ceramica/view2026.pdf','pro-tarifs/la-fenice/lafenice2026.pdf','pro-tarifs/reviglass/reviglass2026.pdf',
  'pro-tarifs/biopietra/biopietra2026.pdf','pro-tarifs/biopietra/biopietracodeprix.pdf','pro-tarifs/petracers/petracer2023.pdf','pro-tarifs/pecchioli-firenze/pecchioli2022.pdf',
  'pro-tarifs/bulbo/bulbo2026.pdf','pro-tarifs/randal-pro/RANDAL03.pdf','pro-tarifs/neobath/neobathANIMA.pdf','pro-tarifs/neobath/neobathDNA.pdf','pro-tarifs/aquahome/AQUAHOME.pdf','pro-tarifs/bilt/bilt.pdf'
];

exports.getSecurityRolloutStatus=onRequest({timeoutSeconds:120,memory:'512MiB'},async(req,res)=>{
  if(setCors(req,res))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée'});
  const user=await requireAgent(req,res,{adminOnly:true});if(!user)return;
  try{
    const agents=[];
    for(const email of AGENTS){
      try{const record=await admin.auth().getUserByEmail(email);agents.push({email,exists:true,disabled:record.disabled===true,emailVerified:record.emailVerified===true,uid:record.uid})}
      catch(error){agents.push({email,exists:false,disabled:false,emailVerified:false,error:error.code||'not-found'})}
    }

    const statistics=[];
    for(const id of STAT_DOCS){const snap=await db.collection('commercial_statistics').doc(id).get();statistics.push({id,ready:snap.exists,updatedAt:snap.data()?.updatedAt?.toDate?.()?.toISOString?.()||null})}

    const tariffs=[];
    for(const path of TARIFF_PATHS){const[exists]=await bucket.file(path).exists();tariffs.push({path,ready:exists})}

    const clientSnap=await db.collection('clients').limit(1000).get();let v2=0,legacy=0,missingEmail=0,missingDepartment=0;
    clientSnap.forEach(doc=>{const c=doc.data();if(Number(c.schemaVersion||0)>=2)v2++;else legacy++;if(!String(c.email||'').trim())missingEmail++;if(!String(c.departement||'').trim())missingDepartment++});

    const checks={
      agentsReady:agents.every(a=>a.exists&&!a.disabled),
      statisticsReady:statistics.every(x=>x.ready),
      tariffsReady:tariffs.every(x=>x.ready),
      clientSchemaReady:legacy===0
    };
    const readyForPrivateDataRemoval=checks.statisticsReady&&checks.tariffsReady;
    const readyForFinalMerge=checks.agentsReady&&checks.statisticsReady&&checks.tariffsReady&&checks.clientSchemaReady;
    res.json({success:true,checkedAt:new Date().toISOString(),checks,readyForPrivateDataRemoval,readyForFinalMerge,agents,statistics,tariffs,clients:{scanned:clientSnap.size,v2,legacy,missingEmail,missingDepartment}});
  }catch(error){console.error('getSecurityRolloutStatus',error);res.status(500).json({success:false,error:'Diagnostic de sécurité impossible.'})}
});
