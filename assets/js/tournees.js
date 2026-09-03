import { db } from './firebase.js';
import { collection, getDocs, getDoc, doc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const VISIT_SECONDS = 30 * 60;
const MAX_CANDIDATES = 18;
const PARTNERS = ['ELIOS','VIEW','LA FENICE','REVIGLASS','BIOPIETRA',"PETRACER'S",'PECCHIOLI','BULBO','RANDAL PRO','NEOBATH','KOIBATH','AQUAHOME','OPAL','BILT'];
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clean = v => String(v ?? '').trim();
let clients = [];
let filteredClients = [];
let startPosition = null;
let currentPlan = null;
let map = null;
let mapLayer = null;

function localDateKey(d = new Date()) {
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function depFromCp(cp){
  const s=clean(cp).replace(/\s/g,''); if(!/^\d{5}$/.test(s)) return '';
  if(s.startsWith('97')||s.startsWith('98')) return s.slice(0,3);
  if(s.startsWith('20')) return Number(s)>=20200?'2B':'2A';
  return s.slice(0,2);
}
function parseDate(v){
  if(!v)return null; if(v?.toDate)return v.toDate();
  const s=clean(v); const fr=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if(fr){let y=+fr[3];if(y<100)y+=2000;const d=new Date(y,+fr[2]-1,+fr[1]);return isNaN(d)?null:d;}
  const d=new Date(s); return isNaN(d)?null:d;
}
function latestContact(c){
  const dates=[]; const add=v=>{const d=parseDate(v);if(d)dates.push(d)};
  add(c.moovagoDernierSuivi); add(c.dernierEchange); add(c.lastContact); add(c.updatedAt);
  (c.comptes_rendus||c.comptesRendus||[]).forEach(x=>add(x.date||x.dateCreation));
  (c.historiqueMails||[]).forEach(x=>add(x.date));
  dates.sort((a,b)=>b-a); return dates[0]||null;
}
function daysSinceContact(c){const d=latestContact(c);return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null;}
function priorityValue(c){const d=daysSinceContact(c);if(d===null)return 1000;return Math.min(500,d)+(String(c.type||'').toLowerCase()==='prospect'?15:0);}
function priorityBadge(c){
  const d=daysSinceContact(c); if(d===null)return {label:'Jamais contacté',cls:'never'};
  if(d>90)return {label:`${d} j`,cls:'hot'}; if(d>60)return {label:`${d} j`,cls:'warm'}; return {label:`${d} j`,cls:''};
}
function timeToSeconds(v){const [h,m]=String(v||'00:00').split(':').map(Number);return h*3600+m*60;}
function clockFromSeconds(sec){sec=((sec%86400)+86400)%86400;const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
function durationText(sec){const min=Math.round((Number(sec)||0)/60);if(min<60)return `${min} min`;const h=Math.floor(min/60),m=min%60;return `${h} h${m?` ${m} min`:''}`;}
function distanceText(m){const n=Number(m)||0;return n<1000?`${Math.round(n)} m`:`${(n/1000).toFixed(1).replace('.',',')} km`;}
function clientAddress(c){return [clean(c.adresse),clean(c.codePostal||c.code_postal),clean(c.ville)].filter(Boolean).join(', ');}
function getStoredCoords(c){
  const pairs=[
    [c.lat,c.lng],[c.latitude,c.longitude],[c.lat,c.lon],
    [c.geo?.lat,c.geo?.lng],[c.position?.lat,c.position?.lng],[c.coordinates?.lat,c.coordinates?.lng]
  ];
  for(const [a,b] of pairs){const lat=Number(a),lng=Number(b);if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return {lat,lng};}
  if(Array.isArray(c.coordinates)&&c.coordinates.length>=2){const lng=Number(c.coordinates[0]),lat=Number(c.coordinates[1]);if(Number.isFinite(lat)&&Number.isFinite(lng))return {lat,lng};}
  return null;
}
function hav(a,b){const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng),la1=rad(a.lat),la2=rad(b.lat);const q=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
function geocodeCacheKey(q){return 'lrf-geocode:'+q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
async function geocodeAddress(q){
  q=clean(q); if(!q)return null;
  const key=geocodeCacheKey(q); try{const cached=JSON.parse(localStorage.getItem(key)||'null');if(cached?.lat&&cached?.lng)return cached;}catch{}
  try{
    const r=await fetch(`https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q)}`);
    if(r.ok){const j=await r.json(),co=j.features?.[0]?.geometry?.coordinates;if(co){const out={lat:Number(co[1]),lng:Number(co[0])};localStorage.setItem(key,JSON.stringify(out));return out;}}
  }catch(e){console.warn('Géocodage adresse.gouv',e)}
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fr,mc&q=${encodeURIComponent(q)}`,{headers:{'Accept-Language':'fr'}});
    if(r.ok){const j=await r.json();if(j?.[0]){const out={lat:Number(j[0].lat),lng:Number(j[0].lon)};localStorage.setItem(key,JSON.stringify(out));return out;}}
  }catch(e){console.warn('Géocodage Nominatim',e)}
  return null;
}
async function mapLimit(items,limit,fn){
  const result=new Array(items.length);let cursor=0;
  async function worker(){while(cursor<items.length){const i=cursor++;result[i]=await fn(items[i],i);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return result;
}
async function clientWithCoords(c){const stored=getStoredCoords(c);if(stored)return {...c,...stored};const pos=await geocodeAddress(clientAddress(c));return pos?{...c,...pos}:null;}

function setStatus(text,type=''){$('#tour-status').className='tour-status'+(type?` ${type}`:'');$('#tour-status').innerHTML=text;}
function initPartners(){
  $('#tour-partners').innerHTML=PARTNERS.map((p,i)=>`<div class="tour-partner"><input id="tour-partner-${i}" type="checkbox" value="${esc(p)}"><label for="tour-partner-${i}">${esc(p)}</label></div>`).join('');
}
function selectedPartners(){return [...document.querySelectorAll('#tour-partners input:checked')].map(x=>x.value);}
function selectedClientIds(){return [...document.querySelectorAll('.tour-client-check:checked')].map(x=>x.value);}
function renderDepartments(){
  const deps=[...new Set(clients.map(c=>depFromCp(c.codePostal||c.code_postal)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
  $('#tour-dep').innerHTML='<option value="">Choisir…</option>'+deps.map(d=>`<option value="${esc(d)}">Département ${esc(d)}</option>`).join('');
}
function refreshFilteredClients(){
  const dep=$('#tour-dep').value;
  filteredClients=clients.filter(c=>!c.archived&&!c.archive&&depFromCp(c.codePostal||c.code_postal)===dep).sort((a,b)=>priorityValue(b)-priorityValue(a)||clean(a.ville).localeCompare(clean(b.ville),'fr')||clean(a.societe).localeCompare(clean(b.societe),'fr'));
  renderClientList();
  if(dep)setStatus(`<strong>${filteredClients.length} dossier(s)</strong> disponible(s) dans le département ${esc(dep)}. Cochez les clients souhaités ou laissez le CRM choisir.`, 'ok');
  else setStatus('Choisissez un département pour afficher les clients disponibles.');
}
function renderClientList(){
  const q=clean($('#tour-client-search').value).toLowerCase();const selected=new Set(selectedClientIds());
  const rows=filteredClients.filter(c=>!q||[c.societe,c.ville,c.codePostal,c.code_postal,c.contact,c.codeClient].some(v=>clean(v).toLowerCase().includes(q)));
  $('#tour-client-list').innerHTML=rows.length?rows.map(c=>{const p=priorityBadge(c);return `<label class="tour-client"><input class="tour-client-check" type="checkbox" value="${esc(c.id)}" ${selected.has(c.id)?'checked':''}><div><div class="tour-client-name">${esc(c.societe||'Sans nom')}</div><div class="tour-client-meta">${esc(c.codePostal||c.code_postal||'')} ${esc(c.ville||'')} · ${esc(c.contact||'Contact non renseigné')}</div></div><span class="tour-client-priority ${p.cls}">${esc(p.label)}</span></label>`}).join(''):`<div class="tour-empty">Aucun client correspondant.</div>`;
}
function smartSelect(){
  const ids=new Set(filteredClients.slice(0,Math.min(16,filteredClients.length)).map(c=>c.id));
  document.querySelectorAll('.tour-client-check').forEach(x=>x.checked=ids.has(x.value));
  setStatus(`✨ <strong>${ids.size} client(s)</strong> prioritaires présélectionnés. Le calcul routier déterminera ensuite l’ordre le plus efficace.`, 'ok');
}
function clearSelect(){document.querySelectorAll('.tour-client-check').forEach(x=>x.checked=false);}

async function getStartPoint(){
  if(startPosition)return startPosition;
  const address=clean($('#tour-start-address').value);if(!address||address==='Ma position actuelle')return null;
  setStatus('📍 Localisation du point de départ…');
  const p=await geocodeAddress(address); if(p)startPosition={...p,label:address};return startPosition;
}
function useLocation(){
  if(!navigator.geolocation){setStatus('La géolocalisation n’est pas disponible sur cet appareil.','error');return;}
  setStatus('📍 Recherche de votre position…');
  navigator.geolocation.getCurrentPosition(pos=>{startPosition={lat:pos.coords.latitude,lng:pos.coords.longitude,label:'Ma position actuelle'};$('#tour-start-address').value='Ma position actuelle';setStatus('📍 Position de départ enregistrée. Vous pouvez calculer la tournée.','ok');},()=>setStatus('Impossible d’obtenir votre position. Autorisez la géolocalisation ou saisissez une adresse.','error'),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
}
async function roadMatrix(points){
  const coords=points.map(p=>`${p.lng},${p.lat}`).join(';');
  try{
    const r=await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`);
    if(!r.ok)throw new Error(`OSRM ${r.status}`);const j=await r.json();if(j.code==='Ok'&&j.durations)return {durations:j.durations,distances:j.distances||null,source:'route'};
  }catch(e){console.warn('Matrice routière indisponible, estimation géographique',e)}
  const durations=points.map(a=>points.map(b=>a===b?0:Math.max(60,hav(a,b)/50000*3600)));
  const distances=points.map(a=>points.map(b=>a===b?0:hav(a,b)*1.18));
  return {durations,distances,source:'estimate'};
}
function pathCost(route,matrix,returnToStart=false){let prev=0,total=0;for(const idx of route){total+=matrix[prev][idx]||0;prev=idx;}if(returnToStart&&route.length)total+=matrix[prev][0]||0;return total;}
function twoOpt(route,matrix,returnToStart){
  let best=[...route],bestCost=pathCost(best,matrix,returnToStart),improved=true,rounds=0;
  while(improved&&rounds++<6){improved=false;for(let i=0;i<best.length-1;i++){for(let k=i+1;k<best.length;k++){const candidate=[...best.slice(0,i),...best.slice(i,k+1).reverse(),...best.slice(k+1)];const cost=pathCost(candidate,matrix,returnToStart);if(cost+1<bestCost){best=candidate;bestCost=cost;improved=true;}}}}
  return best;
}
function chooseRoute(candidates,matrix,budget,returnToStart,autoMode){
  const remaining=new Set(candidates.map((_,i)=>i+1));const route=[];let current=0,used=0;
  while(remaining.size){let best=null,bestScore=Infinity;
    for(const idx of remaining){const travel=matrix[current][idx]??Infinity;const ret=returnToStart?(matrix[idx][0]??Infinity):0;const projected=used+travel+VISIT_SECONDS+ret;if(projected>budget)continue;const c=candidates[idx-1];const bonus=autoMode?Math.min(720,priorityValue(c)*1.2):0;const score=travel-bonus;if(score<bestScore){bestScore=score;best={idx,travel};}}
    if(!best)break;route.push(best.idx);remaining.delete(best.idx);used+=best.travel+VISIT_SECONDS;current=best.idx;
  }
  return {route:twoOpt(route,matrix,returnToStart),omitted:[...remaining]};
}
async function fetchRouteGeometry(points){
  if(points.length<2)return null;const coords=points.map(p=>`${p.lng},${p.lat}`).join(';');
  try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);if(!r.ok)return null;const j=await r.json();return j.routes?.[0]||null;}catch{return null;}
}
function fullMapsLink(start,stops){
  if(!stops.length)return '#';const shown=stops.slice(0,9);const dest=shown[shown.length-1];const way=shown.slice(0,-1).map(x=>`${x.lat},${x.lng}`).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${start.lat},${start.lng}`)}&destination=${encodeURIComponent(`${dest.lat},${dest.lng}`)}${way?`&waypoints=${encodeURIComponent(way)}`:''}&travelmode=driving`;
}
function stopMapsLink(s){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.lat},${s.lng}`)}&travelmode=driving`;}

async function calculateTour(){
  currentPlan=null;$('#tour-save').disabled=true;$('#tour-print').disabled=true;
  const dep=$('#tour-dep').value,date=$('#tour-date').value,startTime=$('#tour-start-time').value,endTime=$('#tour-end-time').value;
  if(!dep){setStatus('Choisissez un département.','error');return;}if(!date){setStatus('Choisissez le jour de la tournée.','error');return;}
  const startSec=timeToSeconds(startTime),endSec=timeToSeconds(endTime);if(endSec<=startSec+VISIT_SECONDS){setStatus('L’heure de fin doit être postérieure à l’heure de début.','error');return;}
  const start=await getStartPoint();if(!start){setStatus('Indiquez une adresse de départ ou cliquez sur « Ma position ».','error');return;}
  const selectedIds=selectedClientIds();const autoMode=selectedIds.length===0;
  let pool=autoMode?filteredClients.slice(0,MAX_CANDIDATES):filteredClients.filter(c=>selectedIds.includes(c.id));
  if(!pool.length){setStatus('Aucun client disponible pour cette tournée.','error');return;}
  if(pool.length>MAX_CANDIDATES){setStatus(`Pour garantir un calcul rapide, sélectionnez au maximum ${MAX_CANDIDATES} clients par tournée.`,'error');return;}
  setStatus(`🧭 Localisation de ${pool.length} client(s) et préparation de la matrice routière…`);
  const located=(await mapLimit(pool,3,clientWithCoords)).filter(Boolean);const unresolved=pool.filter(c=>!located.some(x=>x.id===c.id));
  if(!located.length){setStatus('Impossible de localiser les clients sélectionnés. Vérifiez leurs adresses.','error');return;}
  const points=[start,...located];const road=await roadMatrix(points);const budget=endSec-startSec;const returnToStart=$('#tour-return').checked;
  const choice=chooseRoute(located,road.durations,budget,returnToStart,autoMode);if(!choice.route.length){setStatus('Aucune visite ne rentre dans le créneau choisi avec les temps de trajet calculés.','error');return;}
  const ordered=choice.route.map(idx=>located[idx-1]);
  let t=startSec,prev=0,drive=0,distance=0;const stops=[];
  choice.route.forEach((idx,i)=>{const travel=Math.round(road.durations[prev][idx]||0),dist=Math.round(road.distances?.[prev]?.[idx]||0);drive+=travel;distance+=dist;t+=travel;const arrival=t,departure=t+VISIT_SECONDS,tClient=located[idx-1];stops.push({order:i+1,clientId:tClient.id,societe:tClient.societe||'Sans nom',adresse:tClient.adresse||'',codePostal:tClient.codePostal||tClient.code_postal||'',ville:tClient.ville||'',contact:tClient.contact||'',telephone:tClient.telephone||'',lat:tClient.lat,lng:tClient.lng,arrival:clockFromSeconds(arrival),departure:clockFromSeconds(departure),travelSeconds:travel,distanceMeters:dist,priorityDays:daysSinceContact(tClient)});t=departure;prev=idx;});
  let returnSeconds=0,returnDistance=0;if(returnToStart&&choice.route.length){returnSeconds=Math.round(road.durations[prev][0]||0);returnDistance=Math.round(road.distances?.[prev]?.[0]||0);drive+=returnSeconds;distance+=returnDistance;t+=returnSeconds;}
  const partners=selectedPartners();
  currentPlan={date,departement:dep,startTime,endTime,startAddress:start.label||$('#tour-start-address').value,startLat:start.lat,startLng:start.lng,returnToStart,partners,visitMinutes:30,selectionMode:autoMode?'auto':'manual',stops,metrics:{driveSeconds:drive,visitSeconds:stops.length*VISIT_SECONDS,totalSeconds:t-startSec,distanceMeters:distance,returnSeconds,returnDistance},unresolvedClients:unresolved.map(c=>({id:c.id,societe:c.societe||'',adresse:clientAddress(c)})),routingSource:road.source,status:'planned'};
  const routePoints=[start,...stops];if(returnToStart)routePoints.push(start);currentPlan.geometry=await fetchRouteGeometry(routePoints);
  renderPlan(currentPlan,start);
  const omittedCount=choice.omitted.length+unresolved.length;setStatus(`✅ Tournée calculée : <strong>${stops.length} visite(s)</strong>, ${distanceText(distance)} et ${durationText(drive)} de conduite.${omittedCount?` <strong>${omittedCount}</strong> dossier(s) non retenu(s) faute de temps ou d’adresse exploitable.`:''}`, 'ok');
}
function ensureMap(){
  if(!window.L)return null;if(!map){map=L.map('tour-map',{zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);}if(mapLayer)mapLayer.remove();mapLayer=L.layerGroup().addTo(map);return map;
}
function renderMap(plan,start){
  const m=ensureMap();if(!m)return;const bounds=[];
  L.circleMarker([start.lat,start.lng],{radius:8,weight:3,color:'#111',fillColor:'#f3ad18',fillOpacity:1}).bindPopup('<b>Départ</b>').addTo(mapLayer);bounds.push([start.lat,start.lng]);
  plan.stops.forEach(s=>{L.circleMarker([s.lat,s.lng],{radius:10,weight:2,color:'#fff',fillColor:'#159c91',fillOpacity:1}).bindTooltip(String(s.order),{permanent:true,direction:'center',className:'tour-map-number'}).bindPopup(`<b>${esc(s.order+'. '+s.societe)}</b><br>${esc([s.codePostal,s.ville].filter(Boolean).join(' '))}<br>${esc(s.arrival)}–${esc(s.departure)}`).addTo(mapLayer);bounds.push([s.lat,s.lng]);});
  if(plan.geometry?.geometry){L.geoJSON(plan.geometry.geometry,{style:{weight:5,opacity:.75}}).addTo(mapLayer);}else if(bounds.length>1){L.polyline(bounds,{weight:4,opacity:.55,dashArray:'8 7'}).addTo(mapLayer);}
  if(bounds.length)m.fitBounds(bounds,{padding:[28,28]});setTimeout(()=>m.invalidateSize(),100);
}
function renderPlan(plan,startOverride=null){
  const start=startOverride||{lat:Number(plan.startLat),lng:Number(plan.startLng),label:plan.startAddress||'Départ'};
  const metrics=plan.metrics||{};$('#tour-result-sub').textContent=`${new Date(plan.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · Département ${plan.departement}`;
  const mapHref=fullMapsLink(start,plan.stops||[]);$('#tour-summary').innerHTML=`<span class="tour-pill">👥 ${plan.stops?.length||0} visites</span><span class="tour-pill">🚗 ${durationText(metrics.driveSeconds)}</span><span class="tour-pill">📏 ${distanceText(metrics.distanceMeters)}</span><span class="tour-pill">🕘 ${esc(plan.startTime)} → ${esc(clockFromSeconds(timeToSeconds(plan.startTime)+(metrics.totalSeconds||0)))}</span>${(plan.partners||[]).length?`<span class="tour-pill">🏭 ${esc(plan.partners.join(' · '))}</span>`:''}<a class="tour-btn secondary" style="min-height:30px;padding:0 9px;font-size:.72rem" target="_blank" rel="noopener" href="${mapHref}">🗺 Ouvrir dans Google Maps</a>`;
  $('#tour-route').innerHTML=(plan.stops||[]).length?plan.stops.map(s=>`<article class="route-stop"><div class="route-order">${s.order}</div><div><b>${esc(s.societe)}</b><small>${esc([s.adresse,s.codePostal,s.ville].filter(Boolean).join(', '))}<br>${s.contact?`👤 ${esc(s.contact)} `:''}${s.telephone?`· 📞 ${esc(s.telephone)}`:''}<br>🚗 depuis l’étape précédente : ${durationText(s.travelSeconds)} · ${distanceText(s.distanceMeters)}</small><div class="route-links"><a class="route-link" href="clients.html?edit=${encodeURIComponent(s.clientId)}">Ouvrir la fiche</a><a class="route-link" target="_blank" rel="noopener" href="${stopMapsLink(s)}">Y aller</a></div></div><div class="route-time"><strong>${esc(s.arrival)}</strong><span>arrivée</span><strong style="margin-top:4px">${esc(s.departure)}</strong><span>départ · visite 30 min</span></div></article>`).join(''):'<div class="tour-empty">Aucune étape.</div>';
  renderMap(plan,start);$('#tour-save').disabled=!!plan.id;$('#tour-print').disabled=false;
}
async function savePlan(){
  if(!currentPlan)return;const btn=$('#tour-save');btn.disabled=true;btn.textContent='Enregistrement…';
  try{const payload={...currentPlan};delete payload.geometry;const ref=await addDoc(collection(db,'tournees'),{...payload,createdAt:serverTimestamp(),createdBy:localStorage.getItem('agentName')||'Agent',createdByEmail:localStorage.getItem('agentEmail')||''});currentPlan.id=ref.id;setStatus(`💾 Tournée enregistrée. Elle apparaîtra dans le planning du ${new Date(currentPlan.date+'T12:00:00').toLocaleDateString('fr-FR')}.`,'ok');await loadSavedTours();}catch(e){console.error(e);setStatus('Erreur lors de l’enregistrement de la tournée dans le CRM.','error');btn.disabled=false;}finally{btn.textContent='💾 Enregistrer';}
}
async function loadSavedTours(){
  try{const snap=await getDocs(collection(db,'tournees'));const tours=[];snap.forEach(d=>tours.push({id:d.id,...d.data()}));tours.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||((b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)));$('#tour-saved-list').innerHTML=tours.slice(0,10).map(t=>`<div class="tour-saved-row"><div><b>${esc(t.date||'')} · Dép. ${esc(t.departement||'-')}</b><small>${t.stops?.length||0} visite(s) · ${esc((t.partners||[]).join(', ')||'Aucune usine indiquée')}</small></div><a class="tour-btn secondary" style="min-height:34px;padding:0 9px;font-size:.72rem" href="tournees.html?view=${encodeURIComponent(t.id)}">Ouvrir</a></div>`).join('')||'<div class="tour-empty">Aucune tournée enregistrée.</div>';}catch(e){console.error(e);$('#tour-saved-list').innerHTML='<div class="tour-empty">Impossible de charger les tournées enregistrées.</div>';}
}
async function loadSavedView(id){
  try{const s=await getDoc(doc(db,'tournees',id));if(!s.exists())return;const plan={id:s.id,...s.data()};currentPlan=plan;$('#tour-date').value=plan.date||localDateKey();$('#tour-dep').value=plan.departement||'';$('#tour-start-time').value=plan.startTime||'08:30';$('#tour-end-time').value=plan.endTime||'18:00';$('#tour-start-address').value=plan.startAddress||'';$('#tour-return').checked=!!plan.returnToStart;startPosition={lat:Number(plan.startLat),lng:Number(plan.startLng),label:plan.startAddress||'Départ'};document.querySelectorAll('#tour-partners input').forEach(x=>x.checked=(plan.partners||[]).includes(x.value));renderPlan(plan,startPosition);setStatus('Tournée enregistrée chargée.','ok');}catch(e){console.error(e);}
}
function updateClock(){const d=new Date();$('#current-date').textContent=d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});$('#current-time').textContent=d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
async function init(){
  if(!localStorage.getItem('agentLoggedIn')){location.href='agent.html?return=tournees.html';return;}
  initPartners();$('#tour-date').value=localDateKey();updateClock();setInterval(updateClock,30000);
  $('#tour-use-location').onclick=useLocation;$('#tour-dep').onchange=refreshFilteredClients;$('#tour-client-search').oninput=renderClientList;$('#tour-smart-select').onclick=smartSelect;$('#tour-clear-select').onclick=clearSelect;$('#tour-calculate').onclick=calculateTour;$('#tour-save').onclick=savePlan;$('#tour-print').onclick=()=>window.print();$('#tour-start-address').addEventListener('input',()=>{startPosition=null;});
  try{const snap=await getDocs(collection(db,'clients'));clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));renderDepartments();}catch(e){console.error(e);setStatus('Impossible de charger les clients CRM.','error');}
  await loadSavedTours();const view=new URLSearchParams(location.search).get('view');if(view)setTimeout(()=>loadSavedView(view),50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
