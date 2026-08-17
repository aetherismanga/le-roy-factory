import { db } from './firebase.js';
import { collection, onSnapshot, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';
import { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-data.js';
import { STATS_PERIODS } from './statistiques-periods.js';

const PARTNERS=[
  ['elios-ceramica','ELIOS CERAMICA'],['view-ceramica','VIEW CERAMICA'],['la-fenice','LA FENICE'],['reviglass','REVIGLASS'],['biopietra','BIOPIETRA'],['petracers',"PETRACER'S"],['pecchioli-firenze','PECCHIOLI FIRENZE'],['bulbo','BULBO'],['randal-pro','RANDAL PRO'],['neobath','NEOBATH'],['koibath','KOIBATH'],['aquahome','AQUAHOME'],['opal','OPAL'],['bilt','BILT']
];
const JEROME_DEPTS=new Set(['11','30','34','66']);
const MONTHS=['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
let crmClients=[];
let currentPartner='elios-ceramica';
let currentPeriodKey='';

const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n||0));
const num=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n||0));
const pct=v=>v==null?'Nouveau':`${v>=0?'+':''}${(v*100).toFixed(1).replace('.',',')} %`;
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(sarl|sasu|sas|sa|eurl|societe|etablissement|ets|sci)\b/g,'').replace(/[^a-z0-9]/g,'');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function partnerInfo(){return STATS_PERIODS[currentPartner]||null}
function periods(){return partnerInfo()?.periods||{}}
function currentPeriod(){return periods()[currentPeriodKey]||null}
function periodKeys(){return Object.keys(periods()).sort()}
function latestPeriodKey(){return periodKeys().at(-1)||''}

function clientFactoryCode(c){
  if(!c)return '';
  if(currentPartner==='elios-ceramica') return String(c.codeElios||c.numeroClientElios||c.eliosCode||c.codesPartenaires?.['elios-ceramica']||c.codesPartenaires?.elios||c.numerosPartenaires?.['elios-ceramica']||'').trim();
  if(currentPartner==='view-ceramica') return String(c.codeView||c.numeroClientView||c.viewCode||c.codesPartenaires?.['view-ceramica']||c.codesPartenaires?.view||c.numerosPartenaires?.['view-ceramica']||'').trim();
  return String(c.codesPartenaires?.[currentPartner]||c.numerosPartenaires?.[currentPartner]||'').trim();
}
function rowFactoryCode(r){return String(r.factory||r.elios||'').trim()}
function matchClient(sale){
  const factory=rowFactoryCode(sale);
  let c=factory?crmClients.find(x=>clientFactoryCode(x)===factory):null;
  if(c)return c;
  const k=norm(sale.name); if(k.length<5)return null;
  const candidates=crmClients.filter(x=>{const n=norm(x.societe||x.nomSociete||x.nom);return n===k||(n.length>=6&&k.length>=6&&(n.startsWith(k)||k.startsWith(n)))});
  return candidates.length===1?candidates[0]:null;
}
function departmentOf(c){
  if(!c)return '';
  let d=String(c.departement||c.department||c.dept||'').trim().toUpperCase();
  if(!d){
    const cp=String(c.codePostal||c.cp||c.postalCode||'').trim().toUpperCase();
    if(/^20[01]/.test(cp)) d=cp.startsWith('200')?'2A':'2B';
    else if(/^\d{5}$/.test(cp)) d=cp.slice(0,2);
  }
  if(/^\d$/.test(d))d='0'+d;
  return d;
}
function ownerOf(c){const d=departmentOf(c);if(!d)return 'unknown';return JEROME_DEPTS.has(d)?'jerome':'coryne'}
function ownerLabel(c){const o=ownerOf(c);return o==='jerome'?'Jérôme':o==='coryne'?'Coryne':'À compléter'}

function detailRows(){
  if(currentPartner==='elios-ceramica'&&currentPeriodKey==='2026-07')return ELIOS_STATS_CLIENTS.map(r=>({...r,factory:r.elios}));
  if(currentPartner==='view-ceramica'&&currentPeriodKey==='2026-07')return VIEW_STATS_CLIENTS_2026_07;
  return [];
}
function values(r){return {current:Number(r.ca2026||0),previous:Number(r.ca2025||0),evolution:r.evolution}}
function statusOf(r){const v=values(r);if(v.current<=0&&v.previous>0)return 'stop';if(v.previous===0&&v.current>0)return 'new';if((v.evolution??0)>0)return 'up';return 'down'}

function renderPartners(){
  const box=document.getElementById('partner-tabs');
  box.innerHTML=PARTNERS.map(([id,name])=>{
    const n=Object.keys(STATS_PERIODS[id]?.periods||{}).length;
    return `<button class="partner-tab ${id===currentPartner?'active':''}" data-partner="${id}"><span>${name}</span><small>${n?`${n} période${n>1?'s':''} disponible${n>1?'s':''}`:'Données à venir'}</small></button>`;
  }).join('');
  box.querySelectorAll('.partner-tab').forEach(b=>b.onclick=()=>{currentPartner=b.dataset.partner;currentPeriodKey=latestPeriodKey();renderPartners();renderPeriodSelectors();render();});
}

function renderPeriodSelectors(){
  const bar=document.getElementById('stats-period-filters');
  const info=partnerInfo();
  bar.style.display=info?'grid':'none';
  if(!info)return;
  if(!currentPeriodKey||!periods()[currentPeriodKey])currentPeriodKey=latestPeriodKey();
  const keys=periodKeys();
  const years=[...new Set(keys.map(k=>periods()[k].y))].sort((a,b)=>b-a);
  const yearSelect=document.getElementById('stats-year');
  const monthSelect=document.getElementById('stats-month');
  const chosen=periods()[currentPeriodKey];
  yearSelect.innerHTML=years.map(y=>`<option value="${y}" ${y===chosen.y?'selected':''}>${y}</option>`).join('');
  const months=keys.map(k=>({key:k,...periods()[k]})).filter(p=>p.y===Number(yearSelect.value||chosen.y)).sort((a,b)=>b.m-a.m);
  monthSelect.innerHTML=months.map(p=>`<option value="${p.key}" ${p.key===currentPeriodKey?'selected':''}>${MONTHS[p.m]}${p.m===12?' / année':''}</option>`).join('');
  if(!months.some(p=>p.key===currentPeriodKey)){currentPeriodKey=months[0]?.key||'';monthSelect.value=currentPeriodKey;}
}

function renderDepartmentOptions(){
  const select=document.getElementById('stats-dept');
  const current=select.value;
  const deps=[...new Set(detailRows().map(r=>departmentOf(matchClient(r))).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
  select.innerHTML='<option value="all">Tous les départements</option>'+deps.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');
  if([...select.options].some(o=>o.value===current))select.value=current;
}

function renderKpis(){
  const box=document.getElementById('stats-kpis');
  const p=currentPeriod();
  if(!p){box.innerHTML='';return;}
  const evolution=p.prev?((p.ca-p.prev)/p.prev):null;
  const cards=[
    [`CA ${p.y}`,euro(p.ca),pct(evolution),evolution],
    [`CA ${p.y-1}`,euro(p.prev),'Référence',null]
  ];
  if(p.budget!=null){const gap=p.budget?((p.ca-p.budget)/p.budget):null;cards.push(['Budget',euro(p.budget),pct(gap),gap]);}
  if(p.m2!=null){const mv=p.m2Prev?((p.m2-p.m2Prev)/p.m2Prev):null;cards.push(['Volume',`${num(p.m2)} m²`,pct(mv),mv]);}
  if(p.pm!=null)cards.push(['Prix moyen',`${Number(p.pm).toFixed(2).replace('.',',')} €/m²`,`${Number(p.pmPrev||0).toFixed(2).replace('.',',')} € en ${p.y-1}`,null]);
  box.innerHTML=cards.map(([l,v,s,t])=>`<div class="kpi-card"><span>${l}</span><strong>${v}</strong><small class="${t==null?'neutral':t>=0?'up':'down'}">${s}</small></div>`).join('');
}

function filteredRows(){
  const q=norm(document.getElementById('stats-search')?.value||'');
  const f=document.getElementById('stats-filter')?.value||'all';
  const owner=document.getElementById('stats-owner')?.value||'all';
  const dept=document.getElementById('stats-dept')?.value||'all';
  return detailRows().filter(r=>{
    const c=matchClient(r), d=departmentOf(c), o=ownerOf(c);
    const text=norm(`${r.name} ${rowFactoryCode(r)} ${c?.societe||''} ${c?.codeClient||''} ${d} ${ownerLabel(c)}`);
    return (!q||text.includes(q))&&(f==='all'||statusOf(r)===f)&&(owner==='all'||o===owner)&&(dept==='all'||d===dept);
  }).sort((a,b)=>values(b).current-values(a).current);
}

function lrfEditor(c){
  if(!c)return '<span class="muted-code">—</span>';
  if(c.codeClient)return `<strong class="lrf-code">${esc(c.codeClient)}</strong>`;
  return `<div class="lrf-edit"><input type="text" maxlength="30" placeholder="Code LRF" data-lrf-input="${esc(c.id)}"><button type="button" class="lrf-save" data-save-lrf="${esc(c.id)}" title="Enregistrer">✓</button></div>`;
}
function rowMeta(c){const d=departmentOf(c);return `${d?`Dép. ${esc(d)} · `:''}${esc(ownerLabel(c))}`}

function renderClients(){
  const tbody=document.getElementById('stats-body');
  const cards=document.getElementById('stats-mobile-list');
  const notice=document.getElementById('stats-detail-notice');
  const p=currentPeriod();
  if(!p){tbody.innerHTML='';cards.innerHTML='';document.getElementById('stats-empty').style.display='block';notice.style.display='none';return;}
  document.getElementById('stats-empty').style.display='none';
  renderDepartmentOptions();
  const all=detailRows();
  const rows=filteredRows();
  const y=p.y;
  notice.style.display=all.length?'none':'block';
  notice.textContent=all.length?'':`Le total usine est disponible pour ${p.label.toLowerCase()}, mais le détail client n’est pas présent dans le fichier exploitable de cette période.`;
  document.getElementById('stats-result-count').textContent=all.length?`${rows.length} client${rows.length>1?'s':''} affiché${rows.length>1?'s':''}`:'';
  tbody.innerHTML=rows.map(r=>{
    const c=matchClient(r), st=statusOf(r), v=values(r), ev=pct(v.evolution);
    return `<tr><td><strong>${esc(c?.societe||r.name)}</strong><small>${c?'Associé au CRM':'Non associé au CRM'} · ${rowMeta(c)}</small></td><td>${esc(rowFactoryCode(r))}</td><td>${lrfEditor(c)}</td><td>${esc(departmentOf(c)||'—')}</td><td>${esc(ownerLabel(c))}</td><td>${euro(v.current)}</td><td>${euro(v.previous)}</td><td><span class="evo ${st}">${ev}</span></td></tr>`;
  }).join('')||(all.length?'<tr><td colspan="8" class="no-data">Aucun résultat avec ces filtres</td></tr>':'');
  cards.innerHTML=rows.map(r=>{
    const c=matchClient(r), st=statusOf(r), v=values(r), ev=pct(v.evolution);
    return `<article class="client-stat-card"><div class="client-stat-head"><div><strong>${esc(c?.societe||r.name)}</strong><small>${esc(partnerInfo()?.numberLabel||'N° usine')} ${esc(rowFactoryCode(r))} · ${rowMeta(c)}</small></div><span class="evo ${st}">${ev}</span></div><div class="client-stat-values"><div><small>CA ${y}</small><b>${euro(v.current)}</b></div><div><small>CA ${y-1}</small><b>${euro(v.previous)}</b></div></div><div class="mobile-lrf"><small>Code LRF</small>${lrfEditor(c)}</div></article>`;
  }).join('')||(all.length?'<div class="no-data">Aucun résultat avec ces filtres</div>':'');
}

async function saveLRF(clientId,sourceBtn){
  const inputs=[...document.querySelectorAll(`[data-lrf-input="${CSS.escape(clientId)}"]`)];
  const value=inputs.map(i=>i.value.trim()).find(Boolean)||'';
  if(!value){inputs[0]?.focus();return;}
  sourceBtn.disabled=true;sourceBtn.textContent='…';
  try{
    await updateDoc(doc(db,'clients',clientId),{codeClient:value});
    sourceBtn.textContent='✓';
  }catch(e){console.error(e);sourceBtn.textContent='!';sourceBtn.disabled=false;alert("Impossible d’enregistrer le code LRF. Réessaie dans quelques secondes.");}
}

function render(){
  const info=partnerInfo(),p=currentPeriod();
  const available=!!info;
  document.getElementById('stats-title').textContent=available?`${info.name} — Ventes ${p?.y||''}`:PARTNERS.find(x=>x[0]===currentPartner)?.[1]||'Statistiques';
  document.getElementById('stats-period').textContent=available?(p?.label||'Choisis une période'):'Les chiffres seront ajoutés dès réception des statistiques.';
  document.getElementById('stats-tools').style.display=available?'flex':'none';
  document.getElementById('stats-sector-tools').style.display=available?'flex':'none';
  document.getElementById('stats-table-wrap').style.display=available?'block':'none';
  document.getElementById('stats-mobile-list').style.display=available?'grid':'none';
  renderKpis();renderClients();
}

function init(){
  if(!localStorage.getItem('agentLoggedIn')){location.href='agent.html';return;}
  currentPeriodKey=latestPeriodKey();
  renderPartners();renderPeriodSelectors();render();
  document.getElementById('stats-year').addEventListener('change',e=>{
    const y=Number(e.target.value);const keys=periodKeys().filter(k=>periods()[k].y===y).sort();currentPeriodKey=keys.at(-1)||'';renderPeriodSelectors();render();
  });
  document.getElementById('stats-month').addEventListener('change',e=>{currentPeriodKey=e.target.value;render();});
  ['stats-search'].forEach(id=>document.getElementById(id).addEventListener('input',renderClients));
  ['stats-filter','stats-owner','stats-dept'].forEach(id=>document.getElementById(id).addEventListener('change',renderClients));
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-save-lrf]');if(btn)saveLRF(btn.dataset.saveLrf,btn);});
  onSnapshot(collection(db,'clients'),snap=>{crmClients=[];snap.forEach(d=>crmClients.push({id:d.id,...d.data()}));renderClients();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
