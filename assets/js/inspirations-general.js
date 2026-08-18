(() => {
  const eliosRaw = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const neoRaw = Array.isArray(window.NEOBATH_CATALOGUE) ? window.NEOBATH_CATALOGUE : [];
  const eliosImages = window.ELIOS_IMAGE_DATA || {};
  const $ = (s, r = document) => r.querySelector(s);
  const grid = $('#products-grid');
  if (!grid) return;

  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[,]/g,'.').replace(/\s+/g,' ').trim();
  const unique = arr => [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));

  const elios = eliosRaw.map(p => ({
    ...p,
    id: `elios-${p.slug}`,
    manufacturer: 'ELIOS',
    brandLabel: 'ELIOS Ceramica',
    collection: p.name,
    productType: 'Carrelage',
    inspirations: [
      p.category === 'Bois' ? 'Bois' :
      p.category === 'Pierre / marbre' ? 'Pierre & marbre' :
      p.category === 'Grandes dalles' ? 'Grandes dalles' :
      p.category === 'Décor / relief' ? 'Couleurs & décors' :
      'Carrelage'
    ],
    dimensions: p.formats || [],
    images: (p.gallery || []).map(k => eliosImages[k]).filter(Boolean),
    sourceLabel: 'Catalogue Général ELIOS 2026'
  }));

  const data = [...elios, ...neoRaw];
  const state = {q:'', inspiration:'Tous', productType:'Tous', color:'Tous', dimension:'Tous', manufacturer:'Tous'};

  const els = {
    search: $('#product-search'), inspiration: $('#filter-inspiration'), productType: $('#filter-product-type'),
    color: $('#filter-color'), dimension: $('#filter-dimension'), manufacturer: $('#filter-manufacturer'),
    count: $('#results-count'), modal: $('#product-modal'), dialog: $('#product-dialog'), filters: $('#advanced-filters')
  };
  const fallback = {'Carrelage':'assets/img/03.png','Meuble salle de bain':'assets/img/02.png'};
  let galleryState = null, lightbox = null;

  function fill(select, values, allLabel='Tous') {
    if (!select) return;
    select.innerHTML = values.map(v => `<option value="${esc(v)}">${v === 'Tous' ? allLabel : esc(v)}</option>`).join('');
  }
  function populateFilters() {
    fill(els.inspiration, ['Tous', ...unique(data.flatMap(p => p.inspirations || []))], 'Toutes les inspirations');
    fill(els.productType, ['Tous', ...unique(data.map(p => p.productType))], 'Tous les produits');
    fill(els.color, ['Tous', ...unique(data.flatMap(p => p.colors || []))], 'Toutes les couleurs');
    fill(els.dimension, ['Tous', ...unique(data.flatMap(p => p.dimensions || p.formats || []))], 'Toutes les dimensions');
    fill(els.manufacturer, ['Tous', ...unique(data.map(p => p.manufacturer))], 'Tous les fabricants');
  }
  const galleryUrls = p => (p.images || []).filter(Boolean);
  const mainImage = p => galleryUrls(p)[0] || fallback[p.productType] || 'assets/img/03.png';

  function matches(p) {
    const hay = norm([p.name,p.manufacturer,p.brandLabel,p.collection,p.productType,p.category,p.description,...(p.inspirations||[]),...(p.colors||[]),...(p.dimensions||p.formats||[]),...(p.finishes||[]),...(p.uses||[])].join(' '));
    if (state.q && !hay.includes(norm(state.q))) return false;
    if (state.inspiration !== 'Tous' && !(p.inspirations||[]).includes(state.inspiration)) return false;
    if (state.productType !== 'Tous' && p.productType !== state.productType) return false;
    if (state.color !== 'Tous' && !(p.colors||[]).includes(state.color)) return false;
    if (state.dimension !== 'Tous' && !(p.dimensions||p.formats||[]).some(v => norm(v) === norm(state.dimension))) return false;
    if (state.manufacturer !== 'Tous' && p.manufacturer !== state.manufacturer) return false;
    return true;
  }
  function card(p) {
    const dims = p.dimensions || p.formats || [];
    const chips = [...(p.colors||[]).slice(0,2), ...dims.slice(0,2)];
    const count = galleryUrls(p).length;
    return `<article class="product-card" tabindex="0" role="button" data-id="${esc(p.id)}" aria-label="Voir ${esc(p.name)}"><div class="product-visual"><img src="${esc(mainImage(p))}" alt="${esc(p.name)}" loading="lazy"><div class="product-overlay"></div><div class="product-badges"><span class="product-badge">${esc(p.manufacturer)}</span>${p.manufacturer === 'NEOBATH' ? '<span class="product-badge detail">DESIGN ITALIEN</span>' : (count ? `<span class="product-badge detail">${count > 1 ? count+' photos' : 'Photo HD'}</span>` : '')}</div><div class="product-name-over"><small>${esc(p.productType || p.category || '')}</small><h3>${esc(p.name)}</h3></div></div><div class="product-body"><div class="product-summary">${esc(p.description || '')}</div>${chips.length ? `<div class="chip-line">${chips.map(c=>`<span class="mini-chip">${esc(c)}</span>`).join('')}</div>` : ''}<div class="card-footer"><span>${esc(p.manufacturer)}${p.collection ? ' · '+esc(p.collection) : ''}</span><span class="card-open">Voir →</span></div></div></article>`;
  }
  function render() {
    const found = data.filter(matches);
    if (els.count) els.count.textContent = `${found.length} produit${found.length > 1 ? 's' : ''}`;
    grid.innerHTML = found.length ? found.map(card).join('') : `<div class="empty-products"><strong>Aucun produit trouvé.</strong><br>Essayez une autre inspiration ou retirez un filtre.</div>`;
  }

  function pricingApi(){ return window.LRF_INSPIRATIONS_PRICING || null; }
  function hasEliosAccess(){ const api=pricingApi(); return !!(api && api.canAccess?.('elios-ceramica')); }
  function pricingCell(p,format){ const api=pricingApi(); if(!api?.getPrice) return `<span class="price-locked">🔒 Accès PRO</span>`; try{const q=api.getPrice('elios-ceramica',p,format);if(!q||q.locked)return `<span class="price-locked">🔒 Accès PRO</span>`;if(q.unavailable)return `<span class="price-unavailable">Sur demande</span>`;return `<span class="price-ready">${esc(q.label||q.amount)}</span>${q.note?`<small class="price-note">${esc(q.note)}</small>`:''}`;}catch(_){return `<span class="price-unavailable">Sur demande</span>`} }
  function eliosAccessMessage(){ if(hasEliosAccess()){const s=pricingApi()?.getSession?.();return `<div class="price-access-callout allowed"><strong>✓ Accès tarif ELIOS actif</strong>${s?.societe?`<span>${esc(s.societe)}</span>`:''}<span>Tarifs affichés dans cette fiche.</span></div>`;} return `<div class="price-access-callout"><strong>🔒 Tarifs réservés aux comptes autorisés</strong><span>Connectez-vous ici pour afficher vos tarifs ELIOS sans quitter Inspirations.</span></div>`; }

  function openProduct(p){
    const urls=galleryUrls(p), display=urls.length?urls:[mainImage(p)], dims=p.dimensions||p.formats||[], isElios=p.manufacturer==='ELIOS';
    galleryState={product:p,urls:display,index:0};
    els.dialog.innerHTML=`<button class="modal-close" id="modal-close" aria-label="Fermer">×</button><div class="modal-hero"><div class="modal-gallery-wrap"><div class="modal-gallery" id="modal-gallery-touch"><img id="modal-main-image" src="${esc(display[0])}" alt="${esc(p.name)}" tabindex="0" role="button" aria-label="Agrandir la photo">${display.length>1?`<button class="gallery-nav gallery-prev" id="gallery-prev" type="button">‹</button><button class="gallery-nav gallery-next" id="gallery-next" type="button">›</button>`:''}<button class="gallery-expand" id="gallery-expand" type="button" aria-label="Plein écran">⛶</button><div class="gallery-counter" id="gallery-counter">1 / ${display.length}</div><div class="gallery-note">${esc(p.manufacturer)} · visuel catalogue</div></div>${display.length>1?`<div class="gallery-thumbs">${display.map((src,i)=>`<button class="gallery-thumb ${i===0?'active':''}" data-index="${i}" type="button"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>`:''}</div><div class="modal-info"><div class="modal-brand">${esc(p.brandLabel || p.manufacturer)}</div><h2>${esc(p.name)}</h2><p class="modal-description">${esc(p.description||'')}</p><div class="info-label">Inspiration</div><div class="finish-list">${(p.inspirations||[]).map(v=>`<span class="finish-chip">${esc(v)}</span>`).join('')}</div>${(p.colors||[]).length?`<div class="info-label">Couleurs</div><div class="color-list">${p.colors.map(v=>`<span class="color-chip">${esc(v)}</span>`).join('')}</div>`:''}${(p.finishes||[]).length?`<div class="info-label">Finitions / style</div><div class="finish-list">${p.finishes.map(v=>`<span class="finish-chip">${esc(v)}</span>`).join('')}</div>`:''}${dims.length?`<div class="info-label">Dimensions / formats</div><div class="finish-list">${dims.map(v=>`<span class="finish-chip">${esc(v)}</span>`).join('')}</div>`:''}<p class="source-note">Source : ${esc(p.sourceLabel || p.catalogueLabel || p.manufacturer)}${p.page ? ` · page ${esc(p.page)}` : ''}.</p></div></div>${isElios ? `<div class="modal-sections"><div class="modal-section"><h3>Formats & tarifs ELIOS</h3>${dims.length?`<table class="formats-table"><thead><tr><th>Format</th><th>Tarif net</th></tr></thead><tbody>${dims.map(f=>`<tr><td>${esc(f)}</td><td>${pricingCell(p,f)}</td></tr>`).join('')}</tbody></table>`:''}${eliosAccessMessage()}</div></div>` : `<div class="modal-sections"><div class="modal-section"><h3>NEOBATH · Design italien</h3><p class="tariff-message">Les tarifs NEOBATH ne sont pas affichés publiquement dans Inspirations. Les compositions ANIMA et DNA sont présentées ici pour rechercher le style, les finitions et les configurations.</p></div></div>`}`;
    els.modal.classList.add('open'); document.body.style.overflow='hidden';
    $('#modal-close')?.addEventListener('click',closeModal); $('#modal-main-image')?.addEventListener('click',openLightbox); $('#gallery-expand')?.addEventListener('click',e=>{e.stopPropagation();openLightbox()}); $('#gallery-prev')?.addEventListener('click',e=>{e.stopPropagation();moveGallery(-1)}); $('#gallery-next')?.addEventListener('click',e=>{e.stopPropagation();moveGallery(1)}); els.dialog.querySelectorAll('.gallery-thumb').forEach(b=>b.addEventListener('click',()=>setGalleryIndex(Number(b.dataset.index||0)))); bindSwipe($('#modal-gallery-touch'));
  }
  function setGalleryIndex(i){ if(!galleryState?.urls.length)return;const len=galleryState.urls.length;galleryState.index=(i+len)%len;const src=galleryState.urls[galleryState.index],main=$('#modal-main-image'),c=$('#gallery-counter');if(main)main.src=src;if(c)c.textContent=`${galleryState.index+1} / ${len}`;els.dialog.querySelectorAll('.gallery-thumb').forEach(b=>b.classList.toggle('active',Number(b.dataset.index)===galleryState.index));if(lightbox){const img=$('#lightbox-image'),cc=$('#lightbox-counter');if(img)img.src=src;if(cc)cc.textContent=`${galleryState.index+1} / ${len}`;}}
  function moveGallery(d){if(galleryState?.urls.length>1)setGalleryIndex(galleryState.index+d)}
  function bindSwipe(target){if(!target)return;let sx=0,sy=0;target.addEventListener('touchstart',e=>{const t=e.changedTouches[0];sx=t.clientX;sy=t.clientY},{passive:true});target.addEventListener('touchend',e=>{const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>=42&&Math.abs(dx)>=Math.abs(dy)*1.15)moveGallery(dx<0?1:-1)},{passive:true});}
  function openLightbox(){if(!galleryState)return;closeLightbox();const o=document.createElement('div');o.id='gallery-lightbox';o.className='gallery-lightbox open';o.innerHTML=`<button class="lightbox-close" id="lightbox-close">×</button>${galleryState.urls.length>1?`<button class="lightbox-nav lightbox-prev" id="lightbox-prev">‹</button><button class="lightbox-nav lightbox-next" id="lightbox-next">›</button>`:''}<div class="lightbox-stage" id="lightbox-stage"><img id="lightbox-image" src="${esc(galleryState.urls[galleryState.index])}" alt="${esc(galleryState.product.name)}"></div><div class="lightbox-counter" id="lightbox-counter">${galleryState.index+1} / ${galleryState.urls.length}</div>`;document.body.appendChild(o);lightbox=o;$('#lightbox-close')?.addEventListener('click',closeLightbox);$('#lightbox-prev')?.addEventListener('click',e=>{e.stopPropagation();moveGallery(-1)});$('#lightbox-next')?.addEventListener('click',e=>{e.stopPropagation();moveGallery(1)});bindSwipe($('#lightbox-stage'));}
  function closeLightbox(){if(lightbox)lightbox.remove();lightbox=null} function closeModal(){closeLightbox();els.modal.classList.remove('open');document.body.style.overflow='';galleryState=null}

  grid.addEventListener('click',e=>{const c=e.target.closest('.product-card');if(c){const p=data.find(x=>x.id===c.dataset.id);if(p)openProduct(p)}});grid.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.product-card')){e.preventDefault();e.target.closest('.product-card').click()}});els.modal?.addEventListener('click',e=>{if(e.target===els.modal)closeModal()});document.addEventListener('keydown',e=>{if(lightbox){if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')moveGallery(-1);if(e.key==='ArrowRight')moveGallery(1);return}if(!els.modal?.classList.contains('open'))return;if(e.key==='Escape')closeModal();if(e.key==='ArrowLeft')moveGallery(-1);if(e.key==='ArrowRight')moveGallery(1)});
  const bindSelect=(el,key)=>el?.addEventListener('change',()=>{state[key]=el.value;render()});els.search?.addEventListener('input',()=>{state.q=els.search.value;render()});bindSelect(els.inspiration,'inspiration');bindSelect(els.productType,'productType');bindSelect(els.color,'color');bindSelect(els.dimension,'dimension');bindSelect(els.manufacturer,'manufacturer');document.querySelectorAll('.quick-filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.quick-filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.inspiration=btn.dataset.inspiration||'Tous';if(els.inspiration)els.inspiration.value=state.inspiration;render();}));$('#reset-filters')?.addEventListener('click',()=>{Object.assign(state,{q:'',inspiration:'Tous',productType:'Tous',color:'Tous',dimension:'Tous',manufacturer:'Tous'});if(els.search)els.search.value='';[els.inspiration,els.productType,els.color,els.dimension,els.manufacturer].forEach(el=>{if(el)el.value='Tous'});document.querySelectorAll('.quick-filter').forEach(b=>b.classList.toggle('active',(b.dataset.inspiration||'Tous')==='Tous'));render();});$('#filter-toggle')?.addEventListener('click',()=>els.filters?.classList.toggle('open'));
  populateFilters(); render();
})();
