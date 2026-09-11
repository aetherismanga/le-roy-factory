'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const { productByRef } = require('./bilt-catalog');

const db = admin.firestore();
const JEROME = 'jerome@leroyfactory.fr';
const CORYNE = 'coryne@leroyfactory.fr';
const CARLES = 'carlesb@biltbs.com';
const CC = [JEROME, CORYNE];
const REGION = 'us-central1';
const RUN_AUDIENCE = 'https://biltautoreleasesweep-5m3lsyu7bq-uc.a.run.app';
const CF_AUDIENCE = 'https://us-central1-le-roy-factory.cloudfunctions.net/biltAutoReleaseSweep';
const googleVerifier = new OAuth2Client();

function clean(v,max=500){return String(v??'').trim().slice(0,max)}
function esc(v){return clean(v,1600).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function euro(v){return Number(v||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
function smtp(){const pass=process.env.SMTP_PASSWORD_JEROME;if(!pass)throw new Error('Mot de passe SMTP indisponible.');return nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:JEROME,pass}})}

async function verifySchedulerRequest(req){
  const auth=String(req.headers.authorization||'');
  const match=auth.match(/^Bearer\s+(.+)$/i);
  if(!match)return null;
  const ticket=await googleVerifier.verifyIdToken({idToken:match[1],audience:[RUN_AUDIENCE,CF_AUDIENCE]});
  const payload=ticket.getPayload()||{};
  const email=String(payload.email||'').toLowerCase();
  if(payload.email_verified!==true||!email.endsWith('@le-roy-factory.iam.gserviceaccount.com'))return null;
  return {email,sub:String(payload.sub||'')};
}

function normalizeItems(rawItems){
  if(!Array.isArray(rawItems)||!rawItems.length)throw new Error('Commande BILT vide.');
  return rawItems.map(raw=>{
    const ref=clean(raw?.ref,30).toUpperCase();const p=productByRef(ref);if(!p)throw new Error(`Référence BILT inconnue : ${ref}.`);
    const quantity=Number(raw?.quantity);if(!Number.isInteger(quantity)||quantity<p.minQty||quantity%p.minQty!==0)throw new Error(`${ref} : quantité invalide.`);
    const netPrice=Number(p.net);const lineNet=Number((netPrice*quantity).toFixed(2));
    return {...p,quantity,netPrice,discountPercent:0,finalUnit:netPrice,lineNet,lineFinal:lineNet};
  });
}
function totals(items){const totalNet=Number(items.reduce((s,i)=>s+i.lineNet,0).toFixed(2));return {totalNet,totalFinal:totalNet}}
function rowHtml(i){return `<tr><td style="border:1px solid #ddd;padding:7px"><strong>${esc(i.ref)}</strong></td><td style="border:1px solid #ddd;padding:7px">${esc(i.name)}<br><small>${esc(i.format)}</small></td><td style="border:1px solid #ddd;padding:7px;text-align:center">${i.quantity} ${esc(i.minUnit)}</td><td style="border:1px solid #ddd;padding:7px;text-align:right">${euro(i.netPrice)}</td><td style="border:1px solid #ddd;padding:7px;text-align:right"><strong>${euro(i.lineFinal)}</strong></td></tr>`}
function table(items){return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px"><thead><tr style="background:#0f5737;color:#fff"><th style="padding:8px;border:1px solid #ddd">Réf.</th><th style="padding:8px;border:1px solid #ddd">Produit</th><th style="padding:8px;border:1px solid #ddd">Qté</th><th style="padding:8px;border:1px solid #ddd">NET HT</th><th style="padding:8px;border:1px solid #ddd">Total HT</th></tr></thead><tbody>${items.map(rowHtml).join('')}</tbody></table>`}

async function sendOrder(order){
  const items=normalizeItems(order.rawItems||[]),sum=totals(items),ctx=order.customer||{},contact=order.contact||{};
  const subject=`Commande BILT — ${ctx.societe||'Client'} — ${ctx.codeClient||''} — ${items.length} référence${items.length>1?'s':''}`;
  const html=`<div style="font-family:Arial,sans-serif;line-height:1.5;color:#1a2530"><p>Bonjour Carles,</p><p>Merci de bien vouloir enregistrer la commande BILT suivante pour <strong>${esc(ctx.societe)}</strong>.</p><p><strong>Tarif appliqué : NET BILT, sans remise.</strong><br><small>Première commande libérée automatiquement après le délai de validation LE ROY FACTORY de 3 jours.</small></p>${table(items)}<p style="font-size:16px"><strong>Total commande NET HT :</strong> ${euro(sum.totalFinal)}</p><p><strong>Client :</strong> ${esc(ctx.societe)} — ${esc(ctx.codeClient)}<br><strong>Contact :</strong> ${esc(contact.name||'')} ${contact.fonction?`— ${esc(contact.fonction)}`:''}<br><strong>E-mail :</strong> ${esc(order.selectedEmail||'')}${order.selectedPhone?`<br><strong>Téléphone :</strong> ${esc(order.selectedPhone)}`:''}${ctx.adresse?`<br><strong>Adresse :</strong> ${esc(ctx.adresse)}`:''}</p>${order.note?`<p><strong>Note :</strong> ${esc(order.note)}</p>`:''}<p>Merci de nous confirmer la prise en compte de cette commande.</p><p>Cordialement,<br><strong>Jérôme & Coryne — LE ROY FACTORY</strong></p></div>`;
  const info=await smtp().sendMail({from:'"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>',to:CARLES,cc:CC,replyTo:'jerome@leroyfactory.fr, coryne@leroyfactory.fr',subject,html});
  return {items,totals:sum,messageId:info?.messageId||null,subject};
}

async function finalize(orderRef,order,sent){
  const customerRef=db.collection('bilt_customers').doc(order.customer.clientId);const batch=db.batch();
  batch.set(customerRef,{clientId:order.customer.clientId,codeClient:order.customer.codeClient,societe:order.customer.societe,firstOrderReviewed:true,firstOrderPending:false,discountPercent:0,discountStartsAt:null,discountExpiresAt:null,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  batch.update(orderRef,{status:'sent',statusLabel:'Envoyée automatiquement après 3 jours',sentAt:admin.firestore.FieldValue.serverTimestamp(),discountPercent:0,totalNet:sent.totals.totalNet,totalFinal:sent.totals.totalFinal,items:sent.items,mailMessageId:sent.messageId,decisionSource:'auto_72h_github',autoReleased:true,approvalTokenHash:admin.firestore.FieldValue.delete(),processedAt:admin.firestore.FieldValue.serverTimestamp(),autoReleaseTaskStatus:'done',autoReleaseMode:'github_actions',autoReleaseTaskError:admin.firestore.FieldValue.delete()});
  await batch.commit();
  await db.collection('account_requests').add({requestType:'commande_bilt',status:'envoyee',clientId:order.customer.clientId,societe:order.customer.societe,codeClient:order.customer.codeClient,contact:order.contact?.name||'',email:order.selectedEmail||'',telephone:order.selectedPhone||'',partenaire:'Bilt',submittedAt:admin.firestore.FieldValue.serverTimestamp(),demande:`Commande BILT — ${sent.items.length} référence${sent.items.length>1?'s':''} — ${euro(sent.totals.totalFinal)} HT`,commande:{orderId:orderRef.id,items:sent.items,totalNet:sent.totals.totalNet,totalFinal:sent.totals.totalFinal,discountPercent:0,note:order.note||'',decisionSource:'auto_72h_github'},recipients:{to:CARLES,cc:CC},mailMessageId:sent.messageId,source:'commande-bilt'}).catch(e=>console.warn('Historique BILT auto non bloquant',e));
}

async function claim(orderRef){return db.runTransaction(async tx=>{const snap=await tx.get(orderRef);if(!snap.exists)return null;const data=snap.data();if(data.status!=='pending_approval')return null;const deadline=Number(data.approvalDeadlineMs||0);if(!deadline||Date.now()+5000<deadline)return {tooEarly:true,data,deadline};tx.update(orderRef,{status:'processing',processingAt:admin.firestore.FieldValue.serverTimestamp(),autoReleaseTaskStatus:'processing',autoReleaseMode:'github_actions'});return {data}})}

exports.biltAutoReleaseSweep = onRequest({region:REGION,timeoutSeconds:300,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},async(req,res)=>{
  res.set('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  try{
    const caller=await verifySchedulerRequest(req);
    if(!caller)return res.status(401).json({success:false,error:'Authentification du planificateur refusée.'});
    const snap=await db.collection('bilt_orders').where('status','==','pending_approval').limit(200).get();
    const now=Date.now();let due=0,sent=0,failed=0;
    for(const doc of snap.docs){
      const data=doc.data();const deadline=Number(data.approvalDeadlineMs||0);
      if(!deadline||deadline>now)continue;
      due++;
      const orderRef=doc.ref;const claimed=await claim(orderRef);
      if(!claimed||claimed.tooEarly)continue;
      try{const result=await sendOrder(claimed.data);await finalize(orderRef,claimed.data,result);sent++;}
      catch(error){failed++;console.error('BILT AUTO RELEASE SWEEP',doc.id,error);await orderRef.update({status:'pending_approval',processingAt:admin.firestore.FieldValue.delete(),autoReleaseTaskStatus:'retrying',autoReleaseTaskError:String(error.message||error),autoReleaseMode:'github_actions'}).catch(()=>{});}
    }
    return res.status(200).json({success:true,caller:caller.email,checked:snap.size,due,sent,failed});
  }catch(error){console.error('BILT AUTO RELEASE AUTH/SWEEP',error);return res.status(401).json({success:false,error:'Planificateur BILT non autorisé.'});}
});
