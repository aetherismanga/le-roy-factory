import { db } from './firebase.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ELIOS_STATS_META, ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';

const PARTNERS=[
  ['elios-ceramica','ELIOS CERAMICA'],['view-ceramica','VIEW CERAMICA'],['la-fenice','LA FENICE'],['reviglass','REVIGLASS'],['biopietra','BIOPIETRA'],['petracers',"PETRACER'S"],['pecchioli-firenze','PECCHIOLI FIRENZE'],['bulbo','BULBO'],['randal-pro','RANDAL PRO'],['neobath','NEOBATH'],['koibath','KOIBATH'],['aquahome','AQUAHOME'],['opal','OPAL'],['bilt','BILT']
];
let crmClients=[];
let currentPartner='elios-ceramica';

const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n||0));
const num=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n||0));
const pct=v=>v==null?'Nouveau':`${v>=0?'+':''}${(v*100).toFixed(1).replace('.',',')} %`;
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(sarl|sasu|sas|sa|eurl|societe|etablissement|ets)\b/g,'').replace(/[^a-z0-9]/g,'');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function clientEliosCode(c){
  return String(c?.codeElios||c?.numeroClientElios||c?.eliosCode||c?.codesPartenaires?.['elios-ceramica']||c?.codesPartenaires?.elios||c?.numerosPartenaires?.['elios-ceramica']||'').trim();
}
function matchClient(sale){
  let c=crmClients.find(x=>clientEliosCode(x)===sale.elios); if(c)return c;
  const k=norm(sale.name); if(k.length<5)return null;
  const candidates=crmClients.filter(x=>{const n=norm(x.societe);return n===k||(n.length>=6&&k.length>=6&&(n.startsWith(k)||k.startsWith(n)))});
  return candidates.length===1?candidates[0]:null;
}

function renderPartners(){
  const box=document.getElementById('partner-tabs');
  box.innerHTML=PARTNERS.map(([id,name])=>`<button class="partner-tab ${id===currentPartner?'active':''}" data-partner="${id}"><span>${name}</span><small>${id==='elios-ceramica'?'Chiffres disponibles':'Données à venir'}</small></button>`).join('');
  box.querySelectorAll('.partner-tab').forEach(b=>b.onclick=()=>{currentPartner=b.dataset.partner;renderPartners();render();});
}

function renderKpis(){
  const box=document.getElementById('stats-kpis');
  if(currentPartner!=='elios-ceramica'){box.innerHTML='';return;}
  const m=ELIOS_STATS_META;
  const cards=[
    ['CA 2026',euro(m.ca2026),pct(m.evolution),m.evolution],
    ['CA 2025',euro(m.ca2025),'Référence',null],
    ['Budget 2026',euro(m.budget2026),pct(m.budgetGap),m.budgetGap],
    ['Volume 2026',`${num(m.m22026)} m²`,pct(m.m2Evolution),m.m2Evolution],
    ['Prix moyen',`${m.pm2026.toFixed(2).replace('.',',')} €/m²`,`${m.pm2025.toFixed(2).replace('.',',')} € en 2025`,null]
  ];
  box.innerHTML=cards.map(([l,v,s,t])=>`<div class="kpi-card"><span>${l}</span><strong>${v}</strong><small class="${t==null?'neutral':t>=0?'up':'down'}">${s}</small></div>`).join('');
}

function statusOf(r){if(r.ca2026<=0&&r.ca2025>0)return 'stop';if(r.ca2025===0&&r.ca2026>0)return 'new';if((r.evolution??0)>0)return 'up';return 'down'}
function filteredRows(){
  const q=norm(document.getElementById('stats-search')?.value||'');
  const f=document.getElementById('stats-filter')?.value||'all';
  return ELIOS_STATS_CLIENTS.filter(r=>{
    const c=matchClient(r); const text=norm(`${r.name} ${r.elios} ${c?.societe||''} ${c?.codeClient||''}`);
    return (!q||text.includes(q))&&(f==='all'||statusOf(r)===f);
  }).sort((a,b)=>b.ca2026-a.ca2026);
}

function renderClients(){
  const tbody=document.getElementById('stats-body');
  const cards=document.getElementById('stats-mobile-list');
  if(currentPartner!=='elios-ceramica'){
    tbody.innerHTML='';cards.innerHTML='';document.getElementById('stats-empty').style.display='block';return;
  }
  document.getElementById('stats-empty').style.display='none';
  const rows=filteredRows();
  document.getElementById('stats-result-count').textContent=`${rows.length} client${rows.length>1?'s':''}`;
  tbody.innerHTML=rows.map(r=>{
    const c=matchClient(r), st=statusOf(r), ev=pct(r.evolution);
    return `<tr><td><strong>${esc(c?.societe||r.name)}</strong><small>${c?'Associé au CRM':'Non associé'}</small></td><td>${esc(r.elios)}</td><td>${esc(c?.codeClient||'—')}</td><td>${euro(r.ca2026)}</td><td>${euro(r.ca2025)}</td><td><span class="evo ${st}">${ev}</span></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="no-data">Aucun résultat</td></tr>';
  cards.innerHTML=rows.map(r=>{
    const c=matchClient(r), st=statusOf(r), ev=pct(r.evolution);
    return `<article class="client-stat-card"><div class="client-stat-head"><div><strong>${esc(c?.societe||r.name)}</strong><small>N° Elios ${esc(r.elios)}${c?.codeClient?` · ${esc(c.codeClient)}`:''}</small></div><span class="evo ${st}">${ev}</span></div><div class="client-stat-values"><div><small>CA 2026</small><b>${euro(r.ca2026)}</b></div><div><small>CA 2025</small><b>${euro(r.ca2025)}</b></div></div></article>`;
  }).join('')||'<div class="no-data">Aucun résultat</div>';
}

function render(){
  const elios=currentPartner==='elios-ceramica';
  document.getElementById('stats-title').textContent=elios?'ELIOS CERAMICA — Ventes 2026':PARTNERS.find(x=>x[0]===currentPartner)?.[1]||'Statistiques';
  document.getElementById('stats-period').textContent=elios?`Du ${ELIOS_STATS_META.period}`:'Les chiffres seront ajoutés dès réception des statistiques.';
  document.getElementById('stats-tools').style.display=elios?'flex':'none';
  document.getElementById('stats-table-wrap').style.display=elios?'block':'none';
  document.getElementById('stats-mobile-list').style.display=elios?'grid':'none';
  renderKpis();renderClients();
}

function init(){
  if(!localStorage.getItem('agentLoggedIn')){location.href='agent.html';return;}
  renderPartners();render();
  document.getElementById('stats-search').addEventListener('input',renderClients);
  document.getElementById('stats-filter').addEventListener('change',renderClients);
  onSnapshot(collection(db,'clients'),snap=>{crmClients=[];snap.forEach(d=>crmClients.push({id:d.id,...d.data()}));renderClients();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
