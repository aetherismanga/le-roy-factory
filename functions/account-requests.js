const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = admin.firestore();
const bucket = admin.storage().bucket();
const { setCors, requireAgent, enforceSenderMode } = require('./security');

const ALLOWED_DOCUMENT_TYPES = new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const MAX_REQUEST_TOTAL = 12 * 1024 * 1024;
const MAX_SINGLE_FILE = 8 * 1024 * 1024;

function depFromCp(cp){const s=String(cp||'').replace(/\s/g,'');if(!/^\d{5}$/.test(s))return'';if(s.startsWith('97')||s.startsWith('98'))return s.slice(0,3);if(s.startsWith('20'))return Number(s)>=20200?'2B':'2A';return s.slice(0,2)}
function clean(v,max=500){return String(v||'').trim().slice(0,max)}
function html(v){return clean(v,5000).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function safeFilename(name){return String(name||'document').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim())}

function smtp(senderMode='both'){
  let user='jerome@leroyfactory.fr',pass=process.env.SMTP_PASSWORD_JEROME,from='"Jérôme Hugol - Le Roy Factory" <jerome@leroyfactory.fr>',reply='jerome@leroyfactory.fr';
  if(senderMode==='coryne'){user='coryne@leroyfactory.fr';pass=process.env.SMTP_PASSWORD_CORYNE;from='"Coryne - Le Roy Factory" <coryne@leroyfactory.fr>';reply='coryne@leroyfactory.fr'}
  if(senderMode==='both'){from='"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>';reply='jerome@leroyfactory.fr, coryne@leroyfactory.fr'}
  return{user,pass,from,reply}
}
function transporter(senderMode){const s=smtp(senderMode);if(!s.pass)throw new Error('Configuration SMTP indisponible.');return{t:nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:s.user,pass:s.pass}}),...s}}

async function publicRateLimit(req,key,max){
  const ip=String(req.headers['x-forwarded-for']||req.ip||'unknown').split(',')[0].trim();
  const ipHash=crypto.createHash('sha256').update(ip).digest('hex').slice(0,20);
  const hour=new Date().toISOString().slice(0,13).replace(/[^0-9]/g,'');
  const ref=db.collection('rate_limits').doc(`public_${key}_${ipHash}_${hour}`);
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);const count=Number(snap.data()?.count||0);if(count>=max)throw new Error('Trop de tentatives. Réessayez plus tard.');tx.set(ref,{count:count+1,key,hour,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});
}

async function verifiedClient(codeRaw,depRaw){
  const code=clean(codeRaw,20).toUpperCase(),dep=clean(depRaw,3).toUpperCase();
  if(!/^LRF-\d{5}$/.test(code)||!dep)return null;
  const snap=await db.collection('clients').where('codeClient','==',code).limit(1).get();if(snap.empty)return null;
  const doc=snap.docs[0],c=doc.data();const clientDep=String(c.departement||depFromCp(c.codePostal||c.code_postal)||'').toUpperCase();
  if(clientDep!==dep||String(c.type||'client').toLowerCase()==='prospect'||c.archived===true||c.archive===true)return null;
  return{id:doc.id,...c,departement:clientDep};
}

const getAccountClientPrefill = onRequest({timeoutSeconds:30,memory:'256MiB'},async(req,res)=>{
  if(setCors(req,res,{publicEndpoint:true}))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  try{
    await publicRateLimit(req,'account_prefill',20);
    const c=await verifiedClient(req.body?.codeClient,req.body?.departement);
    if(!c)return res.status(403).json({success:false,error:'Code client ou département incorrect.'});
    res.json({success:true,client:{societe:clean(c.societe),activite:clean(c.activite||c.categorieActivite),adresse:clean(c.adresse),codePostal:clean(c.codePostal||c.code_postal,5),ville:clean(c.ville),siret:clean(c.siret,30),tva:clean(c.tva,40),chiffreAffaires:clean(c.chiffreAffaires||c.chiffre_affaires,50),contact:clean(c.contact),fonction:clean(c.fonction),telephone:clean(c.telephone||(Array.isArray(c.telephones)?c.telephones[0]:''),40),email:clean(c.email,200),emails:Array.isArray(c.emails)?c.emails.map(x=>clean(x,200)).filter(Boolean):Array.isArray(c.emailsAutres)?c.emailsAutres.map(x=>clean(x,200)).filter(Boolean):[],contactsAutres:clean(c.contactsAutres,3000),partenaires:Array.isArray(c.partenaires)?c.partenaires.map(x=>clean(x,100)).filter(Boolean):[]}});
  }catch(e){console.error('getAccountClientPrefill',e);res.status(429).json({success:false,error:e.message||'Impossible de charger la fiche pour le moment.'})}
});

const submitAccountRequest = onRequest({secrets:['SMTP_PASSWORD_JEROME','SMTP_PASSWORD_CORYNE'],timeoutSeconds:120,memory:'512MiB'},async(req,res)=>{
  if(setCors(req,res,{publicEndpoint:true}))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  try{
    await publicRateLimit(req,'account_submit',10);
    const p=req.body||{};const type=p.requestType==='mise_a_jour'?'mise_a_jour':'ouverture';
    if(!clean(p.societe)||!validEmail(p.email)||!/^\d{5}$/.test(clean(p.codePostal,5)))return res.status(400).json({success:false,error:'Société, e-mail valide et code postal sont obligatoires.'});
    let existingClientId='';
    if(type==='mise_a_jour'){
      const c=await verifiedClient(p.codeClient,p.departementAuth);if(!c)return res.status(403).json({success:false,error:'Code client ou département incorrect.'});existingClientId=c.id;
    }
    const rawFiles=Array.isArray(p.attachments)?p.attachments.slice(0,8):[];
    const roles=new Set(rawFiles.map(a=>String(a?.role||'').toLowerCase()));
    if(!roles.has('rib')||!roles.has('kbis'))return res.status(400).json({success:false,error:'Le RIB et le Kbis sont obligatoires.'});
    const ref=db.collection('account_requests').doc();const date=new Date();const reference=`DMD-${date.toISOString().slice(0,10).replace(/-/g,'')}-${ref.id.slice(0,5).toUpperCase()}`;
    const attachments=[];let totalBytes=0;
    for(let i=0;i<rawFiles.length;i++){
      const a=rawFiles[i]||{};if(!a.content||!a.filename)continue;
      const contentType=clean(a.contentType,120).toLowerCase();if(!ALLOWED_DOCUMENT_TYPES.has(contentType))throw new Error('Format de document non autorisé. Utilisez PDF, JPG, PNG ou WEBP.');
      const buf=Buffer.from(String(a.content),'base64');if(!buf.length||buf.length>MAX_SINGLE_FILE)throw new Error('Un fichier dépasse la taille autorisée.');
      totalBytes+=buf.length;if(totalBytes>MAX_REQUEST_TOTAL)throw new Error('Pièces jointes trop volumineuses (12 Mo maximum).');
      const path=`account-requests/${ref.id}/${String(i+1).padStart(2,'0')}-${safeFilename(a.filename)}`;
      await bucket.file(path).save(buf,{resumable:false,contentType,metadata:{cacheControl:'private, no-store',metadata:{requestId:ref.id}}});
      attachments.push({filename:safeFilename(a.filename),contentType,role:clean(a.role,30).toLowerCase(),size:buf.length,storagePath:path});
    }
    const storedRoles=new Set(attachments.map(a=>a.role));if(!storedRoles.has('rib')||!storedRoles.has('kbis'))return res.status(400).json({success:false,error:'Le RIB et le Kbis n’ont pas pu être enregistrés.'});
    const data={requestType:type,status:'a_valider',reference,existingClientId,codeClient:type==='mise_a_jour'?clean(p.codeClient,20).toUpperCase():'',departementAuth:type==='mise_a_jour'?clean(p.departementAuth,3).toUpperCase():'',societe:clean(p.societe),activite:clean(p.activite),adresse:clean(p.adresse),codePostal:clean(p.codePostal,5),ville:clean(p.ville),departement:depFromCp(p.codePostal),siret:clean(p.siret,30),tva:clean(p.tva,40),chiffreAffaires:clean(p.chiffreAffaires,50),contact:clean(p.contact),fonction:clean(p.fonction),telephone:clean(p.telephone,40),email:clean(p.email,200),emailsAutres:Array.isArray(p.emailsAutres)?p.emailsAutres.map(x=>clean(x,200)).filter(validEmail).slice(0,10):[],contactsAutres:clean(p.contactsAutres,3000),partenaires:Array.isArray(p.partenaires)?p.partenaires.map(x=>clean(x,100)).filter(Boolean).slice(0,30):[],demande:clean(p.demande,5000),attachments,consent:Boolean(p.consent!==false),submittedAt:admin.firestore.FieldValue.serverTimestamp(),source:'formulaire_public'};
    await ref.set(data);
    const {t,from,reply}=transporter('both');const adminUrl=`https://leroyfactory.fr/demandes-clients.html?request=${encodeURIComponent(ref.id)}`;
    await t.sendMail({from,to:['jerome@leroyfactory.fr','coryne@leroyfactory.fr'],replyTo:reply,subject:`${type==='mise_a_jour'?'Mise à jour':'Ouverture'} de compte — ${clean(data.societe,120)}`,html:`<p>Nouvelle demande client reçue.</p><p><strong>${html(data.societe)}</strong><br>${type==='mise_a_jour'?`Client : ${html(data.codeClient)}<br>`:''}Département : ${html(data.departement||data.departementAuth)}<br>Contact : ${html(data.contact)}<br>Email : ${html(data.email)}<br>CA annuel : ${html(data.chiffreAffaires||'Non renseigné')}<br>N° TVA : ${html(data.tva||'Non renseigné')}</p><p>Partenaires : ${data.partenaires.map(html).join(', ')||'Aucun'}</p><p>Documents joints : ${attachments.length} (RIB et Kbis présents)</p><p><a href="${adminUrl}">Voir et valider la demande dans le CRM</a></p><p>Référence : ${html(reference)}</p>`});
    res.status(200).json({success:true,id:ref.id,reference});
  }catch(e){console.error('submitAccountRequest',e);res.status(e.message?.includes('tentatives')?429:400).json({success:false,error:e.message||'Erreur serveur'})}
});

const getAccountRequestAttachment = onRequest({timeoutSeconds:60,memory:'256MiB'},async(req,res)=>{
  if(setCors(req,res))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  const user=await requireAgent(req,res);if(!user)return;
  try{
    const {requestId,index}=req.body||{};const snap=await db.collection('account_requests').doc(clean(requestId,120)).get();if(!snap.exists)return res.status(404).json({success:false,error:'Demande introuvable'});
    const a=(snap.data().attachments||[])[Number(index)];if(!a?.storagePath)return res.status(404).json({success:false,error:'Document introuvable'});
    const[b]=await bucket.file(a.storagePath).download();
    await db.collection('audit_logs').add({action:'account_attachment_downloaded',actorEmail:user.email,actorUid:user.uid||null,requestId:snap.id,filename:a.filename||'',createdAt:admin.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    res.json({success:true,content:b.toString('base64'),filename:a.filename,contentType:a.contentType});
  }catch(e){console.error(e);res.status(500).json({success:false,error:'Impossible de récupérer le document.'})}
});

const sendAccountPartnerMail = onRequest({secrets:['SMTP_PASSWORD_JEROME','SMTP_PASSWORD_CORYNE'],timeoutSeconds:120,memory:'512MiB'},async(req,res)=>{
  if(setCors(req,res))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  const user=await requireAgent(req,res);if(!user)return;
  try{
    const {requestId,partner,recipient,message,senderMode}=req.body||{};
    if(!requestId||!clean(partner)||!validEmail(recipient)||!clean(message))return res.status(400).json({success:false,error:'Paramètres invalides'});
    const safeSender=enforceSenderMode(user,senderMode||'both');if(!safeSender)return res.status(403).json({success:false,error:'Expéditeur non autorisé'});
    const snap=await db.collection('account_requests').doc(clean(requestId,120)).get();if(!snap.exists)return res.status(404).json({success:false,error:'Demande introuvable'});const d=snap.data();if(d.status!=='validee')return res.status(409).json({success:false,error:'La demande doit être validée avant envoi partenaire.'});
    const at=[];for(const a of d.attachments||[]){if(!a.storagePath)continue;const[b]=await bucket.file(a.storagePath).download();at.push({filename:a.filename,content:b,contentType:a.contentType||undefined})}
    const {t,from,reply}=transporter(safeSender);await t.sendMail({from,to:clean(recipient,200),replyTo:reply,subject:`Ouverture de compte ${clean(d.societe,100)} — ${clean(partner,100)}`,text:clean(message,12000),attachments:at});
    const key=String(partner).replace(/[.$#[\]/]/g,'_').slice(0,100);
    await snap.ref.set({partnerMails:{[key]:{sentAt:admin.firestore.FieldValue.serverTimestamp(),recipient:clean(recipient,200),sentBy:user.email}}},{merge:true});
    await db.collection('audit_logs').add({action:'account_partner_mail_sent',actorEmail:user.email,actorUid:user.uid||null,requestId:snap.id,partner:clean(partner,100),recipient:clean(recipient,200),createdAt:admin.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    res.json({success:true});
  }catch(e){console.error('sendAccountPartnerMail',e);res.status(500).json({success:false,error:'Échec de l’envoi partenaire.'})}
});

module.exports={submitAccountRequest,getAccountClientPrefill,getAccountRequestAttachment,sendAccountPartnerMail};
