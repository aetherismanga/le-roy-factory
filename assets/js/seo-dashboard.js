import {auth,db,verifiedAgentProfile} from './firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,onSnapshot,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {SITE,TRACKING_START,isDate,normalizeDaily,mergeDaily,totals,selectedRows,comparePeriods,changePercent,chartSeries,territoryRows,audienceRows,dailyCSV,shiftDate} from './seo-dashboard-model.mjs?v=20261114-1';

const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const integer=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const decimal=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const percent=new Intl.NumberFormat('fr-FR',{style:'percent',maximumFractionDigits:1});
const date=value=>isDate(value)?new Date(value+'T12:00:00Z').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}):'—';
const label={impressions:'Affichages Google',clicks:'Clics Google',ctr:'Taux de clic',position:'Position moyenne'};
const reportRef=doc(db,'parametres','seoSearchConsole');
// Existing Google web client, already used by the CRM calendar. Only read access
// to Search Console is requested. No Google token is persisted or sent to CRM.
const CLIENT_ID='226219482076-kc5gofed3hr09qs62349mbdshlgk88u8.apps.googleusercontent.com';
const SCOPE='https://www.googleapis.com/auth/webmasters.readonly';
let user=null,profile=null,unsubscribe=null,googleToken=null,tokenExpiresAt=0,tokenClient=null,expiryTimer=null;
let report={daily:[],trackingStartedAt:TRACKING_START},metric='impressions',busy=false,audit=null,authTurn=0;

function status(message,error=false){$('seo-status').textContent=message;$('seo-status').classList.toggle('error',error);}
function value(v,key){return v==null?'—':key==='ctr'?percent.format(v):key==='position'?decimal.format(v):integer.format(v);}
function setBusy(active){busy=active;$('seo-connect').disabled=active||!profile;$('seo-save-settings').disabled=active||!profile;$('seo-period').disabled=active;}
function googleConnected(){return googleToken&&tokenExpiresAt>Date.now()+30000;}
function clearGoogle(){googleToken=null;tokenExpiresAt=0;clearTimeout(expiryTimer);if($('seo-connect'))$('seo-connect').textContent='Connecter Google · lecture seule';}
function table(headers,rows,empty='Aucune donnée disponible pour ce relevé.'){
 return rows.length?`<table class="seo-dash-table"><thead><tr>${headers.map((h,i)=>`<th${i?' class="number"':''}>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>`<td${i?' class="number"':''}>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`:`<div class="seo-dash-empty">${escape(empty)}</div>`;
}
function safePageLink(url){try{const u=new URL(url);if(u.protocol==='https:'&&['leroyfactory.fr','www.leroyfactory.fr'].includes(u.hostname))return `<a href="${escape(u.href)}" target="_blank" rel="noopener">${escape(decodeURIComponent(u.pathname+(u.search||''))||'/')}</a>`;}catch{}return escape(url);}
function normalizedBreakdown(rows,key){return (Array.isArray(rows)?rows:[]).map(row=>({...row,[key]:String(row[key]||row.keys?.[0]||'')}));}
function renderTables(){
 const b=report.breakdown||{};
 const queries=normalizedBreakdown(b.queries,'query'),pages=normalizedBreakdown(b.pages,'page'),devices=normalizedBreakdown(b.devices,'device');
 const filter=$('seo-query-filter').value.trim().toLocaleLowerCase('fr');
 const displayed=queries.filter(r=>!filter||r.query.toLocaleLowerCase('fr').includes(filter)).sort((a,b)=>b.clicks-a.clicks||b.impressions-a.impressions);
 $('seo-queries').innerHTML=table(['Recherche','Clics','Affichages','Position'],displayed.slice(0,100).map(r=>[escape(r.query),value(r.clicks,'clicks'),value(r.impressions,'impressions'),value(r.position,'position')]));
 $('seo-pages').innerHTML=table(['Page','Clics','Affichages','Position'],[...pages].sort((a,b)=>b.clicks-a.clicks||b.impressions-a.impressions).slice(0,40).map(r=>[safePageLink(r.page),value(r.clicks,'clicks'),value(r.impressions,'impressions'),value(r.position,'position')]));
 $('seo-territories').innerHTML=table(['Ville / secteur recherché','Clics','Affichages','Position'],territoryRows(queries).map(r=>[escape(r.name),r.queries?value(r.clicks,'clicks'):'Sans donnée',r.queries?value(r.impressions,'impressions'):'—',r.queries?value(r.position,'position'):'—']));
 $('seo-audiences').innerHTML=table(['Page destinée aux…','Clics','Affichages','Position'],audienceRows(pages).map(r=>[escape(r.name),r.hasData?value(r.clicks,'clicks'):'Sans donnée',r.hasData?value(r.impressions,'impressions'):'—',r.hasData?value(r.position,'position'):'—']));
 const deviceLabels={DESKTOP:'Ordinateurs',MOBILE:'Smartphones',TABLET:'Tablettes'};
 $('seo-devices').innerHTML=table(['Appareil','Clics','Affichages','Taux de clic'],devices.map(r=>[escape(deviceLabels[r.device]||r.device),value(r.clicks,'clicks'),value(r.impressions,'impressions'),value(r.ctr,'ctr')]));
 $('seo-breakdown-period').textContent=isDate(b.startDate)&&isDate(b.endDate)?`Relevé détaillé des tableaux : du ${date(b.startDate)} au ${date(b.endDate)}. Actualisez Google pour obtenir les tableaux sur la période choisie. ${b.limited?'Affichage limité aux principales lignes retournées par Google.':''}`:'Les tableaux détaillés seront disponibles après un relevé Google.';
}
function renderChart(rows){
 const series=chartSeries(rows,metric),known=series.filter(p=>p.value!=null);
 if(!known.length){$('seo-chart').innerHTML='<div class="seo-dash-empty">Aucun point disponible sur cette période. Connectez Google pour charger l’historique.</div>';return;}
 const W=1040,H=300,L=64,R=20,T=24,B=48,width=W-L-R,height=H-T-B;
 const minimum=metric==='position'?Math.min(...known.map(p=>p.value)):0;
 const maximum=metric==='position'?Math.max(minimum+1,...known.map(p=>p.value)):Math.max(metric==='ctr'?.01:1,...known.map(p=>p.value))*1.1;
 const x=i=>L+(series.length===1?width/2:i/(series.length-1)*width);
 const y=v=>metric==='position'?T+(v-minimum)/(maximum-minimum)*height:T+height-(v-minimum)/(maximum-minimum)*height;
 let path='',gap=true;
 series.forEach((point,i)=>{if(point.value==null){gap=true;return;}path+=`${gap?'M':'L'}${x(i).toFixed(2)},${y(point.value).toFixed(2)} `;gap=false;});
 const grid=Array.from({length:5},(_,i)=>{const v=minimum+(maximum-minimum)*i/4;return `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#e7e3d8"/><text x="${L-12}" y="${y(v)+4}" text-anchor="end">${escape(value(v,metric))}</text>`;}).join('');
 const ticks=[...new Set([0,Math.floor((series.length-1)/2),series.length-1])].map(i=>`<text x="${x(i)}" y="${H-12}" text-anchor="middle">${escape(date(series[i].date))}</text>`).join('');
 const dots=series.map((p,i)=>p.value==null?'':`<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="#314b41" stroke="#fffdf9" stroke-width="2" tabindex="0" data-date="${p.date}" data-value="${p.value}" aria-label="${escape(date(p.date)+', '+label[metric]+' : '+value(p.value,metric))}"><title>${escape(date(p.date)+' · '+value(p.value,metric))}</title></circle>`).join('');
 $('seo-chart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="seo-chart-title seo-chart-description"><title id="seo-chart-title">${escape(label[metric])}</title><desc id="seo-chart-description">Évolution du ${escape(date(series[0].date))} au ${escape(date(series.at(-1).date))}. Les journées absentes restent des interruptions de courbe. Les valeurs sont disponibles dans le tableau jour par jour.</desc>${grid}<path d="${path}" fill="none" stroke="#314b41" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dots}${ticks}</svg>`;
 $('seo-chart-detail').textContent=metric==='position'?'Position moyenne : plus le nombre est bas, mieux la page est placée. Touchez un point pour lire une journée.':'Touchez ou parcourez les points de la courbe pour voir une journée.';
}
function render(){
 const daily=normalizeDaily(report.daily),rows=selectedRows(daily,$('seo-period').value,report.trackingStartedAt||TRACKING_START),sum=totals(rows),previous=comparePeriods(daily,rows);
 $('seo-tracking-start').value=report.trackingStartedAt||TRACKING_START;
 $('seo-kpis').innerHTML=['impressions','clicks','ctr','position'].map(key=>{
   const delta=previous&&['impressions','clicks'].includes(key)?changePercent(sum[key],previous[key]):null;
   const note=key==='position'?'Plus le nombre est bas, mieux c’est.':key==='ctr'?'Clics divisés par affichages.':delta==null?'Comparaison complète indisponible.':`${delta>=0?'+':''}${percent.format(delta)} face à la période précédente complète.`;
   return `<article class="seo-dash-kpi"><span>${label[key]}</span><strong>${rows.length?value(sum[key],key):'—'}</strong><small${delta>0?' class="positive"':''}>${escape(note)}</small></article>`;
 }).join('');
 $('seo-coverage').textContent=daily.length?`Historique disponible : ${date(daily[0].date)} → ${date(daily.at(-1).date)}`:'Aucun historique chargé.';
 $('seo-chart-period').textContent=rows.length?`Du ${date(rows[0].date)} au ${date(rows.at(-1).date)} · ${rows.length} journées avec données.`:'La courbe apparaîtra après le premier relevé.';
 renderChart(rows);renderTables();
 $('seo-daily').innerHTML=table(['Date','Clics','Affichages','Taux de clic','Position'],rows.map(r=>[escape(date(r.date)),value(r.clicks,'clicks'),value(r.impressions,'impressions'),value(r.ctr,'ctr'),value(r.position,'position')]));
 $('seo-export').disabled=!rows.length;$('seo-print').disabled=!rows.length;
 const stamp=report.updatedAtIso?new Date(report.updatedAtIso):null;
 $('seo-source').textContent=stamp&&Number.isFinite(stamp.getTime())?`Source : Google Search Console · Relevé enregistré le ${stamp.toLocaleString('fr-FR',{timeZone:'Europe/Paris'})}. Les dates journalières suivent le calendrier utilisé par Google Search Console.`:'Source prévue : Google Search Console. Aucun résultat estimé n’est affiché.';
 const sitemap=(report.sitemaps||[]).find(r=>String(r.path||'').endsWith('/sitemap.xml'));
 $('seo-google-sitemap').textContent=sitemap?`Dernier relevé Google du sitemap : ${Number(sitemap.errors||0)} erreur(s) signalée(s), dernière lecture ${date(String(sitemap.lastDownloaded||sitemap.last_downloaded||'').slice(0,10))}. Les corrections du site peuvent précéder la prochaine lecture par Google.`:'Le prochain relevé Google complétera l’état de lecture du sitemap. Le nombre de pages déclaré ne représente pas le nombre de pages indexées.';
}
async function renderAudit(){
 try{const r=await fetch('assets/data/seo-technical-status.json?v=20261114-1',{cache:'no-cache'});if(!r.ok)throw Error();audit=await r.json();
 $('seo-audit').innerHTML=[['Pages déclarées',audit.sitemapPages,'Pages publiques proposées à Google dans le sitemap.'],['Adresses d’images',audit.relativeImageUrls,'Adresse relative restante dans le sitemap contrôlé.'],['Guides ajoutés',audit.newEditorialPages,'Territoires, publics et fabricants avec des contenus dédiés.']].map(([t,n,d])=>`<article><span class="seo-dash-note">${escape(t)}</span><strong>${escape(n??'—')}</strong><p>${escape(d)}</p></article>`).join('');
 $('seo-timeline').innerHTML=(audit.actions||[]).map(a=>`<li><time datetime="${escape(a.date)}">${escape(date(a.date))}</time><strong>${escape(a.title)}</strong><br>${escape(a.detail)}</li>`).join('');
 }catch{$('seo-audit').innerHTML='<p class="seo-dash-note">Le journal technique est momentanément indisponible.</p>';}
}
async function googleRequest(path,body){
 if(!googleConnected())throw Error('La connexion Google a expiré. Reconnectez Google pour actualiser.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{const r=await fetch('https://www.googleapis.com/webmasters/v3/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+googleToken,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
  const data=await r.json();
  if(!r.ok){if(r.status===401)clearGoogle();const reason=data.error?.errors?.[0]?.reason;if(reason==='accessNotConfigured'||data.error?.status==='SERVICE_DISABLED')throw Error('La lecture Search Console doit être activée pour la connexion Google du site. Le relevé enregistré reste disponible.');if(r.status===403)throw Error('Ce compte Google ne permet pas de lire leroyfactory.fr dans Search Console. Choisissez le compte propriétaire ou un compte autorisé.');throw Error(data.error?.message||'Lecture Google indisponible. Réessayez ultérieurement.');}
  return data;
 }finally{clearTimeout(timer);}
}
const queryGoogle=(dimensions,startDate,endDate,rowLimit=25000)=>googleRequest('sites/'+encodeURIComponent(SITE)+'/searchAnalytics/query',{startDate,endDate,dimensions,type:'web',dataState:'final',aggregationType:'auto',rowLimit});
async function syncGoogle(){
 if(!profile||busy)return;setBusy(true);status('Lecture de l’historique Google et des résultats de recherche…');
 const ownUid=user.uid;
 try{
  const nowParis=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'}),endDate=shiftDate(nowParis,-2);
  // Backfill the available Google history. Google retains about 16 months;
  // existing older rows remain in the CRM and are never replaced by zeroes.
  const retentionStart=shiftDate(nowParis,-480);
  const rawDaily=await queryGoogle(['date'],retentionStart,endDate);
  const fresh=normalizeDaily(rawDaily.rows||[]);
  if(!fresh.length)throw Error('Google n’a retourné aucune journée. Le relevé déjà enregistré est conservé.');
  const daily=mergeDaily(report.daily,fresh),chosen=selectedRows(daily,$('seo-period').value,report.trackingStartedAt||TRACKING_START);
  const start=chosen[0]?.date||fresh[0].date,end=chosen.at(-1)?.date||fresh.at(-1).date;
  const [queries,pages,devices,sitemaps]=await Promise.all([
   queryGoogle(['query'],start,end,500),queryGoogle(['page'],start,end,500),queryGoogle(['device'],start,end,100),
   googleRequest('sites/'+encodeURIComponent(SITE)+'/sitemaps').catch(()=>({sitemap:[]}))
  ]);
  if(!user||user.uid!==ownUid||!profile)return;
  const map=(rows,key)=>(rows||[]).map(r=>({[key]:String(r.keys?.[0]||''),clicks:Number(r.clicks||0),impressions:Number(r.impressions||0),ctr:Number(r.ctr||0),position:Number(r.position||0)}));
  const next={schema:1,site:SITE,trackingStartedAt:report.trackingStartedAt||TRACKING_START,daily,breakdown:{startDate:start,endDate:end,queries:map(queries.rows,'query'),pages:map(pages.rows,'page'),devices:map(devices.rows,'device'),limited:(queries.rows?.length>=500||pages.rows?.length>=500)},sitemaps:(sitemaps.sitemap||[]).map(s=>({path:s.path||'',lastSubmitted:s.lastSubmitted||'',lastDownloaded:s.lastDownloaded||'',errors:Number(s.errors||0),warnings:Number(s.warnings||0)})),updatedAtIso:new Date().toISOString(),source:'Google Search Console API · web · final',updatedByUid:ownUid};
  await setDoc(reportRef,{...next,updatedAt:serverTimestamp()},{merge:true});report=next;render();
  status('Relevé Google actualisé et enregistré dans votre espace agent.');$('seo-connect').textContent='Actualiser les résultats Google';
 }catch(error){status(error.name==='AbortError'?'La lecture Google a pris trop de temps. Le relevé précédent est conservé.':error.message,true);}
 finally{setBusy(false);}
}
function connectGoogle(){
 if(!profile||busy)return;
 if(googleConnected()){syncGoogle();return;}
 if(!window.google?.accounts?.oauth2){status('La connexion Google est encore en cours de chargement. Réessayez dans quelques instants.',true);return;}
 if(!tokenClient)tokenClient=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,include_granted_scopes:false,callback:response=>{
  if(response.error||!response.access_token){status('Connexion Google non terminée. Votre relevé enregistré reste disponible.',true);setBusy(false);return;}
  if(!window.google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE)){status('La lecture de Search Console n’a pas été autorisée. Le relevé enregistré est conservé.',true);setBusy(false);return;}
  googleToken=response.access_token;tokenExpiresAt=Date.now()+Number(response.expires_in||3600)*1000;clearTimeout(expiryTimer);expiryTimer=setTimeout(clearGoogle,Math.max(1000,tokenExpiresAt-Date.now()));setBusy(false);syncGoogle();
 },error_callback:()=>{setBusy(false);status('La fenêtre Google a été fermée ou bloquée. Appuyez de nouveau sur Connecter Google.',true);}});
 setBusy(true);status('Choisissez le compte Google qui dispose de Search Console pour leroyfactory.fr.');tokenClient.requestAccessToken({prompt:'select_account'});
}
$('seo-connect').addEventListener('click',connectGoogle);
$('seo-period').addEventListener('change',()=>{render();if(googleConnected())syncGoogle();});
$('seo-query-filter').addEventListener('input',renderTables);
document.querySelectorAll('[data-metric]').forEach(button=>button.addEventListener('click',()=>{metric=button.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderChart(selectedRows(report.daily,$('seo-period').value,report.trackingStartedAt||TRACKING_START));}));
function chartPoint(event){const point=event.target.closest('circle[data-date]');if(point)$('seo-chart-detail').textContent=`${date(point.dataset.date)} · ${label[metric]} : ${value(Number(point.dataset.value),metric)}`;}
$('seo-chart').addEventListener('pointerover',chartPoint);$('seo-chart').addEventListener('focusin',chartPoint);$('seo-chart').addEventListener('click',chartPoint);
$('seo-export').addEventListener('click',()=>{const rows=selectedRows(report.daily,$('seo-period').value,report.trackingStartedAt||TRACKING_START);if(!rows.length)return;const url=URL.createObjectURL(new Blob([dailyCSV(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`LRF-referencement-${rows[0].date}-${rows.at(-1).date}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('seo-print').addEventListener('click',()=>window.print());
$('seo-save-settings').addEventListener('click',async()=>{const trackingStartedAt=$('seo-tracking-start').value;if(!profile||busy)return;if(!isDate(trackingStartedAt)){status('Choisissez une date de début valide.',true);return;}try{setBusy(true);await setDoc(reportRef,{trackingStartedAt,updatedAt:serverTimestamp(),updatedByUid:user.uid},{merge:true});report.trackingStartedAt=trackingStartedAt;render();status('Date de début du suivi enregistrée.');}catch{status('La date n’a pas pu être enregistrée. Vérifiez votre connexion agent.',true);}finally{setBusy(false);}});
onAuthStateChanged(auth,async next=>{
 const turn=++authTurn;unsubscribe?.();unsubscribe=null;clearGoogle();user=next;profile=null;$('seo-content').hidden=true;setBusy(false);
 const verified=await verifiedAgentProfile(next);if(turn!==authTurn)return;
 if(!verified){status('Connectez-vous avec votre compte agent pour consulter le suivi.');return;}
 profile=verified;setBusy(false);$('seo-content').hidden=false;render();renderAudit();
 unsubscribe=onSnapshot(reportRef,snapshot=>{
  if(snapshot.exists()){report={trackingStartedAt:TRACKING_START,...snapshot.data()};report.daily=normalizeDaily(report.daily);render();if(!busy)status('Historique Google enregistré · '+(report.daily.length?'dernière journée disponible : '+date(report.daily.at(-1).date):'connexion Google à actualiser')+'.');}
  else{report={daily:[],trackingStartedAt:TRACKING_START};render();status('Votre suivi est prêt. Connectez Google pour charger les chiffres réels ; les relevés suivants seront conservés ici.');}
 },error=>{status('Le relevé partagé ne peut pas être chargé : '+(error.code==='permission-denied'?'vérifiez votre session agent.':'vérifiez votre connexion Internet.'),true);});
});
window.addEventListener('pagehide',()=>{clearGoogle();unsubscribe?.();});
