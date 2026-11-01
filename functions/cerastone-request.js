'use strict';
const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('node:crypto');
const {RECIPIENT,failure,createCerastoneRequestHandler} = require('./cerastone-request-core');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {gunzipSync} = require('node:zlib');
const registry = JSON.parse(gunzipSync(readFileSync(path.join(__dirname,'cerastone-catalogue.json.gz'))).toString('utf8'));
const db = admin.firestore();
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const COLLECTION = 'cerastone_request_deliveries', LIMITS = 'cerastone_request_limits';
async function reserve(requestId,payloadHash,req) {
  const now = Date.now(), ref = db.collection(COLLECTION).doc(requestId);
  const ip = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const limit = db.collection(LIMITS).doc(hash(ip+'|'+Math.floor(now/3600000)));
  return db.runTransaction(async tx => {
    const previous = (await tx.get(ref)).data();
    if (previous) {
      if (previous.payloadHash !== payloadHash) throw failure('Cette référence appartient à une autre demande. Actualisez le récapitulatif.',409);
      if (previous.status === 'sent') return 'sent';
      if (previous.status === 'sending') throw failure('La demande est en cours de transmission. Conservez sa référence avant de réessayer.',409);
    }
    const current = (await tx.get(limit)).data();
    if (Number(current?.count || 0) >= 8) throw failure('La limite de huit demandes par heure est atteinte. Réessayez plus tard.',429);
    tx.set(limit,{count:Number(current?.count || 0)+1,expiresAt:admin.firestore.Timestamp.fromMillis(now+86400000)});
    tx.set(ref,{payloadHash,status:'sending',createdAt:previous?.createdAt || now,updatedAt:now,expiresAt:admin.firestore.Timestamp.fromMillis(now+7*86400000)});
    return 'reserved';
  });
}
const complete = (requestId,messageId) => db.collection(COLLECTION).doc(requestId).set({status:'sent',messageId:String(messageId).slice(0,200),updatedAt:Date.now()},{merge:true});
const fail = requestId => db.collection(COLLECTION).doc(requestId).set({status:'failed',updatedAt:Date.now()},{merge:true});
async function send(message) {
  if (!process.env.SMTP_PASSWORD_JEROME) throw failure('Le service de messagerie est momentanément indisponible.',503);
  const transport = nodemailer.createTransport({host:'ssl0.ovh.net',port:465,secure:true,auth:{user:RECIPIENT,pass:process.env.SMTP_PASSWORD_JEROME},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
  return transport.sendMail(message);
}
exports.cerastoneRequest = onRequest({region:'us-central1',timeoutSeconds:90,memory:'256MiB',secrets:['SMTP_PASSWORD_JEROME']},createCerastoneRequestHandler({registry,reserve,complete,fail,send}));
