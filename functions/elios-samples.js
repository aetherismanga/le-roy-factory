'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const nodemailer=require('nodemailer');
const {clientFromSessionToken}=require('./pro-session');
const {getAgentFromRequest}=require('./auth');
const {storagePath,normalizePrices}=require('./configurator-purchase-prices-core');
const catalogue=require('./elios-samples-catalogue.json');
const C=require('./elios-samples-core.cjs');
const ORIGINS=new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr','https://studio-one-beta-test-v2.vercel.app']);
async function identity(req,body){
 const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 const agent=bearer.includes('.')?await getAgentFromRequest(req):null;
 if(agent)return {owner:'agent:'+agent.uid,societe:agent.email.startsWith('jerome')?'Jérôme Hugol':'Coryne',codeClient:'',contact:{name:agent.email.startsWith('jerome')?'Jérôme Hugol':'Coryne',email:agent.email,telephone:'',address:''}};
 const session=await clientFromSessionToken(bearer||body.sessionToken,{renew:true}),client=session?.client;
 if(!client)throw C.fail('Connectez votre compte LRF pour envoyer la demande.',401);
 if(!(client.partenaires||[]).some(p=>['elios','eliosceramica'].includes(String(p).toLowerCase().replace(/[^a-z]/g,''))))throw C.fail('L’accès Elios n’est pas activé pour ce compte.',403);
 return {owner:'client:'+client.id,societe:C.text(client.societe),codeClient:C.text(client.codeClient),contact:{name:C.text(client.contact),email:C.text(client.email),telephone:C.text(client.telephone),address:[client.adresse,client.codePostal||client.code_postal,client.ville].filter(Boolean).join(' ')}};
}
async function prices(req,body){
 let exact={};
 try{
 const file=admin.storage().bucket().file(storagePath('studio-one'));
 const [metadata]=await file.getMetadata();if(Number(metadata.size)>2*1024*1024||metadata.metadata?.firebaseStorageDownloadTokens)throw Error('Invalid private catalogue');
 const [bytes]=await file.download({validation:'crc32c'});exact=normalizePrices(JSON.parse(bytes.toString('utf8')),'studio-one').products;
 }catch{}
 // Reuse the live catalogue already used on the Elios selection pages. The
 // gateway independently verifies the same original credential and partner.
 const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,''),token=body.sessionToken||(!bearer.includes('.')?bearer:'');
 const response=await fetch('https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs',{method:'POST',headers:{'Content-Type':'application/json',...(bearer.includes('.')?{Authorization:'Bearer '+bearer}:{})},body:JSON.stringify({action:'bootstrap',...(token?{sessionToken:token}:{})}),signal:AbortSignal.timeout(20000)});
 const rates=await response.json();if(!response.ok||rates.success!==true||!rates.allowedPartners?.includes('elios-ceramica')||!Number.isFinite(rates.expiresAt)||rates.expiresAt<=Date.now())throw Error('Current Elios tariff unavailable');
 return C.currentPrices(catalogue,exact,rates.elios||{});
}
function contact(input,account){
 const c={name:C.text(input?.name||account.contact.name,160),email:C.text(input?.email||account.contact.email,254),telephone:C.text(input?.telephone||account.contact.telephone,60),address:C.text(input?.address||account.contact.address,600)};
 if(!c.name||!c.address||!/^\S+@\S+\.\S+$/.test(c.email))throw C.fail('Renseignez le contact, son e-mail et l’adresse de livraison.');return c;
}
exports.eliosSamples=onRequest({region:'us-central1',timeoutSeconds:120,memory:'512MiB',maxInstances:4,secrets:['SMTP_PASSWORD_JEROME']},async(req,res)=>{
 const origin=String(req.headers.origin||'');if(ORIGINS.has(origin))res.set('Access-Control-Allow-Origin',origin);
 res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type, Authorization');res.set('Access-Control-Allow-Methods','POST, OPTIONS');res.set('Cache-Control','private, no-store');res.set('X-LRF-Elios-Samples-Version',C.VERSION);
 if(origin&&!ORIGINS.has(origin))return res.status(403).json({success:false,error:'Origine non autorisée.'});
 if(req.method==='OPTIONS')return res.status(204).send('');if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
 try{
  const body=req.body||{};if(JSON.stringify(body).length>4100000)throw C.fail('La demande dépasse la taille maximale.',413);
  const account=await identity(req,body);
  if(body.action==='context')return res.json({success:true,customer:{societe:account.societe,codeClient:account.codeClient,...account.contact}});
  if(!['quote','send'].includes(body.action))throw C.fail('Action inconnue.');
  let rates={};if(body.items?.some(i=>i.type==='box')){try{rates=await prices(req,body);}catch{throw C.fail('Les tarifs HT ne sont pas disponibles. Votre projet reste enregistré ; réessayez avant l’envoi.',503);}}
  const quote=C.buildQuote(body.items,catalogue,rates,body.profiles);
  if(body.action==='quote')return res.json({success:true,quote});
  const customer=contact(body.contact,account),hasBox=quote.rows.some(row=>row.type==='box');
  const project=hasBox?C.checkedProject(body.project):null,visual=hasBox?C.pngAttachment(body.visual):null;
  const id=C.text(body.requestId,80);if(!/^[a-zA-Z0-9-]{20,80}$/.test(id))throw C.fail('Identifiant de demande manquant.');
  const db=admin.firestore(),fingerprint=C.requestFingerprint({...body,contact:customer},account),ref=db.collection('elios_sample_requests').doc(require('node:crypto').createHash('sha256').update(account.owner+'|'+id).digest('hex'));
  const existing=(await ref.get()).data();
  if(existing?.fingerprint&&existing.fingerprint!==fingerprint)throw C.fail('La sélection a changé. Préparez une nouvelle demande.',409);
  if(existing?.status==='sent')return res.json({success:true,delivered:true,reference:existing.reference});
  if(['sending','partial','delivery-uncertain'].includes(existing?.status))throw C.fail('Cette demande a déjà fait l’objet d’un envoi. Conservez sa référence et vérifiez sa réception auprès de LRF avant de recommencer.',409);
  const reference=existing?.reference||'ELIOS-'+new Date().getUTCFullYear()+'-'+ref.id.slice(0,10).toUpperCase(),now=Date.now(),limit=db.collection('configurator_mail_limits').doc(require('node:crypto').createHash('sha256').update(account.owner+'|elios|'+Math.floor(now/3600000)).digest('hex'));
  await db.runTransaction(async tx=>{
   const current=(await tx.get(ref)).data(),l=(await tx.get(limit)).data();if(current?.status==='sending'||current?.status==='sent')throw C.fail('Demande déjà transmise ou en cours.',409);
   if((l?.count||0)>=12)throw C.fail('Douze demandes par heure maximum. Réessayez plus tard.',429);
   tx.set(limit,{count:(l?.count||0)+1,expiresAt:admin.firestore.Timestamp.fromMillis(now+86400000)});
   tx.set(ref,{reference,fingerprint,owner:account.owner,customer:{societe:account.societe,codeClient:account.codeClient,...customer},quote,title:C.text(body.title,100),note:C.text(body.note,2000),status:'preparing',createdAt:existing?.createdAt||new Date().toISOString(),recipients:C.RECIPIENTS});
  });
  const attachments=[];let paths={};
  if(project){
   const bucket=admin.storage().bucket(),prefix='elios-expo-requests/'+ref.id;
   const configuration=JSON.stringify({format:'lrf-elios-box',version:1,title:C.text(body.title,100),project},null,2);
   paths={visual:prefix+'/visuel.png',configuration:prefix+'/configuration.json'};
   await bucket.file(paths.visual).save(visual.bytes,{resumable:false,contentType:'image/png',metadata:{cacheControl:'private, no-store'}});
   await bucket.file(paths.configuration).save(configuration,{resumable:false,contentType:'application/json',metadata:{cacheControl:'private, no-store'}});
   attachments.push({filename:reference+'-visuel-HD.png',content:visual.bytes,contentType:'image/png'},{filename:reference+'-box.lrf.json',content:configuration,contentType:'application/json'});
  }
  const title=C.text(body.title||'Échantillons et exposition',100).replace(/[\r\n]/g,' ');
  await ref.update({paths,status:'sending'});
  const transport=nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:'jerome@leroyfactory.fr',pass:process.env.SMTP_PASSWORD_JEROME},connectionTimeout:15000,socketTimeout:30000});
  let sent;
  try{sent=await transport.sendMail({from:'"Jérôme & Coryne — LE ROY FACTORY" <jerome@leroyfactory.fr>',to:C.RECIPIENTS,replyTo:customer.email,subject:`${hasBox?'Demande d’expo':'Demande d’échantillons'} ELIOS — ${account.societe} — ${reference}`,html:C.mailHTML({reference,account,contact:customer,quote,title,note:C.text(body.note,2000),box:hasBox}),attachments});}
  catch{await ref.update({status:'delivery-uncertain'}).catch(()=>{});throw C.fail('La réception du mail n’a pas été confirmée. La demande est enregistrée ; contactez LRF avant de renouveler l’envoi.',503);}
  const allAccepted=C.RECIPIENTS.every(email=>(sent.accepted||[]).some(value=>String(value).toLowerCase()===email));
  await ref.update({status:allAccepted?'sent':'partial',messageId:sent.messageId||'',sentAt:new Date().toISOString()});
  if(!allAccepted)throw C.fail('L’envoi n’a pas été accepté pour tous les destinataires. La demande est enregistrée ; contactez LRF.',503);
  // SMTP acceptance is final even when the secondary CRM index is unavailable.
  await db.collection('account_requests').doc(ref.id).set({requestType:'echantillons_elios',reference,status:'envoyee',societe:account.societe,codeClient:account.codeClient,...customer,partenaire:'Elios Ceramica',submittedAt:admin.firestore.FieldValue.serverTimestamp(),demande:`${title} — ${quote.rows.length} références — ${quote.incomplete?'sous-total':'total'} HT ${quote.subtotalHT}`,eliosSamples:{requestId:ref.id,quote,paths},source:'elios-echantillons'}).catch(()=>{});
  return res.json({success:true,delivered:true,reference});
 }catch(error){return res.status(error.status||503).json({success:false,error:error.status?error.message:'Le service Elios est momentanément indisponible. Votre sélection est conservée.'});}
});
