import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let clients=[];
const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const norm=v=>String(v||"").trim().toLowerCase();
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function allEmails(c){
  const arr=[],seen=new Set();
  const add=(email,label,kind)=>{email=String(email||"").trim();const k=norm(email);if(!valid(email)||seen.has(k))return;seen.add(k);arr.push({email,label,kind});};
  add(c.email,"Adresse principale de la société","principal");
  (c.emails||[]).forEach((e,i)=>add(e,`Adresse société ${i+1}`,"societe"));
  (c.interlocuteurs||[]).forEach(p=>{
    const name=[p.civilite,p.prenom,p.nom].filter(Boolean).join(" ").trim()||"Interlocuteur";
    add(p.email,`${name}${p.fonction?` — ${p.fonction}`:""}`,"interlocuteur");
  });
  return arr;
}
function clientFromRow(row){const id=row?.dataset.clientId;if(id)return clients.find(c=>c.id===id)||null;const name=row?.querySelectorAll("td")?.[1]?.textContent?.trim()||"";return clients.find(c=>norm(c.societe)===norm(name))||null;}
function renderRecipients(c){
  const list=document.getElementById("client-mail-recipients");if(!list||!c)return;
  const emails=allEmails(c);
  list.innerHTML=emails.length?emails.map((x,i)=>`<label class="mail-recipient-row ${x.kind==='interlocuteur'?'person':''}" style="padding:.35rem .25rem"><input type="checkbox" class="client-mail-recipient" value="${esc(x.email)}" ${i===0?"checked":""}><span><strong>${esc(x.email)}</strong><small style="display:block;color:#666;margin-top:2px">${esc(x.label)}</small></span></label>`).join(""):`<div style="color:#777">Aucune adresse e-mail disponible.</div>`;
}
function decorateButtons(){
  document.querySelectorAll("#clients-table-body tr").forEach(row=>{const c=clientFromRow(row);if(!c)return;const btn=row.querySelector(".btn-mail-row,.btn-edit-row");if(!btn)return;const has=allEmails(c).length>0;if(has){btn.className="btn-mail-row";btn.disabled=false;btn.textContent="✉ Envoyer un mail";btn.title="Choisir une ou plusieurs adresses pour ce client";}else if(btn.classList.contains("btn-mail-row")){btn.disabled=true;btn.textContent="✉ Pas d’e-mail";}});
}
function init(){
  document.addEventListener("click",e=>{
    const btn=e.target.closest(".btn-mail-row");const row=btn?.closest("#clients-table-body tr");if(!btn||!row)return;
    const c=clientFromRow(row);if(!c)return;
    setTimeout(()=>renderRecipients(c),30);setTimeout(()=>renderRecipients(c),180);
  },true);
  const overlay=document.getElementById("client-mail-overlay");if(overlay)new MutationObserver(()=>{if(getComputedStyle(overlay).display!=="none"){const company=document.getElementById("client-mail-company")?.textContent||"";const c=clients.find(x=>norm(x.societe)===norm(company));if(c)setTimeout(()=>renderRecipients(c),20);}}).observe(overlay,{attributes:true,attributeFilter:["style"]});
  const tbody=document.getElementById("clients-table-body");if(tbody)new MutationObserver(()=>setTimeout(decorateButtons,20)).observe(tbody,{childList:true});
  onSnapshot(collection(db,"clients"),snap=>{clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));setTimeout(decorateButtons,20);});
  setInterval(decorateButtons,1000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
