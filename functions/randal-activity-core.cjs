const {createHash}=require('node:crypto');
const CODE='LRF-00321',VERSION='20261108-randal-activity1';
const SOURCES=new Set(['site','portal','studio-one','randal-general']);
const EVENTS=new Set(['visit','view','fullscreen_open','fullscreen_close','option_change','composition_open','composition_close','item_open','item_close','logout']);
const FIELDS=new Set(['format','width','finish','facadeMode','top','basinColor','basinLayout','mirror','mirrorSize','mirrorFinish','column','columnFinish','floor','wall','brightness','dimensions','hinge']);
const clean=(v,n=120)=>typeof v==='string'?v.trim().slice(0,n):'';
function normalizeActivity(client,body){
 if(client?.codeClient!==CODE||!client.id)return null;
 if(!body||!SOURCES.has(body.source)||!EVENTS.has(body.event||'view'))throw Error('Activité invalide.');
 if(!/^[a-zA-Z0-9_-]{16,80}$/.test(body.visitId||'')||!/^[a-zA-Z0-9_-]{16,80}$/.test(body.pageId||''))throw Error('Session invalide.');
 const foregroundMs=Number(body.foregroundMs),activeMs=Number(body.activeMs),seq=Number(body.seq);
 if(!Number.isSafeInteger(seq)||seq<1||!Number.isFinite(foregroundMs)||!Number.isFinite(activeMs)||activeMs<0||foregroundMs<activeMs||foregroundMs>86400000)throw Error('Durée invalide.');
 const page=clean(body.page,180);if(!page.startsWith('/')||/[?#\\\r\n]/.test(page))throw Error('Page invalide.');
 const field=FIELDS.has(body.field)?body.field:'';
 return {clientId:String(client.id),codeClient:CODE,source:body.source,visitId:body.visitId,pageId:body.pageId,seq,event:body.event||'view',page,view:clean(body.view,40),visible:body.visible===true,device:['mobile','tablet','desktop'].includes(body.device)?body.device:'unknown',foregroundMs:Math.floor(foregroundMs),activeMs:Math.floor(activeMs),field,value:field?clean(String(body.value??''),100):''};
}
async function recordActivity(db,admin,client,body,now=Date.now()){
 const item=normalizeActivity(client,body);if(!item)return false;
 const id=createHash('sha256').update(item.clientId+'|'+item.pageId).digest('hex');
 const ref=db.collection('lrf_randal_sessions').doc(id);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),old=snap.exists?snap.data():null;
  if(old&&old.seq>=item.seq)return;
  if(old&&(old.visitId!==item.visitId||old.source!==item.source||old.clientId!==item.clientId))throw Error('Session incohérente.');
  const startedMs=old?.startedMs||now,ceiling=Math.min(86400000,Math.max(0,now-startedMs)+20000);
  const foregroundMs=Math.max(old?.foregroundMs||0,Math.min(item.foregroundMs,ceiling));
  const activeMs=Math.max(old?.activeMs||0,Math.min(item.activeMs,foregroundMs));
  const stamp=admin.firestore.Timestamp.fromMillis(now);
  tx.set(ref,{clientId:item.clientId,codeClient:CODE,source:item.source,visitId:item.visitId,pageId:item.pageId,page:item.page,view:item.view,device:item.device,visible:item.visible,seq:item.seq,startedMs,startedAt:admin.firestore.Timestamp.fromMillis(startedMs),updatedAt:stamp,foregroundMs,activeMs});
  if(body.event&&EVENTS.has(body.event)){
   const eventRef=db.collection('lrf_randal_activity_events').doc(id+'-'+item.seq);
   tx.set(eventRef,{clientId:item.clientId,codeClient:CODE,source:item.source,visitId:item.visitId,pageId:item.pageId,event:item.event,page:item.page,view:item.view,device:item.device,field:item.field,value:item.value,createdAt:stamp});
  }
 });return true;
}
module.exports={CODE,VERSION,normalizeActivity,recordActivity};
