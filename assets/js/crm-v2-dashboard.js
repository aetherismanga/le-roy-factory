import { db, waitForAgent } from './firebase.js?v=20261023-crm-audit1';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const clean = value => String(value ?? '').trim();
const norm = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const esc = value => clean(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link = id => `clients.html?edit=${encodeURIComponent(id)}`;
const active = client => !client.archived && !client.archive;
const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function parseDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value === 'object' && Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
  const match = String(value).match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
  const date = match ? new Date(+match[3] < 100 ? +match[3]+2000 : +match[3], +match[2]-1, +match[1]) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function reports(client) { return Array.isArray(client.comptes_rendus) ? client.comptes_rendus : Array.isArray(client.comptesRendus) ? client.comptesRendus : []; }
function lastContact(client) {
  return [client.moovagoDernierSuivi, client.dernierEchange, client.lastContact,
    ...reports(client).map(row => row.date || row.dateCreation), ...(client.historiqueMails || []).map(row => row.date)]
    .map(parseDate).filter(Boolean).sort((a,b) => b-a)[0] || null;
}
function age(client) { const last = lastContact(client); return last ? Math.max(0,Math.floor((Date.now()-last.getTime())/86400000)) : null; }
let model = { clients: [], tours: [], events: [], requests: [] };
let failed = new Set();
let loading = false;
const sourceNames = {clients:'le portefeuille',tournees:'les tournées',agenda_events:'l’agenda',account_requests:'les demandes'};
async function read(name) {
  try {
    const snapshot = await getDocs(collection(db,name));
    const rows = []; snapshot.forEach(doc => rows.push({...doc.data(),id:doc.id}));
    return rows;
  } catch (error) { failed.add(name); console.warn(`[CRM accueil] ${name} indisponible`,error); return []; }
}
function setCount(id,value,available=true) { if ($(id)) $(id).textContent = available ? String(value) : '—'; }
function row(title,meta,href,tag='') {
  return `<a class="v2-dash-row" href="${href}"><span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span>${tag?`<span class="v2-dash-tag">${esc(tag)}</span>`:'<span class="v2-dash-chevron" aria-hidden="true">›</span>'}</a>`;
}
function empty(text) { return `<p class="v2-dash-empty">${esc(text)}</p>`; }
function tourDays(tour) { return Array.isArray(tour.days) && tour.days.length ? tour.days : tour.date ? [{date:tour.date,stops:tour.stops||[]}] : []; }
function render() {
  const clients = model.clients.filter(active), today = localDay();
  const followups = clients.filter(client => age(client) !== null && age(client)>60).sort((a,b)=>age(b)-age(a));
  const todayEvents = model.events.filter(event => {const d=parseDate(event.start);return d&&localDay(d)===today;}).sort((a,b)=>parseDate(a.start)-parseDate(b.start));
  const upcomingTours = model.tours.flatMap(tour => tourDays(tour).map(day => ({tour,day}))).filter(({day})=>day.date>=today).sort((a,b)=>String(a.day.date).localeCompare(String(b.day.date))||String(a.tour.startTime||'').localeCompare(String(b.tour.startTime||'')));
  const activities = clients.flatMap(client => [
    ...reports(client).map(report=>({client,title:report.type||'Compte-rendu',date:parseDate(report.date||report.dateCreation),body:report.resume||report.commentaire||report.contenu||report.notes||''})),
    ...(client.historiqueMails||[]).map(mail=>({client,title:'Communication',date:parseDate(mail.date),body:mail.objet||mail.subject||''}))
  ]).filter(row=>row.date).sort((a,b)=>b.date-a.date);
  const pending = clients.flatMap(client=>reports(client).filter(report=>['brouillon','draft','en attente','pending','a finaliser'].includes(norm(report.statut||report.status))).map(report=>({client,report})));
  setCount('v2-count-clients',clients.filter(c=>norm(c.type)==='client').length,!failed.has('clients'));
  setCount('v2-count-prospects',clients.filter(c=>norm(c.type)==='prospect').length,!failed.has('clients'));
  setCount('v2-count-events',todayEvents.length,!failed.has('agenda_events'));
  setCount('v2-count-tours',model.tours.length,!failed.has('tournees'));
  setCount('v2-count-followups',followups.length,!failed.has('clients'));
  setCount('v2-count-activities',activities.filter(a=>Date.now()-a.date.getTime()<=30*86400000 && a.date<=new Date()).length,!failed.has('clients'));
  $('v2-today').innerHTML = failed.has('agenda_events') ? empty('Agenda indisponible. Réessayez pour afficher les rendez-vous.') : todayEvents.slice(0,5).map(event=>row(event.title||'Rendez-vous',event.description||event.ownerName||'Agenda partagé','agenda.html',parseDate(event.start).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))).join('') || empty('Votre journée est libre pour le moment. Ajoutez un rendez-vous dans l’agenda.');
  const next=upcomingTours[0];
  $('v2-next-tour').innerHTML = failed.has('tournees') ? empty('Tournées indisponibles pour le moment.') : next ? row(next.tour.name||next.tour.nom||`Tournée ${next.tour.departement||''}`,`${parseDate(next.day.date+'T12:00:00')?.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})||next.day.date} · ${(next.day.stops||[]).length} visite(s)`,`tournees.html?view=${encodeURIComponent(next.tour.id)}`)+`<div class="v2-tour-stops">${(next.day.stops||[]).slice(0,3).map(stop=>`<span>${esc(stop.societe||stop.name||'Visite')} ${esc(stop.arrival||'')}</span>`).join('')}</div>` : empty('Aucune tournée à venir. Préparez votre prochaine visite terrain.');
  $('v2-followups').innerHTML = failed.has('clients') ? empty('Portefeuille indisponible pour le moment.') : followups.slice(0,4).map(client=>row(client.societe||'Client',client.ville||client.codeClient||'',link(client.id),`${age(client)} j`)).join('') || empty('Aucun client avec un dernier contact connu datant de plus de 60 jours.');
  $('v2-pending-reports').innerHTML = failed.has('clients') ? empty('Comptes-rendus indisponibles pour le moment.') : pending.slice(0,4).map(({client,report})=>row(client.societe||'Client',report.type||'Compte-rendu à finaliser',`comptes-rendus.html?client=${encodeURIComponent(client.id)}`,'Brouillon')).join('') || empty('Aucun compte-rendu explicitement marqué « en attente » ou « brouillon ».');
  $('v2-activity').innerHTML = failed.has('clients') ? empty('Historique indisponible pour le moment.') : activities.slice(0,5).map(item=>row(item.client.societe||'Client',`${item.title}${item.body?' · '+clean(item.body).slice(0,80):''}`,link(item.client.id),item.date.toLocaleDateString('fr-FR',{day:'numeric',month:'short'}))).join('') || empty('Les prochaines visites et communications apparaîtront ici.');
  const status=$('v2-data-status');
  status.hidden=!failed.size;
  status.textContent=failed.size?`Impossible de charger ${[...failed].map(name=>sourceNames[name]).join(', ')}. Les chiffres indisponibles sont indiqués par —. Réessayez avec le bouton Actualiser.`:'';
  $('v2-dashboard-loading').hidden=true;
  search();
}
let partners = {};
async function loadPartners() {
  try { const module=await import('./partner-contacts.js?v=20260903-search&media=20261018'); partners=module.PARTNER_CONTACTS||{}; } catch { /* Le portefeuille reste recherchable si l’annuaire est indisponible. */ }
}
function search() {
  const input=$('crm-global-search'), box=$('crm-global-results'); if(!input||!box)return;
  const query=norm(input.value); if(query.length<2){box.hidden=true;box.innerHTML='';input.setAttribute('aria-expanded','false');return;}
  const terms=query.split(/\s+/).filter(Boolean), hits=[];
  const add=(title,meta,href,kind,hay)=>{if(terms.every(term=>norm(hay).includes(term)))hits.push({title,meta,href,kind});};
  model.clients.filter(active).forEach(client=>{
    add(client.societe||'Sans nom',[client.codeClient,client.ville,client.contact].filter(Boolean).join(' · '),link(client.id),norm(client.type)==='prospect'?'Prospect':'Client',JSON.stringify(client));
    reports(client).forEach(report=>add(client.societe||'Compte-rendu',clean(report.resume||report.commentaire||report.contenu||report.notes||report.type).slice(0,120),`comptes-rendus.html?client=${encodeURIComponent(client.id)}`,'Compte-rendu',JSON.stringify(report)));
  });
  Object.entries(partners).forEach(([name,value])=>{
    add(name,'Annuaire partenaire','contacts-partenaires.html','Partenaire',name+' '+JSON.stringify(value));
    (value.contacts||[]).forEach(contact=>add(contact.name||name,[name,contact.role,contact.email].filter(Boolean).join(' · '),'contacts-partenaires.html','Contact',name+' '+JSON.stringify(contact)));
  });
  model.requests.forEach(request=>add(request.societe||'Demande client',request.ville||request.requestType||'','demandes-clients.html','Demande',JSON.stringify(request)));
  box.innerHTML=hits.slice(0,12).map(hit=>row(hit.title,hit.meta,hit.href,hit.kind)).join('')||empty('Aucun résultat. Essayez un nom, un code LRF ou un contact.');
  box.hidden=false;input.setAttribute('aria-expanded','true');
}
async function refresh(){
  if(loading)return; loading=true;failed=new Set();$('v2-refresh').disabled=true;$('v2-dashboard-loading').hidden=false;
  try{const [clients,tours,events,requests]=await Promise.all(['clients','tournees','agenda_events','account_requests'].map(read));model={clients,tours,events,requests};render();}
  finally{loading=false;$('v2-refresh').disabled=false;}
}
function showAgent(profile){
  const first=clean(profile?.name||profile?.displayName).split(/\s+/)[0];
  $('welcome-title').textContent=first?`Bonjour ${first}`:'Bonjour';
  $('v2-profile-name').textContent=clean(profile?.name||profile?.displayName)||'Mon profil';
  $('v2-profile-initials').textContent=clean(profile?.name||profile?.displayName).split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('')||'LRF';
}
function updateTime(){
  const now=new Date();$('current-date').textContent=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  $('digital-clock').textContent=now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}
async function init(){
  const profile=await waitForAgent();if(!profile)return;showAgent(profile);updateTime();
  const clock=setInterval(updateTime,30000);window.addEventListener('pagehide',()=>clearInterval(clock),{once:true});
  window.addEventListener('lrf-agent-auth-ready',event=>showAgent(event.detail));
  $('v2-refresh').addEventListener('click',refresh);
  $('crm-global-search').addEventListener('input',search);
  $('crm-global-search').addEventListener('keydown',event=>{if(event.key==='Escape'){$('crm-global-results').hidden=true;event.currentTarget.setAttribute('aria-expanded','false');}if(event.key==='ArrowDown'){$('crm-global-results').querySelector('a')?.focus();event.preventDefault();}});
  document.addEventListener('click',event=>{if(!event.target.closest('.v2-search')){$('crm-global-results').hidden=true;$('crm-global-search').setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('crm-global-search').focus();}if(event.key==='Escape'&&event.target.closest?.('.v2-search')){$('crm-global-results').hidden=true;$('crm-global-search').setAttribute('aria-expanded','false');$('crm-global-search').focus();}});
  await Promise.all([refresh(),loadPartners()]);search();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
