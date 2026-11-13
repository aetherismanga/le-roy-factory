'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const nodemailer=require('nodemailer');
const {clientFromSessionToken}=require('./pro-session');
const {getAgentFromRequest}=require('./auth');
const {storagePath,normalizePrices}=require('./configurator-purchase-prices-core');
const catalogue=require('./elios-samples-catalogue.json');
const C=require('./elios-samples-core.cjs');
const {selectionImageAttachments}=require('./elios-samples-images.cjs');
const ORIGINS=new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr','https://studio-one-beta-test-v2.vercel.app']);
async function identity(req,body){
 const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 const agent=bearer.includes('.')?await getAgentFromRequest(req):null;
 if(agent&&body.targetClientId)return C.agentCustomer(admin.firestore(),agent,body.targetClientId);
 if(agent)return {isAgent:true,createdBy:{uid:agent.uid,email:agent.email},owner:'agent:'+agent.uid,societe:agent.email.startsWith('jerome')?'Jérôme Hugol':'Coryne',codeClient:'',contact:{name:agent.email.startsWith('jerome')?'Jérôme Hugol':'Coryne',email:agent.email,telephone:'',address:''}};
 if(body.targetClientId)throw C.fail('Seuls Jérôme et Coryne peuvent créer pour un autre client.',403);
 const session=await clientFromSessionToken(bearer||body.sessionToken,{renew:true}),client=session?.client;
 if(!client)throw C.fail('Connectez votre compte LRF pour accéder aux échantillons.',401);
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
exports.eliosSamples=onRequest({region:'us-central1',timeoutSeconds:120,memory:'512MiB',maxInstances:4},async(req,res)=>{
 const origin=String(req.headers.origin||'');if(ORIGINS.has(origin))res.set('Access-Control-Allow-Origin',origin);
 res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type, Authorization');res.set('Access-Control-Allow-Methods','POST, OPTIONS');res.set('Cache-Control','private, no-store');res.set('X-LRF-Elios-Samples-Version',C.VERSION);
 if(origin&&!ORIGINS.has(origin))return res.status(403).json({success:false,error:'Origine non autorisée.'});
 if(req.method==='OPTIONS')return res.status(204).send('');if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
 try{
  const body=req.body||{};if(JSON.stringify(body).length>8500000)throw C.fail('La demande dépasse la taille maximale.',413);
  const account=await identity(req,body);
  if(body.action==='clients'){
   if(!account.isAgent)throw C.fail('Accès agent requis.',403);
   const clean=v=>C.text(v,240).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),query=clean(body.query);
   const snapshot=await admin.firestore().collection('clients').select('societe','nom','codeClient','ville','deleted','archived').limit(5001).get();
   if(snapshot.docs.length>5000)throw C.fail('La liste clients dépasse la capacité de recherche.',503);
   const clients=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(c=>!c.deleted&&!c.archived&&(!query||clean([c.societe,c.nom,c.codeClient,c.ville].join(' ')).includes(query))).sort((a,b)=>String(a.societe||a.nom).localeCompare(String(b.societe||b.nom),'fr')).slice(0,50).map(c=>({id:c.id,societe:C.text(c.societe||c.nom),codeClient:C.text(c.codeClient,40),ville:C.text(c.ville)}));
   return res.json({success:true,clients});
  }
  const db=admin.firestore(),ownerId=require('node:crypto').createHash('sha256').update(account.owner).digest('hex'),detailsRef=db.collection('elios_sample_contacts').doc(ownerId);
  if(body.action==='context'){
   const saved=(await detailsRef.get()).data();
   return res.json({success:true,isAgent:!!account.isAgent,owner:account.owner,customer:{societe:account.societe,codeClient:account.codeClient,...account.contact},requestDetails:saved?.details||null,requestDetailsUpdatedAt:saved?.updatedAt||''});
  }
  if(body.action==='saveInfo'){
   const details=Object.fromEntries(['name','email','telephone','address','note'].map(k=>[k,C.text(body.details?.[k],{name:160,email:254,telephone:60,address:600,note:2000}[k])]));
   if(details.email&&!/^\S+@\S+\.\S+$/.test(details.email))throw C.fail('Vérifiez l’adresse e-mail.');
   const updatedAt=new Date().toISOString();await detailsRef.set({owner:account.owner,details,updatedAt});
   return res.json({success:true,details,updatedAt});
  }
  // An LRF session authorizes catalogue access, not access to a client's mailbox.
  // Never fall back to Jérôme's SMTP account or claim a Sent-folder write.
  if(body.action==='send')throw C.fail('Ouvrez à nouveau le récapitulatif pour envoyer depuis votre propre messagerie.',409);
  if(body.action==='confirmClientSent'){
   const id=C.text(body.requestId,80);if(!/^[a-zA-Z0-9-]{20,80}$/.test(id))throw C.fail('Identifiant de demande manquant.');
   const ref=db.collection('elios_sample_requests').doc(require('node:crypto').createHash('sha256').update(account.owner+'|'+id).digest('hex'));
   let record;
   await db.runTransaction(async tx=>{record=(await tx.get(ref)).data();if(!record||record.owner!==account.owner||!['prepared','sent'].includes(record.status)||record.deliveryMode!=='client-mail')throw C.fail('Préparez le mail avant de confirmer son envoi.',409);if(record.status==='prepared')tx.set(ref,{...record,status:'sent',deliveryStatus:'reported-by-client',sentAt:new Date().toISOString()});});
   await db.collection('account_requests').doc(ref.id).set({requestType:'echantillons_elios',reference:record.reference,status:'envoi_declare_client',societe:account.societe,codeClient:account.codeClient,...record.customer,partenaire:'Elios Ceramica',submittedAt:admin.firestore.FieldValue.serverTimestamp(),eliosSamples:{requestId:ref.id,quote:record.quote,paths:record.paths||{},deliveryStatus:'reported-by-client'},source:'elios-echantillons'}).catch(()=>{});
   return res.json({success:true,reportedByClient:true,reference:record.reference});
  }
  if(!['quote','prepare'].includes(body.action))throw C.fail('Action inconnue.');
  let rates={};if(body.items?.some(i=>i.type==='box')){try{rates=await prices(req,body);}catch{throw C.fail('Les tarifs HT ne sont pas disponibles. Votre projet reste enregistré ; réessayez avant l’envoi.',503);}}
  const quote=C.buildQuote(body.items,catalogue,rates,body.profiles);
  if(body.action==='quote')return res.json({success:true,quote});
  const customer=contact(body.contact,account),hasBox=quote.rows.some(row=>row.type==='box');
  const project=hasBox?C.checkedProject(body.project):null,visual=hasBox?C.pngAttachment(body.visual):null;
  const id=C.text(body.requestId,80);if(!/^[a-zA-Z0-9-]{20,80}$/.test(id))throw C.fail('Identifiant de demande manquant.');
  const fingerprint=C.requestFingerprint({...body,contact:customer},account),ref=db.collection('elios_sample_requests').doc(require('node:crypto').createHash('sha256').update(account.owner+'|'+id).digest('hex'));
  const existing=(await ref.get()).data();
  if(existing?.fingerprint&&existing.fingerprint!==fingerprint)throw C.fail('La sélection a changé. Préparez une nouvelle demande.',409);
  if(existing?.status==='sent')throw C.fail('Cette demande est déjà indiquée comme envoyée. Modifiez la sélection pour une nouvelle demande.',409);
  if(['sending','partial','delivery-uncertain'].includes(existing?.status))throw C.fail('Cette demande a déjà fait l’objet d’un envoi. Conservez sa référence et vérifiez sa réception auprès de LRF avant de recommencer.',409);
  const reference=existing?.reference||'ELIOS-'+new Date().getUTCFullYear()+'-'+ref.id.slice(0,10).toUpperCase(),now=Date.now(),limit=db.collection('configurator_mail_limits').doc(require('node:crypto').createHash('sha256').update(account.owner+'|elios|'+Math.floor(now/3600000)).digest('hex'));
  await db.runTransaction(async tx=>{
   const current=(await tx.get(ref)).data(),l=(await tx.get(limit)).data();if(current?.status==='sending'||current?.status==='sent')throw C.fail('Demande déjà transmise ou en cours.',409);
   if(!current&&(l?.count||0)>=12)throw C.fail('Douze demandes par heure maximum. Réessayez plus tard.',429);
   tx.set(limit,{count:(l?.count||0)+(current?0:1),expiresAt:admin.firestore.Timestamp.fromMillis(now+86400000)});
   tx.set(ref,{reference,fingerprint,owner:account.owner,budgetYear:quote.budgetYear,...(account.createdBy?{createdBy:account.createdBy}:{}),customer:{societe:account.societe,codeClient:account.codeClient,...customer},quote,title:C.text(body.title,100),note:C.text(body.note,2000),status:'preparing',createdAt:existing?.createdAt||new Date().toISOString(),recipients:C.RECIPIENTS,to:C.TO,cc:C.CC,deliveryMode:'client-mail'});
  });
  const attachments=[];let paths={};
  if(project){
   const bucket=admin.storage().bucket(),prefix='elios-expo-requests/'+ref.id;
   const configuration=JSON.stringify({format:'lrf-elios-box',version:1,title:C.text(body.title,100),project},null,2);
   paths={visual:prefix+'/visuel.png',configuration:prefix+'/configuration.json'};
   await bucket.file(paths.visual).save(visual.bytes,{resumable:false,contentType:'image/png',metadata:{cacheControl:'private, no-store'}});
   await bucket.file(paths.configuration).save(configuration,{resumable:false,contentType:'application/json',metadata:{cacheControl:'private, no-store'}});
   attachments.push({filename:reference+'-visuel-HD.png',content:visual.bytes,contentType:'image/png',cid:'elios-box-hd@leroyfactory.fr',contentDisposition:'inline'},{filename:reference+'-box.lrf.json',content:configuration,contentType:'application/json'});
  }
  attachments.push(...await selectionImageAttachments(quote.rows,{fetchImage:fetch}));
  const title=C.text(body.title||'Échantillons et exposition',100).replace(/[\r\n]/g,' ');
  const subject=`${hasBox?'Demande d’expo':'Demande d’échantillons'} ELIOS — ${account.societe} — ${reference}`;
  const content={reference,account,contact:customer,quote,title,note:C.text(body.note,2000),box:hasBox};
  const html=C.mailHTML(content),text=C.mailText(content);
  const message={from:{name:customer.name,address:customer.email},to:C.TO,cc:C.CC,subject,html,text,headers:{'X-Unsent':'1'},attachments};
  // Compile a complete MIME draft in memory. This transport has no network or
  // SMTP credentials; only the client's mail application can send the result.
  const compiled=await nodemailer.createTransport({streamTransport:true,buffer:true,newline:'windows'}).sendMail(message);
  await ref.update({paths,status:'prepared',preparedAt:new Date().toISOString()});
  return res.json({success:true,prepared:true,delivered:false,reference,mail:{from:customer.email,to:C.TO,cc:C.CC,subject,text,filename:reference+'.eml',content:compiled.message.toString('base64'),files:attachments.map(a=>({filename:a.filename,type:a.contentType,content:Buffer.isBuffer(a.content)?a.content.toString('base64'):Buffer.from(a.content).toString('base64')}))}});

 }catch(error){return res.status(error.status||503).json({success:false,error:error.status?error.message:'Le service Elios est momentanément indisponible. Votre sélection est conservée.'});}
});
