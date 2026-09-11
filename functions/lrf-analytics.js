const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { requireAgent } = require('./auth');
const { clientFromSessionToken } = require('./pro-session');
const { EVENTS, SUMMARIES } = require('./lrf-analytics-core');

const db = admin.firestore();
const ALLOWED_ORIGINS = ['https://leroyfactory.fr', 'https://www.leroyfactory.fr'];
const ALLOWED_AGENTS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const INTERNAL_EMAILS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const TRACK_ACTIONS = new Set(['session_start','page_view','partner_view','product_view','stock_view','tariff_view','cart_add','order_view']);
const VIEW_ACTIONS = new Set(['page_view','partner_view','product_view','stock_view','tariff_view','cart_add','order_view']);
const WEIGHTS = { page_view:1, partner_view:2, product_view:6, stock_view:16, tariff_view:10, cart_add:10, order_view:40 };
const DAY = 86400000;

function cors(req, res, agent = false) {
  const origin = String(req.headers.origin || '');
  res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : 'https://leroyfactory.fr');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', agent ? 'Content-Type, Authorization' : 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
}

function clean(v, max = 180) { return String(v ?? '').trim().slice(0, max); }
function norm(v){ return clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function tsMs(v) { return v?.toMillis?.() || (v ? new Date(v).getTime() : 0) || 0; }
function dateKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function startOfDay(ms = Date.now()) { const d = new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
function endOfDay(ms = Date.now()) { const d = new Date(ms); d.setHours(23,59,59,999); return d.getTime(); }
function monthStart(ms = Date.now()) { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
function previousMonthRange(ms = Date.now()) { const d = new Date(ms); const start = new Date(d.getFullYear(), d.getMonth()-1, 1).getTime(); const end = new Date(d.getFullYear(), d.getMonth(), 1).getTime()-1; return {start,end}; }
function depFromClient(c){ return clean(c?.departement || '', 4).toUpperCase(); }
function isInternalClient(c){
  if(!c) return false;
  const emails=[c.email,c.mail,c.emailPro,c.emailContact,c.contactEmail].map(v=>clean(v,180).toLowerCase()).filter(Boolean);
  if(emails.some(e=>INTERNAL_EMAILS.has(e))) return true;
  const identity=norm([c.societe,c.contact,c.interlocuteur,c.nom,c.prenom].filter(Boolean).join(' '));
  return identity.includes('jerome hugol') || identity.includes('coryne leroy factory') || identity === 'coryne';
}

function finiteNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
async function writeTrackedActivity(client, activity = {}) {
  if (!client?.id || isInternalClient(client)) return;
  const action = clean(activity.action || 'page_view', 40) || 'page_view';
  const now = admin.firestore.FieldValue.serverTimestamp();
  const stock = finiteNumber(activity.stock);
  const event = {
    clientId:String(client.id), codeClient:clean(client.codeClient||'',20).toUpperCase(), action,
    page:clean(activity.page||'',180)||'inconnu', title:clean(activity.title||'',180), device:clean(activity.device||'unknown',20),
    partner:clean(activity.partner||'',80), tariffId:clean(activity.tariffId||'',80), productRef:clean(activity.productRef||'',80),
    productName:clean(activity.productName||'',180), collection:clean(activity.collection||'',120), stock,
    stockUnit:clean(activity.stockUnit||'',20), sessionId:clean(activity.sessionId||'',80), source:clean(activity.source||'site-public',50), createdAt:now
  };
  const summary = {
    clientId:String(client.id), codeClient:clean(client.codeClient||'',20).toUpperCase(), lastSeenAt:now, lastAction:action,
    lastPage:event.page, lastPartner:event.partner, lastProductRef:event.productRef, lastProductName:event.productName,
    lastCollection:event.collection, lastStock:stock, lastStockUnit:event.stockUnit,
    viewCount:admin.firestore.FieldValue.increment(1), updatedAt:now
  };
  if(action==='stock_view') summary.stockViewCount=admin.firestore.FieldValue.increment(1);
  if(action==='product_view') summary.productViewCount=admin.firestore.FieldValue.increment(1);
  if(action==='session_start') summary.sessionCount=admin.firestore.FieldValue.increment(1);
  if(action==='order_view') summary.orderCount=admin.firestore.FieldValue.increment(1);
  await Promise.all([
    db.collection(EVENTS).add(event),
    db.collection(SUMMARIES).doc(String(client.id)).set(summary,{merge:true})
  ]);
}

function resolveRange(body = {}) {
  const now = Date.now();
  const preset = clean(body.period || '7d', 30).toLowerCase();
  let start = now - 7 * DAY, end = now;
  if (preset === 'today') start = startOfDay(now);
  else if (preset === 'yesterday') { start = startOfDay(now - DAY); end = endOfDay(now - DAY); }
  else if (preset === '30d') start = now - 30 * DAY;
  else if (preset === '90d') start = now - 90 * DAY;
  else if (preset === 'month') start = monthStart(now);
  else if (preset === 'prev_month') ({start,end} = previousMonthRange(now));
  else if (preset === 'custom') {
    const s = new Date(body.startDate || '').getTime(); const e = new Date(body.endDate || '').getTime();
    if (Number.isFinite(s)) start = startOfDay(s);
    if (Number.isFinite(e)) end = endOfDay(e);
  }
  start = Math.max(start, now - 366 * DAY);
  end = Math.min(end, now + DAY);
  if (end < start) [start,end] = [end,start];
  return { preset, start, end };
}

function pageLabel(page, title) {
  const p = clean(page, 180);
  const labels = {
    '/':'Accueil','/index.html':'Accueil','/univers.html':'Sélections & Produits','/catalogues.html':'Catalogues',
    '/partenaires.html':'Partenaires','/realisations.html':'Réalisations','/tarifs-pro.html':'Accès PRO','/contact.html':'Contact',
    '/configurateurs.html':'Configurateurs','/commande-bilt.html':'Commande BILT','/elios-stock.html':'Stock Elios'
  };
  if (labels[p]) return labels[p];
  if (p.startsWith('tarif:')) return `Tarif ${p.slice(6).replace(/-/g,' ').toUpperCase()}`;
  return clean(title, 90) || p.replace(/^\//,'') || 'Page';
}

function actionLabel(action) {
  return ({session_start:'Visite du site',page_view:'Page consultée',partner_view:'Fabricant consulté',product_view:'Produit consulté',stock_view:'Stock consulté',tariff_view:'Tarif consulté',cart_add:'Ajout panier',order_view:'Commande passée'})[action] || action || 'Activité';
}
function emptyStats(){return{lastSeen:0,views:0,sessions:0,tariffs:0,products:0,stocks:0,partners:0,carts:0,orders:0,pages:new Map(),productsMap:new Map(),stocksMap:new Map(),partnersMap:new Map(),activeDays:new Set(),events:[],interest:0};}
function scoreClient(s, now) {
  if (!s.lastSeen) return {score:0,label:'Froid',reasons:[]};
  const days = (now - s.lastSeen) / DAY;
  let recency = days <= .25 ? 34 : days <= 1 ? 30 : days <= 3 ? 24 : days <= 7 ? 17 : days <= 14 ? 9 : days <= 30 ? 4 : 0;
  const repeatedProduct = Math.max(0, ...[...s.productsMap.values()].map(v=>v.count||0));
  let score = recency + Math.min(45, Math.round(s.interest)) + Math.min(12, Math.max(0, repeatedProduct - 1) * 4) + Math.min(9, s.activeDays.size * 2);
  score = Math.min(100, Math.round(score));
  const reasons=[];
  if(s.orders) reasons.push(`${s.orders} commande${s.orders>1?'s':''} passée${s.orders>1?'s':''}`);
  if(days<=1) reasons.push('activité aujourd’hui'); else if(days<=3) reasons.push('activité très récente'); else if(days<=7) reasons.push('activité cette semaine');
  if(s.stocks) reasons.push(`${s.stocks} consultation${s.stocks>1?'s':''} de stock`);
  if(s.tariffs) reasons.push(`${s.tariffs} tarif${s.tariffs>1?'s':''} consulté${s.tariffs>1?'s':''}`);
  if(s.products) reasons.push(`${s.products} produit${s.products>1?'s':''} vu${s.products>1?'s':''}`);
  if(repeatedProduct>=2) reasons.push('retour sur un même produit');
  return {score,label:score>=75?'Très chaud':score>=50?'Chaud':score>=25?'Tiède':'Froid',reasons};
}
function mapTop(map, limit = 25) {
  return [...map.entries()].map(([name, value]) => typeof value === 'number' ? {name,count:value} : {name,...value}).sort((a,b)=>(b.count||0)-(a.count||0)).slice(0,limit);
}
function inferSessions(events) {
  const sorted = [...events].sort((a,b)=>a.ms-b.ms);
  let count=0,last=0;
  for(const e of sorted){ if(!last || e.ms-last>30*60*1000 || e.action==='session_start') count += 1; last=e.ms; }
  return Math.max(count, sorted.length ? 1 : 0);
}

const trackLrfActivity = onRequest({timeoutSeconds:30,memory:'256MiB'}, async (req,res) => {
  if (cors(req,res,false)) return;
  if (req.method !== 'POST') return res.status(405).json({success:false});
  try {
    const result = await clientFromSessionToken(req.body?.sessionToken, {renew:false});
    if (!result?.client) return res.status(401).json({success:false});
    const action = clean(req.body?.action || 'page_view', 40);
    if (!TRACK_ACTIONS.has(action)) return res.status(400).json({success:false});
    await writeTrackedActivity(result.client, {
      action,
      page: clean(req.body?.page,180), title: clean(req.body?.title,180), device: clean(req.body?.device,20),
      partner: clean(req.body?.partner,80), productRef: clean(req.body?.productRef,80), productName: clean(req.body?.productName,180),
      collection: clean(req.body?.collection,120), stock: req.body?.stock, stockUnit: clean(req.body?.stockUnit,20),
      sessionId: clean(req.body?.sessionId,80), source: clean(req.body?.source,50)
    });
    return res.json({success:true});
  } catch (e) {
    console.error('trackLrfActivity',e);
    return res.status(500).json({success:false});
  }
});

const getLrfAnalytics = onRequest({timeoutSeconds:60,memory:'512MiB'}, async (req,res) => {
  if (cors(req,res,true)) return;
  if (req.method !== 'POST') return res.status(405).json({success:false,error:'Méthode non autorisée'});
  const agent = await requireAgent(req,res);
  if (!agent) return;
  const agentEmail = clean(agent.email,180).toLowerCase();
  if (!ALLOWED_AGENTS.has(agentEmail)) return res.status(403).json({success:false,error:'Analyse réservée à Jérôme et Coryne.'});

  try {
    const now=Date.now(), body=req.body||{}, range=resolveRange(body);
    const filterDepartment=clean(body.department||'',4).toUpperCase();
    const filterPartner=norm(body.partner||'');
    const filterAction=clean(body.action||'',40);
    const filterClient=clean(body.clientId||'',120);

    const [clientSnap, summarySnap, eventSnap] = await Promise.all([
      db.collection('clients').get(),
      db.collection(SUMMARIES).get(),
      db.collection(EVENTS).where('createdAt','>=',admin.firestore.Timestamp.fromMillis(range.start)).orderBy('createdAt','desc').limit(12000).get()
    ]);

    const clients=new Map();
    clientSnap.forEach(doc=>{const c={id:doc.id,...doc.data()};if(/^LRF-\d{5}$/i.test(clean(c.codeClient,20))&&!isInternalClient(c))clients.set(doc.id,c);});
    const summaries=new Map(); summarySnap.forEach(doc=>summaries.set(doc.id,doc.data()||{}));

    const rawEvents=[];
    eventSnap.forEach(doc=>{
      const e=doc.data()||{}, ms=tsMs(e.createdAt), c=clients.get(String(e.clientId||''));
      if(!c||!ms||ms<range.start||ms>range.end)return;
      rawEvents.push({id:doc.id,...e,ms,client:c});
    });

    const departments=[...new Set(rawEvents.map(e=>depFromClient(e.client)).filter(Boolean))].sort();
    const partners=[...new Set(rawEvents.map(e=>clean(e.partner,80)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
    const actions=[...new Set(rawEvents.map(e=>clean(e.action,40)).filter(Boolean))].sort();

    const events=rawEvents.filter(e=>{
      if(filterDepartment && depFromClient(e.client)!==filterDepartment)return false;
      if(filterPartner && norm(e.partner)!==filterPartner)return false;
      if(filterAction && e.action!==filterAction)return false;
      if(filterClient && String(e.clientId)!==filterClient)return false;
      return true;
    });

    const byClient=new Map(), pageCounts=new Map(), productCounts=new Map(), stockCounts=new Map(), partnerCounts=new Map(), departmentCounts=new Map(), actionCounts=new Map();
    for(const e of events){
      if(!byClient.has(e.clientId))byClient.set(e.clientId,emptyStats());
      const s=byClient.get(e.clientId); s.lastSeen=Math.max(s.lastSeen,e.ms); s.events.push(e); s.activeDays.add(dateKey(e.ms));
      if(VIEW_ACTIONS.has(e.action))s.views+=1;
      s.interest += WEIGHTS[e.action] || 0;
      actionCounts.set(e.action,(actionCounts.get(e.action)||0)+1);
      const dep=depFromClient(e.client); if(dep)departmentCounts.set(dep,(departmentCounts.get(dep)||0)+1);
      if(e.action==='page_view'){
        const name=pageLabel(e.page,e.title); s.pages.set(name,(s.pages.get(name)||0)+1); pageCounts.set(name,(pageCounts.get(name)||0)+1);
      }
      if(e.action==='partner_view' || e.partner){ const p=clean(e.partner,80); if(p){s.partnersMap.set(p,(s.partnersMap.get(p)||0)+1);partnerCounts.set(p,(partnerCounts.get(p)||0)+1);} }
      if(e.action==='partner_view')s.partners+=1;
      if(e.action==='tariff_view')s.tariffs+=1;
      if(e.action==='product_view'){
        s.products+=1; const key=clean(e.productRef||e.productName||e.collection||'Produit',180); const cur=s.productsMap.get(key)||{count:0,name:clean(e.productName||e.collection||key,180),ref:clean(e.productRef,80),partner:clean(e.partner,80)}; cur.count+=1;s.productsMap.set(key,cur);
        const all=productCounts.get(key)||{count:0,name:cur.name,ref:cur.ref,partner:cur.partner};all.count+=1;productCounts.set(key,all);
      }
      if(e.action==='stock_view'){
        s.stocks+=1; const key=clean(e.productRef||e.productName||e.collection||'Stock',180); const cur=s.stocksMap.get(key)||{count:0,name:clean(e.productName||e.collection||key,180),ref:clean(e.productRef,80),collection:clean(e.collection,120),stock:e.stock,stockUnit:clean(e.stockUnit,20),partner:clean(e.partner,80)};cur.count+=1;cur.stock=e.stock;cur.stockUnit=clean(e.stockUnit,20);s.stocksMap.set(key,cur);
        const all=stockCounts.get(key)||{count:0,name:cur.name,ref:cur.ref,collection:cur.collection,stock:cur.stock,stockUnit:cur.stockUnit,partner:cur.partner};all.count+=1;all.stock=cur.stock;all.stockUnit=cur.stockUnit;stockCounts.set(key,all);
      }
      if(e.action==='cart_add')s.carts+=1;
      if(e.action==='order_view')s.orders+=1;
    }

    for(const s of byClient.values())s.sessions=inferSessions(s.events);

    const clientRows=[];
    for(const [clientId,c] of clients){
      if(filterDepartment && depFromClient(c)!==filterDepartment)continue;
      if(filterClient && clientId!==filterClient)continue;
      const s=byClient.get(clientId)||emptyStats();
      const heat=scoreClient(s,now), summary=summaries.get(clientId)||{};
      const globalLast=tsMs(summary.lastSeenAt), recentMs=globalLast||s.lastSeen;
      const topPage=[...s.pages.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
      const topProduct=[...s.productsMap.values()].sort((a,b)=>b.count-a.count)[0]||null;
      clientRows.push({
        id:clientId,codeClient:clean(c.codeClient,20).toUpperCase(),societe:c.societe||'Client',departement:depFromClient(c),ville:c.ville||'',contact:c.contact||c.interlocuteur||'',email:c.email||'',telephone:c.telephone||'',partenaires:Array.isArray(c.partenaires)?c.partenaires:[],
        lastSeenAt:s.lastSeen,lastSeenGlobal:recentMs,isOnline:recentMs>=now-5*60*1000,isToday:recentMs>=startOfDay(now),sessions:s.sessions,views:s.views,tariffViews:s.tariffs,productViews:s.products,stockViews:s.stocks,partnerViews:s.partners,cartAdds:s.carts,orderViews:s.orders,distinctPages:s.pages.size,topPage,topProduct,heatScore:heat.score,heatLabel:heat.label,heatReasons:heat.reasons
      });
    }
    clientRows.sort((a,b)=>b.heatScore-a.heatScore||b.lastSeenAt-a.lastSeenAt||a.societe.localeCompare(b.societe,'fr'));

    const activeRows=clientRows.filter(c=>c.lastSeenAt>0), hotClients=activeRows.filter(c=>c.heatScore>=50);
    const connectedRecent=clientRows.filter(c=>c.isOnline).sort((a,b)=>b.lastSeenGlobal-a.lastSeenGlobal);
    const timeline=events.slice(0,1200).map(e=>({
      id:e.id,clientId:e.clientId,codeClient:clean(e.client.codeClient,20).toUpperCase(),societe:e.client.societe||'Client',departement:depFromClient(e.client),ville:e.client.ville||'',at:e.ms,action:e.action,actionLabel:actionLabel(e.action),page:pageLabel(e.page,e.title),partner:clean(e.partner,80),productRef:clean(e.productRef,80),productName:clean(e.productName,180),collection:clean(e.collection,120),stock:e.stock,stockUnit:clean(e.stockUnit,20),device:clean(e.device,20)
    }));

    return res.json({
      success:true,generatedAt:now,agent:agentEmail,range,
      general:{totalClients:clientRows.length,activeClients:activeRows.length,connections:activeRows.reduce((n,c)=>n+c.sessions,0),events:events.length,pageViews:events.filter(e=>e.action==='page_view').length,productViews:events.filter(e=>e.action==='product_view').length,stockViews:events.filter(e=>e.action==='stock_view').length,tariffViews:events.filter(e=>e.action==='tariff_view').length,orders:events.filter(e=>e.action==='order_view').length,hotClients:hotClients.length,onlineNow:connectedRecent.length},
      clients:clientRows,hotClients,connectedRecent,timeline,
      pages:mapTop(pageCounts,30),products:mapTop(productCounts,40),stocks:mapTop(stockCounts,40),partners:mapTop(partnerCounts,30),departments:mapTop(departmentCounts,50),actions:mapTop(actionCounts,20),
      filters:{departments,partners,actions:actions.map(value=>({value,label:actionLabel(value)}))}
    });
  } catch(e) {
    console.error('getLrfAnalytics',e);
    return res.status(500).json({success:false,error:'Analyse LRF indisponible.'});
  }
});

module.exports = { trackLrfActivity, getLrfAnalytics };
