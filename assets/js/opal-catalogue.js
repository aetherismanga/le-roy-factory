import {createOpalPriceState} from './opal-price-state.mjs?v=20261106-opal2';
const version='20261106-opal2';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => Number(value).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const norm = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const favoriteKey='lrf-opal-favorites-v1', controllers=new Set();
let productsPromise,authPromise,expiryTimer;
function favorites(){try{return new Set(JSON.parse(localStorage.getItem(favoriteKey)||'[]'));}catch{return new Set();}}
const session=()=>window.LRF_PRO_SESSION?.read?.()||null;
function candidate(){
  const s=session();if(!s)return null;
  if([s.type,s.activite,s.categorieActivite].some(value=>norm(value).includes('particulier')))return null;
  if(s.isAdmin||s.admin)return {key:'agent:'+String(s.email||''),agent:true};
  if(!/^LRF-\d{5}$/.test(s.codeClient||'')||s.codeClient==='LRF-00001'||!/^[A-Za-z0-9_-]{43}$/.test(s.sessionToken||'')||!(s.partenaires||[]).some(value=>['opal','opalhome'].includes(norm(value))))return null;
  return {key:'client:'+s.sessionToken,token:s.sessionToken};
}
async function agentToken(){
  if(!authPromise)authPromise=Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]).then(async([apps,auths])=>{
    const config={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
    const app=apps.getApps().find(app=>app.options.projectId===config.projectId)||apps.initializeApp(config);const auth=auths.getAuth(app);await auth.authStateReady?.();return auth;
  }).catch(error=>{authPromise=null;throw error;});
  const user=(await authPromise).currentUser;
  if(!user||!['jerome@leroyfactory.fr','coryne@leroyfactory.fr'].includes(String(user.email||'').toLowerCase()))throw Error('Connexion agent requise.');
  return user.getIdToken(true);
}
function refreshViews(){
  for(const controller of controllers){if(!controller.host.isConnected){controllers.delete(controller);continue;}controller.refresh();}
  const workspace=document.getElementById('partner-workspace');
  if(workspace?.dataset.partner==='Opal'){const badge=document.getElementById('workspace-pro-badge');if(badge)badge.textContent=prices.snapshot().pro?'Catalogue · tarifs PRO HT':'Catalogue · prix publics TTC';}
  clearTimeout(expiryTimer);const state=prices.snapshot();
  if(state.expiresAt>Date.now())expiryTimer=setTimeout(()=>{prices.clear();refreshAccess();},state.expiresAt-Date.now()+10);
}
const prices=createOpalPriceState({changed:refreshViews,request:async identity=>{
  const headers={'Content-Type':'application/json'},body={action:'context'};
  if(identity.agent)headers.Authorization='Bearer '+await agentToken();else body.sessionToken=identity.token;
  const response=await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/opalCatalog',{method:'POST',headers,body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Accès OPAL non validé.');return response.json();
}});
function refreshAccess(){return prices.refresh(candidate());}
window.addEventListener('lrf-pro-session-changed',()=>{prices.clear();refreshAccess();});
window.addEventListener('pageshow',refreshAccess);
window.addEventListener('storage',event=>{if(event.key===favoriteKey)refreshViews();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){prices.clear();refreshAccess();}});
function getProducts(){return productsPromise||=(fetch('assets/data/opal-products.json?v='+version).then(response=>{if(!response.ok)throw Error();return response.json();}).catch(error=>{productsPromise=null;throw error;}));}
function priceLabel(product){const value=prices.value(product);return value==null?'Prix sur demande':money(value)+(prices.snapshot().pro?' HT':' TTC');}
function toggleFavorite(product){const ids=favorites();if(ids.has(product.id))ids.delete(product.id);else ids.add(product.id);try{localStorage.setItem(favoriteKey,JSON.stringify([...ids]));}catch{}refreshViews();}
export async function renderOpalCatalogue(host){
  const root=host.shadowRoot||host.attachShadow({mode:'open'});
  root.innerHTML=`<link rel="stylesheet" href="assets/css/opal-catalogue.css?v=${version}"><div class="oh-loading" role="status">Chargement des collections OPAL Home…</div>`;
  let products;try{products=await getProducts();}catch{root.innerHTML='<p>Le catalogue ne se charge pas. Rechargez la page pour réessayer.</p>';return;}
  if(!host.isConnected)return;
  const groups=new Map();for(const product of products){if(!groups.has(product.model))groups.set(product.model,[]);groups.get(product.model).push(product);}
  const models=[...groups.keys()].sort((a,b)=>a.localeCompare(b,'fr'));
  const idFor=name=>'oh-'+norm(name);
  root.innerHTML=`<link rel="stylesheet" href="assets/css/opal-catalogue.css?v=${version}">
  <div class="oh-catalogue">
    <section class="oh-hero" aria-label="Présentation OPAL Home"><div class="oh-hero-copy"><span class="oh-kicker">OPAL HOME · MIROIRS & LUMIÈRE</span><h2>Un autre regard<br>sur votre salle de bain.</h2><p>Des lignes singulières, des reflets lumineux. Découvrez une collection de miroirs qui donne du caractère à chaque espace.</p><div class="oh-hero-actions"><a class="oh-button" href="#oh-collections" data-collections>Découvrir les collections <span>↓</span></a><span>${models.length} collections · ${products.length} références</span></div></div><div class="oh-hero-photo"><img src="assets/img/opal-catalogue-2026/opal-aixa.jpg" alt="Miroir lumineux OPAL Aixa dans une salle de bain" fetchpriority="high"><span>AIXA · OPAL HOME</span></div></section>
    <div class="oh-browser" id="oh-collections"><aside class="oh-index"><details open><summary>Lexique des collections <span>☰</span></summary><nav aria-label="Toutes les collections OPAL Home">${models.map(name=>`<a href="#${idFor(name)}" data-collection="${esc(name)}">${esc(name)}<span>↗</span></a>`).join('')}</nav></details></aside><section class="oh-products" aria-label="Collections OPAL Home"><div class="oh-toolbar"><div><span class="oh-kicker">LA COLLECTION</span><h3>À chaque espace, son miroir.</h3></div><div class="oh-tools"><button class="oh-tariff" type="button" hidden aria-pressed="false">Voir tarif PRO</button><button class="oh-favorites" type="button" aria-pressed="false">♡ Mes favoris</button></div></div><p class="oh-mode" role="status">Prix publics TTC</p><div class="oh-grid">${models.map(name=>{const items=groups.get(name);return `<article class="oh-card" id="${idFor(name)}"><button class="oh-photo" type="button" data-model="${esc(name)}" aria-label="Découvrir ${esc(name)}"><img src="${esc(items[0].image)}" alt="Miroir OPAL ${esc(name)}" loading="lazy" decoding="async"><span>↗</span></button><p class="oh-kicker">MIROIR · ${items.length} FORMAT${items.length>1?'S':''}</p><h4>${esc(name)}</h4><p class="oh-card-price" data-price-for="${esc(name)}"></p><button class="oh-format" type="button" data-model="${esc(name)}">Choisir un format <span>↗</span></button></article>`;}).join('')}</div><p class="oh-empty" hidden>Aucun favori pour le moment. Ouvrez une collection pour sélectionner vos miroirs.</p></section></div>
    <dialog class="oh-dialog"><button class="oh-close" type="button" aria-label="Fermer la fiche">×</button><div class="oh-detail"></div></dialog>
  </div>`;
  if(matchMedia('(max-width:700px)').matches)root.querySelector('details').open=false;
  let onlyFavorites=false,selected=null;
  const dialog=root.querySelector('dialog'),detail=root.querySelector('.oh-detail'),tariff=root.querySelector('.oh-tariff');
  function renderDetail(){
    if(!selected)return;const items=groups.get(selected.model),ids=favorites();
    detail.innerHTML=`<img class="oh-detail-photo" src="${esc(selected.image)}" alt="Miroir OPAL ${esc(selected.model)}"><div class="oh-detail-copy"><span class="oh-kicker">MIROIR OPAL HOME</span><h3>${esc(selected.model)}</h3><p>Choisissez le format adapté à votre projet.</p><label>Format<select aria-label="Choisir le format">${items.map(product=>`<option value="${esc(product.code)}" ${product.code===selected.code?'selected':''}>${esc(product.dimensions)} · ${esc(product.code)}</option>`).join('')}</select></label><p class="oh-reference">Référence : <strong>${esc(selected.code)}</strong></p><p class="oh-detail-price">${prices.snapshot().pro?'Tarif PRO HT':'Prix public TTC'}<strong>${esc(priceLabel(selected))}</strong></p><button type="button" class="oh-add" aria-pressed="${ids.has(selected.id)}">${ids.has(selected.id)?'♥ Retirer des favoris':'♡ Ajouter aux favoris'}</button></div>`;
    detail.querySelector('select').addEventListener('change',event=>{selected=items.find(product=>product.code===event.target.value);renderDetail();});
    detail.querySelector('.oh-add').addEventListener('click',()=>toggleFavorite(selected));
  }
  function refresh(){
    const state=prices.snapshot(),ids=favorites();tariff.hidden=!state.eligible;tariff.textContent=state.pro?'Voir prix publics':'Voir tarif PRO';tariff.setAttribute('aria-pressed',String(state.pro));root.querySelector('.oh-mode').textContent=state.pro?'Tarifs professionnels HT':'Prix publics TTC';
    let shown=0;for(const name of models){const items=groups.get(name),card=root.getElementById(idFor(name)),values=items.map(product=>prices.value(product)).filter(value=>value!=null);card.hidden=onlyFavorites&&!items.some(product=>ids.has(product.id));if(!card.hidden)shown++;card.querySelector('.oh-card-price').textContent=values.length?(items.length>1?'À partir de ':'')+money(Math.min(...values))+(state.pro?' HT':' TTC'):'Prix sur demande';}
    root.querySelector('.oh-empty').hidden=shown!==0;if(dialog.open)renderDetail();
  }
  controllers.add({host,refresh});refresh();
  root.addEventListener('click',event=>{
    const model=event.target.closest('[data-model]');if(model){selected=groups.get(model.dataset.model)[0];renderDetail();dialog.showModal();return;}
    const link=event.target.closest('[data-collection]');if(link){event.preventDefault();onlyFavorites=false;const fav=root.querySelector('.oh-favorites');fav.setAttribute('aria-pressed','false');fav.textContent='♡ Mes favoris';refresh();root.querySelectorAll('[data-collection]').forEach(item=>item.setAttribute('aria-current',String(item===link)));if(matchMedia('(max-width:700px)').matches)root.querySelector('details').open=false;root.getElementById(idFor(link.dataset.collection)).scrollIntoView({behavior:'instant',block:'start'});return;}
    if(event.target.closest('[data-collections]')){event.preventDefault();root.getElementById('oh-collections').scrollIntoView({behavior:'instant',block:'start'});}
  });
  tariff.addEventListener('click',()=>{prices.toggle();});
  root.querySelector('.oh-favorites').addEventListener('click',event=>{onlyFavorites=!onlyFavorites;event.currentTarget.setAttribute('aria-pressed',String(onlyFavorites));event.currentTarget.textContent=onlyFavorites?'← Tous les miroirs':'♡ Mes favoris';refresh();});
  root.querySelector('.oh-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  refreshAccess();
}
