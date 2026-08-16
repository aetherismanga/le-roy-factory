import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let extraContacts=[];
const selectedExtra=new Map();
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function injectStyle(){if(document.getElementById("mail-extra-style"))return;const s=document.createElement("style");s.id="mail-extra-style";s.textContent=`
.extra-mail-box{margin-top:1rem;border:1px solid #E5D39A;border-radius:9px;background:#FFFCF4;overflow:hidden}.extra-mail-head{display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;cursor:pointer;font-weight:800}.extra-mail-body{display:none;padding:.8rem 1rem 1rem}.extra-mail-body.open{display:block}.extra-mail-tools{display:flex;gap:.6rem;margin-bottom:.7rem;align-items:center}.extra-mail-tools input{flex:1;padding:.55rem;border:1px solid #D1D5DB;border-radius:6px}.extra-mail-list{max-height:260px;overflow:auto;background:#fff;border:1px solid #E5E7EB;border-radius:7px}.extra-mail-row{display:grid;grid-template-columns:32px 1.4fr 1fr 1.4fr;gap:.5rem;align-items:center;padding:.5rem .65rem;border-bottom:1px solid #F3F4F6;font-size:.82rem}.extra-mail-row:last-child{border-bottom:0}.extra-mail-person{font-weight:700}.extra-mail-company{color:#555}.extra-mail-email{color:#7C3AED}.extra-mail-count{color:#9a6d00;font-weight:800}
`;document.head.appendChild(s)}

function injectBox(){
  if(document.getElementById("extra-mail-box"))return;
  const table=document.querySelector("#recipients-tbody")?.closest(".table-responsive"); if(!table)return;
  const box=document.createElement("div");box.id="extra-mail-box";box.className="extra-mail-box";box.innerHTML=`<div class="extra-mail-head" id="extra-mail-toggle"><span>👤 E-mails des interlocuteurs / adresses supplémentaires <span class="extra-mail-count" id="extra-mail-selected">0 sélectionné</span></span><span>▾</span></div><div class="extra-mail-body" id="extra-mail-body"><div class="extra-mail-tools"><input id="extra-mail-search" placeholder="Rechercher société, interlocuteur ou e-mail..."><button type="button" class="filter-btn" id="extra-mail-select-visible">Tout sélectionner</button><button type="button" class="filter-btn" id="extra-mail-clear">Effacer</button></div><div class="extra-mail-list" id="extra-mail-list"></div></div>`;
  table.insertAdjacentElement("afterend",box);
  box.querySelector("#extra-mail-toggle").onclick=()=>box.querySelector("#extra-mail-body").classList.toggle("open");
  box.querySelector("#extra-mail-search").oninput=render;
  box.querySelector("#extra-mail-clear").onclick=()=>{selectedExtra.clear();render()};
  box.querySelector("#extra-mail-select-visible").onclick=()=>{filtered().forEach(c=>selectedExtra.set(c.key,c));render()};
}
function filtered(){const q=(document.getElementById("extra-mail-search")?.value||"").toLowerCase().trim();return extraContacts.filter(c=>!q||`${c.societe} ${c.nom} ${c.email} ${c.fonction}`.toLowerCase().includes(q));}
function render(){
  const list=document.getElementById("extra-mail-list");if(!list)return;const arr=filtered();
  list.innerHTML=arr.length?arr.map(c=>`<label class="extra-mail-row"><input type="checkbox" class="extra-mail-cb" data-key="${esc(c.key)}" ${selectedExtra.has(c.key)?"checked":""}><span class="extra-mail-person">${esc(c.nom)}${c.fonction?`<br><small>${esc(c.fonction)}</small>`:""}</span><span class="extra-mail-company">${esc(c.societe)}</span><span class="extra-mail-email">${esc(c.email)}</span></label>`).join(""):`<div style="padding:1rem;text-align:center;color:#666">Aucune adresse supplémentaire.</div>`;
  list.querySelectorAll(".extra-mail-cb").forEach(cb=>cb.onchange=()=>{const c=extraContacts.find(x=>x.key===cb.dataset.key);if(!c)return;cb.checked?selectedExtra.set(c.key,c):selectedExtra.delete(c.key);updateCount()});updateCount();
}
function updateCount(){const el=document.getElementById("extra-mail-selected");if(el)el.textContent=`${selectedExtra.size} sélectionné${selectedExtra.size>1?"s":""}`;}

async function load(){
  const snap=await getDocs(collection(db,"clients"));extraContacts=[];const seen=new Set();
  snap.forEach(ds=>{const d=ds.data(),soc=d.societe||"Sans nom",main=String(d.email||"").trim().toLowerCase();
    const add=(email,nom,fonction,type)=>{email=String(email||"").trim();const k=email.toLowerCase();if(!validEmail(email)||k===main||seen.has(k))return;seen.add(k);extraContacts.push({key:`${ds.id}|${k}`,clientId:ds.id,societe:soc,email,nom,fonction:fonction||"",type});};
    (d.emails||[]).forEach((e,i)=>add(e,`Adresse société ${i+1}`,"","societe"));
    (d.interlocuteurs||[]).forEach(p=>add(p.email,[p.civilite,p.prenom,p.nom].filter(Boolean).join(" ").trim()||"Interlocuteur",p.fonction||"","interlocuteur"));
  });extraContacts.sort((a,b)=>a.societe.localeCompare(b.societe,"fr")||a.nom.localeCompare(b.nom,"fr"));render();
}

function wrapFetch(){
  if(window.__lrfMailFetchWrapped)return;window.__lrfMailFetchWrapped=true;const native=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==="string"?input:(input?.url||"");
    if(url.includes("sendGroupEmail")&&init?.body&&selectedExtra.size){try{const body=JSON.parse(init.body);const merged=[...(body.bccRecipients||[]),...[...selectedExtra.values()].map(x=>x.email)];body.bccRecipients=[...new Map(merged.filter(validEmail).map(e=>[e.toLowerCase(),e])).values()];init={...init,body:JSON.stringify(body)};}catch(e){console.warn("Ajout interlocuteurs à l'envoi impossible",e)}}
    return native(input,init);
  };
}
function patchConfirm(){
  document.getElementById("btn-open-confirm")?.addEventListener("click",e=>{
    if(!selectedExtra.size)return;
    const anyMain=document.querySelector(".contact-checkbox:checked");
    if(!anyMain){
      const first=[...selectedExtra.values()][0];const rows=[...document.querySelectorAll("#recipients-tbody tr")];const row=rows.find(r=>(r.children[1]?.textContent||"").trim().toLowerCase()===first.societe.trim().toLowerCase());const cb=row?.querySelector(".contact-checkbox");if(cb&&!cb.checked){cb.click();cb.dataset.autoSupport="1";}
    }
  },true);
}
function init(){injectStyle();injectBox();wrapFetch();patchConfirm();load().catch(console.error);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
