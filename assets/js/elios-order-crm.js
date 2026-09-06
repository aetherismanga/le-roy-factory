import { db } from './firebase.js';
import { collection,onSnapshot,query,where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fr=(v,d=2)=>Number(v||0).toLocaleString('fr-FR',{maximumFractionDigits:d});
const unitLabel=u=>{u=String(u||'MQ').toUpperCase();if(['MQ','M2','M²'].includes(u))return'm²';if(['PZ','PCE','PCS'].includes(u))return'pièces';if(['ML','M'].includes(u))return'ml';return u};
let orders=[];

function install(){
  const anchor=document.getElementById('requests-list');
  if(!anchor||document.getElementById('elios-orders-section'))return;
  const style=document.createElement('style');style.textContent=`
  .elios-orders{margin-top:2rem}.elios-orders h2{margin:.2rem 0 .8rem;font-size:1.2rem}.elios-order-card{background:#fff;border:1px solid #e4ded2;border-radius:12px;padding:1rem 1.1rem;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;margin-bottom:.7rem;cursor:pointer}.elios-order-card:hover{border-color:#D4AF37}.elios-order-badge{display:inline-flex;padding:.3rem .58rem;border-radius:999px;background:#e8f5ed;color:#17623a;font-size:.72rem;font-weight:900}.elios-order-drawer{position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:12000;display:none;align-items:flex-start;justify-content:flex-end}.elios-order-drawer.open{display:flex}.elios-order-panel{width:min(650px,96vw);height:100%;overflow:auto;background:#FBF9F5;padding:1rem 1.2rem;box-shadow:-20px 0 60px rgba(0,0,0,.2)}.elios-order-panel-head{display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#FBF9F5;padding:.4rem 0 1rem}.elios-order-close{border:1px solid #d7d0c2;background:#fff;border-radius:8px;padding:.55rem .8rem}.elios-order-detail{background:#fff;border:1px solid #e3ddd0;border-radius:12px;padding:1rem;margin-bottom:.8rem}.elios-order-detail dl{display:grid;grid-template-columns:150px 1fr;gap:.55rem;margin:0}.elios-order-detail dt{font-weight:800;color:#6a706b}.elios-order-detail dd{margin:0}@media(max-width:620px){.elios-order-card{grid-template-columns:1fr}.elios-order-detail dl{grid-template-columns:1fr}.elios-order-detail dt{margin-top:.35rem}}
  `;document.head.appendChild(style);
  const section=document.createElement('section');section.id='elios-orders-section';section.className='elios-orders';section.innerHTML='<h2>Commandes ELIOS</h2><div id="elios-orders-list"></div>';
  anchor.insertAdjacentElement('afterend',section);
  const drawer=document.createElement('div');drawer.id='elios-order-crm-drawer';drawer.className='elios-order-drawer';drawer.innerHTML='<div class="elios-order-panel"><div class="elios-order-panel-head"><div><strong>Commande ELIOS</strong><div id="elios-order-sub" class="req-meta"></div></div><button class="elios-order-close" type="button">Fermer</button></div><div id="elios-order-detail"></div></div>';
  document.body.appendChild(drawer);
  drawer.querySelector('.elios-order-close').onclick=()=>drawer.classList.remove('open');
  drawer.addEventListener('click',e=>{if(e.target===drawer)drawer.classList.remove('open')});
}

function dateOf(o){const d=o.submittedAt?.toDate?o.submittedAt.toDate():new Date(o.submittedAt||Date.now());return d.toLocaleString('fr-FR')}
function render(){
  install();const list=document.getElementById('elios-orders-list');if(!list)return;
  list.innerHTML=orders.length?orders.map(o=>{const c=o.commande||{};return `<div class="elios-order-card" data-order-id="${esc(o.id)}"><div><div class="req-title">${esc(o.societe||'Client')} — ${esc(c.ref||c.format||'ROMA')}</div><div class="req-meta">ROMA ${esc(c.color||'')} · ${esc(c.kind||'')} · ${fr(c.boxes,0)} carton${Number(c.boxes)>1?'s':''} · ${fr(c.orderQty,3)} ${esc(unitLabel(c.orderUnit))} · ${esc(dateOf(o))}</div></div><span class="elios-order-badge">Envoyée usine</span></div>`}).join(''):'<div class="section">Aucune commande ELIOS enregistrée.</div>';
  list.querySelectorAll('[data-order-id]').forEach(card=>card.onclick=()=>openOrder(card.dataset.orderId));
}
function openOrder(id){
  const o=orders.find(x=>x.id===id);if(!o)return;const c=o.commande||{};const r=o.recipients||{};
  document.getElementById('elios-order-sub').textContent=`${o.societe||''} · ${dateOf(o)}`;
  document.getElementById('elios-order-detail').innerHTML=`
    <div class="elios-order-detail"><h3>Produit</h3><dl><dt>Collection</dt><dd>ROMA</dd><dt>Couleur</dt><dd>${esc(c.color||'—')}</dd><dt>Référence</dt><dd>${esc(c.ref||'Pièce spéciale')}</dd><dt>Produit</dt><dd>${esc(c.kind||'—')}</dd><dt>Format</dt><dd>${esc(c.format||'—')}</dd><dt>Finition</dt><dd>${esc(c.finish||'—')}</dd><dt>Quantité</dt><dd><strong>${fr(c.boxes,0)} carton${Number(c.boxes)>1?'s':''} — ${fr(c.orderQty,3)} ${esc(unitLabel(c.orderUnit))}</strong></dd></dl></div>
    <div class="elios-order-detail"><h3>Client</h3><dl><dt>Société</dt><dd>${esc(o.societe||'—')}</dd><dt>Code LRF</dt><dd>${esc(o.codeClient||'—')}</dd><dt>Contact</dt><dd>${esc(o.contact||'—')}</dd><dt>E-mail</dt><dd>${esc(o.email||'—')}</dd><dt>Téléphone</dt><dd>${esc(o.telephone||'—')}</dd><dt>Note</dt><dd>${esc(c.note||'—')}</dd></dl></div>
    <div class="elios-order-detail"><h3>Envoi usine</h3><dl><dt>Destinataire</dt><dd>${esc(r.to||'ctoni@eliosceramica.it')}</dd><dt>Copie</dt><dd>${esc((r.cc||[]).join(', '))}</dd><dt>Statut</dt><dd><strong>Envoyée</strong></dd></dl></div>`;
  document.getElementById('elios-order-crm-drawer').classList.add('open');
}

install();
onSnapshot(query(collection(db,'account_requests'),where('requestType','==','commande_elios')),snap=>{
  orders=[];snap.forEach(d=>orders.push({id:d.id,...d.data()}));
  orders.sort((a,b)=>{const aa=a.submittedAt?.toMillis?.()||0,bb=b.submittedAt?.toMillis?.()||0;return bb-aa});
  render();
});
