const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const zlib = require('zlib');
const { getAgentFromRequest } = require('./auth');

const db = admin.firestore();
const bucket = admin.storage().bucket();
const SITE = 'https://leroyfactory.fr/';

const TARIFFS = {
  'elios-2026': { partner:'elios-ceramica', source:'assets/pdf/elios2026.pdf', storagePath:'private-tariffs/elios/elios2026.pdf', filename:'ELIOS-Tarifs-2026.pdf' },
  'view-2026': { partner:'view-ceramica', source:'assets/pdf/view2026.pdf', storagePath:'private-tariffs/view/view2026.pdf', filename:'VIEW-Tarifs-2026.pdf' },
  'lafenice-2026': { partner:'la-fenice', source:'assets/pdf/lafenice2026.pdf', storagePath:'private-tariffs/lafenice/lafenice2026.pdf', filename:'LA-FENICE-Tarifs-2026.pdf' },
  'reviglass-2026': { partner:'reviglass', source:'assets/pdf/reviglass2026.pdf', storagePath:'private-tariffs/reviglass/reviglass2026.pdf', filename:'REVIGLASS-Tarifs-2026.pdf' },
  'biopietra-2026': { partner:'biopietra', source:'assets/pdf/biopietra2026.pdf', storagePath:'private-tariffs/biopietra/biopietra2026.pdf', filename:'BIOPIETRA-Tarifs-2026.pdf' },
  'biopietra-code-prix': { partner:'biopietra', source:'assets/pdf/biopietracodeprix.pdf', storagePath:'private-tariffs/biopietra/biopietracodeprix.pdf', filename:'BIOPIETRA-Code-Prix.pdf' },
  'petracers': { partner:'petracers', source:'assets/pdf/petracer2023.pdf', storagePath:'private-tariffs/petracers/petracer2023.pdf', filename:'PETRACERS-Tarifs.pdf' },
  'pecchioli': { partner:'pecchioli-firenze', source:'assets/pdf/pecchioli2022.pdf', storagePath:'private-tariffs/pecchioli/pecchioli2022.pdf', filename:'PECCHIOLI-Tarifs.pdf' },
  'bulbo-2026': { partner:'bulbo', source:'assets/pdf/bulbo2026.pdf', storagePath:'private-tariffs/bulbo/bulbo2026.pdf', filename:'BULBO-Tarifs-2026.pdf' },
  'randal': { partner:'randal-pro', source:'assets/pdf/RANDAL03.pdf', storagePath:'private-tariffs/randal/RANDAL03.pdf', filename:'RANDAL-PRO-Tarifs.pdf' },
  'neobath-anima': { partner:'neobath', source:'assets/pdf/neobathANIMA.pdf', storagePath:'private-tariffs/neobath/neobathANIMA.pdf', filename:'NEOBATH-ANIMA-Tarifs.pdf' },
  'neobath-dna-pdf': { partner:'neobath', source:'assets/pdf/neobathDNA.pdf', storagePath:'private-tariffs/neobath/neobathDNA.pdf', filename:'NEOBATH-DNA-Tarifs.pdf' },
  'aquahome': { partner:'aquahome', source:'assets/pdf/AQUAHOME.pdf', storagePath:'private-tariffs/aquahome/AQUAHOME.pdf', filename:'AQUAHOME-Tarifs.pdf' },
  'bilt': { partner:'bilt', source:'assets/pdf/bilt.pdf', storagePath:'private-tariffs/bilt/bilt.pdf', filename:'BILT-Tarifs.pdf' }
};

const DNA_PARTS = [0,1,2,3,4].map(n => `assets/data/neobath-dna-tarif/part-${String(n).padStart(2,'0')}.txt`);
const DNA_STORAGE = 'private-tariffs/neobath/neobath-dna-tarif.txt';

const ALIASES = {
  'elios-ceramica':['elios-ceramica','elios'], 'view-ceramica':['view-ceramica','view'], 'la-fenice':['la-fenice','lafenice','la fenice'],
  'reviglass':['reviglass'], 'biopietra':['biopietra'], 'petracers':['petracers','petracer','petracerss'],
  'pecchioli-firenze':['pecchioli-firenze','pecchioli'], 'bulbo':['bulbo'], 'randal-pro':['randal-pro','randal'],
  'neobath':['neobath'], 'aquahome':['aquahome'], 'bilt':['bilt']
};

function clean(v,max=120){ return String(v||'').trim().slice(0,max); }
function norm(v){ return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); }
function depFromCp(cp){ const s=String(cp||'').replace(/\s/g,''); if(!/^\d{5}$/.test(s)) return ''; if(s.startsWith('97')||s.startsWith('98')) return s.slice(0,3); if(s.startsWith('20')) return Number(s)>=20200?'2B':'2A'; return s.slice(0,2); }

function cors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=['https://leroyfactory.fr','https://www.leroyfactory.fr'];
  res.set('Access-Control-Allow-Origin',allowed.includes(origin)?origin:'https://leroyfactory.fr');
  res.set('Vary','Origin');
  res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS'){ res.status(204).send(''); return true; }
  return false;
}

async function verifiedClient(codeRaw,depRaw){
  const code=clean(codeRaw,20).toUpperCase(),dep=clean(depRaw,3).toUpperCase();
  if(!/^LRF-\d{5}$/.test(code)||!dep) return null;
  const snap=await db.collection('clients').where('codeClient','==',code).limit(1).get();
  if(snap.empty) return null;
  const doc=snap.docs[0],c=doc.data();
  const clientDep=String(c.departement||depFromCp(c.codePostal||c.code_postal)||'').trim().toUpperCase();
  if(clientDep!==dep) return null;
  return { id:doc.id, ...c, codeClient:code, departement:clientDep };
}

function clientCanAccess(client,partner){
  const values=(Array.isArray(client.partenaires)?client.partenaires:[]).map(norm);
  const aliases=(ALIASES[partner]||[partner]).map(norm);
  return aliases.some(a=>values.includes(a));
}

async function streamPrivateFile(res,file,filename,contentType='application/pdf'){
  const [exists]=await file.exists();
  if(!exists) return res.status(503).json({success:false,error:'Tarif sécurisé en cours de migration.'});
  res.set('Content-Type',contentType);
  res.set('Content-Disposition',`inline; filename="${String(filename).replace(/[^a-zA-Z0-9._-]/g,'_')}"`);
  res.set('Cache-Control','private, no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('X-Content-Type-Options','nosniff');
  const stream=file.createReadStream();
  stream.on('error',err=>{ console.error('streamPrivateFile',err); if(!res.headersSent) res.status(500).end(); else res.end(); });
  stream.pipe(res);
}

const getTariffPdf=onRequest({timeoutSeconds:120,memory:'512MiB'},async(req,res)=>{
  if(cors(req,res)) return;
  if(req.method!=='POST') return res.status(405).json({success:false,error:'Méthode non autorisée'});
  try{
    const {codeClient,departement,tariffId}=req.body||{};
    const def=TARIFFS[String(tariffId||'')];
    if(!def) return res.status(404).json({success:false,error:'Tarif inconnu'});

    const agent=await getAgentFromRequest(req);
    if(agent) return streamPrivateFile(res,bucket.file(def.storagePath),def.filename,'application/pdf');

    const client=await verifiedClient(codeClient,departement);
    if(!client) return res.status(403).json({success:false,error:'Identifiant client ou département incorrect.'});
    if(!clientCanAccess(client,def.partner)) return res.status(403).json({success:false,error:'Ce tarif n’est pas autorisé pour ce compte.'});
    return streamPrivateFile(res,bucket.file(def.storagePath),def.filename,'application/pdf');
  }catch(e){ console.error('getTariffPdf',e); return res.status(500).json({success:false,error:'Impossible d’ouvrir ce tarif.'}); }
});

const getNeobathDnaTariff=onRequest({timeoutSeconds:60,memory:'256MiB'},async(req,res)=>{
  if(cors(req,res)) return;
  if(req.method!=='POST') return res.status(405).json({success:false,error:'Méthode non autorisée'});
  try{
    const {codeClient,departement}=req.body||{};
    const agent=await getAgentFromRequest(req);
    if(agent) return streamPrivateFile(res,bucket.file(DNA_STORAGE),'NEOBATH-DNA-Tarif.txt','text/plain; charset=utf-8');

    const client=await verifiedClient(codeClient,departement);
    if(!client) return res.status(403).json({success:false,error:'Identifiant client ou département incorrect.'});
    if(!clientCanAccess(client,'neobath')) return res.status(403).json({success:false,error:'Le tarif NEOBATH n’est pas autorisé pour ce compte.'});
    return streamPrivateFile(res,bucket.file(DNA_STORAGE),'NEOBATH-DNA-Tarif.txt','text/plain; charset=utf-8');
  }catch(e){ console.error('getNeobathDnaTariff',e); return res.status(500).json({success:false,error:'Impossible d’ouvrir ce tarif.'}); }
});

async function fetchBuffer(url){
  const response=await fetch(url,{redirect:'follow'});
  if(!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function migrateTariffs(){
  const migrated=[],errors=[];
  for(const [id,def] of Object.entries(TARIFFS)){
    try{
      const file=bucket.file(def.storagePath); const [exists]=await file.exists();
      if(!exists){
        const buf=await fetchBuffer(SITE+def.source);
        await file.save(buf,{resumable:false,contentType:'application/pdf',metadata:{cacheControl:'private,no-store,max-age=0'}});
      }
      migrated.push(id);
    }catch(e){ errors.push({id,error:String(e.message||e)}); }
  }
  try{
    const dnaFile=bucket.file(DNA_STORAGE); const [exists]=await dnaFile.exists();
    if(!exists){
      const chunks=[];
      for(const path of DNA_PARTS){ chunks.push((await fetchBuffer(SITE+path)).toString('utf8')); }
      const packed=Buffer.from(chunks.join('').replace(/\s/g,''),'base64');
      const text=zlib.gunzipSync(packed).toString('utf8');
      await dnaFile.save(text,{resumable:false,contentType:'text/plain; charset=utf-8',metadata:{cacheControl:'private,no-store,max-age=0'}});
    }
    migrated.push('neobath-dna-text');
  }catch(e){ errors.push({id:'neobath-dna-text',error:String(e.message||e)}); }

  const complete=errors.length===0;
  await db.collection('system').doc('privateTariffsMigration').set({
    complete,migrated,errors,updatedAt:admin.firestore.FieldValue.serverTimestamp()
  },{merge:true});
  return {complete,migrated,errors};
}

const initializeTariffStorage=onRequest({timeoutSeconds:540,memory:'1GiB'},async(req,res)=>{
  if(cors(req,res)) return;
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({success:false,error:'Méthode non autorisée'});
  try{ const result=await migrateTariffs(); return res.status(result.complete?200:500).json({success:result.complete,...result}); }
  catch(e){ console.error('initializeTariffStorage',e); return res.status(500).json({success:false,error:String(e.message||e)}); }
});

const getTariffMigrationStatus=onRequest({timeoutSeconds:30,memory:'256MiB'},async(req,res)=>{
  if(cors(req,res)) return;
  try{
    const snap=await db.collection('system').doc('privateTariffsMigration').get();
    const d=snap.exists?snap.data():{};
    return res.json({success:true,complete:!!d.complete,migratedCount:Array.isArray(d.migrated)?d.migrated.length:0,errorCount:Array.isArray(d.errors)?d.errors.length:0});
  }catch(e){ return res.status(500).json({success:false,error:'Statut indisponible'}); }
});

module.exports={getTariffPdf,getNeobathDnaTariff,initializeTariffStorage,getTariffMigrationStatus};
