import './statistiques-lrf-manuel.js';
import { db } from './firebase.js';
import { collection, onSnapshot, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';
import { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-data.js';
import { MI_JUIN_2025_STATS } from './statistiques-mi-juin-2025-data.js';
import { FIN_2025_STATS } from './statistiques-fin-2025-data.js';
import { RANDAL_FIN_2025_STATS } from './statistiques-randal-fin-2025-data.js';
import { STATS_PERIODS } from './statistiques-periods.js';

const JEROME_DEPTS=new Set(['11','30','34','66']);
const SETTINGS_KEY='lrf-commission-rates-v1';
let clients=[];
let rates={};

const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(n||0));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(sarl|sasu|sas|sa|eurl|societe|etablissement|ets|sci)\b/g,'').replace(/[^a-z0-9]/g,'');
const clean=v=>String(v||'').trim();
function currentPartner(){return document.querySelector('.partner-tab.active')?.dataset.partner||'elios-ceramica'}
function currentMode(){return document.getElementById('stats-period-type')?.value||'month'}
function currentPeriodKey(){
  const partner=currentPartner();if(partner==='all'||currentMode()==='range')return '';
  if(currentMode()==='annual'){
    const year=Number(document.getElementById('stats-year')?.value||0),ps=STATS_PERIODS[partner]?.periods||{};
    return Object.entries(ps).filter(([,p])=>Number(p.y)===year&&Number(p.m)===12).sort((a,b)=>a[0].localeCompare(b[0])).at(-1)?.[0]||'';
  }
  return document.getElementById('stats-month')?.value||'';
}
function info(){const partner=currentPartner();return partner==='all'?null:STATS_PERIODS[partner]||null}
function period(){return info()?.periods?.[currentPeriodKey()]||null}
function flattenCodes(v){if(Array.isArray(v))return v.flatMap(flattenCodes);const s=clean(v);return s?[s]:[]}
function factoryCodes(c,partner){
  if(!c)return [];
  const vals=[];
  if(partner==='elios-ceramica')vals.push(c.codeElios,c.numeroClientElios,c.eliosCode);
  if(partner==='view-ceramica')vals.push(c.codeView,c.numeroClientView,c.viewCode);
  vals.push(c.codesPartenaires?.[partner],c.numerosPartenaires?.[partner],c.codesPartenairesMulti?.[partner]);
  return [...new Set(flattenCodes(vals))];
}
function rowCode(r){return String(r.factory||r.elios||'').trim()}
function matchClient(r,partner){
  const code=rowCode(r);
  let c=code?clients.find(x=>factoryCodes(x,partner).includes(code)):null;
  if(c)return c;
  const k=norm(r.name);if(k.length<5)return null;
  const found=clients.filter(x=>{const n=norm(x.societe||x.nomSociete||x.nom);return n===k||(n.length>=6&&k.length>=6&&(n.startsWith(k)||k.startsWith(n)))});
  if(found.length===1)return found[0];
  if(r.dept&&found.length>1){const d=String(r.dept).toUpperCase();const same=found.filter(x=>dept(x)===d);if(same.length===1)return same[0];}
  return null;
}
function dept(c,r=null){
  let d='';
  if(c){d=String(c.departement||c.department||c.dept||'').trim().toUpperCase();if(!d){const cp=String(c.codePostal||c.cp||c.postalCode||'').trim();if(/^\d{5}$/.test(cp))d=cp.slice(0,2);}}
  if(!d&&r?.dept)d=String(r.dept).trim().toUpperCase();
  if(/^\d$/.test(d))d='0'+d;
  return d;
}
function detailRows(partner,key){
  if(key==='2025-06')return MI_JUIN_2025_STATS[partner]||[];
  if(key==='2025-12'){
    if(partner==='randal-pro')return RANDAL_FIN_2025_STATS;
    return FIN_2025_STATS[partner]||[];
  }
  if(partner==='elios-ceramica'&&key==='2026-07')return ELIOS_STATS_CLIENTS.map(r=>({...r,factory:r.elios}));
  if(partner==='view-ceramica'&&key==='2026-07')return VIEW_STATS_CLIENTS_2026_07;
  return [];
}
function rowCurrentValue(r,p){const y=Number(p?.y||2026);return Number(r[`ca${y}`]??r.ca2026??0)}
function loadLocal(){try{rates=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}}catch{rates={}}}
async function loadRemote(){
  try{const snap=await getDoc(doc(db,'parametres','statistiques-commissions'));if(snap.exists()){rates={...rates,...(snap.data().rates||{})};localStorage.setItem(SETTINGS_KEY,JSON.stringify(rates));render();}}catch(e){console.warn('Taux commissions: stockage local utilisé',e)}
}
async function saveRate(partner,value){
  rates[partner]=value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(rates));render();
  try{await setDoc(doc(db,'parametres','statistiques-commissions'),{rates,updatedAt:new Date().toISOString()},{merge:true});setStatus('Taux enregistré');}
  catch(e){console.warn(e);setStatus('Taux enregistré sur cet appareil');}
}
function setStatus(txt){const el=document.getElementById('commission-save-status');if(!el)return;el.textContent=txt;clearTimeout(setStatus.t);setStatus.t=setTimeout(()=>el.textContent='',2200)}
function ensureUI(){
  if(document.getElementById('commission-panel'))return;
  const kpis=document.getElementById('stats-kpis');if(!kpis)return;
  const s=document.createElement('style');s.textContent=`
    .commission-panel{background:#111;color:#fff;border:1px solid #D4AF37;border-radius:12px;padding:1rem;margin:0 0 1.2rem}.commission-head{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap}.commission-head h2{margin:0;color:#FFD700;font-size:1.05rem}.commission-head p{margin:.25rem 0 0;color:#ddd;font-size:.78rem}.commission-rate{display:flex;align-items:flex-end;gap:.45rem}.commission-rate label{display:flex;flex-direction:column;gap:.25rem;color:#ddd;font-size:.68rem;font-weight:700;text-transform:uppercase}.commission-rate input{width:92px;min-height:38px;border:1px solid #D4AF37;border-radius:8px;padding:.45rem .55rem;font:inherit;font-weight:800}.commission-rate button{min-height:38px;border:0;border-radius:8px;background:#D4AF37;color:#111;padding:.45rem .8rem;font-weight:800;cursor:pointer}.commission-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem;margin-top:.85rem}.commission-card{background:#fff;color:#111;border-radius:9px;padding:.75rem}.commission-card small{display:block;color:#777;font-size:.67rem;text-transform:uppercase;font-weight:800}.commission-card strong{display:block;font-size:1.05rem;margin-top:.2rem}.commission-card em{display:block;color:#777;font-style:normal;font-size:.67rem;margin-top:.2rem}.commission-warning{margin-top:.7rem;color:#f2d98f;font-size:.75rem}.commission-status{font-size:.7rem;color:#bfe8c9;min-height:1em}@media(max-width:760px){.commission-cards{grid-template-columns:1fr 1fr}.commission-rate{width:100%}.commission-rate label{flex:1}.commission-rate input{width:100%;box-sizing:border-box}}@media(max-width:420px){.commission-cards{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
  const panel=document.createElement('section');panel.id='commission-panel';panel.className='commission-panel';panel.innerHTML=`<div class="commission-head"><div><h2>💶 Commissions</h2><p>Calcul automatique sur le chiffre d’affaires de la période choisie.</p></div><div class="commission-rate"><label>Taux usine (%)<input id="commission-rate" type="number" min="0" max="100" step="0.01" placeholder="Ex. 5"></label><button id="commission-save" type="button">Enregistrer</button></div></div><div id="commission-save-status" class="commission-status"></div><div id="commission-cards" class="commission-cards"></div><div id="commission-warning" class="commission-warning"></div>`;
  kpis.insertAdjacentElement('afterend',panel);
  document.getElementById('commission-save').addEventListener('click',()=>{const v=Number(document.getElementById('commission-rate').value);if(!Number.isFinite(v)||v<0||v>100){setStatus('Taux invalide');return;}saveRate(currentPartner(),v)});
}
function render(){
  ensureUI();
  const panel=document.getElementById('commission-panel');if(!panel)return;
  const partner=currentPartner(),mode=currentMode(),p=period();
  if(partner==='all'||mode==='range'||!p){panel.style.display='none';return;}panel.style.display='block';
  const rate=Number(rates[partner]||0),input=document.getElementById('commission-rate');if(document.activeElement!==input)input.value=rate||'';
  const total=Number(p.ca||0),rows=detailRows(partner,currentPeriodKey());
  let j=0,c=0,u=0;
  for(const r of rows){const ca=rowCurrentValue(r,p),cl=matchClient(r,partner),d=dept(cl,r);if(!d)u+=ca;else if(JEROME_DEPTS.has(d))j+=ca;else c+=ca;}
  const cards=[['CA période',euro(total),`${p.label}`],['Commission totale',euro(total*rate/100),rate?`${rate.toFixed(2).replace('.',',')} %`:'Saisis le taux usine']];
  if(rows.length){cards.push(['Commission Jérôme',euro(j*rate/100),`CA attribué : ${euro(j)}`],['Commission Coryne',euro(c*rate/100),`CA attribué : ${euro(c)}`]);}
  document.getElementById('commission-cards').innerHTML=cards.map(x=>`<div class="commission-card"><small>${x[0]}</small><strong>${x[1]}</strong><em>${x[2]}</em></div>`).join('');
  const warning=document.getElementById('commission-warning');
  if(p.incomplete&&!rows.length)warning.textContent='Année incomplète : commission globale calculée sur le CA disponible uniquement. Le détail client complet n’est pas disponible pour cette période.';
  else if(!rows.length)warning.textContent='Le total usine permet de calculer la commission globale, mais cette période ne contient pas assez de détail client pour séparer Jérôme et Coryne.';
  else if(u>0)warning.textContent=`${euro(u)} de CA reste à attribuer car certains clients n’ont pas encore de département dans le CRM.`;
  else warning.textContent='Répartition Jérôme / Coryne complète pour cette période.';
}
function observeUI(){
  document.addEventListener('click',e=>{if(e.target.closest('.partner-tab'))setTimeout(render,50)});
  document.addEventListener('change',e=>{if(e.target.matches('#stats-month,#stats-year,#stats-period-type,#stats-date-from,#stats-date-to'))setTimeout(render,20)});
}
function init(){loadLocal();ensureUI();observeUI();onSnapshot(collection(db,'clients'),snap=>{clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));render();});loadRemote();render();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();