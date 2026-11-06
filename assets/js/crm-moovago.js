import { db } from "./firebase.js";
import { collection, getDocs, doc, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { cloneExtra, extraSignature, extraPatch, assertImportUnchanged } from "./crm-extra-save-core.mjs?v=20261105-audit1";

const PARTNER_LOGOS = {
  "elios-ceramica":"elios.png","view-ceramica":"view.png","la-fenice":"lafenice.png","reviglass":"reviglass.png",
  "biopietra":"biopietra.png","petracers":"petracer.png","pecchioli-firenze":"pecchioli.png","bulbo":"bulbo.png",
  "randal-pro":"randal.png","neobath":"neobath.png","koibath":"koibath.png","aquahome":"aquahome.png","opal":"opal.png","bilt":"bilt.png","reitano-rubinetterie":"reitano.svg","uptrend":"uptrend.svg"
};
const MOOVAGO_PARTNER_MAP = {
  "ELIOS":"elios-ceramica","VIEW":"view-ceramica","LA FENICE":"la-fenice","REVIGLASS":"reviglass","BIOPIETRA":"biopietra",
  "PETRACER":"petracers","PETRACER'S":"petracers","PECCHIOLLI":"pecchioli-firenze","PECCHIOLI":"pecchioli-firenze","BULBO":"bulbo",
  "RANDAL":"randal-pro","RANDAL PRO":"randal-pro","NEOBATH":"neobath","KOIBATH":"koibath","AQUAHOME":"aquahome","OPAL":"opal","BILT":"bilt","REITANO":"reitano-rubinetterie","REITANO RUBINETTERIE":"reitano-rubinetterie","UPTREND":"uptrend"
};

let clients = [];
let fabricants = [];
let activeClientId = null;
let contactDraft = [];
let partnerDraft = [];
let contactsBaseline = [];
let draftClientKey = null;
let draftInitialized = false;
let importBusy = false;
let analysedImport = null;

const clean = v => String(v ?? "").trim();
const lower = v => clean(v).toLocaleLowerCase("fr-FR");
const norm = v => lower(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const esc = v => clean(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));
const firstNonEmpty = (...vals) => vals.map(clean).find(Boolean) || "";
const isActive = c => !!c && c.archived !== true && c.archive !== true;

function normalizeCp(v){ const s=clean(v).replace(/\.0$/,""); return /^\d+$/.test(s) ? s.padStart(5,"0") : s; }
function companyKey(name, cp, city){ return `${norm(name)}|${normalizeCp(cp)}|${norm(city)}`; }
function companyAddressKey(name, address){ return `${norm(name)}|${norm(address)}`; }
function exactClient(id){
  const wanted=clean(id); if(!wanted)return null;
  const direct=clients.find(c=>c.id===wanted); if(!direct)return null;
  const canonicalId=clean(direct.canonicalClientId||direct.duplicateOf);
  if((!isActive(direct)||canonicalId)&&canonicalId){
    const canonical=clients.find(c=>c.id===canonicalId);
    if(canonical)return canonical;
  }
  return direct;
}
function rememberedExactId(){
  const globalId=clean(window.__LRF_EXACT_CLIENT_ID__);
  if(globalId)return globalId;
  try{return clean(sessionStorage.getItem("lrfExactClientId"));}catch{return "";}
}
function rememberExactClient(id){
  const c=exactClient(id); if(!c)return null;
  activeClientId=c.id;
  window.__LRF_EXACT_CLIENT_ID__=c.id;
  try{sessionStorage.setItem("lrfExactClientId",c.id);}catch{}
  return c;
}
function clearExactClient(){
  activeClientId=null;
  window.__LRF_EXACT_CLIENT_ID__="";
  try{sessionStorage.removeItem("lrfExactClientId");}catch{}
}
function splitPartners(value){
  return [...new Set(clean(value).split(/[;,|]+/).map(v=>MOOVAGO_PARTNER_MAP[clean(v).toUpperCase()]).filter(Boolean))];
}
function mergeUnique(arrA=[], arrB=[], keyFn=v=>JSON.stringify(v)){
  const map=new Map(); [...arrA,...arrB].forEach(v=>{ const k=keyFn(v); if(k) map.set(k,v); }); return [...map.values()];
}
function contactKey(c){
  if(clean(c.moovagoId)) return `m:${clean(c.moovagoId)}`;
  if(validEmail(c.email)) return `e:${lower(c.email)}:${norm(c.prenom)}:${norm(c.nom)}`;
  const phone=norm(c.mobile||c.telephone||c.fixe); if(phone) return `p:${norm(c.prenom)}:${norm(c.nom)}:${phone}`;
  return `n:${norm(c.prenom)}:${norm(c.nom)}:${norm(c.fonction)}:${extraSignature(c)}`;
}
function crKey(cr){
  if(clean(cr.moovagoId)) return `m:${clean(cr.moovagoId)}`;
  return extraSignature([clean(cr.date),clean(cr.type),clean(cr.author),clean(cr.text||cr.note)]);
}

function parseCSV(text){
  text=text.replace(/^\uFEFF/,"");
  const firstLine=(text.split(/\r?\n/,1)[0]||"");
  const delimiter=(firstLine.match(/;/g)||[]).length >= (firstLine.match(/,/g)||[]).length ? ";" : ",";
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"' && text[i+1]==='"'){ field+='"'; i++; }
      else if(ch==='"') quoted=false; else field+=ch;
    } else {
      if(ch==='"') quoted=true;
      else if(ch===delimiter){ row.push(field); field=""; }
      else if(ch==='\n'){ row.push(field.replace(/\r$/, "")); rows.push(row); row=[]; field=""; }
      else field+=ch;
    }
  }
  if(field.length||row.length){ row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers=(rows.shift()||[]).map(h=>clean(h));
  return rows.filter(r=>r.some(v=>clean(v))).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
function readCsvFile(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(parseCSV(r.result)); r.onerror=reject; r.readAsText(file,"utf-8"); }); }

function mapSociete(r){
  return {
    moovagoId: clean(r["Identifiant Moovago de la societe"]), type: lower(r["Prospect/Client"]) === "prospect" ? "prospect" : "client",
    societe: clean(r["Nom de societe"]), adresse: clean(r["Adresse"]), codePostal: normalizeCp(r["Code postal"]), ville: clean(r["Ville"]),
    telephone: clean(r["Telephone fixe"]), telephones:[clean(r["Telephone fixe"]),clean(r["Autre telephone"])].filter(Boolean), email: clean(r["Email"]),
    emails: validEmail(r["Email"])?[clean(r["Email"])]:[], departement: clean(r["Departement"]), region:clean(r["Region"]), pays:clean(r["Pays"]||"FR"),
    site:clean(r["Site internet"]), notes:clean(r["Note"]), agent:/coryne/i.test(clean(r["Proprietaire"]))?"Coryne":"Jérôme",
    partenaires:splitPartners(r["Mandants/Commettants"]), segmentation:clean(r["Segmentation client"]), motsCles:clean(r["Mots-cle"]),
    moovagoPseudo:clean(r["Pseudo de Moovago"]), moovagoDernierSuivi:clean(r["Date du dernier suivi commercial"]), moovagoCarte:clean(r["Societe presente sur la carte"])
  };
}
function mapContact(r){
  return { moovagoId:clean(r["Identifiant Moovago de l'interlocuteur"]), civilite:clean(r["Civilite"]), prenom:clean(r["Prenom"]), nom:clean(r["Nom"]),
    fonction:clean(r["Fonction"]), mobile:clean(r["Telephone portable"]), fixe:clean(r["Telephone fixe"]), email:clean(r["Email"]), statut:clean(r["Statut"]),
    centreInteret:clean(r["Centre d'interet"]), societe:clean(r["Nom de societe"]), adresseSociete:clean(r["Adresse de societe"]), codePostal:normalizeCp(r["Code postal"]), ville:clean(r["Ville de societe"])
  };
}
function mapCR(r){
  return { moovagoId:clean(r["Identifiant Moovago du compte rendu"]), date:clean(r["Date du compte rendu"]), dateCreation:clean(r["Date de creation UTC"]),
    author:clean(r["Cree par"]||r["Proprietaire(s)"]), type:clean(r["Type de compte rendu"]), text:clean(r["Note"]), societe:clean(r["Nom de societe"]),
    adresseSociete:clean(r["Adresse de societe"]), codePostal:normalizeCp(r["Code postal de societe"]), ville:clean(r["Ville de societe"]), partenaires:splitPartners(r["Mandants/Commettants"])
  };
}

function findExisting(records, incoming){
  const active=records.filter(isActive);
  const unique=matches=>{
    if(matches.length>1)throw new Error(`Correspondance ambiguë pour « ${incoming.societe} ». Vérifiez les fiches avant l’import.`);
    return matches[0]||null;
  };
  if(clean(incoming.moovagoId)){
    const byId=unique(active.filter(c=>clean(c.moovagoId)===clean(incoming.moovagoId)));
    if(byId)return byId;
  }
  if(!norm(incoming.societe))return null;
  const key=companyKey(incoming.societe,incoming.codePostal,incoming.ville);
  const localized=normalizeCp(incoming.codePostal)&&norm(incoming.ville);
  const byLocation=localized?active.filter(c=>companyKey(c.societe,c.codePostal||c.code_postal,c.ville)===key):[];
  if(incoming.adresse){
    const akey=companyAddressKey(incoming.societe,incoming.adresse);
    const byAddress=active.filter(c=>companyAddressKey(c.societe,c.adresse)===akey &&
      (!normalizeCp(incoming.codePostal)||!normalizeCp(c.codePostal||c.code_postal)||normalizeCp(incoming.codePostal)===normalizeCp(c.codePostal||c.code_postal)));
    if(byAddress.length)return unique(byAddress);
    // Two different stores may share an enseigne and postal town.
    if(byLocation.some(c=>norm(c.adresse)&&norm(c.adresse)!==norm(incoming.adresse)))
      throw new Error(`Adresse différente pour « ${incoming.societe} ». Vérifiez cette correspondance avant l’import.`);
  }
  return unique(byLocation);
}

function findCompanyForRelated(records, rel){
  return findExisting(records,{societe:rel.societe,codePostal:rel.codePostal,ville:rel.ville,adresse:rel.adresseSociete,moovagoId:""});
}
function mergedCompany(existing, inc){
  const phones=mergeUnique(existing.telephones||[existing.telephone].filter(Boolean), inc.telephones||[], v=>norm(v));
  const emails=mergeUnique(existing.emails||[existing.email].filter(validEmail), inc.emails||[], v=>lower(v));
  return {
    moovagoId:inc.moovagoId||existing.moovagoId||"", type:inc.type||existing.type||"client", societe:inc.societe||existing.societe||"",
    adresse:inc.adresse||existing.adresse||"", codePostal:inc.codePostal||existing.codePostal||existing.code_postal||"", ville:inc.ville||existing.ville||"",
    telephone:inc.telephone||existing.telephone||phones[0]||"", telephones:phones, email:inc.email||existing.email||emails[0]||"", emails,
    departement:inc.departement||existing.departement||"", region:inc.region||existing.region||"", pays:inc.pays||existing.pays||"FR", site:inc.site||existing.site||"",
    notes:firstNonEmpty(existing.notes,inc.notes), agent:inc.agent||existing.agent||"", partenaires:mergeUnique(existing.partenaires||[],inc.partenaires||[],v=>v),
    segmentation:inc.segmentation||existing.segmentation||"", motsCles:inc.motsCles||existing.motsCles||"", moovagoPseudo:inc.moovagoPseudo||existing.moovagoPseudo||"",
    moovagoDernierSuivi:inc.moovagoDernierSuivi||existing.moovagoDernierSuivi||"", moovagoCarte:inc.moovagoCarte||existing.moovagoCarte||""
  };
}

function injectStyles(){ if(document.getElementById("moovago-crm-style"))return; const s=document.createElement("style"); s.id="moovago-crm-style"; s.textContent=`
  .moovago-btn{background:#111;color:#FFD700;border:1px solid #D4AF37;border-radius:7px;padding:.65rem 1rem;font-weight:800;cursor:pointer}
  .moovago-overlay{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:100001;display:none;align-items:center;justify-content:center;padding:1rem}.moovago-dialog{width:min(900px,96vw);max-height:94vh;overflow:auto;background:#fff;border-radius:14px;padding:1.4rem;box-shadow:0 25px 70px rgba(0,0,0,.35)}
  .moovago-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.moovago-upload{border:1px dashed #D4AF37;background:#FFFCF2;border-radius:9px;padding:1rem}.moovago-upload label{display:block;font-weight:800;margin-bottom:.5rem}.moovago-result{margin-top:1rem;background:#F8FAFC;border-radius:9px;padding:1rem;line-height:1.8}
  .crm-extra-section{margin-top:1.4rem;padding-top:1.2rem;border-top:1px dashed #D1D5DB}.crm-extra-title{font-size:1rem;font-weight:800;color:#1A2530;margin:0 0 .8rem}.contact-card{display:grid;grid-template-columns:1.1fr 1.1fr 1fr 1fr 1.4fr auto;gap:.5rem;align-items:center;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px;padding:.6rem;margin:.5rem 0}.contact-card input{width:100%;box-sizing:border-box;padding:.55rem;border:1px solid #D1D5DB;border-radius:6px}.partner-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:.6rem}.partner-card-mini{border:1px solid #E5E7EB;background:#fff;border-radius:9px;padding:.65rem;display:flex;align-items:center;gap:.55rem;cursor:pointer;min-height:52px}.partner-card-mini.active{border:2px solid #D4AF37;background:#FFF9E8}.partner-card-mini img{width:48px;height:32px;object-fit:contain}.partner-card-mini span{font-size:.78rem;font-weight:700}.history-card{border-left:4px solid #D4AF37;background:#FAFAFA;padding:.75rem .9rem;border-radius:6px;margin:.55rem 0}.history-meta{font-size:.76rem;color:#666;font-weight:700;margin-bottom:.3rem}.history-text{white-space:pre-wrap;font-size:.88rem}.tiny-danger{border:0;background:#FEE2E2;color:#B91C1C;border-radius:6px;padding:.45rem .6rem;cursor:pointer;font-weight:800}
  @media(max-width:800px){.moovago-grid{grid-template-columns:1fr}.contact-card{grid-template-columns:1fr 1fr}.contact-card .wide{grid-column:1/-1}}
  `; document.head.appendChild(s); }

function injectImportUI(){
  if(document.getElementById("btn-import-moovago"))return;
  const add=document.getElementById("btn-add-client"); if(!add)return;
  const btn=document.createElement("button"); btn.id="btn-import-moovago"; btn.type="button"; btn.className="moovago-btn"; btn.textContent="⬆ Import Moovago"; add.insertAdjacentElement("afterend",btn);
  const ov=document.createElement("div"); ov.id="moovago-overlay"; ov.className="moovago-overlay"; ov.innerHTML=`<div class="moovago-dialog"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #D4AF37;padding-bottom:.7rem"><div><h2 style="margin:0">Import Moovago</h2><div style="color:#666;font-size:.85rem">Analyse avant écriture — aucun doublon volontaire</div></div><button id="moovago-close" style="border:0;background:none;font-size:1.8rem;cursor:pointer">×</button></div><div class="moovago-grid" style="margin-top:1rem"><div class="moovago-upload"><label>1. Sociétés</label><input id="moovago-soc" type="file" accept=".csv"></div><div class="moovago-upload"><label>2. Interlocuteurs</label><input id="moovago-contact" type="file" accept=".csv"></div><div class="moovago-upload"><label>3. Comptes-rendus</label><input id="moovago-cr" type="file" accept=".csv"></div></div><div id="moovago-result" class="moovago-result">Sélectionnez les trois exports CSV puis cliquez sur <strong>Analyser</strong>.</div><div style="display:flex;justify-content:flex-end;gap:.7rem;margin-top:1rem"><button id="moovago-analyse" type="button" class="filter-btn">🔎 Analyser sans modifier</button><button id="moovago-apply" type="button" class="btn-primary-gold" disabled>✅ Importer / mettre à jour Firebase</button></div></div>`; document.body.appendChild(ov);
  btn.onclick=()=>ov.style.display="flex"; document.getElementById("moovago-close").onclick=()=>ov.style.display="none"; ov.addEventListener("click",e=>{if(e.target===ov)ov.style.display="none"});
  document.getElementById("moovago-analyse").onclick=analyseImport; document.getElementById("moovago-apply").onclick=applyImport;
}

function injectClientExtras(){
  const form=document.getElementById("client-form"); if(!form||document.getElementById("crm-extra-contacts"))return;
  const footer=form.querySelector(".modal-footer");
  const wrap=document.createElement("div"); wrap.innerHTML=`
  <div id="crm-extra-contacts" class="crm-extra-section"><div style="display:flex;justify-content:space-between;align-items:center"><h3 class="crm-extra-title">👤 Interlocuteurs</h3><button id="btn-add-contact-crm" type="button" class="btn-add-phone-link">+ Ajouter un interlocuteur</button></div><div id="crm-contacts-list"></div></div>
  <div id="crm-extra-history" class="crm-extra-section"><h3 class="crm-extra-title">🕘 Historique commercial Moovago / CRM</h3><div id="crm-history-list"></div></div>`;
  if(footer)footer.insertAdjacentElement("beforebegin",wrap);else form.appendChild(wrap);
  document.getElementById("btn-add-contact-crm").onclick=()=>{contactDraft.push({prenom:"",nom:"",fonction:"",mobile:"",fixe:"",email:""});renderContacts()};
}
function renderContacts(){
  const box=document.getElementById("crm-contacts-list");if(!box)return;
  box.innerHTML=contactDraft.length?contactDraft.map((stored,i)=>{
    const c=typeof stored==="string"?{email:stored}:(stored||{});
    return `<div class="contact-card" data-ci="${i}"><input data-k="prenom" placeholder="Prénom" value="${esc(c.prenom)}"><input data-k="nom" placeholder="Nom" value="${esc(c.nom)}"><input data-k="fonction" placeholder="Fonction" value="${esc(c.fonction)}"><input data-k="mobile" placeholder="Mobile" value="${esc(c.mobile||"")}"><input class="wide" data-k="email" type="email" placeholder="E-mail" value="${esc(c.email||"")}"><button type="button" class="tiny-danger" data-del="${i}">×</button></div>`;
  }).join(""):`<div style="color:#777;font-style:italic;font-size:.85rem">Aucun interlocuteur enregistré.</div>`;
  box.querySelectorAll("input[data-k]").forEach(inp=>inp.oninput=()=>{
    const index=+inp.closest("[data-ci]").dataset.ci;
    if(typeof contactDraft[index]==="string")contactDraft[index]={email:contactDraft[index]};
    if(!contactDraft[index]||typeof contactDraft[index]!=="object")contactDraft[index]={};
    contactDraft[index][inp.dataset.k]=inp.value;
  });
  box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{contactDraft.splice(+b.dataset.del,1);renderContacts()});
}

function renderPartners(){ const box=document.getElementById("crm-partner-grid"); if(!box)return; box.innerHTML=fabricants.map(f=>{const active=partnerDraft.includes(f.id);const logo=PARTNER_LOGOS[f.id];return `<div class="partner-card-mini ${active?"active":""}" data-pid="${esc(f.id)}">${logo?`<img src="https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/${logo}" alt="${esc(f.nom)}">`:""}<span>${esc(f.nom)}</span></div>`}).join(""); box.querySelectorAll("[data-pid]").forEach(el=>el.onclick=()=>{const id=el.dataset.pid;partnerDraft=partnerDraft.includes(id)?partnerDraft.filter(x=>x!==id):[...partnerDraft,id];renderPartners()}); }
function renderHistory(client){ const box=document.getElementById("crm-history-list"); if(!box)return; const list=[...(client?.comptes_rendus||client?.comptesRendus||[])].sort((a,b)=>clean(b.dateCreation||b.date).localeCompare(clean(a.dateCreation||a.date))); box.innerHTML=list.length?list.map(cr=>`<div class="history-card"><div class="history-meta">${esc(cr.date||"")} • ${esc(cr.type||"Compte-rendu")} • ${esc(cr.author||"Agent")}</div><div class="history-text">${esc(cr.text||cr.note||"")}</div></div>`).join(""):`<div style="color:#777;font-style:italic;font-size:.85rem">Aucun historique commercial.</div>`; }
function currentClientFromForm(){
  // The modal ID is authoritative; names can be shared by several agencies.
  const id=clean(document.getElementById("client-modal")?.dataset.clientId);
  return id ? exactClient(id) : null;
}
function populateExtras(client, force=false){
  const modal=document.getElementById("client-modal");
  const id=clean(modal?.dataset.clientId);
  const key=id||"new-client";
  if(!force && draftInitialized && draftClientKey===key)return;
  const c=client||currentClientFromForm();
  if(id&&!c)return; // Wait for the first authenticated snapshot, without erasing a draft.
  activeClientId=id||null;
  if(c)rememberExactClient(c.id);else clearExactClient();
  contactsBaseline=cloneExtra(Array.isArray(c?.contacts)?c.contacts:[]);
  contactDraft=cloneExtra(contactsBaseline);
  partnerDraft=[...(Array.isArray(c?.partenaires)?c.partenaires:[])];
  draftClientKey=key;
  draftInitialized=true;
  renderContacts();renderHistory(c);
}

window.LRFClientExtras={
  getPatch(){
    const key=clean(document.getElementById("client-modal")?.dataset.clientId)||"new-client";
    if(!draftInitialized||draftClientKey!==key)return {};
    return extraSignature(contactDraft)===extraSignature(contactsBaseline)?{}:{contacts:cloneExtra(contactDraft)};
  },
  getBaseline(){return {contacts:cloneExtra(contactsBaseline)}}
};

async function analyseImport(){
  const fs=[document.getElementById("moovago-soc").files[0],document.getElementById("moovago-contact").files[0],document.getElementById("moovago-cr").files[0]];
  if(importBusy)return;
  analysedImport=null;
  document.getElementById("moovago-apply").disabled=true;
  if(fs.some(x=>!x))return alert("Sélectionnez les 3 exports Moovago.");
  const result=document.getElementById("moovago-result"); result.textContent="Analyse en cours...";
  try{
    const [sRows,iRows,cRows]=await Promise.all(fs.map(readCsvFile)); const soc=sRows.map(mapSociete).filter(x=>x.societe); const contacts=iRows.map(mapContact).filter(x=>x.societe); const crs=cRows.map(mapCR).filter(x=>x.societe);
    const snap=await getDocs(collection(db,"clients")); const existing=[]; snap.forEach(d=>existing.push({...d.data(),id:d.id}));
    const virtual=existing.map(cloneExtra); let newCompanies=0, updatedCompanies=0;
    soc.forEach(s=>{const m=findExisting(virtual,s);if(m){Object.assign(m,mergedCompany(m,s));updatedCompanies++;}else{virtual.push({id:`new-${s.moovagoId||Math.random()}`,...s,contacts:[],comptes_rendus:[]});newCompanies++;}});
    let contactsAdded=0,contactsMerged=0,crAdded=0,crDup=0,unmatchedContacts=0,unmatchedCR=0;
    contacts.forEach(ct=>{const co=findCompanyForRelated(virtual,ct);if(!co){unmatchedContacts++;return;}const arr=co.contacts||[];const k=contactKey(ct);const idx=arr.findIndex(x=>contactKey(x)===k);if(idx>=0){arr[idx]={...arr[idx],...Object.fromEntries(Object.entries(ct).filter(([,v])=>clean(v)))};contactsMerged++;}else{arr.push(ct);contactsAdded++;}co.contacts=arr;});
    crs.forEach(cr=>{const co=findCompanyForRelated(virtual,cr);if(!co){unmatchedCR++;return;}const arr=co.comptes_rendus||co.comptesRendus||[];const k=crKey(cr);if(arr.some(x=>crKey(x)===k)){crDup++;}else{arr.push(cr);crAdded++;}co.comptes_rendus=arr;co.partenaires=mergeUnique(co.partenaires||[],cr.partenaires||[],v=>v);});
    const beforeById=new Map(existing.map(c=>[c.id,c]));
    const changes=virtual.map(c=>{
      const baseline=beforeById.get(c.id);
      const patch=extraPatch(baseline,c);
      const targetId=baseline?c.id:(clean(c.moovagoId)?`moovago_${encodeURIComponent(clean(c.moovagoId))}`:doc(collection(db,"clients")).id);
      return {targetId,baseline,patch};
    }).filter(change=>Object.keys(change.patch).length);
    analysedImport={changes,stats:{soc:soc.length,contacts:contacts.length,crs:crs.length,newCompanies,updatedCompanies,contactsAdded,contactsMerged,crAdded,crDup,unmatchedContacts,unmatchedCR}};
    const st=analysedImport.stats; result.innerHTML=`<strong>Analyse terminée — aucune donnée modifiée.</strong><br>🏢 ${st.soc} sociétés lues : <strong>${st.newCompanies} nouvelles</strong>, ${st.updatedCompanies} correspondances/mises à jour.<br>👤 ${st.contacts} interlocuteurs : <strong>${st.contactsAdded} à ajouter</strong>, ${st.contactsMerged} fusionnés/actualisés, ${st.unmatchedContacts} non rattachés.<br>🕘 ${st.crs} comptes-rendus : <strong>${st.crAdded} à ajouter</strong>, ${st.crDup} déjà présents, ${st.unmatchedCR} non rattachés.<br><small>FT et PROPAMSA sont volontairement ignorés car absents de votre liste Partenaires.</small>`;
    document.getElementById("moovago-apply").disabled=false;
  }catch(e){console.error(e);result.textContent=`Erreur d'analyse : ${e.message}`;}
}
async function applyImport(){
  if(!analysedImport||importBusy)return;
  const btn=document.getElementById("moovago-apply");
  if(!confirm("Confirmer l'import et la mise à jour des données Firebase ?"))return;
  importBusy=true;btn.disabled=true;btn.textContent="Import en cours...";
  document.getElementById("moovago-analyse").disabled=true;
  const result=document.getElementById("moovago-result");
  const plan=analysedImport;
  try{
    let done=0;
    for(const change of plan.changes){
      const ref=doc(db,"clients",change.targetId);
      await runTransaction(db,async transaction=>{
        const snapshot=await transaction.get(ref);
        if(change.baseline&&!snapshot.exists())throw new Error("Une fiche a été supprimée depuis l’analyse. Relancez l’analyse.");
        const current=snapshot.exists()?snapshot.data():undefined;
        assertImportUnchanged(current,change.baseline,change.patch);
        if(snapshot.exists())transaction.update(ref,change.patch);
        else transaction.set(ref,change.patch);
      });
      done++;
      if(done%20===0)result.innerHTML=`Import en cours : <strong>${done}/${plan.changes.length}</strong> sociétés traitées...`;
    }
    result.innerHTML=`✅ <strong>Import terminé : ${done} fiches traitées.</strong><br>Les interlocuteurs, comptes-rendus, coordonnées et partenaires sont maintenant intégrés. La carte géocodera automatiquement les nouvelles adresses.`;
    analysedImport=null;btn.textContent="✅ Import terminé";
  }catch(e){
    console.error(e);
    result.innerHTML=`❌ Import interrompu : ${esc(e.message)}<br>Les fiches déjà traitées restent enregistrées. Relancez l’analyse avant de continuer.`;
    analysedImport=null;btn.disabled=true;btn.textContent="✅ Importer / mettre à jour Firebase";
  }finally{
    importBusy=false;document.getElementById("moovago-analyse").disabled=false;
  }
}

function setupClientModal(){
  injectClientExtras();
  const modal=document.getElementById("client-modal");
  const syncOpen=()=>{
    if(!modal)return;
    if(getComputedStyle(modal).display!=="none")populateExtras();
    else {draftInitialized=false;draftClientKey=null;clearExactClient();}
  };
  if(modal)new MutationObserver(syncOpen).observe(modal,{attributes:true,attributeFilter:["style","data-client-id"]});
  window.addEventListener("lrf-client-opened",e=>populateExtras(e.detail?.client,true));
  window.addEventListener("lrf-client-closed",()=>{
    draftInitialized=false;draftClientKey=null;contactsBaseline=[];contactDraft=[];clearExactClient();
  });
  window.addEventListener("lrf-client-saved",e=>{
    if(clean(e.detail?.clientId)!==clean(modal?.dataset.clientId))return;
    if(e.detail?.patch?.contacts){
      contactsBaseline=cloneExtra(e.detail.patch.contacts);
      contactDraft=cloneExtra(contactsBaseline);
    }
  });
  syncOpen();
}

async function init(){
  injectStyles();injectImportUI();setupClientModal();
  try{fabricants=await fetch("data/fabricants.json").then(r=>r.json());}catch{fabricants=[];}
  onSnapshot(collection(db,"clients"),snap=>{
    clients=[];snap.forEach(d=>clients.push({...d.data(),id:d.id}));
    const modal=document.getElementById("client-modal");
    if(modal&&getComputedStyle(modal).display!=="none"&&!draftInitialized)populateExtras();
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();