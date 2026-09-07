'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { clientFromSessionToken } = require('./pro-session');
const { VERSION, productByRef, publicCatalog } = require('./bilt-catalog');

const db = admin.firestore();
const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
const CARLES = 'carlesb@biltbs.com';
const JEROME = 'jerome@leroyfactory.fr';
const CORYNE = 'coryne@leroyfactory.fr';
const CC = [JEROME, CORYNE];
const REVIEW_URL = 'https://leroyfactory.fr/bilt-remise.html';
const APPROVAL_MS = 72 * 60 * 60 * 1000;
const MAX_ITEMS = 80;

function cors(req,res){const origin=String(req.headers.origin||'');res.set('Access-Control-Allow-Origin',ALLOWED_ORIGINS.has(origin)?origin:'https://leroyfactory.fr');res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');res.set('Cache-Control','no-store');if(req.method==='OPTIONS'){res.status(204).send('');return true}return false}
function clean(v,max=300){return String(v??'').trim().slice(0,max)}
function esc(v){return clean(v,1200).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function euro(v){return Number(v||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
function validEmail(v){return /^\S+@\S+\.\S+$/.test(String(v||'').trim())}
function isoDate(v){if(!v)return null;const d=v?.toDate?.()||new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}
function unique(values){return [...new Set(values.map(v=>clean(v,180)).filter(Boolean))]}
function personName(p){return [p?.civilite,p?.prenom,p?.nom].map(x=>clean(x,80)).filter(Boolean).join(' ').trim()}
function phoneValue(v){if(typeof v==='string'||typeof v==='number')return clean(v,60);if(v&&typeof v==='object')return clean(v.telephone||v.tel||v.phone||v.numero||v.number,60);return ''}
function hasBiltAccess(client){return Array.isArray(client?.partenaires)&&client.partenaires.some(p=>norm(p)==='bilt'||norm(p)==='biltbuildingsolutions')}

function clientContext(client){
  const emailValues=[client.email,client.mail,client.eMail];if(Array.isArray(client.emails))emailValues.push(...client.emails);if(Array.isArray(client.emailsAutres))emailValues.push(...client.emailsAutres);
  const phoneValues=[client.telephone,client.tel,client.phone];if(Array.isArray(client.telephones))client.telephones.forEach(v=>phoneValues.push(phoneValue(v)));
  const contacts=[],seen=new Set();
  const add=(id,name,fonction,email,telephone)=>{name=clean(name,120);fonction=clean(fonction,100);email=clean(email,180).toLowerCase();telephone=clean(telephone,60);if(email)emailValues.push(email);if(telephone)phoneValues.push(telephone);if(!name)return;const key=`${name.toLowerCase()}|${email}|${telephone}`;if(seen.has(key))return;seen.add(key);contacts.push({id,name,fonction,email:validEmail(email)?email:'',telephone})};
  add('principal',client.contact||client.nomContact||'',client.fonction||'',client.email||'',client.telephone||'');
  (Array.isArray(client.interlocuteurs)?client.interlocuteurs:[]).forEach((p,index)=>add(`interlocuteur-${index}`,personName(p)||p?.contact||'',p?.fonction||p?.role||'',p?.email||'',phoneValue(p)));
  if(!contacts.length)add('societe',client.societe||'Contact société','',client.email||'',client.telephone||'');
  const adresse=clean(client.adresse||client.address||'',220),cp=clean(client.codePostal||client.cp||'',20),ville=clean(client.ville||client.city||'',100);
  return {clientId:client.id,codeClient:clean(client.codeClient,30).toUpperCase(),societe:clean(client.societe||'Client professionnel',140),emails:unique(emailValues.filter(validEmail)).map(v=>v.toLowerCase()),phones:unique(phoneValues),contacts,adresse:[adresse,[cp,ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')};
}
async function authenticatedClient(token){const r=await clientFromSessionToken(token,{renew:true});return r?.client||null}
function resolveContact(ctx,id){const wanted=clean(id,80);return ctx.contacts.find(c=>c.id===wanted)||ctx.contacts[0]||null}
function smtp(){const pass=process.env.SMTP_PASSWORD_JEROME;if(!pass)throw new Error('Mot de passe SMTP indisponible.');return nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:JEROME,pass}})}
function hashToken(token){return crypto.createHash('sha256').update(String(token)).digest('hex')}
function addSixMonths(date){const d=new Date(date);const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+6);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return d}
function activeDiscount(customer){const percent=[5,10].includes(Number(customer?.discountPercent))?Number(customer.discountPercent):0;const expires=customer?.discountExpiresAt?.toDate?.()||null;return percent&&expires&&expires.getTime()>Date.now()?{percent,expiresAt:expires.toISOString()}:{percent:0,expiresAt:null}}

function normalizeItems(rawItems, discountPercent){
  if(!Array.isArray(rawItems)||rawItems.length<1||rawItems.length>MAX_ITEMS)throw new Error(`Le panier doit contenir entre 1 et ${MAX_ITEMS} références.`);
  const seen=new Set();
  return rawItems.map(raw=>{
    const ref=clean(raw?.ref,30).toUpperCase();const p=productByRef(ref);if(!p)throw new Error(`Référence BILT inconnue : ${ref||'vide'}.`);if(seen.has(ref))throw new Error(`Référence en double : ${ref}.`);seen.add(ref);
    const quantity=Number(raw?.quantity);if(!Number.isInteger(quantity)||quantity<p.minQty||quantity>100000||quantity%p.minQty!==0)throw new Error(`${ref} : quantité obligatoire par multiple de ${p.minQty} ${p.minUnit}.`);
    const netPrice=Number(p.net);const finalUnit=Number((netPrice*(1-discountPercent/100)).toFixed(4));const lineNet=Number((netPrice*quantity).toFixed(2));const lineFinal=Number((finalUnit*quantity).toFixed(2));
    return {...p,quantity,netPrice,discountPercent,finalUnit,lineNet,lineFinal};
  });
}
function totals(items){return {totalNet:Number(items.reduce((s,i)=>s+i.lineNet,0).toFixed(2)),totalFinal:Number(items.reduce((s,i)=>s+i.lineFinal,0).toFixed(2)),totalUnits:items.reduce((s,i)=>s+i.quantity,0)}}
function rowHtml(i){return `<tr><td style="border:1px solid #ddd;padding:7px"><strong>${esc(i.ref)}</strong></td><td style="border:1px solid #ddd;padding:7px">${esc(i.name)}<br><small>${esc(i.format)}</small></td><td style="border:1px solid #ddd;padding:7px;text-align:center">${i.quantity} ${esc(i.minUnit)}</td><td style="border:1px solid #ddd;padding:7px;text-align:right">${euro(i.netPrice)}</td>${i.discountPercent?`<td style="border:1px solid #ddd;padding:7px;text-align:right">-${i.discountPercent}%</td><td style="border:1px solid #ddd;padding:7px;text-align:right"><strong>${euro(i.finalUnit)}</strong></td>`:''}<td style="border:1px solid #ddd;padding:7px;text-align:right"><strong>${euro(i.lineFinal)}</strong></td></tr>`}
function orderTable(items){const discounted=items.some(i=>i.discountPercent);return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px"><thead><tr style="background:#0f5737;color:#fff"><th style="padding:8px;border:1px solid #ddd">Réf.</th><th style="padding:8px;border:1px solid #ddd">Produit</th><th style="padding:8px;border:1px solid #ddd">Qté</th><th style="padding:8px;border:1px solid #ddd">NET HT</th>${discounted?'<th style="padding:8px;border:1px solid #ddd">Remise LRF</th><th style="padding:8px;border:1px solid #ddd">NET final</th>':''}<th style="padding:8px;border:1px solid #ddd">Total HT</th></tr></thead><tbody>${items.map(rowHtml).join('')}</tbody></table>`}

async function sendOrderMail(order, discountPercent, decisionSource){
  const items=normalizeItems(order.rawItems||order.items||[],discountPercent);const sum=totals(items);const ctx=order.customer;const contact=order.contact||{};const subject=`Commande BILT — ${ctx.societe} — ${ctx.codeClient} — ${items.length} référence${items.length>1?'s':''}`;
  const discountLine=discountPercent?`<p style="padding:10px 12px;background:#eef8f1;border-left:4px solid #0f5737"><strong>Remise exceptionnelle LE ROY FACTORY : ${discountPercent}%</strong><br>Tarifs de cette commande recalculés sur la base NET BILT.</p>`:'<p><strong>Tarif appliqué : NET BILT, sans remise.</strong></p>';
  const html=`<div style="font-family:Arial,sans-serif;line-height:1.5;color:#1a2530"><p>Bonjour Carles,</p><p>Merci de bien vouloir enregistrer la commande BILT suivante pour <strong>${esc(ctx.societe)}</strong>.</p>${discountLine}${orderTable(items)}<p style="font-size:16px"><strong>Total NET HT avant remise :</strong> ${euro(sum.totalNet)}<br>${discountPercent?`<strong>Total NET HT après remise ${discountPercent}% :</strong> ${euro(sum.totalFinal)}`:`<strong>Total commande NET HT :</strong> ${euro(sum.totalFinal)}`}</p><p><strong>Client :</strong> ${esc(ctx.societe)} — ${esc(ctx.codeClient)}<br><strong>Contact :</strong> ${esc(contact.name||'')} ${contact.fonction?`— ${esc(contact.fonction)}`:''}<br><strong>E-mail :</strong> ${esc(order.selectedEmail||'')}${order.selectedPhone?`<br><strong>Téléphone :</strong> ${esc(order.selectedPhone)}`:''}${ctx.adresse?`<br><strong>Adresse :</strong> ${esc(ctx.adresse)}`:''}</p>${order.note?`<p><strong>Note :</strong> ${esc(order.note)}</p>`:''}<p>Merci de nous confirmer la prise en compte de cette commande.</p><p>Cordialement,<br><strong>Jérôme & Coryne — LE ROY FACTORY</strong></p></div>`;
  const info=await smtp().sendMail({from:'"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>',to:CARLES,cc:CC,replyTo:'jerome@leroyfactory.fr, coryne@leroyfactory.fr',subject,html});
  return {items,totals:sum,messageId:info?.messageId||null,subject,decisionSource};
}

async function sendApprovalMail(orderRef,order,token){
  const items=normalizeItems(order.rawItems||[],0),sum=totals(items);const deadline=new Date(order.approvalDeadlineMs);const link=`${REVIEW_URL}?token=${encodeURIComponent(token)}`;const html=`<div style="font-family:Arial,sans-serif;color:#1a2530;line-height:1.55"><div style="background:#0f5737;color:#fff;padding:16px 18px"><h2 style="margin:0">Première commande BILT</h2></div><p>Une première commande BILT vient d’être passée par <strong>${esc(order.customer.societe)}</strong> (${esc(order.customer.codeClient)}).</p><p>Avant envoi à BILT, choisis l’avantage commercial à appliquer : <strong>aucune remise, 5% ou 10%</strong>. Une remise choisie sera appliquée à cette première commande et restera valable 6 mois sur les prochaines commandes BILT de ce client.</p>${orderTable(items)}<p><strong>Total NET HT :</strong> ${euro(sum.totalNet)}</p><p style="text-align:center;margin:24px 0"><a href="${esc(link)}" style="display:inline-block;background:#111;color:#f1cf63;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:9px">VALIDER 0% / 5% / 10%</a></p><p style="font-size:13px;color:#66706a">Ce lien est personnel, sécurisé et à usage unique. Sans réponse avant le <strong>${deadline.toLocaleString('fr-FR',{timeZone:'Europe/Paris'})}</strong>, la commande sera envoyée automatiquement à BILT au tarif NET, sans remise.</p><p>Référence interne : ${esc(orderRef.id)}</p></div>`;
  return smtp().sendMail({from:'"LE ROY FACTORY — BILT" <jerome@leroyfactory.fr>',to:JEROME,subject:`Action requise — Première commande BILT — ${order.customer.societe}`,html});
}

async function notifyDiscount(order,percent,expiresAt){
  if(!percent||!validEmail(order.selectedEmail))return null;const html=`<div style="font-family:Arial,sans-serif;color:#1a2530;line-height:1.55"><p>Bonjour,</p><p>LE ROY FACTORY vous accorde une <strong>remise exceptionnelle de ${percent}%</strong> sur vos tarifs NET BILT.</p><p>Cette remise est appliquée à votre commande actuelle et restera valable jusqu’au <strong>${expiresAt.toLocaleDateString('fr-FR')}</strong>.</p><p>L’information est désormais visible directement dans votre espace de commande BILT associé à votre identifiant <strong>${esc(order.customer.codeClient)}</strong>.</p><p>Cordialement,<br><strong>Jérôme & Coryne — LE ROY FACTORY</strong></p></div>`;return smtp().sendMail({from:'"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>',to:order.selectedEmail,cc:CC,subject:`Votre avantage BILT LE ROY FACTORY — ${percent}% pendant 6 mois`,html});
}

async function writeAccountRequest(orderRef,order,sent,discountPercent,source){
  return db.collection('account_requests').add({requestType:'commande_bilt',status:'envoyee',clientId:order.customer.clientId,societe:order.customer.societe,codeClient:order.customer.codeClient,contact:order.contact?.name||'',email:order.selectedEmail||'',telephone:order.selectedPhone||'',partenaire:'Bilt',submittedAt:admin.firestore.FieldValue.serverTimestamp(),demande:`Commande BILT — ${sent.items.length} référence${sent.items.length>1?'s':''} — ${euro(sent.totals.totalFinal)} HT`,commande:{orderId:orderRef.id,items:sent.items,totalNet:sent.totals.totalNet,totalFinal:sent.totals.totalFinal,discountPercent,note:order.note||'',decisionSource:source},recipients:{to:CARLES,cc:CC},mailMessageId:sent.messageId,source:'commande-bilt'});
}

async function customerState(clientId){const snap=await db.collection('bilt_customers').doc(clientId).get();return snap.exists?snap.data():{} }
async function historyFor(clientId){const snap=await db.collection('bilt_orders').where('clientId','==',clientId).limit(100).get();return snap.docs.map(d=>{const x=d.data();return {id:d.id,status:x.status||'',statusLabel:x.statusLabel||'',createdAt:x.createdAtIso||isoDate(x.createdAt),sentAt:isoDate(x.sentAt),approvalDeadline:x.approvalDeadlineIso||null,discountPercent:Number(x.discountPercent||0),totalNet:Number(x.totalNet||0),totalFinal:Number(x.totalFinal||x.totalNet||0),itemCount:Number(x.itemCount||0),autoReleased:Boolean(x.autoReleased)}}).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,30)}

async function claimPending(orderRef){return db.runTransaction(async tx=>{const snap=await tx.get(orderRef);if(!snap.exists)return null;const data=snap.data();if(data.status!=='pending_approval')return null;tx.update(orderRef,{status:'processing',processingAt:admin.firestore.FieldValue.serverTimestamp()});return data})}
async function finishFirstOrder(orderRef,order,sent,percent,source,autoReleased=false){
  const now=new Date(),expires=percent?addSixMonths(now):null;const customerRef=db.collection('bilt_customers').doc(order.customer.clientId);const batch=db.batch();
  batch.set(customerRef,{clientId:order.customer.clientId,codeClient:order.customer.codeClient,societe:order.customer.societe,firstOrderReviewed:true,firstOrderPending:false,discountPercent:percent,discountStartsAt:percent?admin.firestore.Timestamp.fromDate(now):null,discountExpiresAt:expires?admin.firestore.Timestamp.fromDate(expires):null,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  batch.update(orderRef,{status:'sent',statusLabel:autoReleased?'Envoyée automatiquement après 3 jours':'Envoyée à BILT',sentAt:admin.firestore.FieldValue.serverTimestamp(),discountPercent:percent,totalNet:sent.totals.totalNet,totalFinal:sent.totals.totalFinal,items:sent.items,mailMessageId:sent.messageId,decisionSource:source,autoReleased,approvalTokenHash:admin.firestore.FieldValue.delete(),processedAt:admin.firestore.FieldValue.serverTimestamp()});
  await batch.commit();await writeAccountRequest(orderRef,order,sent,percent,source).catch(e=>console.warn('Historique BILT CRM non bloquant',e));
  if(percent)await notifyDiscount(order,percent,expires).catch(async e=>{console.error('Notification remise BILT',e);await orderRef.update({clientNotificationError:String(e.message||e)}).catch(()=>{})});
  return {expiresAt:expires?expires.toISOString():null};
}

async function processPending(orderRef,percent,source,autoReleased=false){
  const order=await claimPending(orderRef);if(!order)return {alreadyProcessed:true};
  try{const sent=await sendOrderMail(order,percent,source);const extra=await finishFirstOrder(orderRef,order,sent,percent,source,autoReleased);return {sent:true,discountPercent:percent,totalFinal:sent.totals.totalFinal,...extra};}
  catch(error){console.error('BILT pending send',error);await orderRef.update({status:'pending_approval',lastError:String(error.message||error),processingAt:admin.firestore.FieldValue.delete()}).catch(()=>{});throw error}
}

exports.biltOrder = onRequest({region:'us-central1',timeoutSeconds:90,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},async(req,res)=>{
  if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  try{
    const p=req.body||{},client=await authenticatedClient(p.sessionToken);if(!client)return res.status(401).json({success:false,error:'Session professionnelle expirée. Merci de vous reconnecter.'});if(!hasBiltAccess(client))return res.status(403).json({success:false,error:'BILT n’est pas autorisé sur votre compte professionnel.'});
    const ctx=clientContext(client),customer=await customerState(ctx.clientId),discount=activeDiscount(customer),history=await historyFor(ctx.clientId);const pending=history.find(h=>h.status==='pending_approval'||h.status==='processing')||null;
    if(clean(p.action,20).toLowerCase()==='context')return res.status(200).json({success:true,customer:ctx,catalog:publicCatalog(),discount,pendingFirstOrder:pending,history});
    if(pending||customer.firstOrderPending)return res.status(409).json({success:false,error:'Votre première commande BILT est déjà en attente de validation LE ROY FACTORY. Elle sera traitée au plus tard sous 3 jours.'});
    const contact=resolveContact(ctx,p.contactId);if(!contact)return res.status(400).json({success:false,error:'Aucun contact client disponible.'});const selectedEmail=clean(p.email||contact.email,180).toLowerCase();if(!selectedEmail||!ctx.emails.includes(selectedEmail))return res.status(400).json({success:false,error:'Sélectionnez une adresse e-mail enregistrée sur ce compte.'});const selectedPhone=clean(p.telephone||contact.telephone,60);if(selectedPhone&&!ctx.phones.includes(selectedPhone))return res.status(400).json({success:false,error:'Sélectionnez un numéro de téléphone enregistré sur ce compte.'});
    const rawItems=Array.isArray(p.items)?p.items:[];const effectiveDiscount=discount.percent;let items;try{items=normalizeItems(rawItems,effectiveDiscount)}catch(error){return res.status(400).json({success:false,error:error.message})}const sum=totals(items),note=clean(p.note,800),now=new Date(),orderRef=db.collection('bilt_orders').doc();const firstOrder=!customer.firstOrderReviewed;
    const base={clientId:ctx.clientId,customer:ctx,contact,selectedEmail,selectedPhone,note,rawItems:rawItems.map(x=>({ref:clean(x.ref,30).toUpperCase(),quantity:Number(x.quantity)})),itemCount:items.length,totalNet:sum.totalNet,totalFinal:sum.totalFinal,discountPercent:effectiveDiscount,catalogVersion:VERSION,createdAt:admin.firestore.FieldValue.serverTimestamp(),createdAtIso:now.toISOString(),source:'commande-bilt'};
    if(firstOrder){const token=crypto.randomBytes(32).toString('hex'),deadline=new Date(now.getTime()+APPROVAL_MS);await orderRef.set({...base,status:'pending_approval',statusLabel:'En attente validation LRF',discountPercent:0,totalFinal:sum.totalNet,approvalTokenHash:hashToken(token),approvalDeadline:admin.firestore.Timestamp.fromDate(deadline),approvalDeadlineMs:deadline.getTime(),approvalDeadlineIso:deadline.toISOString()});await db.collection('bilt_customers').doc(ctx.clientId).set({clientId:ctx.clientId,codeClient:ctx.codeClient,societe:ctx.societe,firstOrderReviewed:false,firstOrderPending:true,pendingOrderId:orderRef.id,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});try{const info=await sendApprovalMail(orderRef,{...base,approvalDeadlineMs:deadline.getTime()},token);await orderRef.update({approvalMailMessageId:info?.messageId||null,approvalMailSentAt:admin.firestore.FieldValue.serverTimestamp()})}catch(error){console.error('BILT approval mail',error);await orderRef.update({approvalMailError:String(error.message||error)}).catch(()=>{})}return res.status(200).json({success:true,pendingApproval:true,orderId:orderRef.id,approvalDeadline:deadline.toISOString(),totalNet:sum.totalNet,message:'Première commande enregistrée. Validation LE ROY FACTORY sous 3 jours maximum.'});}
    await orderRef.set({...base,status:'processing',statusLabel:'Envoi en cours'});try{const sent=await sendOrderMail({...base},effectiveDiscount,'automatic_active_rate');await orderRef.update({status:'sent',statusLabel:'Envoyée à BILT',sentAt:admin.firestore.FieldValue.serverTimestamp(),items:sent.items,totalNet:sent.totals.totalNet,totalFinal:sent.totals.totalFinal,mailMessageId:sent.messageId});await writeAccountRequest(orderRef,base,sent,effectiveDiscount,'automatic_active_rate').catch(()=>{});return res.status(200).json({success:true,sent:true,orderId:orderRef.id,discountPercent:effectiveDiscount,totalFinal:sent.totals.totalFinal});}catch(error){await orderRef.update({status:'send_error',statusLabel:'Erreur d’envoi',lastError:String(error.message||error)}).catch(()=>{});throw error}
  }catch(error){console.error('BILT ORDER',error);return res.status(500).json({success:false,error:'Impossible de traiter la commande BILT pour le moment.'})}
});

exports.biltDecision = onRequest({region:'us-central1',timeoutSeconds:90,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},async(req,res)=>{
  if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  try{const p=req.body||{},token=clean(p.token,200);if(token.length<40)return res.status(400).json({success:false,error:'Lien de validation invalide.'});const snap=await db.collection('bilt_orders').where('approvalTokenHash','==',hashToken(token)).limit(1).get();if(snap.empty)return res.status(404).json({success:false,error:'Ce lien n’est plus valide ou a déjà été utilisé.'});const orderRef=snap.docs[0].ref,order=snap.docs[0].data();
    const expired=Number(order.approvalDeadlineMs||0)>0&&Date.now()>Number(order.approvalDeadlineMs);if(clean(p.action,20).toLowerCase()==='preview')return res.status(200).json({success:true,order:{id:orderRef.id,societe:order.customer?.societe||'',codeClient:order.customer?.codeClient||'',createdAt:order.createdAtIso||'',deadline:order.approvalDeadlineIso||'',status:order.status,itemCount:order.itemCount,totalNet:order.totalNet,items:(order.rawItems||[]).map(x=>{const prod=productByRef(x.ref);return prod?{...prod,quantity:x.quantity}:x})},expired});
    if(expired){if(order.status==='pending_approval')await processPending(orderRef,0,'auto_expired_link',true);return res.status(410).json({success:false,expired:true,error:'Le délai de 3 jours est dépassé. La commande est partie normalement au tarif NET.'});}
    const percent=Number(p.percent);if(![0,5,10].includes(percent))return res.status(400).json({success:false,error:'Choisissez 0%, 5% ou 10%.'});const result=await processPending(orderRef,percent,percent?'manual_discount':'manual_no_discount',false);if(result.alreadyProcessed)return res.status(409).json({success:false,error:'Cette commande a déjà été traitée.'});return res.status(200).json({success:true,...result});
  }catch(error){console.error('BILT DECISION',error);return res.status(500).json({success:false,error:'Impossible de valider cette commande pour le moment.'})}
});

exports.biltAutoRelease = onSchedule({schedule:'every 60 minutes',timeZone:'Europe/Paris',region:'us-central1',timeoutSeconds:300,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},async()=>{
  const snap=await db.collection('bilt_orders').where('status','==','pending_approval').limit(100).get();const now=Date.now();for(const doc of snap.docs){const data=doc.data();if(Number(data.approvalDeadlineMs||0)>0&&Number(data.approvalDeadlineMs)<=now){try{await processPending(doc.ref,0,'auto_72h',true)}catch(error){console.error('BILT AUTO RELEASE',doc.id,error)}}}
});
