import { auth, getAgentProfile } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const ENDPOINT='https://us-central1-le-roy-factory.cloudfunctions.net/getLrfAnalytics';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
let data=null;

function profile(){return getAgentProfile(auth.currentUser)||{email:String(localStorage.getItem('agentEmail')||'').toLowerCase(),name:localStorage.getItem('agentName')||'Agent'};}
function fmtDate(ms){if(!ms)return'Jamais';return new Date(ms).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function heatClass(label){return label==='Très chaud'?'veryhot':label==='Chaud'?'hot':label==='Tiède'?'warm':'cold';}
function heatIcon(label){return label==='Très chaud'?'🔥':label==='Chaud'?'🟠':label==='Tiède'?'🟢':'⚪';}

function waitUser(){
  if(auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise(resolve=>{
    let settled=false;
    const stop=onAuthStateChanged(auth,user=>{
      if(settled) return;
      if(user){settled=true;stop();resolve(user);}
    });
    setTimeout(()=>{
      if(settled) return;
      settled=true;
      try{stop();}catch(_){ }
      resolve(auth.currentUser||null);
    },12000);
  });
}

function showReconnect(){
  const root=$('#lrf-analysis-root');
  if(root) root.innerHTML=`<div class="lrf-analysis-card"><div class="lrf-empty"><strong>Votre session sécurisée doit être réactivée.</strong><br><small>Vous restez dans le CRM : aucune redirection vers l'accueil.</small><br><br><a class="lrf-open-client" href="agent.html?return=analyse-clients-lrf.html">🔐 Reconnecter l'analyse clients LRF</a></div></div>`;
}

async function load(){
  const user=await waitUser();
  const p=profile();
  const allowed=['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];
  if(!user){showReconnect();return;}
  const current=getAgentProfile(user);
  const email=String(current?.email||p.email||user.email||'').toLowerCase();
  if(!allowed.includes(email)){showReconnect();return;}
  const g=$('#lrf-analysis-greeting');if(g)g.textContent=`Analyse privée — ${current?.name||p.name||email}`;
  try{
    const token=await user.getIdToken(true);
    const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:'{}',cache:'no-store'});
    const json=await r.json().catch(()=>({}));
    if(!r.ok||!json.success)throw new Error(json.error||'Analyse indisponible');
    data=json;renderAll();
  }catch(err){console.error(err);$('#lrf-analysis-root').innerHTML=`<div class="lrf-analysis-card"><div class="lrf-empty">Impossible de charger l'analyse LRF pour le moment.<br><small>${esc(err.message)}</small></div></div>`;}
}

function renderKpis(){const g=data.general||{};$('#lrf-kpis').innerHTML=[['Clients LRF suivis',g.trackedClients||0],['Actifs 7 jours',g.active7||0],['Actifs 30 jours',g.active30||0],['Vues 7 jours',g.views7||0],['Vues 30 jours',g.views30||0],['Clients chauds',g.hotClients||0]].map(([l,v])=>`<div class="lrf-kpi"><span>${esc(l)}</span><strong>${Number(v).toLocaleString('fr-FR')}</strong></div>`).join('');}

function clientRows(rows){if(!rows.length)return'<tr><td colspan="8"><div class="lrf-empty">Aucun client pour ce filtre.</div></td></tr>';return rows.map(c=>`<tr><td data-label="Client"><strong>${esc(c.societe)}</strong><br><small>${esc(c.codeClient||'Sans code')} · ${esc(c.ville||'')} ${esc(c.departement?`(${c.departement})`:'')}</small></td><td data-label="Dernière visite">${fmtDate(c.lastSeenAt)}</td><td data-label="Vues 7 j"><strong>${c.views7||0}</strong></td><td data-label="Vues 30 j"><strong>${c.views30||0}</strong></td><td data-label="Tarifs 30 j">${c.tariffViews30||0}</td><td data-label="Page favorite">${esc(c.topPage||'—')}</td><td data-label="Température"><span class="lrf-heat ${heatClass(c.heatLabel)}">${heatIcon(c.heatLabel)} ${esc(c.heatLabel)} · ${c.heatScore}</span></td><td><a class="lrf-open-client" href="clients.html?edit=${encodeURIComponent(c.id)}">Ouvrir la fiche</a></td></tr>`).join('');}

function renderClients(){const host=$('#lrf-clients-table-body');const q=String($('#lrf-client-search')?.value||'').toLowerCase().trim();const heat=$('#lrf-client-heat')?.value||'all';let rows=(data.clients||[]).filter(c=>!q||[c.societe,c.codeClient,c.ville,c.departement,c.contact].some(v=>String(v||'').toLowerCase().includes(q)));if(heat!=='all')rows=rows.filter(c=>c.heatLabel===heat);host.innerHTML=clientRows(rows);}
function renderHot(){const rows=data.hotClients||[];$('#lrf-hot-list').innerHTML=rows.length?rows.map(c=>`<article class="lrf-hot-card"><div class="lrf-hot-head"><div><div class="lrf-hot-name">${esc(c.societe)}</div><div class="lrf-hot-meta">${esc(c.codeClient)} · ${esc(c.ville||'')} ${esc(c.departement||'')}</div></div><span class="lrf-heat ${heatClass(c.heatLabel)}">${heatIcon(c.heatLabel)} ${c.heatScore}</span></div><div class="lrf-hot-reasons">${esc((c.heatReasons||[]).join(' · ')||'Activité LRF récente')}</div><div class="lrf-hot-meta">Dernière activité : ${fmtDate(c.lastSeenAt)} · ${c.views30||0} vues / 30 j</div><a class="lrf-open-client" href="clients.html?edit=${encodeURIComponent(c.id)}">📞 À relancer — ouvrir la fiche</a></article>`).join(''):'<div class="lrf-empty">Aucun client chaud pour le moment.</div>';}
function renderPages(){const pages=data.pages||[],max=Math.max(1,...pages.map(p=>p.count||0));$('#lrf-page-bars').innerHTML=pages.length?pages.map(p=>`<div class="lrf-page-row"><div class="lrf-page-name" title="${esc(p.name)}">${esc(p.name)}</div><div class="lrf-page-track"><div class="lrf-page-fill" style="width:${Math.max(3,Math.round((p.count/max)*100))}%"></div></div><div class="lrf-page-count">${p.count}</div></div>`).join(''):'<div class="lrf-empty">Les pages les plus vues apparaîtront dès les prochaines connexions LRF.</div>';}
function renderOverview(){const top=(data.hotClients||[]).slice(0,6);$('#lrf-overview-hot').innerHTML=top.length?top.map(c=>`<div class="lrf-hot-card"><div class="lrf-hot-head"><div><div class="lrf-hot-name">${esc(c.societe)}</div><div class="lrf-hot-meta">${esc(c.codeClient)} · ${fmtDate(c.lastSeenAt)}</div></div><span class="lrf-heat ${heatClass(c.heatLabel)}">${heatIcon(c.heatLabel)} ${c.heatScore}</span></div><div class="lrf-hot-reasons">${esc((c.heatReasons||[]).join(' · '))}</div></div>`).join(''):'<div class="lrf-empty">Pas encore assez d'activité pour classer les clients chauds.</div>';}

function renderAll(){renderKpis();renderOverview();renderClients();renderPages();renderHot();$('#lrf-generated-at').textContent=`Mise à jour : ${fmtDate(data.generatedAt)}`;}
function bind(){document.querySelectorAll('.lrf-analytics-tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.lrf-analytics-tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.lrf-analytics-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${btn.dataset.panel}`));}));$('#lrf-client-search')?.addEventListener('input',renderClients);$('#lrf-client-heat')?.addEventListener('change',renderClients);$('#lrf-refresh-analysis')?.addEventListener('click',()=>{const root=$('#lrf-analysis-root');root?.classList.add('loading');load().finally(()=>root?.classList.remove('loading'));});}

bind();load();
