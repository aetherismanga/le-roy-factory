import { db } from "./firebase.js";
import { collection, doc, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let clients=[];
let assigning=false;
let activeClientId=null;

const norm=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const codeNumber=v=>{const m=String(v||"").match(/^LRF-(\d{5})$/i);return m?Number(m[1]):0};
const formatCode=n=>`LRF-${String(n).padStart(5,"0")}`;

function departmentFromPostal(cp){
  const s=String(cp||"").replace(/\s/g,"");
  if(!/^\d{5}$/.test(s))return "";
  if(s.startsWith("97")||s.startsWith("98"))return s.slice(0,3);
  if(s.startsWith("20")){
    const n=Number(s);
    return n>=20200?"2B":"2A";
  }
  return s.slice(0,2);
}
function clientDepartment(c){return String(c?.departement||c?.Dept||departmentFromPostal(c?.codePostal||c?.code_postal)||"").replace(/^FR-/i,"").trim()}

async function assignCode(clientId){
  const clientRef=doc(db,"clients",clientId);
  const counterRef=doc(db,"crm_meta","client_codes");
  return runTransaction(db,async tx=>{
    const clientSnap=await tx.get(clientRef);
    if(!clientSnap.exists())return null;
    const data=clientSnap.data();
    if(/^LRF-\d{5}$/i.test(String(data.codeClient||"")))return data.codeClient;
    const counterSnap=await tx.get(counterRef);
    const last=Number(counterSnap.exists()?counterSnap.data().lastNumber:0)||0;
    const next=last+1;
    if(next>99999)throw new Error("La limite de 99 999 codes clients est atteinte.");
    const code=formatCode(next);
    tx.set(counterRef,{lastNumber:next,updatedAt:new Date().toISOString()},{merge:true});
    tx.update(clientRef,{codeClient:code,departement:clientDepartment(data)||departmentFromPostal(data.codePostal||data.code_postal)});
    return code;
  });
}

async function ensureCounterAtLeastExisting(){
  const maxExisting=clients.reduce((m,c)=>Math.max(m,codeNumber(c.codeClient)),0);
  if(!maxExisting)return;
  const ref=doc(db,"crm_meta","client_codes");
  await runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    const last=Number(snap.exists()?snap.data().lastNumber:0)||0;
    if(last<maxExisting)tx.set(ref,{lastNumber:maxExisting,updatedAt:new Date().toISOString()},{merge:true});
  });
}

async function assignMissingCodes(){
  if(assigning)return;
  assigning=true;
  try{
    await ensureCounterAtLeastExisting();
    const missing=clients.filter(c=>!/^LRF-\d{5}$/i.test(String(c.codeClient||""))).sort((a,b)=>String(a.societe||"").localeCompare(String(b.societe||""),"fr"));
    for(const c of missing){
      try{await assignCode(c.id)}catch(e){console.error("Attribution code LRF",c.societe,e)}
    }
  }finally{assigning=false}
}

function injectStyles(){
  if(document.getElementById("client-code-style"))return;
  const s=document.createElement("style");s.id="client-code-style";s.textContent=`
  .lrf-code-badge{display:inline-flex;align-items:center;margin-top:5px;padding:3px 8px;border-radius:999px;background:#161616;color:#F0C84A;border:1px solid #D4AF37;font-size:.68rem;font-weight:900;letter-spacing:.04em;white-space:nowrap}.lrf-dept-badge{display:inline-flex;margin-left:5px;padding:3px 7px;border-radius:999px;background:#F5F2EB;color:#5E5546;border:1px solid #E2DBCD;font-size:.68rem;font-weight:800}.lrf-readonly{background:#F5F3EE!important;color:#575149!important;font-weight:800}.lrf-code-search{height:40px;min-width:165px;border:1px solid #DED9CC;border-radius:9px;background:#fff;padding:0 .8rem;font:inherit;color:#27303a;outline:none}.lrf-code-search:focus{border-color:#D4AF37;box-shadow:0 0 0 2px rgba(212,175,55,.12)}
  `;document.head.appendChild(s);
}

function injectModalFields(){
  if(document.getElementById("edit-code-client"))return;
  const societe=document.getElementById("edit-societe")?.closest(".form-field");
  if(societe){
    const code=document.createElement("div");code.className="form-field";code.innerHTML=`<label for="edit-code-client">Code client LRF</label><input id="edit-code-client" class="lrf-readonly" type="text" readonly placeholder="Attribué après enregistrement">`;societe.insertAdjacentElement("afterend",code);
  }
  const cp=document.getElementById("edit-code-postal")?.closest(".form-field");
  if(cp){
    const dep=document.createElement("div");dep.className="form-field";dep.innerHTML=`<label for="edit-departement">Département</label><input id="edit-departement" class="lrf-readonly" type="text" readonly placeholder="Automatique">`;cp.insertAdjacentElement("afterend",dep);
  }
  document.getElementById("edit-code-postal")?.addEventListener("input",e=>{const d=document.getElementById("edit-departement");if(d)d.value=departmentFromPostal(e.target.value)});
}

function findClientForRow(row){
  if(!row)return null;
  const id=row.dataset.clientId;if(id){const c=clients.find(x=>x.id===id);if(c)return c;}
  const cells=row.querySelectorAll("td");const name=norm(cells[1]?.childNodes?.[0]?.textContent||cells[1]?.textContent||"");const cp=String(cells[2]?.textContent||"");
  return clients.find(c=>norm(c.societe)===name&&(!c.codePostal||cp.includes(String(c.codePostal))))||clients.find(c=>norm(c.societe)===name)||null;
}

function decorateRows(){
  document.querySelectorAll("#clients-table-body tr").forEach(row=>{
    const cells=row.querySelectorAll("td");if(cells.length<7)return;
    const c=findClientForRow(row);if(!c)return;row.dataset.clientId=c.id;
    let wrap=cells[1].querySelector(".lrf-identifiers");
    if(!wrap){wrap=document.createElement("div");wrap.className="lrf-identifiers";cells[1].appendChild(wrap)}
    const dep=clientDepartment(c);wrap.innerHTML=`${c.codeClient?`<span class="lrf-code-badge">${esc(c.codeClient)}</span>`:"<span class=\"lrf-code-badge\">Attribution…</span>"}${dep?`<span class="lrf-dept-badge">Dép. ${esc(dep)}</span>`:""}`;
  });
  applyCodeSearch();
}

function fillModal(){
  injectModalFields();
  const modal=document.getElementById("client-modal");if(!modal||getComputedStyle(modal).display==="none")return;
  let c=activeClientId?clients.find(x=>x.id===activeClientId):null;
  if(!c){const title=document.getElementById("modal-title")?.textContent||"";const name=title.replace(/^Édition\s*:\s*/i,"").trim();if(name)c=clients.find(x=>norm(x.societe)===norm(name))||null;}
  const code=document.getElementById("edit-code-client"),dep=document.getElementById("edit-departement");
  if(code)code.value=c?.codeClient||"";
  if(dep)dep.value=c?clientDepartment(c):departmentFromPostal(document.getElementById("edit-code-postal")?.value||"");
}

function injectCodeSearch(){
  if(document.getElementById("lrf-code-search"))return;
  const bar=document.getElementById("client-ops-bar")||document.querySelector(".crm-toolbar");if(!bar)return;
  const input=document.createElement("input");input.id="lrf-code-search";input.className="lrf-code-search";input.placeholder="Code LRF…";input.autocomplete="off";input.addEventListener("input",applyCodeSearch);bar.appendChild(input);
}
function applyCodeSearch(){
  const q=norm(document.getElementById("lrf-code-search")?.value||"").replace(/\s/g,"");
  document.querySelectorAll("#clients-table-body tr").forEach(row=>{
    if(!row.querySelectorAll("td").length)return;
    const c=findClientForRow(row);if(!c)return;
    const ok=!q||norm(c.codeClient).replace(/\s/g,"").includes(q);
    row.classList.toggle("lrf-code-hidden",!ok);
    if(!ok)row.style.display="none";else if(!row.classList.contains("ops-hidden"))row.style.display="";
  });
}

function init(){
  injectStyles();injectModalFields();
  const tbody=document.getElementById("clients-table-body");if(tbody)new MutationObserver(()=>setTimeout(()=>{decorateRows();injectCodeSearch()},0)).observe(tbody,{childList:true});
  document.addEventListener("click",e=>{const row=e.target.closest("#clients-table-body tr");if(row){const c=findClientForRow(row);activeClientId=c?.id||null;setTimeout(fillModal,30)}},true);
  document.getElementById("btn-add-client")?.addEventListener("click",()=>{activeClientId=null;setTimeout(fillModal,30)},true);
  const modal=document.getElementById("client-modal");if(modal)new MutationObserver(()=>setTimeout(fillModal,0)).observe(modal,{attributes:true,attributeFilter:["style"]});
  onSnapshot(collection(db,"clients"),snap=>{clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));setTimeout(()=>{decorateRows();injectCodeSearch();fillModal()},0);assignMissingCodes()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
