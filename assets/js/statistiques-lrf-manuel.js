import { db } from './firebase.js';
import { collection, getDocs, doc, updateDoc, setDoc, onSnapshot, runTransaction, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const manualMappings=new Map();
let crmClients=[];
let busy=false;

function activePartner(){return document.querySelector('.partner-tab.active')?.dataset.partner||''}
function clean(v){return String(v||'').trim()}
function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function mappingId(partner,factory){return `${partner}__${factory}`.replace(/[^a-zA-Z0-9_-]/g,'_')}
function formatCode(n){return `LRF-${String(n).padStart(5,'0')}`}
function clientName(c){return c?.societe||c?.nomSociete||c?.nom||'Client sans nom'}
function clientDept(c){let d=clean(c?.departement||c?.dept);if(!d){const cp=clean(c?.codePostal||c?.cp);if(/^\d{5}$/.test(cp))d=cp.slice(0,2)}return d}
function flattenCodes(v){if(Array.isArray(v))return v.flatMap(flattenCodes);const s=clean(v);return s?[s]:[]}
function partnerCodes(c,partner){
  const vals=[];
  if(partner==='elios-ceramica')vals.push(c.codeElios,c.numeroClientElios,c.eliosCode);
  if(partner==='view-ceramica')vals.push(c.codeView,c.numeroClientView,c.viewCode);
  vals.push(c.codesPartenaires?.[partner],c.numerosPartenaires?.[partner],c.codesPartenairesMulti?.[partner]);
  return [...new Set(flattenCodes(vals))];
}
function partnerCode(c,partner){return partnerCodes(c,partner)[0]||''}

function injectStyles(){
  if(document.getElementById('lrf-manual-link-style'))return;
  const s=document.createElement('style');s.id='lrf-manual-link-style';s.textContent=`.lrf-edit-manual{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap}.lrf-link-client{border:1px solid #D4AF37;background:#fffaf0;color:#6b5200;border-radius:6px;padding:.35rem .5rem;font-size:.7rem;font-weight:800;cursor:pointer}.lrf-client-picker{max-width:290px;border:1px solid #D4AF37;border-radius:6px;padding:.35rem;background:#fff;font-size:.72rem}.lrf-link-status{font-size:.68rem;color:#6b7280}`;document.head.appendChild(s);
}

function editorHtml(partner,factory,saved=''){
  const key=`${partner}|${factory}`;
  return `<div class="lrf-edit lrf-edit-manual" data-manual-key="${esc(key)}"><input type="text" maxlength="30" placeholder="Code LRF" value="${esc(saved)}" data-manual-lrf="${esc(key)}"><button type="button" class="lrf-save" data-save-manual-lrf="${esc(key)}" title="Enregistrer le code LRF">✓</button><button type="button" class="lrf-link-client" data-link-manual-client="${esc(key)}">👤 Associer à un client</button></div>`;
}

function decorateTable(){
  const partner=activePartner(); if(!partner||partner==='all')return;
  document.querySelectorAll('#stats-body tr').forEach(tr=>{
    const cells=tr.querySelectorAll('td');
    if(cells.length<3)return;
    const meta=cells[0].querySelector('small')?.textContent||'';
    const factory=clean(cells[1].textContent);
    if(!factory||!meta.includes('Non associé au CRM'))return;
    const key=`${partner}|${factory}`;
    if(cells[2].querySelector('[data-manual-lrf]'))return;
    const saved=manualMappings.get(key)?.codeLRF||'';
    cells[2].innerHTML=editorHtml(partner,factory,saved);
  });
}

function decorateMobile(){
  const partner=activePartner(); if(!partner||partner==='all')return;
  document.querySelectorAll('#stats-mobile-list .client-stat-card').forEach(card=>{
    const zones=[...card.querySelectorAll('.mobile-lrf')];
    const zone=zones.find(z=>z.querySelector('small')?.textContent?.includes('Code LRF'));
    if(!zone||zone.querySelector('[data-lrf-input]')||zone.querySelector('[data-manual-lrf]'))return;
    const codesZone=zones.find(z=>z.querySelector('small')?.textContent?.includes('Codes usine'));
    const headText=codesZone?.textContent||card.querySelector('.client-stat-head small')?.textContent||'';
    const match=headText.match(/\b(0*\d{5,}|[A-Z][A-Z0-9-]*\d[A-Z0-9-]*)\b/);
    if(!match)return;
    const factory=match[1];
    const key=`${partner}|${factory}`;
    const saved=manualMappings.get(key)?.codeLRF||'';
    const label=zone.querySelector('small')?.outerHTML||'<small>Code LRF</small>';
    zone.innerHTML=label+editorHtml(partner,factory,saved);
  });
}

function decorate(){injectStyles();decorateTable();decorateMobile()}

async function ensureClientCode(clientId){
  const clientRef=doc(db,'clients',clientId),counterRef=doc(db,'crm_meta','client_codes');
  return runTransaction(db,async tx=>{
    const clientSnap=await tx.get(clientRef);if(!clientSnap.exists())throw new Error('Client introuvable.');
    const data=clientSnap.data();if(/^LRF-\d{5}$/i.test(clean(data.codeClient)))return data.codeClient;
    const counterSnap=await tx.get(counterRef);const last=Number(counterSnap.exists()?counterSnap.data().lastNumber:0)||0;const next=last+1;if(next>99999)throw new Error('Limite des codes LRF atteinte.');
    const code=formatCode(next);tx.set(counterRef,{lastNumber:next,updatedAt:new Date().toISOString()},{merge:true});tx.update(clientRef,{codeClient:code});return code;
  });
}

function clientOptions(){
  return [...crmClients].sort((a,b)=>clientName(a).localeCompare(clientName(b),'fr')).map(c=>`<option value="${esc(c.id)}">${esc(c.codeClient||'Sans code')} — ${esc(clientName(c))}${clientDept(c)?` — ${esc(clientDept(c))}`:''}${c.archived===true?' — archivé':''}</option>`).join('');
}

function openClientPicker(key,btn){
  const wrap=btn.closest('[data-manual-key]');if(!wrap)return;
  const existing=wrap.querySelector('.lrf-client-picker');if(existing){existing.remove();return;}
  const select=document.createElement('select');select.className='lrf-client-picker';select.innerHTML=`<option value="">Choisir une fiche client…</option>${clientOptions()}`;btn.insertAdjacentElement('afterend',select);select.focus();
  select.addEventListener('change',()=>{if(select.value)associateToClient(key,select.value,select)});
}

function partnerPatch(client,partner,factory){
  const existing=partnerCodes(client,partner);
  const patch={};
  patch[`codesPartenairesMulti.${partner}`]=arrayUnion(factory);
  if(!existing.length){
    patch[`codesPartenaires.${partner}`]=factory;
    if(partner==='elios-ceramica')patch.codeElios=factory;
    if(partner==='view-ceramica')patch.codeView=factory;
  }
  return patch;
}

async function associateToClient(key,clientId,select){
  if(busy)return;
  const [partner,factory]=key.split('|');const client=crmClients.find(c=>c.id===clientId);if(!client)return;
  busy=true;select.disabled=true;
  try{
    const codeLRF=await ensureClientCode(clientId);
    await updateDoc(doc(db,'clients',clientId),partnerPatch(client,partner,factory));
    await setDoc(doc(db,'statistiques_lrf_mappings',mappingId(partner,factory)),{partner,factory,codeLRF,clientId,updatedAt:new Date().toISOString()},{merge:true});
    manualMappings.set(key,{partner,factory,codeLRF,clientId});
    select.insertAdjacentHTML('afterend',`<span class="lrf-link-status">✓ ${esc(codeLRF)} associé à ${esc(clientName(client))} — code ajouté sans supprimer les autres magasins</span>`);
    setTimeout(()=>location.reload(),500);
  }catch(e){console.error(e);select.disabled=false;alert(e?.message||"Impossible d'associer ce client.");}
  finally{busy=false}
}

async function saveManual(key,btn){
  if(busy)return;
  const [partner,factory]=key.split('|');
  const inputs=[...document.querySelectorAll(`[data-manual-lrf="${CSS.escape(key)}"]`)];
  const codeLRF=clean(inputs.map(i=>i.value).find(Boolean));
  if(!codeLRF){inputs[0]?.focus();return;}
  busy=true;btn.disabled=true;btn.textContent='…';
  try{
    const snap=await getDocs(collection(db,'clients'));
    const matches=[];
    snap.forEach(d=>{const data=d.data();if(clean(data.codeClient).toLowerCase()===codeLRF.toLowerCase())matches.push({id:d.id,...data});});
    if(matches.length>1)throw new Error('Plusieurs clients ont ce même code LRF.');
    if(matches.length===1){
      const c=matches[0];
      await updateDoc(doc(db,'clients',c.id),partnerPatch(c,partner,factory));
      await setDoc(doc(db,'statistiques_lrf_mappings',mappingId(partner,factory)),{partner,factory,codeLRF,clientId:c.id,updatedAt:new Date().toISOString()},{merge:true});
      btn.textContent='✓';setTimeout(()=>location.reload(),350);return;
    }
    await setDoc(doc(db,'statistiques_lrf_mappings',mappingId(partner,factory)),{partner,factory,codeLRF,clientId:null,updatedAt:new Date().toISOString()},{merge:true});
    manualMappings.set(key,{codeLRF,clientId:null});inputs.forEach(i=>i.value=codeLRF);btn.textContent='✓';btn.disabled=false;
    alert('Code LRF enregistré. Aucun client du CRM ne porte encore ce code. Tu peux utiliser « Associer à un client » pour choisir directement la fiche.');
  }catch(e){console.error(e);btn.textContent='!';btn.disabled=false;alert(e?.message||"Impossible d'enregistrer le code LRF.");}
  finally{busy=false}
}

document.addEventListener('click',e=>{
  const save=e.target.closest('[data-save-manual-lrf]');if(save){saveManual(save.dataset.saveManualLrf,save);return;}
  const link=e.target.closest('[data-link-manual-client]');if(link)openClientPicker(link.dataset.linkManualClient,link);
});

document.addEventListener('keydown',e=>{
  const input=e.target.closest('[data-manual-lrf]');if(input&&e.key==='Enter'){e.preventDefault();const key=input.dataset.manualLrf;document.querySelector(`[data-save-manual-lrf="${CSS.escape(key)}"]`)?.click();}
});

onSnapshot(collection(db,'statistiques_lrf_mappings'),snap=>{manualMappings.clear();snap.forEach(d=>{const x=d.data();if(x.partner&&x.factory)manualMappings.set(`${x.partner}|${x.factory}`,x)});decorate();},()=>decorate());
onSnapshot(collection(db,'clients'),snap=>{crmClients=[];snap.forEach(d=>crmClients.push({id:d.id,...d.data()}));decorate();},()=>decorate());

const observer=new MutationObserver(()=>decorate());
observer.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();