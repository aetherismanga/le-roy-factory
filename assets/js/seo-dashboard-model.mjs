export const SITE='sc-domain:leroyfactory.fr';
export const TRACKING_START='2026-10-31';
export const isDate=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
};
const number=value=>Number.isFinite(Number(value))&&Number(value)>=0?Number(value):0;

export function normalizeDaily(rows=[]){
  const byDate=new Map();
  for(const row of rows){
    const date=row.date||row.keys?.[0];
    if(!isDate(date))continue;
    const clicks=number(row.clicks),impressions=number(row.impressions);
    byDate.set(date,{date,clicks,impressions,ctr:impressions?clicks/impressions:0,position:impressions?number(row.position):null});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function mergeDaily(previous=[],fresh=[]){return normalizeDaily([...previous,...fresh]);}
export function totals(rows=[]){
  let clicks=0,impressions=0,weightedPosition=0;
  for(const row of rows){clicks+=number(row.clicks);impressions+=number(row.impressions);weightedPosition+=number(row.position)*number(row.impressions);}
  return {clicks,impressions,ctr:impressions?clicks/impressions:0,position:impressions?weightedPosition/impressions:null,days:rows.length};
}
export function shiftDate(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function selectedRows(daily,period='since',trackingStart=TRACKING_START){
  const all=normalizeDaily(daily);if(!all.length)return [];
  const end=all.at(-1).date;
  const start=period==='all'?all[0].date:period==='since'?trackingStart:shiftDate(end,-Math.max(0,Number(period)-1));
  return all.filter(row=>row.date>=start&&row.date<=end);
}
export function comparePeriods(daily,selected){
  if(!selected.length)return null;
  const start=selected[0].date,end=selected.at(-1).date;
  const span=Math.round((new Date(end+'T12:00:00Z')-new Date(start+'T12:00:00Z'))/86400000)+1;
  const previousStart=shiftDate(start,-span),previousEnd=shiftDate(start,-1);
  const rows=normalizeDaily(daily).filter(r=>r.date>=previousStart&&r.date<=previousEnd);
  // A partial predecessor must not be presented as a comparable full period.
  if(rows.length!==span||rows[0]?.date!==previousStart||rows.at(-1)?.date!==previousEnd)return null;
  return {start:previousStart,end:previousEnd,...totals(rows)};
}
export function changePercent(current,previous){return previous>0?(current-previous)/previous:null;}
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const TERRITORIES=[
 {id:'montpellier',name:'Montpellier',terms:['montpellier','vendargues','castelnau','lattes','baillargues']},
 {id:'toulon',name:'Toulon',terms:['toulon','la garde','la valette','hyeres']},
 {id:'marseille',name:'Marseille',terms:['marseille','aix-en-provence','aubagne']},
 {id:'nice',name:'Nice',terms:['nice','antibes','cannes']},
 {id:'toulouse',name:'Toulouse',terms:['toulouse','haute-garonne']},
 {id:'corse',name:'Corse',terms:['corse','ajaccio','bastia','porto-vecchio','calvi']},
 {id:'paca',name:'PACA · requêtes régionales',terms:['paca','provence','cote d’azur',"cote d'azur"]},
 {id:'occitanie',name:'Occitanie · requêtes régionales',terms:['occitanie','languedoc','roussillon']}
];
export function territoryRows(queries=[]){
 return TERRITORIES.map(t=>{const rows=queries.filter(r=>t.terms.some(term=>fold(r.query||r.keys?.[0]).includes(fold(term))));return {...t,...totals(rows),queries:rows.length};});
}
export function audienceRows(pages=[]){
 return [['particuliers','Particuliers'],['professionnels','Professionnels'],['architectes','Architectes']].map(([id,name])=>{
  const rows=pages.filter(r=>String(r.page||r.keys?.[0]).includes('carrelage-'+id+'.html'));return {id,name,...totals(rows),hasData:rows.length>0};
 });
}
export function chartSeries(rows,metric='impressions'){
 const daily=normalizeDaily(rows);if(!daily.length)return [];
 const byDate=new Map(daily.map(r=>[r.date,r]));const result=[];
 for(let date=daily[0].date;date<=daily.at(-1).date;date=shiftDate(date,1)){
  const row=byDate.get(date);result.push({date,value:row&&Number.isFinite(row[metric])?row[metric]:null});
 }
 return result;
}
export function csvCell(value){const s=String(value??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';}
export function dailyCSV(rows){return '\uFEFF'+['Date;Clics;Affichages Google;Taux de clic;Position moyenne',...normalizeDaily(rows).map(r=>[r.date,r.clicks,r.impressions,r.ctr,r.position??''].map(csvCell).join(';'))].join('\r\n');}
