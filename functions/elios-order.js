const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const db = admin.firestore();
const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
const CATERINA = 'ctoni@eliosceramica.it';
const CC = ['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];
const ROMA_REFS = new Set([
  '0852040','0852005','0852640','0852605','0854240','0854205','0856140','0856105','0856100','0856170',
  '0854640','0854605','0854600','0854670','085M140','085M105','085M100','085M170','0852042','0852007',
  '0852642','0852607','0854242','0854207','0856C40','0856C05','0854642','0854607','0854602','0854672',
  '085M141','085M106','085H140','085H105','085H100','085H170','085B140','085B105','085B100','085B170',
  '085BC40','085BC05','085BC00','085BC70'
]);
const SPECIALS = new Set([
  'Gradino costa retta 33 × 60 cm',
  'Gradino costa retta angolo DX/SX 33 × 60 cm'
]);

function cors(req,res){
  const origin=String(req.headers.origin||'');
  res.set('Access-Control-Allow-Origin',ALLOWED_ORIGINS.has(origin)?origin:'https://leroyfactory.fr');
  res.set('Vary','Origin');
  res.set('Access-Control-Allow-Headers','Content-Type');
  res.set('Access-Control-Allow-Methods','POST, OPTIONS');
  res.set('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.status(204).send('');return true}
  return false;
}
function clean(v,max=180){return String(v||'').trim().slice(0,max)}
function esc(v){return clean(v,600).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function qty(v){const n=Number(v);return Number.isFinite(n)?n:null}
function unitLabel(unit,value){
  const u=String(unit||'MQ').toUpperCase();
  if(['MQ','M2','M²'].includes(u))return 'm²';
  if(['PZ','PCE','PCS'].includes(u))return Number(value)===1?'pièce':'pièces';
  if(['ML','M'].includes(u))return 'ml';
  return u;
}

exports.eliosOrder = onRequest({
  region:'us-central1',timeoutSeconds:60,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']
},async(req,res)=>{
  if(cors(req,res))return;
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  try{
    const p=req.body||{};
    const ref=clean(p.ref,30).toUpperCase();
    const format=clean(p.format,140);
    const orderOnly=Boolean(p.orderOnly);
    if(orderOnly){if(!SPECIALS.has(format))return res.status(400).json({success:false,error:'Pièce spéciale non autorisée.'})}
    else if(!ROMA_REFS.has(ref))return res.status(400).json({success:false,error:'Référence ROMA non autorisée.'});

    const boxes=Math.trunc(Number(p.boxes));
    if(!Number.isInteger(boxes)||boxes<1||boxes>999)return res.status(400).json({success:false,error:'Nombre de cartons incorrect.'});
    const orderQty=qty(p.orderQty);
    const requestedQty=qty(p.requestedQty);
    if(orderQty===null||orderQty<=0)return res.status(400).json({success:false,error:'Quantité de commande incorrecte.'});

    const societe=clean(p.societe,120);
    const contact=clean(p.contact,120);
    const email=clean(p.email,160).toLowerCase();
    const telephone=clean(p.telephone,40);
    const codeClient=clean(p.codeClient,30).toUpperCase();
    const note=clean(p.note,500);
    if(!societe||!contact||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({success:false,error:'Société, contact et e-mail sont obligatoires.'});

    const color=clean(p.color,40);
    const kind=clean(p.kind,80);
    const finish=clean(p.finish,120);
    const unit=clean(p.orderUnit,10).toUpperCase()||'MQ';
    const label=unitLabel(unit,orderQty);
    const subject=`Commande ELIOS — ROMA ${color}${ref?` — ${ref}`:''}`;
    const productName=`ROMA ${color} — ${kind}`;
    const refLine=ref||'Pièce spéciale sur commande';
    const qtyText=`${orderQty.toLocaleString('fr-FR',{maximumFractionDigits:3})} ${label}`;
    const requestedText=requestedQty?`${requestedQty.toLocaleString('fr-FR',{maximumFractionDigits:3})} ${unitLabel(unit,requestedQty)}`:'—';

    const html=`<div style="font-family:Arial,sans-serif;line-height:1.55;color:#1a2530">
      <p>Bonjour Caterina,</p>
      <p>Merci de bien vouloir enregistrer la commande suivante pour <strong>${esc(societe)}</strong> :</p>
      <table cellpadding="7" cellspacing="0" style="border-collapse:collapse;border:1px solid #ddd">
        <tr><td><strong>Collection</strong></td><td>ROMA</td></tr>
        <tr><td><strong>Produit</strong></td><td>${esc(productName)}</td></tr>
        <tr><td><strong>Référence</strong></td><td>${esc(refLine)}</td></tr>
        <tr><td><strong>Format</strong></td><td>${esc(format)}</td></tr>
        <tr><td><strong>Finition</strong></td><td>${esc(finish)}</td></tr>
        <tr><td><strong>Besoin saisi</strong></td><td>${esc(requestedText)}</td></tr>
        <tr><td><strong>Commande</strong></td><td><strong>${boxes} carton${boxes>1?'s':''} — ${esc(qtyText)}</strong></td></tr>
      </table>
      <p><strong>Client :</strong> ${esc(societe)}${codeClient?` — ${esc(codeClient)}`:''}<br>
      <strong>Contact :</strong> ${esc(contact)} — ${esc(email)}${telephone?` — ${esc(telephone)}`:''}</p>
      ${note?`<p><strong>Note :</strong> ${esc(note)}</p>`:''}
      <p>Merci de nous confirmer la prise en compte et le délai.</p>
      <p>Cordialement,<br><strong>Jérôme & Coryne — LE ROY FACTORY</strong></p>
    </div>`;

    const smtpPass=process.env.SMTP_PASSWORD_JEROME;
    if(!smtpPass)throw new Error('Mot de passe SMTP indisponible.');
    const transporter=nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:'jerome@leroyfactory.fr',pass:smtpPass}});
    const info=await transporter.sendMail({
      from:'"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>',
      to:CATERINA,
      cc:CC,
      replyTo:'jerome@leroyfactory.fr, coryne@leroyfactory.fr',
      subject,
      html
    });

    const requestRef=await db.collection('account_requests').add({
      requestType:'commande_elios',status:'envoyee',societe,contact,email,telephone,codeClient,
      partenaire:'Elios Ceramica',collection:'ROMA',submittedAt:admin.firestore.FieldValue.serverTimestamp(),
      demande:`Commande ELIOS ${refLine} — ${boxes} carton${boxes>1?'s':''} — ${qtyText}`,
      commande:{ref,color,kind,format,finish,boxes,requestedQty,orderQty,orderUnit:unit,orderOnly,note},
      recipients:{to:CATERINA,cc:CC},mailMessageId:info?.messageId||null,source:'disponibilites-elios'
    });

    return res.status(200).json({success:true,requestId:requestRef.id,messageId:info?.messageId||null});
  }catch(error){
    console.error('ELIOS ORDER',error);
    return res.status(500).json({success:false,error:'Impossible d’envoyer la commande pour le moment.'});
  }
});
