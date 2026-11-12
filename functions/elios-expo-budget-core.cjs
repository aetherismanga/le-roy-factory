'use strict';
const VERSION='20261112-elios-expo-budget-v1';
const RATE=.07,DEFAULT_YEAR=2027;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const clean=(v,max=180)=>String(v??'').trim().slice(0,max);
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const validAmount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9;
function yearValue(v=DEFAULT_YEAR){if(!Number.isInteger(v)||v<2020||v>2100)throw fail('Année du budget incorrecte.');return v;}
function requestYear(r){return Number.isInteger(r.budgetYear)?r.budgetYear:Number.isInteger(r.quote?.budgetYear)?r.quote.budgetYear:DEFAULT_YEAR;}
function lineCosts(row,catalogue){
 const quantity=row.quantity;
 if(typeof quantity!=='number'||!Number.isFinite(quantity)||quantity<=0)return null;
 if(row.type==='merchandising'){
  if(validAmount(row.valueTotalHT))return round(row.valueTotalHT);
  const product=catalogue.merchandising?.find(p=>p.id===row.key);
  const unit=validAmount(row.valueUnitHT)?row.valueUnitHT:product?.valueUnitHT;
  return validAmount(unit)?round(unit*quantity):null;
 }
 if(row.type==='box')return validAmount(row.netHT)?round(quantity*row.netHT*.5):null;
 return row.type==='vrac'?0:null;
}
function requestProjection(id,r,decision,catalogue){
 const rowKeys=new Set();
 const lines=(r.quote?.rows||[]).filter(row=>['merchandising','box','vrac'].includes(row.type)).map(row=>{
  const key=row.type+'|'+clean(row.key,240);if(rowKeys.has(key))throw fail('Référence dupliquée dans une demande enregistrée.',409);rowKeys.add(key);
  const saved=decision?.lines?.find(x=>x.key===key);
  return {key,type:row.type,reference:clean(row.reference,100),collection:clean(row.collection),description:clean(row.description,300),quantity:row.quantity,unit:clean(row.unit,20),budgetCostHT:saved?.status==='approved'&&validAmount(saved.budgetCostHT)?saved.budgetCostHT:lineCosts(row,catalogue),status:['approved','rejected','pending'].includes(saved?.status)?saved.status:'pending'};
 });
 return {id,source:r.source==='manual'?'manual':'request',reference:clean(r.reference),title:clean(r.title,100),year:requestYear(r),clientKey:clean(r.customer?.codeClient||r.owner||id,160),client:clean(r.customer?.societe||'Client non renseigné'),codeClient:clean(r.customer?.codeClient,40),sentAt:clean(r.sentAt||r.createdAt,40),lines,decision:decision?{revision:decision.revision||0,factoryReference:clean(decision.factoryReference),factoryDate:clean(decision.factoryDate,10),note:clean(decision.note,1000),updatedAt:clean(decision.updatedAt,40),updatedBy:clean(decision.updatedBy),history:(decision.history||[]).slice(-30)}:{revision:0}};
}
function summarize(requests,budget){
 const empty=()=>({approvedMerchandisingHT:0,approvedExpoHT:0,pendingHT:0,rejectedHT:0,approvedUnknown:0,pendingUnknown:0}),totals=empty();
 const clients=new Map();
 function add(target,row){
  const cost=row.budgetCostHT;
  if(row.status==='approved'){if(cost===null)target.approvedUnknown++;else if(row.type==='merchandising')target.approvedMerchandisingHT+=cost;else if(row.type==='box')target.approvedExpoHT+=cost;}
  else if(row.status==='pending'){if(cost===null)target.pendingUnknown++;else target.pendingHT+=cost;}
  else if(cost!==null)target.rejectedHT+=cost;
 }
 for(const r of requests){
  if(!clients.has(r.clientKey))clients.set(r.clientKey,{...empty(),key:r.clientKey,client:r.client,codeClient:r.codeClient,requests:0});
  const client=clients.get(r.clientKey);client.requests++;
  for(const row of r.lines){add(totals,row);add(client,row);}
 }
 const finish=t=>{for(const key of ['approvedMerchandisingHT','approvedExpoHT','pendingHT','rejectedHT'])t[key]=round(t[key]);t.approvedHT=round(t.approvedMerchandisingHT+t.approvedExpoHT);return t;};finish(totals);
 const turnover=validAmount(budget?.turnoverHT)?budget.turnoverHT:null,allowance=turnover===null?null:round(turnover*RATE),remaining=allowance===null||totals.approvedUnknown?null:round(allowance-totals.approvedHT);
 return {...totals,turnoverHT:turnover,allowanceHT:allowance,remainingHT:remaining,overrunHT:remaining===null?null:Math.max(0,-remaining),clients:[...clients.values()].map(finish).sort((a,b)=>a.client.localeCompare(b.client,'fr'))};
}
function turnoverInput(body,year){
 if(!validAmount(body.turnoverHT))throw fail('Renseignez un chiffre d’affaires HT Elios valide.');
 const referencePeriod=clean(body.referencePeriod,160),source=clean(body.source,600);
 if(referencePeriod.length<4||source.length<4)throw fail('Précisez la période du CA et sa source.');
 return {year,turnoverHT:round(body.turnoverHT),referencePeriod,source,sourceType:'manual',rate:RATE};
}
function decisionInput(body,request,catalogue,now=Date.now()){
 if(!Array.isArray(body.lines)||body.lines.length<1||body.lines.length>200)throw fail('Décision de l’usine incorrecte.');
 const canonical=requestProjection(body.requestId,request,null,catalogue),known=new Map(canonical.lines.map(row=>[row.key,row])),seen=new Set();
 const lines=body.lines.map(raw=>{const row=known.get(raw.key);if(!row||seen.has(raw.key)||!['approved','rejected','pending'].includes(raw.status))throw fail('Référence ou décision inconnue.');seen.add(raw.key);if(raw.status==='approved'&&row.budgetCostHT===null)throw fail('Confirmez le tarif avant d’accorder cette référence.');return {key:row.key,status:raw.status,budgetCostHT:row.budgetCostHT};});
 if(lines.length!==known.size)throw fail('Vérifiez toutes les lignes de la demande.');
 const factoryReference=clean(body.factoryReference),factoryDate=clean(body.factoryDate,10),note=clean(body.note,1000);
 if(lines.some(row=>row.status!=='pending')){
  const parsed=new Date(factoryDate+'T00:00:00Z');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  if(factoryReference.length<3||!/^\d{4}-\d{2}-\d{2}$/.test(factoryDate)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==factoryDate||factoryDate>today)throw fail('Ajoutez la référence et la date de confirmation de l’usine.');
 }
 return {year:requestYear(request),lines,factoryReference,factoryDate,note};
}
const docs=snapshot=>(snapshot.docs||[]).map(d=>({id:d.id,...d.data()}));
async function readDashboard(db,year,catalogue){
 const [requestsSnapshot,decisionsSnapshot,budgetSnapshot,manualSnapshot]=await Promise.all([
  db.collection('elios_sample_requests').select('reference','title','owner','customer','quote','status','sentAt','createdAt','budgetYear').limit(2001).get(),
  db.collection('elios_expo_decisions').where('year','==',year).limit(2001).get(),
  db.collection('elios_expo_budgets').doc(String(year)).get(),
  db.collection('elios_expo_manual_entries').where('budgetYear','==',year).limit(2001).get()
 ]);
 const sourceRequests=[...docs(requestsSnapshot),...docs(manualSnapshot)],sourceDecisions=docs(decisionsSnapshot);
 if(sourceRequests.length>2000||sourceDecisions.length>2000)throw fail('Le suivi dépasse la capacité de lecture. Aucun solde partiel n’est présenté.',503);
 const decisions=new Map(sourceDecisions.map(d=>[d.id,d]));
 const requests=sourceRequests.filter(r=>r.status==='sent'&&requestYear(r)===year).map(r=>requestProjection(r.id,r,decisions.get(r.id),catalogue)).sort((a,b)=>b.sentAt.localeCompare(a.sentAt));
 const stored=budgetSnapshot.data(),budget=stored?{year,turnoverHT:stored.turnoverHT,referencePeriod:clean(stored.referencePeriod,160),source:clean(stored.source,600),sourceType:'manual',rate:RATE,revision:stored.revision||0,updatedAt:stored.updatedAt,updatedBy:stored.updatedBy,history:(stored.history||[]).slice(-30)}:{year,turnoverHT:null,referencePeriod:'',source:'',revision:0,rate:RATE};
 return {year,rate:RATE,budget,summary:summarize(requests,budget),requests};
}
function expectedRevision(v){if(!Number.isInteger(v)||v<0)throw fail('Version du dossier manquante. Rechargez le suivi.',409);return v;}
async function saveTurnover(db,body,agent,year){
 const input=turnoverInput(body,year),revision=expectedRevision(body.revision),ref=db.collection('elios_expo_budgets').doc(String(year));
 const historyRef=db.collection('elios_expo_budget_history').doc(require('node:crypto').randomUUID());
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data()||{};if((old.revision||0)!==revision)throw fail('Le chiffre d’affaires a été modifié par un autre agent. Rechargez le suivi.',409);const updatedAt=new Date().toISOString(),event={year,turnoverHT:input.turnoverHT,referencePeriod:input.referencePeriod,source:input.source,updatedAt,updatedBy:agent.email};tx.set(ref,{...input,revision:revision+1,updatedAt,updatedBy:agent.email,history:[...(old.history||[]),event].slice(-30)});tx.set(historyRef,event);});
}
async function saveDecision(db,body,agent,year,catalogue){
 if(!/^[a-f0-9]{64}$/.test(body.requestId||''))throw fail('Demande inconnue.');
 if(body.source!==undefined&&!['manual','request'].includes(body.source))throw fail('Source de dotation inconnue.');
 const revision=expectedRevision(body.revision),requestRef=db.collection(body.source==='manual'?'elios_expo_manual_entries':'elios_sample_requests').doc(body.requestId),decisionRef=db.collection('elios_expo_decisions').doc(body.requestId),historyRef=db.collection('elios_expo_decision_history').doc(require('node:crypto').randomUUID());
 await db.runTransaction(async tx=>{
  const [requestSnap,decisionSnap]=await Promise.all([tx.get(requestRef),tx.get(decisionRef)]),request=requestSnap.data(),old=decisionSnap.data()||{};
  if(!request||request.status!=='sent'||requestYear(request)!==year)throw fail('Demande envoyée introuvable pour cette année.',404);
  if((old.revision||0)!==revision)throw fail('Une décision a été enregistrée entre-temps. Rechargez le suivi.',409);
  const input=decisionInput(body,request,catalogue),updatedAt=new Date().toISOString(),event={...input,updatedAt,updatedBy:agent.email};
  tx.set(decisionRef,{...input,requestId:body.requestId,reference:clean(request.reference),revision:revision+1,updatedAt,updatedBy:agent.email,history:[...(old.history||[]),event].slice(-30)});tx.set(historyRef,{...event,requestId:body.requestId});
 });
}
async function saveEntry(db,body,agent,year,catalogue){
 if(!/^[a-zA-Z0-9-]{20,80}$/.test(body.entryId||''))throw fail('Identifiant de saisie manquant.');
 const client=clean(body.client),reference=clean(body.reference),description=clean(body.description,600),codeClient=clean(body.codeClient,40).toUpperCase();
 if(client.length<2||reference.length<2||description.length<4||!['merchandising','box'].includes(body.type)||!validAmount(body.amountHT))throw fail('Renseignez le client, les références, la description et le montant HT.');
 if(codeClient&&!/^LRF-[0-9]{1,8}$/.test(codeClient))throw fail('Code LRF incorrect.');
 if(!['pending','approved','rejected'].includes(body.status))throw fail('Statut usine incorrect.');
 const crypto=require('node:crypto'),id=crypto.createHash('sha256').update('manual|'+agent.uid+'|'+body.entryId).digest('hex'),ref=db.collection('elios_expo_manual_entries').doc(id),decisionRef=db.collection('elios_expo_decisions').doc(id),historyRef=db.collection('elios_expo_decision_history').doc(crypto.randomUUID());
 const amountHT=round(body.amountHT),key='manual-'+id,now=new Date().toISOString(),row={key,type:body.type,reference,collection:'Saisie agent',description,quantity:1,unit:'dotation',...(body.type==='merchandising'?{valueUnitHT:amountHT,valueTotalHT:amountHT,totalHT:0}:{netHT:amountHT,unitHT:amountHT*.5,totalHT:round(amountHT*.5)})};
 const request={source:'manual',budgetYear:year,reference,title:description.slice(0,100),owner:codeClient||'manual-client:'+client.toLocaleLowerCase('fr-FR'),customer:{societe:client,codeClient},quote:{budgetYear:year,rows:[row]},status:'sent',sentAt:now,createdAt:now,createdBy:agent.email};
 const input=decisionInput({...body,requestId:id,lines:[{key:body.type+'|'+key,status:body.status}]},request,catalogue),fingerprint=crypto.createHash('sha256').update(JSON.stringify({year,client,codeClient,reference,description,type:body.type,amountHT,...input})).digest('hex');
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();if(old){if(old.fingerprint!==fingerprint)throw fail('Cette saisie a déjà été utilisée. Rechargez avant de créer une autre dotation.',409);return;}const event={...input,updatedAt:now,updatedBy:agent.email};tx.set(ref,{...request,fingerprint});tx.set(decisionRef,{...input,requestId:id,reference,revision:1,updatedAt:now,updatedBy:agent.email,history:[event]});tx.set(historyRef,{...event,requestId:id});});
}
async function handleAction({db,catalogue,agent,body}){
 const year=yearValue(body.year);
 if(body.action==='save-turnover')await saveTurnover(db,body,agent,year);
 else if(body.action==='decision')await saveDecision(db,body,agent,year,catalogue);
 else if(body.action==='save-entry')await saveEntry(db,body,agent,year,catalogue);
 else if(body.action!=='read')throw fail('Action inconnue.');
 return {success:true,...await readDashboard(db,year,catalogue)};
}
function createHandler({admin,getAgentFromRequest,catalogue}){return async(req,res)=>{
 const origin=String(req.headers?.origin||''),origins=['https://leroyfactory.fr','https://www.leroyfactory.fr'];
 res.set('Vary','Origin');res.set('Cache-Control','private, no-store');res.set('X-LRF-Elios-Expo-Version',VERSION);res.set('Access-Control-Allow-Headers','Content-Type, Authorization');res.set('Access-Control-Allow-Methods','POST, OPTIONS');
 if(origin&&!origins.includes(origin))return res.status(403).json({success:false,error:'Origine non autorisée.'});
 if(origin)res.set('Access-Control-Allow-Origin',origin);
 if(req.method==='OPTIONS')return res.status(204).send('');if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
 try{const agent=await getAgentFromRequest(req);if(!agent)throw fail('Authentification agent requise.',401);const body=req.body||{};if(JSON.stringify(body).length>100000)throw fail('Demande trop volumineuse.',413);return res.json(await handleAction({db:admin.firestore(),catalogue,agent,body}));}
 catch(error){return res.status(error.status||503).json({success:false,error:error.status?error.message:'Le suivi des expositions est momentanément indisponible.'});}
};}
module.exports={VERSION,RATE,DEFAULT_YEAR,round,yearValue,requestYear,lineCosts,requestProjection,summarize,turnoverInput,decisionInput,readDashboard,saveTurnover,saveDecision,saveEntry,handleAction,createHandler};
