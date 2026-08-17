const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const db = admin.firestore();
const bucket = admin.storage().bucket();

function cors(req,res){res.set('Access-Control-Allow-Origin','*');res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');if(req.method==='OPTIONS'){res.status(204).send('');return true}return false}
function depFromCp(cp){const s=String(cp||'').replace(/\s/g,'');if(!/^\d{5}$/.test(s))return'';if(s.startsWith('97')||s.startsWith('98'))return s.slice(0,3);if(s.startsWith('20'))return Number(s)>=20200?'2B':'2A';return s.slice(0,2)}
function clean(v,max=500){return String(v||'').trim().slice(0,max)}
function smtp(senderMode='both'){
  let user='jerome@leroyfactory.fr',pass=process.env.SMTP_PASSWORD_JEROME,from='"Jérôme Hugol - Le Roy Factory" <jerome@leroyfactory.fr>',reply='jerome@leroyfactory.fr';
  if(senderMode==='coryne'){user='coryne@leroyfactory.fr';pass=process.env.SMTP_PASSWORD_CORYNE;from='"Coryne - Le Roy Factory" <coryne@leroyfactory.fr>';reply='coryne@leroyfactory.fr'}
  if(senderMode==='both'){from='"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>';reply='jerome@leroyfactory.fr, coryne@leroyfactory.fr'}
  return{user,pass,from,reply}
}
function transporter(senderMode){const s=smtp(senderMode);return{t:nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:s.user,pass:s.pass}}),...s}}
function safeFilename(name){return String(name||'document').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)}
async function verifiedClient(codeRaw,depRaw){
  const code=clean(codeRaw,20).toUpperCase(),dep=clean(depRaw,3).toUpperCase();
  if(!/^LRF-\d{5}$/.test(code)||!dep)return null;
  const snap=await db.collection('clients').where('codeClient','==',code).limit(1).get();if(snap.empty)return null;
  const doc=snap.docs[0],c=doc.data();const clientDep=String(c.departement||depFromCp(c.codePostal||c.code_postal)||'').toUpperCase();
  if(clientDep!==dep)return null;return{id:doc.id,...c,departement:clientDep};
}

const getAccountClientPrefill = onRequest({timeoutSeconds:30,memory:'256MiB'},async(req,res)=>{
  if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  try{
    const c=await verifiedClient(req.body?.codeClient,req.body?.departement);
    if(!c)return res.status(403).json({success:false,error:'Code client ou département incorrect.'});
    res.json({success:true,client:{societe:clean(c.societe),activite:clean(c.activite||c.categorieActivite),adresse:clean(c.adresse),codePostal:clean(c.codePostal||c.code_postal,5),ville:clean(c.ville),siret:clean(c.siret,30),tva:clean(c.tva,40),chiffreAffaires:clean(c.chiffreAffaires||c.chiffre_affaires,50),contact:clean(c.contact),fonction:clean(c.fonction),telephone:clean(c.telephone||(Array.isArray(c.telephones)?c.telephones[0]:''),40),email:clean(c.email,200),emails:Array.isArray(c.emails)?c.emails.map(x=>clean(x,200)).filter(Boolean):Array.isArray(c.emailsAutres)?c.emailsAutres.map(x=>clean(x,200)).filter(Boolean):[],contactsAutres:clean(c.contactsAutres,3000),partenaires:Array.isArray(c.partenaires)?c.partenaires.map(x=>clean(x,100)).filter(Boolean):[]}});
  }catch(e){console.error('getAccountClientPrefill',e);res.status(500).json({success:false,error:'Impossible de charger la fiche pour le moment.'})}
});

const submitAccountRequest = onRequest({secrets:['SMTP_PASSWORD_JEROME','SMTP_PASSWORD_CORYNE'],timeoutSeconds:120,memory:'512MiB'},async(req,res)=>{
  if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  try{
    const p=req.body||{};const type=p.requestType==='mise_a_jour'?'mise_a_jour':'ouverture';
    if(!clean(p.societe)||!clean(p.email)||!clean(p.codePostal)||!clean(p.tva))return res.status(400).json({success:false,error:'Société, e-mail, code postal et numéro de TVA sont obligatoires.'});
    let existingClientId='';
    if(type==='mise_a_jour'){
      const c=await verifiedClient(p.codeClient,p.departementAuth);if(!c)return res.status(403).json({success:false,error:'Code client ou département incorrect.'});existingClientId=c.id;
    }
    const rawFiles=Array.isArray(p.attachments)?p.attachments:[];
    const roles=new Set(rawFiles.map(a=>String(a?.role||'').toLowerCase()));
    if(!roles.has('rib')||!roles.has('kbis'))return res.status(400).json({success:false,error:'Le RIB et le Kbis sont obligatoires.'});
    const ref=db.collection('account_requests').doc();const date=new Date();const reference=`DMD-${date.toISOString().slice(0,10).replace(/-/g,'')}-${ref.id.slice(0,5).toUpperCase()}`;
    const total=rawFiles.reduce((n,a)=>n+Number(a.size||0),0);if(total>12*1024*1024)return res.status(413).json({success:false,error:'Pièces jointes trop volumineuses (12 Mo maximum).'});
    const attachments=[];
    for(let i=0;i<rawFiles.length;i++){
      const a=rawFiles[i]||{};if(!a.content||!a.filename)continue;const buf=Buffer.from(a.content,'base64');if(buf.length>8*1024*1024)throw new Error('Un fichier dépasse la taille autorisée.');
      const path=`account-requests/${ref.id}/${String(i+1).padStart(2,'0')}-${safeFilename(a.filename)}`;await bucket.file(path).save(buf,{resumable:false,contentType:a.contentType||'application/octet-stream',metadata:{cacheControl:'no-store'}});attachments.push({filename:safeFilename(a.filename),contentType:a.contentType||'application/octet-stream',role:clean(a.role,30),size:buf.length,storagePath:path});
    }
    const storedRoles=new Set(attachments.map(a=>a.role));if(!storedRoles.has('rib')||!storedRoles.has('kbis'))return res.status(400).json({success:false,error:'Le RIB et le Kbis n’ont pas pu être enregistrés.'});
    const data={requestType:type,status:'a_valider',reference,existingClientId,codeClient:type==='mise_a_jour'?clean(p.codeClient,20).toUpperCase():'',departementAuth:type==='mise_a_jour'?clean(p.departementAuth,3).toUpperCase():'',societe:clean(p.societe),activite:clean(p.activite),adresse:clean(p.adresse),codePostal:clean(p.codePostal,5),ville:clean(p.ville),departement:depFromCp(p.codePostal),siret:clean(p.siret,30),tva:clean(p.tva,40),chiffreAffaires:clean(p.chiffreAffaires,50),contact:clean(p.contact),fonction:clean(p.fonction),telephone:clean(p.telephone,40),email:clean(p.email,200),emailsAutres:Array.isArray(p.emailsAutres)?p.emailsAutres.map(x=>clean(x,200)).filter(Boolean):[],contactsAutres:clean(p.contactsAutres,3000),partenaires:Array.isArray(p.partenaires)?p.partenaires.map(x=>clean(x,100)).filter(Boolean):[],demande:clean(p.demande,5000),attachments,consent:true,submittedAt:admin.firestore.FieldValue.serverTimestamp(),source:'formulaire_public'};
    await ref.set(data);
    const {t,from,reply}=transporter('both');const adminUrl=`https://leroyfactory.fr/demandes-clients.html?request=${ref.id}`;
    await t.sendMail({from,to:['jerome@leroyfactory.fr','coryne@leroyfactory.fr'],replyTo:reply,subject:`${type==='mise_a_jour'?'Mise à jour':'Ouverture'} de compte — ${data.societe}`,html:`<p>Nouvelle demande client reçue.</p><p><strong>${data.societe}</strong><br>${type==='mise_a_jour'?`Client : ${data.codeClient}<br>`:''}Département : ${data.departement||data.departementAuth}<br>Contact : ${data.contact}<br>Email : ${data.email}<br>CA annuel : ${data.chiffreAffaires||'Non renseigné'}<br>N° TVA : ${data.tva}</p><p>Partenaires : ${data.partenaires.join(', ')||'Aucun'}</p><p>Documents joints : ${attachments.length} (RIB et Kbis présents)</p><p><a href="${adminUrl}">Voir et valider la demande dans le CRM</a></p><p>Référence : ${reference}</p>`});
    res.status(200).json({success:true,id:ref.id,reference});
  }catch(e){console.error('submitAccountRequest',e);res.status(500).json({success:false,error:e.message||'Erreur serveur'})}
});

const getAccountRequestAttachment = onRequest({timeoutSeconds:60,memory:'256MiB'},async(req,res)=>{
  if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  try{const {requestId,index}=req.body||{};const snap=await db.collection('account_requests').doc(String(requestId||'')).get();if(!snap.exists)return res.status(404).json({success:false,error:'Demande introuvable'});const a=(snap.data().attachments||[])[Number(index)];if(!a?.storagePath)return res.status(404).json({success:false,error:'Document introuvable'});const[b]=await bucket.file(a.storagePath).download();res.json({success:true,content:b.toString('base64'),filename:a.filename,contentType:a.contentType})}catch(e){console.error(e);res.status(500).json({success:false,error:e.message})}
});

const sendAccountPartnerMail = onRequest({secrets:['SMTP_PASSWORD_JEROME','SMTP_PASSWORD_CORYNE'],timeoutSeconds:120,memory:'512MiB'},async(req,res)=>{
  if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  try{
    const {requestId,partner,recipient,message,senderMode}=req.body||{};if(!requestId||!partner||!recipient||!message)return res.status(400).json({success:false,error:'Paramètres manquants'});
    const snap=await db.collection('account_requests').doc(String(requestId)).get();if(!snap.exists)return res.status(404).json({success:false,error:'Demande introuvable'});const d=snap.data();if(d.status!=='validee')return res.status(409).json({success:false,error:'La demande doit être validée avant envoi partenaire.'});
    const at=[];for(const a of d.attachments||[]){if(!a.storagePath)continue;const[b]=await bucket.file(a.storagePath).download();at.push({filename:a.filename,content:b,contentType:a.contentType||undefined})}
    const {t,from,reply}=transporter(senderMode||'both');await t.sendMail({from,to:String(recipient),replyTo:reply,subject:`Ouverture de compte ${d.societe||''} — ${partner}`,text:String(message),attachments:at});
    await snap.ref.set({partnerMails:{[String(partner).replace(/[.]/g,'_')]:{sentAt:admin.firestore.FieldValue.serverTimestamp(),recipient:String(recipient)}}},{merge:true});
    res.json({success:true});
  }catch(e){console.error('sendAccountPartnerMail',e);res.status(500).json({success:false,error:e.message})}
});

module.exports={submitAccountRequest,getAccountClientPrefill,getAccountRequestAttachment,sendAccountPartnerMail};