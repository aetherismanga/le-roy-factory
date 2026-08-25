const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const db = admin.firestore();
const { setCors, requireAgent } = require('./security');

const VERSION=2;
const clean=(value,max=500)=>String(value??'').trim().slice(0,max);
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value,250));

function department(value,codePostal=''){
  const existing=clean(value,3).toUpperCase().replace(/\s/g,'');if(existing)return existing;
  const cp=clean(codePostal,5).replace(/\s/g,'');if(!/^\d{5}$/.test(cp))return'';
  if(cp.startsWith('97')||cp.startsWith('98'))return cp.slice(0,3);if(cp.startsWith('20'))return Number(cp)>=20200?'2B':'2A';return cp.slice(0,2);
}

function canonical(raw={}){
  const emails=[];const emailSeen=new Set();
  const addEmail=value=>{const e=clean(value,250);const k=e.toLowerCase();if(!validEmail(e)||emailSeen.has(k))return;emailSeen.add(k);emails.push(e)};
  addEmail(raw.email||raw.eMail||raw.mail||raw.Email||raw.Mail);
  (Array.isArray(raw.emails)?raw.emails:[]).forEach(addEmail);
  (Array.isArray(raw.emails_contact)?raw.emails_contact:[]).forEach(addEmail);
  (Array.isArray(raw.interlocuteurs)?raw.interlocuteurs:[]).forEach(p=>addEmail(p?.email||p?.mail));
  (Array.isArray(raw.contacts)?raw.contacts:[]).forEach(p=>addEmail(typeof p==='string'?p:p?.email||p?.mail||p?.eMail));

  const phones=[];const phoneSeen=new Set();
  const addPhone=value=>{const p=clean(value,50);const k=p.replace(/[^0-9+]/g,'');if(!p||phoneSeen.has(k))return;phoneSeen.add(k);phones.push(p)};
  addPhone(raw.telephone||raw.tel||raw.Telephone||raw.phone);
  (Array.isArray(raw.telephones)?raw.telephones:[]).forEach(addPhone);
  (Array.isArray(raw.interlocuteurs)?raw.interlocuteurs:[]).forEach(p=>addPhone(p?.telephone||p?.tel));

  const codePostal=clean(raw.codePostal||raw.code_postal||raw.cp||raw.postalCode,5);
  const rawType=clean(raw.type||raw.Type||'client',30)||'client';
  return {
    schemaVersion:VERSION,
    societe:clean(raw.societe||raw.nomSociete||raw.entreprise||raw.enseigne||raw.nom,250),
    contact:clean(raw.contact||raw.nomContact,250),
    type:rawType,
    typeNormalized:rawType.toLowerCase().includes('prospect')?'prospect':'client',
    agent:clean(raw.agent||raw.secteur||raw.Agent,100),
    email:emails[0]||'',emails,
    telephone:phones[0]||'',telephones:phones,
    adresse:clean(raw.adresse||raw.address,500),
    codePostal,
    ville:clean(raw.ville||raw.city,150),
    departement:department(raw.departement||raw.Dept||raw.department,codePostal),
    partenaires:Array.isArray(raw.partenaires)?[...new Set(raw.partenaires.map(v=>clean(v,100)).filter(Boolean))]:[]
  };
}

exports.migrateClientsV2=onRequest({timeoutSeconds:300,memory:'512MiB'},async(req,res)=>{
  if(setCors(req,res))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée'});
  const user=await requireAgent(req,res,{adminOnly:true});if(!user)return;
  const apply=req.body?.apply===true;const limit=Math.min(Math.max(Number(req.body?.limit||500),1),500);
  try{
    const snap=await db.collection('clients').limit(limit).get();const preview=[];let changed=0;let batch=db.batch();let pending=0;
    for(const doc of snap.docs){
      const before=doc.data();const patch=canonical(before);
      const differences=Object.entries(patch).filter(([key,value])=>JSON.stringify(before[key]??null)!==JSON.stringify(value??null)).map(([key])=>key);
      if(!differences.length)continue;changed+=1;
      preview.push({id:doc.id,societe:patch.societe,differences});
      if(apply){batch.set(doc.ref,{...patch,schemaMigratedAt:admin.firestore.FieldValue.serverTimestamp(),schemaMigratedBy:user.email},{merge:true});pending+=1;if(pending>=400){await batch.commit();batch=db.batch();pending=0}}
    }
    if(apply&&pending)await batch.commit();
    await db.collection('audit_logs').add({action:apply?'clients_v2_migration_applied':'clients_v2_migration_preview',actorEmail:user.email,scanned:snap.size,changed,createdAt:admin.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    res.json({success:true,apply,scanned:snap.size,changed,preview:preview.slice(0,100),truncatedPreview:preview.length>100});
  }catch(error){console.error('migrateClientsV2',error);res.status(500).json({success:false,error:'Migration Client V2 impossible.'})}
});
