import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const $=s=>document.querySelector(s);
const clean=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const LOCAL_KEY='lrf:saved-tours:v1';
let latestPlan=null;
let navSheet=null;

function status(text,type='ok'){
  const e=$('#tour-status');
  if(!e)return;
  e.className='tour-status '+type;
  e.innerHTML=text;
}

function readLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{return[]}}
function writeLocal(items){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(items.slice(0,40)))}catch{}}

function capturePlanFromDom(){
  const route=[...document.querySelectorAll('.route-stop-v5')].map((row,i)=>{
    const main=row.querySelector('.route-stop-main');
    const title=clean(main?.querySelector('h4')?.textContent)||`Étape ${i+1}`;
    const lines=[...main?.querySelectorAll('p')||[]].map(p=>clean(p.textContent));
    const addr=lines.find(x=>/\d{5}|\b2[AB]\b/.test(x))||lines[0]||'';
    const parts=addr.split('·').map(clean);
    return {order:i+1,clientId:row.dataset.clientId||'',date:row.dataset.date||'',societe:title,address:addr,adresse:parts[0]||'',codePostal:parts[1]||'',ville:parts[2]||''};
  });
  if(!route.length)return null;
  const sub=clean($('#tour-result-sub')?.textContent);
  const dates=[...new Set(route.map(x=>x.date).filter(Boolean))];
  return {
    version:7,
    name:`Tournée ${dates[0]||new Date().toISOString().slice(0,10)}`,
    dateStart:dates[0]||'',dateEnd:dates.at(-1)||dates[0]||'',
    startAddress:clean($('#tour-start-address')?.value),
    start:{label:clean($('#tour-start-address')?.value),address:clean($('#tour-start-address')?.value)},
    mode:sub.includes('optimisé')?'optimized':'manual',
    partners:[...document.querySelectorAll('#tour-partners input:checked')].map(x=>x.value),
    departements:[...document.querySelectorAll('#tour-deps input:checked')].map(x=>x.value),
    days:dates.map(d=>({date:d,stops:route.filter(x=>x.date===d)})),
    createdBy:localStorage.getItem('agentName')||'Agent',
    createdByEmail:localStorage.getItem('agentEmail')||''
  };
}

async function reliableSave(btn){
  const plan=latestPlan||capturePlanFromDom();
  if(!plan){status('Aucune tournée prête à enregistrer.','error');return;}
  latestPlan=plan;
  btn.disabled=true;
  const old=btn.innerHTML;
  btn.innerHTML='⏳ Enregistrement…';
  status('💾 Enregistrement de la tournée…','');
  const payload=JSON.parse(JSON.stringify(plan));
  payload.createdAt=serverTimestamp();
  payload.savedAt=serverTimestamp();
  payload.createdBy=payload.createdBy||localStorage.getItem('agentName')||'Agent';
  payload.createdByEmail=payload.createdByEmail||localStorage.getItem('agentEmail')||'';
  try{
    const ref=await addDoc(collection(db,'tournees'),payload);
    latestPlan.id=ref.id;
    btn.innerHTML='✅ Enregistrée';
    status('✅ <strong>Tournée enregistrée.</strong> Elle sera disponible dans « Tournées enregistrées ».','ok');
    window.dispatchEvent(new CustomEvent('lrf-tour-saved',{detail:{id:ref.id}}));
    setTimeout(()=>{btn.innerHTML=old;btn.disabled=false;location.reload();},900);
  }catch(error){
    console.error('[Tournées] Firestore indisponible, sauvegarde locale de secours',error);
    const local=readLocal();
    const copy=JSON.parse(JSON.stringify(plan));
    copy.id=`local-${Date.now()}`;copy.savedAtLocal=new Date().toISOString();
    writeLocal([copy,...local.filter(x=>x.id!==copy.id)]);
    latestPlan=copy;
    btn.innerHTML='✅ Enregistrée';
    status('✅ Tournée enregistrée sur cet appareil. La synchronisation serveur est momentanément indisponible.','ok');
    injectLocalSaved();
    setTimeout(()=>{btn.innerHTML=old;btn.disabled=false;},1000);
  }
}

function injectLocalSaved(){
  const box=$('#tour-saved-list');if(!box)return;
  const locals=readLocal();if(!locals.length)return;
  box.querySelectorAll('.tour-saved-item[data-local-tour]').forEach(x=>x.remove());
  locals.forEach(t=>{
    const n=(t.days||[]).reduce((a,d)=>a+(d.stops?.length||0),0);
    const row=document.createElement('div');
    row.className='tour-saved-item';row.dataset.localTour=t.id;
    row.innerHTML=`<div><h4>${esc(t.name||'Tournée')}</h4><p>${esc(t.dateStart||'')} ${t.dateEnd&&t.dateEnd!==t.dateStart?`→ ${esc(t.dateEnd)}`:''} · ${n} visite(s) · sauvegarde locale</p></div><button type="button" class="tour-open-btn">Ouvrir</button>`;
    row.querySelector('button').onclick=()=>{latestPlan=t;renderLocalPlan(t);};
    box.prepend(row);
  });
}

function renderLocalPlan(plan){
  const stops=(plan.days||[]).flatMap(d=>(d.stops||[]).map(s=>({...s,date:d.date})));
  if(!stops.length)return;
  $('#tour-result-sub').textContent=`${plan.dateStart||''}${plan.dateEnd&&plan.dateEnd!==plan.dateStart?` au ${plan.dateEnd}`:''} · tournée enregistrée`;
  $('#tour-route').innerHTML=(plan.days||[]).map((d,di)=>`<div class="tour-day-v5"><div class="tour-day-head-v5"><div><h3>Jour ${di+1} — ${esc(d.date)}</h3><small>${d.stops?.length||0} visite(s)</small></div></div>${(d.stops||[]).map((s,i)=>`<div class="route-stop-v5" data-client-id="${esc(s.clientId||'')}" data-date="${esc(d.date)}"><div class="route-order-v5">${i+1}</div><div class="route-stop-main"><h4>${esc(s.societe||`Étape ${i+1}`)}</h4><p>${esc(s.address||[s.adresse,s.codePostal,s.ville].filter(Boolean).join(' · '))}</p></div></div>`).join('')}</div>`).join('');
  ensureStartButton(true);
  window.scrollTo({top:0,behavior:'smooth'});
}

function googleMapsUrl(){
  const plan=latestPlan||capturePlanFromDom();if(!plan)return'';
  const stops=(plan.days||[]).flatMap(d=>d.stops||[]);
  if(!stops.length)return'';
  const q=s=>encodeURIComponent(clean(s.address||[s.adresse,s.codePostal,s.ville].filter(Boolean).join(', '))||clean(s.societe));
  const origin=q(plan.start?.address||plan.startAddress||'');
  const dest=q(stops.at(-1));
  const way=stops.slice(0,-1).map(q).filter(Boolean).join('%7C');
  return `https://www.google.com/maps/dir/?api=1${origin?`&origin=${origin}`:''}&destination=${dest}${way?`&waypoints=${way}`:''}&travelmode=driving`;
}

function wazeUrl(){
  const plan=latestPlan||capturePlanFromDom();if(!plan)return'';
  const first=(plan.days||[]).flatMap(d=>d.stops||[])[0];if(!first)return'';
  if(Number.isFinite(+first.lat)&&Number.isFinite(+first.lng))return `https://waze.com/ul?ll=${first.lat}%2C${first.lng}&navigate=yes`;
  const addr=clean(first.address||[first.adresse,first.codePostal,first.ville].filter(Boolean).join(', '))||clean(first.societe);
  return `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;
}

function openExternal(url){if(!url)return;window.location.href=url;}

function ensureNavSheet(){
  if(navSheet)return navSheet;
  navSheet=document.createElement('div');navSheet.className='tour-nav-sheet';navSheet.hidden=true;
  navSheet.innerHTML=`<div class="tour-nav-card"><button type="button" class="tour-nav-close">×</button><h3>🚗 Démarrer ma tournée</h3><p>Choisissez votre GPS.</p><button type="button" class="tour-nav-choice google">🗺️ Google Maps <span>Itinéraire complet</span></button><button type="button" class="tour-nav-choice waze">🔵 Waze <span>Navigation vers le 1er magasin</span></button></div>`;
  document.body.appendChild(navSheet);
  navSheet.querySelector('.tour-nav-close').onclick=()=>navSheet.hidden=true;
  navSheet.querySelector('.google').onclick=()=>openExternal(googleMapsUrl());
  navSheet.querySelector('.waze').onclick=()=>openExternal(wazeUrl());
  navSheet.addEventListener('click',e=>{if(e.target===navSheet)navSheet.hidden=true});
  return navSheet;
}

function ensureStyles(){
  if($('#tour-save-nav-fix-style'))return;
  const s=document.createElement('style');s.id='tour-save-nav-fix-style';s.textContent=`
    #tour-start-navigation{display:none}
    .tour-nav-sheet[hidden]{display:none!important}
    .tour-nav-sheet{position:fixed;inset:0;z-index:2147482000;background:rgba(17,14,9,.42);display:flex;align-items:flex-end;justify-content:center;padding:14px}
    .tour-nav-card{position:relative;width:min(520px,100%);background:#fffdf8;border:1px solid #d9ad42;border-radius:24px;padding:22px;box-shadow:0 24px 70px rgba(50,35,8,.3)}
    .tour-nav-card h3{margin:0 0 6px;font-size:1.25rem}.tour-nav-card p{margin:0 0 16px;color:#756b5d}.tour-nav-close{position:absolute;right:12px;top:10px;border:0;background:#17130f;color:#f0b52d;border-radius:50%;width:34px;height:34px;font-size:20px}
    .tour-nav-choice{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding:15px 16px;border-radius:15px;border:1px solid #d7c9ad;background:#fff;font-weight:900;font-size:1rem}.tour-nav-choice span{font-size:.72rem;font-weight:700;color:#766c5d}.tour-nav-choice.google{border-color:#e0b13a;background:linear-gradient(180deg,#fff9e7,#fff0bd)}.tour-nav-choice.waze{border-color:#52b6d6;background:linear-gradient(180deg,#f5fdff,#dff7ff)}
    @media(max-width:760px){#tour-start-navigation{display:inline-flex!important;width:100%;justify-content:center;margin-top:10px;min-height:52px;font-size:1rem;background:linear-gradient(180deg,#23b8ae,#0d958d);color:#fff;border-color:#087e78}.tour-result-head .tour-actions{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:8px}.tour-result-head{flex-wrap:wrap}}
  `;document.head.appendChild(s);
}

function ensureStartButton(show=false){
  let btn=$('#tour-start-navigation');
  if(!btn){btn=document.createElement('button');btn.id='tour-start-navigation';btn.type='button';btn.className='tour-btn teal';btn.textContent='🚗 Démarrer ma tournée';const actions=document.querySelector('.tour-result-head .tour-actions');actions?.appendChild(btn);btn.onclick=()=>{latestPlan=latestPlan||capturePlanFromDom();if(!latestPlan){status('Validez d’abord votre tournée.','error');return;}ensureNavSheet().hidden=false;};}
  if(show)btn.disabled=false;
}

function hookSave(){
  const btn=$('#tour-save');if(!btn||btn.dataset.reliableSave==='1')return;
  btn.dataset.reliableSave='1';
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();reliableSave(btn);},true);
}

function detectPlan(){
  const route=$('#tour-route');if(!route)return;
  const sync=()=>{if(route.querySelector('.route-stop-v5')){latestPlan=capturePlanFromDom();ensureStartButton(true);}};
  new MutationObserver(sync).observe(route,{childList:true,subtree:true});sync();
}

function init(){ensureStyles();ensureNavSheet();ensureStartButton(false);hookSave();detectPlan();setTimeout(injectLocalSaved,500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
