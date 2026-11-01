/* One verified collection, its actual colour images and its documented components. */
(() => {
  'use strict';
  if (window.LRF_BIOPIETRA_SELECTION) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = value => /^(https:\/\/|\/(?!\/)|assets\/)/i.test(String(value || '')) ? String(value) : '';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const products = () => window.BIOPIETRA_CATALOGUE || [];
  const unique = values => [...new Set(values.filter(Boolean))];
  const components = {fondo:'Plaques',angle:'Angles',piece:'Pièces de finition',accessory:'Produits de pose'};
  const componentName = variant => components[variant.component] || variant.label || 'Variante';
  const family = product => product.group || product.productType || product.family || 'Parement';
  const fr = value => Number(value).toLocaleString('fr-FR',{maximumFractionDigits:4});
  let dialog, lightbox, active, selectedColor = '', selectedVariant = '', index = 0, photos = [], trigger, previousOverflow = '';
  const swatches = product => product.swatches || [];
  const gallery = product => (product.images || []).map(item => typeof item === 'string' ? {url:item} : item).filter(item => safe(item.url));
  function normaliseProducts() {
    return products().map(product => ({...product,category:family(product),effect:family(product),
      colors:swatches(product).map(color=>color.name),colorFamilies:swatches(product).map(color=>color.name),
      formats:unique((product.variants || []).map(componentName)),
      finishes:unique((product.variants || []).map(variant=>variant.thickness)),
      keywords:[product.baseSeries,product.composition,...(product.technicalNotes || [])].filter(Boolean).join(' ')}));
  }
  function renderCards(found) {
    if (!found.length) return '<div class="empty-partner"><strong>Aucune référence avec ces filtres.</strong><p>Essayez le nom d’une série, un code couleur ou un numéro de Mix.</p></div>';
    return found.map(product => `<article class="product-card-v2 bpc-card" data-id="${esc(product.id)}"><button type="button" class="bpc-card-button" aria-label="Choisir ${esc(product.name)}">${safe(product.coverImage) ? `<img src="${esc(safe(product.coverImage))}" alt="${esc(product.name)} — Biopietra" loading="lazy" decoding="async" width="480" height="360">` : '<span class="bpc-no-photo">Visuel à consulter sur la fiche fabricant</span>'}<span class="bpc-card-copy"><span class="bpc-eyebrow">${esc(family(product))}</span><h3>${esc(product.name)}</h3><span class="bpc-card-meta">${swatches(product).length ? swatches(product).length+' coloris / compositions' : 'Référence fabricant'}${(product.variants || []).some(v=>v.component==='angle') ? ' · Angles' : ''}</span><span class="bpc-card-more">Voir les visuels et choisir →</span></span></button></article>`).join('');
  }
  function refreshChrome() {
    const current = norm($('#workspace-title')?.textContent) === 'biopietra';
    let guide = $('#bpc-guide');
    if (!guide) {
      guide = document.createElement('section'); guide.id = 'bpc-guide'; guide.className = 'bpc-guide';
      guide.innerHTML = '<div><span class="bpc-eyebrow">BIOPIETRA · VOTRE PROJET</span><h3>La bonne pierre, le bon mélange.</h3><p>Recherchez une série ou un Mix. Choisissez son coloris, ses plaques et ses angles, puis préparez les quantités.</p></div><a href="biopietra-commande.html" class="bpc-button">Préparer mon projet →</a>';
      $('#partner-products')?.parentNode.insertBefore(guide,$('#partner-products'));
    }
    guide.hidden = !current;
    $('#v2-filters')?.classList.toggle('bpc-filters',current);
    if (current) {
      $('#v2-search')?.setAttribute('aria-label','Rechercher une série, un coloris ou un Mix Biopietra');
      $('#v2-format')?.setAttribute('aria-label','Filtrer les plaques, angles et accessoires');
      $('#v2-color')?.setAttribute('aria-label','Filtrer les coloris Biopietra');
      $('#v2-effect')?.setAttribute('aria-label','Filtrer les familles Biopietra');
      $('#v2-finish')?.setAttribute('aria-label','Filtrer les épaisseurs Biopietra');
    }
    const search = $('#v2-search');
    if (search) search.placeholder = current ? 'Série, coloris, code ou Mix…' : 'Rechercher une collection, un format, une couleur…';
    const lexicon = $('#lrf-product-lexicon-btn');
    if (lexicon) lexicon.textContent = current ? 'Toutes les séries et les Mix' : '☰ Lexique des carreaux';
  }
  function requestLink(product = active) {
    if (!product) return 'biopietra-commande.html';
    const params = new URLSearchParams({collection:product.slug});
    if (selectedColor) params.set('color',selectedColor);
    if (selectedVariant) params.set('variant',selectedVariant);
    const quantity = $('#bpc-quantity',dialog)?.value;
    if (quantity) params.set('quantity',quantity);
    return 'biopietra-commande.html?' + params;
  }
  function close() { if (!dialog?.open) return; dialog.close(); document.body.style.overflow = previousOverflow; trigger?.focus?.({preventScroll:true}); }
  function makeDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog'); dialog.id = 'bpc-product-dialog'; dialog.className = 'bpc-dialog'; dialog.setAttribute('aria-labelledby','bpc-title');
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('click',event=>{if(event.target === dialog)close();});
    document.body.appendChild(dialog); return dialog;
  }
  function setPhoto(photo, caption) {
    const image = $('#bpc-main-image',dialog);
    if (!image) return;
    image.src = safe(photo.url || photo.image); image.alt = photo.alt || caption || active.name;
    image.dataset.original = safe(photo.fullUrl || photo.original || photo.url || photo.image);
    $('#bpc-caption',dialog).textContent = caption || photo.caption || photo.alt || active.name;
  }
  function showPhoto(position) {
    if (!photos.length) return;
    index = (position+photos.length)%photos.length;
    setPhoto(photos[index]);
    $('#bpc-count',dialog).textContent = `${index+1} / ${photos.length}`;
    dialog.querySelectorAll('[data-bpc-photo]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.bpcPhoto) === index)));
  }
  function openImage() {
    const photo = $('#bpc-main-image',dialog);
    if (!photo?.dataset.original) return;
    if (!lightbox) {
      lightbox = document.createElement('dialog'); lightbox.className = 'bpc-lightbox'; lightbox.setAttribute('aria-label','Visuel Biopietra en grand format');
      lightbox.innerHTML = '<div class="bpc-lightbox-head"><strong></strong><button type="button" data-bpc-zoom>Zoom ×2</button><button type="button" class="bpc-close" aria-label="Fermer le visuel">×</button></div><div class="bpc-lightbox-stage"><img alt=""></div>';
      $('.bpc-close',lightbox).onclick = ()=>lightbox.close();
      $('[data-bpc-zoom]',lightbox).onclick = event=>{const zoomed=lightbox.classList.toggle('bpc-zoomed');event.currentTarget.textContent=zoomed?'Ajuster':'Zoom ×2';};
      document.body.appendChild(lightbox);
    }
    lightbox.classList.remove('bpc-zoomed'); $('[data-bpc-zoom]',lightbox).textContent = 'Zoom ×2';
    $('strong',lightbox).textContent = photo.alt;
    $('img',lightbox).src = photo.dataset.original; $('img',lightbox).alt = photo.alt;
    lightbox.showModal(); $('.bpc-close',lightbox).focus();
  }
  function updateChoice() {
    const variant = (active.variants || []).find(item=>item.id === selectedVariant);
    const color = swatches(active).find(item=>item.id === selectedColor);
    dialog.querySelectorAll('[data-bpc-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bpcColor === selectedColor)));
    $('#bpc-chosen-color',dialog).textContent = color ? 'Coloris choisi : '+color.name : swatches(active).length ? 'Choisissez un coloris pour votre projet.' : active.composition ? 'Mélange défini par la composition ci-dessus.' : 'Coloris à préciser avec l’agence.';
    const output = $('#bpc-pack-result',dialog), quantity = Number(String($('#bpc-quantity',dialog).value).replace(',','.'));
    $('#bpc-quantity-unit',dialog).textContent = variant?.unit || 'unité';
    if (!variant) output.textContent = 'Choisissez l’élément et l’épaisseur pour connaître son conditionnement.';
    else if (variant.colorIds?.length && !selectedColor) output.textContent = 'Choisissez aussi le coloris pour vérifier cette variante.';
    else if (variant.colorIds?.length && !variant.colorIds.includes(selectedColor)) output.textContent = 'Cette variante n’est pas documentée pour le coloris choisi. Sélectionnez une autre variante.';
    else if (!(Number.isFinite(variant.packQuantity) && variant.packQuantity > 0)) output.textContent = 'Conditionnement à confirmer avec l’agence. Aucune conversion estimée.';
    else {
      const packLabel = variant.packLabel || 'boîte';
      const basis = `1 ${packLabel} = ${fr(variant.packQuantity)} ${variant.unit}`;
      const boxes = Number.isFinite(quantity) && quantity > 0 ? Math.ceil(quantity/variant.packQuantity-1e-9) : 0;
      output.textContent = boxes ? `${boxes} ${packLabel}${boxes>1?'s':''} · ${fr(Number((boxes*variant.packQuantity).toFixed(6)))} ${variant.unit}\n${basis}` : basis;
    }
    $('#bpc-order',dialog).href = requestLink();
  }
  async function openTariff(button, id) {
    const status = $('#bpc-tariff-status',dialog); button.disabled = true; status.textContent = 'Vérification de votre accès…';
    try {
      if (!window.LRF_BIOPIETRA_ACCESS?.openTariff) throw Error('Connectez-vous à votre espace professionnel pour consulter le tarif.');
      await window.LRF_BIOPIETRA_ACCESS.openTariff(button,id); status.textContent = '';
    } catch(error) { status.textContent = error.message || 'Le document ne peut pas être ouvert. Réessayez depuis l’espace PRO.'; }
    finally { button.disabled = false; }
  }
  function openCollection(id, from) {
    const product = products().find(item=>item.id === id || item.slug === id);
    if (!product) return false;
    makeDialog();
    if (!dialog.open) { trigger = from || document.activeElement; previousOverflow = document.body.style.overflow; }
    active = product; selectedColor = ''; selectedVariant = product.variants?.length === 1 ? product.variants[0].id : ''; photos = gallery(product); index = 0;
    const palette = swatches(product), variants = product.variants || [], source = product.primaryCatalogueSource || {url:product.sourceUrl,label:'Fiche fabricant '+product.name};
    const sourceUrl = safe(source.url), sourceHref = sourceUrl && Number.isInteger(source.page) ? sourceUrl.split('#')[0]+'#page='+source.page : sourceUrl;
    dialog.innerHTML = `<header class="bpc-dialog-head"><div><span class="bpc-eyebrow">BIOPIETRA · ${esc(family(product))}</span><h2 id="bpc-title">${esc(product.name)}</h2></div><button type="button" class="bpc-close" aria-label="Fermer la collection">×</button></header><div class="bpc-dialog-body"><section class="bpc-gallery" aria-label="Visuels ${esc(product.name)}">${photos.length || palette.some(c=>safe(c.image)) ? '<div class="bpc-stage"><button type="button" class="bpc-expand" aria-label="Agrandir le visuel"><img id="bpc-main-image" alt=""><span>⤢ Plein écran</span></button><span id="bpc-count"></span></div><div class="bpc-thumbnails">'+photos.map((photo,i)=>`<button type="button" data-bpc-photo="${i}" aria-label="Visuel ${i+1}" aria-pressed="false"><img src="${esc(safe(photo.thumbnail || photo.url))}" alt="" loading="lazy"></button>`).join('')+'</div><p id="bpc-caption" class="bpc-muted"></p>' : '<p class="bpc-muted">Consultez le visuel sur la fiche fabricant ci-dessous.</p>'}</section><section class="bpc-choices"><p>${esc(product.description || '')}</p>${product.composition ? `<div class="bpc-composition"><strong>Composition du mélange</strong><p>${esc(product.composition)}</p></div>` : ''}${palette.length ? `<h3>1. Choisir le coloris ou le mélange</h3><div class="bpc-swatches">${palette.map(color=>`<button type="button" data-bpc-color="${esc(color.id)}" aria-pressed="false">${safe(color.image)?`<img src="${esc(safe(color.image))}" alt="${esc(product.name+' · '+color.name)}" loading="lazy">`:'<span class="bpc-missing-photo">Visuel à confirmer</span>'}<span>${esc(color.name)}</span></button>`).join('')}</div><p id="bpc-chosen-color" class="bpc-muted" aria-live="polite"></p>` : '<p id="bpc-chosen-color" class="bpc-muted">Coloris à préciser avec l’agence.</p>'}<h3>2. Choisir l’élément et la quantité</h3><label class="bpc-field" for="bpc-variant">Plaques, angles ou pièces de finition<select id="bpc-variant"><option value="">Choisir l’élément / l’épaisseur</option>${variants.map(variant=>`<option value="${esc(variant.id)}"${variant.id===selectedVariant?' selected':''}>${esc([variant.label,variant.dimensions,variant.thickness].filter(Boolean).join(' · '))}</option>`).join('')}</select></label>${variants.length ? '' : '<p class="bpc-muted">Les pièces et conditionnements de cette composition sont à confirmer.</p>'}<label class="bpc-field" for="bpc-quantity">Quantité souhaitée <span id="bpc-quantity-unit"></span><input id="bpc-quantity" type="text" inputmode="decimal" maxlength="12" placeholder="Ex. 12,5"></label><output id="bpc-pack-result" class="bpc-pack-result" aria-live="polite"></output>${(product.technicalNotes || []).length ? `<details class="bpc-notes"><summary>Caractéristiques et conseils</summary><ul>${product.technicalNotes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul></details>` : ''}<section class="bpc-tariff"><h3>Tarifs professionnels</h3><p class="bpc-muted">Documents réservés aux comptes autorisés. Les conditions de votre projet seront confirmées par l’agence.</p><button type="button" class="bpc-secondary" data-bpc-tariff="biopietra-code-prix">Ouvrir la liste fabricant et les conditions</button><p id="bpc-tariff-status" role="status"></p></section>${sourceHref ? `<section class="bpc-source"><h3>Document de la collection</h3><a href="${esc(sourceHref)}" target="_blank" rel="noopener">${esc(source.label || 'Fiche fabricant '+product.name)}${source.printedPage ? ' · p. '+esc(source.printedPage) : ''} ↗</a></section>` : ''}</section></div><footer class="bpc-dialog-actions"><a id="bpc-order" class="bpc-button" href="${esc(requestLink(product))}">Préparer mon projet →</a><a href="biopietra-${esc(product.slug)}.html">Voir la fiche détaillée</a></footer>`;
    $('.bpc-close',dialog).onclick = close;
    $('.bpc-expand',dialog)?.addEventListener('click',openImage);
    dialog.querySelectorAll('[data-bpc-photo]').forEach(button=>button.onclick=()=>showPhoto(Number(button.dataset.bpcPhoto)));
    dialog.querySelectorAll('[data-bpc-color]').forEach(button=>button.onclick=()=>{
      selectedColor = button.dataset.bpcColor;
      const color = palette.find(item=>item.id === selectedColor);
      if (safe(color?.image)) { dialog.querySelectorAll('[data-bpc-photo]').forEach(photo=>photo.setAttribute('aria-pressed','false')); setPhoto({url:color.image,original:color.original,alt:product.name+' · '+color.name},product.name+' · '+color.name); $('#bpc-count',dialog).textContent = ''; }
      updateChoice();
    });
    $('#bpc-variant',dialog).onchange = event=>{selectedVariant=event.target.value;updateChoice();};
    $('#bpc-quantity',dialog).oninput = updateChoice;
    dialog.querySelectorAll('[data-bpc-tariff]').forEach(button=>button.onclick=()=>openTariff(button,button.dataset.bpcTariff));
    if (photos.length) showPhoto(0);
    else { const first = palette.find(color=>safe(color.image)); if(first)setPhoto({url:first.image,original:first.original,alt:product.name+' · '+first.name}); }
    updateChoice();
    if (!dialog.open) dialog.showModal(); document.body.style.overflow = 'hidden'; dialog.scrollTop = 0; $('.bpc-close',dialog).focus({preventScroll:true});
    return true;
  }
  window.LRF_BIOPIETRA_SELECTION = Object.freeze({openCollection,renderCards,normaliseProducts,refreshChrome});
})();
