import { db } from './firebase.js';
import { collection, getDocs, doc, updateDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const manualMappings=new Map();
let busy=false;

function activePartner(){return document.querySelector('.partner-tab.active')?.dataset.partner||''}
function clean(v){return String(v||'').trim()}
function mappingId(partner,factory){return `${partner}__${factory}`.replace(/[^a-zA-Z0-9_-]/g,'_')}

function editorHtml(partner,factory,saved=''){
  const key=`${partner}|${factory}`;
  return `<div class="lrf-edit lrf-edit-manual" data-manual-key="${key}"><input type="text" maxlength="30" placeholder="Code LRF" value="${String(saved).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" data-manual-lrf="${key}"><button type="button" class="lrf-save" data-save-manual-lrf="${key}" title="Enregistrer le code LRF">✓</button></div>`;
}

function decorateTable(){
  const partner=activePartner(); if(!partner)return;
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
  const partner=activePartner(); if(!partner)return;
  document.querySelectorAll('#stats-mobile-list .client-stat-card').forEach(card=>{
    const zone=card.querySelector('.mobile-lrf');
    if(!zone||zone.querySelector('[data-lrf-input]')||zone.querySelector('[data-manual-lrf]'))return;
    const headText=card.querySelector('.client-stat-head small')?.textContent||'';
    const match=headText.match(/\b(0*\d{5,})\b/);
    if(!match)return;
    const factory=match[1];
    const key=`${partner}|${factory}`;
    const saved=manualMappings.get(key)?.codeLRF||'';
    const label=zone.querySelector('small')?.outerHTML||'<small>Code LRF</small>';
    zone.innerHTML=label+editorHtml(partner,factory,saved);
  });
}

function decorate(){decorateTable();decorateMobile()}

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
    snap.forEach(d=>{
      const data=d.data();
      if(clean(data.codeClient).toLowerCase()===codeLRF.toLowerCase())matches.push({id:d.id,...data});
    });
    if(matches.length>1)throw new Error('Plusieurs clients ont ce même code LRF.');
    if(matches.length===1){
      const c=matches[0];
      const patch={};
      if(partner==='elios-ceramica')patch.codeElios=factory;
      else if(partner==='view-ceramica')patch.codeView=factory;
      patch[`codesPartenaires.${partner}`]=factory;
      await updateDoc(doc(db,'clients',c.id),patch);
      await setDoc(doc(db,'statistiques_lrf_mappings',mappingId(partner,factory)),{partner,factory,codeLRF,clientId:c.id,updatedAt:new Date().toISOString()},{merge:true});
      btn.textContent='✓';
      setTimeout(()=>location.reload(),350);
      return;
    }
    await setDoc(doc(db,'statistiques_lrf_mappings',mappingId(partner,factory)),{partner,factory,codeLRF,clientId:null,updatedAt:new Date().toISOString()},{merge:true});
    manualMappings.set(key,{codeLRF,clientId:null});
    inputs.forEach(i=>i.value=codeLRF);
    btn.textContent='✓';
    btn.disabled=false;
    alert('Code LRF enregistré. Aucun client du CRM ne porte encore ce code : la ligne restera non associée jusqu’à ce que ce code existe dans une fiche client.');
  }catch(e){
    console.error(e);btn.textContent='!';btn.disabled=false;
    alert(e?.message||"Impossible d'enregistrer le code LRF.");
  }finally{busy=false}
}

document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-save-manual-lrf]');
  if(btn)saveManual(btn.dataset.saveManualLrf,btn);
});

document.addEventListener('keydown',e=>{
  const input=e.target.closest('[data-manual-lrf]');
  if(input&&e.key==='Enter'){
    e.preventDefault();
    const key=input.dataset.manualLrf;
    document.querySelector(`[data-save-manual-lrf="${CSS.escape(key)}"]`)?.click();
  }
});

onSnapshot(collection(db,'statistiques_lrf_mappings'),snap=>{
  manualMappings.clear();
  snap.forEach(d=>{const x=d.data();if(x.partner&&x.factory)manualMappings.set(`${x.partner}|${x.factory}`,x)});
  decorate();
},()=>decorate());

const observer=new MutationObserver(()=>decorate());
observer.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
