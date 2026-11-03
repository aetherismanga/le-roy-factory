import './analyse-clients-ca.js?v=20261103-reports2';
import { auth, getAgentProfile } from './firebase.js';
import { interestFor, nextActionFor, summaryFor, followScore, selectClients } from './analyse-client-report-model.mjs';
import { loadClientHistory } from './analyse-client-history.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const ENDPOINT = 'https://us-central1-le-roy-factory.cloudfunctions.net/getLrfAnalytics';
const ALLOWED = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
let data = null;
let loading = false;
let reloadPending = false;
let pendingPreserveFilters = true;
let detailClientId = '';
let detailTrigger = null;
let historyRequest = 0;

function profile(user = auth.currentUser) {
  const saved = getAgentProfile(user);
  return saved || { email:String(user?.email || localStorage.getItem('agentEmail') || '').toLowerCase(), name:localStorage.getItem('agentName') || 'Agent' };
}
function fmtDate(ms, short=false) {
  if (!ms) return 'Non relevée sur la période';
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', short ? {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'} : {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function fmtStock(v,u='') { return v === null || v === undefined || v === '' ? '—' : `${typeof v==='number'?v.toLocaleString('fr-FR'):esc(v)} ${esc(u || '')}`.trim(); }
function heatClass(label){return label==='Très chaud'?'veryhot':label==='Chaud'?'hot':label==='Tiède'?'warm':'cold';}
function displayHeat(label){return label==='Très chaud'?'Très actif':label==='Chaud'?'À suivre':label==='Tiède'?'Actif':'Peu actif';}
function heatIcon(label){return label==='Très chaud'?'🔥':label==='Chaud'?'🟠':label==='Tiède'?'🟢':'⚪';}
function statusDot(c){ return c.isOnline ? '<span class="lrf-presence online"></span>' : c.isToday ? '<span class="lrf-presence today"></span>' : '<span class="lrf-presence offline"></span>'; }
function actionIcon(a){return ({session_start:'🌐',page_view:'👁',partner_view:'🏭',product_view:'🧱',stock_view:'📦',tariff_view:'💶',cart_add:'🛒',order_view:'✅'})[a] || '•';}
function partnerLabel(p){return String(p||'').replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase()) || '—';}
function periodLabel(){return $('#lrf-period')?.selectedOptions?.[0]?.textContent || 'Période';}

function waitUser(timeout=4500){
  if(auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise(resolve=>{
    let done=false, stop=()=>{};
    const finish=user=>{if(done)return;done=true;clearTimeout(timer);try{stop();}catch(_){}resolve(user||null);};
    stop=onAuthStateChanged(auth,user=>{ if(user) finish(user); });
    const timer=setTimeout(()=>finish(auth.currentUser),timeout);
  });
}
function showMessage(title, text, reconnect=false){
  const root=$('#lrf-analysis-root');
  if(!root)return;
  root.innerHTML=`<div class="lrf-analysis-card lrf-state-card"><div class="lrf-state-icon">${reconnect?'🔐':'⚠️'}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>${reconnect?'<a class="lrf-open-client" href="agent.html?return=analyse-clients-lrf.html">Reconnecter l’analyse clients</a>':'<button class="btn-primary-gold" type="button" onclick="location.reload()">Réessayer</button>'}</div>`;
}
function requestBody(){
  const period=$('#lrf-period')?.value || '30d';
  const body={period,department:$('#lrf-department')?.value||'',partner:$('#lrf-partner')?.value||'',action:$('#lrf-action')?.value||'',clientId:$('#lrf-client-filter')?.value||''};
  if(period==='custom'){body.startDate=$('#lrf-date-start')?.value||'';body.endDate=$('#lrf-date-end')?.value||'';}
  return body;
}
async function fetchAnalytics(){
  const user=await waitUser();
  if(!user){showMessage('Session CRM à réactiver','La session administrateur n’est plus disponible sur cet appareil.',true);return null;}
  const p=profile(user), email=String(p?.email||user.email||'').toLowerCase();
  if(!ALLOWED.has(email)){showMessage('Accès refusé','Cette analyse est réservée à Jérôme et Coryne.',false);return null;}
  $('#lrf-analysis-greeting').textContent=`Analyse privée — ${p?.name || email}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const token=await user.getIdToken(false);
    const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(requestBody()),cache:'no-store',signal:controller.signal});
    const json=await r.json().catch(()=>({}));
    if(!r.ok||!json.success)throw new Error(json.error||`Erreur ${r.status}`);
    return json;
  } finally { clearTimeout(timer); }
}
async function load({preserveFilters=true}={}){
  if(loading){reloadPending=true;pendingPreserveFilters=preserveFilters;return;}
  loading=true;
  const btn=$('#lrf-refresh-analysis'); if(btn){btn.disabled=true;btn.textContent='↻ Chargement…';}
  $('#lrf-load-state')?.classList.add('show');
  try{
    const json=await fetchAnalytics(); if(!json)return;
    if(reloadPending)return;
    data=json; $('#lrf-analysis-error')?.remove(); data.clients=(data.clients||[]).filter(c=>c.codeClient!=='LRF-00001'); fillFilters(preserveFilters); renderAll();
  }catch(err){
    console.error(err);
    const message=err?.name==='AbortError'?'Le serveur met trop de temps à répondre.':(err.message||'Impossible de charger les données.');
    if(data){
      let alert=$('#lrf-analysis-error');
      if(!alert){alert=document.createElement('p');alert.id='lrf-analysis-error';alert.className='lrf-private-note';alert.setAttribute('role','alert');$('#lrf-analysis-root').prepend(alert);}
      alert.textContent=`Actualisation impossible : ${message} Les derniers résultats chargés restent affichés. Utilisez Actualiser pour réessayer.`;
    }else showMessage('Analyse indisponible',message,false);
  }
  finally{
    loading=false;
    if(btn){btn.disabled=false;btn.textContent='↻ Actualiser';}
    $('#lrf-load-state')?.classList.remove('show');
    if(reloadPending){const preserve=pendingPreserveFilters;reloadPending=false;pendingPreserveFilters=true;queueMicrotask(()=>load({preserveFilters:preserve}));}
  }
}
function setOptions(select, values, current, mapper=v=>({value:v,label:v})){
  if(!select)return;
  const first=select.options[0]?.outerHTML || '<option value="">Tous</option>';
  select.innerHTML=first + values.map(v=>{const x=mapper(v);return `<option value="${esc(x.value)}">${esc(x.label)}</option>`;}).join('');
  if([...select.options].some(o=>o.value===current))select.value=current;
}
function fillFilters(preserve=true){
  const dep=$('#lrf-department'), partner=$('#lrf-partner'), action=$('#lrf-action'), client=$('#lrf-client-filter');
  const values={dep:preserve?dep?.value:'',partner:preserve?partner?.value:'',action:preserve?action?.value:'',client:preserve?client?.value:''};
  setOptions(dep,data.filters?.departments||[],values.dep);
  setOptions(partner,data.filters?.partners||[],values.partner,v=>({value:v,label:partnerLabel(v)}));
  setOptions(action,data.filters?.actions||[],values.action,v=>typeof v==='object'?{value:v.value,label:v.label}:{value:v,label:v});
  setOptions(client,(data.clients||[]).slice().sort((a,b)=>a.societe.localeCompare(b.societe,'fr')),values.client,c=>({value:c.id,label:`${c.societe} · ${c.codeClient}`}));
}
function renderKpis(){
  const g=data.general||{};
  const cards=[['👥','Clients sur le site',g.activeClients||0,periodLabel(),'clients'],['🌐','Visites du site',g.connections||0,'Sessions relevées','activity'],['🛒','Commandes suivies',data.orderAnalytics?.incomplete?'—':g.orders||0,data.orderAnalytics?.incomplete?'Confirmation indisponible':'Signalées confirmées','orders']];
  $('#lrf-kpis').innerHTML=cards.map(([i,l,v,n,p])=>`<button type="button" class="lrf-kpi" data-open-panel="${p}"><span class="lrf-kpi-icon" aria-hidden="true">${i}</span><span><span>${esc(l)}</span><strong>${typeof v==='number'?v.toLocaleString('fr-FR'):esc(v)}</strong><small>${esc(n)}</small></span></button>`).join('');
}
function hotCard(c){
  return `<article class="lrf-hot-card"><div class="lrf-hot-name">${esc(c.societe)}</div><div class="lrf-hot-meta">${esc(c.codeClient)} · ${esc(c.ville||'')}</div><p class="lrf-hot-reasons">${esc(summaryFor(c))}</p><p class="lrf-report-muted">${esc(nextActionFor(c))}</p><button class="lrf-link-btn" type="button" data-detail-client="${esc(c.id)}">Compte rendu</button></article>`;
}
function orderEvents(){return (data.orders || data.timeline || []).filter(e=>e.action==='order_view').slice().sort((a,b)=>b.at-a.at);}
function orderRow(e){
  const detail=[partnerLabel(e.partner),e.productName,e.productRef?`réf. ${e.productRef}`:''].filter(Boolean).join(' · ');
  return `<button class="lrf-order-row" type="button" data-detail-client="${esc(e.clientId)}"><span class="lrf-order-icon">🛒</span><span><strong>${esc(e.societe)}</strong><small>${esc(detail||'Commande enregistrée')}</small></span><time>${fmtDate(e.at,true)}</time><b>Voir →</b></button>`;
}
function renderOrders(){
  const rows=orderEvents();
  const empty=`<div class="lrf-empty">${data.orderAnalytics?.incomplete?'Confirmation des commandes indisponible avec la réponse actuelle du serveur. Un zéro ne permet pas de conclure à une absence de commande.':'Aucune commande confirmée relevée dans le suivi du site pour cette période.'}</div>`;
  const full=$('#lrf-orders-list'), mini=$('#lrf-overview-orders');
  if(full)full.innerHTML=(data.orderAnalytics?.eventQueryLimitReached?'<p class="lrf-report-muted">La limite de lecture des événements a été atteinte : choisissez une période plus courte pour un suivi complet.</p>':'')+(rows.length?rows.map(orderRow).join(''):empty);
  if(mini)mini.innerHTML=rows.length?rows.slice(0,5).map(orderRow).join(''):empty;
}
function renderTopProducts(){
  const host=$('#lrf-top-products'); if(!host)return;
  const rows=(data.products||[]).slice(0,6);
  host.innerHTML=rows.length?rows.map((p,i)=>`<div class="lrf-simple-row"><span class="lrf-rank">${i+1}</span><span><strong>${esc(p.name||p.ref||'Produit')}</strong><small>${esc(partnerLabel(p.partner))}${p.ref?` · ${esc(p.ref)}`:''}</small></span><b>${p.count||0} vue${p.count>1?'s':''}</b></div>`).join(''):'<div class="lrf-empty">Pas encore assez de consultations produit.</div>';
}
function renderOverview(){
  const online=data.connectedRecent||[];
  $('#lrf-online-list').innerHTML=online.length?online.map(c=>`<button class="lrf-online-row" data-detail-client="${esc(c.id)}"><span>${statusDot(c)}<strong>${esc(c.societe)}</strong><small>${esc(c.codeClient)} · ${fmtDate(c.lastSeenGlobal,true)}</small></span><b>Voir →</b></button>`).join(''):'<div class="lrf-empty">Aucun client actif dans les 5 dernières minutes.</div>';
  const top=(data.clients||[]).filter(c=>c.lastSeenAt && followScore(c)>0).slice().sort((a,b)=>followScore(b)-followScore(a)).slice(0,5);
  $('#lrf-overview-hot').innerHTML=top.length?top.map(hotCard).join(''):'<div class="lrf-empty">Pas encore assez d’activité pour établir des priorités.</div>';
  renderBreakdown('#lrf-partner-bars',data.partners||[],'Aucune consultation fabricant sur cette période.');
  renderTopProducts(); renderOrders();
}
function renderBreakdown(sel,rows,empty){
  const host=$(sel);if(!host)return;const max=Math.max(1,...rows.map(x=>x.count||0));
  host.innerHTML=rows.length?rows.slice(0,8).map(r=>`<div class="lrf-page-row"><div class="lrf-page-name" title="${esc(r.name)}">${esc(partnerLabel(r.name))}</div><div class="lrf-page-track"><div class="lrf-page-fill" style="width:${Math.max(3,Math.round((r.count/max)*100))}%"></div></div><div class="lrf-page-count">${Number(r.count||0).toLocaleString('fr-FR')}</div></div>`).join(''):`<div class="lrf-empty">${esc(empty)}</div>`;
}
function clientCard(c){
  const interest=interestFor(c);
  const presence=c.isOnline?'En ligne sur le site':c.lastSeenAt?`Site : ${fmtDate(c.lastSeenAt,true)}`:'Pas d’activité web sur la période';
  return `<article class="lrf-client-card" data-client-id="${esc(c.id)}" data-client-company="${esc(c.societe)}"><div class="lrf-client-card-head"><div><h3>${esc(c.societe)}</h3><p class="lrf-report-muted">${esc(c.codeClient)} · ${esc(c.ville||'Ville non renseignée')}${c.departement?` (${esc(c.departement)})`:''}</p></div><span class="lrf-site-status ${c.isOnline?'is-online':''}">${esc(presence)}</span></div><p class="lrf-client-facts">${esc(summaryFor(c))}</p><p class="lrf-client-interest"><span>Consultation principale</span>${esc(interest || 'Intérêt produit non identifié')}</p><div data-client-revenue></div><button class="lrf-report-open" type="button" data-detail-client="${esc(c.id)}" aria-label="Compte rendu de ${esc(c.societe)}">Compte rendu <span aria-hidden="true">→</span></button></article>`;
}
function renderClients(){
  const host=$('#lrf-client-cards'); if(!host)return;
  const rows=selectClients(data.clients||[], {query:$('#lrf-client-search')?.value,status:$('#lrf-client-status')?.value,sort:$('#lrf-client-sort')?.value});
  host.innerHTML=rows.length?rows.map(clientCard).join(''):'<div class="lrf-empty">Aucun client pour ces filtres. Essayez « Tous les clients » ou modifiez la recherche.</div>';
  $('#lrf-client-count').textContent=`${rows.length} client${rows.length>1?'s':''}`;
  document.dispatchEvent(new CustomEvent('lrf:clients-rendered'));
}
function eventDetail(e){
  const parts=[];
  if(e.action==='page_view')parts.push(e.page);
  if(e.partner)parts.push(partnerLabel(e.partner));
  if(e.productName)parts.push(e.productName);
  if(e.productRef)parts.push(`réf. ${e.productRef}`);
  if(e.collection&&!parts.some(x=>String(x).toLowerCase()===String(e.collection).toLowerCase()))parts.push(e.collection);
  if(e.action==='stock_view')parts.push(`stock ${fmtStock(e.stock,e.stockUnit)}`);
  return parts.filter(Boolean).join(' · ') || e.page || '—';
}
function renderTimeline(){
  const host=$('#lrf-timeline');const q=String($('#lrf-activity-search')?.value||'').toLowerCase().trim();
  let rows=data.timeline||[];
  if(q)rows=rows.filter(e=>[e.societe,e.codeClient,e.actionLabel,e.page,e.partner,e.productName,e.productRef,e.collection].some(v=>String(v||'').toLowerCase().includes(q)));
  host.innerHTML=rows.length?rows.slice(0,300).map(e=>`<button class="lrf-event ${e.action==='order_view'?'is-order':''}" data-detail-client="${esc(e.clientId)}"><span class="lrf-event-icon">${actionIcon(e.action)}</span><span class="lrf-event-main"><strong>${esc(e.societe)}</strong><b>${esc(e.actionLabel)}</b><small>${esc(eventDetail(e))}</small></span><time>${fmtDate(e.at,true)}</time></button>`).join(''):'<div class="lrf-empty">Aucune activité pour ces filtres.</div>';
}
function renderAll(){
  $('#lrf-data-coverage')?.remove();
  if(data.orderAnalytics?.eventQueryLimitReached){
    const note=document.createElement('p');note.id='lrf-data-coverage';note.className='lrf-private-note';note.setAttribute('role','status');
    note.textContent='Données partielles : la limite de lecture des événements est atteinte. Les chiffres et les clients sans activité relevée peuvent être incomplets. Choisissez une période plus courte.';
    $('#lrf-analysis-root').prepend(note);
  }
  renderKpis();renderOverview();renderClients();renderTimeline();
  const range=data.range||{};$('#lrf-generated-at').textContent=`Mise à jour : ${fmtDate(data.generatedAt)} · ${fmtDate(range.start,true)} → ${fmtDate(range.end,true)}`;
  $('#lrf-load-summary').textContent=`${data.general?.activeClients||0} clients avec activité web · ${data.orderAnalytics?.incomplete?'commandes non vérifiées':`${data.general?.orders||0} commande${data.general?.orders===1?'':'s'} suivie${data.general?.orders===1?'':'s'}`}`;
}
async function renderHistory(c){
  const request=++historyRequest;
  const host=$('#lrf-detail-history');
  host.innerHTML='<p class="lrf-report-muted">Chargement des comptes rendus enregistrés…</p>';
  $('#lrf-detail-add-note').href=`comptes-rendus.html?new=1&client=${encodeURIComponent(c.id)}`;
  try{
    const history=await loadClientHistory(c.id);
    if(request!==historyRequest || detailClientId!==c.id)return;
    host.innerHTML=history.items.length?history.items.slice(0,5).map(note=>`<article class="lrf-history-note"><div><strong>${esc(note.author || 'Auteur non renseigné')}</strong><time>${note.at?new Date(note.at).toLocaleDateString('fr-FR'):'Date non renseignée'}</time></div>${note.usine?`<small>${esc(note.usine)}</small>`:''}<p>${esc(note.text || 'Compte rendu sans texte')}</p></article>`).join(''):'<p class="lrf-report-muted">Aucun compte rendu enregistré dans cette fiche.</p>';
    if(history.items.length>5)host.insertAdjacentHTML('beforeend',`<p class="lrf-report-muted">5 derniers comptes rendus sur ${history.count}. La fiche complète conserve tout l’historique.</p>`);
  }catch(_){if(request===historyRequest && detailClientId===c.id)host.innerHTML='<p class="lrf-report-muted" role="status">Les comptes rendus n’ont pas pu être chargés. Consultez la fiche client ou réessayez à l’ouverture.</p>';}
}
function openClientDetail(id){
  const c=(data.clients||[]).find(x=>x.id===id);if(!c)return;
  if(!detailClientId)detailTrigger=document.activeElement;
  detailClientId=id;
  $('#lrf-detail-title').textContent=c.societe;
  $('#lrf-detail-meta').textContent=`${c.codeClient} · ${c.ville||''} ${c.departement||''}`;
  $('#lrf-detail-reasons').textContent=summaryFor(c)+'.';
  $('#lrf-detail-interest').textContent=interestFor(c)?`Consultation principale : ${interestFor(c)}.`:'Le suivi ne permet pas encore d’identifier un intérêt produit.';
  $('#lrf-detail-next-action').textContent=nextActionFor(c);
  $('#lrf-detail-period').textContent=`Activité web : ${periodLabel()} · du ${fmtDate(data.range?.start,true)} au ${fmtDate(data.range?.end,true)}`;
  const highlight=$('#lrf-detail-order-highlight');
  if(highlight)highlight.innerHTML=`<p class="lrf-report-muted">${data.orderAnalytics?.incomplete?'Confirmation des commandes indisponible dans le suivi actuel.':`${c.orderViews||0} commande(s) signalée(s) comme confirmée(s) par le suivi du site.`} Les commandes usine hors site ne sont pas couvertes.</p>`;
  const metrics=[['Dernière activité web',fmtDate(c.lastSeenAt)],['Visites du site',c.sessions||0],['Consultations produit',c.productViews||0],['Tarifs consultés',c.tariffViews||0],['Stocks consultés',c.stockViews||0],['Commandes suivies',data.orderAnalytics?.incomplete?'Non vérifié':c.orderViews||0]];
  $('#lrf-detail-metrics').innerHTML=metrics.map(([l,v])=>`<div><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');
  const events=(data.timeline||[]).filter(e=>e.clientId===id).slice().sort((a,b)=>b.at-a.at).slice(0,50);
  $('#lrf-detail-timeline').innerHTML=events.length?events.map(e=>`<div class="lrf-detail-event"><span aria-hidden="true">${actionIcon(e.action)}</span><div><strong>${esc(e.actionLabel)}</strong><small>${esc(eventDetail(e))}</small><time>${fmtDate(e.at,true)}</time></div></div>`).join(''):'<div class="lrf-empty">Aucun événement détaillé disponible pour cette période.</div>';
  $('#lrf-detail-fiche').href=`clients.html?focus=${encodeURIComponent(c.id)}`;
  const drawer=$('#lrf-client-drawer');drawer.inert=false;drawer.setAttribute('aria-hidden','false');drawer.classList.add('open');
  $('#lrf-detail-backdrop').classList.add('open');document.body.classList.add('lrf-drawer-open');
  $('#lrf-detail-close').focus();
  renderHistory(c);
}
function closeDetail(){
  detailClientId='';historyRequest++;
  const drawer=$('#lrf-client-drawer');drawer?.classList.remove('open');drawer?.setAttribute('aria-hidden','true');if(drawer)drawer.inert=true;
  $('#lrf-detail-backdrop')?.classList.remove('open');document.body.classList.remove('lrf-drawer-open');
  if(detailTrigger?.isConnected)detailTrigger.focus();detailTrigger=null;
}
function updateCustomDates(){const custom=$('#lrf-period')?.value==='custom';$$('.lrf-custom-date').forEach(el=>el.hidden=!custom);if(custom)$('#lrf-advanced-filters')?.removeAttribute('hidden');}
function openPanel(name){
  const btn=$(`.lrf-analytics-tab[data-panel="${name}"]`);if(!btn)return;
  $$('.lrf-analytics-tab').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
  $$('.lrf-analytics-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${name}`));
  if($('#lrf-kpis'))$('#lrf-kpis').hidden=name!=='overview';
}
function bind(){
  $$('.lrf-analytics-tab').forEach(btn=>btn.addEventListener('click',()=>openPanel(btn.dataset.panel)));
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-open-panel]');if(btn)openPanel(btn.dataset.openPanel);});
  $('#lrf-toggle-filters')?.addEventListener('click',()=>{const panel=$('#lrf-advanced-filters'),btn=$('#lrf-toggle-filters');const opening=panel.hasAttribute('hidden');if(opening)panel.removeAttribute('hidden');else panel.setAttribute('hidden','');btn.setAttribute('aria-expanded',String(opening));});
  $('#lrf-period')?.addEventListener('change',()=>{updateCustomDates();if($('#lrf-period').value!=='custom')load();});
  ['#lrf-department','#lrf-partner','#lrf-action','#lrf-client-filter'].forEach(s=>$(s)?.addEventListener('change',()=>load()));
  $('#lrf-apply-custom')?.addEventListener('click',()=>load());
  $('#lrf-refresh-analysis')?.addEventListener('click',()=>load());
  $('#lrf-reset-filters')?.addEventListener('click',()=>{['#lrf-department','#lrf-partner','#lrf-action','#lrf-client-filter'].forEach(s=>{if($(s))$(s).value='';});if($('#lrf-period'))$('#lrf-period').value='30d';updateCustomDates();load({preserveFilters:false});});
  $('#lrf-client-search')?.addEventListener('input',renderClients);$('#lrf-client-sort')?.addEventListener('change',renderClients);$('#lrf-client-status')?.addEventListener('change',renderClients);$('#lrf-activity-search')?.addEventListener('input',renderTimeline);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-detail-client]');if(b){e.preventDefault();openClientDetail(b.dataset.detailClient);}});
  $('#lrf-detail-close')?.addEventListener('click',closeDetail);$('#lrf-detail-backdrop')?.addEventListener('click',closeDetail);document.addEventListener('keydown',e=>{
    if(!detailClientId)return;
    if(e.key==='Escape'){e.preventDefault();closeDetail();}
    if(e.key==='Tab'){
      const focusable=$$('#lrf-client-drawer button, #lrf-client-drawer a[href], #lrf-client-drawer summary').filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  openPanel('clients');updateCustomDates();
}

bind();load({preserveFilters:false});