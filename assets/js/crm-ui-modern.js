import { clientActivity } from './client-activity-core.mjs';
// One client editor and one persistent footer for all entry points.

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

  #client-modal{padding:16px;box-sizing:border-box}
  #client-modal .modal-content{max-width:1080px!important;padding:0!important;border-radius:18px!important;overflow:hidden!important;background:#fff!important;height:min(900px,calc(100vh - 32px));max-height:94vh!important;min-height:0;display:flex;flex-direction:column;box-sizing:border-box}
  @supports(height:100dvh){#client-modal .modal-content{height:min(900px,calc(100dvh - 32px));max-height:calc(100dvh - 32px)!important}}
  #client-modal .modal-header,#client-modal .lrf-client-summary,#client-modal .lrf-tabs{flex-shrink:0}
  #client-modal .modal-close{top:18px!important;right:20px!important;z-index:30;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92)!important;display:grid;place-items:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  #client-modal .modal-header{margin:0!important;padding:22px 68px 16px 26px!important;border:0!important;background:linear-gradient(135deg,#151515,#2b2924);color:#fff;align-items:flex-start!important}.modal-header h2{color:#fff!important;font-size:1.45rem!important}.modal-header .badge{margin-top:2px}
  #client-form{flex:1 1 auto;min-height:0;min-width:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:0 26px;position:relative;scroll-padding-block:16px}
  .lrf-client-summary{margin:18px 26px 0;display:grid;grid-template-columns:2fr repeat(4,1fr);gap:10px}.lrf-summary-main,.lrf-summary-card{border:1px solid var(--lrf-line);border-radius:12px;background:#fff;padding:12px 14px;min-height:72px}.lrf-summary-main{background:linear-gradient(135deg,#FFFDF7,#F7F2E4);border-color:#E5D5A2}.lrf-summary-name{font-size:1.05rem;font-weight:800;color:var(--lrf-ink);margin-bottom:5px}.lrf-summary-sub{font-size:.78rem;color:#6b7280;line-height:1.45}.lrf-summary-card small{display:block;color:#8a8175;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;font-weight:800;margin-bottom:5px}.lrf-summary-card strong{display:block;font-size:.93rem;color:var(--lrf-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lrf-tabs{display:flex;gap:4px;margin:16px 26px 0;border-bottom:1px solid var(--lrf-line);overflow-x:auto;padding:0 2px}.lrf-tab{border:0;background:transparent;padding:11px 14px;font-weight:750;color:#6b7280;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap}.lrf-tab:hover{color:#111}.lrf-tab.active{color:#111;border-bottom-color:var(--lrf-gold)}.lrf-tab-count{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;margin-left:5px;border-radius:999px;background:#F0ECE3;font-size:.68rem;color:#665a45}
  #client-modal.lrf-client-ready .lrf-tab-pane{display:none!important;margin-top:18px!important}#client-modal.lrf-client-ready .lrf-tab-pane.active{display:block!important}#client-modal.lrf-client-ready .modal-grid-edit.lrf-tab-pane.active{display:grid!important}.crm-extra-section.lrf-tab-pane{border-top:0!important;padding-top:0!important;margin-top:18px!important}.documents-section.lrf-tab-pane{border-top:0!important;margin-top:18px!important;padding-top:0!important}
  .modal-grid-edit{gap:14px!important}.modal-grid-edit .form-field{background:#FCFBF9;border:1px solid #EEEAE3;border-radius:10px;padding:10px}.modal-grid-edit .form-field label{font-size:.75rem!important;color:#665f56!important}.modal-grid-edit .form-field input,.modal-grid-edit .form-field select{background:#fff!important;border-radius:8px!important;min-height:42px}
  .crm-extra-title,.documents-title{font-size:1.05rem!important;margin-bottom:12px!important}.contact-card{border-radius:12px!important;background:#FCFBF9!important;padding:10px!important}.partner-card-mini{border-radius:12px!important;min-height:64px!important;transition:.15s}.partner-card-mini:hover{transform:translateY(-1px);border-color:#D4AF37!important}.partner-card-mini.active{box-shadow:0 0 0 2px rgba(212,175,55,.15)}.partner-card-mini img{width:58px!important;height:38px!important}.history-card{border-left:0!important;border:1px solid #ECE7DD!important;border-radius:12px!important;background:#FCFBF9!important;position:relative;padding:12px 14px 12px 20px!important}.history-card:before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:4px;border-radius:4px;background:#D4AF37}
  #crm-extra-history{display:none!important}
  #client-modal .modal-footer{position:relative;flex:0 0 auto;margin:0!important;padding:12px 26px!important;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-top:1px solid var(--lrf-line);z-index:20;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
  .lrf-empty-pane{padding:30px;text-align:center;background:#FCFBF9;border:1px dashed #D8D2C7;border-radius:12px;color:#777}
  @media(max-width:1050px){.lrf-client-summary{grid-template-columns:1fr 1fr}.lrf-summary-main{grid-column:1/-1}}
  @media(min-width:901px) and (max-height:820px){#client-modal .modal-header{padding-block:14px!important}.lrf-client-summary{margin-top:10px;grid-template-columns:minmax(0,1.8fr) repeat(4,minmax(0,1fr));gap:8px}.lrf-summary-main{grid-column:auto}.lrf-summary-main,.lrf-summary-card{min-width:0;min-height:58px;padding:9px 10px;box-sizing:border-box}.lrf-summary-card small{font-size:.62rem}.lrf-summary-card strong{font-size:.82rem}.lrf-tabs{margin-top:10px}}
  @media(max-width:720px){#client-modal .modal-content{width:98vw!important;max-height:97vh!important;border-radius:14px!important}.lrf-client-summary{margin:12px 14px 0;grid-template-columns:1fr 1fr}.lrf-tabs{margin:12px 14px 0}#client-form{padding:0 14px 16px}#client-modal .modal-footer{padding:10px 14px!important;gap:8px}#client-modal .modal-footer #btn-save-client{flex:1;min-height:44px}#client-modal .modal-footer #btn-delete-client{font-size:.75rem}#client-modal .modal-footer #btn-send-account-form-client{flex-basis:100%!important}.modal-grid-edit{grid-template-columns:1fr!important}.modal-grid-edit .form-field.full-width{grid-column:auto!important}.contact-card{grid-template-columns:1fr!important}.lrf-summary-card{min-height:62px}.crm-main-content{padding:1rem!important}.crm-toolbar{align-items:stretch}.search-wrapper{min-width:100%}.select-filters{width:100%}.select-filters>*{flex:1}.crm-table{min-width:960px}}
  `;
  document.head.appendChild(s);
}

function countContacts(){
  const cards=document.querySelectorAll("#crm-contacts-list .contact-card");
  if(cards.length) return cards.length;
  return field("edit-contact") ? 1 : 0;
}
function countPartners(){
  return document.querySelectorAll("#crm-partner-grid .partner-card-mini.active").length;
}
function nativeHistoryEntries(){
  return [...document.querySelectorAll("#cr-history-list > div")];
}
function countHistory(){
  const record=window.LRFClientEditor?.getClient?.();
  if(record?.id || record?.societe)return clientActivity(record).filter(item=>item.kind!=='Contact').length;
  const native=nativeHistoryEntries();
  if(native.length) return native.length;
  return document.querySelectorAll("#crm-history-list .history-card").length;
}
function field(id){return (document.getElementById(id)?.value||"").trim()}

function latestHistoryText(){
  const record=window.LRFClientEditor?.getClient?.();
  const latest=record&&clientActivity(record)[0];
  if(latest)return `${latest.kind} ${latest.date.toLocaleDateString('fr-FR')}`;
  const native=nativeHistoryEntries();
  if(native.length){
    const head=native[0].querySelector(":scope > div:first-child");
    const date=head?.querySelector("span:last-child")?.textContent?.trim()||"";
    if(date) return `${date} • Visite / échange`;
    return "Historique présent";
  }
  const card=document.querySelector("#crm-history-list .history-card");
  if(!card) return "Aucun";
  const meta=card.querySelector(".history-meta")?.textContent?.trim();
  return meta||"Historique présent";
}

function updateSummary(){
  const root=document.getElementById("lrf-client-summary");if(!root)return;
  const company=field("edit-societe")||"Nouvelle fiche";
  const cp=field("edit-code-postal"),city=field("edit-ville"),type=field("edit-type");
  const activity=document.getElementById("edit-activity")?.selectedOptions?.[0]?.textContent||"Non renseigné";
  const contactCount=countContacts(),partnerCount=countPartners(),historyCount=countHistory();
  const last=latestHistoryText();
  root.innerHTML=`
    <div class="lrf-summary-main"><div class="lrf-summary-name">${esc(company)}</div><div class="lrf-summary-sub">📍 ${esc([cp,city].filter(Boolean).join(" ")||"Adresse à compléter")}<br>${type==="prospect"?"🎯 Prospect":"🏢 Client"} · ${esc(activity)}</div></div>
    <div class="lrf-summary-card"><small>Interlocuteurs</small><strong>👤 ${contactCount}</strong></div>
    <div class="lrf-summary-card"><small>Partenaires</small><strong>🏭 ${partnerCount}</strong></div>
    <div class="lrf-summary-card"><small>Historique</small><strong>🕘 ${historyCount} échange${historyCount>1?"s":""}</strong></div>
    <div class="lrf-summary-card" title="${esc(last)}"><small>Dernier contact</small><strong>${esc(last)}</strong></div>`;
  updateTabCounts();
}

function activateTab(key){
  const setActive=(element,active)=>{
    if(element.classList.contains("active")!==active)element.classList.toggle("active",active);
  };
  document.querySelectorAll("#client-modal .lrf-tab").forEach(b=>{
    const active=b.dataset.tab===key;
    setActive(b,active);
    b.setAttribute("aria-pressed",String(active));
  });
  document.querySelectorAll("#client-modal .lrf-tab-pane").forEach(p=>setActive(p,p.dataset.lrfPane===key));
  if(key==="partners"){
    const section=document.getElementById("lrf-partner-access-section");
    if(section)section.dataset.collapsed="0";
  }
}
function updateTabCounts(){
  const counts={contacts:countContacts(),partners:countPartners(),history:countHistory()};
  Object.entries(counts).forEach(([k,v])=>{const el=document.querySelector(`#client-modal .lrf-tab[data-tab="${k}"] .lrf-tab-count`);if(el)el.textContent=v});
}

function classifySections(){
  const modal=document.getElementById("client-modal");if(!modal)return;
  const markPane=(section,key)=>{
    if(!section.classList.contains("lrf-tab-pane"))section.classList.add("lrf-tab-pane");
    if(section.dataset.lrfPane!==key)section.dataset.lrfPane=key;
  };
  const info=modal.querySelector(".modal-grid-edit");if(info)markPane(info,"infos");
  const partners=modal.querySelector("#lrf-partner-access-section");if(partners)markPane(partners,"partners");
  const extras=[...modal.querySelectorAll(".crm-extra-section")];
  extras.forEach(sec=>{
    const t=(sec.textContent||"").toLowerCase();
    if(t.includes("interlocuteur")){sec.hidden=false;markPane(sec,"contacts");}
    else if(t.includes("partenaire")){sec.hidden=false;markPane(sec,"partners");}
    else if(t.includes("historique")){
      // Historique Moovago dupliqué : la section native Comptes-Rendus reste la référence unique.
      if(sec.classList.contains("lrf-tab-pane"))sec.classList.remove("lrf-tab-pane");
      if(sec.classList.contains("active"))sec.classList.remove("active");
      sec.removeAttribute("data-lrf-pane");
      sec.hidden=true;
    }
  });
  const docs=[...modal.querySelectorAll(".documents-section")];
  docs.forEach(sec=>{
    const t=(sec.textContent||"").toLowerCase();
    if(t.includes("documents joints")){markPane(sec,"documents");}
    else if(t.includes("compte")||t.includes("visites")||t.includes("échanges")){
      // Une seule zone Historique : formulaire + liste des visites/échanges.
      markPane(sec,"history");sec.hidden=false;
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
  if(!form.dataset.validationReady){
    form.dataset.validationReady='1';
    const feedback=document.createElement('p');
    feedback.id='lrf-client-validation';feedback.setAttribute('role','alert');feedback.hidden=true;
    feedback.style.cssText='margin:8px 26px;color:#9d2525;font-size:.9rem';
    form.insertAdjacentElement('beforebegin',feedback);
    form.addEventListener('invalid',event=>{
      event.preventDefault();
      const input=event.target,pane=input.closest('[data-lrf-pane]');
      if(pane)activateTab(pane.dataset.lrfPane);
      const label=input.labels?.[0]?.textContent||input.getAttribute('aria-label')||input.placeholder||'Champ à vérifier';
      feedback.textContent=label+' : '+input.validationMessage;feedback.hidden=false;
      requestAnimationFrame(()=>{input.scrollIntoView({block:'center'});input.focus({preventScroll:true})});
    },true);
    form.addEventListener('input',()=>{feedback.hidden=true});
    window.addEventListener('lrf-client-opened',()=>{feedback.hidden=true});
  }
  classifySections();
  renderMailActivity();
  activateTab(document.querySelector("#lrf-client-tabs .lrf-tab.active")?.dataset.tab||"infos");
  updateSummary();
  if(!modal.classList.contains("lrf-client-ready"))modal.classList.add("lrf-client-ready");
}

function renderMailActivity(){
  const host=document.querySelector('#client-modal [data-lrf-pane="history"]');
  if(!host)return;
  let list=document.getElementById('lrf-client-mail-activity');
  if(!list){list=document.createElement('section');list.id='lrf-client-mail-activity';host.appendChild(list);}
  const mails=clientActivity(window.LRFClientEditor?.getClient?.()||{}).filter(item=>item.kind==='Mail');
  const markup=mails.length?`<h3>Mails pris en charge par le serveur</h3><p>La prise en charge ne confirme pas la réception chez le destinataire.</p>${mails.map(item=>`<div class="history-card"><strong>${esc(item.objet||'E-mail')}</strong><div class="history-meta">${esc(item.date.toLocaleDateString('fr-FR'))} · ${esc(item.expediteur||'')}</div></div>`).join('')}`:'';
  if(list.innerHTML!==markup)list.innerHTML=markup;
}

function watchModal(){
  const modal=document.getElementById("client-modal");if(!modal)return;
  let timer;
  const refreshShell=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(getComputedStyle(modal).display!=="none")buildShell();},40)};
  new MutationObserver(refreshShell).observe(modal,{attributes:true,attributeFilter:["style"]});

  // Data modules may mutate the form before the opening timer fires. Every
  // refresh must build the complete shell; a data-only timer used to cancel it.
  const form=document.getElementById("client-form");
  if(form)new MutationObserver(refreshShell).observe(form,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  modal.addEventListener("click",event=>{
    if(event.target.closest(".lrf-client-partners-open"))activateTab("partners");
  },true);
  modal.addEventListener("input",()=>setTimeout(updateSummary,30));
  modal.addEventListener("change",()=>setTimeout(updateSummary,30));
}

function init(){injectStyles();watchModal();window.addEventListener('lrf-client-opened',()=>{buildShell();activateTab('infos');});const modal=document.getElementById("client-modal");if(modal&&getComputedStyle(modal).display!=="none")buildShell();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
