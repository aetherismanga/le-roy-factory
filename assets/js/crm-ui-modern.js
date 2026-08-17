// Modernisation visuelle/ergonomique de la page Clients sans modifier la logique métier.

const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function injectStyles(){
  if(document.getElementById("lrf-modern-ui-style")) return;
  const s=document.createElement("style");
  s.id="lrf-modern-ui-style";
  s.textContent=`
  :root{--lrf-gold:#D4AF37;--lrf-ink:#17212b;--lrf-cream:#FBF9F5;--lrf-line:#E7E2D9;--lrf-soft:#F7F5F1}
  .crm-main-content{max-width:1800px}
  .stats-grid{gap:1rem}.stat-card{border-radius:14px!important;box-shadow:0 8px 28px rgba(22,28,36,.055)!important;transition:.2s transform,.2s box-shadow}.stat-card:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(22,28,36,.085)!important}.stat-icon{border-radius:12px!important}
  .crm-toolbar{border-radius:14px!important;box-shadow:0 8px 28px rgba(22,28,36,.04);position:relative}.search-box{border-radius:10px!important;background:#fff!important}.crm-select,.partner-filter-btn{border-radius:10px!important;min-height:42px}.btn-primary-gold,.moovago-btn{border-radius:10px!important}
  .crm-table-container{border-radius:14px!important;box-shadow:0 10px 34px rgba(22,28,36,.055)!important;overflow:auto!important}.crm-table thead th{position:sticky;top:0;z-index:2;background:#f8f6f2!important}.crm-table tbody tr{transition:.16s}.crm-table tbody tr:hover{background:#FFFBEF!important;box-shadow:inset 3px 0 0 var(--lrf-gold)}.crm-table td{vertical-align:middle}.crm-table td:nth-child(2){font-weight:700;color:var(--lrf-ink)}
  .row-partners{margin-top:7px!important}.row-partners img{width:36px!important;height:24px!important;border-radius:6px!important;padding:3px!important}.activity-pill{margin:5px 0 0 0!important;display:block!important;width:max-content;background:#F1EEE7!important;color:#5C5140!important;padding:4px 8px!important}
  .btn-mail-row{border-radius:9px!important;padding:.48rem .7rem!important;background:#fff!important}.btn-mail-row:hover{background:#111!important;color:#FFD700!important}

  #client-modal .modal-content{max-width:1080px!important;padding:0!important;border-radius:18px!important;overflow:hidden!important;background:#fff!important;max-height:94vh!important;display:flex;flex-direction:column}
  #client-modal .modal-close{top:18px!important;right:20px!important;z-index:30;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92)!important;display:grid;place-items:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  #client-modal .modal-header{margin:0!important;padding:22px 68px 16px 26px!important;border:0!important;background:linear-gradient(135deg,#151515,#2b2924);color:#fff;align-items:flex-start!important}.modal-header h2{color:#fff!important;font-size:1.45rem!important}.modal-header .badge{margin-top:2px}
  #client-form{overflow:auto;padding:0 26px 88px;position:relative}
  .lrf-client-summary{margin:18px 26px 0;display:grid;grid-template-columns:2fr repeat(4,1fr);gap:10px}.lrf-summary-main,.lrf-summary-card{border:1px solid var(--lrf-line);border-radius:12px;background:#fff;padding:12px 14px;min-height:72px}.lrf-summary-main{background:linear-gradient(135deg,#FFFDF7,#F7F2E4);border-color:#E5D5A2}.lrf-summary-name{font-size:1.05rem;font-weight:800;color:var(--lrf-ink);margin-bottom:5px}.lrf-summary-sub{font-size:.78rem;color:#6b7280;line-height:1.45}.lrf-summary-card small{display:block;color:#8a8175;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;font-weight:800;margin-bottom:5px}.lrf-summary-card strong{display:block;font-size:.93rem;color:var(--lrf-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lrf-tabs{display:flex;gap:4px;margin:16px 26px 0;border-bottom:1px solid var(--lrf-line);overflow-x:auto;padding:0 2px}.lrf-tab{border:0;background:transparent;padding:11px 14px;font-weight:750;color:#6b7280;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap}.lrf-tab:hover{color:#111}.lrf-tab.active{color:#111;border-bottom-color:var(--lrf-gold)}.lrf-tab-count{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;margin-left:5px;border-radius:999px;background:#F0ECE3;font-size:.68rem;color:#665a45}
  .lrf-tab-pane{display:none!important;margin-top:18px!important}.lrf-tab-pane.active{display:block!important}.modal-grid-edit.lrf-tab-pane.active{display:grid!important}.crm-extra-section.lrf-tab-pane{border-top:0!important;padding-top:0!important;margin-top:18px!important}.documents-section.lrf-tab-pane{border-top:0!important;margin-top:18px!important;padding-top:0!important}
  .modal-grid-edit{gap:14px!important}.modal-grid-edit .form-field{background:#FCFBF9;border:1px solid #EEEAE3;border-radius:10px;padding:10px}.modal-grid-edit .form-field label{font-size:.75rem!important;color:#665f56!important}.modal-grid-edit .form-field input,.modal-grid-edit .form-field select{background:#fff!important;border-radius:8px!important;min-height:42px}
  .crm-extra-title,.documents-title{font-size:1.05rem!important;margin-bottom:12px!important}.contact-card{border-radius:12px!important;background:#FCFBF9!important;padding:10px!important}.partner-card-mini{border-radius:12px!important;min-height:64px!important;transition:.15s}.partner-card-mini:hover{transform:translateY(-1px);border-color:#D4AF37!important}.partner-card-mini.active{box-shadow:0 0 0 2px rgba(212,175,55,.15)}.partner-card-mini img{width:58px!important;height:38px!important}.history-card{border-left:0!important;border:1px solid #ECE7DD!important;border-radius:12px!important;background:#FCFBF9!important;position:relative;padding:12px 14px 12px 20px!important}.history-card:before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:4px;border-radius:4px;background:#D4AF37}
  #client-modal .modal-footer{position:sticky;bottom:-88px;margin:22px -26px -88px!important;padding:14px 26px!important;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-top:1px solid var(--lrf-line);z-index:20;display:flex;justify-content:flex-end;gap:10px}
  .lrf-empty-pane{padding:30px;text-align:center;background:#FCFBF9;border:1px dashed #D8D2C7;border-radius:12px;color:#777}
  @media(max-width:1050px){.lrf-client-summary{grid-template-columns:1fr 1fr}.lrf-summary-main{grid-column:1/-1}}
  @media(max-width:720px){#client-modal .modal-content{width:98vw!important;max-height:97vh!important;border-radius:14px!important}.lrf-client-summary{margin:12px 14px 0;grid-template-columns:1fr 1fr}.lrf-tabs{margin:12px 14px 0}#client-form{padding:0 14px 80px}.modal-grid-edit{grid-template-columns:1fr!important}.modal-grid-edit .form-field.full-width{grid-column:auto!important}.contact-card{grid-template-columns:1fr!important}.lrf-summary-card{min-height:62px}.crm-main-content{padding:1rem!important}.crm-toolbar{align-items:stretch}.search-wrapper{min-width:100%}.select-filters{width:100%}.select-filters>*{flex:1}.crm-table{min-width:960px}}
  `;
  document.head.appendChild(s);
}

function sectionByTitle(regex){
  return [...document.querySelectorAll("#client-modal .crm-extra-section, #client-modal .documents-section")].find(sec=>regex.test(sec.textContent||""));
}
function countContacts(){const sec=sectionByTitle(/interlocuteur/i);return sec?sec.querySelectorAll(".contact-card").length:0}
function countPartners(){const sec=sectionByTitle(/partenaire/i);return sec?sec.querySelectorAll(".partner-card-mini.active").length:0}
function countHistory(){const sec=sectionByTitle(/historique|compte.?rendu|visites|échanges/i);return sec?sec.querySelectorAll(".history-card").length:0}
function field(id){return (document.getElementById(id)?.value||"").trim()}

function latestHistoryText(){
  const cards=[...document.querySelectorAll("#client-modal .history-card")];
  if(!cards.length) return "Aucun";
  const meta=cards[0].querySelector(".history-meta")?.textContent?.trim();
  return meta||"Historique présent";
}

function updateSummary(){
  const root=document.getElementById("lrf-client-summary");if(!root)return;
  const company=field("edit-societe")||"Nouvelle fiche";
  const cp=field("edit-code-postal"),city=field("edit-ville"),type=field("edit-type");
  const activity=document.getElementById("edit-activity")?.selectedOptions?.[0]?.textContent||"Non renseigné";
  const contactCount=countContacts(),partnerCount=countPartners(),historyCount=countHistory();
  root.innerHTML=`
    <div class="lrf-summary-main"><div class="lrf-summary-name">${esc(company)}</div><div class="lrf-summary-sub">📍 ${esc([cp,city].filter(Boolean).join(" ")||"Adresse à compléter")}<br>${type==="prospect"?"🎯 Prospect":"🏢 Client"} · ${esc(activity)}</div></div>
    <div class="lrf-summary-card"><small>Interlocuteurs</small><strong>👤 ${contactCount}</strong></div>
    <div class="lrf-summary-card"><small>Partenaires</small><strong>🏭 ${partnerCount}</strong></div>
    <div class="lrf-summary-card"><small>Historique</small><strong>🕘 ${historyCount} échange${historyCount>1?"s":""}</strong></div>
    <div class="lrf-summary-card" title="${esc(latestHistoryText())}"><small>Dernier contact</small><strong>${esc(latestHistoryText())}</strong></div>`;
  updateTabCounts();
}

function paneFor(key){return document.querySelector(`#client-modal [data-lrf-pane="${key}"]`)}
function activateTab(key){
  document.querySelectorAll("#client-modal .lrf-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===key));
  document.querySelectorAll("#client-modal .lrf-tab-pane").forEach(p=>p.classList.toggle("active",p.dataset.lrfPane===key));
}
function updateTabCounts(){
  const counts={contacts:countContacts(),partners:countPartners(),history:countHistory()};
  Object.entries(counts).forEach(([k,v])=>{const el=document.querySelector(`#client-modal .lrf-tab[data-tab="${k}"] .lrf-tab-count`);if(el)el.textContent=v});
}

function classifySections(){
  const modal=document.getElementById("client-modal");if(!modal)return;
  const info=modal.querySelector(".modal-grid-edit");if(info){info.classList.add("lrf-tab-pane");info.dataset.lrfPane="infos";}
  const extras=[...modal.querySelectorAll(".crm-extra-section")];
  extras.forEach(sec=>{
    const t=(sec.textContent||"").toLowerCase();
    if(t.includes("interlocuteur")){sec.classList.add("lrf-tab-pane");sec.dataset.lrfPane="contacts";}
    else if(t.includes("partenaire")){sec.classList.add("lrf-tab-pane");sec.dataset.lrfPane="partners";}
    else if(t.includes("historique")){sec.classList.add("lrf-tab-pane");sec.dataset.lrfPane="history";}
  });
  const docs=[...modal.querySelectorAll(".documents-section")];
  docs.forEach(sec=>{
    const t=(sec.textContent||"").toLowerCase();
    if(t.includes("documents joints")){sec.classList.add("lrf-tab-pane");sec.dataset.lrfPane="documents";}
    else if(t.includes("compte")||t.includes("visites")||t.includes("échanges")){
      // Le formulaire de nouveau compte-rendu fait partie de l'historique.
      sec.classList.add("lrf-tab-pane");sec.dataset.lrfPane="history";
    }
  });
}

function buildShell(){
  const modal=document.getElementById("client-modal"),content=modal?.querySelector(".modal-content"),form=document.getElementById("client-form"),header=modal?.querySelector(".modal-header");
  if(!modal||!content||!form||!header)return;
  if(!document.getElementById("lrf-client-summary")){
    const summary=document.createElement("div");summary.id="lrf-client-summary";summary.className="lrf-client-summary";header.insertAdjacentElement("afterend",summary);
  }
  if(!document.getElementById("lrf-client-tabs")){
    const tabs=document.createElement("nav");tabs.id="lrf-client-tabs";tabs.className="lrf-tabs";tabs.innerHTML=`
      <button type="button" class="lrf-tab active" data-tab="infos">📋 Infos</button>
      <button type="button" class="lrf-tab" data-tab="contacts">👥 Interlocuteurs <span class="lrf-tab-count">0</span></button>
      <button type="button" class="lrf-tab" data-tab="partners">🏭 Partenaires <span class="lrf-tab-count">0</span></button>
      <button type="button" class="lrf-tab" data-tab="history">🕘 Historique <span class="lrf-tab-count">0</span></button>
      <button type="button" class="lrf-tab" data-tab="documents">📎 Documents</button>`;
    document.getElementById("lrf-client-summary").insertAdjacentElement("afterend",tabs);
    tabs.querySelectorAll(".lrf-tab").forEach(btn=>btn.addEventListener("click",()=>activateTab(btn.dataset.tab)));
  }
  classifySections();
  activateTab(document.querySelector("#lrf-client-tabs .lrf-tab.active")?.dataset.tab||"infos");
  updateSummary();
}

function watchModal(){
  const modal=document.getElementById("client-modal");if(!modal)return;
  let timer;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(getComputedStyle(modal).display!=="none"){buildShell();updateSummary();}},40)};
  new MutationObserver(refresh).observe(modal,{attributes:true,attributeFilter:["style"],childList:true,subtree:true});
  modal.addEventListener("input",()=>setTimeout(updateSummary,30));
  modal.addEventListener("change",()=>setTimeout(updateSummary,30));
}

function init(){injectStyles();watchModal();const modal=document.getElementById("client-modal");if(modal&&getComputedStyle(modal).display!=="none")buildShell();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
