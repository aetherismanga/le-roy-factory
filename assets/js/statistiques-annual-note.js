import { STATS_PERIODS } from './statistiques-periods.js';

const PARTNERS=[
  ['elios-ceramica','ELIOS CERAMICA'],['view-ceramica','VIEW CERAMICA'],['la-fenice','LA FENICE'],['reviglass','REVIGLASS'],['biopietra','BIOPIETRA'],['petracers',"PETRACER'S"],['pecchioli-firenze','PECCHIOLI FIRENZE'],['bulbo','BULBO'],['randal-pro','RANDAL PRO'],['floor-italia','FLOOR ITALIA'],['propamsa','PROPAMSA'],['cermed','CERMED'],['neobath','NEOBATH'],['koibath','KOIBATH'],['aquahome','AQUAHOME'],['opal','OPAL'],['bilt','BILT']
];
const names=Object.fromEntries(PARTNERS);

function annualEntry(partner,year){
  const ps=STATS_PERIODS[partner]?.periods||{};
  return Object.entries(ps).filter(([,p])=>Number(p.y)===Number(year)&&Number(p.m)===12).sort((a,b)=>a[0].localeCompare(b[0])).at(-1)||null;
}
function noteFor(partner,year){
  const entry=annualEntry(partner,year);
  if(!entry)return {kind:'none',text:`${names[partner]||partner} : aucune donnée ${year}`};
  const p=entry[1];
  if(p.incomplete)return {kind:'partial',text:`${names[partner]||partner} : ${p.availableThroughLabel||p.label}${p.missingLabel?` — manque ${p.missingLabel}`:''}`};
  return {kind:'full',text:`${names[partner]||partner} : année complète`};
}
function refresh(){
  const mode=document.getElementById('stats-period-type')?.value||'';
  const active=document.querySelector('.partner-tab.active')?.dataset.partner||'';
  const year=Number(document.getElementById('stats-year')?.value||0);
  const notice=document.getElementById('stats-detail-notice');
  if(!notice||mode!=='annual'||!year)return;
  const annualOption=document.querySelector('#stats-period-type option[value="annual"]');
  if(annualOption)annualOption.textContent='Année — cumul disponible';
  const notes=active==='all'?PARTNERS.map(([id])=>noteFor(id,year)):[noteFor(active,year)];
  const full=notes.filter(x=>x.kind==='full'),partial=notes.filter(x=>x.kind==='partial'),none=notes.filter(x=>x.kind==='none');
  const blocks=[];
  if(full.length)blocks.push(`Complet : ${full.map(x=>x.text.replace(/ : année complète$/,'')).join(', ')}`);
  if(partial.length)blocks.push(`Incomplet : ${partial.map(x=>x.text).join(' • ')}`);
  if(none.length)blocks.push(`Sans données : ${none.map(x=>x.text.replace(` : aucune donnée ${year}`,'' )).join(', ')}`);
  if(blocks.length){notice.style.display='block';notice.textContent=blocks.join(' | ')}
}
const obs=new MutationObserver(()=>refresh());
obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style']});
document.addEventListener('change',e=>{if(e.target.matches('#stats-year,#stats-period-type,#stats-month'))setTimeout(refresh,0)});
document.addEventListener('click',e=>{if(e.target.closest('.partner-tab'))setTimeout(refresh,30)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,50),{once:true});else setTimeout(refresh,50);
