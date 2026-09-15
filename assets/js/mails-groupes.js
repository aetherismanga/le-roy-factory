import { db } from "./firebase.js";
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allContacts=[];
let filteredContacts=[];
let selectedContacts=new Map();
let attachedFiles=[];
let inlineImages=[];
let selectedDepartments=new Set();
let selectedPartners=new Set();

const MAX_FILE_SIZE=10*1024*1024;
const MAX_TOTAL_SIZE=18*1024*1024;
const PARTNERS={
  "elios-ceramica":["Elios Ceramica","elios.png"],"view-ceramica":["View Ceramica","view.png"],"la-fenice":["La Fenice","lafenice.png"],
  "reviglass":["Reviglass","reviglass.png"],"biopietra":["Biopietra","biopietra.png"],"petracers":["Petracer's","petracer.png"],
  "pecchioli-firenze":["Pecchioli Firenze","pecchioli.png"],"bulbo":["Bulbo","bulbo.png"],"randal-pro":["Randal Pro","randal.png"],
  "neobath":["Neobath","neobath.png"],"koibath":["Koibath","koibath.png"],"aquahome":["Aquahome","aquahome.png"],"opal":["Opal","opal.png"],"bilt":["Bilt","bilt.png"]
};
const ACTIVITIES=[
  ["all","Toutes les activités"],
  ["negoce-independant","Négoce indépendant"],
  ["groupe","Groupe"],
  ["pisciniste","Pisciniste"],
  ["architecte","Architecte"],
  ["cuisiniste","Cuisiniste"],
  ["carreleur","Carreleur"],
  ["plombier","Plombier"]
];
const SIGNATURES={
  jerome:`<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px"><strong>Jérôme Hugol</strong><br><em>Agence Le Roy Factory</em><br>Téléphone : <a href="tel:0766040361">07 66 04 03 61</a><br>E-mail : <a href="mailto:jerome@leroyfactory.fr">jerome@leroyfactory.fr</a><br>Site : <a href="https://leroyfactory.fr">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37"><img src="https://leroyfactory.fr/assets/img/logo03lrf.png" width="120"></td></tr></table>`,
  coryne:`<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px"><strong>Coryne</strong><br><em>Agence Le Roy Factory</em><br>Téléphone : <a href="tel:0613093606">06 13 09 36 06</a><br>E-mail : <a href="mailto:coryne@leroyfactory.fr">coryne@leroyfactory.fr</a><br>Site : <a href="https://leroyfactory.fr">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37"><img src="https://leroyfactory.fr/assets/img/logo03lrf.png" width="120"></td></tr></table>`,
  both:`<br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1A2530"><tr><td style="padding-right:20px"><strong>Coryne & Jérôme</strong><br><em>Agence Le Roy Factory</em><br>Jérôme : 07 66 04 03 61 — jerome@leroyfactory.fr<br>Coryne : 06 13 09 36 06 — coryne@leroyfactory.fr<br>Site : <a href="https://leroyfactory.fr">https://leroyfactory.fr</a></td><td style="padding-left:20px;border-left:2px solid #D4AF37"><img src="https://leroyfactory.fr/assets/img/logo03lrf.png" width="120"></td></tr></table>`
};

const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const norm=v=>String(v||"").trim().toLowerCase();
const normActivity=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

function activityKey(data){
  const raw=normActivity(data.categorieActivite||data.sousCategorie||"");
  if(!raw)return "negoce-independant";
  if(raw==="negoce-independant"||raw.includes("negoce"))return "negoce-independant";
  if(raw.includes("groupe"))return "groupe";
  if(raw.includes("piscin"))return "pisciniste";
  if(raw.includes("architect"))return "architecte";
  if(raw.includes("cuisin"))return "cuisiniste";
  if(raw.includes("carrel"))return "carreleur";
  if(raw.includes("plomb"))return "plombier";
  return raw.replace(/\s+/g,"-");
}

function emailEntries(data){
  const out=[];const seen=new Set();
  const add=(email,label,kind)=>{email=String(email||"").trim();const k=norm(email);if(!validEmail(email)||seen.has(k))return;seen.add(k);out.push({email,label,kind});};
  add(data.email||data.eMail||data.mail||data.Email||data.Mail,"Adresse principale","principal");
  (data.emails||[]).forEach((e,i)=>add(e,`Adresse société ${i+1}`,"societe"));
  (data.emails_contact||[]).forEach((e,i)=>add(e,`Adresse contact ${i+1}`,"societe"));
  (data.interlocuteurs||[]).forEach(p=>{const name=[p.civilite,p.prenom,p.nom].filter(Boolean).join(" ").trim()||"Interlocuteur";add(p.email,`${name}${p.fonction?` — ${p.fonction}`:""}`,"interlocuteur")});
  (data.contacts||[]).forEach((p,i)=>{if(typeof p==="string")add(p,`Contact ${i+1}`,"interlocuteur");else if(p&&typeof p==="object"){const name=[p.prenom,p.nom].filter(Boolean).join(" ").trim()||`Contact ${i+1}`;add(p.email||p.mail||p.eMail,name,"interlocuteur")}});
  return out;
}

function injectStyles(){
  const s=document.createElement("style");s.textContent=`
  #email-body-editor:empty:before{content:attr(data-placeholder);color:#9CA3AF}#email-body-editor:focus{border-color:#D4AF37;box-shadow:0 0 0 2px rgba(212,175,55,.12)}#email-body-editor img{max-width:100%;height:auto;display:block;margin:.75rem 0;border-radius:6px}
  .dept-multi-box,.partner-multi-box{position:relative}.dept-multi-button,.partner-multi-button{width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;cursor:pointer}.multi-panel{display:none;position:absolute;z-index:4000;left:0;right:0;max-height:300px;overflow:auto;background:#fff;border:1px solid #D1D5DB;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:.5rem;margin-top:.25rem}.multi-panel.open{display:block}.multi-row{display:flex;align-items:center;gap:.5rem;padding:.45rem .5rem;border-radius:5px;cursor:pointer}.multi-row:hover{background:#F8F6F2}.multi-row img{width:38px;height:25px;object-fit:contain}.mail-person-label{display:block;font-size:.72rem;color:#6B7280;margin-top:2px}.mail-kind{display:inline-block;font-size:.64rem;padding:2px 5px;border-radius:999px;background:#F3F4F6;color:#555;margin-left:5px}`;document.head.appendChild(s);
}

function setupTabs(){
  document.getElementById("tab-compose-btn")?.addEventListener("click",()=>{document.getElementById("tab-compose-btn").classList.add("active");document.getElementById("tab-history-btn")?.classList.remove("active");document.getElementById("section-compose").style.display="block";document.getElementById("section-history").style.display="none"});
  document.getElementById("tab-history-btn")?.addEventListener("click",()=>{document.getElementById("tab-history-btn").classList.add("active");document.getElementById("tab-compose-btn")?.classList.remove("active");document.getElementById("section-history").style.display="block";document.getElementById("section-compose").style.display="none"});
}
function updateDateTime(){const now=new Date();const d=document.getElementById("current-date"),t=document.getElementById("current-time");if(d){let f=now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});d.textContent=f.charAt(0).toUpperCase()+f.slice(1)}if(t)t.textContent=now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}

function setupRichEditor(){
  const textarea=document.getElementById("email-body");if(!textarea)return;textarea.style.display="none";textarea.removeAttribute("required");
  const helper=document.createElement("div");helper.style.cssText="font-size:.78rem;color:#666;margin-bottom:.45rem";helper.innerHTML="💡 Vous pouvez écrire normalement et <strong>coller une image directement</strong> dans le message (Ctrl+V).";
  const editor=document.createElement("div");editor.id="email-body-editor";editor.contentEditable="true";editor.dataset.placeholder=textarea.placeholder||"Rédigez votre message ici...";editor.style.cssText="min-height:190px;padding:1rem;border:1px solid #D1D5DB;border-radius:6px;background:#fff;line-height:1.5;overflow:auto;outline:none";
  textarea.parentNode.insertBefore(helper,textarea);textarea.parentNode.insertBefore(editor,textarea.nextSibling);editor.addEventListener("paste",handleEditorPaste);
}
function getEditor(){return document.getElementById("email-body-editor")}
async function handleEditorPaste(e){const items=[...(e.clipboardData?.items||[])].filter(i=>i.type.startsWith("image/"));if(!items.length)return;e.preventDefault();for(const item of items){const file=item.getAsFile();if(!file||file.size>MAX_FILE_SIZE||getTotalPayloadSize()+file.size>MAX_TOTAL_SIZE)continue;const dataUrl=await readFileAsDataURL(file);const cid=`inline-${Date.now()}-${Math.random().toString(36).slice(2)}@leroyfactory`;inlineImages.push({filename:`image-message-${inlineImages.length+1}.png`,size:file.size,content:dataUrl.split(",")[1],encoding:"base64",contentType:file.type,cid,inline:true});insertHtmlAtCursor(`<img src="cid:${cid}" alt="Image intégrée">`)}}
function insertHtmlAtCursor(html){const editor=getEditor();if(!editor)return;editor.focus();const sel=window.getSelection();if(!sel||!sel.rangeCount){editor.insertAdjacentHTML("beforeend",html);return}let range=sel.getRangeAt(0);if(!editor.contains(range.commonAncestorContainer)){editor.insertAdjacentHTML("beforeend",html);return}range.deleteContents();const tmp=document.createElement("div");tmp.innerHTML=html;const frag=document.createDocumentFragment();let node,last=null;while((node=tmp.firstChild))last=frag.appendChild(node);range.insertNode(frag);if(last){range=range.cloneRange();range.setStartAfter(last);range.collapse(true);sel.removeAllRanges();sel.addRange(range)}}

function injectActivityFilter(){
  if(document.getElementById("filter-activity"))return;
  const grid=document.querySelector(".filters-grid");if(!grid)return;
  const wrap=document.createElement("div");
  wrap.className="form-group-custom";
  wrap.innerHTML=`<label for="filter-activity">Activité</label><select id="filter-activity" class="crm-select">${ACTIVITIES.map(([value,label])=>`<option value="${value}">${label}</option>`).join("")}</select>`;
  const search=document.getElementById("search-input")?.closest(".form-group-custom");
  if(search)grid.insertBefore(wrap,search);else grid.appendChild(wrap);
}

async function loadContacts(){
  const tbody=document.getElementById("recipients-tbody");if(tbody)tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:20px">Chargement des contacts...</td></tr>`;
  const snap=await getDocs(collection(db,"clients"));allContacts=[];
  snap.forEach(ds=>{
    const data=ds.data();
    if(data.archived===true||data.archive===true)return;
    const societe=data.societe||data.nomSociete||data.entreprise||data.nom||data.nomContact||"Sans nom";
    let rawDept=String(data.departement||data.Dept||"").trim();if(!rawDept&&(data.codePostal||data.cp))rawDept=String(data.codePostal||data.cp).trim().substring(0,2);let departement="-";if(rawDept){const n=rawDept.replace(/[^0-9A-Ba-b]/g,"");departement=n?"FR-"+n.toUpperCase():rawDept.toUpperCase()}
    const agentRaw=norm(data.agent||data.secteur||data.Agent);const agent=agentRaw.includes("coryne")?"Coryne":"Jérôme";const typeRaw=norm(data.type||data.Type||"client");const type=typeRaw.includes("prospect")?"prospect":"client";const partenaires=Array.isArray(data.partenaires)?data.partenaires:[];const activite=activityKey(data);
    emailEntries(data).forEach((entry,index)=>allContacts.push({key:`${ds.id}|${norm(entry.email)}`,clientId:ds.id,nom:societe,type,departement,agent,email:entry.email,label:entry.label,kind:entry.kind,partenaires,activite,index}));
  });
  allContacts.sort((a,b)=>a.nom.localeCompare(b.nom,"fr")||a.email.localeCompare(b.email,"fr"));
  populateDepartmentFilter();injectPartnerFilter();applyFilters();
}

function populateDepartmentFilter(){
  const old=document.getElementById("filter-dept");if(!old)return;const departments=[...new Set(allContacts.map(c=>c.departement).filter(d=>d&&d!=="-"))].sort();selectedDepartments.clear();
  const wrap=document.createElement("div");wrap.className="dept-multi-box";wrap.id="filter-dept-multi";wrap.innerHTML=`<button type="button" class="crm-select dept-multi-button" id="filter-dept-button"><span id="filter-dept-label">Tous les départements</span><span>▾</span></button><div class="multi-panel" id="filter-dept-panel"><label class="multi-row"><input type="checkbox" id="dept-all" checked><strong>Tous les départements</strong></label>${departments.map(d=>`<label class="multi-row"><input type="checkbox" class="dept-checkbox" value="${esc(d)}"> Département ${esc(d)}</label>`).join("")}</div>`;old.replaceWith(wrap);
  const panel=wrap.querySelector("#filter-dept-panel");wrap.querySelector("#filter-dept-button").onclick=()=>panel.classList.toggle("open");wrap.querySelector("#dept-all").onchange=e=>{if(e.target.checked){selectedDepartments.clear();wrap.querySelectorAll(".dept-checkbox").forEach(x=>x.checked=false);updateDepartmentLabel();applyFilters()}else if(!selectedDepartments.size)e.target.checked=true};wrap.querySelectorAll(".dept-checkbox").forEach(cb=>cb.onchange=()=>{cb.checked?selectedDepartments.add(cb.value):selectedDepartments.delete(cb.value);wrap.querySelector("#dept-all").checked=!selectedDepartments.size;updateDepartmentLabel();applyFilters()});document.addEventListener("click",e=>{if(!wrap.contains(e.target))panel.classList.remove("open")});
}
function updateDepartmentLabel(){const l=document.getElementById("filter-dept-label");if(l)l.textContent=!selectedDepartments.size?"Tous les départements":selectedDepartments.size<=3?[...selectedDepartments].map(d=>d.replace("FR-","")).join(", "):`${selectedDepartments.size} départements sélectionnés`}

function injectPartnerFilter(){
  if(document.getElementById("mg-partner-box"))return;const grid=document.querySelector(".filters-grid");if(!grid)return;const wrap=document.createElement("div");wrap.id="mg-partner-box";wrap.className="form-group-custom partner-multi-box";wrap.innerHTML=`<label>Partenaires</label><button type="button" class="crm-select partner-multi-button" id="mgp-btn"><span id="mgp-label">Tous les partenaires</span><span>▾</span></button><div class="multi-panel" id="mgp-panel"><div style="display:flex;justify-content:space-between;padding:.25rem .35rem .5rem"><strong>Filtrer les destinataires</strong><button type="button" id="mgp-clear" style="border:0;background:none;color:#9a6d00;cursor:pointer">Effacer</button></div>${Object.entries(PARTNERS).map(([id,[name,logo]])=>`<label class="multi-row"><input type="checkbox" class="partner-checkbox" value="${id}"><img src="assets/img/${logo}" alt=""><span>${name}</span></label>`).join("")}</div>`;grid.appendChild(wrap);const panel=wrap.querySelector("#mgp-panel");wrap.querySelector("#mgp-btn").onclick=()=>panel.classList.toggle("open");wrap.querySelectorAll(".partner-checkbox").forEach(cb=>cb.onchange=()=>{cb.checked?selectedPartners.add(cb.value):selectedPartners.delete(cb.value);updatePartnerLabel();applyFilters()});wrap.querySelector("#mgp-clear").onclick=()=>{selectedPartners.clear();wrap.querySelectorAll(".partner-checkbox").forEach(x=>x.checked=false);updatePartnerLabel();applyFilters()};document.addEventListener("click",e=>{if(!wrap.contains(e.target))panel.classList.remove("open")});
}
function updatePartnerLabel(){const l=document.getElementById("mgp-label");if(l)l.textContent=selectedPartners.size?`${selectedPartners.size} partenaire(s) sélectionné(s)`:"Tous les partenaires"}

function applyFilters(){
  const type=document.getElementById("filter-type")?.value||"all";const sector=norm(document.getElementById("filter-sector")?.value||"all");const activity=document.getElementById("filter-activity")?.value||"all";const q=norm(document.getElementById("search-input")?.value||"");
  filteredContacts=allContacts.filter(c=>{const mt=type==="all"||c.type===type;const md=!selectedDepartments.size||selectedDepartments.has(c.departement);const ms=sector==="all"||norm(c.agent).includes(sector);const ma=activity==="all"||c.activite===activity;const mq=!q||norm(`${c.nom} ${c.email} ${c.label}`).includes(q);const mp=!selectedPartners.size||[...selectedPartners].some(p=>c.partenaires.includes(p));return mt&&md&&ms&&ma&&mq&&mp});renderTable();
}

function renderTable(){
  const tbody=document.getElementById("recipients-tbody");if(!tbody)return;if(!filteredContacts.length)tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:20px">Aucun contact trouvé.</td></tr>`;else tbody.innerHTML=filteredContacts.map(c=>`<tr><td style="text-align:center"><input type="checkbox" class="contact-checkbox" data-key="${esc(c.key)}" ${selectedContacts.has(c.key)?"checked":""}></td><td><strong>${esc(c.nom)}</strong>${c.label?`<span class="mail-person-label">${esc(c.label)} <span class="mail-kind">${c.kind==="interlocuteur"?"Interlocuteur":c.kind==="principal"?"Principal":"E-mail société"}</span></span>`:""}</td><td><span class="badge badge-${c.type}">${c.type.toUpperCase()}</span></td><td>${esc(c.departement)}</td><td>${esc(c.agent)}</td><td>${esc(c.email)}</td></tr>`).join("");
  document.getElementById("count-displayed").textContent=filteredContacts.length;document.getElementById("count-selected").textContent=selectedContacts.size;const header=document.getElementById("header-select-all");if(header)header.checked=filteredContacts.length>0&&filteredContacts.every(c=>selectedContacts.has(c.key));const warning=document.getElementById("warning-limit");if(warning)warning.style.display=selectedContacts.size>30?"block":"none";tbody.querySelectorAll(".contact-checkbox").forEach(cb=>cb.onchange=()=>{const c=allContacts.find(x=>x.key===cb.dataset.key);if(!c)return;cb.checked?selectedContacts.set(c.key,c):selectedContacts.delete(c.key);renderTable()});
}

function setupEvents(){
  document.getElementById("filter-type")?.addEventListener("change",applyFilters);document.getElementById("filter-sector")?.addEventListener("change",applyFilters);document.getElementById("filter-activity")?.addEventListener("change",applyFilters);document.getElementById("search-input")?.addEventListener("input",applyFilters);
  document.getElementById("header-select-all")?.addEventListener("change",e=>{filteredContacts.forEach(c=>e.target.checked?selectedContacts.set(c.key,c):selectedContacts.delete(c.key));renderTable()});
  document.getElementById("btn-select-all")?.addEventListener("click",()=>{filteredContacts.forEach(c=>selectedContacts.set(c.key,c));renderTable()});document.getElementById("btn-deselect-all")?.addEventListener("click",()=>{selectedContacts.clear();renderTable()});
  document.getElementById("select-sender")?.addEventListener("change",updateSignature);document.getElementById("file-attachment")?.addEventListener("change",handleFileSelect);document.getElementById("btn-open-confirm")?.addEventListener("click",openConfirmModal);document.getElementById("btn-cancel-send")?.addEventListener("click",closeModal);document.getElementById("btn-confirm-send")?.addEventListener("click",executeEmailSending);
}
function updateSignature(){const v=document.getElementById("select-sender")?.value||"jerome";const p=document.getElementById("signature-preview");if(p)p.innerHTML=SIGNATURES[v]||SIGNATURES.jerome}

async function handleFileSelect(e){for(const file of Array.from(e.target.files||[])){if(file.size>MAX_FILE_SIZE){alert(`Le fichier « ${file.name} » dépasse 10 Mo.`);continue}if(getTotalPayloadSize()+file.size>MAX_TOTAL_SIZE){alert(`Le fichier « ${file.name} » ferait dépasser la taille totale autorisée.`);continue}const dataUrl=await readFileAsDataURL(file);attachedFiles.push({id:`${Date.now()}-${Math.random()}`,filename:file.name,size:file.size,content:dataUrl.split(",")[1],encoding:"base64",contentType:file.type||undefined})}e.target.value="";renderFilePreview()}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function getTotalPayloadSize(){return [...attachedFiles,...inlineImages].reduce((s,f)=>s+(f.size||0),0)}
function renderFilePreview(){const p=document.getElementById("file-preview-info");if(!p)return;p.innerHTML=attachedFiles.length?attachedFiles.map(f=>`<span class="file-chip">📄 <strong>${esc(f.filename)}</strong> <button type="button" class="btn-remove-file" data-id="${esc(f.id)}">✕</button></span>`).join(" "):`<span style="font-size:.82rem;color:#666">Aucune pièce jointe.</span>`;p.querySelectorAll(".btn-remove-file").forEach(b=>b.onclick=()=>{attachedFiles=attachedFiles.filter(f=>f.id!==b.dataset.id);renderFilePreview()})}
function getMessageHtml(){return getEditor()?.innerHTML?.trim()||""}function getMessageText(){return getEditor()?.innerText?.trim()||""}

function openConfirmModal(){const subject=document.getElementById("email-subject")?.value?.trim();const bodyText=getMessageText(),bodyHtml=getMessageHtml();if(!selectedContacts.size)return alert("Veuillez sélectionner au moins un destinataire.");if(!subject)return alert("Veuillez saisir un objet pour votre e-mail.");if(!bodyText&&!bodyHtml.includes("<img"))return alert("Veuillez rédiger le corps de votre message.");const sender=document.getElementById("select-sender")?.value||"jerome";document.getElementById("summary-sender").textContent=sender==="coryne"?"coryne@leroyfactory.fr":sender==="both"?"Jérôme & Coryne":"jerome@leroyfactory.fr";document.getElementById("summary-subject").textContent=subject;document.getElementById("summary-count").textContent=`${new Set([...selectedContacts.values()].map(c=>norm(c.email))).size} destinataire(s) en Cci`;document.getElementById("summary-attachment").textContent=attachedFiles.length?`${attachedFiles.length} fichier(s)`:"Aucune";document.getElementById("modal-confirm").style.display="flex"}
function closeModal(){document.getElementById("modal-confirm").style.display="none"}

async function executeEmailSending(){
  const btn=document.getElementById("btn-confirm-send");btn.disabled=true;btn.textContent="Envoi en cours...";const sender=document.getElementById("select-sender")?.value||"jerome";const subject=document.getElementById("email-subject")?.value?.trim();const bcc=[...new Map([...selectedContacts.values()].map(c=>[norm(c.email),c.email])).values()];const htmlContent=`${getMessageHtml()}${SIGNATURES[sender]||SIGNATURES.jerome}`;
  try{const res=await fetch("https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({senderMode:sender,bccRecipients:bcc,subject,htmlContent,attachments:[...attachedFiles,...inlineImages]})});const result=await res.json();if(!result.success)throw new Error(result.error||"Erreur inconnue");const exp=sender==="coryne"?"coryne@leroyfactory.fr":sender==="both"?"jerome@leroyfactory.fr & coryne@leroyfactory.fr":"jerome@leroyfactory.fr";await addDoc(collection(db,"historique_mails"),{date:new Date().toISOString(),expediteur:exp,objet:subject,nbDestinataires:bcc.length,destinataires:bcc,statut:"Succès"});const dateStr=new Date().toLocaleDateString("fr-FR");const agent=sender==="coryne"?"Coryne":sender==="both"?"Jérôme & Coryne":"Jérôme";for(const clientId of new Set([...selectedContacts.values()].map(c=>c.clientId))){try{await updateDoc(doc(db,"clients",clientId),{historiqueMails:arrayUnion({date:dateStr,expediteur:agent,objet:subject})})}catch(e){console.warn(e)}}alert(`✅ E-mail envoyé avec succès à ${bcc.length} destinataire(s) !`);closeModal();location.reload()}catch(err){console.error(err);alert(`❌ Échec de l'envoi : ${err.message||"Erreur réseau"}`)}finally{btn.disabled=false;btn.textContent="✓ Confirmer et envoyer"}}

async function loadHistory(){const tbody=document.getElementById("history-tbody");if(!tbody)return;try{const snap=await getDocs(collection(db,"historique_mails"));if(snap.empty){tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:20px">Aucun envoi enregistré.</td></tr>`;return}const list=[];snap.forEach(d=>list.push(d.data()));list.sort((a,b)=>new Date(b.date)-new Date(a.date));tbody.innerHTML=list.map(i=>`<tr><td>${new Date(i.date).toLocaleString("fr-FR")}</td><td>${esc(i.expediteur)}</td><td><strong>${esc(i.objet)}</strong></td><td>${i.nbDestinataires} contact(s)</td><td><span class="badge badge-client">${esc(i.statut||"Envoyé")}</span></td></tr>`).join("")}catch(e){console.error(e)}}

async function init(){if(!localStorage.getItem("agentLoggedIn")){location.href="agent.html";return}injectStyles();updateDateTime();setInterval(updateDateTime,1000);document.getElementById("logout-btn")?.addEventListener("click",()=>{localStorage.removeItem("agentLoggedIn");location.href="agent.html"});setupTabs();setupRichEditor();injectActivityFilter();const file=document.getElementById("file-attachment");if(file)file.multiple=true;setupEvents();await loadContacts();await loadHistory();updateSignature();renderFilePreview()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();