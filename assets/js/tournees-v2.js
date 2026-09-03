import { db } from './firebase.js';
import { collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const VISIT_SECONDS = 90 * 60;
const LUNCH_START = 12 * 3600;
const LUNCH_END = 14 * 3600;
const MAX_HALF_DAY_VISITS = 4;
const MAX_CANDIDATES = 20;
const $ = s => document.querySelector(s);
const clean = v => String(v ?? '').trim();
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let clients = [];
let currentPlan = null;
let startPosition = null;
let routeMap = null;
let routeLayer = null;

function depFromCp(cp){
  const s=clean(cp).replace(/\s/g,'');
  if(!/^\d{5}$/.test(s))return '';
  if(s.startsWith('97')||s.startsWith('98'))return s.slice(0,3);
  if(s.startsWith('20'))return Number(s)>=20200?'2B':'2A';
  return s.slice(0,2);
}
function timeToSeconds(v){const [h,m]=String(v||'00:00').split(':').map(Number);return h*3600+m*60;}
function clock(sec){sec=((Math.round(sec)%86400)+86400)%86400;return `${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}`;}
function duration(sec){const m=Math.round((Number(sec)||0)/60);if(m<60)return `${m} min`;const h=Math.floor(m/60),r=m%60;return `${h} h${r?` ${r} min`:''}`;}
function distance(m){const n=Number(m)||0;return n<1000?`${Math.round(n)} m`:`${(n/1000).toFixed(1).replace('.',',')} km`;}
function address(c){return [clean(c.adresse),clean(c.codePostal||c.code_postal),clean(c.ville)].filter(Boolean).join(', ');}
function setStatus(text,type=''){
  const el=$('#tour-status'); if(!el)return;
  el.className='tour-status'+(type?` ${type}`:''); el.innerHTML=text;
}
function selectedIds(){return [...document.querySelectorAll('.tour-client-check:checked')].map(x=>x.value);}
function selectedPartners(){return [...document.querySelectorAll('#tour-partners input:checked')].map(x=>x.value);}
function storedCoords(c){
  const pairs=[[c.lat,c.lng],[c.latitude,c.longitude],[c.lat,c.lon],[c.geo?.lat,c.geo?.lng],[c.position?.lat,c.position?.lng],[c.coordinates?.lat,c.coordinates?.lng]];
  for(const [a,b] of pairs){const lat=Number(a),lng=Number(b);if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return {lat,lng};}
  if(Array.isArray(c.coordinates)&&c.coordinates.length>=2){const lng=Number(c.coordinates[0]),lat=Number(c.coordinates[1]);if(Number.isFinite(lat)&&Number.isFinite(lng))return {lat,lng};}
  return null;
}
async function geocode(q){
  q=clean(q); if(!q)return null;
  const key='lrf-geocode:'+q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  try{const c=JSON.parse(localStorage.getItem(key)||'null');if(Number.isFinite(c?.lat)&&Number.isFinite(c?.lng))return c;}catch{}
  try{
    const r=await fetch(`https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q)}`);
    if(r.ok){const j=await r.json(),co=j.features?.[0]?.geometry?.coordinates;if(co){const out={lat:Number(co[1]),lng:Number(co[0])};localStorage.setItem(key,JSON.stringify(out));return out;}}
  }catch(e){console.warn('Géocodage',e)}
  return null;
}
async function locateClient(c){const p=storedCoords(c)||await geocode(address(c));return p?{...c,...p}:null;}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;async function work(){while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i]);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},work));return out;}
function hav(a,b){const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng),la1=rad(a.lat),la2=rad(b.lat);const q=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
async function matrix(points){
  const coords=points.map(p=>`${p.lng},${p.lat}`).join(';');
  try{const r=await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`);if(r.ok){const j=await r.json();if(j.code==='Ok'&&j.durations)return {durations:j.durations,distances:j.distances||null,source:'route'};}}catch(e){console.warn('OSRM',e)}
  return {
    durations:points.map(a=>points.map(b=>a===b?0:Math.max(60,hav(a,b)/50000*3600))),
    distances:points.map(a=>points.map(b=>a===b?0:hav(a,b)*1.18)),
    source:'estimate'
  };
}
async function getStart(){
  if(startPosition)return startPosition;
  const value=clean($('#tour-start-address')?.value);
  if(!value||value==='Ma position actuelle')return null;
  const p=await geocode(value); if(p)startPosition={...p,label:value}; return startPosition;
}
function useCurrentLocation(){
  if(!navigator.geolocation){setStatus('La géolocalisation n’est pas disponible.','error');return;}
  setStatus('📍 Recherche de votre position…');
  navigator.geolocation.getCurrentPosition(p=>{startPosition={lat:p.coords.latitude,lng:p.coords.longitude,label:'Ma position actuelle'};$('#tour-start-address').value='Ma position actuelle';setStatus('📍 Position enregistrée.','ok');},()=>setStatus('Impossible d’obtenir votre position.','error'),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
}
function nearestOrder(available,currentIdx,matrixData,limit,windowSeconds,priorityMode){
  const chosen=[];let current=currentIdx,used=0;
  while(available.size&&chosen.length<limit){let best=null,bestScore=Infinity;
    for(const idx of available){const travel=matrixData[current]?.[idx]??Infinity;const projected=used+travel+VISIT_SECONDS;if(projected>windowSeconds)continue;const c=clients._located[idx-1];const priority=priorityMode?Number(c?._priority||0):0;const score=travel-Math.min(900,priority);if(score<bestScore){bestScore=score;best={idx,travel};}}
    if(!best)break;chosen.push(best.idx);available.delete(best.idx);used+=best.travel+VISIT_SECONDS;current=best.idx;
  }
  return {chosen,used,last:current};
}
function buildStops(route,located,road,startSec,startIdx,period){
  const stops=[];let t=startSec,prev=startIdx,drive=0,dist=0;
  for(const idx of route){const travel=Math.round(road.durations[prev]?.[idx]||0),d=Math.round(road.distances?.[prev]?.[idx]||0);t+=travel;drive+=travel;dist+=d;const c=located[idx-1];const arrival=t,departure=t+VISIT_SECONDS;stops.push({order:0,period,clientId:c.id,societe:c.societe||'Sans nom',adresse:c.adresse||'',codePostal:c.codePostal||c.code_postal||'',ville:c.ville||'',contact:c.contact||'',telephone:c.telephone||'',lat:c.lat,lng:c.lng,arrival:clock(arrival),departure:clock(departure),arrivalSeconds:arrival,departureSeconds:departure,travelSeconds:travel,distanceMeters:d,visitMinutes:90});t=departure;prev=idx;}
  return {stops,endSeconds:t,lastIdx:prev,drive,dist};
}
function mapsLink(start,stops){if(!stops.length)return '#';const shown=stops.slice(0,9),dest=shown[shown.length-1],way=shown.slice(0,-1).map(s=>`${s.lat},${s.lng}`).join('|');return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${start.lat},${start.lng}`)}&destination=${encodeURIComponent(`${dest.lat},${dest.lng}`)}${way?`&waypoints=${encodeURIComponent(way)}`:''}&travelmode=driving`;}
function stopLink(s){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.lat},${s.lng}`)}&travelmode=driving`;}
async function geometry(points){if(points.length<2)return null;try{const coords=points.map(p=>`${p.lng},${p.lat}`).join(';');const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);if(!r.ok)return null;const j=await r.json();return j.routes?.[0]?.geometry||null;}catch{return null;}}

async function calculate(){
  currentPlan=null;$('#tour-save').disabled=true;$('#tour-print').disabled=true;
  const dep=$('#tour-dep').value,date=$('#tour-date').value,startTime=$('#tour-start-time').value,endTime=$('#tour-end-time').value;
  if(!dep||!date){setStatus('Choisissez le jour et le département.','error');return;}
  const startSec=timeToSeconds(startTime),endSec=timeToSeconds(endTime);
  if(startSec>=LUNCH_START){setStatus('La tournée doit commencer avant midi.','error');return;}
  if(endSec<=LUNCH_END+VISIT_SECONDS){setStatus('La fin de journée doit permettre au moins une visite après 14 h.','error');return;}
  const start=await getStart(); if(!start){setStatus('Indiquez une adresse de départ ou utilisez « Ma position ».','error');return;}
  const selected=selectedIds(); const auto=selected.length===0;
  let pool=clients.filter(c=>!c.archived&&!c.archive&&depFromCp(c.codePostal||c.code_postal)===dep);
  if(!auto)pool=pool.filter(c=>selected.includes(c.id));
  if(auto)pool=pool.slice(0,MAX_CANDIDATES); if(pool.length>MAX_CANDIDATES)pool=pool.slice(0,MAX_CANDIDATES);
  if(!pool.length){setStatus('Aucun client disponible pour cette tournée.','error');return;}
  setStatus(`🧭 Localisation et calcul de ${pool.length} dossier(s)…`);
  const located=(await mapLimit(pool,3,locateClient)).filter(Boolean);if(!located.length){setStatus('Impossible de localiser les clients sélectionnés.','error');return;}
  clients._located=located;
  located.forEach(c=>{c._priority=String(c.type||'').toLowerCase()==='prospect'?180:0;});
  const points=[start,...located],road=await matrix(points),available=new Set(located.map((_,i)=>i+1));
  const morningWindow=Math.max(0,LUNCH_START-startSec);
  const morningPick=nearestOrder(available,0,road.durations,MAX_HALF_DAY_VISITS,morningWindow,auto);
  const morning=buildStops(morningPick.chosen,located,road,startSec,0,'matin');
  const lunchLocation=morning.lastIdx||0;
  const afternoonWindow=Math.max(0,endSec-LUNCH_END);
  const afternoonPick=nearestOrder(available,lunchLocation,road.durations,MAX_HALF_DAY_VISITS,afternoonWindow,auto);
  const afternoon=buildStops(afternoonPick.chosen,located,road,LUNCH_END,lunchLocation,'après-midi');
  let stops=[...morning.stops,...afternoon.stops];stops.forEach((s,i)=>s.order=i+1);
  let drive=morning.drive+afternoon.drive,dist=morning.dist+afternoon.dist,returnSeconds=0,returnDistance=0;
  if($('#tour-return').checked&&stops.length){const lastIdx=afternoonPick.chosen.length?afternoon.lastIdx:morning.lastIdx;returnSeconds=Math.round(road.durations[lastIdx]?.[0]||0);returnDistance=Math.round(road.distances?.[lastIdx]?.[0]||0);if((afternoonPick.chosen.length?afternoon.endSeconds:morning.endSeconds)+returnSeconds<=endSec){drive+=returnSeconds;dist+=returnDistance;}else{returnSeconds=0;returnDistance=0;}}
  const usedMorning=morning.stops.length,usedAfternoon=afternoon.stops.length;
  currentPlan={date,departement:dep,startTime,endTime,startAddress:start.label,startLat:start.lat,startLng:start.lng,partners:selectedPartners(),visitMinutes:90,lunchStart:'12:00',lunchEnd:'14:00',morningVisits:usedMorning,afternoonVisits:usedAfternoon,returnToStart:$('#tour-return').checked,selectionMode:auto?'auto':'manual',stops,metrics:{driveSeconds:drive,visitSeconds:stops.length*VISIT_SECONDS,distanceMeters:dist,returnSeconds,returnDistance,totalSeconds:(Math.max(afternoon.endSeconds||LUNCH_END,morning.endSeconds||startSec)-startSec)+(returnSeconds||0)},routingSource:road.source,status:'planned'};
  currentPlan.geometry=await geometry([start,...stops]);
  render(currentPlan,start);
  const omitted=pool.length-located.length+available.size;
  setStatus(`✅ <strong>${stops.length} visite(s)</strong> planifiée(s) : ${usedMorning} le matin, ${usedAfternoon} l’après-midi, avec pause 12 h–14 h. ${distance(dist)} et ${duration(drive)} de conduite.${omitted>0?` ${omitted} dossier(s) non retenu(s) car la journée serait trop chargée.`:''}`,'ok');
}
function ensureMap(){if(!window.L)return null;if(!routeMap){routeMap=L.map('tour-map',{zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(routeMap);}if(routeLayer)routeLayer.remove();routeLayer=L.layerGroup().addTo(routeMap);return routeMap;}
function renderMap(plan,start){const m=ensureMap();if(!m)return;const bounds=[[start.lat,start.lng]];L.circleMarker([start.lat,start.lng],{radius:8,weight:3,color:'#111',fillColor:'#f3ad18',fillOpacity:1}).bindPopup('<b>Départ</b>').addTo(routeLayer);plan.stops.forEach(s=>{bounds.push([s.lat,s.lng]);L.circleMarker([s.lat,s.lng],{radius:10,weight:2,color:'#fff',fillColor:s.period==='matin'?'#159c91':'#e88a32',fillOpacity:1}).bindTooltip(String(s.order),{permanent:true,direction:'center',className:'tour-map-number'}).bindPopup(`<b>${esc(s.order+'. '+s.societe)}</b><br>${esc(s.arrival)}–${esc(s.departure)} · ${esc(s.period)}`).addTo(routeLayer);});if(plan.geometry)L.geoJSON(plan.geometry,{style:{weight:5,opacity:.75}}).addTo(routeLayer);if(bounds.length)routeMap.fitBounds(bounds,{padding:[28,28]});setTimeout(()=>routeMap.invalidateSize(),100);}
function render(plan,start){
  $('#tour-result-sub').textContent=`${new Date(plan.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · Département ${plan.departement}`;
  $('#tour-summary').innerHTML=`<span class="tour-pill">👥 ${plan.stops.length} visites</span><span class="tour-pill">🌅 ${plan.morningVisits} matin</span><span class="tour-pill">🌇 ${plan.afternoonVisits} après-midi</span><span class="tour-pill">🍽 12:00–14:00 pause</span><span class="tour-pill">⏱ 1 h 30 / client</span><span class="tour-pill">🚗 ${duration(plan.metrics.driveSeconds)}</span><span class="tour-pill">📏 ${distance(plan.metrics.distanceMeters)}</span>${plan.partners.length?`<span class="tour-pill">🏭 ${esc(plan.partners.join(' · '))}</span>`:''}<a class="tour-btn secondary" style="min-height:30px;padding:0 9px;font-size:.72rem" target="_blank" rel="noopener" href="${mapsLink(start,plan.stops)}">🗺 Google Maps</a>`;
  const morning=plan.stops.filter(s=>s.period==='matin'),afternoon=plan.stops.filter(s=>s.period==='après-midi');
  const rows=arr=>arr.map(s=>`<article class="route-stop"><div class="route-order">${s.order}</div><div><b>${esc(s.societe)}</b><small>${esc([s.adresse,s.codePostal,s.ville].filter(Boolean).join(', '))}<br>${s.contact?`👤 ${esc(s.contact)} `:''}${s.telephone?`· 📞 ${esc(s.telephone)}`:''}<br>🚗 trajet : ${duration(s.travelSeconds)} · ${distance(s.distanceMeters)}</small><div class="route-links"><a class="route-link" href="clients.html?edit=${encodeURIComponent(s.clientId)}">Ouvrir la fiche</a><a class="route-link" target="_blank" rel="noopener" href="${stopLink(s)}">Y aller</a></div></div><div class="route-time"><strong>${s.arrival}</strong><span>arrivée</span><strong style="margin-top:4px">${s.departure}</strong><span>départ · visite 1 h 30</span></div></article>`).join('');
  $('#tour-route').innerHTML=`${morning.length?`<div class="tour-half-title">🌅 Matin · ${morning.length} visite(s)</div>${rows(morning)}`:''}<div class="tour-lunch-break"><strong>🍽 Pause déjeuner</strong><span>12:00 → 14:00 · aucun rendez-vous planifié</span></div>${afternoon.length?`<div class="tour-half-title">🌇 Après-midi · ${afternoon.length} visite(s)</div>${rows(afternoon)}`:''}`;
  renderMap(plan,start);$('#tour-save').disabled=false;$('#tour-print').disabled=false;
}
async function save(){
  if(!currentPlan)return;const btn=$('#tour-save');btn.disabled=true;btn.textContent='Enregistrement…';
  try{const payload={...currentPlan};delete payload.geometry;await addDoc(collection(db,'tournees'),{...payload,createdAt:serverTimestamp(),createdBy:localStorage.getItem('agentName')||'Agent',createdByEmail:localStorage.getItem('agentEmail')||''});setStatus('💾 Tournée enregistrée. Elle apparaîtra dans le planning du jour.','ok');btn.textContent='✅ Enregistrée';}catch(e){console.error(e);setStatus('Erreur lors de l’enregistrement.','error');btn.disabled=false;btn.textContent='💾 Enregistrer';}
}
function injectStyles(){if(document.getElementById('tour-v2-style'))return;const s=document.createElement('style');s.id='tour-v2-style';s.textContent=`.tour-lunch-break{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:14px 0;padding:14px 16px;border-radius:13px;background:linear-gradient(145deg,#fff4d7,#ffe7b5);border:1px solid #e9c66f;color:#654b16}.tour-lunch-break span{font-size:.76rem}.tour-half-title{margin:14px 0 8px;font-weight:900;font-size:.86rem;color:#5b4b35}@media(max-width:650px){.tour-lunch-break{align-items:flex-start;flex-direction:column}}`;document.head.appendChild(s);}
async function init(){
  injectStyles();
  const lead=document.querySelector('.tour-config .tour-lead');if(lead)lead.innerHTML='Chaque visite est prévue sur <strong>1 h 30</strong>. Le CRM optimise séparément le matin et l’après-midi et bloque automatiquement la <strong>pause de 12 h à 14 h</strong>.';
  const note=document.querySelector('.tour-client-picker .tour-note');if(note)note.textContent='Objectif : regrouper les clients proches et remplir intelligemment le matin puis l’après-midi, sans dépasser 4 visites par demi-journée et sans empiéter sur la pause déjeuner.';
  const start=$('#tour-start-time'),end=$('#tour-end-time');if(start&&start.value==='08:30')start.value='07:30';if(end&&end.value==='18:00')end.value='19:00';
  try{const snap=await getDocs(collection(db,'clients'));clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));}catch(e){console.error(e)}
  const calc=$('#tour-calculate'),saveBtn=$('#tour-save'),loc=$('#tour-use-location');if(calc)calc.onclick=calculate;if(saveBtn)saveBtn.onclick=save;if(loc)loc.onclick=useCurrentLocation;$('#tour-start-address')?.addEventListener('input',()=>{startPosition=null;});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
