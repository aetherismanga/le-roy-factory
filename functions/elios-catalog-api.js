'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const {publicCollection,collectionExists,keyOf}=require('./elios-catalog');
const ALLOWED_ORIGINS=new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
function cors(req,res){const origin=String(req.headers.origin||'');res.set('Access-Control-Allow-Origin',ALLOWED_ORIGINS.has(origin)?origin:'https://leroyfactory.fr');res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type');res.set('Access-Control-Allow-Methods','GET, OPTIONS');res.set('Cache-Control','public, max-age=3600');if(req.method==='OPTIONS'){res.status(204).send('');return true}return false}
exports.eliosCatalog=onRequest({region:'us-central1',timeoutSeconds:30,memory:'256MiB',maxInstances:2},async(req,res)=>{
  if(cors(req,res))return;
  if(req.method!=='GET')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  const raw=String(req.query.collection||'').trim();const key=keyOf(raw);
  if(!raw||!collectionExists(key))return res.status(404).json({success:false,error:'Collection ELIOS inconnue.'});
  if(key==='roma')return res.status(200).json({success:true,key:'roma',local:true});
  const collection=publicCollection(key);
  return res.status(200).json({success:true,key,collection});
});
