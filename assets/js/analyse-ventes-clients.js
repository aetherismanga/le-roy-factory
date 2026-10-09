import { VIEW_STATS_CLIENTS_2026_08 as current } from './statistiques-view-data.js';
import { VIEW_STATS_CLIENTS_2026_07 as july } from './statistiques-view-juillet-2026-archive.js';
const euro=n=>Number(n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2});
const pct=(a,b)=>!b?(a>0?null:0):(a-b)/b;
const julyByCode=new Map(july.map(x=>[String(x.factory),x]));
const data=current.map(x=>{const old=julyByCode.get(String(x.factory));return {...x,august:old?Number((x.ca2026-old.ca2026).toFixed(2)):null,evo:pct(x.ca2026,x.ca2025)}}).sort((a,b)=>b.ca2026-a.ca2026);
const sum=k=>data.reduce((s,x)=>s+Number(x[k]||0),0);
document.querySelector('#k-ca').textContent=euro(sum('ca2026'));
document.querySelector('#k-prev').textContent=euro(sum('ca2025'));
document.querySelector('#k-active').textContent=data.filter(x=>x.ca2026>0).length;
document.querySelector('#k-month').textContent=euro(data.reduce((s,x)=>s+Number(x.august||0),0));
const rows=document.querySelector('#rows'),empty=document.querySelector('#empty'),search=document.querySelector('#search');
function evoHtml(x){if(x.evo===null)return '<span class="pill">Nouveau</span>';const v=x.evo*100;return '<span class="'+(v>=0?'up':'down')+'">'+(v>=0?'+':'')+v.toLocaleString('fr-FR',{maximumFractionDigits:1})+' %</span>'}
function render(){const q=search.value.trim().toLocaleLowerCase('fr');const list=data.filter(x=>!q||x.name.toLocaleLowerCase('fr').includes(q)||String(x.factory).includes(q));rows.innerHTML=list.map(x=>'<tr><td><strong>'+x.name+'</strong></td><td>'+x.factory+'</td><td class="money">'+euro(x.ca2026)+'</td><td>'+euro(x.ca2025)+'</td><td>'+evoHtml(x)+'</td><td class="money">'+(x.august===null?'—':euro(x.august))+'</td></tr>').join('');empty.hidden=!!list.length}
search.addEventListener('input',render);render();