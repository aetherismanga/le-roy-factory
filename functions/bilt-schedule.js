'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { clientFromSessionToken } = require('./pro-session');

const db = admin.firestore();
const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
const REGION = 'us-central1';

function cors(req,res){const origin=String(req.headers.origin||'');res.set('Access-Control-Allow-Origin',ALLOWED_ORIGINS.has(origin)?origin:'https://leroyfactory.fr');res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');res.set('Cache-Control','no-store');if(req.method==='OPTIONS'){res.status(204).send('');return true}return false}
function clean(v,max=180){return String(v??'').trim().slice(0,max)}
async function authenticatedClient(token){const result=await clientFromSessionToken(token,{renew:true});return result?.client||null}

exports.biltScheduleAutoRelease = onRequest({region:REGION,timeoutSeconds:60,memory:'256MiB'},async(req,res)=>{
  if(cors(req,res))return;
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  const p=req.body||{};
  try{
    const client=await authenticatedClient(p.sessionToken);
    if(!client)return res.status(401).json({success:false,error:'Session professionnelle expirée.'});
    const orderId=clean(p.orderId,120);
    if(!orderId)return res.status(400).json({success:false,error:'Commande BILT manquante.'});
    const orderRef=db.collection('bilt_orders').doc(orderId);
    const orderSnap=await orderRef.get();
    if(!orderSnap.exists)return res.status(404).json({success:false,error:'Commande BILT introuvable.'});
    const order=orderSnap.data();
    if(String(order.clientId||'')!==String(client.id||''))return res.status(403).json({success:false,error:'Cette commande n’appartient pas à ce compte.'});
    if(order.status!=='pending_approval')return res.status(200).json({success:true,scheduled:false,alreadyProcessed:true,status:order.status||''});

    const deadlineMs=Number(order.approvalDeadlineMs||0)||(Date.now()+72*60*60*1000);
    const deadlineIso=order.approvalDeadlineIso||new Date(deadlineMs).toISOString();
    await orderRef.update({
      approvalDeadlineMs:deadlineMs,
      approvalDeadlineIso:deadlineIso,
      autoReleaseTaskStatus:'scheduled',
      autoReleaseMode:'firestore_scheduler',
      autoReleaseTaskAttemptAt:admin.firestore.FieldValue.serverTimestamp(),
      autoReleaseTaskError:admin.firestore.FieldValue.delete()
    });
    return res.status(200).json({success:true,scheduled:true,deadline:deadlineIso});
  }catch(error){
    console.error('BILT SCHEDULE',error);
    return res.status(500).json({success:false,error:'Impossible de programmer l’envoi automatique BILT.'});
  }
});
