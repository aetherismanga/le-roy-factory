import { auth, getAgentProfile } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const ENDPOINT = 'https://us-central1-le-roy-factory.cloudfunctions.net/getLrfAnalytics';
const ALLOWED = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
let data = null;
let loading = false;
let detailClientId = '';

function profile(user = auth.currentUser) {
  const saved = getAgentProfile(user);
  return saved || { email:String(user?.email || localStorage.getItem('agentEmail') || '').toLowerCase(), name:localStorage.getItem('agentName') || 'Agent' };
}
function fmtDate(ms, short=false) {
  if (!ms) return 'Jamais';
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', short ? {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'} : {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function fmtStock(v,u='') { return v === null || v === undefined || v === '' ? '—' : `${Number(v).toLocaleString('fr-FR')} ${esc(u || '')}`.trim(); }
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
  const period=$('#lrf-period')?.value || '7d';
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
  if(loading)return; loading=true;
  const btn=$('#lrf-refresh-analysis'); if(btn){btn.disabled=true;btn.textContent='↻ Chargement…';}
  $('#lrf-load-state')?.classList.add('show');
  try{
    const json=await fetchAnalytics(); if(!json)return;
    data=json; fillFilters(preserveFilters); renderAll();
  }catch(err){console.error(err);showMessage('Analyse indisponible',err?.name==='AbortError'?'Le serveur met trop de temps à répondre. Réessayez dans quelques secondes.':(err.message||'Impossible de charger les données.'),false);}
  finally{loading=false;if(btn){btn.disabled=false;btn.textContent='↻ Actualiser';}$('#lrf-load-state')?.classList.remove('show');}
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
  const cards=[
    ['👥','Clients actifs',g.activeClients||0,periodLabel()],
    ['🌐','Visites du site',g.connections||0,'sessions clients'],
    ['🛒','Commandes',g.orders||0,'sur la période'],
    ['🔥','Clients à suivre',g.hotClients||0,'activité commerciale']
  ];
  $('#lrf-kpis').innerHTML=cards.map(([i,l,v,s])=>`<div class="lrf-kpi"><span class="lrf-kpi-icon">${i}</span><div><span>${esc(l)}</span><strong>${Number(v).toLocaleString('fr-FR')}</strong><small>${esc(s)}</small></div></div>`).join('');
}
function hotCard(c, compact=false){
  const orderText=c.orderViews?` · ${c.orderViews} commande${c.orderViews>1?'s':''}`:'';
  return `<article class="lrf-hot-card"><div class="lrf-hot-head"><div><div class="lrf-hot-name">${statusDot(c)}${esc(c.societe)}</div><div class="lrf-hot-meta">${esc(c.codeClient)} · ${esc(c.ville||'')} ${esc(c.departement||'')}</div></div><span class="lrf-heat ${heatClass(c.heatLabel)}">${heatIcon(c.heatLabel)} ${esc(displayHeat(c.heatLabel))}</span></div><div class="lrf-hot-reasons">${esc((c.heatReasons||[]).slice(0,3).join(' · ')||'Activité récente')}${esc(orderText)}</div>${compact?'':`<div class="lrf-mini-metrics"><span>🌐 ${c.sessions||0} visites</span><span>🧱 ${c.productViews||0} produits</span><span>💶 ${c.tariffViews||0} tarifs</span></div><div class="lrf-card-actions"><button class="lrf-link-btn" data-detail-client="${esc(c.id)}">Voir le client</button><a class="lrf-open-client" href="clients.html?edit=${encodeURIComponent(c.id)}">Fiche CRM</a></div>`}</article>`;
}
function orderEvents(){return (data.timeline||[]).filter(e=>e.action==='order_view').sort((a,b)=>b.at-a.at);}
function orderRow(e){
  const detail=[partnerLabel(e.partner),e.productName,e.productRef?`réf. ${e.productRef}`:''].filter(Boolean).join(' · ');
  return `<button class="lrf-order-row" type="button" data-detail-client="${esc(e.clientId)}"><span class="lrf-order-icon">🛒</span><span><strong>${esc(e.societe)}</strong><small>${esc(detail||'Commande enregistrée')}</small></span><time>${fmtDate(e.at,true)}</time><b>Voir →</b></button>`;
}
function renderOrders(){
  const rows=orderEvents();
  const empty='<div class="lrf-empty">Aucune commande enregistrée sur cette période.</div>';
  const full=$('#lrf-orders-list'), mini=$('#lrf-overview-orders');
  if(full)full.innerHTML=rows.length?rows.map(orderRow).join(''):empty;
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
  const top=(data.hotClients||[]).slice(0,5);
  $('#lrf-overview-hot').innerHTML=top.length?top.map(c=>hotCard(c,true)).join(''):'<div class="lrf-empty">Pas encore assez d’activité pour établir des priorités.</div>';
  renderBreakdown('#lrf-partner-bars',data.partners||[],'Aucune consultation fabricant sur cette période.');
  renderTopProducts(); renderOrders();
}
function renderBreakdown(sel,rows,empty){
  const host=$(sel);if(!host)return;const max=Math.max(1,...rows.map(x=>x.count||0));
  host.innerHTML=rows.length?rows.slice(0,8).map(r=>`<div class="lrf-page-row"><div class="lrf-page-name" title="${esc(r.name)}">${esc(partnerLabel(r.name))}</div><div class="lrf-page-track"><div class="lrf-page-fill" style="width:${Math.max(3,Math.round((r.count/max)*100))}%"></div></div><div class="lrf-page-count">${Number(r.count||0).toLocaleString('fr-FR')}</div></div>`).join(''):`<div class="lrf-empty">${esc(empty)}</div>`;
}
function clientRows(rows){
  if(!rows.length)return'<tr><td colspan="10"><div class="lrf-empty">Aucun client pour ces filtres.</div></td></tr>';
  return rows.map(c=>`<tr><td data-label="Client"><button class="lrf-client-name-btn" data-detail-client="${esc(c.id)}">${statusDot(c)}<span><strong>${esc(c.societe)}</strong><small>${esc(c.codeClient)} · ${esc(c.ville||'')} ${esc(c.departement?`(${c.departement})`:'')}</small></span></button></td><td data-label="Dernière activité">${fmtDate(c.lastSeenAt)}</td><td data-label="Visites"><strong>${c.sessions||0}</strong></td><td data-label="Produits">${c.productViews||0}</td><td data-label="Tarifs">${c.tariffViews||0}</td><td data-label="Stocks">${c.stockViews||0}</td><td data-label="Commandes"><strong>${c.orderViews||0}</strong></td><td data-label="Intérêt principal">${c.topProduct?`${esc(c.topProduct.name||c.topProduct.ref)}<br><small>${esc(c.topProduct.ref||'')}</small>`:esc(c.topPage||'—')}</td><td data-label="Niveau"><span class="lrf-heat ${heatClass(c.heatLabel)}">${heatIcon(c.heatLabel)} ${esc(displayHeat(c.heatLabel))}</span></td><td data-label="Action"><div class="lrf-row-actions"><button class="lrf-link-btn" data-detail-client="${esc(c.id)}">Voir</button><a class="lrf-open-client" href="clients.html?edit=${encodeURIComponent(c.id)}">Fiche</a></div></td></tr>`).join('');
}
function renderClients(){
  const host=$('#lrf-clients-table-body'); if(!host)return;
  const q=String($('#lrf-client-search')?.value||'').toLowerCase().trim();
  const heat=$('#lrf-client-heat')?.value||'all';
  const status=$('#lrf-client-status')?.value||'all';
  let rows=(data.clients||[]).filter(c=>c.lastSeenAt>0 || status==='inactive');
  if(q)rows=rows.filter(c=>[c.societe,c.codeClient,c.ville,c.departement,c.contact,c.topProduct?.name,c.topProduct?.ref].some(v=>String(v||'').toLowerCase().includes(q)));
  if(heat!=='all')rows=rows.filter(c=>c.heatLabel===heat);
  if(status==='online')rows=rows.filter(c=>c.isOnline); else if(status==='today')rows=rows.filter(c=>c.isToday); else if(status==='inactive')rows=rows.filter(c=>!c.lastSeenAt);
  host.innerHTML=clientRows(rows); $('#lrf-client-count').textContent=`${rows.length} client${rows.length>1?'s':''}`;
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
  renderKpis();renderOverview();renderClients();renderTimeline();
  const range=data.range||{};$('#lrf-generated-at').textContent=`Mise à jour : ${fmtDate(data.generatedAt)} · ${fmtDate(range.start,true)} → ${fmtDate(range.end,true)}`;
  $('#lrf-load-summary').textContent=`${data.general?.activeClients||0} clients actifs · ${data.general?.orders||0} commande${data.general?.orders===1?'':'s'}`;
}
function detailSummary(c){
  const bits=[];
  if(c.orderViews)bits.push(`${c.orderViews} commande${c.orderViews>1?'s':''} sur la période`);
  if(c.productViews)bits.push(`${c.productViews} produit${c.productViews>1?'s':''} consulté${c.productViews>1?'s':''}`);
  if(c.tariffViews)bits.push(`${c.tariffViews} tarif${c.tariffViews>1?'s':''} consulté${c.tariffViews>1?'s':''}`);
  if(c.stockViews)bits.push(`${c.stockViews} consultation${c.stockViews>1?'s':''} de stock`);
  if(c.topProduct?.name)bits.push(`intérêt principal : ${c.topProduct.name}`);
  return bits.join(' · ') || (c.heatReasons||[]).join(' · ') || 'Pas encore assez de signaux commerciaux.';
}
function openClientDetail(id){
  const c=(data.clients||[]).find(x=>x.id===id);if(!c)return;detailClientId=id;
  $('#lrf-detail-title').innerHTML=`${statusDot(c)} ${esc(c.societe)}`;
  $('#lrf-detail-meta').textContent=`${c.codeClient} · ${c.ville||''} ${c.departement||''}`;
  $('#lrf-detail-score').innerHTML=`<span class="lrf-heat lrf-heat-large ${heatClass(c.heatLabel)}">${heatIcon(c.heatLabel)} ${esc(displayHeat(c.heatLabel))}</span>`;
  const highlight=$('#lrf-detail-order-highlight');
  if(highlight)highlight.innerHTML=c.orderViews?`<div class="lrf-order-highlight">🛒 <strong>${c.orderViews} commande${c.orderViews>1?'s':''}</strong> enregistrée${c.orderViews>1?'s':''} sur la période.</div>`:'';
  const metrics=[['Dernière activité',fmtDate(c.lastSeenAt)],['Visites du site',c.sessions||0],['Produits vus',c.productViews||0],['Tarifs consultés',c.tariffViews||0],['Stocks consultés',c.stockViews||0],['Commandes',c.orderViews||0],['Page favorite',c.topPage||'—'],['Produit favori',c.topProduct?.name||c.topProduct?.ref||'—']];
  $('#lrf-detail-metrics').innerHTML=metrics.map(([l,v])=>`<div><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');
  $('#lrf-detail-reasons').textContent=detailSummary(c);
  const events=(data.timeline||[]).filter(e=>e.clientId===id).slice(0,100);
  $('#lrf-detail-timeline').innerHTML=events.length?events.map(e=>`<div class="lrf-detail-event ${e.action==='order_view'?'is-order':''}"><span>${actionIcon(e.action)}</span><div><strong>${esc(e.actionLabel)}</strong><small>${esc(eventDetail(e))}</small></div><time>${fmtDate(e.at,true)}</time></div>`).join(''):'<div class="lrf-empty">Aucun événement détaillé sur la période sélectionnée.</div>';
  $('#lrf-detail-fiche').href=`clients.html?edit=${encodeURIComponent(c.id)}`;
  $('#lrf-client-drawer').classList.add('open');$('#lrf-detail-backdrop').classList.add('open');document.body.classList.add('lrf-drawer-open');
}
function closeDetail(){detailClientId='';$('#lrf-client-drawer')?.classList.remove('open');$('#lrf-detail-backdrop')?.classList.remove('open');document.body.classList.remove('lrf-drawer-open');}
function updateCustomDates(){const custom=$('#lrf-period')?.value==='custom';$$('.lrf-custom-date').forEach(el=>el.hidden=!custom);if(custom)$('#lrf-advanced-filters')?.removeAttribute('hidden');}
function openPanel(name){
  const btn=$(`.lrf-analytics-tab[data-panel="${name}"]`);if(!btn)return;
  $$('.lrf-analytics-tab').forEach(b=>b.classList.toggle('active',b===btn));
  $$('.lrf-analytics-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${name}`));
  if(window.innerWidth<700)btn.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
}
function bind(){
  $$('.lrf-analytics-tab').forEach(btn=>btn.addEventListener('click',()=>openPanel(btn.dataset.panel)));
  $$('[data-open-panel]').forEach(btn=>btn.addEventListener('click',()=>openPanel(btn.dataset.openPanel)));
  $('#lrf-toggle-filters')?.addEventListener('click',()=>{const panel=$('#lrf-advanced-filters'),btn=$('#lrf-toggle-filters');const opening=panel.hasAttribute('hidden');if(opening)panel.removeAttribute('hidden');else panel.setAttribute('hidden','');btn.setAttribute('aria-expanded',String(opening));});
  $('#lrf-period')?.addEventListener('change',()=>{updateCustomDates();if($('#lrf-period').value!=='custom')load();});
  ['#lrf-department','#lrf-partner','#lrf-action','#lrf-client-filter'].forEach(s=>$(s)?.addEventListener('change',()=>load()));
  $('#lrf-apply-custom')?.addEventListener('click',()=>load());
  $('#lrf-refresh-analysis')?.addEventListener('click',()=>load());
  $('#lrf-reset-filters')?.addEventListener('click',()=>{['#lrf-department','#lrf-partner','#lrf-action','#lrf-client-filter'].forEach(s=>{if($(s))$(s).value='';});if($('#lrf-period'))$('#lrf-period').value='7d';updateCustomDates();load({preserveFilters:false});});
  $('#lrf-client-search')?.addEventListener('input',renderClients);$('#lrf-client-heat')?.addEventListener('change',renderClients);$('#lrf-client-status')?.addEventListener('change',renderClients);$('#lrf-activity-search')?.addEventListener('input',renderTimeline);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-detail-client]');if(b){e.preventDefault();openClientDetail(b.dataset.detailClient);}});
  $('#lrf-detail-close')?.addEventListener('click',closeDetail);$('#lrf-detail-backdrop')?.addEventListener('click',closeDetail);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();});
  updateCustomDates();
}

bind();load({preserveFilters:false});
