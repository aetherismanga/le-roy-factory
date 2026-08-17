import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PARTNERS={
  "elios-ceramica":"ELIOS","view-ceramica":"VIEW","la-fenice":"LA FENICE","reviglass":"REVIGLASS","biopietra":"BIOPIETRA",
  "petracers":"PETRACER'S","pecchioli-firenze":"PECCHIOLI","bulbo":"BULBO","randal-pro":"RANDAL PRO","neobath":"NEOBATH",
  "koibath":"KOIBATH","aquahome":"AQUAHOME","opal":"OPAL","bilt":"BILT"
};
const ACTIVITIES={
  "groupe":"Groupe","negoce-independant":"Négoce indépendant","pisciniste":"Pisciniste","architecte":"Architecte",
  "cuisiniste":"Cuisiniste","carreleur":"Carreleur","plombier":"Plombier"
};
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const norm=v=>String(v??"").trim().toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const clean=v=>String(v??"").trim();
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));

let clients=[];
let selectedDeps=new Set();
let selectedPartners=new Set();
let modal;

function department(c){
  const d=clean(c.departement); if(d)return d;
  const cp=clean(c.codePostal||c.code_postal);
  if(/^97\d{3}$/.test(cp))return cp.slice(0,3);
  return /^\d{5}$/.test(cp)?cp.slice(0,2):"";
}
function lrfCode(c){return clean(c.codeClient||c.codeLRF||c.clientCode||c.code_client);}
function emails(c){
  const out=[]; const add=(v,label="")=>{const e=clean(v);if(validEmail(e))out.push({email:e,label})};
  [c.email,c.eMail,c.mail,c.Email,c.Mail].forEach(v=>add(v,"Société"));
  (Array.isArray(c.emails)?c.emails:[]).forEach(v=>add(typeof v==="string"?v:(v?.email||v?.mail),"Société"));
  (Array.isArray(c.emails_contact)?c.emails_contact:[]).forEach(v=>add(typeof v==="string"?v:(v?.email||v?.mail),"Contact"));
  (Array.isArray(c.interlocuteurs)?c.interlocuteurs:[]).forEach(x=>add(x?.email,clean(`${x?.prenom||""} ${x?.nom||""}`)||"Interlocuteur"));
  (Array.isArray(c.contacts)?c.contacts:[]).forEach(x=>{
    if(typeof x==="string"){ const found=x.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[]; found.forEach(v=>add(v,"Contact")); }
    else if(x) add(x.email||x.mail,clean(`${x.prenom||""} ${x.nom||""}`)||"Contact");
  });
  const map=new Map();out.forEach(x=>{const k=x.email.toLowerCase();if(!map.has(k))map.set(k,x)});return [...map.values()];
}
function phones(c){
  const values=[c.telephone,...(Array.isArray(c.telephones)?c.telephones:[])];
  (Array.isArray(c.interlocuteurs)?c.interlocuteurs:[]).forEach(x=>values.push(x?.mobile,x?.telephone,x?.fixe));
  const seen=new Set();return values.map(clean).filter(Boolean).filter(v=>{const k=v.replace(/\D/g,"");if(!k||seen.has(k))return false;seen.add(k);return true});
}
function partnerNames(c){return (Array.isArray(c.partenaires)?c.partenaires:[]).map(p=>PARTNERS[p]||p).filter(Boolean)}
function activity(c){const a=clean(c.categorieActivite||c.sousCategorie||c.activite);return ACTIVITIES[a]||a;}
function agent(c){return clean(c.agent||c.proprietaire||c.owner);}

function injectStyles(){if(document.getElementById("clients-export-style"))return;const s=document.createElement("style");s.id="clients-export-style";s.textContent=`
.export-clients-btn{height:40px;border:1px solid #D4AF37;border-radius:9px;background:#111;color:#FFD700;padding:0 1rem;font-weight:800;cursor:pointer;white-space:nowrap}.export-clients-btn:hover{background:#FFD700;color:#111}.export-overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:120000;display:none;align-items:center;justify-content:center;padding:1rem}.export-dialog{width:min(920px,96vw);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.32);border:1px solid rgba(212,175,55,.45)}.export-head{display:flex;justify-content:space-between;align-items:flex-start;padding:1.2rem 1.35rem;border-bottom:2px solid #D4AF37}.export-head h2{margin:0;font-size:1.25rem}.export-head p{margin:.3rem 0 0;color:#777;font-size:.8rem}.export-close{border:0;background:none;font-size:1.7rem;cursor:pointer}.export-body{padding:1.25rem 1.35rem}.export-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.export-field{border:1px solid #E7E2D8;border-radius:11px;padding:.9rem;background:#FCFBF8}.export-field.full{grid-column:1/-1}.export-field>label,.export-label{display:block;font-weight:800;font-size:.8rem;color:#24282d;margin-bottom:.55rem}.export-field select{width:100%;height:39px;border:1px solid #D8D2C6;border-radius:8px;background:#fff;padding:0 .65rem}.export-checks{display:flex;gap:.55rem;flex-wrap:wrap;max-height:150px;overflow:auto}.export-check{display:flex;align-items:center;gap:.35rem;border:1px solid #E2DDD2;border-radius:8px;padding:.42rem .58rem;background:#fff;font-size:.78rem;cursor:pointer}.export-check input{accent-color:#111}.export-actions{display:flex;justify-content:space-between;align-items:center;gap:.7rem;flex-wrap:wrap;padding:1rem 1.35rem;border-top:1px solid #EEE9DE;background:#FCFBF8}.export-action-group{display:flex;gap:.6rem;flex-wrap:wrap}.export-action{border:1px solid #D4AF37;border-radius:9px;padding:.65rem .9rem;font-weight:800;cursor:pointer;background:#111;color:#FFD700}.export-action.secondary{background:#fff;color:#222;border-color:#D8D2C6}.export-count{font-size:.82rem;color:#666}.export-columns{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:.45rem}.export-select-link{border:0;background:none;color:#806300;text-decoration:underline;cursor:pointer;font-size:.75rem;padding:0}.export-preview{margin-top:.8rem;padding:.65rem .8rem;border-radius:8px;background:#F7F5F0;color:#555;font-size:.8rem}@media(max-width:720px){.export-grid{grid-template-columns:1fr}.export-field.full{grid-column:auto}.export-columns{grid-template-columns:repeat(2,1fr)}}
`;document.head.appendChild(s)}

function makeChecks(items,type){return items.map(v=>`<label class="export-check"><input type="checkbox" data-${type}="${esc(v.value)}"><span>${esc(v.label)}</span></label>`).join("")}
function injectUI(){
  if(document.getElementById("btn-clients-export"))return;
  const toolbar=document.querySelector(".crm-toolbar");if(!toolbar)return;
  const btn=document.createElement("button");btn.id="btn-clients-export";btn.type="button";btn.className="export-clients-btn";btn.textContent="🖨 Imprimer / Exporter";toolbar.appendChild(btn);
  modal=document.createElement("div");modal.className="export-overlay";modal.id="clients-export-overlay";modal.innerHTML=`<div class="export-dialog"><div class="export-head"><div><h2>Imprimer / Exporter le listing clients</h2><p>Choisissez les clients, le tri et les informations à afficher.</p></div><button class="export-close" id="export-close">×</button></div><div class="export-body"><div class="export-grid"><div class="export-field"><label>Type de fiches</label><select id="export-type"><option value="">Tous — Clients + Prospects</option><option value="client">Clients uniquement</option><option value="prospect">Prospects uniquement</option></select></div><div class="export-field"><label>Agent</label><select id="export-agent"><option value="">Tous les agents</option></select></div><div class="export-field full"><div style="display:flex;justify-content:space-between;gap:.5rem"><span class="export-label">Département(s)</span><span><button class="export-select-link" type="button" data-all="dep">Tous</button> · <button class="export-select-link" type="button" data-none="dep">Aucun</button></span></div><div id="export-deps" class="export-checks"></div></div><div class="export-field full"><div style="display:flex;justify-content:space-between;gap:.5rem"><span class="export-label">Partenaire(s)</span><span><button class="export-select-link" type="button" data-all="partner">Tous</button> · <button class="export-select-link" type="button" data-none="partner">Aucun</button></span></div><div id="export-partners" class="export-checks"></div></div><div class="export-field"><label>Activité</label><select id="export-activity"><option value="">Toutes les activités</option></select></div><div class="export-field"><label>Ordre du listing</label><select id="export-sort"><option value="alpha">Société — A → Z</option><option value="dep">Département puis société</option><option value="code">Code LRF</option><option value="city">Ville puis société</option></select></div><div class="export-field full"><div style="display:flex;justify-content:space-between;gap:.5rem"><span class="export-label">Colonnes</span><span><button class="export-select-link" type="button" id="columns-all">Tout cocher</button></span></div><div class="export-columns" id="export-columns"><label class="export-check"><input type="checkbox" value="code" checked> Code LRF</label><label class="export-check"><input type="checkbox" value="societe" checked> Société</label><label class="export-check"><input type="checkbox" value="departement" checked> Département</label><label class="export-check"><input type="checkbox" value="telephone" checked> Téléphone(s)</label><label class="export-check"><input type="checkbox" value="email" checked> Tous les e-mails</label><label class="export-check"><input type="checkbox" value="partenaires" checked> Partenaires</label><label class="export-check"><input type="checkbox" value="activite" checked> Activité</label><label class="export-check"><input type="checkbox" value="agent"> Agent</label><label class="export-check"><input type="checkbox" value="ville"> Ville</label><label class="export-check"><input type="checkbox" value="adresse"> Adresse</label></div><div class="export-preview" id="export-preview">Chargement…</div></div></div></div><div class="export-actions"><div class="export-count" id="export-count">0 fiche</div><div class="export-action-group"><button type="button" class="export-action secondary" id="export-print">🖨 Imprimer</button><button type="button" class="export-action secondary" id="export-csv">CSV</button><button type="button" class="export-action" id="export-excel">📊 Excel</button></div></div></div>`;document.body.appendChild(modal);
  btn.onclick=()=>{populateOptions();modal.style.display="flex";updateCount()};
  modal.querySelector("#export-close").onclick=()=>modal.style.display="none";
  modal.addEventListener("click",e=>{if(e.target===modal)modal.style.display="none"});
  modal.querySelectorAll("select").forEach(x=>x.addEventListener("change",updateCount));
  modal.addEventListener("change",e=>{if(e.target.matches('input[type="checkbox"]')){syncSelections();updateCount()}});
  modal.querySelectorAll("[data-all],[data-none]").forEach(b=>b.onclick=()=>{const type=b.dataset.all||b.dataset.none;const checked=!!b.dataset.all;modal.querySelectorAll(`[data-${type}]`).forEach(x=>x.checked=checked);syncSelections();updateCount()});
  modal.querySelector("#columns-all").onclick=()=>{const boxes=[...modal.querySelectorAll('#export-columns input[type="checkbox"]')];const all=boxes.every(x=>x.checked);boxes.forEach(x=>x.checked=!all)};
  modal.querySelector("#export-print").onclick=printListing;modal.querySelector("#export-csv").onclick=()=>exportDelimited("csv");modal.querySelector("#export-excel").onclick=()=>exportDelimited("excel");
}
function populateOptions(){
  const deps=[...new Set(clients.map(department).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr",{numeric:true}));
  modal.querySelector("#export-deps").innerHTML=makeChecks(deps.map(d=>({value:d,label:`Département ${d}`})),"dep");
  const usedPartners=[...new Set(clients.flatMap(c=>Array.isArray(c.partenaires)?c.partenaires:[]))].sort((a,b)=>(PARTNERS[a]||a).localeCompare(PARTNERS[b]||b,"fr"));
  modal.querySelector("#export-partners").innerHTML=makeChecks(usedPartners.map(p=>({value:p,label:PARTNERS[p]||p})),"partner");
  const acts=[...new Set(clients.map(c=>clean(c.categorieActivite||c.sousCategorie||c.activite)).filter(Boolean))].sort((a,b)=>(ACTIVITIES[a]||a).localeCompare(ACTIVITIES[b]||b,"fr"));
  modal.querySelector("#export-activity").innerHTML=`<option value="">Toutes les activités</option>`+acts.map(a=>`<option value="${esc(a)}">${esc(ACTIVITIES[a]||a)}</option>`).join("");
  const agents=[...new Set(clients.map(agent).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));modal.querySelector("#export-agent").innerHTML=`<option value="">Tous les agents</option>`+agents.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join("");
  selectedDeps.clear();selectedPartners.clear();
}
function syncSelections(){selectedDeps=new Set([...modal.querySelectorAll("[data-dep]:checked")].map(x=>x.dataset.dep));selectedPartners=new Set([...modal.querySelectorAll("[data-partner]:checked")].map(x=>x.dataset.partner))}
function filteredClients(){
  const type=modal.querySelector("#export-type").value,ag=modal.querySelector("#export-agent").value,act=modal.querySelector("#export-activity").value,sort=modal.querySelector("#export-sort").value;
  let arr=clients.filter(c=>{const ct=norm(c.type||"client");if(type&&ct!==type)return false;if(ag&&agent(c)!==ag)return false;if(act&&clean(c.categorieActivite||c.sousCategorie||c.activite)!==act)return false;if(selectedDeps.size&&!selectedDeps.has(department(c)))return false;if(selectedPartners.size&&!(c.partenaires||[]).some(p=>selectedPartners.has(p)))return false;return true});
  const byName=(a,b)=>clean(a.societe).localeCompare(clean(b.societe),"fr",{sensitivity:"base",numeric:true});
  arr.sort((a,b)=>{if(sort==="dep")return department(a).localeCompare(department(b),"fr",{numeric:true})||byName(a,b);if(sort==="code")return lrfCode(a).localeCompare(lrfCode(b),"fr",{numeric:true})||byName(a,b);if(sort==="city")return clean(a.ville).localeCompare(clean(b.ville),"fr",{sensitivity:"base"})||byName(a,b);return byName(a,b)});return arr;
}
function selectedColumns(){return [...modal.querySelectorAll('#export-columns input:checked')].map(x=>x.value)}
const COLS={code:"Code LRF",societe:"Société",departement:"Département",telephone:"Téléphone(s)",email:"E-mail(s)",partenaires:"Partenaires",activite:"Activité",agent:"Agent",ville:"Ville",adresse:"Adresse"};
function value(c,key){if(key==="code")return lrfCode(c);if(key==="societe")return clean(c.societe);if(key==="departement")return department(c);if(key==="telephone")return phones(c).join(" / ");if(key==="email")return emails(c).map(x=>x.email).join(" / ");if(key==="partenaires")return partnerNames(c).join(" / ");if(key==="activite")return activity(c);if(key==="agent")return agent(c);if(key==="ville")return clean(c.ville);if(key==="adresse")return clean(c.adresse);return ""}
function updateCount(){if(!modal)return;syncSelections();const n=filteredClients().length;modal.querySelector("#export-count").textContent=`${n} fiche${n>1?"s":""} sélectionnée${n>1?"s":""}`;modal.querySelector("#export-preview").textContent=`Aperçu : ${n} ligne${n>1?"s":""} · tri ${modal.querySelector("#export-sort").selectedOptions[0].textContent}`}
function printListing(){
  const arr=filteredClients(),cols=selectedColumns();if(!cols.length)return alert("Choisissez au moins une colonne.");if(!arr.length)return alert("Aucune fiche ne correspond aux filtres choisis.");
  const w=window.open("","_blank");if(!w)return alert("Le navigateur a bloqué la fenêtre d'impression.");const date=new Date().toLocaleDateString("fr-FR");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Listing clients LE ROY FACTORY</title><style>@page{size:A4 landscape;margin:9mm}body{font-family:Arial,sans-serif;color:#202020;margin:0}h1{font-size:18px;margin:0}.meta{font-size:10px;color:#666;margin:4px 0 12px}.brand{border-bottom:2px solid #b89422;padding-bottom:8px;margin-bottom:10px}table{width:100%;border-collapse:collapse;font-size:9px;table-layout:auto}th{background:#111;color:#fff;text-align:left;padding:6px;border:1px solid #333}td{padding:5px;border:1px solid #ddd;vertical-align:top;word-break:break-word}tr:nth-child(even) td{background:#f8f7f4}.code{font-weight:bold;white-space:nowrap}@media print{button{display:none}}</style></head><body><div class="brand"><h1>LE ROY FACTORY — Listing clients</h1><div class="meta">Édité le ${date} · ${arr.length} fiche${arr.length>1?"s":""}</div></div><table><thead><tr>${cols.map(k=>`<th>${esc(COLS[k])}</th>`).join("")}</tr></thead><tbody>${arr.map(c=>`<tr>${cols.map(k=>`<td class="${k==="code"?"code":""}">${esc(value(c,k)).replace(/ \/ /g,"<br>")}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();
}
function csvEscape(v,sep){const s=String(v??"");return /["\r\n;,\t]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function download(content,name,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportDelimited(kind){
  const arr=filteredClients(),cols=selectedColumns();if(!cols.length)return alert("Choisissez au moins une colonne.");if(!arr.length)return alert("Aucune fiche ne correspond aux filtres choisis.");
  const stamp=new Date().toISOString().slice(0,10);if(kind==="csv"){const sep=";";const rows=[cols.map(k=>csvEscape(COLS[k],sep)).join(sep),...arr.map(c=>cols.map(k=>csvEscape(value(c,k),sep)).join(sep))];download("\uFEFF"+rows.join("\r\n"),`listing-clients-${stamp}.csv`,"text/csv;charset=utf-8");return;}
  const table=`<table><thead><tr>${cols.map(k=>`<th>${esc(COLS[k])}</th>`).join("")}</tr></thead><tbody>${arr.map(c=>`<tr>${cols.map(k=>`<td>${esc(value(c,k))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${table}</body></html>`;download("\uFEFF"+html,`listing-clients-${stamp}.xls`,"application/vnd.ms-excel;charset=utf-8");
}

async function init(){injectStyles();injectUI();try{const snap=await getDocs(collection(db,"clients"));clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));}catch(err){console.error("Erreur chargement export clients",err)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
