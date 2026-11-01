/* La Fenice selection: catalogue navigation, accessible collection details and HD gallery. */
(() => {
  'use strict';
  if (window.LRF_FENICE_SELECTION) return;
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeUrl = value => {
    const text = String(value || '');
    return /^(?:https:\/\/|\/(?!\/)|assets\/|fenice-|carrelage-)/i.test(text) ? text : '';
  };
  const products = () => Array.isArray(window.FENICE_CATALOGUE) ? window.FENICE_CATALOGUE : [];
  const isFenice = () => norm($('#workspace-title')?.textContent).includes('fenice');
  const allowed = () => window.LRF_FENICE_ACCESS?.canAccess?.() === true;
  const imageList = p => {
    const seen = new Set();
    return (p.images || []).map(raw => {
      const item = typeof raw === 'string' ? {url:raw} : raw || {};
      const url = safeUrl(item.url || item.src);
      if (!url || seen.has(url)) return null;
      seen.add(url);
      return {url, fullUrl:safeUrl(item.fullUrl || item.full) || url, thumbnail:safeUrl(item.thumbnail || item.thumb) || url, alt:item.alt || `${p.name} — La Fenice — ${p.effect || 'carrelage'}`};
    }).filter(Boolean);
  };
  const swatchList = p => {
    const seen = new Set();
    return (p.swatches || []).map(item => {
      const url = safeUrl(item?.image || item?.url || item?.src);
      const name = String(item?.name || item?.color || '').trim();
      if (!url || !name || seen.has(norm(name))) return null;
      seen.add(norm(name));
      return {url, fullUrl:safeUrl(item.original || item.fullUrl || item.full) || url, thumbnail:url, name, alt:item.alt || `${p.name} · ${name} — La Fenice`};
    }).filter(Boolean);
  };
  const sourceList = p => {
    const primary = p.primaryCatalogueSource;
    const source = safeUrl(primary?.url) ? primary : (p.sources || []).find(s => safeUrl(s.url));
    return source ? [source] : safeUrl(p.pdf) ? [{label:`Catalogue ${p.name}`,url:p.pdf}] : [];
  };
  const sourceHref = source => {
    const url = safeUrl(source.url);
    return url && Number.isInteger(source.page) && source.page >= 1 ? `${url.split('#')[0]}#page=${source.page}` : url;
  };
  let selectedCatalogue = '';
  let dialog;
  let lightbox;
  let active = null;
  let index = 0;
  let images = [];
  let swatches = [];
  let lightboxImages = [];
  let lightboxIndex = 0;
  let lightboxMode = 'ambience';
  let lightboxTrigger = null;
  let tariffShown = false;
  let tariffLoading = false;
  let tariffError = '';
  let tariffEpoch = 0;
  let lastTrigger = null;
  let previousOverflow = '';
  let pending = false;
  let bar;
  let lastCataloguesSignature = '';

  function catalogueData() {
    const data = window.FENICE_CATALOGUES;
    if (Array.isArray(data)) return data;
    return [...new Map(products().flatMap(p => p.sources || []).filter(s => s.catalogueId || s.id).map(s => [s.catalogueId || s.id,{id:s.catalogueId || s.id,label:s.label,url:s.url}])).values()];
  }
  function catalogueIds(product) {
    return [...(product.catalogueIds || []), ...(product.catalogues || []).map(c => typeof c === 'string' ? c : c.id), ...(product.sources || []).map(s => s.catalogueId || s.id)];
  }
  function matchesCatalogue(product) {
    return !selectedCatalogue || catalogueIds(product).includes(selectedCatalogue);
  }
  function installCatalogueBar() {
    const filters = $('#v2-filters');
    if (!filters) return;
    if (!bar) {
      bar = document.createElement('section');
      bar.className = 'fenice-catalogue-bar';
      bar.hidden = true;
      bar.setAttribute('aria-label', 'Catalogues La Fenice');
      bar.innerHTML = '<div class="fenice-catalogue-toolbar"><label for="fenice-catalogue-filter">Explorer les catalogues</label><select id="fenice-catalogue-filter"><option value="">Toutes les collections, sans doublons</option></select><a class="fenice-text-link" href="carrelage-la-fenice.html">Collections, formats et inspirations →</a></div><details class="fenice-catalogue-library"><summary>Consulter tous les catalogues</summary><div class="fenice-catalogue-links"></div></details>';
      filters.after(bar);
      $('#fenice-catalogue-filter',bar).addEventListener('change', e => {
        selectedCatalogue = e.target.value;
        window.dispatchEvent(new CustomEvent('lrf-fenice-filter-change', {detail:{catalogueId:selectedCatalogue}}));
      });
    }
    bar.hidden = !isFenice();
    const catalogs = catalogueData();
    const signature = JSON.stringify([catalogs,products().map(p=>[p.id,catalogueIds(p)])]);
    if (signature !== lastCataloguesSignature) {
      lastCataloguesSignature = signature;
      $('#fenice-catalogue-filter',bar).innerHTML = '<option value="">Toutes les collections, sans doublons</option>' + catalogs.filter(c=>c.id && products().some(p=>catalogueIds(p).includes(c.id))).map(c => `<option value="${esc(c.id)}">${esc(c.label || c.name || c.id)}</option>`).join('');
      $('#fenice-catalogue-filter',bar).value = selectedCatalogue;
      $('.fenice-catalogue-links',bar).innerHTML = catalogs.filter(c => safeUrl(c.url)).map(c => `<a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener">${esc(c.label || c.name)}<span aria-hidden="true">↗</span></a>`).join('');
    }
  }
  function sourceText(source) {
    const page = source.printedPage ?? source.page;
    return `${source.label || 'Catalogue'}${page ? ` · p. ${page}` : ''}`;
  }
  function enhanceCards() {
    if (!isFenice()) return;
    const byId = new Map(products().map(p => [p.id,p]));
    $('#partner-products')?.querySelectorAll('.product-card-v2[data-id]').forEach(card => {
      if (card.dataset.feniceReady === '1') return;
      const product = byId.get(card.dataset.id);
      if (!product) return;
      card.dataset.feniceReady = '1';
      card.classList.add('fenice-product-card');
      card.setAttribute('role','button');
      card.tabIndex = 0;
      card.setAttribute('aria-label', `Découvrir ${product.name}, formats et visuels La Fenice`);
      const body = $('.body',card);
      if (!body) return;
      const chips = $('.chips',body);
      if (chips) chips.innerHTML = (product.formats || []).slice(0,4).map(f => `<span>${esc(f)} cm</span>`).join('') + ((product.formats || []).length > 4 ? `<span>+ ${product.formats.length-4} format${product.formats.length>5?'s':''}</span>` : '');
      const source = sourceList(product).find(s => s.page || s.printedPage) || sourceList(product)[0];
      const note = document.createElement('p');
      note.className = 'fenice-card-source';
      note.textContent = source ? sourceText(source) : 'Collection La Fenice';
      body.appendChild(note);
      const more = document.createElement('span');
      more.className = 'fenice-card-more';
      more.textContent = 'Voir la collection →';
      body.appendChild(more);
    });
  }
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; installCatalogueBar(); enhanceCards(); });
  }
  function createDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'fenice-product-dialog';
    dialog.className = 'fenice-dialog';
    dialog.setAttribute('aria-labelledby','fenice-product-title');
    document.body.appendChild(dialog);
    dialog.addEventListener('click', e => { if (e.target === dialog) closeProduct(); });
    dialog.addEventListener('close', () => {
      lightbox?.close();
      document.body.style.overflow = previousOverflow;
      active = null;
      tariffShown = false;
      tariffLoading = false;
      tariffError = '';
      tariffEpoch += 1;
      $('.fenice-tariffs',dialog)?.replaceChildren();
      lastTrigger?.focus({preventScroll:true});
    });
    dialog.addEventListener('cancel', e => { e.preventDefault(); closeProduct(); });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); return; }
      if (lightbox?.open || e.target.closest?.('.fenice-swatches')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        e.preventDefault(); showImage(index + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });
    return dialog;
  }
  function closeProduct() { if (dialog?.open) dialog.close(); }
  function requestLink(product) { return `fenice-demande.html?collection=${encodeURIComponent(product.slug)}`; }
  function priceLabel(product,format) {
    if (!tariffShown || !allowed()) return '—';
    const quote = window.LRF_FENICE_ACCESS?.getPrice?.(product,format);
    if (!quote || quote.locked) return 'Tarif indisponible';
    return String(quote.label || 'Sur demande');
  }
  function swatchHtml(product) {
    if (!swatches.length) return (product.colors || []).length ? `<h3>Coloris</h3><div class="fenice-tags">${product.colors.map(c=>`<span>${esc(c)}</span>`).join('')}</div>` : '';
    const covered = new Set(swatches.map(item => norm(item.name)));
    const extra = (product.colors || []).filter(name => !covered.has(norm(name)));
    return `<section class="fenice-color-section" aria-label="Coloris de ${esc(product.name)}"><h3>Coloris & matières <span>${swatches.length}</span></h3><p class="fenice-swatch-hint">Touchez un coloris pour l’agrandir.</p>${product.materialsNote ? `<p class="fenice-materials-note">${esc(product.materialsNote)}</p>` : ''}<div class="fenice-swatches">${swatches.map((item,i)=>`<button type="button" class="fenice-swatch" data-fenice-swatch="${i}" aria-label="Agrandir ${esc(product.name)} · ${esc(item.name)}"><img src="${esc(item.thumbnail)}" alt="${esc(item.alt)}" loading="lazy" decoding="async"><span>${esc(item.name)}</span></button>`).join('')}</div>${extra.length ? `<div class="fenice-tags fenice-extra-colors">${extra.map(name=>`<span>${esc(name)}</span>`).join('')}</div>` : ''}</section>`;
  }
  function tariffHtml(product) {
    const access = allowed();
    const show = tariffShown && access;
    const status = tariffLoading ? 'Vérification de votre accès et chargement des montants…' : tariffError || '';
    return `<section class="fenice-tariffs" aria-label="Formats et tarifs professionnels"><div class="fenice-tariff-heading"><h3 data-lrf-tariff-toggle="1">Formats & tarifs professionnels</h3>${access ? `<button class="fenice-tariff-toggle" type="button" data-fenice-price-toggle aria-controls="fenice-price-table" aria-expanded="${show}"${tariffLoading ? ' disabled aria-busy="true"' : ''}>${tariffLoading ? 'Chargement…' : show ? 'Cacher' : 'Voir'}</button>` : ''}</div>${(product.formats || []).length ? `<div class="fenice-format-table"><table id="fenice-price-table" data-lrf-tariff-controlled="fenice"><thead><tr><th scope="col">Format</th><th scope="col">Tarif PRO</th></tr></thead><tbody>${product.formats.map(f => `<tr><td>${esc(f)} cm</td><td${show ? '' : ' class="fenice-price-masked"'}>${esc(priceLabel(product,f))}</td></tr>`).join('')}</tbody></table></div>` : '<p>Formats détaillés dans la fiche catalogue.</p>'}${access ? `${!show && !tariffLoading && !tariffError ? '<p class="fenice-access-note">Appuyez sur « Voir » pour afficher vos tarifs.</p>' : ''}<button class="fenice-button fenice-button-secondary" data-fenice-tariff type="button">Ouvrir mon tarif PRO La Fenice</button>` : '<p class="fenice-access-note">Tarifs réservés aux professionnels disposant de l’accès La Fenice. <a href="tarifs-pro.html">Se connecter à l’espace PRO</a></p>'}<p class="fenice-tariff-status" role="status" aria-live="polite">${esc(status)}</p></section>`;
  }
  function refreshTariffs() {
    if (!active || !dialog?.open) return;
    const section = $('.fenice-tariffs',dialog);
    if (!section) return;
    const focusedToggle = document.activeElement?.matches?.('[data-fenice-price-toggle]');
    const epoch = tariffEpoch;
    const html = tariffHtml(active);
    section.outerHTML = epoch === tariffEpoch ? html : tariffHtml(active);
    if (focusedToggle) $('[data-fenice-price-toggle]',dialog)?.focus({preventScroll:true});
  }
  async function togglePrices() {
    if (!active || tariffLoading) return;
    const epoch = ++tariffEpoch, product = active;
    tariffError = '';
    if (tariffShown) {
      tariffShown = false;
      refreshTariffs();
      return;
    }
    tariffLoading = true;
    refreshTariffs();
    try {
      if (!allowed() || !window.LRF_FENICE_ACCESS?.loadPrices) throw Error('Connectez-vous à votre espace PRO pour consulter les montants.');
      await window.LRF_FENICE_ACCESS.loadPrices();
      if (epoch !== tariffEpoch || active !== product || !dialog?.open || !allowed()) return;
      tariffShown = true;
    } catch (error) {
      if (epoch !== tariffEpoch || active !== product) return;
      tariffShown = false;
      tariffError = error.message || 'Les montants sont momentanément indisponibles. Appuyez sur « Voir » pour réessayer.';
    } finally {
      if (epoch === tariffEpoch && active === product) { tariffLoading = false; refreshTariffs(); }
    }
  }
  function openCollection(id,trigger) {
    const p = products().find(p => p.id === id || p.slug === id);
    if (!p) return false;
    const box = createDialog();
    const alreadyOpen = box.open;
    if (!alreadyOpen) { lastTrigger = trigger || document.activeElement; previousOverflow = document.body.style.overflow; }
    active = p; images = imageList(p); swatches = swatchList(p); index = 0;
    tariffShown = false; tariffLoading = false; tariffError = ''; tariffEpoch += 1;
    const sources = sourceList(p);
    box.innerHTML = `<div class="fenice-dialog-header"><div><span class="fenice-eyebrow">LA FENICE · ${esc(p.effect || 'Carrelage italien')}</span><h2 id="fenice-product-title">${esc(p.name)}</h2></div><button type="button" class="fenice-close" aria-label="Fermer la collection">×</button></div><div class="fenice-dialog-body"><section class="fenice-gallery" aria-label="Visuels de ${esc(p.name)}">${images.length ? '<div class="fenice-gallery-stage"><button type="button" class="fenice-gallery-expand" aria-label="Agrandir le visuel en plein écran"><img class="fenice-main-image" alt=""><span>⤢ Plein écran</span></button><button type="button" class="fenice-image-prev" aria-label="Visuel précédent">‹</button><button type="button" class="fenice-image-next" aria-label="Visuel suivant">›</button><span class="fenice-image-count" aria-live="polite"></span><p class="fenice-image-error" hidden>Ce visuel est momentanément indisponible. Consultez le suivant ou le catalogue.</p></div><div class="fenice-thumbnails"></div><p class="fenice-image-caption"></p>' : '<p class="fenice-no-image">Consultez les visuels dans le catalogue de cette collection.</p>'}</section><div class="fenice-product-info"><p class="fenice-description">${esc(p.description || `Découvrez les formats, coloris et visuels de la collection ${p.name} de La Fenice.`)}</p>${swatchHtml(p)}${(p.finishes || []).length ? `<h3>Finitions</h3><div class="fenice-tags">${p.finishes.map(f=>`<span>${esc(f)}</span>`).join('')}</div>` : ''}${tariffHtml(p)}<section class="fenice-sources"><h3>Catalogue de la collection</h3>${sources.length ? sources.map(s => `<a class="fenice-source-link" href="${esc(sourceHref(s))}" target="_blank" rel="noopener">${esc(sourceText(s))}<span aria-hidden="true">↗</span></a>`).join('') : ''}</section></div></div><div class="fenice-dialog-actions"><a class="fenice-button" href="${requestLink(p)}">${allowed() ? 'Préparer ma commande' : 'Demander un renseignement'}</a><a class="fenice-text-link" href="la-fenice-${esc(encodeURIComponent(p.slug))}.html">Voir la fiche collection →</a></div>`;
    $('.fenice-close',box).addEventListener('click',closeProduct);
    if (images.length) {
      $('.fenice-thumbnails',box).innerHTML = images.map((image,i) => `<button type="button" data-fenice-image="${i}" aria-label="Visuel ${i+1} de ${esc(p.name)}" aria-pressed="false"><img src="${esc(image.thumbnail)}" alt="" loading="lazy"></button>`).join('');
      $('.fenice-thumbnails',box).addEventListener('click',e => { const button = e.target.closest('[data-fenice-image]'); if (button) showImage(Number(button.dataset.feniceImage)); });
      $('.fenice-image-prev',box).addEventListener('click',()=>showImage(index-1));
      $('.fenice-image-next',box).addEventListener('click',()=>showImage(index+1));
      $('.fenice-gallery-expand',box).addEventListener('click',e=>openLightbox(images,index,e.currentTarget,'ambience'));
      const photo = $('.fenice-main-image',box);
      photo.addEventListener('error',()=>{ $('.fenice-image-error',box).hidden=false; });
      photo.addEventListener('load',()=>{ $('.fenice-image-error',box).hidden=true; });
      swipe($('.fenice-gallery-stage',box),delta=>showImage(index+delta));
      showImage(0);
    }
    box.onclick = e => {
      const swatch = e.target.closest?.('[data-fenice-swatch]');
      if (swatch) openLightbox(swatches,Number(swatch.dataset.feniceSwatch),swatch,'swatch');
      if (e.target.closest?.('[data-fenice-price-toggle]')) togglePrices();
      const tariff = e.target.closest?.('[data-fenice-tariff]');
      if (tariff) openTariff(tariff);
    };
    if (!alreadyOpen) box.showModal();
    document.body.style.overflow = 'hidden';
    box.scrollTop = 0;
    $('.fenice-close',box).focus({preventScroll:true});
    window.dispatchEvent(new CustomEvent('lrf-fenice-product-opened',{detail:{product:p}}));
    return true;
  }
  async function openTariff(button) {
    const status=$('.fenice-tariff-status',dialog);
    button.disabled=true;
    status.textContent='Vérification de votre accès…';
    try {
      if (!allowed() || !window.LRF_FENICE_ACCESS?.openTariff) throw new Error('Connectez-vous à votre espace PRO pour consulter ce tarif.');
      await window.LRF_FENICE_ACCESS.openTariff(button);
      status.textContent='';
    } catch(error) { status.textContent=error.message || 'Le tarif est momentanément indisponible. Réessayez depuis l’espace PRO.'; }
    finally { button.disabled=false; }
  }
  function showImage(next) {
    if (!images.length || !dialog) return;
    index=(next+images.length)%images.length;
    const image=images[index];
    const photo=$('.fenice-main-image',dialog);
    photo.src=image.url; photo.alt=image.alt;
    $('.fenice-image-error',dialog).hidden=true;
    $('.fenice-image-count',dialog).textContent=`${index+1} / ${images.length}`;
    $('.fenice-image-caption',dialog).textContent=image.alt;
    dialog.querySelectorAll('[data-fenice-image]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.feniceImage)===index)));
    $('.fenice-image-prev',dialog).hidden=$('.fenice-image-next',dialog).hidden=images.length<2;
    if (lightbox?.open && lightboxMode === 'ambience') { lightboxIndex=index; renderLightbox(); }
  }
  function swipe(element,move) {
    let start;
    element.addEventListener('touchstart',e=>{if(e.touches.length===1)start={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
    element.addEventListener('touchend',e=>{if(!start||e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.4)move(dx<0?1:-1);},{passive:true});
  }
  function moveLightbox(delta) {
    if (!lightboxImages.length) return;
    lightboxIndex=(lightboxIndex+delta+lightboxImages.length)%lightboxImages.length;
    if (lightboxMode === 'ambience') showImage(lightboxIndex);
    else renderLightbox();
  }
  function openLightbox(items=images,next=index,trigger=null,mode='ambience') {
    if (!items.length) return;
    lightboxImages=items; lightboxIndex=next; lightboxTrigger=trigger; lightboxMode=mode;
    if (!lightbox) {
      lightbox=document.createElement('dialog');
      lightbox.id='fenice-lightbox';
      lightbox.className='fenice-lightbox';
      lightbox.setAttribute('aria-label','Galerie La Fenice en plein écran');
      lightbox.innerHTML='<div class="fenice-lightbox-toolbar"><strong></strong><button class="fenice-zoom" type="button" aria-pressed="false">Zoom +</button><button type="button" class="fenice-close" aria-label="Fermer le plein écran">×</button></div><div class="fenice-lightbox-stage"><img alt=""><p class="fenice-image-error" hidden>Ce visuel est momentanément indisponible.</p></div><button class="fenice-image-prev" type="button" aria-label="Visuel précédent">‹</button><button class="fenice-image-next" type="button" aria-label="Visuel suivant">›</button><p class="fenice-lightbox-caption" aria-live="polite"></p>';
      document.body.appendChild(lightbox);
      $('.fenice-close',lightbox).addEventListener('click',()=>lightbox.close());
      $('.fenice-zoom',lightbox).addEventListener('click',()=>{const zoomed=lightbox.classList.toggle('fenice-zoomed');$('.fenice-zoom',lightbox).setAttribute('aria-pressed',String(zoomed));$('.fenice-zoom',lightbox).textContent=zoomed?'Réduire':'Zoom +';});
      $('.fenice-image-prev',lightbox).addEventListener('click',()=>moveLightbox(-1));
      $('.fenice-image-next',lightbox).addEventListener('click',()=>moveLightbox(1));
      lightbox.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopImmediatePropagation();return;}if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();moveLightbox(e.key==='ArrowRight'?1:-1);}});
      lightbox.addEventListener('close',()=>{ if(dialog?.open)lightboxTrigger?.focus({preventScroll:true}); });
      $('.fenice-lightbox-stage img',lightbox).addEventListener('error',()=>$('.fenice-image-error',lightbox).hidden=false);
      $('.fenice-lightbox-stage img',lightbox).addEventListener('load',()=>$('.fenice-image-error',lightbox).hidden=true);
      swipe($('.fenice-lightbox-stage',lightbox),delta=>{if(!lightbox.classList.contains('fenice-zoomed'))moveLightbox(delta);});
    }
    renderLightbox();
    if (!lightbox.open) lightbox.showModal();
  }
  function renderLightbox() {
    const item=lightboxImages[lightboxIndex];
    if (!item || !active) return;
    lightbox.classList.remove('fenice-zoomed');
    $('.fenice-zoom',lightbox).textContent='Zoom +';
    $('.fenice-zoom',lightbox).setAttribute('aria-pressed','false');
    $('.fenice-lightbox-toolbar strong',lightbox).textContent=active.name;
    const photo=$('.fenice-lightbox-stage img',lightbox);
    photo.src=item.fullUrl;photo.alt=item.alt;
    $('.fenice-image-error',lightbox).hidden=true;
    $('.fenice-lightbox-caption',lightbox).textContent=`${item.alt} · ${lightboxIndex+1} / ${lightboxImages.length}`;
    $('.fenice-image-prev',lightbox).hidden=$('.fenice-image-next',lightbox).hidden=lightboxImages.length<2;
  }
  document.addEventListener('click', e => {
    const card=e.target.closest?.('#partner-products .product-card-v2[data-id^="fenice-"]');
    if (!card || !isFenice() || e.target.closest('a')) return;
    e.preventDefault();e.stopImmediatePropagation();openCollection(card.dataset.id,card);
  },true);
  document.addEventListener('keydown',e=>{
    const card=e.target.closest?.('#partner-products .fenice-product-card');
    if(!card||!isFenice()||(e.key!=='Enter'&&e.key!==' '))return;
    e.preventDefault();e.stopImmediatePropagation();openCollection(card.dataset.id,card);
  },true);
  window.addEventListener('lrf-pro-session-changed',()=>{
    tariffEpoch += 1; tariffShown = false; tariffLoading = false; tariffError = '';
    refreshTariffs(); schedule();
  });
  window.addEventListener('lrf-fenice-prices-changed',event=>{
    if (['idle','cleared'].includes(event.detail?.state) || !allowed()) {
      tariffEpoch += 1; tariffShown = false; tariffLoading = false; tariffError = '';
    }
    refreshTariffs();
  });
  window.addEventListener('lrf-agent-tariffs-ready',schedule);
  ['lrf-fenice-data-ready','lrf-selections-fenice-ready','pageshow'].forEach(name=>window.addEventListener(name,schedule));
  const grid=$('#partner-products'), title=$('#workspace-title');
  if(grid)new MutationObserver(schedule).observe(grid,{childList:true});
  if(title)new MutationObserver(schedule).observe(title,{childList:true,characterData:true,subtree:true});
  window.LRF_FENICE_SELECTION={openCollection,matchesCatalogue,getSelectedCatalogue:()=>selectedCatalogue,refresh:schedule};
  schedule();
})();
