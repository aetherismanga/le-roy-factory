import { db } from './firebase.js';
import { collection, doc, updateDoc, setDoc, onSnapshot, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const manualMappings=new Map();
let crmClients=[];
let busy=false;

function activePartner(){return document.querySelector('.partner-tab.active')?.dataset.partner||''}
function clean(v){return String(v||'').trim()}
function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function mappingId(partner,factory){return `${partner}__${factory}`.replace(/[^a-zA-Z0-9_-]/g,'_')}
function clientName(c){return c?.societe||c?.nomSociete||c?.nom||'Client sans nom'}
function clientDept(c){let d=clean(c?.departement||c?.dept);if(!d){const cp=clean(c?.codePostal||c?.cp);if(/^20[01]/.test(cp))d=cp.startsWith('200')?'2A':'2B';else if(/^\d{5}$/.test(cp))d=cp.slice(0,2)}return d}
function flattenCodes(v){if(Array.isArray(v))return v.flatMap(flattenCodes);const s=clean(v);return s?[s]:[]}
function clientLRFCodes(c){return [...new Set([clean(c?.codeClient),...flattenCodes(c?.codesLRF)].filter(Boolean))]}
function partnerCodes(c,partner){
  const vals=[];
  if(partner==='elios-ceramica')vals.push(c.codeElios,c.numeroClientElios,c.eliosCode);
  if(partner==='view-ceramica')vals.push(c.codeView,c.numeroClientView,c.viewCode);
  vals.push(c.codesPartenaires?.[partner],c.numerosPartenaires?.[partner],c.codesPartenairesMulti?.[partner]);
  return [...new Set(flattenCodes(vals))];
}

function injectStyles(){
  if(document.getElementById('lrf-manual-link-style'))return;
  const s=document.createElement('style');s.id='lrf-manual-link-style';s.textContent=`
    .lrf-edit-manual{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;position:relative}.lrf-link-client{border:1px solid #D4AF37;background:#fffaf0;color:#6b5200;border-radius:6px;padding:.35rem .5rem;font-size:.7rem;font-weight:800;cursor:pointer}
    .lrf-client-searchbox{width:min(430px,80vw);margin-top:.3rem;padding:.5rem;border:1px solid #D4AF37;border-radius:9px;background:#fff;box-shadow:0 8px 22px rgba(0,0,0,.12)}.lrf-client-searchbox input{width:100%;box-sizing:border-box;min-height:40px;border:1px solid #D7D0C4;border-radius:7px;padding:.5rem .65rem;font:inherit;font-size:.78rem}
    .lrf-client-results{display:grid;gap:.3rem;margin-top:.4rem;max-height:240px;overflow:auto}.lrf-client-result{width:100%;text-align:left;border:1px solid #E8E2D7;background:#fff;border-radius:7px;padding:.5rem .55rem;cursor:pointer}.lrf-client-result:hover{border-color:#D4AF37;background:#FFFDF6}.lrf-client-result strong{display:block;font-size:.76rem}.lrf-client-result small{display:block;color:#777;font-size:.68rem;margin-top:2px}.lrf-client-empty{padding:.55rem;color:#777;font-size:.72rem}.lrf-link-status{font-size:.68rem;color:#2f7a48;font-weight:700}
  `;document.head.appendChild(s);
}

function editorHtml(partner,factory,saved=''){
  const key=`${partner}|${factory}`;
  return `<div class="lrf-edit lrf-edit-manual" data-manual-key="${esc(key)}"><input type="text" maxlength="30" placeholder="Code LRF" value="${esc(saved)}" data-manual-lrf="${esc(key)}"><button type="button" class="lrf-save" data-save-manual-lrf="${esc(key)}" title="Associer ce Code LRF existant">✓</button><button type="button" class="lrf-link-client" data-link-manual-client="${esc(key)}">👤 Associer à un client</button></div>`;
}

function decorateTable(){
  const partner=activePartner();if(!partner||partner==='all')return;
  document.querySelectorAll('#stats-body tr').forEach(tr=>{
    const cells=tr.querySelectorAll('td');if(cells.length<3)return;
    const meta=cells[0].querySelector('small')?.textContent||'',factory=clean(cells[1].textContent);
    if(!factory||!meta.includes('Non associé au CRM'))return;
    const key=`${partner}|${factory}`;if(cells[2].querySelector('[data-manual-lrf]'))return;
    const saved=manualMappings.get(key)?.codeLRF||'';cells[2].innerHTML=editorHtml(partner,factory,saved);
  });
}
function decorateMobile(){
  const partner=activePartner();if(!partner||partner==='all')return;
  document.querySelectorAll('#stats-mobile-list .client-stat-card').forEach(card=>{
    const zones=[...card.querySelectorAll('.mobile-lrf')],zone=zones.find(z=>z.querySelector('small')?.textContent?.includes('Code LRF'));
    if(!zone||zone.querySelector('[data-manual-lrf]'))return;
    const codesZone=zones.find(z=>/N° usine|Codes? usine/i.test(z.querySelector('small')?.textContent||''));
    const headText=codesZone?.textContent||card.querySelector('.client-stat-head small')?.textContent||'';
    const match=headText.match(/\b(0*\d{5,}|[A-Z][A-Z0-9-]*\d[A-Z0-9-]*)\b/);if(!match)return;
    const key=`${partner}|${match[1]}`,saved=manualMappings.get(key)?.codeLRF||'',label=zone.querySelector('small')?.outerHTML||'<small>Code LRF</small>';
    zone.innerHTML=label+editorHtml(partner,match[1],saved);
  });
}
function decorate(){injectStyles();decorateTable();decorateMobile()}

function partnerPatch(client,partner,factory){
  const existing=partnerCodes(client,partner),patch={};
  patch[`codesPartenairesMulti.${partner}`]=arrayUnion(factory);
  if(!existing.length){patch[`codesPartenaires.${partner}`]=factory;if(partner==='elios-ceramica')patch.codeElios=factory;if(partner==='view-ceramica')patch.codeView=factory}
  return patch;
}
function searchClients(q){
  const k=norm(q);if(!k)return [];
  return crmClients.filter(c=>{
    if(c.archived===true||!clientLRFCodes(c).length)return false;
    const text=norm(`${clientLRFCodes(c).join(' ')} ${clientName(c)} ${clientDept(c)}`);return text.includes(k);
  }).sort((a,b)=>clientName(a).localeCompare(clientName(b),'fr')).slice(0,15);
}
function renderClientResults(box,key,q){
  if(!q.trim()){box.innerHTML='<div class="lrf-client-empty">Tape un nom, un Code LRF ou un département.</div>';return}
  const rows=searchClients(q);box.innerHTML=rows.length?rows.map(c=>`<button type="button" class="lrf-client-result" data-pick-manual-client="${esc(c.id)}" data-pick-manual-key="${esc(key)}"><strong>${esc(clientLRFCodes(c)[0])} — ${esc(clientName(c))}</strong><small>${clientDept(c)?`Département ${esc(clientDept(c))}`:'Département non renseigné'}</small></button>`).join(''):'<div class="lrf-client-empty">Aucun client existant trouvé.</div>';
}
function openClientPicker(key,btn){
  const wrap=btn.closest('[data-manual-key]');if(!wrap)return;
  const old=wrap.querySelector('.lrf-client-searchbox');if(old){old.remove();return}
  document.querySelectorAll('.lrf-client-searchbox').forEach(x=>x.remove());
  const box=document.createElement('div');box.className='lrf-client-searchbox';box.innerHTML=`<input type="search" autocomplete="off" placeholder="Rechercher : nom, LRF-xxxxx, département…"><div class="lrf-client-results"><div class="lrf-client-empty">Tape pour rechercher dans les fiches existantes.</div></div>`;
  wrap.appendChild(box);const input=box.querySelector('input'),results=box.querySelector('.lrf-client-results');input.addEventListener('input',()=>renderClientResults(results,key,input.value));input.focus();
}

async function associateToClient(key,clientId,source){
  if(busy)return;
  const [partner,factory]=key.split('|'),client=crmClients.find(c=>c.id===clientId);if(!client)return;
  const codeLRF=clientLRFCodes(client)[0];if(!codeLRF){alert('Cette fiche ne possède pas de Code LRF existant.');return}
  busy=true;source.disabled=true;
  try{
    await updateDoc(doc(db,'clients',clientId),partnerPatch(client,partner,factory));
    await setDoc(doc(db,'statistiques_lrf_mappings',mappingId(partner,factory)),{partner,factory,codeLRF,clientId,updatedAt:new Date().toISOString()},{merge:true});
    manualMappings.set(key,{partner,factory,codeLRF,clientId});
    const wrap=source.closest('[data-manual-key]');if(wrap)wrap.innerHTML=`<span class="lrf-link-status">✓ ${esc(codeLRF)} — ${esc(clientName(client))}</span>`;
    setTimeout(()=>location.reload(),450);
  }catch(e){console.error(e);source.disabled=false;alert(e?.message||"Impossible d'associer ce client.")}
  finally{busy=false}
}

async function saveManual(key,btn){
  if(busy)return;
  const [partner,factory]=key.split('|'),inputs=[...document.querySelectorAll(`[data-manual-lrf="${CSS.escape(key)}"]`)];
  const codeLRF=clean(inputs.map(i=>i.value).find(Boolean));if(!codeLRF){inputs[0]?.focus();return}
  const matches=crmClients.filter(c=>clientLRFCodes(c).some(code=>norm(code)===norm(codeLRF)));
  if(!matches.length){alert('Ce Code LRF n’existe pas dans la base. Utilise « Associer à un client » pour le rechercher.');return}
  if(matches.length>1){alert('Plusieurs fiches portent ce Code LRF. Utilise la recherche pour choisir la bonne fiche.');return}
  const c=matches[0];busy=true;btn.disabled=true;btn.textContent='…';
  try{
    await updateDoc(doc(db,'clients',c.id),partnerPatch(c,partner,factory));
    await setDoc(doc(db,'statistiques_lrf_mappings',mappingId(partner,factory)),{partner,factory,codeLRF:clientLRFCodes(c)[0],clientId:c.id,updatedAt:new Date().toISOString()},{merge:true});
    btn.textContent='✓';setTimeout(()=>location.reload(),350);
  }catch(e){console.error(e);btn.textContent='!';btn.disabled=false;alert(e?.message||"Impossible d'associer ce Code LRF.")}
  finally{busy=false}
}

document.addEventListener('click',e=>{
  const save=e.target.closest('[data-save-manual-lrf]');if(save){saveManual(save.dataset.saveManualLrf,save);return}
  const link=e.target.closest('[data-link-manual-client]');if(link){openClientPicker(link.dataset.linkManualClient,link);return}
  const pick=e.target.closest('[data-pick-manual-client]');if(pick){associateToClient(pick.dataset.pickManualKey,pick.dataset.pickManualClient,pick);return}
});
document.addEventListener('keydown',e=>{const input=e.target.closest('[data-manual-lrf]');if(input&&e.key==='Enter'){e.preventDefault();document.querySelector(`[data-save-manual-lrf="${CSS.escape(input.dataset.manualLrf)}"]`)?.click()}});

onSnapshot(collection(db,'statistiques_lrf_mappings'),snap=>{manualMappings.clear();snap.forEach(d=>{const x=d.data();if(x.partner&&x.factory)manualMappings.set(`${x.partner}|${x.factory}`,x)});decorate()},()=>decorate());
onSnapshot(collection(db,'clients'),snap=>{crmClients=[];snap.forEach(d=>crmClients.push({id:d.id,...d.data()}));decorate()},()=>decorate());
let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})});observer.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
