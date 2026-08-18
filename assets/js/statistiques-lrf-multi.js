import { db } from './firebase.js';
import { collection, onSnapshot, doc, runTransaction, updateDoc, arrayUnion, arrayRemove, deleteField } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let clients=[];
let activeClientId=null;
let associating=false;
let cleanupDone=false;

const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clean=v=>String(v||'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

function clientName(c){return c?.societe||c?.nomSociete||c?.nom||'Client'}
function clientDept(c){
  let d=clean(c?.departement||c?.department||c?.dept).toUpperCase();
  if(!d){const cp=clean(c?.codePostal||c?.cp||c?.postalCode);if(/^20[01]/.test(cp))d=cp.startsWith('200')?'2A':'2B';else if(/^\d{5}$/.test(cp))d=cp.slice(0,2)}
  return d;
}
function extraCodes(c){return Array.isArray(c?.codesLRF)?c.codesLRF.map(clean).filter(Boolean):[]}
function ownLRFCodes(c){return [...new Set([clean(c?.codeClient),...extraCodes(c)].filter(Boolean))]}
function linkedIds(c){return Array.isArray(c?.statsLinkedClientIds)?c.statsLinkedClientIds.filter(Boolean):[]}
function byId(id){return clients.find(c=>c.id===id)||null}
function canonicalClient(c){
  const seen=new Set();let cur=c;
  while(cur?.statsParentClientId&&!seen.has(cur.id)){
    seen.add(cur.id);const parent=byId(cur.statsParentClientId);if(!parent)break;cur=parent;
  }
  return cur;
}
function linkedClients(c){return linkedIds(c).map(byId).filter(Boolean)}
function allGroupCodes(c){
  const root=canonicalClient(c);if(!root)return [];
  return [...new Set([...ownLRFCodes(root),...linkedClients(root).flatMap(ownLRFCodes)].filter(Boolean))];
}
function findClientByAnyLRF(code){
  const k=norm(code);const exact=clients.find(c=>ownLRFCodes(c).some(x=>norm(x)===k));return exact?canonicalClient(exact):null;
}

function ensureStyles(){
  if(document.getElementById('stats-lrf-multi-style'))return;
  const s=document.createElement('style');s.id='stats-lrf-multi-style';s.textContent=`
    .stats-factory-readonly{display:block;font-size:.74rem;font-weight:800;color:#454545;padding:.18rem 0}
    .stats-lrf-multi-btn{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #D8C77B;background:#FFFDF6;color:#2c281c;border-radius:7px;padding:.36rem .5rem;font:inherit;font-size:.75rem;font-weight:900;cursor:pointer;text-align:left;flex-wrap:wrap}
    .stats-lrf-multi-btn .edit{color:#9b7b00}.stats-lrf-more{font-size:.68rem;color:#786d4d;font-weight:800}
    .stats-lrf-modal{position:fixed;inset:0;background:rgba(0,0,0,.56);z-index:12000;display:none;align-items:center;justify-content:center;padding:1rem}.stats-lrf-modal.open{display:flex}
    .stats-lrf-dialog{width:min(620px,100%);max-height:88vh;overflow:auto;background:#fff;border:1px solid #D4AF37;border-radius:14px;padding:1.1rem;box-shadow:0 22px 60px rgba(0,0,0,.3)}
    .stats-lrf-dialog h3{margin:.1rem 0 .25rem}.stats-lrf-dialog>p{margin:.15rem 0 1rem;color:#666;font-size:.8rem}
    .stats-lrf-code-line{display:flex;justify-content:space-between;align-items:center;gap:.8rem;padding:.65rem .75rem;border:1px solid #E7E1D4;border-radius:9px;margin:.45rem 0;background:#FBFAF7}.stats-lrf-code-line strong{font-size:.9rem}.stats-lrf-code-line small{color:#777}.stats-lrf-primary{color:#8b6b00!important;font-weight:800}.stats-lrf-unlink{border:0;background:#FCECEC;color:#A33;border-radius:7px;padding:.35rem .55rem;font-weight:800;cursor:pointer}
    .stats-lrf-search{margin-top:1rem;padding-top:.9rem;border-top:1px solid #EEE8DD}.stats-lrf-search label{display:block;font-size:.72rem;text-transform:uppercase;font-weight:900;color:#6b6252;margin-bottom:.35rem}.stats-lrf-search input{width:100%;box-sizing:border-box;min-height:44px;border:1px solid #D8C77B;border-radius:9px;padding:.6rem .75rem;font:inherit}
    .stats-lrf-search-results{display:grid;gap:.35rem;margin-top:.45rem;max-height:260px;overflow:auto}.stats-lrf-search-result{width:100%;text-align:left;border:1px solid #E5DFD3;background:#fff;border-radius:8px;padding:.55rem .65rem;cursor:pointer}.stats-lrf-search-result:hover{border-color:#D4AF37;background:#FFFDF6}.stats-lrf-search-result strong{display:block}.stats-lrf-search-result small{color:#777}.stats-lrf-search-empty{padding:.65rem;color:#777;font-size:.78rem}
    .stats-lrf-actions{display:flex;justify-content:flex-start;margin-top:1rem}.stats-lrf-actions button{min-height:40px;border-radius:8px;padding:.5rem .8rem;font-weight:800;cursor:pointer}.stats-lrf-close{background:#eee;border:0}
  `;document.head.appendChild(s);
}

function ensureModal(){
  if(document.getElementById('stats-lrf-multi-modal'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="stats-lrf-multi-modal" class="stats-lrf-modal"><div class="stats-lrf-dialog"><h3 id="stats-lrf-multi-title">Codes LRF</h3><p>Pour regrouper plusieurs magasins, associe une fiche client déjà existante. Aucun nouveau Code LRF n’est créé.</p><div id="stats-lrf-multi-list"></div><div class="stats-lrf-search"><label for="stats-lrf-existing-search">Associer un Code LRF existant</label><input id="stats-lrf-existing-search" type="search" autocomplete="off" placeholder="Tape un nom, un Code LRF ou un département…"><div id="stats-lrf-existing-results" class="stats-lrf-search-results"></div></div><div class="stats-lrf-actions"><button id="stats-lrf-multi-close" class="stats-lrf-close" type="button">Fermer</button></div></div></div>`);
  document.getElementById('stats-lrf-existing-search').addEventListener('input',renderSearchResults);
}

function renderModal(){
  const root=canonicalClient(byId(activeClientId));if(!root)return;
  activeClientId=root.id;
  document.getElementById('stats-lrf-multi-title').textContent=`Codes LRF — ${clientName(root)}`;
  const lines=[];
  const primary=clean(root.codeClient);
  if(primary)lines.push(`<div class="stats-lrf-code-line"><div><strong>${esc(primary)}</strong><small class="stats-lrf-primary">Code principal — ${esc(clientName(root))}</small></div></div>`);
  for(const legacy of extraCodes(root))lines.push(`<div class="stats-lrf-code-line"><div><strong>${esc(legacy)}</strong><small>Code supplémentaire existant</small></div></div>`);
  for(const linked of linkedClients(root)){
    const code=clean(linked.codeClient)||ownLRFCodes(linked)[0]||'Sans Code LRF';
    lines.push(`<div class="stats-lrf-code-line"><div><strong>${esc(code)}</strong><small>Magasin associé — ${esc(clientName(linked))}${clientDept(linked)?` — ${esc(clientDept(linked))}`:''}</small></div><button type="button" class="stats-lrf-unlink" data-unlink-lrf-client="${esc(linked.id)}">Dissocier</button></div>`);
  }
  document.getElementById('stats-lrf-multi-list').innerHTML=lines.join('')||'<div class="stats-lrf-code-line"><strong>Aucun Code LRF</strong></div>';
  const search=document.getElementById('stats-lrf-existing-search');if(search)search.value='';
  renderSearchResults();
}
function openModal(clientId){activeClientId=canonicalClient(byId(clientId))?.id||clientId;ensureModal();renderModal();document.getElementById('stats-lrf-multi-modal').classList.add('open');setTimeout(()=>document.getElementById('stats-lrf-existing-search')?.focus(),50)}
function closeModal(){document.getElementById('stats-lrf-multi-modal')?.classList.remove('open');activeClientId=null}

function searchCandidates(q){
  const root=canonicalClient(byId(activeClientId));if(!root)return [];
  const excluded=new Set([root.id,...linkedIds(root)]);const k=norm(q);
  return clients.filter(c=>{
    if(excluded.has(c.id)||c.archived===true||c.statsParentClientId)return false;
    if(!clean(c.codeClient)&&!extraCodes(c).length)return false;
    if(!k)return false;
    const text=norm(`${ownLRFCodes(c).join(' ')} ${clientName(c)} ${clientDept(c)}`);
    return text.includes(k);
  }).sort((a,b)=>clientName(a).localeCompare(clientName(b),'fr')).slice(0,15);
}
function renderSearchResults(){
  const box=document.getElementById('stats-lrf-existing-results'),input=document.getElementById('stats-lrf-existing-search');if(!box||!input)return;
  const q=input.value.trim();if(q.length<1){box.innerHTML='<div class="stats-lrf-search-empty">Commence à taper pour rechercher dans les Codes LRF existants.</div>';return}
  const rows=searchCandidates(q);
  box.innerHTML=rows.length?rows.map(c=>`<button type="button" class="stats-lrf-search-result" data-associate-existing-client="${esc(c.id)}"><strong>${esc(clean(c.codeClient)||ownLRFCodes(c)[0]||'Sans code')} — ${esc(clientName(c))}</strong><small>${clientDept(c)?`Département ${esc(clientDept(c))}`:'Département non renseigné'}</small></button>`).join(''):'<div class="stats-lrf-search-empty">Aucun client existant trouvé.</div>';
}

async function associateExistingClient(selectedId){
  if(associating||!activeClientId)return;
  const root=canonicalClient(byId(activeClientId)),selected=byId(selectedId);if(!root||!selected||root.id===selected.id)return;
  if(selected.statsParentClientId&&selected.statsParentClientId!==root.id){alert('Cette fiche est déjà associée à un autre client.');return}
  if(linkedIds(selected).length){alert('Cette fiche possède déjà des magasins associés. Dissocie-les avant de la rattacher à une autre fiche.');return}
  associating=true;
  try{
    await runTransaction(db,async tx=>{
      const rootRef=doc(db,'clients',root.id),selectedRef=doc(db,'clients',selected.id);
      const [rootSnap,selectedSnap]=await Promise.all([tx.get(rootRef),tx.get(selectedRef)]);
      if(!rootSnap.exists()||!selectedSnap.exists())throw new Error('Fiche client introuvable.');
      tx.update(rootRef,{statsLinkedClientIds:arrayUnion(selected.id)});
      tx.update(selectedRef,{statsParentClientId:root.id});
    });
    const input=document.getElementById('stats-lrf-existing-search');if(input)input.value='';
  }catch(e){console.error(e);alert(e?.message||"Impossible d'associer ce Code LRF.")}
  finally{associating=false}
}
async function unlinkClient(linkedId){
  const root=canonicalClient(byId(activeClientId)),linked=byId(linkedId);if(!root||!linked)return;
  try{
    await runTransaction(db,async tx=>{
      tx.update(doc(db,'clients',root.id),{statsLinkedClientIds:arrayRemove(linked.id)});
      tx.update(doc(db,'clients',linked.id),{statsParentClientId:deleteField()});
    });
  }catch(e){console.error(e);alert('Impossible de dissocier cette fiche.')}
}

function factoryText(button){return clean(button.textContent).replace(/\s*[✎✏]\s*$/,'')}
function makeFactoryReadonly(container){
  const buttons=[...container.querySelectorAll('[data-edit-codes-client]')];
  const clientId=buttons[0]?.dataset.editCodesClient||container.dataset.clientId||'';
  if(clientId)container.dataset.clientId=clientId;
  for(const b of buttons){const span=document.createElement('span');span.className='stats-factory-readonly';span.textContent=factoryText(b);b.replaceWith(span)}
  return clientId;
}
function lrfButton(c){
  const root=canonicalClient(c),main=clean(root?.codeClient)||allGroupCodes(root)[0]||'Code LRF',more=Math.max(0,allGroupCodes(root).length-1);
  return `<button type="button" class="stats-lrf-multi-btn" data-edit-lrf-client="${esc(root?.id||'')}" title="Voir ou associer des Codes LRF existants"><span>${esc(main)}</span>${more?`<span class="stats-lrf-more">+${more}</span>`:''}<span class="edit">✎</span></button>`;
}
function findClientFromLRFCell(cell){const code=clean(cell?.textContent).match(/LRF-\d{5}/i)?.[0]||'';return code?findClientByAnyLRF(code):null}
function decorateLRFCell(cell,c,labelHtml=''){
  const root=canonicalClient(c);if(!root)return;
  const signature=`${root.id}|${allGroupCodes(root).join('|')}`;
  if(cell.dataset.lrfMultiSignature===signature&&cell.querySelector('[data-edit-lrf-client]'))return;
  cell.dataset.lrfMultiSignature=signature;cell.innerHTML=labelHtml+lrfButton(root);
}
function decorateTable(){
  document.querySelectorAll('#stats-body tr').forEach(tr=>{
    const cells=tr.querySelectorAll('td');if(cells.length<3)return;
    let clientId=makeFactoryReadonly(cells[1]),c=clientId?canonicalClient(byId(clientId)):null;
    if(!c)c=findClientFromLRFCell(cells[2]);
    const meta=cells[0].querySelector('small')?.textContent||'';
    if(!c||!meta.includes('Associé au CRM')||cells[2].querySelector('[data-manual-lrf]'))return;
    decorateLRFCell(cells[2],c);
  });
}
function decorateMobile(){
  document.querySelectorAll('#stats-mobile-list .client-stat-card').forEach(card=>{
    const zones=[...card.querySelectorAll('.mobile-lrf')];
    const factoryZone=zones.find(z=>/Codes? usine|N° usine/i.test(z.querySelector('small')?.textContent||''));
    const lrfZone=zones.find(z=>/Code LRF/i.test(z.querySelector('small')?.textContent||''));
    let clientId=factoryZone?makeFactoryReadonly(factoryZone):'',c=clientId?canonicalClient(byId(clientId)):null;
    if(!c)c=findClientFromLRFCell(lrfZone);
    if(!c||!lrfZone||lrfZone.querySelector('[data-manual-lrf]'))return;
    const label=lrfZone.querySelector('small')?.outerHTML||'<small>Code LRF</small>';decorateLRFCell(lrfZone,c,label);
  });
}
function decorate(){ensureStyles();ensureModal();decorateTable();decorateMobile()}

async function cleanupMistakenCode(){
  if(cleanupDone)return;cleanupDone=true;
  const dm=clients.find(c=>norm(clientName(c))==='dm home'&&extraCodes(c).some(code=>norm(code)==='lrf-00309'));
  if(!dm)return;
  try{await updateDoc(doc(db,'clients',dm.id),{codesLRF:arrayRemove('LRF-00309')})}
  catch(e){cleanupDone=false;console.warn('Nettoyage LRF-00309 non effectué',e)}
}

document.addEventListener('click',e=>{
  const factoryEdit=e.target.closest('[data-edit-codes-client]');if(factoryEdit){e.preventDefault();e.stopImmediatePropagation();return}
  const edit=e.target.closest('[data-edit-lrf-client]');if(edit){e.preventDefault();e.stopImmediatePropagation();openModal(edit.dataset.editLrfClient);return}
  const associate=e.target.closest('[data-associate-existing-client]');if(associate){e.preventDefault();e.stopImmediatePropagation();associateExistingClient(associate.dataset.associateExistingClient);return}
  const unlink=e.target.closest('[data-unlink-lrf-client]');if(unlink){e.preventDefault();e.stopImmediatePropagation();unlinkClient(unlink.dataset.unlinkLrfClient);return}
  if(e.target.id==='stats-lrf-multi-close'||e.target===document.getElementById('stats-lrf-multi-modal')){e.preventDefault();e.stopImmediatePropagation();closeModal();return}
},true);

onSnapshot(collection(db,'clients'),snap=>{
  clients=[];snap.forEach(d=>clients.push({id:d.id,...d.data()}));
  cleanupMistakenCode();if(activeClientId)renderModal();setTimeout(decorate,0);
});
let decorationScheduled=false;
function scheduleDecorate(){if(decorationScheduled)return;decorationScheduled=true;requestAnimationFrame(()=>{decorationScheduled=false;decorate()})}
const observer=new MutationObserver(scheduleDecorate);if(document.body)observer.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
