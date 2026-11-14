import {RANDAL_CODE} from './randal-activity-model.mjs?v=20261108-activity1';

const ENDPOINT='https://us-central1-le-roy-factory.cloudfunctions.net/getLrfAnalytics';
const timedError=()=>Object.assign(new Error('Le relevé met trop de temps à répondre.'),{code:'deadline-exceeded'});

function within(operation,timeoutMs){
 let timer;
 return Promise.race([
  Promise.resolve().then(operation),
  new Promise((_,reject)=>{timer=setTimeout(()=>reject(timedError()),timeoutMs);})
 ]).finally(()=>clearTimeout(timer));
}

// Each source can fail independently. Never turn an unread source into a zero.
export async function loadRandalActivity({readSessions,readEvents,readLegacy,timeoutMs=25000}){
 const keys=['sessions','events','legacy'];
 const results=await Promise.allSettled([readSessions,readEvents,readLegacy].map(read=>within(read,timeoutMs)));
 const data={sessions:[],events:[],legacy:[]},failures=[];
 let incomplete=false;
 results.forEach((result,index)=>{
  const key=keys[index];
  if(result.status==='fulfilled'){
   data[key]=result.value.rows.filter(row=>row.codeClient===RANDAL_CODE);
   incomplete ||= result.value.incomplete===true;
  }else failures.push({key,code:String(result.reason?.code||result.reason?.name||'unknown')});
 });
 return {data,failures,incomplete};
}

// Legacy events are server-only. Reuse the existing agent-authenticated API;
// do not expand browser Firestore permissions to read lrf_client_events.
export async function fetchRandalLegacy({clientIds,user,since,until=Date.now(),fetchImpl=globalThis.fetch,timeoutMs=25000}){
 if(!clientIds.length)return {rows:[],incomplete:false};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  let token=await user.getIdToken();
  const request=async(clientId,retry=true)=>{
   const response=await fetchImpl(ENDPOINT,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({period:'custom',startDate:new Date(since).toISOString(),endDate:new Date(until).toISOString(),clientId}),
    cache:'no-store',signal:controller.signal
   });
   if(response.status===401&&retry){token=await user.getIdToken(true);return request(clientId,false);}
   const body=await response.json().catch(()=>({}));
   if(!response.ok||body.success!==true){
    const code=response.status===401?'unauthenticated':response.status===403?'permission-denied':'unavailable';
    throw Object.assign(new Error('Historique du site indisponible.'),{code});
   }
   if(!Array.isArray(body.timeline))throw Object.assign(new Error('Historique incomplet.'),{code:'invalid-response'});
   return {
    rows:body.timeline.filter(row=>row.clientId===clientId&&row.codeClient===RANDAL_CODE&&row.at>=since&&row.at<=until)
     .map(row=>({...row,createdAt:row.at})),
    incomplete:body.orderAnalytics?.timelineTruncated===true||body.orderAnalytics?.eventQueryLimitReached===true
   };
  };
  const reports=await Promise.all([...new Set(clientIds)].map(id=>request(id)));
  return {rows:reports.flatMap(report=>report.rows),incomplete:reports.some(report=>report.incomplete)};
 }finally{clearTimeout(timer);}
}
