const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const db = admin.firestore();
const bucket = admin.storage().bucket();
const { setCors, requireAgent } = require('./security');
const { resolveClientVerification } = require('./client-verification');

const SESSION_HOURS = 4;
const MAX_PRIVATE_FILE = 30 * 1024 * 1024;

const TARIFF_FILES = {
  'elios-ceramica': [{ key:'tarif-2026', title:'Grille Tarifaire 2026', sourcePath:'assets/pdf/elios2026.pdf', storagePath:'pro-tarifs/elios-ceramica/elios2026.pdf' }],
  'view-ceramica': [{ key:'tarif-2026', title:'Grille Tarifaire 2026', sourcePath:'assets/pdf/view2026.pdf', storagePath:'pro-tarifs/view-ceramica/view2026.pdf' }],
  'la-fenice': [{ key:'tarif-2026', title:'Grille Tarifaire 2026', sourcePath:'assets/pdf/lafenice2026.pdf', storagePath:'pro-tarifs/la-fenice/lafenice2026.pdf' }],
  'reviglass': [{ key:'tarif-2026', title:'Grille Tarifaire 2026', sourcePath:'assets/pdf/reviglass2026.pdf', storagePath:'pro-tarifs/reviglass/reviglass2026.pdf' }],
  'biopietra': [
    { key:'tarif-2026', title:'Catalogue & Tarifs 2026', sourcePath:'assets/pdf/biopietra2026.pdf', storagePath:'pro-tarifs/biopietra/biopietra2026.pdf' },
    { key:'codes-prix', title:'Code Prix Biopietra', sourcePath:'assets/pdf/biopietracodeprix.pdf', storagePath:'pro-tarifs/biopietra/biopietracodeprix.pdf' }
  ],
  'petracers': [{ key:'tarif', title:"Grille Tarifaire Petracer's", sourcePath:'assets/pdf/petracer2023.pdf', storagePath:'pro-tarifs/petracers/petracer2023.pdf' }],
  'pecchioli-firenze': [{ key:'tarif', title:'Grille Tarifaire Pecchioli', sourcePath:'assets/pdf/pecchioli2022.pdf', storagePath:'pro-tarifs/pecchioli-firenze/pecchioli2022.pdf' }],
  'bulbo': [{ key:'tarif-2026', title:'Grille Tarifaire 2026', sourcePath:'assets/pdf/bulbo2026.pdf', storagePath:'pro-tarifs/bulbo/bulbo2026.pdf' }],
  'randal-pro': [{ key:'tarif', title:'Grille Tarifaire Randal Pro', sourcePath:'assets/pdf/RANDAL03.pdf', storagePath:'pro-tarifs/randal-pro/RANDAL03.pdf' }],
  'neobath': [
    { key:'anima', title:'Collection Anima', sourcePath:'assets/pdf/neobathANIMA.pdf', storagePath:'pro-tarifs/neobath/neobathANIMA.pdf' },
    { key:'dna', title:'Collection DNA', sourcePath:'assets/pdf/neobathDNA.pdf', storagePath:'pro-tarifs/neobath/neobathDNA.pdf' }
  ],
  'aquahome': [{ key:'tarif', title:'Grille Tarifaire Aquahome', sourcePath:'assets/pdf/AQUAHOME.pdf', storagePath:'pro-tarifs/aquahome/AQUAHOME.pdf' }],
  'bilt': [{ key:'tarif', title:'Grille Tarifaire Bilt', sourcePath:'assets/pdf/bilt.pdf', storagePath:'pro-tarifs/bilt/bilt.pdf' }]
};

function clean(v,max=200){return String(v||'').trim().slice(0,max)}
function hashToken(value){return crypto.createHash('sha256').update(String(value||'')).digest('hex')}

async function rateLimit(req,key,max=20){
  const ip=String(req.headers['x-forwarded-for']||req.ip||'unknown').split(',')[0].trim();
  const ipHash=hashToken(ip).slice(0,20);const hour=new Date().toISOString().slice(0,13).replace(/[^0-9]/g,'');
  const ref=db.collection('rate_limits').doc(`pro_${key}_${ipHash}_${hour}`);
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);const count=Number(snap.data()?.count||0);if(count>=max)throw new Error('Trop de tentatives. Réessayez plus tard.');tx.set(ref,{count:count+1,key,hour,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});
}

async function newSession(client){
  const token=crypto.randomBytes(32).toString('base64url');const tokenHash=hashToken(token);const expiresAt=new Date(Date.now()+SESSION_HOURS*3600000);
  const partners=[...new Set((Array.isArray(client.partenaires)?client.partenaires:[]).map(v=>clean(v,100)).filter(Boolean))];
  await db.collection('pro_sessions').doc(tokenHash).set({clientId:client.id,codeClient:clean(client.codeClient,20),societe:clean(client.societe,200),departement:clean(client.departement,3),partenaires:partners,createdAt:admin.firestore.FieldValue.serverTimestamp(),expiresAt:admin.firestore.Timestamp.fromDate(expiresAt)});
  return{token,expiresAt,partners};
}

async function sessionFromToken(token){
  const key=hashToken(token);if(!token||key.length!==64)return null;const snap=await db.collection('pro_sessions').doc(key).get();if(!snap.exists)return null;const data=snap.data();if(!data.expiresAt||data.expiresAt.toMillis()<=Date.now()){await snap.ref.delete().catch(()=>{});return null}return{ref:snap.ref,...data};
}

function findFile(partner,key){return (TARIFF_FILES[partner]||[]).find(f=>f.key===key)||null}

async function ensurePrivateFile(def){
  const file=bucket.file(def.storagePath);const[exists]=await file.exists();if(exists)return file;
  const sourceUrl=`https://leroyfactory.fr/${def.sourcePath}`;
  const response=await fetch(sourceUrl,{headers:{'User-Agent':'LeRoyFactory-Tariff-Migrator/1.0'}});if(!response.ok)throw new Error(`Source tarif indisponible (${response.status}).`);
  const buffer=Buffer.from(await response.arrayBuffer());if(!buffer.length||buffer.length>MAX_PRIVATE_FILE)throw new Error('Fichier tarif invalide ou trop volumineux.');
  await file.save(buffer,{resumable:false,contentType:'application/pdf',metadata:{cacheControl:'private, no-store',metadata:{migratedFrom:sourceUrl}}});return file;
}

const getProAccessProfile=onRequest({timeoutSeconds:30,memory:'256MiB'},async(req,res)=>{
  if(setCors(req,res,{publicEndpoint:true}))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée'});
  try{
    await rateLimit(req,'login',20);
    const client=await resolveClientVerification(req.body?.verificationToken,'pro_access',{consume:true});
    if(!client)return res.status(401).json({success:false,error:'Vérification expirée ou invalide. Recommencez la connexion.'});
    const session=await newSession(client);
    await db.collection('audit_logs').add({action:'pro_session_created',clientId:client.id,codeClient:clean(client.codeClient,20),createdAt:admin.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    res.json({success:true,sessionToken:session.token,expiresAt:session.expiresAt.toISOString(),client:{societe:clean(client.societe,200),codeClient:clean(client.codeClient,20),departement:clean(client.departement,3),activite:clean(client.categorieActivite||client.sousCategorie||client.segmentation||'Professionnel',120),partenaires:session.partners}});
  }catch(e){console.error('getProAccessProfile',e);res.status(e.message?.includes('tentatives')?429:500).json({success:false,error:e.message||'Accès impossible.'})}
});

const issueProTariffLink=onRequest({timeoutSeconds:120,memory:'512MiB'},async(req,res)=>{
  if(setCors(req,res,{publicEndpoint:true}))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée'});
  try{
    await rateLimit(req,'download',60);
    const session=await sessionFromToken(clean(req.body?.sessionToken,200));
    if(!session)return res.status(401).json({success:false,error:'Session professionnelle expirée. Reconnectez-vous.'});
    const partner=clean(req.body?.partner,100),fileKey=clean(req.body?.fileKey,80);
    if(!session.partenaires.includes(partner))return res.status(403).json({success:false,error:'Tarif non autorisé pour ce compte.'});
    const def=findFile(partner,fileKey);if(!def)return res.status(404).json({success:false,error:'Tarif introuvable.'});
    const file=await ensurePrivateFile(def);const expires=Date.now()+5*60*1000;const[url]=await file.getSignedUrl({version:'v4',action:'read',expires});
    await db.collection('audit_logs').add({action:'pro_tariff_link_issued',clientId:session.clientId,codeClient:session.codeClient,partner,fileKey,createdAt:admin.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    res.json({success:true,url,expiresAt:new Date(expires).toISOString(),title:def.title});
  }catch(e){console.error('issueProTariffLink',e);res.status(e.message?.includes('tentatives')?429:500).json({success:false,error:e.message||'Impossible d’ouvrir le tarif.'})}
});

const migrateProTariffs=onRequest({timeoutSeconds:540,memory:'1GiB'},async(req,res)=>{
  if(setCors(req,res))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée'});const user=await requireAgent(req,res,{adminOnly:true});if(!user)return;
  const results=[];for(const[partner,files]of Object.entries(TARIFF_FILES)){for(const def of files){try{await ensurePrivateFile(def);results.push({partner,key:def.key,ok:true})}catch(e){results.push({partner,key:def.key,ok:false,error:String(e.message||e)})}}}
  await db.collection('audit_logs').add({action:'pro_tariffs_migrated',actorEmail:user.email,results,createdAt:admin.firestore.FieldValue.serverTimestamp()}).catch(()=>{});res.json({success:true,results});
});

module.exports={getProAccessProfile,issueProTariffLink,migrateProTariffs};
