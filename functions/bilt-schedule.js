'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFunctions } = require('firebase-admin/functions');
const { clientFromSessionToken } = require('./pro-session');

const db = admin.firestore();
const ALLOWED_ORIGINS = new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
const REGION = 'us-central1';
const TASK_NAME = `locations/${REGION}/functions/biltAutoReleaseTask`;
const TASK_URI = 'https://us-central1-le-roy-factory.cloudfunctions.net/biltAutoReleaseTask';

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
    if(order.autoReleaseTaskStatus==='queued')return res.status(200).json({success:true,scheduled:true,alreadyQueued:true,deadline:order.approvalDeadlineIso||null});

    const deadlineMs=Number(order.approvalDeadlineMs||0) || (Date.now()+72*60*60*1000);
    const delaySeconds=Math.max(1,Math.ceil((deadlineMs-Date.now())/1000));
    await orderRef.update({autoReleaseTaskStatus:'queueing',autoReleaseTaskAttemptAt:admin.firestore.FieldValue.serverTimestamp()});
    try{
      const queue=getFunctions().taskQueue(TASK_NAME);
      await queue.enqueue({orderId},{scheduleDelaySeconds:delaySeconds,dispatchDeadlineSeconds:300,uri:TASK_URI});
      await orderRef.update({autoReleaseTaskStatus:'queued',autoReleaseTaskQueuedAt:admin.firestore.FieldValue.serverTimestamp(),autoReleaseTaskError:admin.firestore.FieldValue.delete()});
      return res.status(200).json({success:true,scheduled:true,deadline:new Date(deadlineMs).toISOString()});
    }catch(error){
      console.error('BILT TASK QUEUE',orderId,error);
      await orderRef.update({autoReleaseTaskStatus:'queue_error',autoReleaseTaskError:String(error.message||error)}).catch(()=>{});
      return res.status(503).json({success:false,error:'La programmation automatique à 3 jours n’a pas pu être activée. Réessayez dans un instant.'});
    }
  }catch(error){
    console.error('BILT SCHEDULE',error);
    return res.status(500).json({success:false,error:'Impossible de programmer l’envoi automatique BILT.'});
  }
});
