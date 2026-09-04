import { db } from './firebase.js';
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { PARTNER_CONTACTS } from './partner-contacts.js';

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm = (v) => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

let clients = [];
let selectedClientId = '';
let selectedClient = null;
let sending = false;

function injectStyles(){
  if ($('#lrf-new-cr-mail-style')) return;
  const s=document.createElement('style');
  s.id='lrf-new-cr-mail-style';
  s.textContent=`
    .lrf-client-search-wrap{position:relative;width:100%}
    .lrf-client-search{width:100%;box-sizing:border-box;min-height:54px;padding:0 46px 0 16px;border:2px solid #c9a12a;border-radius:15px;background:#fff;color:#20242a;font:inherit;font-size:1rem;outline:none;box-shadow:0 4px 14px rgba(90,65,10,.06)}
    .lrf-client-search:focus{border-color:#b88b09;box-shadow:0 0 0 4px rgba(201,161,42,.14)}
    .lrf-client-search-icon{position:absolute;right:16px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:1.15rem}
    .lrf-client-results{display:none;position:absolute;z-index:50;left:0;right:0;top:calc(100% + 7px);max-height:330px;overflow:auto;background:#fff;border:1px solid #dbc784;border-radius:15px;box-shadow:0 18px 42px rgba(35,29,15,.2);padding:6px}
    .lrf-client-results.open{display:block}
    .lrf-client-result{width:100%;display:block;text-align:left;border:0;background:#fff;border-radius:11px;padding:11px 12px;cursor:pointer;color:#222}
    .lrf-client-result:hover,.lrf-client-result:focus{background:#fff6d8;outline:none}
    .lrf-client-result strong{display:block;font-size:.96rem}.lrf-client-result small{display:block;margin-top:3px;color:#706b63;font-size:.78rem}
    .lrf-client-selected{display:none;margin-top:9px;padding:11px 13px;border-radius:12px;background:#f7f1de;border:1px solid #d6b456;font-weight:800;color:#332a13}
    .lrf-client-selected.show{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .lrf-client-clear{border:0;background:transparent;color:#8a6611;font-weight:900;cursor:pointer;font-size:.8rem}
    #select-client.lrf-hidden-native{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important}
    .lrf-mail-card{margin-top:22px;padding:18px;border:1px solid rgba(194,147,31,.4);border-radius:18px;background:linear-gradient(180deg,#fffdf7,#fbf6e9);box-shadow:0 8px 24px rgba(70,52,12,.07)}
    .lrf-mail-card h3{margin:0 0 5px;font-size:1.08rem}.lrf-mail-card>p{margin:0 0 14px;color:#6f685a;font-size:.86rem}
    .lrf-mail-grid{display:grid;grid-template-columns:1fr;gap:12px}.lrf-mail-field label{display:block;font-weight:800;font-size:.82rem;margin-bottom:6px;color:#252a30}
    .lrf-mail-field select{width:100%;min-height:50px;border:1px solid #d9c680;border-radius:12px;background:#fff;padding:0 12px;font:inherit}
    .lrf-contact-list{display:grid;gap:8px}.lrf-contact-empty{padding:12px;border-radius:10px;background:#f2efe7;color:#726b60;font-size:.83rem}
    .lrf-contact-option{display:flex;align-items:flex-start;gap:10px;padding:10px 11px;border:1px solid #e0d8c6;border-radius:12px;background:#fff;cursor:pointer}
    .lrf-contact-option input{width:20px;height:20px;margin-top:1px;accent-color:#c59617}.lrf-contact-option span{min-width:0}.lrf-contact-option b{display:block}.lrf-contact-option small{display:block;color:#716b60;margin-top:2px;overflow-wrap:anywhere}
    .lrf-send-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}.lrf-action-btn{min-height:50px;border-radius:13px;border:1px solid #c99b20;font:inherit;font-weight:900;cursor:pointer;padding:10px 14px}
    .lrf-save-only{background:#fff;color:#6c5310}.lrf-save-send{background:linear-gradient(180deg,#f6c83f,#dca315);color:#19140a;box-shadow:0 7px 16px rgba(176,128,13,.2)}
    .lrf-action-btn:disabled{opacity:.55;cursor:wait}.lrf-mail-status{display:none;margin-top:12px;padding:11px 12px;border-radius:11px;font-weight:800;font-size:.84rem}.lrf-mail-status.show{display:block}.lrf-mail-status.ok{background:#e8f8ef;color:#087044;border:1px solid #a7dfc2}.lrf-mail-status.warn{background:#fff4dc;color:#8a5d00;border:1px solid #efcf85}.lrf-mail-status.err{background:#fdeaea;color:#a02222;border:1px solid #efb0b0}
    @media(max-width:700px){
      .lrf-client-search{min-height:58px;font-size:1.02rem;border-radius:16px}.lrf-client-results{position:fixed;left:14px;right:14px;top:22vh;max-height:58vh;border-radius:20px;padding:8px;z-index:2147483000}.lrf-client-result{padding:14px 13px}.lrf-client-result strong{font-size:1rem}.lrf-mail-card{margin:18px 0 6px;padding:15px;border-radius:17px}.lrf-send-row{grid-template-columns:1fr}.lrf-action-btn{min-height:56px;font-size:.98rem}
    }
  `;
  document.head.appendChild(s);
}

function clientLabel(c){
  return [c.societe || c.nom || 'Client sans nom', [c.codePostal||c.code_postal||'',c.ville||''].filter(Boolean).join(' ')].filter(Boolean).join(' — ');
}
function clientSearchText(c){return norm([c.societe,c.nom,c.contact,c.ville,c.codePostal,c.code_postal,c.telephone,(c.telephones||[]).join(' ')].filter(Boolean).join(' '));}

function installClientSearch(){
  const select=$('#select-client'); if(!select || $('#lrf-client-search')) return;
  const parent=select.parentElement;
  const wrap=document.createElement('div');wrap.className='lrf-client-search-wrap';
  wrap.innerHTML=`<input id="lrf-client-search" class="lrf-client-search" type="search" autocomplete="off" inputmode="search" placeholder="🔍 Rechercher un client, une ville, un code postal…" aria-label="Rechercher un client ou prospect"><span class="lrf-client-search-icon">⌕</span><div id="lrf-client-results" class="lrf-client-results" role="listbox"></div><div id="lrf-client-selected" class="lrf-client-selected"><span></span><button type="button" class="lrf-client-clear">Changer</button></div>`;
  select.classList.add('lrf-hidden-native');
  select.insertAdjacentElement('beforebegin',wrap);
  const input=$('#lrf-client-search'), results=$('#lrf-client-results'), selected=$('#lrf-client-selected');
  const render=()=>{
    const q=norm(input.value);const matches=clients.filter(c=>!q||clientSearchText(c).includes(q)).slice(0,30);
    results.innerHTML=matches.length?matches.map(c=>`<button type="button" class="lrf-client-result" data-id="${esc(c.id)}"><strong>${esc(c.societe||c.nom||'Client sans nom')}</strong><small>${esc([c.codePostal||c.code_postal||'',c.ville||'',c.contact||''].filter(Boolean).join(' · '))}</small></button>`).join(''):'<div class="lrf-contact-empty">Aucun client trouvé.</div>';
    results.classList.add('open');
  };
  input.addEventListener('focus',render);input.addEventListener('input',render);
  results.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;chooseClient(b.dataset.id);results.classList.remove('open');input.blur();});
  selected.querySelector('.lrf-client-clear').onclick=()=>{selectedClientId='';selectedClient=null;select.value='';selected.classList.remove('show');input.value='';input.hidden=false;input.focus();render();};
  document.addEventListener('click',e=>{if(!wrap.contains(e.target))results.classList.remove('open')});
}

function chooseClient(id){
  const c=clients.find(x=>x.id===id);if(!c)return;
  selectedClientId=id;selectedClient=c;
  const select=$('#select-client');
  let opt=[...select.options].find(o=>o.value===id);if(!opt){opt=document.createElement('option');opt.value=id;opt.textContent=clientLabel(c);select.appendChild(opt)}
  select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));
  const selected=$('#lrf-client-selected'),input=$('#lrf-client-search');selected.querySelector('span').innerHTML=`✓ ${esc(clientLabel(c))}`;selected.classList.add('show');input.hidden=true;
}

function installMailBlock(){
  const form=$('#cr-form'); if(!form || $('#lrf-cr-mail-card')) return;
  const actions=[...form.querySelectorAll('button[type="submit"]')].at(-1)?.parentElement;
  const card=document.createElement('section');card.id='lrf-cr-mail-card';card.className='lrf-mail-card';
  card.innerHTML=`<h3>✉️ Envoyer le compte-rendu par mail</h3><p>Choisissez l’usine puis la ou les personnes qui doivent recevoir ce compte-rendu.</p><div class="lrf-mail-grid"><div class="lrf-mail-field"><label for="lrf-partner-select">Usine / partenaire</label><select id="lrf-partner-select"><option value="">— Choisir une usine —</option>${Object.keys(PARTNER_CONTACTS).sort((a,b)=>a.localeCompare(b,'fr')).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></div><div class="lrf-mail-field"><label>Personne(s) destinataire(s)</label><div id="lrf-partner-contacts" class="lrf-contact-list"><div class="lrf-contact-empty">Choisissez d’abord une usine.</div></div></div></div><div class="lrf-send-row"><button id="lrf-save-report" type="button" class="lrf-action-btn lrf-save-only">💾 Enregistrer seulement</button><button id="lrf-save-send-report" type="button" class="lrf-action-btn lrf-save-send">✉️ Enregistrer + envoyer</button></div><div id="lrf-mail-status" class="lrf-mail-status" aria-live="polite"></div>`;
  if(actions){actions.style.display='none';actions.insertAdjacentElement('beforebegin',card)}else form.appendChild(card);
  $('#lrf-partner-select').onchange=renderPartnerContacts;
  $('#lrf-save-report').onclick=()=>saveFlow(false);
  $('#lrf-save-send-report').onclick=()=>saveFlow(true);
}

function renderPartnerContacts(){
  const partner=$('#lrf-partner-select').value, box=$('#lrf-partner-contacts');const contacts=(PARTNER_CONTACTS[partner]?.contacts||[]).filter(c=>c.email);
  box.innerHTML=contacts.length?contacts.map((c,i)=>`<label class="lrf-contact-option"><input type="checkbox" value="${esc(c.email)}" data-name="${esc(c.name)}"><span><b>${esc(c.name)}</b><small>${esc(c.role||'')} · ${esc(c.email)}</small></span></label>`).join(''):'<div class="lrf-contact-empty">Aucun contact e-mail enregistré pour cette usine.</div>';
}
function selectedRecipients(){return [...document.querySelectorAll('#lrf-partner-contacts input:checked')].map(x=>({email:x.value,name:x.dataset.name||x.value}));}
function setStatus(msg,type){const el=$('#lrf-mail-status');el.className=`lrf-mail-status show ${type}`;el.innerHTML=msg;el.scrollIntoView({behavior:'smooth',block:'nearest'});}

async function saveReport(){
  if(!selectedClientId||!selectedClient)throw new Error('Choisissez un client / prospect.');
  const text=$('#textarea-notes')?.value?.trim();if(!text)throw new Error('Écrivez votre compte-rendu.');
  const date=$('#input-date')?.value||new Date().toISOString().slice(0,10);const author=localStorage.getItem('agentName')||$('#input-author')?.value||'Agent';
  const ref=doc(db,'clients',selectedClientId);const snap=await getDoc(ref);if(!snap.exists())throw new Error('Client introuvable dans le CRM.');
  const cr={date,author,text,createdAt:new Date().toISOString(),source:'nouveau-compte-rendu'};
  await updateDoc(ref,{comptes_rendus:arrayUnion(cr)});
  return cr;
}

function mailHtml(cr){
  const c=selectedClient||{},partner=$('#lrf-partner-select')?.value||'';
  return `<div style="font-family:Arial,sans-serif;color:#202020;line-height:1.55"><h2 style="color:#9b7311">Compte-rendu de visite — ${esc(c.societe||c.nom||'Client')}</h2><p><strong>Date :</strong> ${esc(cr.date)}<br><strong>Commercial :</strong> ${esc(cr.author)}${partner?`<br><strong>Partenaire :</strong> ${esc(partner)}`:''}</p><div style="padding:16px;border-left:4px solid #d4af37;background:#faf7ef;white-space:pre-wrap">${esc(cr.text)}</div><p style="margin-top:18px;color:#6a6255;font-size:12px">Envoyé depuis le CRM LE ROY FACTORY.</p></div>`;
}

async function sendReport(cr){
  const rec=selectedRecipients();if(!$('#lrf-partner-select').value)throw new Error('Choisissez une usine / partenaire.');if(!rec.length)throw new Error('Choisissez au moins une personne destinataire.');
  const senderName=norm(localStorage.getItem('agentName'));const senderMode=senderName.includes('coryne')?'coryne':'jerome';
  const subject=`Compte-rendu de visite – ${selectedClient.societe||selectedClient.nom||'Client'} – ${cr.date}`;
  const res=await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senderMode,bccRecipients:rec.map(x=>x.email),subject,htmlContent:mailHtml(cr),attachments:[]})});
  const json=await res.json().catch(()=>({}));if(!res.ok||!json.success)throw new Error(json.error||`Erreur d’envoi (${res.status})`);
  return rec;
}

async function saveFlow(withMail){
  if(sending)return;sending=true;const a=$('#lrf-save-report'),b=$('#lrf-save-send-report');a.disabled=b.disabled=true;b.textContent=withMail?'Enregistrement et envoi…':'✉️ Enregistrer + envoyer';a.textContent=withMail?'💾 Enregistrer seulement':'Enregistrement…';
  try{
    const cr=await saveReport();
    if(withMail){
      try{const rec=await sendReport(cr);setStatus(`✅ <strong>Compte-rendu enregistré et mail envoyé.</strong><br>${rec.length} destinataire(s) : ${esc(rec.map(x=>x.name).join(', '))}`,'ok');}
      catch(e){console.error(e);setStatus(`⚠️ <strong>Compte-rendu enregistré</strong>, mais le mail n’a pas été envoyé.<br>${esc(e.message)}`,'warn');return;}
    }else setStatus('✅ <strong>Compte-rendu enregistré.</strong>','ok');
    setTimeout(()=>{location.href='comptes-rendus.html'},withMail?1800:900);
  }catch(e){console.error(e);setStatus(`❌ ${esc(e.message||'Erreur lors de l’enregistrement.')}`,'err');}
  finally{sending=false;a.disabled=b.disabled=false;a.textContent='💾 Enregistrer seulement';b.textContent='✉️ Enregistrer + envoyer';}
}

function loadClients(){
  onSnapshot(collection(db,'clients'),snap=>{clients=snap.docs.map(d=>({id:d.id,...d.data()})).filter(c=>!c.archived&&!c.archive).sort((a,b)=>String(a.societe||'').localeCompare(String(b.societe||''),'fr'));
    const requested=new URLSearchParams(location.search).get('client');if(requested&&!selectedClientId&&clients.some(c=>c.id===requested))chooseClient(requested);
  },err=>{console.error('[Nouveau CR] Chargement clients',err);setStatus('❌ Impossible de charger les clients du CRM.','err')});
}

function blockLegacySubmit(){const form=$('#cr-form');if(!form)return;form.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();saveFlow(false)},true);}
function init(){injectStyles();installClientSearch();installMailBlock();blockLegacySubmit();loadClients();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
