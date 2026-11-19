'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const nodemailer=require('nodemailer');
const {randomUUID}=require('node:crypto');
const {getAgentFromRequest}=require('./auth');
const {clientFromSessionToken}=require('./pro-session');
const {findEligibleProClient}=require('./pro-client-access.cjs');
const {failure,ORIGINS}=require('./fenice-request-core');
const {prepareOrder,crmCustomer,crmSellerProfiles,customerDetails,checkedId,hash,destinations}=require('./saxso-order-core.cjs');
const {createOrderPdf}=require('./saxso-order-pdf.cjs');
const db=admin.firestore();
const registry=require('./data/saxso-order-version.json');
let bookPromise;

async function priceBook(){
  if(!bookPromise) bookPromise=admin.storage().bucket().file(registry.path).download().then(([buffer])=>{
    const book=JSON.parse(buffer.toString('utf8'));
    if(book.sourceHash!==registry.sourceHash || book.indexHash!==registry.indexHash || book.rows.length!==53) throw Error('Unexpected order pricebook.');
    return new Map(book.rows.flatMap(row=>row.variantIds.map(id=>[id,row])));
  }).catch(error=>{bookPromise=null;throw error;});
  return bookPromise;
}
async function identity(req,body){
  if(req.headers.authorization){
    const agent=await getAgentFromRequest(req);
    if(!agent) throw failure('Reconnectez-vous à votre espace agent.',401);
    return {key:hash('agent:'+agent.uid),customer:crmCustomer({},agent)};
  }
  let client;
  if(body.sessionToken){
    if(typeof body.sessionToken!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(body.sessionToken)) throw failure('Session PRO expirée.',401);
    client=(await clientFromSessionToken(body.sessionToken,{renew:false}))?.client;
  } else {
    client=await findEligibleProClient(db,body.codeClient,body.departement);
  }
  if(!client) throw failure('Identifiez-vous avec votre compte PRO.',401);
  if(!Array.isArray(client.partenaires) || !client.partenaires.some(p=>['saxso','saxo','saxco'].includes(String(p).trim().toLowerCase()))) throw failure('Le tarif SAXSO est réservé aux comptes autorisés.',403);
  const key=hash('client:'+client.id);
  return {key,customer:crmCustomer(client),profiles:crmSellerProfiles(client,key)};
}
function profileCollection(key){return db.collection('saxso_order_accounts').doc(key).collection('sellers');}
async function deliver(order,account,pdf) {
  const sender=destinations[1];
  if(!process.env.SMTP_PASSWORD_JEROME) throw failure('La messagerie est temporairement indisponible.',503);
  const ref=db.collection('saxso_order_deliveries').doc(hash(account+'|'+order.requestId));
  const digest=hash(JSON.stringify(order));
  const reservation=await db.runTransaction(async tx=>{
    const previous=(await tx.get(ref)).data();
    if(previous && previous.digest!==digest) throw failure('Cette référence appartient à une autre version de la commande.',409);
    if(previous?.status==='sent') return {remaining:[],accepted:[]};
    if(previous?.status==='sending') throw failure('Transmission en cours de vérification. Conservez la référence '+order.orderId+'.',409);
    const accepted=previous?.accepted||[];
    tx.set(ref,{digest,orderId:order.orderId,status:'sending',accepted,updatedAt:Date.now()});
    return {remaining:destinations.filter(to=>!accepted.includes(to)),accepted};
  });
  if(!reservation.remaining.length) return;
  const transport=nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:sender,pass:process.env.SMTP_PASSWORD_JEROME},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:35000});
  let result;
  try{
    result=await transport.sendMail({
      from:{name:'LE ROY FACTORY · Commandes SAXSO',address:sender},to:destinations[0],cc:sender,
      envelope:{from:sender,to:reservation.remaining},replyTo:{name:order.customer.contact,address:order.customer.email},
      messageId:'<'+order.requestId+'@leroyfactory.fr>',
      subject:'Commande SAXSO · '+order.customer.store+' · '+order.orderId,
      text:'Bonjour,\n\nVeuillez trouver en pièce jointe le bon de commande '+order.orderId+' pour '+order.customer.store+' ('+order.pallets+' palettes). Le document précise les références, le contact et l’adresse de livraison.\n\nLE ROY FACTORY',
      attachments:[{filename:order.orderId+'.pdf',content:pdf,contentType:'application/pdf'}]
    });
  } catch(error){
    // Only retry unambiguous failures preceding SMTP acceptance.
    if(['EAUTH','EDNS','ECONNECTION','EENVELOPE'].includes(error.code) || Number(error.responseCode)>=400) {
      await ref.update({status:'retry',updatedAt:Date.now()});
    }
    throw failure('Transmission non confirmée. Conservez la référence '+order.orderId+'.',503);
  }
  const accepted=[...new Set([...reservation.accepted,...(result.accepted||[]).map(s=>String(s).toLowerCase())])];
  const sent=destinations.every(address=>accepted.includes(address));
  await ref.update({accepted,status:sent?'sent':'partial',updatedAt:Date.now()});
  if(!sent) throw failure('Transmission partielle. Réessayez avec la même référence pour le destinataire restant.',503);
}
exports.saxsoOrder=onRequest({region:'us-central1',timeoutSeconds:100,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},async(req,res)=>{
  const origin=String(req.headers.origin||'');
  res.set('Vary','Origin');res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');
  if(!ORIGINS.has(origin)) return res.status(403).json({success:false,error:'Origine non autorisée.'});
  res.set('Access-Control-Allow-Origin',origin);res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS') return res.status(204).send('');
  if(req.method!=='POST') return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  try{
    const body=req.body;
    if(!body || typeof body!=='object' || Buffer.byteLength(JSON.stringify(body))>60000) throw failure('Requête invalide.');
    const account=await identity(req,body);
    if(body.action==='profile'){
      const snapshot=await profileCollection(account.key).get();
      const profiles=new Map((account.profiles||[]).map(profile=>[profile.id,profile]));
      for(const doc of snapshot.docs) profiles.set(doc.id,{id:doc.id,...doc.data().customer});
      return res.json({success:true,customer:account.customer,profiles:[...profiles.values()].sort((a,b)=>a.contact.localeCompare(b.contact,'fr'))});
    }
    if(body.action==='saveProfile'){
      const customer=customerDetails(body.customer), id=body.profileId?checkedId(body.profileId):randomUUID();
      await profileCollection(account.key).doc(id).set({customer,updatedAt:Date.now()});
      return res.json({success:true,profileId:id});
    }
    if(!['pdf','send'].includes(body.action)) throw failure('Action inconnue.');
    const sending=body.action==='send';
    const order=prepareOrder(body,await priceBook(),sending);
    const pdf=await createOrderPdf(order,{draft:!sending && order.pallets<4});
    if(!sending){
      res.set('Content-Type','application/pdf');
      res.set('Content-Disposition','inline; filename="'+order.orderId+'.pdf"');
      return res.send(pdf);
    }
    await deliver(order,account.key,pdf);
    return res.json({success:true,orderId:order.orderId});
  }catch(error){
    if(!error.status) console.error('saxsoOrder failure',String(error.code||error.name||'internal'));
    return res.status(error.status||503).json({success:false,error:error.status?error.message:'Le service SAXSO est momentanément indisponible. Réessayez avec la même référence.'});
  }
});
