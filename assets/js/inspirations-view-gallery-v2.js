/* VIEW photography enhancement. Product, prices, permissions and ordering stay with their controllers. */
(() => {
  'use strict';
  if (window.__LRF_VIEW_GALLERY_V2__) return;
  window.__LRF_VIEW_GALLERY_V2__ = true;

  const modal = document.getElementById('product-modal-v2');
  const card = document.getElementById('product-modal-v2-card');
  if (!modal || !card) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeUrl = value => /^(?:https?:\/\/|\/(?!\/)|assets\/|data:image\/)/i.test(String(value || '')) ? String(value) : '';
  const imagesOf = (list, title = '') => {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).map(item => {
      const data = typeof item === 'string' ? {url:item} : (item || {});
      const url = [data.url, data.src, data.fullUrl, data.full].map(safeUrl).find(Boolean) || '';
      const fullUrl = safeUrl(data.fullUrl || data.full) || url;
      if (!url || /(?:\/|%2f)view\.png(?:[?#]|$)/i.test(url) || seen.has(url)) return null;
      seen.add(url);
      return {url, fullUrl, thumbnail:safeUrl(data.thumbnail || data.thumbnailUrl || data.thumb) || url, alt:String(data.alt || title), color:String(data.color || '')};
    }).filter(Boolean);
  };
  let openState = null;
  let returnFocus = null;
  let bodyOverflow = '';
  let inertStates = [];
  let pending = false;
  let activeProduct = null;

  function ensureLightbox() {
    let box = document.getElementById('view-gallery-lightbox');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'view-gallery-lightbox';
    box.className = 'view-lightbox-v2';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'view-lightbox-title');
    box.innerHTML = `<div class="view-lightbox-toolbar"><h2 id="view-lightbox-title"></h2><button type="button" class="view-lightbox-zoom" aria-pressed="false">Zoom +</button><button type="button" class="view-lightbox-close" aria-label="Fermer la galerie plein écran">×</button></div><div class="view-lightbox-stage"><img class="view-lightbox-photo" alt="" draggable="false"><p class="view-lightbox-error" role="status" hidden>Ce visuel est indisponible. Vous pouvez consulter les autres images.</p></div><button type="button" class="view-lightbox-prev" aria-label="Image précédente">‹</button><button type="button" class="view-lightbox-next" aria-label="Image suivante">›</button><div class="view-lightbox-footer"><p class="view-lightbox-caption" aria-live="polite"></p><p class="view-lightbox-help">Glissez pour parcourir · Zoom pour voir les détails</p></div>`;
    document.body.appendChild(box);
    box.querySelector('.view-lightbox-close').addEventListener('click', closeLightbox);
    box.querySelector('.view-lightbox-prev').addEventListener('click', () => moveLightbox(-1));
    box.querySelector('.view-lightbox-next').addEventListener('click', () => moveLightbox(1));
    box.querySelector('.view-lightbox-zoom').addEventListener('click', toggleZoom);
    const stage = box.querySelector('.view-lightbox-stage');
    stage.addEventListener('click', e => { if (e.target === stage && !box.classList.contains('zoomed')) closeLightbox(); });
    stage.addEventListener('dblclick', e => { if (e.target.tagName === 'IMG') { e.preventDefault(); toggleZoom(); } });
    installSwipe(stage, delta => moveLightbox(delta), () => !box.classList.contains('zoomed'));
    box.querySelector('img').addEventListener('error', () => {
      if (!openState) return;
      box.querySelector('.view-lightbox-error').hidden = false;
      box.querySelector('.view-lightbox-zoom').disabled = true;
    });
    box.querySelector('img').addEventListener('load', () => {
      box.querySelector('.view-lightbox-error').hidden = true;
      box.querySelector('.view-lightbox-zoom').disabled = false;
    });
    return box;
  }

  function resetZoom(box) {
    box.classList.remove('zoomed');
    const photo = box.querySelector('.view-lightbox-photo');
    photo.style.width = ''; photo.style.height = '';
    box.querySelector('.view-lightbox-zoom').textContent = 'Zoom +';
    box.querySelector('.view-lightbox-zoom').setAttribute('aria-pressed', 'false');
    const stage = box.querySelector('.view-lightbox-stage');
    stage.scrollTop = stage.scrollLeft = 0;
  }

  function toggleZoom() {
    if (!openState) return;
    const box = ensureLightbox();
    if (box.classList.contains('zoomed')) { resetZoom(box); return; }
    const photo = box.querySelector('.view-lightbox-photo');
    const rect = photo.getBoundingClientRect();
    if (!rect.width || !rect.height || !photo.naturalWidth) return;
    photo.style.width = `${Math.round(rect.width * 2)}px`;
    photo.style.height = `${Math.round(rect.height * 2)}px`;
    box.classList.add('zoomed');
    box.querySelector('.view-lightbox-zoom').textContent = 'Réduire';
    box.querySelector('.view-lightbox-zoom').setAttribute('aria-pressed', 'true');
  }

  function renderLightbox() {
    if (!openState) return;
    const box = ensureLightbox();
    const item = openState.images[openState.index];
    resetZoom(box);
    const photo = box.querySelector('.view-lightbox-photo');
    photo.src = item.fullUrl || item.url; photo.alt = `${item.alt || openState.title} — VIEW Ceramica`;
    box.querySelector('#view-lightbox-title').textContent = openState.title;
    box.querySelector('.view-lightbox-caption').textContent = `${item.alt || openState.title} · ${openState.index + 1} / ${openState.images.length}`;
    box.querySelector('.view-lightbox-error').hidden = true;
    box.querySelector('.view-lightbox-prev').hidden = box.querySelector('.view-lightbox-next').hidden = openState.images.length < 2;
    openState.onChange?.(openState.index);
  }

  function openImages(list, options = {}) {
    const images = imagesOf(list, options.title || 'VIEW CERAMICA');
    if (!images.length) return false;
    const box = ensureLightbox();
    if (!openState) {
      returnFocus = options.trigger || document.activeElement;
      bodyOverflow = document.body.style.overflow;
      inertStates = [...document.body.children].filter(node => node !== box && !['SCRIPT','STYLE','LINK'].includes(node.tagName)).map(node => [node, node.inert]);
      inertStates.forEach(([node]) => { node.inert = true; });
    }
    openState = {images, index:Math.max(0, Math.min(Math.trunc(Number(options.index)) || 0, images.length - 1)), title:String(options.title || 'VIEW CERAMICA'), onChange:options.onChange, productModal:options.productModal === true};
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    renderLightbox();
    box.querySelector('.view-lightbox-close').focus({preventScroll:true});
    return true;
  }

  function moveLightbox(delta) {
    if (!openState || openState.images.length < 2) return;
    openState.index = (openState.index + delta + openState.images.length) % openState.images.length;
    renderLightbox();
  }

  function closeLightbox() {
    if (!openState) return;
    const box = ensureLightbox();
    box.hidden = true; resetZoom(box);
    box.querySelector('.view-lightbox-photo').removeAttribute('src');
    const productModal = openState.productModal;
    openState = null;
    inertStates.forEach(([node, inert]) => { node.inert = inert; });
    inertStates = [];
    document.body.style.overflow = productModal && !modal.classList.contains('open') ? '' : bodyOverflow;
    if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus?.({preventScroll:true});
    returnFocus = null;
  }

  function installSwipe(stage, move, allowed = () => true) {
    let start = null, swipedAt = 0;
    stage.addEventListener('click', e => {
      if (Date.now() - swipedAt < 400) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    stage.addEventListener('touchstart', e => {
      start = e.touches.length === 1 && allowed() ? {x:e.touches[0].clientX, y:e.touches[0].clientY} : null;
    }, {passive:true});
    stage.addEventListener('touchend', e => {
      if (!start || !allowed()) { start = null; return; }
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) { swipedAt = Date.now(); move(dx < 0 ? 1 : -1); }
    }, {passive:true});
    stage.addEventListener('touchcancel', () => { start = null; }, {passive:true});
  }

  document.addEventListener('keydown', e => {
    if (!openState) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeLightbox(); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); moveLightbox(e.key === 'ArrowLeft' ? -1 : 1); return; }
    if (e.key !== 'Tab') return;
    const box = ensureLightbox();
    const buttons = [...box.querySelectorAll('button:not([hidden]):not(:disabled)')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (!box.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }, true);

  function productInCard() {
    if (!card.matches('.view-safe-modal,.view-modal-card')) return null;
    const title = card.querySelector('.view-safe-info h2,.modal-v2-info h2')?.textContent;
    if (!title) return null;
    const products = Array.isArray(window.VIEW_CATALOGUE) ? window.VIEW_CATALOGUE : [];
    return products.find(product => norm(product.name) === norm(title) || norm(product.collection) === norm(title)) || (activeProduct && norm(activeProduct.name) === norm(title) ? activeProduct : null);
  }

  function enhance(force = false) {
    const product = productInCard();
    if (!product || !modal.classList.contains('open')) return false;
    const old = card.querySelector('.view-safe-gallery,[data-view-gallery],.view-gallery-v2');
    if (!old || (!force && old.classList.contains('view-gallery-v2'))) return false;
    const slug = product.slug || String(product.id || '').replace(/^view-/, '');
    const media = window.VIEW_SELECTION_MEDIA || {};
    const curated = media.galleries?.[slug];
    const all = imagesOf(Array.isArray(curated) && curated.length ? curated : product.images, product.name);
    if (!all.length) return false;
    const variants = media.variants?.[slug] || {};
    const colorNames = [...new Set([...(product.colors || []), ...Object.keys(variants)])];
    const colorImages = Object.fromEntries(colorNames.map(color => [color, imagesOf(variants[color] || all.filter(item => norm(item.color) === norm(color)), `${product.name} · ${color}`)]).filter(([,images]) => images.length));
    let selected = '', items = all, index = 0;
    const gallery = document.createElement('section');
    gallery.className = 'view-gallery-v2';
    gallery.setAttribute('aria-label', `Photos de la collection ${product.name}`);
    gallery.innerHTML = `<div class="view-gallery-v2-stage"><button class="view-gallery-v2-expand" type="button" aria-label="Agrandir les photos de ${esc(product.name)}"><img class="view-gallery-v2-main" alt="${esc(product.name)}" draggable="false"><span class="view-gallery-v2-expand-label">⤢ Plein écran</span></button><button class="view-gallery-v2-prev" type="button" aria-label="Image précédente">‹</button><button class="view-gallery-v2-next" type="button" aria-label="Image suivante">›</button><span class="view-gallery-v2-count"></span><p class="view-gallery-v2-error" hidden>Visuel indisponible · essayez l’image suivante</p></div><div class="view-gallery-v2-thumbs" aria-label="Choisir un visuel"></div><p class="view-gallery-v2-caption" aria-live="polite"></p>${Object.keys(colorImages).length ? `<div class="view-gallery-v2-colors" aria-label="Aperçus par couleur"><button type="button" data-view-gallery-color="" class="active" aria-pressed="true">Tous les visuels</button>${colorNames.filter(color => colorImages[color]).map(color => `<button type="button" data-view-gallery-color="${esc(color)}" aria-pressed="false"><img src="${esc(colorImages[color][0].thumbnail)}" alt="" loading="lazy"><span>${esc(color)}</span></button>`).join('')}</div>` : ''}<p class="view-gallery-v2-help">Touchez l’image pour l’agrandir · glissez pour parcourir</p>`;
    old.replaceWith(gallery);
    const main = gallery.querySelector('.view-gallery-v2-main');
    const thumbs = gallery.querySelector('.view-gallery-v2-thumbs');
    const expand = gallery.querySelector('.view-gallery-v2-expand');

    function updateThumbs() {
      thumbs.innerHTML = items.map((item,i) => `<button type="button" data-view-gallery-index="${i}" class="${i===index ? 'active' : ''}" aria-label="${esc(item.alt || product.name)} · visuel ${i+1}" aria-pressed="${i===index}"><img src="${esc(item.thumbnail)}" alt="" loading="lazy" draggable="false"></button>`).join('');
    }
    function show(next, fromLightbox = false) {
      index = (next + items.length) % items.length;
      const item = items[index];
      main.src = item.url; main.alt = `${item.alt || product.name} — VIEW Ceramica — ${window.LRF_VIEW_SEARCH_META?.[product.slug]?.effect||product.effect||product.category}`;
      gallery.querySelector('.view-gallery-v2-count').textContent = `${index + 1} / ${items.length}`;
      gallery.querySelector('.view-gallery-v2-caption').textContent = item.alt || `${product.name}${selected ? ` · ${selected}` : ''}`;
      gallery.querySelector('.view-gallery-v2-error').hidden = true;
      gallery.querySelector('.view-gallery-v2-prev').hidden = gallery.querySelector('.view-gallery-v2-next').hidden = items.length < 2;
      [...thumbs.children].forEach((button,i) => { button.classList.toggle('active', i===index); button.setAttribute('aria-pressed', String(i===index)); });
      if (!fromLightbox && openState) closeLightbox();
    }
    const move = delta => show(index + delta);
    gallery.querySelector('.view-gallery-v2-prev').addEventListener('click', () => move(-1));
    gallery.querySelector('.view-gallery-v2-next').addEventListener('click', () => move(1));
    thumbs.addEventListener('click', e => { const button = e.target.closest('[data-view-gallery-index]'); if (button) show(Number(button.dataset.viewGalleryIndex)); });
    expand.addEventListener('click', () => openImages(items, {title:product.name, index, trigger:expand, productModal:true, onChange:next => show(next,true)}));
    main.addEventListener('error', () => { gallery.querySelector('.view-gallery-v2-error').hidden = false; });
    installSwipe(gallery.querySelector('.view-gallery-v2-stage'), move);
    gallery.querySelector('.view-gallery-v2-colors')?.addEventListener('click', e => {
      const button = e.target.closest('[data-view-gallery-color]');
      if (!button) return;
      selected = button.dataset.viewGalleryColor;
      items = selected ? colorImages[selected] : all;
      index = 0;
      gallery.querySelectorAll('[data-view-gallery-color]').forEach(item => { const active = item === button; item.classList.toggle('active',active); item.setAttribute('aria-pressed',String(active)); });
      updateThumbs(); show(0);
    });
    updateThumbs(); show(0);
    return true;
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; enhance(); });
  }
  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.view-gallery-v2'))) schedule();
  }).observe(card, {childList:true, subtree:true});
  new MutationObserver(() => {
    if (!modal.classList.contains('open')) { if (openState) closeLightbox(); }
    else schedule();
  }).observe(modal, {attributes:true, attributeFilter:['class']});
  window.addEventListener('lrf-view-product-opened', e => { activeProduct = e.detail?.product || null; schedule(); });
  window.addEventListener('lrf-view-media-ready', () => enhance(true));
  window.LRF_VIEW_GALLERY = {enhance:() => enhance(true), openImages, close:closeLightbox};
  schedule();
})();
