import './statistiques-lrf-multi.js?v=20260818-1300';
import { db } from './firebase.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';
import { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-data.js';
import { MI_JUIN_2025_STATS } from './statistiques-mi-juin-2025-data.js';
import { FIN_2025_STATS } from './statistiques-fin-2025-data.js';
import { RANDAL_FIN_2025_STATS } from './statistiques-randal-fin-2025-data.js';
import { STATS_PERIODS } from './statistiques-periods.js';

const PARTNERS=[
  ['elios-ceramica','ELIOS CERAMICA'],['view-ceramica','VIEW CERAMICA'],['la-fenice','LA FENICE'],['reviglass','REVIGLASS'],['biopietra','BIOPIETRA'],['petracers',"PETRACER'S"],['pecchioli-firenze','PECCHIOLI FIRENZE'],['bulbo','BULBO'],['randal-pro','RANDAL PRO'],['floor-italia','FLOOR ITALIA'],['propamsa','PROPAMSA'],['cermed','CERMED'],['neobath','NEOBATH'],['koibath','KOIBATH'],['aquahome','AQUAHOME'],['opal','OPAL'],['bilt','BILT']
];
const PARTNER_NAMES=Object.fromEntries(PARTNERS);
const JEROME_DEPTS=new Set(['11','30','34','66']);
let clients=[];
let busyUi=false;

const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(sarl|sasu|sas|sa|eurl|societe|etablissement|ets|sci)\b/g,'').replace(/[^a-z0-9]/g,'');
const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n||0));
const pct=v=>v==null?'Nouveau':`${v>=0?'+':''}${(v*100).toFixed(1).replace('.',',')} %`;

function activePartner(){return document.querySelector('.partner-tab.active')?.dataset.partner||'elios-ceramica'}
function selectedYear(){return Number(document.getElementById('stats-year')?.value||0)}
function hiddenMode(){return document.getElementById('stats-period-type')?.value||'annual'}
function periodMap(partner){return STATS_PERIODS[partner]?.periods||{}}
function byId(id){return clients.find(c=>c.id===id)||null}
function canonicalClient(c){
  let cur=c;const seen=new Set();
  while(cur?.statsParentClientId&&!seen.has(cur.id)){
    seen.add(cur.id);const p=byId(cur.statsParentClientId);if(!p)break;cur=p;
  }
  return cur;
}
function linkedClients(c){const root=canonicalClient(c);return (Array.isArray(root?.statsLinkedClientIds)?root.statsLinkedClientIds:[]).map(byId).filter(Boolean)}
function allLRFCodes(c){
  const root=canonicalClient(c);if(!root)return [];
  const codes=x=>[x?.codeClient,...(Array.isArray(x?.codesLRF)?x.codesLRF:[])].filter(Boolean);
  return [...new Set([...codes(root),...linkedClients(root).flatMap(codes)])];
}
function department(c,row=null){
  let d=String(c?.departement||c?.department||c?.dept||'').trim().toUpperCase();
  if(!d){const cp=String(c?.codePostal||c?.cp||c?.postalCode||'').trim();if(/^20[01]/.test(cp))d=cp.startsWith('200')?'2A':'2B';else if(/^\d{5}$/.test(cp))d=cp.slice(0,2)}
  if(!d&&row?.dept)d=String(row.dept).trim().toUpperCase();if(/^\d$/.test(d))d='0'+d;return d;
}
function ownerFromDept(d){if(!d)return 'unknown';return JEROME_DEPTS.has(d)?'jerome':'coryne'}
function ownerLabel(d){const o=ownerFromDept(d);return o==='jerome'?'Jérôme':o==='coryne'?'Coryne':'À compléter'}
function flatten(v){if(Array.isArray(v))return v.flatMap(flatten);const s=String(v||'').trim();return s?[s]:[]}
function clientFactoryCodes(c,partner){
  if(!c)return [];const vals=[];
  if(partner==='elios-ceramica')vals.push(c.codeElios,c.numeroClientElios,c.eliosCode);
  if(partner==='view-ceramica')vals.push(c.codeView,c.numeroClientView,c.viewCode);
  vals.push(c.codesPartenaires?.[partner],c.numerosPartenaires?.[partner],c.codesPartenairesMulti?.[partner]);return [...new Set(flatten(vals))];
}
function rowFactoryCode(r){return String(r.factory||r.elios||'').trim()}
function matchClient(row,partner){
  const factory=rowFactoryCode(row);
  if(factory){const raw=clients.find(c=>clientFactoryCodes(c,partner).includes(factory));if(raw)return canonicalClient(raw)}
  const k=norm(row.name);if(k.length<4)return null;
  const found=clients.filter(c=>{const n=norm(c.societe||c.nomSociete||c.nom);return n===k||(n.length>=6&&k.length>=6&&(n.startsWith(k)||k.startsWith(n)))});
  if(found.length===1)return canonicalClient(found[0]);
  if(found.length>1&&row.dept){const d=String(row.dept).toUpperCase(),same=found.filter(c=>department(c)===d);if(same.length===1)return canonicalClient(same[0])}
  return null;
}
function rowValues(r,year){const current=Number(r[`ca${year}`]??(year===2026?r.ca2026:0)??0),previous=Number(r[`ca${year-1}`]??(year===2026?r.ca2025:0)??0);return {current,previous,evolution:r.evolution!=null?r.evolution:(previous?((current-previous)/previous):(current>0?null:0))}}
function status(v){if(v.current<=0&&v.previous>0)return 'stop';if(v.previous===0&&v.current>0)return 'new';return (v.evolution??0)>0?'up':'down'}

function annualRowsForPartner(partner,year){
  if(year===2025){
    if(partner==='randal-pro'&&RANDAL_FIN_2025_STATS.length)return RANDAL_FIN_2025_STATS.map(r=>({...r,partner}));
    if((FIN_2025_STATS[partner]||[]).length)return FIN_2025_STATS[partner].map(r=>({...r,partner}));
    if((MI_JUIN_2025_STATS[partner]||[]).length)return MI_JUIN_2025_STATS[partner].map(r=>({...r,partner}));
  }
  if(year===2026){if(partner==='elios-ceramica')return ELIOS_STATS_CLIENTS.map(r=>({...r,factory:r.elios,partner}));if(partner==='view-ceramica')return VIEW_STATS_CLIENTS_2026_07.map(r=>({...r,partner}))}
  return [];
}
function annualSource(partner,year){
  const annual=Object.values(periodMap(partner)).find(p=>Number(p.y)===year&&Number(p.m)===12);if(annual)return annual;
  return Object.values(periodMap(partner)).filter(p=>Number(p.y)===year).sort((a,b)=>Number(a.m)-Number(b.m)).at(-1)||null;
}
function annualRawRows(){const year=selectedYear(),partner=activePartner(),targets=partner==='all'?PARTNERS.map(x=>x[0]):[partner];return targets.flatMap(id=>annualRowsForPartner(id,year))}
function groupedAnnualRows(){
  const year=selectedYear(),map=new Map();
  for(const row of annualRawRows()){
    const partner=row.partner,client=matchClient(row,partner),v=rowValues(row,year),factory=rowFactoryCode(row),key=client?`client:${client.id}`:`raw:${partner}:${factory||norm(row.name)}`;
    if(!map.has(key))map.set(key,{client,name:client?.societe||row.name,current:0,previous:0,codes:[],rows:[],dept:department(client,row)});
    const g=map.get(key);g.current+=v.current;g.previous+=v.previous;g.rows.push(row);if(factory&&!g.codes.some(x=>x.partner===partner&&x.code===factory))g.codes.push({partner,code:factory});if(!g.dept)g.dept=department(client,row);
  }
  return [...map.values()].map(g=>({...g,evolution:g.previous?((g.current-g.previous)/g.previous):(g.current>0?null:0)}));
}
function filteredAnnualRows(){
  const q=norm(document.getElementById('stats-search')?.value||''),f=document.getElementById('stats-filter')?.value||'all',owner=document.getElementById('stats-owner')?.value||'all',dept=document.getElementById('stats-dept')?.value||'all';
  return groupedAnnualRows().filter(g=>{
    const o=ownerFromDept(g.dept),st=status(g),linkedNames=g.client?linkedClients(g.client).map(c=>c.societe||c.nom||'').join(' '):'',text=norm(`${g.name} ${linkedNames} ${g.codes.map(x=>`${PARTNER_NAMES[x.partner]} ${x.code}`).join(' ')} ${g.client?allLRFCodes(g.client).join(' '):''} ${g.dept} ${ownerLabel(g.dept)}`);
    return (!q||text.includes(q))&&(f==='all'||st===f)&&(owner==='all'||o===owner)&&(dept==='all'||g.dept===dept);
  }).sort((a,b)=>b.current-a.current);
}
function factoryHtml(g){if(!g.codes.length)return '<span class="stats-factory-readonly">—</span>';const all=activePartner()==='all';return g.codes.map(x=>`<span class="stats-factory-readonly">${esc(all?`${PARTNER_NAMES[x.partner]||x.partner} : ${x.code}`:x.code)}</span>`).join('')}
function lrfHtml(c){if(!c)return '<span class="muted-code">—</span>';const root=canonicalClient(c),codes=allLRFCodes(root),main=root.codeClient||codes[0]||'Code LRF',more=Math.max(0,codes.length-1);return `<button type="button" class="stats-lrf-multi-btn" data-edit-lrf-client="${esc(root.id)}"><span>${esc(main)}</span>${more?`<span class="stats-lrf-more">+${more}</span>`:''}<span class="edit">✎</span></button>`}
function renderDeptOptions(rows){const sel=document.getElementById('stats-dept');if(!sel)return;const current=sel.value,deps=[...new Set(rows.map(g=>g.dept).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));sel.innerHTML='<option value="all">Tous les départements</option>'+deps.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');if([...sel.options].some(o=>o.value===current))sel.value=current}
function annualNotice(){
  const year=selectedYear(),partner=activePartner(),targets=partner==='all'?PARTNERS.map(x=>x[0]):[partner],used=targets.map(id=>({id,p:annualSource(id,year)})).filter(x=>x.p),full=used.filter(x=>Number(x.p.m)===12&&!x.p.incomplete),partial=used.filter(x=>x.p.incomplete||Number(x.p.m)!==12),none=targets.filter(id=>!used.some(x=>x.id===id));
  const summary=partner==='all'?`${used.length} partenaire${used.length>1?'s':''} inclus — ${full.length} complet${full.length>1?'s':''}, ${partial.length} partiel${partial.length>1?'s':''}.`:(full.length?'Année complète.':partial.length?'Année incomplète : le dernier cumul disponible est affiché.':'Aucune donnée pour cette année.');
  const detail=partial.map(x=>`${PARTNER_NAMES[x.id]} : ${x.p.availableThroughLabel||x.p.label}${x.p.missingLabel?` (manque ${x.p.missingLabel})`:''}`).join(' • ');
  return `${summary}${detail?`<details class="stats-missing-details"><summary>Voir les périodes manquantes</summary><div>${esc(detail)}</div></details>`:''}${none.length?`<div class="stats-no-data-partners">Sans données ${year} : ${esc(none.map(id=>PARTNER_NAMES[id]).join(', '))}</div>`:''}`;
}
function renderAnnualListing(){
  if(hiddenMode()!=='annual')return;const year=selectedYear();if(!year)return;
  const all=groupedAnnualRows();renderDeptOptions(all);const rows=filteredAnnualRows(),tbody=document.getElementById('stats-body'),mobile=document.getElementById('stats-mobile-list');if(!tbody||!mobile)return;
  document.getElementById('stats-empty').style.display=all.length?'none':'block';document.getElementById('stats-table-wrap').style.display=all.length?'block':'none';document.getElementById('stats-result-count').textContent=all.length?`${rows.length} client${rows.length>1?'s':''} affiché${rows.length>1?'s':''}`:'';
  const notice=document.getElementById('stats-detail-notice');if(notice){notice.style.display='block';notice.innerHTML=annualNotice()}
  tbody.innerHTML=rows.map(g=>{const st=status(g),client=g.client;return `<tr><td><strong>${esc(g.name)}</strong><small>${client?'Associé au CRM':'Non associé au CRM'}${g.dept?` · Dép. ${esc(g.dept)}`:''} · ${esc(ownerLabel(g.dept))}</small></td><td data-client-id="${esc(client?.id||'')}">${factoryHtml(g)}</td><td>${lrfHtml(client)}</td><td>${esc(g.dept||'—')}</td><td>${esc(ownerLabel(g.dept))}</td><td>${euro(g.current)}</td><td>${euro(g.previous)}</td><td><span class="evo ${st}">${pct(g.evolution)}</span></td></tr>`}).join('')||(all.length?'<tr><td colspan="8" class="no-data">Aucun résultat avec ces filtres</td></tr>':'');
  mobile.innerHTML=rows.map(g=>{const st=status(g),client=g.client;return `<article class="client-stat-card"><div class="client-stat-head"><div><strong>${esc(g.name)}</strong><small>${g.dept?`Dép. ${esc(g.dept)} · `:''}${esc(ownerLabel(g.dept))}</small></div><span class="evo ${st}">${pct(g.evolution)}</span></div><div class="client-stat-values"><div><small>CA ${year}</small><b>${euro(g.current)}</b></div><div><small>CA ${year-1}</small><b>${euro(g.previous)}</b></div></div><div class="mobile-lrf" data-client-id="${esc(client?.id||'')}"><small>N° usine</small>${factoryHtml(g)}</div><div class="mobile-lrf"><small>Code LRF</small>${lrfHtml(client)}</div></article>`}).join('');
}

function milestoneOptions(partner,year){const ids=partner==='all'?PARTNERS.map(x=>x[0]):[partner],byKey=new Map();for(const id of ids)for(const [key,p] of Object.entries(periodMap(id))){if(Number(p.y)!==year||Number(p.m)===12)continue;if(!byKey.has(key))byKey.set(key,p)}return [...byKey.entries()].sort((a,b)=>Number(a[1].m)-Number(b[1].m))}
function ensureSimplePeriod(){
  const bar=document.getElementById('stats-period-filters'),yearBlock=document.getElementById('stats-year')?.closest('.filter-block');if(!bar||!yearBlock)return;
  const type=document.getElementById('stats-period-type');if(type)type.closest('.filter-block').classList.add('stats-hidden-legacy');const month=document.getElementById('stats-month');if(month)month.closest('.filter-block').classList.add('stats-hidden-legacy');if(document.getElementById('stats-simple-period'))return;
  const block=document.createElement('div');block.className='filter-block stats-simple-period-block';block.innerHTML='<label for="stats-simple-period">Période</label><select id="stats-simple-period"></select>';yearBlock.insertAdjacentElement('afterend',block);document.getElementById('stats-simple-period').addEventListener('change',applySimplePeriod);
}
function rebuildSimplePeriod(){
  ensureSimplePeriod();const sel=document.getElementById('stats-simple-period');if(!sel)return;const year=selectedYear(),partner=activePartner(),milestones=milestoneOptions(partner,year),type=hiddenMode(),hiddenMonth=document.getElementById('stats-month')?.value||'';
  sel.innerHTML=`<option value="annual">Année / cumul disponible</option>${milestones.map(([key,p])=>`<option value="${esc(key)}">${esc(p.label.replace(/^Tous partenaires — /,''))}</option>`).join('')}<option value="custom">Dates personnalisées…</option>`;
  if(type==='range')sel.value='custom';else if(type==='month'&&milestones.some(([k])=>k===hiddenMonth))sel.value=hiddenMonth;else sel.value='annual';
}
function applySimplePeriod(e){
  if(busyUi)return;busyUi=true;const value=e.target.value,type=document.getElementById('stats-period-type');if(!type){busyUi=false;return}
  if(value==='annual'){type.value='annual';type.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{rebuildSimplePeriod();renderAnnualListing();busyUi=false},60);return}
  if(value==='custom'){type.value='range';type.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{rebuildSimplePeriod();busyUi=false},60);return}
  type.value='month';type.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{const month=document.getElementById('stats-month');if(month){month.value=value;month.dispatchEvent(new Event('change',{bubbles:true}))}rebuildSimplePeriod();busyUi=false},60);
}
function normalizeOldAnnualMode(){const type=document.getElementById('stats-period-type'),month=document.getElementById('stats-month');if(!type||!month)return;const selected=month.options[month.selectedIndex]?.textContent||'';if(type.value==='month'&&/année/i.test(selected)){type.value='annual';type.dispatchEvent(new Event('change',{bubbles:true}))}}
function injectStyles(){
  if(document.getElementById('stats-ux-fix-style'))return;const s=document.createElement('style');s.id='stats-ux-fix-style';s.textContent=`
    .partner-tabs{display:flex!important;overflow-x:auto!important;gap:.45rem!important;padding-bottom:.35rem!important;scrollbar-width:thin}.partner-tab{min-width:135px!important;min-height:54px!important;padding:.55rem .7rem!important;border-radius:9px!important}.partner-tab small{font-size:.64rem!important}
    .stats-period-filters{grid-template-columns:minmax(120px,.7fr) minmax(220px,1.5fr) minmax(150px,1fr) minmax(170px,1fr)!important;align-items:end!important;padding:.7rem .8rem!important;gap:.6rem!important}.stats-hidden-legacy{display:none!important}.stats-simple-period-block select{font-weight:700}.stats-range-block{margin-top:-.45rem!important;padding:.65rem .8rem!important}.stats-range-block small{display:none!important}
    .stats-missing-details{margin-top:.45rem}.stats-missing-details summary{cursor:pointer;font-weight:800;color:#6b5a22}.stats-missing-details div{margin-top:.35rem;font-size:.76rem;line-height:1.45}.stats-no-data-partners{margin-top:.35rem;font-size:.74rem;color:#81775d}
    .commission-panel{padding:.7rem .85rem!important;margin-bottom:.85rem!important}.commission-head p{display:none!important}.commission-cards{margin-top:.45rem!important;gap:.5rem!important}.commission-card{padding:.55rem .65rem!important}.commission-warning{margin-top:.45rem!important}.stats-panel{padding:.85rem!important}.stats-panel-head{margin-bottom:.5rem!important}.stats-detail-notice{padding:.65rem .75rem!important;margin-bottom:.6rem!important}
    @media(max-width:900px){.stats-period-filters{grid-template-columns:1fr 1fr!important}}@media(max-width:600px){.stats-period-filters{grid-template-columns:1fr!important}.partner-tab{min-width:125px!important}.commission-cards{grid-template-columns:1fr 1fr!important}}
  `;document.head.appendChild(s);
}
function fixHeadings(){const th=document.querySelector('.stats-table th:nth-child(2)');if(th)th.textContent='N° usine';const intro=document.querySelector('.stats-intro p');if(intro)intro.textContent='Choisis un partenaire, une année et une période. Les données partielles restent incluses et sont signalées.'}
function refreshAfterMain(){setTimeout(()=>{ensureSimplePeriod();normalizeOldAnnualMode();rebuildSimplePeriod();fixHeadings();if(hiddenMode()==='annual')renderAnnualListing()},90)}
function init(){
  injectStyles();ensureSimplePeriod();fixHeadings();document.addEventListener('click',e=>{if(e.target.closest('.partner-tab'))refreshAfterMain()});document.getElementById('stats-year')?.addEventListener('change',refreshAfterMain);document.getElementById('stats-period-type')?.addEventListener('change',refreshAfterMain);document.getElementById('stats-month')?.addEventListener('change',refreshAfterMain);document.getElementById('stats-range-apply')?.addEventListener('click',refreshAfterMain);document.getElementById('stats-search')?.addEventListener('input',()=>{if(hiddenMode()==='annual')setTimeout(renderAnnualListing,0)});['stats-filter','stats-owner','stats-dept'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{if(hiddenMode()==='annual')setTimeout(renderAnnualListing,0)}));
  onSnapshot(collection(db,'clients'),snap=>{clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));refreshAfterMain()});refreshAfterMain();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
