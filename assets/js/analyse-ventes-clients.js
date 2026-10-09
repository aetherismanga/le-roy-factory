import { db } from './firebase.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { VIEW_STATS_CLIENTS_2026_08 as august } from './statistiques-view-data.js';
import { VIEW_STATS_CLIENTS_2026_07 as july } from './statistiques-view-juillet-2026-archive.js';
import { VIEW_SALES_2026_09 as septemberDetails } from './statistiques-view-septembre-2026-details.js';

const euro=n=>Number(n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(sarl|sasu|sas|sa|eurl|sci|societe|ets|france)\b/g,'').replace(/[^a-z0-9]/g,'');
const pct=(a,b)=>!b?(a>0?null:0):(a-b)/b;
const julyBy=new Map(july.map(x=>[String(x.factory),x])),augBy=new Map(august.map(x=>[String(x.factory),x])),detailBy=new Map(septemberDetails.map(x=>[String(x.factory),x]));
let crm=[],query='';
const data=august.map(x=>{const j=julyBy.get(String(x.factory)),d=detailBy.get(String(x.factory));const ca2026=d?.total??x.ca2026;return {...x,ca2026,products:d?.products||[],july:j?.ca2026??null,august:j?Number((x.ca2026-j.ca2026).toFixed(2)):null,september:d?Number((d.total-x.ca2026).toFixed(2)):null,evo:pct(ca2026,x.ca2025)}}).sort((a,b)=>b.ca2026-a.ca2026);
function matchClient(x){let c=crm.find(c=>[c.codeView,c.numeroClientView,c.viewCode,c.codesPartenaires?.['view-ceramica'],...(Array.isArray(c.codesPartenairesMulti?.['view-ceramica'])?c.codesPartenairesMulti['view-ceramica']:[])].filter(Boolean).map(String).includes(String(x.factory)));if(c)return c;const k=norm(x.name);const found=crm.filter(c=>{const n=norm(c.societe||c.nomSociete||c.nom);return n===k||(n.length>6&&k.length>6&&(n.startsWith(k)||k.startsWith(n)))});return found.length===1?found[0]:null}
function enriched(x){const c=matchClient(x);return {...x,crm:c,lrf:c?.codeClient||'—',display:c?.societe||x.name}}
function sum(k){return data.reduce((s,x)=>s+Number(x[k]||0),0)}
function evoHtml(x){if(x.evo===null)return '<span class="pill">Nouveau</span>';const v=x.evo*100;return '<span class="'+(v>=0?'up':'down')+'">'+(v>=0?'+':'')+v.toLocaleString('fr-FR',{maximumFractionDigits:1})+' %</span>'}
function productsHtml(x){if(!x.products.length)return '<div class="detail-empty">Détail article non fourni sur la feuille intégrée.</div>';return '<div class="products">'+x.products.map(p=>'<div><span><b>'+p[1]+'</b><small>'+p[0]+'</small></span><strong>'+euro(p[2])+'</strong></div>').join('')+'</div>'}
function render(){
 const list=data.map(enriched).filter(x=>!query||[x.display,x.name,x.factory,x.lrf].some(v=>String(v).toLowerCase().includes(query)));
 document.querySelector('#k-ca').textContent=euro(sum('ca2026'));document.querySelector('#k-prev').textContent=euro(sum('ca2025'));document.querySelector('#k-active').textContent=data.filter(x=>x.ca2026>0).length;document.querySelector('#k-month').textContent=euro(data.reduce((s,x)=>s+Number(x.september||0),0));
 document.querySelector('#rows').innerHTML=list.map((x,i)=>'<tr class="client-row" data-i="'+data.indexOf(x)+'"><td><button class="client-open" type="button" data-factory="'+x.factory+'"><strong>'+x.display+'</strong><small>Voir produits et historique</small></button></td><td><span class="lrf">'+x.lrf+'</span></td><td>'+x.factory+'</td><td class="money">'+euro(x.ca2026)+'</td><td>'+euro(x.ca2025)+'</td><td>'+evoHtml(x)+'</td><td>'+(x.august===null?'—':euro(x.august))+'</td><td class="money">'+(x.september===null?'—':euro(x.september))+'</td></tr><tr class="detail-row" data-detail="'+x.factory+'" hidden><td colspan="8"><div class="client-detail"><div class="monthline"><span>Juillet cumulé <b>'+(x.july===null?'—':euro(x.july))+'</b></span><span>Août <b>'+(x.august===null?'—':euro(x.august))+'</b></span><span>Septembre <b>'+(x.september===null?'—':euro(x.september))+'</b></span><span>Total 2026 <b>'+euro(x.ca2026)+'</b></span></div>'+productsHtml(x)+'</div></td></tr>').join('');
 document.querySelector('#empty').hidden=!!list.length;
 document.querySelectorAll('.client-open').forEach(b=>b.onclick=()=>{const d=document.querySelector('[data-detail="'+b.dataset.factory+'"]');d.hidden=!d.hidden});
}
document.querySelector('#search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render()});
onSnapshot(collection(db,'clients'),snap=>{crm=[];snap.forEach(d=>{const c={id:d.id,...d.data()};if(c.archived!==true&&String(c.codeClient||'').toUpperCase()!=='LRF-00001')crm.push(c)});render()},()=>render());
render();