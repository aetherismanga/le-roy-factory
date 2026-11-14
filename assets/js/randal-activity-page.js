import {auth,db,verifiedAgentProfile} from './firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {collection,query,where,orderBy,limit,getDocs,Timestamp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {buildRandalReport,sourceLabel,eventLabel,fieldLabel,duration,millis,viewLabel} from './randal-activity-model.mjs?v=20261108-activity1';
import {loadRandalActivity,fetchRandalLegacy} from './randal-activity-loader.mjs?v=20261114-load1';
const $=id=>document.getElementById(id),allowed=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=ms=>ms?new Date(ms).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'}):'Aucune activité relevée';
let data={sessions:[],events:[],legacy:[]},failures=[],user=null,agent=null,turn=0,loading=false,lastLoaded=0,lastPeriod='',reloadPending=false;
function render(){const report=buildRandalReport({...data,source:$('source').value});
 const sessionsAvailable=!failures.some(f=>f.key==='sessions');
 $('kpis').innerHTML=[['Dernière activité',report.lastSeen?date(report.lastSeen):failures.length?'Indisponible':date(0)],['Sessions mesurées',sessionsAvailable?report.visits.length:'—'],['Temps actif cumulé',sessionsAvailable?duration(report.activeMs):'—'],['Présence récente',sessionsAvailable?(report.online?'Détectée':'Aucune'):'Indisponible']].map(([label,value])=>`<div class="kpi"><span>${label}</span><strong>${esc(value)}</strong></div>`).join('');
 $('sources').innerHTML=report.sources.map(s=>`<div class="source"><strong>${esc(s.label)}</strong><span>${sessionsAvailable?s.visits+' session(s) · '+duration(s.activeMs)+' actif':'Sessions indisponibles'}</span></div>`).join('');
 $('sessions').innerHTML=report.visits.length?report.visits.map(v=>`<details><summary><strong>${esc(sourceLabel(v.source))}</strong>${v.online?'<span class="live">Présence récente</span>':''}<small>${date(v.start)} → ${date(v.end)}<br>Actif : ${duration(v.activeMs)} · Présence : ${duration(v.foregroundMs)} · ${v.pages.length} page(s)</small></summary><div class="pages"><table><thead><tr><th>Page / vue</th><th>Début</th><th>Actif</th><th>Présence</th></tr></thead><tbody>${v.pages.map(p=>`<tr><td>${esc(p.page)}${p.view?' · '+esc(viewLabel(p.view)):''}<br>${esc(p.device==='mobile'?'Smartphone':p.device==='tablet'?'Tablette':p.device==='desktop'?'Ordinateur':'Appareil inconnu')}</td><td>${date(millis(p.startedAt)||p.startedMs)}</td><td>${duration(p.activeMs)}</td><td>${duration(p.foregroundMs)}</td></tr>`).join('')}</tbody></table></div></details>`).join(''):'<div class="empty">Aucune session mesurée sur cette période. Les durées seront disponibles lors des prochaines visites du compte RANDAL connecté.</div>';
 $('events').innerHTML=report.timeline.length?report.timeline.slice(0,1000).map(e=>`<article class="event"><time>${date(e.at)}</time><div><strong>${esc(eventLabel(e.event))} · ${esc(sourceLabel(e.source))}</strong><p>${esc(e.title||e.page||'')}${e.view?' · '+esc(viewLabel(e.view)):''}</p>${e.field?`<p>${esc(fieldLabel(e.field))} : ${esc(e.value)}</p>`:''}${e.legacy?'<p>Historique antérieur · durée non mesurée</p>':''}</div></article>`).join(''):'<div class="empty">Aucune activité enregistrée pour ces filtres.</div>';
 $('updated').textContent='Dernier relevé : '+date(lastLoaded);
 if(!sessionsAvailable)$('sessions').innerHTML='<div class="empty">Les sessions mesurées sont momentanément indisponibles. Utilisez Actualiser pour réessayer.</div>';
 if(!report.timeline.length&&failures.some(f=>f.key==='events'||f.key==='legacy'))$('events').innerHTML='<div class="empty">La chronologie n’a pas pu être chargée entièrement. Utilisez Actualiser pour réessayer.</div>';
}
async function load(){if(!agent)return;if(loading){reloadPending=true;return;}loading=true;const current=++turn,requestUser=user;$('refresh').disabled=true;$('status').textContent='Chargement de l’activité RANDAL…';$('reconnect').hidden=true;
 try{
  const period=$('period').value,until=Date.now(),since=until-Number(period)*86400000;
  const read=async(name,field,cap)=>{const snap=await getDocs(query(collection(db,name),where(field,'>=',Timestamp.fromMillis(since)),orderBy(field,'desc'),limit(cap)));return {rows:snap.docs.map(doc=>({id:doc.id,...doc.data()})),incomplete:snap.size>=cap};};
  const result=await loadRandalActivity({
   readSessions:()=>read('lrf_randal_sessions','updatedAt',4000),
   readEvents:()=>read('lrf_randal_activity_events','createdAt',4000),
   readLegacy:async()=>{const clients=await getDocs(query(collection(db,'clients'),where('codeClient','==','LRF-00321')));return fetchRandalLegacy({clientIds:clients.docs.map(doc=>doc.id),user:requestUser,since,until});}
  });
  if(current!==turn||!agent||reloadPending)return;
  const labels={sessions:'sessions mesurées',events:'événements des configurateurs',legacy:'historique du site'};
  if(result.failures.length===3){
   const denied=result.failures.some(f=>/permission-denied|unauthenticated/.test(f.code));
   $('status').textContent=(denied?'Accès aux relevés refusé. Reconnectez-vous au CRM puis réessayez.':'Le suivi est momentanément indisponible. Vérifiez votre connexion internet puis utilisez Actualiser.')+(lastLoaded?' Les derniers résultats chargés restent affichés.':'');
   if(lastLoaded)$('period').value=lastPeriod;
   $('reconnect').hidden=!denied;return;
  }
  data=result.data;failures=result.failures;lastLoaded=Date.now();lastPeriod=period;$('content').hidden=false;
  $('coverage').hidden=!result.incomplete;$('coverage').textContent='La limite de lecture est atteinte : l’historique peut être partiel. Choisissez une période plus courte.';
  render();
  $('status').textContent=failures.length?'Suivi partiel : '+failures.map(f=>labels[f.key]).join(', ')+' indisponible(s). Les autres relevés sont affichés. Utilisez Actualiser pour réessayer.':'Suivi réservé aux administrateurs LRF. Les nouvelles visites apparaissent après actualisation.';
 }catch(error){if(current===turn)$('status').textContent='Le suivi est momentanément indisponible. Utilisez Actualiser pour réessayer.';}
 finally{loading=false;$('refresh').disabled=!agent;if(reloadPending){reloadPending=false;void load();}}}
$('refresh').onclick=load;$('period').onchange=load;$('source').onchange=render;
for(const tab of document.querySelectorAll('[data-tab]'))tab.onclick=()=>{for(const other of document.querySelectorAll('[data-tab]'))other.setAttribute('aria-pressed',String(other===tab));$('sessions-panel').hidden=tab.dataset.tab!=='sessions';$('events-panel').hidden=tab.dataset.tab!=='events';};
onAuthStateChanged(auth,async next=>{const current=++turn;user=next;agent=null;data={sessions:[],events:[],legacy:[]};failures=[];lastLoaded=0;lastPeriod='';$('content').hidden=true;$('refresh').disabled=true;$('reconnect').hidden=true;
 const profile=allowed.has(next?.email?.toLowerCase())?await verifiedAgentProfile(next):null;
 if(current!==turn)return;agent=profile;
 if(!agent){$('status').textContent='Connectez-vous au CRM avec votre compte administrateur Jérôme ou Coryne pour consulter cette activité.';$('reconnect').hidden=false;return;}void load();});
