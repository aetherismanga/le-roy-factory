(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(\d)\s*[x×]\s*(\d)/g,'$1x$2');
  const eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  let collections = [], all = [], shown = 6, mode = 'catalogue', favoritesOnly = false, pendingPrice = null, imageReturn = null;
  let favorites = new Set();
  try { favorites = new Set(JSON.parse(localStorage.getItem('lrf-r11-favorites') || '[]')); } catch (_) {}
  const priceCache = new Map();
  let mediaPreviews = {};
  const imageUrl = (value) => typeof value === 'string' ? value : value?.full || value?.src || value?.url || value?.image || '';
  const safeUrl = (value) => {
    const url = imageUrl(value);
    return /^(https?:\/\/|\/?assets\/)/i.test(url) ? url : '';
  };
  const previewUrl = (value) => {
    const original=safeUrl(value);
    return safeUrl(Object.hasOwn(mediaPreviews,original)?mediaPreviews[original]:'')||original;
  };
  const mm = (value) => value ? `${String(value).replace(/\s*mm$/i, '')} mm` : '';
  const brandName = (value) => String(value || '').replace(/^elios(?:[ -]ceramica)?$/i, 'Elios').replace(/^view(?:[ -]ceramica)?$/i, 'VIEW').replace(/^la[ -]fenice$/i, 'La Fenice');
  const formatLabel = (value) => String(value || '').replace(/[x×]/g, ' × ') + (/[a-wyz]/i.test(String(value)) ? '' : ' cm');
  const dimension = (value) => (String(value).replace(/,/g, '.').match(/[\d.]+/g) || []).map(Number).reduce((a,b) => a*b, 1);
  const unique = (values) => [...new Set(values.filter(Boolean))];
  function optionList(id, values, numeric) {
    const select = $(id);
    const label = select.options[0].outerHTML;
    const sorted = unique(values).sort(numeric ? (a,b) => dimension(a)-dimension(b) || String(a).localeCompare(String(b),'fr') : (a,b) => String(a).localeCompare(String(b),'fr'));
    select.innerHTML = label + sorted.map(v => `<option value="${escape(v)}">${escape(id==='filter-format' ? formatLabel(v) : id==='filter-thickness' ? mm(v) : v)}</option>`).join('');
  }
  function filtered() {
    const search = fold($('search').value.trim());
    const filters = {brand:$('filter-brand').value,category:$('filter-category').value,format:$('filter-format').value,thickness:$('filter-thickness').value};
    const items = all.filter(p => (!filters.brand || p.collection.brand===filters.brand) && (!filters.category || p.collection.category===filters.category) && (!filters.format || p.format===filters.format) && (!filters.thickness || String(p.thickness)===filters.thickness) && (!favoritesOnly || favorites.has(p._key)) && (!search || p._search.includes(search)));
    const sort = $('sort').value;
    items.sort((a,b) => sort==='format' ? dimension(a.format)-dimension(b.format) || a.collection.name.localeCompare(b.collection.name,'fr') : sort==='brand' ? a.collection.brand.localeCompare(b.collection.brand,'fr') || a.collection.name.localeCompare(b.collection.name,'fr') : a.collection.name.localeCompare(b.collection.name,'fr') || String(a.color).localeCompare(String(b.color),'fr'));
    const active = Object.values(filters).filter(Boolean).length + (favoritesOnly ? 1 : 0);
    $('filter-count').textContent = active ? String(active) : '';
    return items;
  }
  function productCard(p, includeBrand = false) {
    const src = previewUrl(p.image);
    const key = escape(p._key);
    return `<article class="r11-product" data-key="${key}">${src ? `<button type="button" class="r11-product-photo" data-action="image" data-key="${key}" aria-label="Agrandir ${escape(p.collection.name+' '+p.color)}"><img src="${escape(src)}" alt="${escape(p.collection.name+' '+p.color+' · '+formatLabel(p.format)+' · R11')}" loading="lazy" decoding="async"></button>` : '<div class="r11-product-placeholder">Visuel fabricant<br>à compléter</div>'}<button type="button" class="r11-product-favorite" data-action="favorite" data-key="${key}" aria-label="${favorites.has(p._key)?'Retirer de':'Ajouter à'} ma sélection" aria-pressed="${favorites.has(p._key)}">${favorites.has(p._key)?'♥':'♡'}</button><div class="r11-product-copy">${includeBrand?`<p class="r11-product-brand">${escape(p.collection.brand)} · ${escape(p.collection.name)}</p>`:''}<h4>${escape(p.color || p.collection.name)}</h4><p class="r11-product-spec">${escape(formatLabel(p.format))}${p.thickness ? ' · '+escape(mm(p.thickness)) : ''}</p><p class="r11-product-spec">${escape(p.finish || 'R11')}</p>${p.sku?`<p class="r11-product-ref">Réf. ${escape(p.sku)}</p>`:''}<div class="r11-product-price"><button type="button" class="r11-price-button" data-action="price" data-key="${key}" aria-label="Afficher le prix d’achat HT de ${escape(p.collection.name+' '+p.color+' '+p.format)}">${eye}<span>Prix d’achat</span></button><span class="r11-price-value" data-price="${key}" aria-live="polite"></span></div></div></article>`;
  }
  function collectionSpread(collection, products, index) {
    const src = previewUrl(collection.hero || collection.gallery?.[0]);
    const formats = unique(products.map(p=>p.format));
    const colors = unique(products.map(p=>p.color));
    const preview = products.filter((p,i) => products.findIndex(other=>other.color===p.color)===i).slice(0,4);
    if(preview.length<4)for(const p of products){if(preview.length>=4)break;if(!preview.includes(p))preview.push(p);}
    return `<section class="r11-spread" aria-labelledby="spread-${escape(collection.id)}"><div class="r11-spread-top">${src ? `<button type="button" class="r11-spread-visual" data-action="collection" data-id="${escape(collection.id)}" aria-label="Découvrir ${escape(collection.name)}"><img src="${escape(src)}" alt="Ambiance ${escape(collection.name)} · ${escape(collection.brand)}" loading="lazy" decoding="async"><span class="r11-photo-zoom" aria-hidden="true">↗</span></button>` : '<div class="r11-spread-visual"></div>'}<div class="r11-spread-copy"><p class="r11-brand-label">${escape(collection.brand)} <span aria-hidden="true">/</span> ${String(index+1).padStart(2,'0')}</p><h3 id="spread-${escape(collection.id)}">${escape(collection.name)}</h3><p class="r11-category-label">${escape(collection.category)}</p><p class="r11-format-summary">${formats.map(formatLabel).map(escape).join(' &nbsp;·&nbsp; ')}</p><div class="r11-spread-labels"><span class="r11-tag r11-tag-r11">EXTÉRIEUR R11</span><span class="r11-tag">${colors.length} COLORIS</span><span class="r11-tag">${products.length} RÉFÉRENCES</span></div><button type="button" class="r11-button" data-action="collection" data-id="${escape(collection.id)}">Explorer la collection <span aria-hidden="true">↗</span></button></div></div><div class="r11-spread-bottom"><p class="r11-products-heading"><span>Les références R11</span><span>${products.length>4 ? 'APERÇU · '+products.length+' RÉFÉRENCES À DÉCOUVRIR':'TOUS LES PRODUITS'}</span></p><div class="r11-product-grid">${preview.map(p=>productCard(p)).join('')}</div></div></section>`;
  }
  function render() {
    const items = filtered();
    const groups = new Map();
    for (const p of items) { if(!groups.has(p.collection.id)) groups.set(p.collection.id,{collection:p.collection,products:[]}); groups.get(p.collection.id).products.push(p); }
    $('catalogue-count').textContent = `${groups.size} collection${groups.size===1?'':'s'} · ${items.length} référence${items.length===1?'':'s'} R11`;
    $('favorites-count').textContent = String(favorites.size);
    $('favorites-toggle').setAttribute('aria-pressed',String(favoritesOnly));
    $('favorites-toggle').firstChild.textContent = favoritesOnly?'♥ Ma sélection ':'♡ Ma sélection ';
    $('results').classList.toggle('is-products',mode==='products');
    if (!items.length) {
      $('results').innerHTML = '<div class="r11-empty"><h3>Aucune référence pour cette sélection.</h3><p>Essayez un autre format, une autre matière ou réinitialisez vos filtres.</p><button type="button" class="r11-button r11-button-outline" data-action="reset">Réinitialiser les filtres</button></div>';
      $('load-more').hidden=true;
    } else if(mode==='products') {
      $('results').innerHTML=items.slice(0,shown).map(p=>productCard(p,true)).join('');
      $('load-more').hidden=items.length<=shown;
      $('load-more').firstChild.textContent='Afficher plus de produits ';
    } else {
      const grouped=[...groups.values()];
      $('results').innerHTML=grouped.slice(0,shown).map(({collection,products},i)=>collectionSpread(collection,products,i)).join('');
      $('load-more').hidden=grouped.length<=shown;
      $('load-more').firstChild.textContent='Voir la suite du catalogue ';
    }
    $('results').setAttribute('aria-busy','false');
    restorePrices();
  }
  function reset() { for(const id of ['filter-brand','filter-category','filter-format','filter-thickness']) $(id).value=''; $('search').value='';$('sort').value='name'; favoritesOnly=false;shown=mode==='products'?24:6;render(); }
  function setMode(next) { mode=next;shown=next==='products'?24:6;for(const name of ['catalogue','products']) { $('view-'+name).classList.toggle('is-active',mode===name);$('view-'+name).setAttribute('aria-pressed',String(mode===name)); } render(); }
  function openFilters(open) {
    $('filter-panel').classList.toggle('is-open',open);$('filter-scrim').hidden=!open;$('filters-open').setAttribute('aria-expanded',String(open));
    if (matchMedia('(max-width:760px)').matches) { document.body.style.overflow=open?'hidden':'';if(open){$('filter-panel').setAttribute('role','dialog');$('filter-panel').setAttribute('aria-modal','true');$('filters-close').focus();}else{$('filter-panel').removeAttribute('role');$('filter-panel').removeAttribute('aria-modal');$('filters-open').focus();} }
  }
  function openDialog(id) { $(id).showModal(); }
  function openImage(src,caption,metadata={}) {
    if(!src)return;
    imageReturn=document.activeElement;
    const img=$('hd-image');
    const rawNote=String(metadata.note||'');
    const note=/Native source sample; limited resolution; HD original requested/i.test(rawNote)?'Échantillon issu du catalogue fabricant. Original HD à obtenir.':rawNote;
    const updateCaption=(resolution)=>{
      const limited=Array.isArray(resolution)&&resolution.length>=2&&Math.max(Number(resolution[0]),Number(resolution[1]))<600;
      $('hd-caption').textContent=[caption,limited?'Définition source limitée':'',note].filter(Boolean).join(' · ');
    };
    updateCaption(metadata.imageResolution);
    img.onload=()=>updateCaption([img.naturalWidth,img.naturalHeight]);
    img.src=src;img.alt=caption;$('hd-original').href=src;openDialog('image-dialog');
  }
  function openCollection(id,focusKey) {
    const collection=collections.find(c=>c.id===id);if(!collection)return;
    const filteredProducts=filtered().filter(p=>p.collection.id===id);
    const products=focusKey?all.filter(p=>p.collection.id===id):filteredProducts.length?filteredProducts:all.filter(p=>p.collection.id===id);
    const src=safeUrl(collection.hero||collection.gallery?.[0]);
    const gallery=unique([src,...(collection.gallery||[]).map(safeUrl)].filter(Boolean));
    const source=safeUrl(collection.sourceUrl);
    $('collection-detail').innerHTML=`${src?`<div class="r11-detail-hero"><img src="${escape(previewUrl(src))}" alt="Ambiance ${escape(collection.name)}"><button type="button" class="r11-button" data-action="hero-hd" data-id="${escape(collection.id)}">Voir l’ambiance en HD ↗</button></div>`:''}<div class="r11-detail-thumbs">${gallery.map((url,i)=>`<button type="button" data-action="gallery" data-url="${escape(url)}" data-caption="${escape(collection.name+' · '+collection.brand+' · visuel '+(i+1))}" aria-label="Agrandir le visuel ${i+1}"><img src="${escape(previewUrl(url))}" alt="Visuel ${i+1} ${escape(collection.name)}" loading="lazy"></button>`).join('')}</div><div class="r11-detail-copy"><p class="r11-brand-label">${escape(collection.brand)} · EXTÉRIEUR R11</p><h2>${escape(collection.name)}</h2><div class="r11-detail-meta"><p>${escape(collection.category)} · ${products.length} références affichées</p>${source?`<a class="r11-text-button" href="${escape(source)}" target="_blank" rel="noopener">Consulter la documentation fabricant ↗</a>`:''}</div></div><div class="r11-detail-products"><div class="r11-product-grid">${products.map(p=>productCard(p)).join('')}</div></div>`;
    if(!$('collection-dialog').open)openDialog('collection-dialog');restorePrices();
    if(focusKey){
      const target=[...$('collection-detail').querySelectorAll('.r11-product[data-key]')].find(el=>el.dataset.key===focusKey);
      if(target){target.classList.add('r11-product-highlight');target.tabIndex=-1;requestAnimationFrame(()=>{target.scrollIntoView({block:'center',behavior:'instant'});target.focus({preventScroll:true});});}
    }
  }
  function updateSession() {
    const session=window.R11Prices?.getSession?.();
    $('pro-label').textContent=session?'Mon accès PRO':'Accès PRO LRF';
    $('pro-form').hidden=Boolean(session);$('pro-connected').hidden=!session;
    $('pro-client').textContent=session ? `Connecté : ${session.societe||session.company||session.name||session.codeClient||session.code||'compte professionnel LRF'}` : '';
  }
  function restorePrices() { for(const el of document.querySelectorAll('[data-price]')) { if(priceCache.has(el.dataset.price))el.textContent=priceCache.get(el.dataset.price); } }
  async function showPrice(key) {
    const p=all.find(item=>item._key===key);if(!p)return;
    const elements=[...document.querySelectorAll('[data-price]')].filter(el=>el.dataset.price===key);
    if(priceCache.has(key)){priceCache.delete(key);for(const el of elements)el.textContent='';return;}
    if(!window.R11Prices?.getSession?.()){pendingPrice=key;$('pro-status').textContent='Connectez-vous pour consulter cette référence.';$('pro-status').classList.remove('is-error');updateSession();openDialog('pro-dialog');return;}
    for(const el of elements){el.textContent='Vérification…';el.classList.remove('is-error');}
    try {
      const result=await window.R11Prices.getPrice(p,p.collection);
      if(result?.locked){for(const el of elements)el.textContent=result.message||'Usine non autorisée';return;}
      const label=result?.unavailable?(result.label||'Sur demande'):result?.label||(Number.isFinite(result?.amount)?`${Number(result.amount).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} € HT / ${result.unit||'m²'}`:'Sur demande');
      priceCache.set(key,label);for(const el of elements)el.textContent=label;
    } catch(error) {for(const el of elements){el.textContent=error?.message||'Tarif indisponible. Réessayez.';el.classList.add('is-error');}}
  }
  document.addEventListener('click',(event)=>{
    const closer=event.target.closest('[data-close]');if(closer){$(closer.dataset.close).close();return;}
    const button=event.target.closest('[data-action]');if(!button)return;
    const key=button.dataset.key,p=all.find(item=>item._key===key);
    switch(button.dataset.action){
      case 'reset':reset();break;
      case 'favorite':if(!p)return;if(favorites.has(key))favorites.delete(key);else favorites.add(key);try{localStorage.setItem('lrf-r11-favorites',JSON.stringify([...favorites]));}catch(_){}render();if($('collection-dialog').open)openCollection(p.collection.id);break;
      case 'collection':openCollection(button.dataset.id);break;
      case 'image':if(p)openImage(safeUrl(p.image),`${p.collection.name} · ${p.color} · ${formatLabel(p.format)} · R11`,p);break;
      case 'gallery':openImage(safeUrl(button.dataset.url),button.dataset.caption);break;
      case 'hero-hd':{const c=collections.find(c=>c.id===button.dataset.id);if(c)openImage(safeUrl(c.hero),`${c.name} · ${c.brand} · ambiance fabricant`);break;}
      case 'price':showPrice(key);break;
    }
  });
  for(const id of ['collection-dialog','pro-dialog','image-dialog']) $(id).addEventListener('click',event=>{if(event.target===$(id)){const r=$(id).getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$(id).close();}});
  $('image-dialog').addEventListener('close',()=>{if(imageReturn?.isConnected)imageReturn.focus();});
  $('view-catalogue').addEventListener('click',()=>setMode('catalogue'));$('view-products').addEventListener('click',()=>setMode('products'));
  $('load-more').addEventListener('click',()=>{shown+=mode==='products'?24:6;render();});
  for(const id of ['filter-brand','filter-category','filter-format','filter-thickness','sort'])$(id).addEventListener('change',()=>{shown=mode==='products'?24:6;render();});
  $('search').addEventListener('input',()=>{shown=mode==='products'?24:6;render();});
  $('reset').addEventListener('click',reset);$('favorites-toggle').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;shown=mode==='products'?24:6;render();});
  $('filters-open').addEventListener('click',()=>openFilters(true));$('filters-close').addEventListener('click',()=>openFilters(false));$('filters-apply').addEventListener('click',()=>openFilters(false));$('filter-scrim').addEventListener('click',()=>openFilters(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('filter-panel').classList.contains('is-open'))openFilters(false);if(e.key==='Tab'&&$('filter-panel').classList.contains('is-open')&&matchMedia('(max-width:760px)').matches){const focusable=[...$('filter-panel').querySelectorAll('button,select')].filter(el=>!el.hidden);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}});
  $('pro-open').addEventListener('click',()=>{pendingPrice=null;updateSession();$('pro-status').textContent='';openDialog('pro-dialog');});
  $('pro-form').addEventListener('submit',async event=>{event.preventDefault();$('pro-submit').disabled=true;$('pro-status').textContent='Vérification de votre accès…';$('pro-status').classList.remove('is-error');try{if(!window.R11Prices?.login)throw new Error('Le service professionnel est indisponible. Réessayez plus tard.');const result=await window.R11Prices.login($('pro-code').value.trim(),$('pro-department').value.trim());if(result?.locked||result?.error)throw new Error(result.message||'Code LRF ou département non reconnu.');updateSession();$('pro-status').textContent='Votre accès professionnel est reconnu.';$('pro-dialog').close();if(pendingPrice){const key=pendingPrice;pendingPrice=null;await showPrice(key);}}catch(error){$('pro-status').textContent=error?.message||'Connexion impossible pour le moment.';$('pro-status').classList.add('is-error');}finally{$('pro-submit').disabled=false;}});
  $('pro-logout').addEventListener('click',()=>{window.R11Prices?.logout?.();priceCache.clear();updateSession();for(const el of document.querySelectorAll('[data-price]'))el.textContent='';$('pro-status').textContent='Vous êtes déconnecté.';});
  window.addEventListener('r11-prices-changed',()=>{priceCache.clear();updateSession();for(const el of document.querySelectorAll('[data-price]'))el.textContent='';});
  async function init(){
    try{
      const response=await fetch('assets/data/r11-catalogue.json');if(!response.ok)throw new Error('Le catalogue ne peut pas être chargé.');const data=await response.json();
      mediaPreviews=data.mediaPreviews&&typeof data.mediaPreviews==='object'&&!Array.isArray(data.mediaPreviews)?data.mediaPreviews:{};
      collections=(data.collections||[]).map((c,i)=>({...c,id:String(c.id||'collection-'+i),brand:brandName(c.brand),name:String(c.name||''),category:String(c.category||'Effet pierre')}));
      all=collections.flatMap(c=>(c.products||[]).map((p,i)=>({...p,format:String(p.format||''),thickness:String(p.thickness||''),_key:String(c.id)+'::'+String(p.id||p.sku||i),collection:c,_search:fold([c.name,c.brand,c.category,p.color,p.format,p.sku,p.finish].join(' '))})));
      optionList('filter-brand',collections.map(c=>c.brand));optionList('filter-category',collections.map(c=>c.category));optionList('filter-format',all.map(p=>p.format),true);optionList('filter-thickness',all.map(p=>p.thickness),true);
      const query=new URLSearchParams(location.search);if(query.get('usine'))$('filter-brand').value=brandName(query.get('usine'));if(query.get('format')){const match=[...$('filter-format').options].find(option=>fold(option.value)===fold(query.get('format')));if(match)$('filter-format').value=match.value;}if(query.get('recherche'))$('search').value=query.get('recherche');
      render();
      const productQuery=query.get('product');
      const linkedProduct=productQuery?all.find(p=>(String(p.id)===productQuery||String(p.sku)===productQuery)&&(!query.get('collection')||p.collection.id===query.get('collection'))):null;
      if(linkedProduct)openCollection(linkedProduct.collection.id,linkedProduct._key);else if(query.get('collection'))openCollection(query.get('collection'));
      if(window.R11Prices?.restore)try{await window.R11Prices.restore();}catch(_){/* The public catalogue stays available when professional access cannot be restored. */}
      updateSession();
    }catch(error){$('catalogue-count').textContent='Catalogue indisponible';$('results').setAttribute('aria-busy','false');$('catalogue-status').textContent=error.message||'Chargement impossible. Réessayez plus tard.';$('catalogue-status').classList.add('is-error');}
  }
  init();
})();
