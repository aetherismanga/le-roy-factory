import { db } from './firebase.js';
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';
import { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-data.js';
import { MI_JUIN_2025_STATS } from './statistiques-mi-juin-2025-data.js';
import { FIN_2025_STATS } from './statistiques-fin-2025-data.js';
import { RANDAL_FIN_2025_STATS } from './statistiques-randal-fin-2025-data.js';
import { STATS_PERIODS } from './statistiques-periods.js';

const PARTNERS=[
  ['elios-ceramica','ELIOS CERAMICA'],['view-ceramica','VIEW CERAMICA'],['la-fenice','LA FENICE'],
  ['reviglass','REVIGLASS'],['biopietra','BIOPIETRA'],['petracers',"PETRACER'S"],
  ['pecchioli-firenze','PECCHIOLI FIRENZE'],['bulbo','BULBO'],['randal-pro','RANDAL PRO'],
  ['floor-italia','FLOOR ITALIA'],['propamsa','PROPAMSA'],['cermed','CERMED'],
  ['neobath','NEOBATH'],['koibath','KOIBATH'],['aquahome','AQUAHOME'],['opal','OPAL'],['bilt','BILT']
];
const PARTNER_NAMES=Object.fromEntries(PARTNERS);
const JEROME_DEPTS=new Set(['11','30','34','66']);
const MONTHS=['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

let crmClients=[];
let currentPartner='elios-ceramica';
let currentPeriodKey='';
let selectedYear=null;
let periodMode='annual';
let activeCodesEditor=null;

const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n||0));
const num=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n||0));
const pct=v=>v==null?'Nouveau':`${v>=0?'+':''}${(v*100).toFixed(1).replace('.',',')} %`;
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(sarl|sasu|sas|sa|eurl|societe|etablissement|ets|sci)\b/g,'').replace(/[^a-z0-9]/g,'');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function partnerPeriods(partner){return STATS_PERIODS[partner]?.periods||{}}
function aggregatePeriods(){
  const out={};
  for(const [partner] of PARTNERS){
    for(const [key,p] of Object.entries(partnerPeriods(partner))){
      if(!out[key])out[key]={...p,ca:0,prev:0,contributors:[],label:`Tous partenaires — ${p.label}`};
      out[key].ca+=Number(p.ca||0);
      out[key].prev+=Number(p.prev||0);
      out[key].contributors.push(partner);
    }
  }
  return out;
}
function periods(){return currentPartner==='all'?aggregatePeriods():partnerPeriods(currentPartner)}
function partnerInfo(){
  if(currentPartner==='all')return {name:'TOUS LES PARTENAIRES',numberLabel:'Codes usine',periods:periods()};
  return STATS_PERIODS[currentPartner]||null;
}
function periodKeys(){return Object.keys(periods()).sort()}
function availableYears(){return [...new Set(Object.values(periods()).map(p=>Number(p.y)).filter(Boolean))].sort((a,b)=>b-a)}
function latestYear(){return availableYears()[0]||new Date().getFullYear()}
function periodEndDate(key,p){
  if(p?.dateTo)return p.dateTo;
  const y=Number(p?.y||key.slice(0,4)),m=Number(p?.m||key.slice(5,7));
  const label=String(p?.label||'').toLowerCase();
  if(label.includes('mi-juin'))return `${y}-06-15`;
  if(label.includes('au 1er juin'))return `${y}-06-01`;
  return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`;
}
function dayBefore(iso){const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)}
function frDate(iso){if(!iso)return '';const [y,m,d]=iso.split('-');return `${d}/${m}/${y}`}
function exactPeriodKeyByEnd(partner,year,date){
  const ps=partner==='all'?aggregatePeriods():partnerPeriods(partner);
  return Object.entries(ps).find(([,p])=>Number(p.y)===Number(year)&&periodEndDate('',p)===date)?.[0]||'';
}

function resolveRangeForPartner(partner){
  const from=document.getElementById('stats-date-from')?.value||'';
  const to=document.getElementById('stats-date-to')?.value||'';
  if(!from||!to||from>to||Number(from.slice(0,4))!==Number(to.slice(0,4)))return null;
  const y=Number(to.slice(0,4));
  const ps=partnerPeriods(partner);
  const endKey=Object.entries(ps).find(([,p])=>Number(p.y)===y&&periodEndDate('',p)===to)?.[0]||'';
  if(!endKey)return null;
  let baseKey='';
  if(from!==`${y}-01-01`){
    const baseDate=dayBefore(from);
    baseKey=Object.entries(ps).find(([,p])=>Number(p.y)===y&&periodEndDate('',p)===baseDate)?.[0]||'';
    if(!baseKey)return null;
  }
  const end=ps[endKey],base=baseKey?ps[baseKey]:null;
  return {
    partner,endKey,baseKey,y,
    ca:Number(end.ca||0)-Number(base?.ca||0),
    prev:Number(end.prev||0)-Number(base?.prev||0)
  };
}
function currentRange(){
  if(periodMode!=='range')return null;
  const from=document.getElementById('stats-date-from')?.value||'',to=document.getElementById('stats-date-to')?.value||'';
  if(!from||!to)return null;
  const targets=currentPartner==='all'?PARTNERS.map(x=>x[0]):[currentPartner];
  const parts=targets.map(resolveRangeForPartner).filter(Boolean);
  if(!parts.length)return null;
  return {
    y:Number(to.slice(0,4)),m:Number(to.slice(5,7)),label:`Du ${frDate(from)} au ${frDate(to)}`,
    ca:parts.reduce((s,x)=>s+x.ca,0),prev:parts.reduce((s,x)=>s+x.prev,0),
    contributors:parts.map(x=>x.partner),rangeParts:parts
  };
}
function currentPeriod(){
  if(periodMode==='range')return currentRange();
  return periods()[currentPeriodKey]||null;
}

function detailRowsFor(partner,key){
  if(key==='2025-06')return (MI_JUIN_2025_STATS[partner]||[]).map(r=>({...r,partner}));
  if(key==='2025-12'){
    if(partner==='randal-pro')return RANDAL_FIN_2025_STATS.map(r=>({...r,partner}));
    return (FIN_2025_STATS[partner]||[]).map(r=>({...r,partner}));
  }
  if(partner==='elios-ceramica'&&key==='2026-07')return ELIOS_STATS_CLIENTS.map(r=>({...r,factory:r.elios,partner}));
  if(partner==='view-ceramica'&&key==='2026-07')return VIEW_STATS_CLIENTS_2026_07.map(r=>({...r,partner}));
  return [];
}
function rowValuesForYear(r,y){
  const current=Number(r[`ca${y}`]??(y===2026?r.ca2026:0)??0);
  const previous=Number(r[`ca${y-1}`]??(y===2026?r.ca2025:0)??0);
  return {current,previous};
}
function subtractDetailRows(partner,endKey,baseKey,y){
  const end=detailRowsFor(partner,endKey),base=baseKey?detailRowsFor(partner,baseKey):[];
  if(!end.length)return [];
  const keyOf=r=>`${String(r.factory||r.elios||'').trim()}|${norm(r.name)}`;
  const baseMap=new Map(base.map(r=>[keyOf(r),r]));
  return end.map(r=>{
    const b=baseMap.get(keyOf(r));
    const ev=rowValuesForYear(r,y),bv=b?rowValuesForYear(b,y):{current:0,previous:0};
    const cur=ev.current-bv.current,prev=ev.previous-bv.previous;
    return {...r,[`ca${y}`]:cur,[`ca${y-1}`]:prev,evolution:prev?((cur-prev)/prev):(cur>0?null:0),partner};
  });
}
function detailRows(){
  const p=currentPeriod();if(!p)return [];
  if(periodMode==='range'){
    return (p.rangeParts||[]).flatMap(x=>subtractDetailRows(x.partner,x.endKey,x.baseKey,p.y));
  }
  if(currentPartner==='all'){
    const contributors=p.contributors||PARTNERS.map(x=>x[0]).filter(partner=>partnerPeriods(partner)[currentPeriodKey]);
    return contributors.flatMap(partner=>detailRowsFor(partner,currentPeriodKey));
  }
  return detailRowsFor(currentPartner,currentPeriodKey);
}

function flattenCodes(v){
  if(Array.isArray(v))return v.flatMap(flattenCodes);
  if(v==null)return [];
  const s=String(v).trim();return s?[s]:[];
}
function clientFactoryCodes(c,partner){
  if(!c||!partner||partner==='all')return [];
  const vals=[];
  if(partner==='elios-ceramica')vals.push(c.codeElios,c.numeroClientElios,c.eliosCode);
  if(partner==='view-ceramica')vals.push(c.codeView,c.numeroClientView,c.viewCode);
  vals.push(c.codesPartenaires?.[partner],c.numerosPartenaires?.[partner],c.codesPartenairesMulti?.[partner]);
  return [...new Set(flattenCodes(vals).map(x=>x.trim()).filter(Boolean))];
}
function rowFactoryCode(r){return String(r.factory||r.elios||'').trim()}
function matchClient(sale){
  const partner=sale.partner||currentPartner;
  const factory=rowFactoryCode(sale);
  let c=factory?crmClients.find(x=>clientFactoryCodes(x,partner).some(code=>code===factory)):null;
  if(c)return c;
  const k=norm(sale.name);if(k.length<5)return null;
  const candidates=crmClients.filter(x=>{const n=norm(x.societe||x.nomSociete||x.nom);return n===k||(n.length>=6&&k.length>=6&&(n.startsWith(k)||k.startsWith(n)))});
  if(candidates.length===1)return candidates[0];
  if(sale.dept&&candidates.length>1){
    const d=String(sale.dept).toUpperCase();
    const same=candidates.filter(x=>departmentOf(x)===d);
    if(same.length===1)return same[0];
  }
  return null;
}
function departmentOf(c,sale=null){
  let d='';
  if(c){
    d=String(c.departement||c.department||c.dept||'').trim().toUpperCase();
    if(!d){
      const cp=String(c.codePostal||c.cp||c.postalCode||'').trim().toUpperCase();
      if(/^20[01]/.test(cp))d=cp.startsWith('200')?'2A':'2B';
      else if(/^\d{5}$/.test(cp))d=cp.slice(0,2);
    }
  }
  if(!d&&sale?.dept)d=String(sale.dept).trim().toUpperCase();
  if(/^\d$/.test(d))d='0'+d;
  return d;
}
function ownerOf(c,sale=null){const d=departmentOf(c,sale);if(!d)return 'unknown';return JEROME_DEPTS.has(d)?'jerome':'coryne'}
function ownerLabel(c,sale=null){const o=ownerOf(c,sale);return o==='jerome'?'Jérôme':o==='coryne'?'Coryne':'À compléter'}

function values(r){
  if(r._grouped)return {current:r.current,previous:r.previous,evolution:r.evolution};
  const y=currentPeriod()?.y||2026;
  const {current,previous}=rowValuesForYear(r,y);
  const evolution=r.evolution!=null?r.evolution:(previous?((current-previous)/previous):null);
  return {current,previous,evolution};
}
function statusOf(r){const v=values(r);if(v.current<=0&&v.previous>0)return 'stop';if(v.previous===0&&v.current>0)return 'new';if((v.evolution??0)>0)return 'up';return 'down'}

function groupedRows(){
  const map=new Map();
  for(const r of detailRows()){
    const partner=r.partner||currentPartner;
    const c=matchClient(r),v=values(r);
    const code=rowFactoryCode(r);
    const key=c?`client:${c.id}`:`raw:${partner}:${code||norm(r.name)}`;
    if(!map.has(key))map.set(key,{_grouped:true,key,client:c,name:c?.societe||r.name,current:0,previous:0,codes:[],partners:new Set(),sourceRows:[],dept:departmentOf(c,r)});
    const g=map.get(key);
    g.current+=v.current;g.previous+=v.previous;g.sourceRows.push(r);g.partners.add(partner);
    if(code&&!g.codes.some(x=>x.partner===partner&&x.code===code))g.codes.push({partner,code});
    if(!g.dept)g.dept=departmentOf(c,r);
  }
  return [...map.values()].map(g=>({...g,evolution:g.previous?((g.current-g.previous)/g.previous):(g.current>0?null:0)}));
}

function allCodesForGroup(g){
  const entries=[...g.codes];
  if(g.client){
    for(const partner of g.partners){
      for(const code of clientFactoryCodes(g.client,partner)){
        if(!entries.some(x=>x.partner===partner&&x.code===code))entries.push({partner,code});
      }
    }
  }
  return entries;
}
function factoryCodesHtml(g){
  const entries=allCodesForGroup(g);
  if(!entries.length)return '<span class="muted-code">—</span>';
  if(!g.client)return entries.map(x=>`<span class="stats-code-plain">${esc(x.code)}</span>`).join('<br>');
  const byPartner=new Map();
  for(const e of entries){if(!byPartner.has(e.partner))byPartner.set(e.partner,[]);byPartner.get(e.partner).push(e.code)}
  return [...byPartner.entries()].map(([partner,codes])=>{
    const label=currentPartner==='all'?`${PARTNER_NAMES[partner]||partner} : ${codes.join(' · ')}`:codes.join(' · ');
    return `<button type="button" class="stats-code-edit" data-edit-codes-client="${esc(g.client.id)}" data-edit-codes-partner="${esc(partner)}" title="Cliquer pour ajouter ou modifier des codes magasin">${esc(label)} <span>✎</span></button>`;
  }).join('');
}

function lrfEditor(c){
  if(!c)return '<span class="muted-code">—</span>';
  if(c.codeClient)return `<strong class="lrf-code">${esc(c.codeClient)}</strong>`;
  return `<div class="lrf-edit"><input type="text" maxlength="30" placeholder="Code LRF" data-lrf-input="${esc(c.id)}"><button type="button" class="lrf-save" data-save-lrf="${esc(c.id)}" title="Enregistrer">✓</button></div>`;
}
function rowMeta(g){
  const c=g.client,r=g.sourceRows[0];
  const d=g.dept||departmentOf(c,r);
  return `${d?`Dép. ${esc(d)} · `:''}${esc(ownerLabel(c,{...r,dept:d}))}`;
}

function renderPartners(){
  const box=document.getElementById('partner-tabs');
  const allPeriods=aggregatePeriods(),allCount=Object.keys(allPeriods).length;
  const tabs=[['all','TOUS LES PARTENAIRES'],...PARTNERS];
  box.innerHTML=tabs.map(([id,name])=>{
    const n=id==='all'?allCount:Object.keys(partnerPeriods(id)).length;
    return `<button class="partner-tab ${id===currentPartner?'active':''}" data-partner="${id}"><span>${name}</span><small>${id==='all'?'Vue globale':(n?`${n} période${n>1?'s':''} disponible${n>1?'s':''}`:'Données à venir')}</small></button>`;
  }).join('');
  box.querySelectorAll('.partner-tab').forEach(b=>b.onclick=()=>{
    currentPartner=b.dataset.partner;
    selectedYear=latestYear();
    periodMode=currentPartner==='all'?'annual':periodMode;
    currentPeriodKey='';
    renderPartners();renderPeriodSelectors();render();
  });
}

function ensureAdvancedPeriodControls(){
  const bar=document.getElementById('stats-period-filters');if(!bar||document.getElementById('stats-period-type'))return;
  const year=document.getElementById('stats-year')?.closest('.filter-block');
  const type=document.createElement('div');type.className='filter-block';type.innerHTML=`<label for="stats-period-type">Type de période</label><select id="stats-period-type"><option value="annual">Année complète</option><option value="month">Au mois / cumul</option><option value="range">De date à date</option></select>`;
  year?.insertAdjacentElement('beforebegin',type);
  const month=document.getElementById('stats-month')?.closest('.filter-block');if(month)month.id='stats-month-block';
  const range=document.createElement('div');range.id='stats-range-block';range.className='stats-range-block';range.innerHTML=`<div class="filter-block"><label for="stats-date-from">Du</label><input id="stats-date-from" type="date"></div><div class="filter-block"><label for="stats-date-to">Au</label><input id="stats-date-to" type="date"></div><button type="button" id="stats-range-apply">Appliquer</button><small>Calcul exact uniquement si les bornes correspondent à des situations importées.</small>`;
  bar.insertAdjacentElement('afterend',range);
  const s=document.createElement('style');s.textContent=`
    .stats-period-filters{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))!important}
    .stats-range-block{display:none;grid-template-columns:1fr 1fr auto;gap:.7rem;align-items:end;background:#fff;border:1px solid #E8E2D7;border-radius:12px;padding:.85rem;margin:-.35rem 0 1rem}
    .stats-range-block input{min-height:42px;border:1px solid #DAD5CB;border-radius:9px;background:#fff;padding:.45rem .65rem;font:inherit}
    .stats-range-block button{min-height:42px;border:0;border-radius:9px;background:#111;color:#FFD700;font-weight:800;padding:.5rem .9rem;cursor:pointer}
    .stats-range-block small{grid-column:1/-1;color:#777;font-size:.72rem}
    .stats-code-edit{display:block;width:100%;text-align:left;border:1px solid #D8C77B;background:#FFFDF6;color:#3d3520;border-radius:7px;padding:.35rem .45rem;margin:.15rem 0;font:inherit;font-size:.72rem;font-weight:800;cursor:pointer}
    .stats-code-edit span{color:#9b7b00}.stats-code-plain{font-size:.74rem}
    .stats-code-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:none;align-items:center;justify-content:center;padding:1rem}
    .stats-code-modal.open{display:flex}.stats-code-dialog{width:min(520px,100%);max-height:85vh;overflow:auto;background:#fff;border-radius:14px;padding:1.1rem;border:1px solid #D4AF37;box-shadow:0 20px 60px rgba(0,0,0,.3)}
    .stats-code-dialog h3{margin:.1rem 0 .3rem}.stats-code-dialog p{margin:.2rem 0 1rem;color:#666;font-size:.82rem}
    .stats-code-row{display:flex;gap:.45rem;margin:.45rem 0}.stats-code-row input{flex:1;min-height:40px;border:1px solid #DAD5CB;border-radius:8px;padding:.5rem .65rem;font:inherit}.stats-code-row button{width:40px;border:1px solid #e6b8b8;background:#fff5f5;color:#a33;border-radius:8px;cursor:pointer}
    .stats-code-actions{display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-top:1rem}.stats-code-actions button{min-height:40px;border-radius:8px;padding:.5rem .8rem;font-weight:800;cursor:pointer}.stats-code-add{background:#fff;border:1px solid #D4AF37}.stats-code-save{background:#111;color:#FFD700;border:0}.stats-code-close{background:#eee;border:0}
    @media(max-width:760px){.stats-range-block{grid-template-columns:1fr 1fr}.stats-range-block button{grid-column:1/-1}}
  `;document.head.appendChild(s);
  document.body.insertAdjacentHTML('beforeend',`<div id="stats-code-modal" class="stats-code-modal"><div class="stats-code-dialog"><h3 id="stats-code-title">Codes magasin</h3><p id="stats-code-help"></p><div id="stats-code-list"></div><div class="stats-code-actions"><button type="button" class="stats-code-add" id="stats-code-add">+ Ajouter un code</button><div><button type="button" class="stats-code-close" id="stats-code-close">Annuler</button> <button type="button" class="stats-code-save" id="stats-code-save">Enregistrer</button></div></div></div></div>`);
}

function annualKeyForYear(year){
  return Object.entries(periods()).filter(([,p])=>Number(p.y)===Number(year)&&Number(p.m)===12).sort((a,b)=>a[0].localeCompare(b[0])).at(-1)?.[0]||'';
}
function monthKeysForYear(year){return Object.entries(periods()).filter(([,p])=>Number(p.y)===Number(year)).sort((a,b)=>Number(a[1].m)-Number(b[1].m)).map(([k])=>k)}
function renderPeriodSelectors(){
  const bar=document.getElementById('stats-period-filters');const info=partnerInfo();
  bar.style.display=info?'grid':'none';if(!info)return;
  const years=availableYears();if(!selectedYear||!years.includes(Number(selectedYear)))selectedYear=years[0]||new Date().getFullYear();
  const yearSelect=document.getElementById('stats-year');
  yearSelect.innerHTML=years.map(y=>`<option value="${y}" ${Number(y)===Number(selectedYear)?'selected':''}>${y}</option>`).join('');
  const type=document.getElementById('stats-period-type');if(type)type.value=periodMode;
  const monthBlock=document.getElementById('stats-month-block'),rangeBlock=document.getElementById('stats-range-block');
  if(monthBlock)monthBlock.style.display=periodMode==='month'?'flex':'none';
  if(rangeBlock)rangeBlock.style.display=periodMode==='range'?'grid':'none';

  if(periodMode==='annual'){
    currentPeriodKey=annualKeyForYear(selectedYear);
  }else if(periodMode==='month'){
    const keys=monthKeysForYear(selectedYear);
    if(!keys.includes(currentPeriodKey))currentPeriodKey=keys.at(-1)||'';
    const month=document.getElementById('stats-month');
    month.innerHTML=keys.map(k=>{const p=periods()[k];return `<option value="${k}" ${k===currentPeriodKey?'selected':''}>${MONTHS[p.m]} — ${esc(p.label)}</option>`}).join('');
  }else{
    currentPeriodKey='';
    const from=document.getElementById('stats-date-from'),to=document.getElementById('stats-date-to');
    if(from&&!from.value)from.value=`${selectedYear}-01-01`;
    if(to&&!to.value){
      const keys=monthKeysForYear(selectedYear),last=keys.at(-1);
      if(last)to.value=periodEndDate(last,periods()[last]);
    }
  }
}

function renderDepartmentOptions(rows=groupedRows()){
  const select=document.getElementById('stats-dept');const current=select.value;
  const deps=[...new Set(rows.map(g=>g.dept).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
  select.innerHTML='<option value="all">Tous les départements</option>'+deps.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');
  if([...select.options].some(o=>o.value===current))select.value=current;
}

function completenessNotice(p){
  if(!p||currentPartner!=='all')return '';
  const contributors=p.contributors||[];
  const year=Number(p.y);
  const withAny=PARTNERS.map(x=>x[0]).filter(id=>Object.values(partnerPeriods(id)).some(x=>Number(x.y)===year));
  const excluded=withAny.filter(id=>!contributors.includes(id));
  if(periodMode==='annual'){
    return `${contributors.length} partenaire${contributors.length>1?'s':''} avec une année complète${excluded.length?` · ${excluded.length} partenaire${excluded.length>1?'s':''} exclu${excluded.length>1?'s':''} car données seulement partielles`:''}.`;
  }
  return `${contributors.length} partenaire${contributors.length>1?'s':''} inclus pour cette période${excluded.length?` · ${excluded.length} sans situation équivalente`:''}.`;
}
function renderKpis(){
  const box=document.getElementById('stats-kpis'),p=currentPeriod();
  if(!p){box.innerHTML='';return}
  const evolution=p.prev?((p.ca-p.prev)/p.prev):null;
  const label=periodMode==='annual'?`CA ${p.y}`:periodMode==='range'?'CA période':`CA cumulé ${p.y}`;
  const cards=[[label,euro(p.ca),pct(evolution),evolution],[`CA ${p.y-1}`,euro(p.prev),'Référence',null]];
  if(p.budget!=null){const gap=p.budget?((p.ca-p.budget)/p.budget):null;cards.push(['Budget',euro(p.budget),pct(gap),gap])}
  if(p.m2!=null){const mv=p.m2Prev?((p.m2-p.m2Prev)/p.m2Prev):null;cards.push(['Volume',`${num(p.m2)} m²`,pct(mv),mv])}
  if(p.pm!=null)cards.push(['Prix moyen',`${Number(p.pm).toFixed(2).replace('.',',')} €/m²`,`${Number(p.pmPrev||0).toFixed(2).replace('.',',')} € en ${p.y-1}`,null]);
  if(currentPartner==='all')cards.push(['Partenaires inclus',String((p.contributors||[]).length),periodMode==='annual'?'Années complètes uniquement':'Même période uniquement',null]);
  box.innerHTML=cards.map(([l,v,s,t])=>`<div class="kpi-card"><span>${l}</span><strong>${v}</strong><small class="${t==null?'neutral':t>=0?'up':'down'}">${s}</small></div>`).join('');
}

function filteredRows(){
  const q=norm(document.getElementById('stats-search')?.value||''),f=document.getElementById('stats-filter')?.value||'all';
  const owner=document.getElementById('stats-owner')?.value||'all',dept=document.getElementById('stats-dept')?.value||'all';
  return groupedRows().filter(g=>{
    const c=g.client,r=g.sourceRows[0],d=g.dept,o=ownerOf(c,{...r,dept:d});
    const codeText=allCodesForGroup(g).map(x=>`${PARTNER_NAMES[x.partner]||x.partner} ${x.code}`).join(' ');
    const text=norm(`${g.name} ${codeText} ${c?.codeClient||''} ${d} ${ownerLabel(c,{...r,dept:d})}`);
    return (!q||text.includes(q))&&(f==='all'||statusOf(g)===f)&&(owner==='all'||o===owner)&&(dept==='all'||d===dept);
  }).sort((a,b)=>b.current-a.current);
}

function renderClients(){
  const tbody=document.getElementById('stats-body'),cards=document.getElementById('stats-mobile-list'),notice=document.getElementById('stats-detail-notice'),p=currentPeriod();
  if(!p){
    tbody.innerHTML='';cards.innerHTML='';document.getElementById('stats-empty').style.display='block';
    notice.style.display='block';
    notice.textContent=periodMode==='range'?'Cette plage ne correspond pas encore à des bornes de statistiques importées. Choisis une date de début et de fin correspondant aux situations disponibles.':'Aucune donnée exacte disponible pour cette sélection.';
    return;
  }
  document.getElementById('stats-empty').style.display='none';
  const grouped=groupedRows();renderDepartmentOptions(grouped);
  const rows=filteredRows(),hasDetail=grouped.length>0;
  const extra=completenessNotice(p);
  notice.style.display=(!hasDetail||extra)?'block':'none';
  notice.textContent=!hasDetail?`Le total est disponible pour ${p.label.toLowerCase()}, mais le détail client n’est pas présent pour cette période.${extra?' '+extra:''}`:extra;
  document.getElementById('stats-result-count').textContent=hasDetail?`${rows.length} client${rows.length>1?'s':''} affiché${rows.length>1?'s':''} · codes magasin regroupés par fiche`:'';
  const y=p.y;
  tbody.innerHTML=rows.map(g=>{
    const c=g.client,st=statusOf(g),ev=pct(g.evolution),r=g.sourceRows[0];
    return `<tr><td><strong>${esc(g.name)}</strong><small>${c?'Associé au CRM':'Non associé au CRM'} · ${rowMeta(g)}</small></td><td>${factoryCodesHtml(g)}</td><td>${lrfEditor(c)}</td><td>${esc(g.dept||'—')}</td><td>${esc(ownerLabel(c,{...r,dept:g.dept}))}</td><td>${euro(g.current)}</td><td>${euro(g.previous)}</td><td><span class="evo ${st}">${ev}</span></td></tr>`;
  }).join('')||(hasDetail?'<tr><td colspan="8" class="no-data">Aucun résultat avec ces filtres</td></tr>':'');
  cards.innerHTML=rows.map(g=>{
    const c=g.client,st=statusOf(g),ev=pct(g.evolution),r=g.sourceRows[0];
    return `<article class="client-stat-card"><div class="client-stat-head"><div><strong>${esc(g.name)}</strong><small>${rowMeta(g)}</small></div><span class="evo ${st}">${ev}</span></div><div class="client-stat-values"><div><small>CA ${y}</small><b>${euro(g.current)}</b></div><div><small>CA ${y-1}</small><b>${euro(g.previous)}</b></div></div><div class="mobile-lrf"><small>Codes usine</small>${factoryCodesHtml(g)}</div><div class="mobile-lrf"><small>Code LRF</small>${lrfEditor(c)}</div></article>`;
  }).join('')||(hasDetail?'<div class="no-data">Aucun résultat avec ces filtres</div>':'');
}

async function saveLRF(clientId,sourceBtn){
  const inputs=[...document.querySelectorAll(`[data-lrf-input="${CSS.escape(clientId)}"]`)],value=inputs.map(i=>i.value.trim()).find(Boolean)||'';
  if(!value){inputs[0]?.focus();return}
  sourceBtn.disabled=true;sourceBtn.textContent='…';
  try{await updateDoc(doc(db,'clients',clientId),{codeClient:value});sourceBtn.textContent='✓'}
  catch(e){console.error(e);sourceBtn.textContent='!';sourceBtn.disabled=false;alert("Impossible d’enregistrer le code LRF.")}
}

function openCodesEditor(clientId,partner){
  const c=crmClients.find(x=>x.id===clientId);if(!c)return;
  activeCodesEditor={clientId,partner};
  document.getElementById('stats-code-title').textContent=`${PARTNER_NAMES[partner]||partner} — ${c.societe||'Client'}`;
  document.getElementById('stats-code-help').textContent='Ajoute un code par magasin. Tous les codes enregistrés ici seront regroupés sur cette même fiche client dans les statistiques.';
  const codes=clientFactoryCodes(c,partner);
  document.getElementById('stats-code-list').innerHTML=(codes.length?codes:['']).map(code=>codeRowHtml(code)).join('');
  document.getElementById('stats-code-modal').classList.add('open');
}
function codeRowHtml(code=''){return `<div class="stats-code-row"><input type="text" value="${esc(code)}" placeholder="Code magasin / code usine"><button type="button" data-remove-code title="Supprimer">×</button></div>`}
function closeCodesEditor(){document.getElementById('stats-code-modal')?.classList.remove('open');activeCodesEditor=null}
async function saveCodesEditor(){
  if(!activeCodesEditor)return;
  const {clientId,partner}=activeCodesEditor;
  const codes=[...new Set([...document.querySelectorAll('#stats-code-list input')].map(i=>i.value.trim()).filter(Boolean))];
  const patch={};
  patch[`codesPartenairesMulti.${partner}`]=codes;
  patch[`codesPartenaires.${partner}`]=codes[0]||'';
  if(partner==='elios-ceramica')patch.codeElios=codes[0]||'';
  if(partner==='view-ceramica')patch.codeView=codes[0]||'';
  const btn=document.getElementById('stats-code-save');btn.disabled=true;btn.textContent='Enregistrement…';
  try{await updateDoc(doc(db,'clients',clientId),patch);closeCodesEditor()}
  catch(e){console.error(e);alert("Impossible d'enregistrer les codes magasin.")}
  finally{btn.disabled=false;btn.textContent='Enregistrer'}
}

function render(){
  const info=partnerInfo(),p=currentPeriod(),available=!!info;
  document.getElementById('stats-title').textContent=available?`${info.name} — ${selectedYear||''}`:PARTNER_NAMES[currentPartner]||'Statistiques';
  document.getElementById('stats-period').textContent=p?(p.label||''):(periodMode==='annual'?'Aucune année complète disponible pour cette sélection.':periodMode==='range'?'Plage personnalisée — données exactes requises.':'Choisis une période disponible.');
  document.getElementById('stats-tools').style.display=available?'flex':'none';
  document.getElementById('stats-sector-tools').style.display=available?'flex':'none';
  document.getElementById('stats-table-wrap').style.display=available?'block':'none';
  document.getElementById('stats-mobile-list').style.display=available?'grid':'none';
  renderKpis();renderClients();
}

function init(){
  if(!localStorage.getItem('agentLoggedIn')){location.href='agent.html';return}
  ensureAdvancedPeriodControls();
  selectedYear=latestYear();
  if(!annualKeyForYear(selectedYear))periodMode='month';
  renderPartners();renderPeriodSelectors();render();

  document.getElementById('stats-year').addEventListener('change',e=>{
    selectedYear=Number(e.target.value);currentPeriodKey='';
    const from=document.getElementById('stats-date-from'),to=document.getElementById('stats-date-to');if(from)from.value='';if(to)to.value='';
    renderPeriodSelectors();render();
  });
  document.getElementById('stats-period-type').addEventListener('change',e=>{periodMode=e.target.value;currentPeriodKey='';renderPeriodSelectors();render()});
  document.getElementById('stats-month').addEventListener('change',e=>{currentPeriodKey=e.target.value;render()});
  document.getElementById('stats-range-apply').addEventListener('click',()=>{const from=document.getElementById('stats-date-from')?.value;if(from)selectedYear=Number(from.slice(0,4));renderPeriodSelectors();render()});
  ['stats-search'].forEach(id=>document.getElementById(id).addEventListener('input',renderClients));
  ['stats-filter','stats-owner','stats-dept'].forEach(id=>document.getElementById(id).addEventListener('change',renderClients));

  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save-lrf]');if(save){saveLRF(save.dataset.saveLrf,save);return}
    const edit=e.target.closest('[data-edit-codes-client]');if(edit){openCodesEditor(edit.dataset.editCodesClient,edit.dataset.editCodesPartner);return}
    if(e.target.closest('[data-remove-code]')){e.target.closest('.stats-code-row')?.remove();return}
    if(e.target.id==='stats-code-add'){document.getElementById('stats-code-list').insertAdjacentHTML('beforeend',codeRowHtml());return}
    if(e.target.id==='stats-code-close'||e.target===document.getElementById('stats-code-modal')){closeCodesEditor();return}
    if(e.target.id==='stats-code-save'){saveCodesEditor();return}
  });

  onSnapshot(collection(db,'clients'),snap=>{
    crmClients=[];snap.forEach(d=>crmClients.push({id:d.id,...d.data()}));
    renderClients();
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
