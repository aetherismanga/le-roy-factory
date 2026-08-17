import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let clients=[];
let activityFilter="";
let followupFilter="";
const norm=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

const ACTIVITY={
  "":"Toutes les activités","groupe":"Groupe","negoce-independant":"Négoce indépendant","pisciniste":"Pisciniste",
  "architecte":"Architecte","cuisiniste":"Cuisiniste","carreleur":"Carreleur","plombier":"Plombier"
};

function parseDate(v){
  if(!v)return null;
  if(v?.toDate)return v.toDate();
  if(v instanceof Date)return v;
  const s=String(v).trim();
  const fr=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if(fr){let y=Number(fr[3]);if(y<100)y+=2000;const d=new Date(y,Number(fr[2])-1,Number(fr[1]));return isNaN(d)?null:d;}
  const d=new Date(s);return isNaN(d)?null:d;
}
function latestCommercialDate(c){
  const dates=[];
  const add=v=>{const d=parseDate(v);if(d)dates.push(d)};
  add(c.moovagoDernierSuivi);add(c.dernierEchange);
  (c.comptes_rendus||c.comptesRendus||[]).forEach(x=>add(x.date||x.dateCreation));
  (c.historiqueMails||[]).forEach(x=>add(x.date));
  dates.sort((a,b)=>b-a);return dates[0]||null;
}
function ageDays(c){const d=latestCommercialDate(c);if(!d)return null;return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}
function followupInfo(c){
  const n=ageDays(c);
  if(n===null)return{key:"never",label:"Jamais contacté",cls:"never"};
  if(n<=30)return{key:"recent",label:`Récent · ${n} j`,cls:"fresh"};
  if(n<=60)return{key:"suivre",label:`À suivre · ${n} j`,cls:"watch"};
  if(n<=90)return{key:"relancer",label:`À relancer · ${n} j`,cls:"late"};
  return{key:"urgent",label:`Urgent · ${n} j`,cls:"urgent"};
}
function clientForRow(row){
  const id=row.dataset.clientId;if(id)return clients.find(c=>c.id===id)||null;
  const cells=row.querySelectorAll("td");const name=norm(cells[1]?.childNodes?.[0]?.textContent||cells[1]?.textContent);const cp=String(cells[2]?.textContent||"");
  return clients.find(c=>norm(c.societe)===name&&(!c.codePostal||cp.includes(c.codePostal)))||clients.find(c=>norm(c.societe)===name)||null;
}

function injectStyles(){
  if(document.getElementById("client-ops-style"))return;
  const s=document.createElement("style");s.id="client-ops-style";s.textContent=`
  .crm-toolbar{display:grid!important;grid-template-columns:auto auto minmax(320px,1fr);gap:.85rem!important;align-items:center!important}
  .crm-toolbar .search-wrapper{min-width:0!important}.crm-toolbar .select-filters{grid-column:1/-1;display:grid!important;grid-template-columns:repeat(3,minmax(180px,1fr));gap:.65rem!important}
  .client-ops-bar{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(190px,240px)) auto;gap:.65rem;align-items:center;width:100%}.client-ops-bar select,.client-ops-reset{height:40px;border:1px solid #DED9CC;border-radius:9px;background:#fff;padding:0 .8rem;font:inherit;color:#27303a}.client-ops-reset{cursor:pointer;font-weight:700;width:max-content}.client-ops-reset:hover{border-color:#D4AF37;background:#fffaf0}
  .followup-pill{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:3px 7px;border-radius:999px;font-size:.68rem;font-weight:800;white-space:nowrap}.followup-pill.fresh{background:#E7F7EE;color:#087443}.followup-pill.watch{background:#FFF6D8;color:#8A6500}.followup-pill.late{background:#FFE9D8;color:#A94B00}.followup-pill.urgent{background:#FDE7E7;color:#B42318}.followup-pill.never{background:#F1F0F6;color:#665A7A}
  .crm-table th:last-child,.crm-table td:last-child{min-width:155px}.quick-actions{display:flex;gap:5px;flex-wrap:nowrap;align-items:center}.quick-actions .btn-mail-row{height:32px!important;min-width:70px!important;padding:0 9px!important;border-radius:8px!important;font-size:.76rem!important;white-space:nowrap!important}.quick-icon{width:32px;height:32px;flex:0 0 32px;border:1px solid #DDD6C7;border-radius:8px;background:#fff;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer;font-size:.82rem}.quick-icon:hover{border-color:#D4AF37;background:#FFF9E8}.crm-table tbody tr.ops-hidden{display:none!important}
  @media(max-width:1100px){.crm-toolbar{grid-template-columns:1fr 1fr}.crm-toolbar .search-wrapper{grid-column:1/-1}.crm-toolbar .select-filters{grid-template-columns:1fr 1fr}.client-ops-bar{grid-template-columns:1fr 1fr auto}}
  @media(max-width:700px){.crm-toolbar,.crm-toolbar .select-filters,.client-ops-bar{grid-template-columns:1fr!important}.client-ops-reset{width:100%}}
  `;document.head.appendChild(s);
}

function injectFilters(){
  if(document.getElementById("client-ops-bar"))return;
  const toolbar=document.querySelector(".crm-toolbar");if(!toolbar)return;
  const bar=document.createElement("div");bar.id="client-ops-bar";bar.className="client-ops-bar";
  bar.innerHTML=`<select id="ops-activity"><option value="">Toutes les activités</option>${Object.entries(ACTIVITY).filter(([k])=>k).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select><select id="ops-followup"><option value="">Toutes les relances</option><option value="recent">Contact ≤ 30 jours</option><option value="suivre">31 à 60 jours</option><option value="relancer">61 à 90 jours</option><option value="urgent">Urgent +90 jours</option><option value="never">Jamais contacté</option></select><button type="button" id="ops-reset" class="client-ops-reset">↺ Réinitialiser</button>`;
  toolbar.appendChild(bar);
  bar.querySelector("#ops-activity").onchange=e=>{activityFilter=e.target.value;applyFilters()};
  bar.querySelector("#ops-followup").onchange=e=>{followupFilter=e.target.value;applyFilters()};
  bar.querySelector("#ops-reset").onclick=()=>{
    activityFilter="";followupFilter="";bar.querySelectorAll("select").forEach(x=>x.value="");
    const q=document.getElementById("search-input");if(q){q.value="";q.dispatchEvent(new Event("input",{bubbles:true}))}
    const t=document.getElementById("filter-type");if(t){t.value="";t.dispatchEvent(new Event("change",{bubbles:true}))}
    const d=document.getElementById("filter-departement");if(d){d.value="";d.dispatchEvent(new Event("change",{bubbles:true}))}
    applyFilters();
  };
}

function compactMailButton(btn,count){
  if(!btn)return;
  btn.textContent=count>1?`✉ Mail (${count})`:"✉ Mail";
  btn.title=count?`Envoyer un e-mail — ${count} adresse(s) disponible(s)`:"Aucune adresse e-mail";
}

function decorate(){
  document.querySelectorAll("#clients-table-body tr").forEach(row=>{
    const cells=row.querySelectorAll("td");if(cells.length<7)return;
    const c=clientForRow(row);if(!c)return;row.dataset.clientId=c.id;
    let pill=cells[5].querySelector(".followup-pill");const info=followupInfo(c);
    if(!pill){pill=document.createElement("span");pill.className="followup-pill";cells[5].appendChild(document.createElement("br"));cells[5].appendChild(pill)}
    pill.className=`followup-pill ${info.cls}`;pill.textContent=info.label;
    const actionCell=cells[6];let box=actionCell.querySelector(".quick-actions");
    if(!box){box=document.createElement("div");box.className="quick-actions";while(actionCell.firstChild)box.appendChild(actionCell.firstChild);actionCell.appendChild(box)}
    const mailBtn=box.querySelector(".btn-mail-row");if(mailBtn){const m=mailBtn.textContent.match(/\((\d+)\)/);compactMailButton(mailBtn,m?Number(m[1]):1)}
    if(!box.querySelector(".qa-phone")){
      const tel=(c.telephone||(c.telephones||[])[0]||"").replace(/\s/g,"");
      if(tel){const a=document.createElement("a");a.className="quick-icon qa-phone";a.href=`tel:${encodeURIComponent(tel)}`;a.title=`Appeler ${tel}`;a.textContent="📞";a.onclick=e=>e.stopPropagation();box.appendChild(a)}
    }
    if(!box.querySelector(".qa-report")){
      const a=document.createElement("a");a.className="quick-icon qa-report";a.href=`comptes-rendus.html?client=${encodeURIComponent(c.id)}`;a.title="Ajouter un compte-rendu";a.textContent="📝";a.onclick=e=>e.stopPropagation();box.appendChild(a)
    }
  });applyFilters();
}
function applyFilters(){
  document.querySelectorAll("#clients-table-body tr").forEach(row=>{const c=clientForRow(row);if(!c)return;const act=c.categorieActivite||c.sousCategorie||"";const f=followupInfo(c).key;const okA=!activityFilter||act===activityFilter;const okF=!followupFilter||f===followupFilter;row.classList.toggle("ops-hidden",!(okA&&okF))});
}

function init(){
  injectStyles();injectFilters();
  const tbody=document.getElementById("clients-table-body");if(tbody)new MutationObserver(()=>setTimeout(decorate,0)).observe(tbody,{childList:true});
  onSnapshot(collection(db,"clients"),snap=>{clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));setTimeout(decorate,0)});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
