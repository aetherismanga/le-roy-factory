import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let clients=[];
const norm=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

function clientForRow(row){
  const id=row.dataset.clientId;if(id)return clients.find(c=>c.id===id)||null;
  const cells=row.querySelectorAll("td");const name=norm(cells[1]?.childNodes?.[0]?.textContent||cells[1]?.textContent);const cp=String(cells[2]?.textContent||"");
  const candidates=clients.filter(c=>c.archived!==true&&c.archive!==true&&!c.duplicateOf&&norm(c.societe)===name&&(!c.codePostal||cp.includes(String(c.codePostal))));
  return candidates.length===1?candidates[0]:null;
}

function injectStyles(){
  if(document.getElementById("client-ops-style"))return;
  const s=document.createElement("style");s.id="client-ops-style";s.textContent=`
  .crm-toolbar{display:grid!important;grid-template-columns:auto auto minmax(320px,1fr);gap:.85rem!important;align-items:center!important}
  .crm-toolbar .search-wrapper{min-width:0!important}.crm-toolbar .select-filters{grid-column:1/-1;display:grid!important;grid-template-columns:repeat(3,minmax(180px,1fr));gap:.65rem!important}
  .client-ops-bar{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(190px,240px)) auto;gap:.65rem;align-items:center;width:100%}.client-ops-bar select,.client-ops-reset{height:40px;border:1px solid #DED9CC;border-radius:9px;background:#fff;padding:0 .8rem;font:inherit;color:#27303a}.client-ops-reset{cursor:pointer;font-weight:700;width:max-content}.client-ops-reset:hover{border-color:#D4AF37;background:#fffaf0}
  .followup-pill{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:3px 7px;border-radius:999px;font-size:.68rem;font-weight:800;white-space:nowrap}.followup-pill.fresh{background:#E7F7EE;color:#087443}.followup-pill.watch{background:#FFF6D8;color:#8A6500}.followup-pill.late{background:#FFE9D8;color:#A94B00}.followup-pill.urgent{background:#FDE7E7;color:#B42318}.followup-pill.never{background:#F1F0F6;color:#665A7A}
  .crm-table th:last-child,.crm-table td:last-child{min-width:155px}.quick-actions{display:flex;gap:5px;flex-wrap:nowrap;align-items:center}.quick-actions .btn-mail-row{height:32px!important;min-width:70px!important;padding:0 9px!important;border-radius:8px!important;font-size:.76rem!important;white-space:nowrap!important}.quick-icon{width:32px;height:32px;flex:0 0 32px;border:1px solid #DDD6C7;border-radius:8px;background:#fff;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer;font-size:.82rem}.quick-icon:hover{border-color:#D4AF37;background:#FFF9E8}
  @media(max-width:1100px){.crm-toolbar{grid-template-columns:1fr 1fr}.crm-toolbar .search-wrapper{grid-column:1/-1}.crm-toolbar .select-filters{grid-template-columns:1fr 1fr}.client-ops-bar{grid-template-columns:1fr 1fr auto}}
  @media(max-width:700px){.crm-toolbar,.crm-toolbar .select-filters,.client-ops-bar{grid-template-columns:1fr!important}.client-ops-reset{width:100%}}
  `;document.head.appendChild(s);
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
    const actionCell=cells[6];let box=actionCell.querySelector(".quick-actions");
    if(!box){box=document.createElement("div");box.className="quick-actions";while(actionCell.firstChild)box.appendChild(actionCell.firstChild);actionCell.appendChild(box)}
    const mailBtn=box.querySelector(".btn-mail-row");if(mailBtn){const m=mailBtn.textContent.match(/\((\d+)\)/);compactMailButton(mailBtn,m?Number(m[1]):1)}
    const oldPhone=box.querySelector(".qa-phone");
    const currentPhone=String(c.telephone||(c.telephones||[])[0]||"").replace(/\s/g,"");
    if(oldPhone&&oldPhone.getAttribute("href")!==`tel:${encodeURIComponent(currentPhone)}`)oldPhone.remove();
    if(!box.querySelector(".qa-phone")){
      const tel=(c.telephone||(c.telephones||[])[0]||"").replace(/\s/g,"");
      if(tel){const a=document.createElement("a");a.className="quick-icon qa-phone";a.href=`tel:${encodeURIComponent(tel)}`;a.title=`Appeler ${tel}`;a.textContent="📞";a.onclick=e=>e.stopPropagation();box.appendChild(a)}
    }
    if(!box.querySelector(".qa-report")){
      const a=document.createElement("a");a.className="quick-icon qa-report";a.href=`comptes-rendus.html?client=${encodeURIComponent(c.id)}`;a.title="Ajouter un compte-rendu";a.textContent="📝";a.onclick=e=>e.stopPropagation();box.appendChild(a)
    }
  });
}

function init(){
  injectStyles();
  const tbody=document.getElementById("clients-table-body");if(tbody)new MutationObserver(()=>setTimeout(decorate,0)).observe(tbody,{childList:true});
  onSnapshot(collection(db,"clients"),snap=>{clients=[];snap.forEach(d=>clients.push({...d.data(),id:d.id}));setTimeout(decorate,0)});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
