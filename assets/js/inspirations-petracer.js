/* Petracer's — separate surface, furniture, sanitary and tapware selections. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  const safe = value => /^(https:\/\/|\/(?!\/)|assets\/)/i.test(String(value || '')) ? String(value) : '';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const CATEGORIES = {
    exception:{label:'Carrelage d’exception', eyebrow:'CARRELAGE D’EXCEPTION', title:'Le caractère italien.<br>L’art du détail.', description:'Des surfaces expressives, des décors singuliers et des détails précieux. Découvrez les collections de sols et de revêtements Petracer’s, à travers les photographies et les documents du fabricant.', signature:'La céramique comme<br>signature d’intérieur.', subtitle:'Italie · Sols & revêtements de prestige', search:'Collection, couleur, format, décor…', noun:'collection', lexicon:'Lexique des collections A–Z'},
    meubles:{label:'Meubles de salle de bain', eyebrow:'MEUBLES DE SALLE DE BAIN', title:'Le bain, en majesté.<br>Le détail, en signature.', description:'Consoles, meubles et compositions pour le bain. Explorez les créations Originali Interni Italiani de Petracer’s, leurs matériaux et leurs finitions, pour composer un espace personnel.', signature:'Des lignes singulières.<br>Un art de vivre italien.', subtitle:'Originali Interni Italiani · Meubles de prestige', search:'Meuble, collection, dimension, finition…', noun:'création', lexicon:'Lexique des meubles A–Z'},
    sanitaire:{label:'Sanitaire', eyebrow:'SANITAIRE', title:'Des lignes sculptées.<br>Un bain de caractère.', description:'Découvrez les créations sanitaires Originali Interni Italiani de Petracer’s. Formes, matériaux et proportions se choisissent avec les dimensions et les associations documentées par le fabricant.', signature:'La forme, la matière.<br>L’élégance du bain.', subtitle:'Originali Interni Italiani · Sanitaire de prestige', search:'Vasque, baignoire, collection, dimension…', noun:'création', lexicon:'Lexique du sanitaire A–Z'},
    robinetterie:{label:'Robinetterie & miroirs', eyebrow:'ROBINETTERIE, MIROIRS & ACCESSOIRES', title:'L’accord des détails.<br>La justesse des finitions.', description:'Robinetterie, miroirs et accessoires Petracer’s complètent l’univers du bain. Parcourez les références du fabricant et leurs finitions pour trouver les accords de votre projet.', signature:'Des reflets, des matières.<br>Une même exigence.', subtitle:'Originali Interni Italiani · Robinetterie, miroirs & accessoires', search:'Robinetterie, miroir, accessoire, finition…', noun:'référence', lexicon:'Lexique des références A–Z'}
  };
  const validCategory = category => typeof category === 'string' && Object.hasOwn(CATEGORIES, category);
  let category = 'exception';
  const datasetFor = selected => selected === 'exception' ? 'tiles' : 'bath';
  const rawProducts = dataset => (dataset === 'tiles' ? window.PETRACER_CATALOGUE : window.PETRACER_BATH_CATALOGUE) || [];
  const products = (selected = category) => {
    const chosen = validCategory(selected) ? selected : category;
    const entries = rawProducts(datasetFor(chosen));
    return chosen === 'exception' ? entries : entries.filter(product => product.navCategory === chosen);
  };
  const current = () => norm($('#workspace-title')?.textContent) === 'petracers';
  const photosOf = product => (product.images || []).map(photo => typeof photo === 'string' ? {url:photo, label:product.name} : photo).filter(photo => safe(photo.url));
  const familyOf = product => product.family || CATEGORIES[product.navCategory || category]?.label || 'Petracer’s';
  const pending = {tiles:null, bath:null}, failed = {tiles:false, bath:false};
  let group = '', chrome, dialog, lightbox, active, photos = [], index = 0, trigger, previousOverflow = '';

  function setCategory(selected) {
    if (!validCategory(selected) || category === selected) return false;
    close();
    category = selected;
    group = '';
    return true;
  }

  function normaliseProducts(selected = category) {
    const chosen = validCategory(selected) ? selected : category;
    return products(chosen).map(product => ({...product, category:familyOf(product), effect:product.effect || familyOf(product), colorFamilies:product.colorFamilies || product.colors || [],
      keywords:["Petracer’s Petracers italien luxe", CATEGORIES[chosen].label, product.productType || '', product.keywords || '', ...(product.formats || []).map(format => format.replace(/×/g, 'x')), ...(product.technicalNotes || product.details || [])].join(' ')}));
  }
  function notify(name, detail) { window.dispatchEvent(new CustomEvent('lrf-petracer-' + name, {detail})); }
  async function load(selected = category) {
    const chosen = validCategory(selected) ? selected : category;
    const dataset = datasetFor(chosen);
    if (rawProducts(dataset).length) return products(chosen);
    if (pending[dataset]) { await pending[dataset]; return products(chosen); }
    failed[dataset] = false;
    pending[dataset] = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const file = dataset === 'tiles' ? 'petracer-catalogue.json' : 'petracer-bain-catalogue.json';
        const response = await fetch('assets/data/' + file + '?v=20261101-petracer-bain1', {signal:controller.signal});
        if (!response.ok) throw new Error('Catalogue indisponible');
        const data = await response.json();
        const entries = data.products || data.collections;
        if (!Array.isArray(entries) || !entries.length || entries.some(entry => !entry.id || !entry.name)) throw new Error('Catalogue incomplet');
        if (dataset === 'tiles') {
          window.PETRACER_CATALOGUE = entries;
          window.PETRACER_CATALOGUES = data.catalogues || [];
        } else {
          window.PETRACER_BATH_CATALOGUE = entries;
          window.PETRACER_BATH_CATALOGUES = data.catalogues || [];
        }
        notify('data-ready', {category:chosen, dataset});
        refreshChrome();
        return entries;
      } catch (error) {
        failed[dataset] = true;
        notify('data-error', {category:chosen, dataset});
        throw error;
      } finally {
        clearTimeout(timeout);
        pending[dataset] = null;
      }
    })();
    await pending[dataset];
    return products(chosen);
  }
  const matches = product => (category === 'exception' ? !product.navCategory || product.navCategory === 'exception' : product.navCategory === category) && (!group || norm(familyOf(product)) === norm(group));
  function renderCards(found) {
    const hasFailed = failed[datasetFor(category)], meta = CATEGORIES[category];
    if (!rawProducts(datasetFor(category)).length) return `<div class="pcr-empty" role="${hasFailed ? 'alert' : 'status'}"><h3>${hasFailed ? 'La sélection est momentanément indisponible.' : 'Votre sélection Petracer’s se prépare…'}</h3><p>${hasFailed ? 'Réessayez pour retrouver les créations et leurs documents.' : 'Chargement des photographies et des références.'}</p>${hasFailed ? '<button type="button" data-pcr-retry>Réessayer</button>' : ''}</div>`;
    found = found.filter(matches);
    if (!found.length) return `<div class="pcr-empty"><h3>Aucune ${esc(meta.noun)} avec ces critères.</h3><p>Essayez un autre nom, une couleur ou ${category === 'exception' ? 'un format' : 'une dimension'}.</p><button type="button" data-pcr-reset>Réinitialiser les filtres</button></div>`;
    return found.map(product => {
      const images = photosOf(product), cover = safe(product.coverImage || images[0]?.url), thumb = safe(product.thumbnail || images[0]?.thumb || cover);
      return `<article class="product-card-v2 pcr-card" data-id="${esc(product.id)}"><button type="button" class="pcr-card-button" aria-label="Découvrir ${esc(product.name)}"><span class="pcr-card-visual">${cover ? `<img src="${esc(thumb)}" alt="${esc(product.name)} — Petracer’s" loading="lazy" decoding="async" width="640" height="480">` : `<span>Découvrir la ${esc(meta.noun)}</span>`}${product.badge ? `<span class="pcr-card-badge">${esc(product.badge)}</span>` : ''}</span><span class="pcr-card-copy"><span class="pcr-eyebrow">${esc(familyOf(product))}</span><span class="pcr-card-name">${esc(product.name)}</span><span class="pcr-card-meta">${images.length} visuel${images.length > 1 ? 's' : ''}${product.formats?.length ? ' · ' + esc(product.formats.slice(0, 2).join(' / ')) : ''}</span><span class="pcr-card-more">Explorer la ${esc(meta.noun)} <span aria-hidden="true">↗</span></span></span></button></article>`;
    }).join('');
  }
  function resetFilters() { notify('filter-change', {reset:true, category}); }
  function refreshChrome(selectedCategory) {
    const selected = current();
    if (selected && validCategory(selectedCategory)) setCategory(selectedCategory);
    const meta = CATEGORIES[category];
    $('#partner-workspace')?.classList.toggle('pcr-workspace', selected);
    if (!chrome) {
      if (!$('#v2-filters')) return;
      chrome = document.createElement('section');
      chrome.id = 'pcr-guide';
      chrome.className = 'pcr-guide';
      chrome.innerHTML = '<div class="pcr-introduction"><div><span class="pcr-eyebrow" data-pcr-intro-eyebrow></span><h3 data-pcr-intro-title></h3><p data-pcr-intro-description></p></div><div class="pcr-intro-detail"><span>ICONIC ITALIAN LUXURY</span><p data-pcr-intro-signature></p><button type="button" data-pcr-explore>Explorer les créations <span aria-hidden="true">↗</span></button></div></div><nav class="pcr-tabs" aria-label="Familles Petracer’s" hidden></nav><div class="pcr-library"><label for="pcr-jump"><span data-pcr-lexicon-label></span><select id="pcr-jump"><option value="">Accéder à une référence…</option></select></label><details><summary>Catalogue & documentation</summary><div id="pcr-catalogue-links"></div></details></div>';
      $('#v2-filters').before(chrome);
      chrome.addEventListener('click', event => {
        const tab = event.target.closest('[data-pcr-group]');
        if (tab) { group = tab.dataset.pcrGroup; resetFilters(); refreshChrome(); }
        if (event.target.closest('[data-pcr-explore]')) $('#partner-products')?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
      });
      $('#pcr-jump', chrome).addEventListener('change', event => {
        if (event.target.value) openCollection(event.target.value, event.target);
        event.target.value = '';
      });
    }
    chrome.hidden = !selected;
    if (!selected) { if (dialog?.open) close(); return; }
    chrome.dataset.category = category;
    chrome.setAttribute('aria-label', 'Découvrir Petracer’s · ' + meta.label);
    $('[data-pcr-intro-eyebrow]', chrome).textContent = 'PETRACER’S · ' + meta.eyebrow;
    $('[data-pcr-intro-title]', chrome).innerHTML = meta.title;
    $('[data-pcr-intro-description]', chrome).textContent = meta.description;
    $('[data-pcr-intro-signature]', chrome).innerHTML = meta.signature;
    $('[data-pcr-lexicon-label]', chrome).textContent = meta.lexicon;
    if (!rawProducts(datasetFor(category)).length && !failed[datasetFor(category)]) load(category).catch(() => {});
    if ($('#workspace-sub')) $('#workspace-sub').textContent = meta.subtitle;
    const search = $('#v2-search');
    if (search) { search.placeholder = meta.search; search.setAttribute('aria-label', 'Rechercher Petracer’s · ' + meta.label); }
    // No unverified tariff is presented as available in this collection showcase.
    const badge = $('#workspace-pro-badge'), link = $('#workspace-pro-link');
    if (badge) badge.style.display = 'none';
    if (link) { link.hidden = true; link.style.display = 'none'; }
    const signature = category + ':' + products().map(product => product.id).join('|');
    if (chrome.dataset.signature !== signature) {
      chrome.dataset.signature = signature;
      const families = [...new Set(products().map(familyOf))];
      const tabs = $('.pcr-tabs', chrome);
      tabs.hidden = families.length < 2;
      tabs.innerHTML = '<button type="button" data-pcr-group="">Toutes les ' + esc(meta.noun) + 's</button>' + families.map(family => `<button type="button" data-pcr-group="${esc(family)}">${esc(family)}</button>`).join('');
      $('#pcr-jump', chrome).innerHTML = '<option value="">Accéder à une ' + esc(meta.noun) + '…</option>' + products().slice().sort((a, b) => a.name.localeCompare(b.name, 'fr', {numeric:true})).map(product => `<option value="${esc(product.id)}">${esc(product.name)}</option>`).join('');
      const catalogues = ((category === 'exception' ? window.PETRACER_CATALOGUES : window.PETRACER_BATH_CATALOGUES) || []).filter(catalogue => safe(catalogue.url));
      $('#pcr-catalogue-links', chrome).innerHTML = catalogues.length ? catalogues.map(catalogue => `<a href="${esc(safe(catalogue.url))}" target="_blank" rel="noopener">${esc(catalogue.label || catalogue.title || 'Catalogue Petracer’s')} <span aria-hidden="true">↗</span></a>`).join('') : '<p>Les documents sont accessibles dans les fiches des créations.</p>';
    }
    chrome.querySelectorAll('[data-pcr-group]').forEach(button => button.setAttribute('aria-pressed', String(norm(button.dataset.pcrGroup) === norm(group))));
    const hint = $('#partner-count')?.parentElement?.querySelector('span');
    if (hint) hint.textContent = 'Photographies, détails et documentation des ' + meta.noun + 's';
  }

  function close() {
    if (!dialog?.open) return;
    lightbox?.close();
    dialog.close();
    document.body.style.overflow = previousOverflow;
    if (trigger?.isConnected) trigger.focus?.({preventScroll:true});
  }
  function closeImage() {
    lightbox?.close();
    $('.pcr-main-photo', dialog)?.focus({preventScroll:true});
  }
  function keyboardPhoto(event) {
    if (event.target.closest('input,select,textarea') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      showPhoto(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  }
  function makeDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'pcr-product-dialog';
    dialog.className = 'pcr-dialog';
    dialog.setAttribute('aria-labelledby', 'pcr-product-title');
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('keydown', keyboardPhoto);
    document.body.appendChild(dialog);
  }
  function showPhoto(position) {
    if (!photos.length) return;
    index = (position + photos.length) % photos.length;
    const photo = photos[index], caption = photo.label || active.name;
    const image = $('#pcr-main-image', dialog);
    image.src = safe(photo.url);
    image.alt = caption;
    $('#pcr-image-caption', dialog).textContent = caption;
    $('#pcr-image-count', dialog).textContent = `${index + 1} / ${photos.length}`;
    dialog.querySelectorAll('[data-pcr-photo]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.pcrPhoto) === index)));
    if (lightbox?.open) {
      const largeImage = $('.pcr-lightbox-stage img', lightbox);
      largeImage.src = safe(photo.hd || photo.original || photo.url);
      largeImage.alt = caption;
      $('.pcr-lightbox-label', lightbox).textContent = `${caption} · ${index + 1} / ${photos.length}`;
      $('.pcr-lightbox-stage', lightbox).scrollTo?.(0, 0);
    }
  }
  function openImage() {
    if (!photos.length) return;
    if (!lightbox) {
      lightbox = document.createElement('dialog');
      lightbox.className = 'pcr-lightbox';
      lightbox.setAttribute('aria-label', 'Photographie Petracer’s en plein écran');
      lightbox.innerHTML = '<div class="pcr-lightbox-toolbar"><span class="pcr-lightbox-label" aria-live="polite"></span><button type="button" data-pcr-zoom aria-pressed="false">Zoom ×2</button><button type="button" data-pcr-close-image aria-label="Fermer le plein écran">×</button></div><div class="pcr-lightbox-stage"><img alt="" draggable="false"></div><div class="pcr-lightbox-nav"><button type="button" data-pcr-prev aria-label="Image précédente">←</button><span>Glissez pour explorer</span><button type="button" data-pcr-next aria-label="Image suivante">→</button></div>';
      $('[data-pcr-close-image]', lightbox).onclick = closeImage;
      $('[data-pcr-zoom]', lightbox).onclick = event => {
        const zoomed = lightbox.classList.toggle('pcr-zoomed');
        event.currentTarget.textContent = zoomed ? 'Ajuster' : 'Zoom ×2';
        event.currentTarget.setAttribute('aria-pressed', String(zoomed));
        $('.pcr-lightbox-stage', lightbox).scrollTo?.(0, 0);
      };
      $('[data-pcr-prev]', lightbox).onclick = () => showPhoto(index - 1);
      $('[data-pcr-next]', lightbox).onclick = () => showPhoto(index + 1);
      lightbox.addEventListener('cancel', event => { event.preventDefault(); closeImage(); });
      lightbox.addEventListener('keydown', keyboardPhoto);
      window.LRF_GALLERY_GESTURES?.bind($('.pcr-lightbox-stage', lightbox), {onSwipe:delta => showPhoto(index + delta), isEnabled:() => lightbox.open && photos.length > 1 && !lightbox.classList.contains('pcr-zoomed')});
      document.body.appendChild(lightbox);
    }
    lightbox.dataset.category = category;
    lightbox.classList.remove('pcr-zoomed');
    $('[data-pcr-zoom]', lightbox).textContent = 'Zoom ×2';
    $('[data-pcr-zoom]', lightbox).setAttribute('aria-pressed', 'false');
    lightbox.querySelectorAll('[data-pcr-prev],[data-pcr-next]').forEach(button => { button.hidden = photos.length < 2; });
    $('.pcr-lightbox-nav span', lightbox).hidden = photos.length < 2;
    if (!lightbox.open) lightbox.showModal();
    showPhoto(index);
    $('[data-pcr-close-image]', lightbox).focus({preventScroll:true});
  }
  function catalogueLink(product) {
    const url = safe(product.catalogueUrl);
    if (!url) return '';
    return product.cataloguePage && !url.includes('#') ? url + '#page=' + encodeURIComponent(product.cataloguePage) : url;
  }
  function requestUrl(product) {
    const chosen = product.navCategory || 'exception';
    const isBath = chosen !== 'exception';
    const lines = [`Bonjour,`, '', `Je souhaite des renseignements sur ${isBath ? 'la création' : 'la collection'} Petracer’s ${product.name}.`];
    for (const [key, label] of [['color', 'Coloris souhaité'], ['format', isBath ? 'Dimensions souhaitées' : 'Format souhaité'], ['quantity', isBath ? 'Quantité souhaitée (pièces)' : 'Surface souhaitée (m²)'], ['details', 'Mon projet']]) {
      const value = $('#pcr-choice-' + key, dialog)?.value.trim();
      if (value) lines.push(`${label} : ${value}`);
    }
    lines.push('', `Collection : https://leroyfactory.fr/univers.html?partner=petracers${isBath ? '&category=' + encodeURIComponent(chosen) : ''}&collection=${encodeURIComponent(product.slug || product.id)}`, '', 'Merci de me préciser les possibilités, le tarif et le délai.');
    return 'mailto:jerome@leroyfactory.fr,coryne@leroyfactory.fr?subject=' + encodeURIComponent(`Projet Petracer’s — ${product.name}`) + '&body=' + encodeURIComponent(lines.join('\n'));
  }
  function openCollection(id, from) {
    const product = products().find(entry => entry.id === id || entry.slug === id);
    if (!product) return false;
    makeDialog();
    dialog.dataset.category = category;
    if (!dialog.open) { trigger = from || document.activeElement; previousOverflow = document.body.style.overflow; }
    active = product;
    photos = photosOf(product);
    index = 0;
    const select = (key, label, values) => values?.length ? `<label>${label}<select id="pcr-choice-${key}"><option value="">À préciser</option>${[...new Set(values)].map(value => `<option>${esc(value)}</option>`).join('')}</select></label>` : '';
    const notes = product.technicalNotes || product.details || [];
    const isBath = category !== 'exception', meta = CATEGORIES[category];
    const quantityLabel = isBath ? 'Quantité souhaitée (pièces)' : 'Surface souhaitée (m²)';
    const technicalUrl = safe(product.technicalUrl);
    const technicalPage = product.technicalPages?.[0];
    const links = [[catalogueLink(product), 'Voir dans le catalogue' + (product.cataloguePage ? ' · p. ' + product.cataloguePage : '')], [technicalUrl !== catalogueLink(product) ? technicalUrl : '', 'Détails techniques' + (technicalPage ? ' · p. ' + technicalPage : '')], [safe(product.brochureUrl), 'Brochure de la collection'], [safe(product.sourceUrl), 'Collection sur le site du fabricant']].filter(([url]) => url);
    const uniqueLinks = links.filter(([url], position) => links.findIndex(([other]) => other === url) === position);
    dialog.innerHTML = `<div class="pcr-dialog-head"><span class="pcr-eyebrow">PETRACER’S · ${esc(meta.eyebrow)}</span><button type="button" class="pcr-close" aria-label="Fermer la fiche">×</button></div><div class="pcr-detail"><section class="pcr-gallery" aria-label="Photographies ${esc(product.name)}">${photos.length ? `<div class="pcr-main-stage"><button type="button" class="pcr-main-photo" aria-label="Agrandir la photographie"><img id="pcr-main-image" src="${esc(safe(photos[0].url))}" alt="${esc(product.name)}" draggable="false"><span>Agrandir <span aria-hidden="true">↗</span></span></button>${photos.length > 1 ? '<button type="button" class="pcr-stage-arrow pcr-stage-prev" data-pcr-main-prev aria-label="Image précédente">←</button><button type="button" class="pcr-stage-arrow pcr-stage-next" data-pcr-main-next aria-label="Image suivante">→</button>' : ''}</div><div class="pcr-photo-caption"><span id="pcr-image-caption"></span><span id="pcr-image-count" aria-live="polite"></span></div><div class="pcr-thumbnails" aria-label="Choisir une photographie">${photos.map((photo, position) => `<button type="button" data-pcr-photo="${position}" aria-label="Voir ${esc(photo.label || 'le visuel ' + (position + 1))}" aria-pressed="${position === 0}"><img src="${esc(safe(photo.thumb || photo.url))}" alt="" loading="lazy" width="100" height="80"></button>`).join('')}</div>` : '<p>Découvrez les photographies dans la documentation du fabricant.</p>'}</section><section class="pcr-product-info"><span class="pcr-eyebrow">${esc(familyOf(product))}</span><h2 id="pcr-product-title">${esc(product.name)}</h2><p class="pcr-description">${esc(product.description)}</p>${notes.length ? `<ul class="pcr-technical-notes">${notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul>` : ''}<dl class="pcr-specs">${[[isBath ? 'Dimensions' : 'Formats', product.formats], ['Couleurs', product.colors], ['Finitions', product.finishes], ['Épaisseurs', product.thicknesses]].filter(([, values]) => values?.length).map(([label, values]) => `<div><dt>${label}</dt><dd>${esc(values.join(' · '))}</dd></div>`).join('')}</dl>${uniqueLinks.length ? `<div class="pcr-detail-links">${uniqueLinks.map(([url, label]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>` : ''}<div class="pcr-choice"><h3>Imaginons votre projet</h3>${select('color', 'Coloris souhaité', product.colors)}${select('format', isBath ? 'Dimensions souhaitées' : 'Format souhaité', product.formats)}<label>${quantityLabel}<input id="pcr-choice-quantity" type="number" min="${isBath ? '1' : '0.01'}" step="${isBath ? '1' : '0.01'}" inputmode="${isBath ? 'numeric' : 'decimal'}" placeholder="À préciser"></label><label class="pcr-wide">Votre projet<input id="pcr-choice-details" type="text" maxlength="500" placeholder="Pièce, décor, dimensions…"></label><a id="pcr-request-link" class="pcr-primary" href="#">Demander conseil sur cette ${esc(meta.noun)} <span aria-hidden="true">→</span></a><p class="pcr-choice-note">Prépare un e-mail à Jérôme et Coryne avec votre sélection. ${esc(product.availabilityNote || 'Formats, associations et disponibilité seront précisés avec l’agence.')}</p></div></section></div>`;
    $('.pcr-close', dialog).onclick = close;
    $('.pcr-main-photo', dialog)?.addEventListener('click', openImage);
    $('[data-pcr-main-prev]', dialog)?.addEventListener('click', () => showPhoto(index - 1));
    $('[data-pcr-main-next]', dialog)?.addEventListener('click', () => showPhoto(index + 1));
    window.LRF_GALLERY_GESTURES?.bind($('.pcr-main-photo', dialog), {onSwipe:delta => showPhoto(index + delta), isEnabled:() => dialog.open && photos.length > 1});
    dialog.querySelectorAll('[data-pcr-photo]').forEach(button => { button.onclick = () => showPhoto(Number(button.dataset.pcrPhoto)); });
    const updateRequest = () => { $('#pcr-request-link', dialog).href = requestUrl(product); };
    dialog.querySelectorAll('.pcr-choice input,.pcr-choice select').forEach(input => { input.addEventListener('input', updateRequest); input.addEventListener('change', updateRequest); });
    updateRequest();
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    if (photos.length) showPhoto(0);
    $('.pcr-close', dialog).focus({preventScroll:true});
    return true;
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-pcr-retry]')) { failed[datasetFor(category)] = false; load(category).catch(() => {}); notify('filter-change', {category}); }
    if (event.target.closest('[data-pcr-reset]')) { group = ''; resetFilters(); refreshChrome(); }
  });
  window.addEventListener('lrf-pro-session-changed', refreshChrome);
  if (typeof MutationObserver !== 'undefined' && $('#workspace-title')) new MutationObserver(() => { if (chrome) refreshChrome(); }).observe($('#workspace-title'), {childList:true, characterData:true, subtree:true});
  window.LRF_PETRACER_LOAD = load;
  window.LRF_PETRACER_SELECTION = Object.freeze({setCategory, normaliseProducts, matches, renderCards, refreshChrome, openCollection});
})();
