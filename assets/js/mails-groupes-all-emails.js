import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let clientsByCompany=new Map();
const selectedExtra=new Map();
const autoSupport=new Set();
const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const norm=v=>String(v||"").trim().toLowerCase();
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function details(c){
  const arr=[],seen=new Set();
  const add=(email,label,kind)=>{email=String(email||"").trim();const k=norm(email);if(!valid(email)||seen.has(k))return;seen.add(k);arr.push({email,label,kind});};
  add(c.email,"Adresse principale","principal");
  (c.emails||[]).forEach((e,i)=>add(e,`Adresse société ${i+1}`,"societe"));
  (c.interlocuteurs||[]).forEach(p=>{
    const name=[p.civilite,p.prenom,p.nom].filter(Boolean).join(" ").trim()||"Interlocuteur";
    add(p.email,`${name}${p.fonction?` — ${p.fonction}`:""}`,"interlocuteur");
  });
  return arr;
}

async function loadIndex(){
  const snap=await getDocs(collection(db,"clients"));clientsByCompany.clear();
  snap.forEach(ds=>{const d={id:ds.id,...ds.data()};const k=norm(d.societe);if(!clientsByCompany.has(k))clientsByCompany.set(k,[]);clientsByCompany.get(k).push(d);});
}

function injectStyle(){if(document.getElementById("all-mail-style"))return;const s=document.createElement("style");s.id="all-mail-style";s.textContent=`
tr.extra-email-main-row td{background:#fffdf6}tr.extra-email-main-row td:nth-child(2){padding-left:1.5rem}.mail-person-label{display:block;font-size:.72rem;color:#6B7280;margin-top:2px}.mail-kind-badge{display:inline-block;font-size:.65rem;padding:2px 5px;border-radius:999px;background:#F3F4F6;color:#555;margin-left:5px}.extra-main-checkbox{width:16px;height:16px}
`;document.head.appendChild(s)}

function findClients(company){return clientsByCompany.get(norm(company))||[];}
function allExtrasForCompany(company,mainEmail){
  const out=[],seen=new Set([norm(mainEmail)]);
  findClients(company).forEach(c=>details(c).forEach(x=>{const k=norm(x.email);if(!seen.has(k)){seen.add(k);out.push({...x,clientId:c.id,company:c.societe||company,key:`${c.id}|${k}`});}}));
  return out;
}

function rebuildRows(){
  const tbody=document.getElementById("recipients-tbody");if(!tbody)return;
  tbody.querySelectorAll("tr.extra-email-main-row").forEach(r=>r.remove());
  const bases=[...tbody.querySelectorAll("tr")].filter(r=>!r.classList.contains("extra-email-main-row")&&r.querySelectorAll("td").length>=6);
  bases.forEach(base=>{
    const td=base.querySelectorAll("td");const company=(td[1]?.textContent||"").trim();const main=(td[5]?.textContent||"").trim();
    const extras=allExtrasForCompany(company,main);let anchor=base;
    extras.forEach(x=>{
      const tr=document.createElement("tr");tr.className="extra-email-main-row";tr.dataset.extraKey=x.key;tr.dataset.clientId=x.clientId;
      tr.innerHTML=`<td style="text-align:center"><input type="checkbox" class="extra-main-checkbox" data-key="${esc(x.key)}" ${selectedExtra.has(x.key)?"checked":""}></td><td><strong>${esc(company)}</strong><span class="mail-person-label">${esc(x.label)} <span class="mail-kind-badge">${x.kind==="interlocuteur"?"Interlocuteur":"E-mail société"}</span></span></td><td>${td[2]?.innerHTML||""}</td><td>${td[3]?.innerHTML||""}</td><td>${td[4]?.innerHTML||""}</td><td>${esc(x.email)}</td>`;
      anchor.insertAdjacentElement("afterend",tr);anchor=tr;
    });
  });
  tbody.querySelectorAll(".extra-main-checkbox").forEach(cb=>cb.onchange=()=>{
    const key=cb.dataset.key;let found=null;for(const list of clientsByCompany.values())for(const c of list){const x=details(c).find(e=>`${c.id}|${norm(e.email)}`===key);if(x){found={...x,clientId:c.id,key};break;}if(found)break;}
    if(!found)return;cb.checked?selectedExtra.set(key,found):selectedExtra.delete(key);updateCounter();
  });
  updateCounter();
}

function updateCounter(){
  const count=document.getElementById("count-selected");if(!count)return;
  const baseChecked=document.querySelectorAll("#recipients-tbody tr:not(.extra-email-main-row) .contact-checkbox:checked").length;
  count.textContent=baseChecked+selectedExtra.size;
}

function ensureSupportSelection(){
  if(!selectedExtra.size)return;
  const anyBase=document.querySelector("#recipients-tbody tr:not(.extra-email-main-row) .contact-checkbox:checked");if(anyBase)return;
  const first=[...selectedExtra.values()][0];
  const rows=[...document.querySelectorAll("#recipients-tbody tr:not(.extra-email-main-row)")];
  const row=rows.find(r=>norm(r.querySelectorAll("td")[1]?.textContent)===norm(first.company||findCompany(first.clientId)));
  const cb=row?.querySelector(".contact-checkbox");if(cb&&!cb.checked){autoSupport.add(norm(row.querySelectorAll("td")[5]?.textContent));cb.click();}
}
function findCompany(id){for(const list of clientsByCompany.values()){const c=list.find(x=>x.id===id);if(c)return c.societe||"";}return"";}

function wrapFetch(){
  if(window.__lrfAllEmailsFetch)return;window.__lrfAllEmailsFetch=true;const native=window.fetch.bind(window);
  window.fetch=async function(input,init){const url=typeof input==="string"?input:(input?.url||"");
    if(url.includes("sendGroupEmail")&&init?.body){try{const body=JSON.parse(init.body);let mails=(body.bccRecipients||[]).filter(e=>!autoSupport.has(norm(e)));mails.push(...[...selectedExtra.values()].map(x=>x.email));body.bccRecipients=[...new Map(mails.filter(valid).map(e=>[norm(e),e])).values()];init={...init,body:JSON.stringify(body)};}catch(e){console.warn("Fusion destinataires",e)}}
    return native(input,init);
  };
}

function hideOldExtraBox(){const old=document.getElementById("extra-mail-box");if(old)old.style.display="none";}
function initObserver(){const tb=document.getElementById("recipients-tbody");if(!tb)return;let timer;new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains("extra-email-main-row")))){clearTimeout(timer);timer=setTimeout(rebuildRows,20);}}).observe(tb,{childList:true});}

async function init(){injectStyle();await loadIndex();hideOldExtraBox();rebuildRows();initObserver();wrapFetch();document.getElementById("btn-open-confirm")?.addEventListener("click",ensureSupportSelection,true);setInterval(()=>{hideOldExtraBox();updateCounter()},800);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
