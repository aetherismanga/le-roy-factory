'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const nodemailer=require('nodemailer');
const crypto=require('node:crypto');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {clientFromSessionToken}=require('./pro-session');
const {getAgentFromRequest}=require('./auth');
const {failure}=require('./fenice-request-core');
const {RECIPIENT,createBiopietraRequestHandler}=require('./biopietra-request-core');
const db=admin.firestore();
const COLLECTION='biopietra_request_deliveries',LIMITS='biopietra_request_limits';
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
let catalogueData;
function catalogue() {
  return catalogueData ||= JSON.parse(readFileSync(path.join(__dirname,'biopietra-catalogue.json'),'utf8'));
}
async function verifyIdentity(req,body) {
  if (String(req.headers?.authorization || '').trim()) {
    const agent=await getAgentFromRequest(req);
    if (!agent) throw failure('Votre session agent a expiré. Reconnectez-vous.',401);
    return {agent};
  }
  if (body.sessionToken) {
    if (typeof body.sessionToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.sessionToken)) throw failure('Votre session LRF a expiré. Reconnectez-vous.',401);
    const session=await clientFromSessionToken(body.sessionToken,{renew:false});
    if (!session?.client) throw failure('Votre session LRF a expiré. Reconnectez-vous.',401);
    return {client:session.client};
  }
  return null;
}
async function reserve(requestId,payloadHash,req) {
  const now=Date.now(),ref=db.collection(COLLECTION).doc(requestId);
  const ip=String(req.ip || req.socket?.remoteAddress || 'unknown');
  const limit=db.collection(LIMITS).doc(hash(ip+'|'+Math.floor(now/3600000)));
  return db.runTransaction(async tx=>{
    const previous=(await tx.get(ref)).data();
    if (previous) {
      if (previous.payloadHash !== payloadHash) throw failure('Cette référence correspond à une autre demande. Actualisez le récapitulatif.',409);
      if (previous.status === 'sent') return 'sent';
      if (previous.status === 'sending') throw failure('Cette demande est déjà en cours de transmission. Conservez sa référence avant de réessayer.',409);
    }
    const current=(await tx.get(limit)).data(),count=Number(current?.count || 0);
    if (count >= 8) throw failure('Huit demandes par heure maximum. Merci de réessayer plus tard.',429);
    tx.set(limit,{count:count+1,expiresAt:admin.firestore.Timestamp.fromMillis(now+86400000)});
    tx.set(ref,{payloadHash,status:'sending',createdAt:previous?.createdAt || now,updatedAt:now,expiresAt:admin.firestore.Timestamp.fromMillis(now+7*86400000)});
    return 'reserved';
  });
}
async function complete(requestId,messageId) {
  await db.collection(COLLECTION).doc(requestId).set({status:'sent',messageId:String(messageId).slice(0,200),updatedAt:Date.now()},{merge:true});
}
async function fail(requestId) {
  await db.collection(COLLECTION).doc(requestId).set({status:'failed',updatedAt:Date.now()},{merge:true});
}
async function send(message) {
  const password=process.env.SMTP_PASSWORD_JEROME;
  if (!password) throw failure('Le service d’envoi est momentanément indisponible. Réessayez plus tard.',503);
  const transport=nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:RECIPIENT,pass:password},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
  return transport.sendMail(message);
}
exports.biopietraRequest=onRequest({region:'us-central1',timeoutSeconds:90,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},createBiopietraRequestHandler({catalogue,verifyIdentity,reserve,complete,fail,send}));
