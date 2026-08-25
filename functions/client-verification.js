const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const db = admin.firestore();
const { setCors } = require("./security");

const PURPOSES = new Set(["pro_access", "account_update"]);
const CHALLENGE_MINUTES = 10;
const VERIFICATION_MINUTES = 20;

function clean(v,max=200){return String(v||"").trim().slice(0,max)}
function depFromCp(cp){const s=String(cp||'').replace(/\s/g,'');if(!/^\d{5}$/.test(s))return'';if(s.startsWith('97')||s.startsWith('98'))return s.slice(0,3);if(s.startsWith('20'))return Number(s)>=20200?'2B':'2A';return s.slice(0,2)}
function sha(v){return crypto.createHash("sha256").update(String(v||"")).digest("hex")}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim())}
function maskEmail(value){const email=String(value||'');const [local,domain]=email.split('@');if(!local||!domain)return'';const shown=local.length<=2?local[0]||'*':local.slice(0,2);return `${shown}${'*'.repeat(Math.max(2,Math.min(8,local.length-shown.length)))}@${domain}`}

function primaryEmail(c){
  const candidates=[c.email,c.mail,c.eMail,c.Email,c.Mail,...(Array.isArray(c.emails)?c.emails:[]),...(Array.isArray(c.emailsAutres)?c.emailsAutres:[])];
  return candidates.map(v=>String(v||'').trim().toLowerCase()).find(validEmail)||'';
}

async function verifiedClient(codeRaw,depRaw){
  const code=clean(codeRaw,20).toUpperCase(),dep=clean(depRaw,3).toUpperCase();
  if(!/^LRF-\d{5}$/.test(code)||!/^(?:\d{2,3}|2A|2B)$/i.test(dep))return null;
  const snap=await db.collection('clients').where('codeClient','==',code).limit(1).get();if(snap.empty)return null;
  const doc=snap.docs[0],c=doc.data();const clientDep=String(c.departement||depFromCp(c.codePostal||c.code_postal)||'').toUpperCase();
  if(clientDep!==dep||String(c.type||'client').toLowerCase()==='prospect'||c.archived===true||c.archive===true)return null;
  return{id:doc.id,...c,departement:clientDep};
}

async function rateLimit(req,key,max){
  const ip=String(req.headers['x-forwarded-for']||req.ip||'unknown').split(',')[0].trim();
  const hour=new Date().toISOString().slice(0,13).replace(/[^0-9]/g,'');
  const ref=db.collection('rate_limits').doc(`verify_${key}_${sha(ip).slice(0,18)}_${hour}`);
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);const count=Number(snap.data()?.count||0);if(count>=max)throw new Error('Trop de tentatives. Réessayez plus tard.');tx.set(ref,{count:count+1,key,hour,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});
}

function mailTransport(){
  const pass=process.env.SMTP_PASSWORD_JEROME;if(!pass)throw new Error('Service de vérification indisponible.');
  return nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:'jerome@leroyfactory.fr',pass}});
}

async function sendCode(email,code,purpose){
  const label=purpose==='account_update'?'mise à jour de votre compte':'accès à vos tarifs professionnels';
  await mailTransport().sendMail({
    from:'"LE ROY FACTORY" <jerome@leroyfactory.fr>',
    to:email,
    replyTo:'jerome@leroyfactory.fr',
    subject:`Votre code de vérification LE ROY FACTORY : ${code}`,
    text:`Votre code de vérification LE ROY FACTORY est ${code}. Il est valable ${CHALLENGE_MINUTES} minutes pour ${label}. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html:`<p>Bonjour,</p><p>Votre code de vérification LE ROY FACTORY est :</p><p style="font-size:28px;font-weight:800;letter-spacing:5px">${code}</p><p>Il est valable <strong>${CHALLENGE_MINUTES} minutes</strong> pour ${label}.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`
  });
}

exports.requestClientVerification = onRequest({secrets:["SMTP_PASSWORD_JEROME"],timeoutSeconds:60,memory:"256MiB"},async(req,res)=>{
  if(setCors(req,res,{publicEndpoint:true}))return;if(req.method!=="POST")return res.status(405).json({success:false,error:'Méthode non autorisée'});
  try{
    await rateLimit(req,'request',8);
    const purpose=clean(req.body?.purpose,30);if(!PURPOSES.has(purpose))return res.status(400).json({success:false,error:'Demande de vérification invalide.'});
    const client=await verifiedClient(req.body?.codeClient,req.body?.departement);
    if(!client)return res.status(403).json({success:false,error:'Identifiant client ou département incorrect.'});
    const email=primaryEmail(client);if(!email)return res.status(409).json({success:false,error:"Aucun e-mail de vérification n'est enregistré sur ce compte. Contactez votre agent."});
    await rateLimit(req,`client_${sha(client.id).slice(0,12)}`,5);

    const ref=db.collection('client_verification_challenges').doc();
    const code=String(crypto.randomInt(100000,1000000));
    const expiresAt=new Date(Date.now()+CHALLENGE_MINUTES*60000);
    await ref.set({clientId:client.id,codeClient:clean(client.codeClient,20),departement:client.departement,purpose,emailHash:sha(email),codeHash:sha(`${ref.id}:${code}`),attempts:0,used:false,createdAt:admin.firestore.FieldValue.serverTimestamp(),expiresAt:admin.firestore.Timestamp.fromDate(expiresAt)});
    try{
      await sendCode(email,code,purpose);
    }catch(error){
      await ref.delete().catch(()=>{});
      throw error;
    }
    res.json({success:true,challengeId:ref.id,maskedEmail:maskEmail(email),expiresAt:expiresAt.toISOString()});
  }catch(error){console.error('requestClientVerification',error);res.status(error.message?.includes('Trop de tentatives')?429:500).json({success:false,error:error.message||'Impossible d’envoyer le code.'})}
});

exports.verifyClientVerification = onRequest({timeoutSeconds:30,memory:"256MiB"},async(req,res)=>{
  if(setCors(req,res,{publicEndpoint:true}))return;if(req.method!=="POST")return res.status(405).json({success:false,error:'Méthode non autorisée'});
  try{
    await rateLimit(req,'verify',20);
    const challengeId=clean(req.body?.challengeId,120),code=clean(req.body?.code,12);if(!challengeId||!/^\d{6}$/.test(code))return res.status(400).json({success:false,error:'Code de vérification invalide.'});
    const ref=db.collection('client_verification_challenges').doc(challengeId);
    const result=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists)return{error:'Vérification expirée.'};
      const d=snap.data();
      if(d.used===true||!d.expiresAt||d.expiresAt.toMillis()<=Date.now())return{error:'Vérification expirée.'};
      const attempts=Number(d.attempts||0);
      if(attempts>=5)return{error:'Trop de codes incorrects. Demandez un nouveau code.'};
      if(d.codeHash!==sha(`${challengeId}:${code}`)){
        tx.update(ref,{attempts:attempts+1,lastFailedAt:admin.firestore.FieldValue.serverTimestamp()});
        return{error:attempts+1>=5?'Trop de codes incorrects. Demandez un nouveau code.':'Code incorrect.'};
      }
      tx.update(ref,{used:true,verifiedAt:admin.firestore.FieldValue.serverTimestamp()});
      return{clientId:d.clientId,purpose:d.purpose};
    });
    if(result.error)throw new Error(result.error);

    const token=crypto.randomBytes(32).toString('base64url');const tokenHash=sha(token);const expiresAt=new Date(Date.now()+VERIFICATION_MINUTES*60000);
    await db.collection('client_verifications').doc(tokenHash).set({clientId:result.clientId,purpose:result.purpose,used:false,createdAt:admin.firestore.FieldValue.serverTimestamp(),expiresAt:admin.firestore.Timestamp.fromDate(expiresAt)});
    res.json({success:true,verificationToken:token,purpose:result.purpose,expiresAt:expiresAt.toISOString()});
  }catch(error){console.error('verifyClientVerification',error);const msg=String(error.message||'Vérification impossible.');res.status(msg.includes('Trop de tentatives')?429:400).json({success:false,error:msg})}
});

async function resolveClientVerification(token,purpose,{consume=false}={}){
  const raw=String(token||'').trim();if(!raw)return null;const ref=db.collection('client_verifications').doc(sha(raw));
  if(consume){
    const result=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)return null;const d=snap.data();
      if(d.purpose!==purpose||!d.expiresAt||d.expiresAt.toMillis()<=Date.now()||d.used===true)return null;
      tx.update(ref,{used:true,usedAt:admin.firestore.FieldValue.serverTimestamp()});
      return{clientId:d.clientId};
    });
    if(!result?.clientId)return null;
    const clientSnap=await db.collection('clients').doc(String(result.clientId)).get();
    return clientSnap.exists?{id:clientSnap.id,...clientSnap.data()}:null;
  }
  const snap=await ref.get();if(!snap.exists)return null;const d=snap.data();
  if(d.purpose!==purpose||!d.expiresAt||d.expiresAt.toMillis()<=Date.now()||d.used===true)return null;
  const clientSnap=await db.collection('clients').doc(String(d.clientId||'')).get();return clientSnap.exists?{id:clientSnap.id,...clientSnap.data()}:null;
}

module.exports.resolveClientVerification=resolveClientVerification;
module.exports.verifiedClient=verifiedClient;
