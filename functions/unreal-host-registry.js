const {onRequest}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const key=require('./unreal-host/public-key.json');
let handler;
exports.unrealHostRegistry=onRequest({region:'us-central1',memory:'256MiB',timeoutSeconds:20,maxInstances:2,invoker:'public'},async(req,res)=>{
 if(!handler){
  const {createRegistry,mayReplace}=await import('./unreal-host/registry-core.mjs');
  const db=admin.firestore(),ref=db.collection('_lrfUnrealHosts').doc(key.host);
  handler=createRegistry({key,read:async()=>(await ref.get()).data(),replace:record=>db.runTransaction(async tx=>{
   const previous=(await tx.get(ref)).data();
   if(!mayReplace(previous,record))return false;
   tx.set(ref,record);return true;
  })});
 }
 return handler(req,res);
});
