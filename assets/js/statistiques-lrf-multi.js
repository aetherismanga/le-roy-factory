import { db } from './firebase.js';
import { collection, onSnapshot, doc, runTransaction } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let clients=[];
let activeClientId=null;
let creating=false;

const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clean=v=>String(v||'').trim();
const norm=v=>clean(v).toLowerCase();
const codeNumber=v=>{const m=clean(v).match(/^LRF-(\d{5})$/i);return m?Number(m[1]):0};
const formatCode=n=>`LRF-${String(n).padStart(5,'0')}`;

function clientName(c){return c?.societe||c?.nomSociete||c?.nom||'Client'}
function extraCodes(c){return Array.isArray(c?.codesLRF)?c.codesLRF.map(clean).filter(Boolean):[]}
function allLRFCodes(c){return [...new Set([clean(c?.codeClient),...extraCodes(c)].filter(Boolean))]}
function findClientByAnyLRF(code){const k=norm(code);return clients.find(c=>allLRFCodes(c).some(x=>norm(x)===k))||null}

function ensureStyles(){
  if(document.getElementById('stats-lrf-multi-style'))return;
  const s=document.createElement('style');s.id='stats-lrf-multi-style';s.textContent=`
    .stats-factory-readonly{display:block;font-size:.74rem;font-weight:800;color:#454545;padding:.18rem 0}
    .stats-lrf-multi-btn{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #D8C77B;background:#FFFDF6;color:#2c281c;border-radius:7px;padding:.36rem .5rem;font:inherit;font-size:.75rem;font-weight:900;cursor:pointer;text-align:left;flex-wrap:wrap}
    .stats-lrf-multi-btn .edit{color:#9b7b00}.stats-lrf-more{font-size:.68rem;color:#786d4d;font-weight:800}
    .stats-lrf-modal{position:fixed;inset:0;background:rgba(0,0,0,.56);z-index:12000;display:none;align-items:center;justify-content:center;padding:1rem}
    .stats-lrf-modal.open{display:flex}.stats-lrf-dialog{width:min(520px,100%);background:#fff;border:1px solid #D4AF37;border-radius:14px;padding:1.1rem;box-shadow:0 22px 60px rgba(0,0,0,.3)}
    .stats-lrf-dialog h3{margin:.1rem 0 .25rem}.stats-lrf-dialog p{margin:.15rem 0 1rem;color:#666;font-size:.8rem}
    .stats-lrf-code-line{display:flex;justify-content:space-between;align-items:center;gap:.8rem;padding:.65rem .75rem;border:1px solid #E7E1D4;border-radius:9px;margin:.45rem 0;background:#FBFAF7}
    .stats-lrf-code-line strong{font-size:.9rem}.stats-lrf-code-line small{color:#777}.stats-lrf-primary{color:#8b6b00;font-weight:800}
    .stats-lrf-actions{display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-top:1rem}.stats-lrf-actions button{min-height:40px;border-radius:8px;padding:.5rem .8rem;font-weight:800;cursor:pointer}
    .stats-lrf-create{background:#111;color:#FFD700;border:0}.stats-lrf-close{background:#eee;border:0}.stats-lrf-note{margin-top:.75rem!important;color:#786d4d!important;font-size:.72rem!important}
  `;document.head.appendChild(s);
}

function ensureModal(){
  if(document.getElementById('stats-lrf-multi-modal'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="stats-lrf-multi-modal" class="stats-lrf-modal"><div class="stats-lrf-dialog"><h3 id="stats-lrf-multi-title">Codes LRF</h3><p>Un même client peut avoir plusieurs codes LRF, par exemple un code par magasin. Le chiffre d'affaires reste regroupé sur la même fiche client.</p><div id="stats-lrf-multi-list"></div><p class="stats-lrf-note">Le code principal existant est conservé. Les nouveaux codes sont ajoutés sans remplacer les précédents.</p><div class="stats-lrf-actions"><button id="stats-lrf-multi-close" class="stats-lrf-close" type="button">Fermer</button><button id="stats-lrf-multi-create" class="stats-lrf-create" type="button">+ Créer un nouveau code LRF</button></div></div></div>`);
}

function renderModal(){
  const c=clients.find(x=>x.id===activeClientId);if(!c)return;
  document.getElementById('stats-lrf-multi-title').textContent=`Codes LRF — ${clientName(c)}`;
  const codes=allLRFCodes(c);
  document.getElementById('stats-lrf-multi-list').innerHTML=codes.length?codes.map((code,i)=>`<div class="stats-lrf-code-line"><strong>${esc(code)}</strong><small class="${i===0?'stats-lrf-primary':''}">${i===0?'Code principal':'Code magasin supplémentaire'}</small></div>`).join(''):'<div class="stats-lrf-code-line"><strong>Aucun code LRF</strong></div>';
}
function openModal(clientId){activeClientId=clientId;ensureModal();renderModal();document.getElementById('stats-lrf-multi-modal').classList.add('open')}
function closeModal(){document.getElementById('stats-lrf-multi-modal')?.classList.remove('open');activeClientId=null}

function factoryText(button){return clean(button.textContent).replace(/\s*[✎✏]\s*$/,'')}
function makeFactoryReadonly(container){
  const buttons=[...container.querySelectorAll('[data-edit-codes-client]')];
  let clientId=buttons[0]?.dataset.editCodesClient||'';
  for(const b of buttons){
    const span=document.createElement('span');span.className='stats-factory-readonly';span.textContent=factoryText(b);b.replaceWith(span);
  }
  return clientId;
}
function lrfButton(c){
  const codes=allLRFCodes(c);const main=codes[0]||'Code LRF';
  const more=Math.max(0,codes.length-1);
  return `<button type="button" class="stats-lrf-multi-btn" data-edit-lrf-client="${esc(c.id)}" title="Voir ou ajouter des codes LRF"><span>${esc(main)}</span>${more?`<span class="stats-lrf-more">+${more}</span>`:''}<span class="edit">✎</span></button>`;
}
function findClientFromLRFCell(cell){
  const code=clean(cell?.textContent).match(/LRF-\d{5}/i)?.[0]||'';
  return code?findClientByAnyLRF(code):null;
}

function decorateTable(){
  document.querySelectorAll('#stats-body tr').forEach(tr=>{
    const cells=tr.querySelectorAll('td');if(cells.length<3)return;
    let clientId=makeFactoryReadonly(cells[1]);
    let c=clientId?clients.find(x=>x.id===clientId):null;
    if(!c)c=findClientFromLRFCell(cells[2]);
    const meta=cells[0].querySelector('small')?.textContent||'';
    if(!c||!meta.includes('Associé au CRM'))return;
    if(cells[2].querySelector('[data-manual-lrf]'))return;
    cells[2].innerHTML=lrfButton(c);
  });
}

function decorateMobile(){
  document.querySelectorAll('#stats-mobile-list .client-stat-card').forEach(card=>{
    const zones=[...card.querySelectorAll('.mobile-lrf')];
    const factoryZone=zones.find(z=>/Codes? usine/i.test(z.querySelector('small')?.textContent||''));
    const lrfZone=zones.find(z=>/Code LRF/i.test(z.querySelector('small')?.textContent||''));
    let clientId=factoryZone?makeFactoryReadonly(factoryZone):'';
    let c=clientId?clients.find(x=>x.id===clientId):null;
    if(!c)c=findClientFromLRFCell(lrfZone);
    if(!c||!lrfZone||lrfZone.querySelector('[data-manual-lrf]'))return;
    const label=lrfZone.querySelector('small')?.outerHTML||'<small>Code LRF</small>';
    lrfZone.innerHTML=label+lrfButton(c);
  });
}
function decorate(){ensureStyles();ensureModal();decorateTable();decorateMobile()}

async function createAdditionalCode(){
  if(creating||!activeClientId)return;
  const clientRef=doc(db,'clients',activeClientId),counterRef=doc(db,'crm_meta','client_codes');
  const btn=document.getElementById('stats-lrf-multi-create');creating=true;btn.disabled=true;btn.textContent='Création…';
  try{
    const maxKnown=clients.reduce((m,c)=>Math.max(m,...allLRFCodes(c).map(codeNumber)),0);
    const code=await runTransaction(db,async tx=>{
      const [clientSnap,counterSnap]=await Promise.all([tx.get(clientRef),tx.get(counterRef)]);
      if(!clientSnap.exists())throw new Error('Client introuvable.');
      const data=clientSnap.data();
      const last=Math.max(Number(counterSnap.exists()?counterSnap.data().lastNumber:0)||0,maxKnown);
      const next=last+1;if(next>99999)throw new Error('Limite des codes LRF atteinte.');
      const newCode=formatCode(next);
      const extras=[...new Set([...(Array.isArray(data.codesLRF)?data.codesLRF:[]).map(clean).filter(Boolean),newCode])];
      tx.set(counterRef,{lastNumber:next,updatedAt:new Date().toISOString()},{merge:true});
      if(!clean(data.codeClient))tx.update(clientRef,{codeClient:newCode,codesLRF:extras.filter(x=>x!==newCode)});
      else tx.update(clientRef,{codesLRF:extras});
      return newCode;
    });
    btn.textContent=`✓ ${code} créé`;
  }catch(e){console.error(e);alert(e?.message||'Impossible de créer le nouveau code LRF.');btn.disabled=false;btn.textContent='+ Créer un nouveau code LRF';creating=false;return;}
  creating=false;
}

document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-edit-lrf-client]');if(edit){openModal(edit.dataset.editLrfClient);return;}
  if(e.target.id==='stats-lrf-multi-close'||e.target===document.getElementById('stats-lrf-multi-modal')){closeModal();return;}
  if(e.target.id==='stats-lrf-multi-create'){createAdditionalCode();return;}
},true);

onSnapshot(collection(db,'clients'),snap=>{
  clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));
  if(activeClientId)renderModal();
  setTimeout(decorate,0);
});

const observer=new MutationObserver(()=>setTimeout(decorate,0));
if(document.body)observer.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
