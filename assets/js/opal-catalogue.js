/* Sélection OPAL issue du tarif fabricant 2026 et du catalogue illustré. */
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let opalDataPromise;
const storageKey='lrf-opal-favorites-v1';
function readFavorites(){try{return new Set(JSON.parse(localStorage.getItem(storageKey)||'[]'));}catch{return new Set();}}
let favoriteIds=readFavorites();

window.addEventListener('lrf-opal:add-partner-favorite',event=>{
  const id=event.detail?.id;if(!id)return;
  if(favoriteIds.has(id))favoriteIds.delete(id);else favoriteIds.add(id);
  try{localStorage.setItem(storageKey,JSON.stringify([...favoriteIds]));}catch{}
  window.dispatchEvent(new CustomEvent('lrf-opal:favorites-state',{detail:{ids:[...favoriteIds]}}));
});
const money = amount => Number(amount).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const getProducts = () => opalDataPromise ||= fetch('assets/data/opal-products.json?v=20261106-opal-cerastone1').then(r => { if (!r.ok) throw Error('Catalogue indisponible'); return r.json(); });
function ensureCss(){
  if(document.getElementById('opal-catalogue-style')) return;
  const link=document.createElement('link');link.id='opal-catalogue-style';link.rel='stylesheet';link.href='assets/css/opal-catalogue.css?v=20261106-opal-cerastone1';document.head.append(link);
  const extra=document.createElement('style');extra.textContent='.opal-view-favorites{margin-top:14px;border:1px solid #b9ae9e;background:transparent;color:#292724;padding:10px 14px;cursor:pointer}';document.head.append(extra);
}
export async function renderOpalCatalogue(container){
  ensureCss(); let favoritesOnly=false; container.classList.add('opal-catalogue');
  container.innerHTML='<p class="opal-loading" role="status">Chargement des miroirs…</p>';
  let products;try{products=await getProducts();}catch{container.innerHTML='<p>La sélection est indisponible pour le moment. Veuillez réessayer ou nous contacter.</p>';return;}
  const groups = new Map();for(const p of products){if(!groups.has(p.model))groups.set(p.model,[]);groups.get(p.model).push(p);}
  const models=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr'));
  container.innerHTML=`<header class="opal-title"><div><p class="opal-eyebrow">LA SÉLECTION LE ROY FACTORY</p><h2>Miroirs <em>OPAL.</em></h2><p>Des miroirs à choisir selon votre espace, avec les références et formats de la collection.</p><button type="button" class="opal-view-favorites">♡ Voir mes favoris</button></div><label>Rechercher<input type="search" placeholder="Nom, dimension ou référence" aria-label="Rechercher un miroir OPAL"></label></header><p class="opal-count" role="status"></p><div class="opal-grid"></div>`;
  const grid=container.querySelector('.opal-grid'),count=container.querySelector('.opal-count'),search=container.querySelector('input');
  function draw(){
    const q=search.value.trim().toLocaleLowerCase('fr');const matches=models.filter(([name,items])=>(!favoritesOnly||items.some(p=>favoriteIds.has(p.id)))&&(!q||[name,...items.flatMap(p=>[p.code,p.dimensions])].join(' ').toLocaleLowerCase('fr').includes(q)));
    count.textContent=`${matches.length} modèle${matches.length===1?'':'s'} · ${products.length} références`;
    grid.innerHTML=matches.map(([name,items])=>{const prices=items.map(p=>p.priceTtc).filter(n=>typeof n==='number'&&n>0);const label=prices.length?`${items.length>1?'À partir de ':''}${money(Math.min(...prices))} TTC`:'Prix sur demande';return `<article class="opal-card"><button class="opal-image" type="button" data-model="${escapeHtml(name)}" aria-label="Découvrir les miroirs ${escapeHtml(name)}"><img src="${escapeHtml(items[0].image)}" alt="Miroir OPAL ${escapeHtml(name)}" loading="lazy" decoding="async"><span aria-hidden="true">↗</span></button><p class="opal-eyebrow">MIROIR · ${items.length} FORMAT${items.length>1?'S':''}</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(label)}</p><button class="opal-open" type="button" data-model="${escapeHtml(name)}">Choisir un format <span aria-hidden="true">↗</span></button></article>`;}).join('')||'<p>Aucun miroir ne correspond à cette recherche.</p>';
  }
  search.addEventListener('input',draw);
  container.querySelector('.opal-view-favorites').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;container.querySelector('.opal-view-favorites').textContent=favoritesOnly?'← Tous les miroirs':'♡ Voir mes favoris';draw();});
  window.addEventListener('lrf-opal:favorites-state',()=>{if(container.isConnected)draw();});
  container.addEventListener('click',event=>{const button=event.target.closest('[data-model]');if(button&&groups.has(button.dataset.model))openDetail(groups.get(button.dataset.model));});draw();
}
function openDetail(variants){
  let detail=document.getElementById('opal-detail-dialog');
  if(!detail){detail=document.createElement('dialog');detail.id='opal-detail-dialog';detail.className='opal-detail-dialog';document.body.append(detail);detail.addEventListener('click',e=>{if(e.target===detail||e.target.closest('[data-opal-close-detail]'))detail.close();});}
  const first=variants[0];
  detail.innerHTML=`<div class="opal-detail"><button class="opal-close" type="button" data-opal-close-detail aria-label="Fermer">×</button><img src="${escapeHtml(first.image)}" alt="Miroir OPAL ${escapeHtml(first.model)}"><div class="opal-detail-copy"><p class="opal-eyebrow">MIROIR OPAL</p><h3>${escapeHtml(first.model)}</h3><p>Choisissez la référence correspondant à votre projet.</p><label>Format<select class="opal-variant" aria-label="Choisir un format">${variants.map((p,i)=>`<option value="${i}">${escapeHtml(p.dimensions)} · réf. ${escapeHtml(p.code)}</option>`).join('')}</select></label><p class="opal-reference">Référence : <strong>${escapeHtml(first.code)}</strong></p><p class="opal-price">Prix public : sur demande</p><button type="button" class="opal-add">♡ Ajouter aux favoris</button><p class="opal-status" role="status"></p></div></div>`;
  const select=detail.querySelector('.opal-variant'),add=detail.querySelector('.opal-add');
  function sync(){const product=variants[Number(select.value)];detail.querySelector('.opal-reference strong').textContent=product.code;detail.querySelector('.opal-price').textContent=product.priceTtc>0?'Prix public : '+money(product.priceTtc)+' TTC':'Prix public : sur demande';add.textContent=favoriteIds.has(product.id)?'♥ Retirer des favoris':'♡ Ajouter aux favoris';add.setAttribute('aria-pressed',String(favoriteIds.has(product.id)));}
  select.addEventListener('change',()=>{sync();detail.querySelector('.opal-status').textContent='';});
  detail.syncOpalFavorites=sync;sync();
  add.addEventListener('click',()=>{const product=variants[Number(select.value)],wasSaved=favoriteIds.has(product.id);window.dispatchEvent(new CustomEvent('lrf-opal:add-partner-favorite',{detail:product}));detail.querySelector('.opal-status').textContent=wasSaved?'Retiré de votre sélection.':'Ajouté à votre sélection.';});
  detail.showModal();
}
export function openOpalCatalogue(){
  ensureCss();let dialog=document.getElementById('opal-catalogue-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='opal-catalogue-dialog';dialog.className='opal-catalogue-dialog';dialog.innerHTML='<div class="opal-catalogue-wrap"><button class="opal-close" type="button" data-opal-close aria-label="Fermer le catalogue">×</button><div class="opal-catalogue-content"></div></div>';document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-opal-close]'))dialog.close();});renderOpalCatalogue(dialog.querySelector('.opal-catalogue-content'));}
  if(!dialog.open)dialog.showModal();window.dispatchEvent(new Event('lrf-opal:request-favorites'));
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
  window.addEventListener('lrf-opal:favorites-state',event=>{favoriteIds=new Set(event.detail?.ids||[]);document.getElementById('opal-detail-dialog')?.syncOpalFavorites?.();});
  document.addEventListener('click',event=>{const opener=event.target.closest?.('[data-open-opal]');if(!opener)return;event.preventDefault();openOpalCatalogue();});
}
