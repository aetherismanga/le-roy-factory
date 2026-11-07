(() => {
  'use strict';
  const S = window.LRF_ELIOS_POSE_V2;
  if (!S) return;
  const { $, state } = S;
  const previous = { renderSelection: S.renderSelection, renderPattern: S.renderPattern, pattern: S.pattern };
  const jobs = new Map(), loaded = new Map(), drafts = new Map();
  let data, templates = [], hover, modal, activeCanvas, renderReady = Promise.resolve();
  let previewStatus = { state: 'idle', message: '' };
  S.segmentoReady = false;
  const esc = S.esc;
  const core = () => window.LRF_ELIOS_POSE_DESIGNS;
  const colorFor = id => data.colors.find(color => color.id === id);
  const imageURL = color => color.preview || color.faces?.[0];
  const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mode = () => state.segmentoMode === 'lrf' ? 'lrf' : 'elios';
  function base() {
    if (mode() === 'lrf') {
      const found = templates.find(item => item.id === state.segmentoTemplate) || templates[0];
      if (!found) throw new Error('Les créations LRF sont indisponibles.');
      state.segmentoTemplate = found.id;
      return found;
    }
    let found = data.compositions.find(item => item.id === state.segmentoComposition && item.patternId === state.pattern);
    if (!found) found = data.compositions.find(item => item.patternId === state.pattern);
    if (!found) throw new Error('Composition Segmento inconnue.');
    state.segmentoComposition = found.id;
    return found;
  }
  const draftKey = item => mode() + ':' + item.id;
  function draftFor(item = base()) {
    const key = draftKey(item);
    if (!drafts.has(key)) drafts.set(key, { mapping: {}, rotation: 0, active: false, expanded: mode() === 'lrf', role: null, palette: null });
    return drafts.get(key);
  }
  function roles(item = base()) {
    if (core()?.roles) return core().roles(data, item);
    return [...new Set(item.tiles.map(tile => tile.color))].map(id => ({ id, color: id, label: colorFor(id).label, count: item.tiles.filter(tile => tile.color === id).length }));
  }
  function current() {
    const item = base(), draft = draftFor(item);
    if (mode() === 'lrf' || draft.active) {
      if (!core()?.compose) throw new Error('La personnalisation est indisponible.');
      return core().compose(data, item, { mapping: draft.mapping, rotation: draft.rotation });
    }
    return item;
  }
  function rows() {
    const composition = current(), counts = new Map();
    for (const tile of composition.tiles) counts.set(tile.color, (counts.get(tile.color) || 0) + 1);
    return [...counts].map(([id, count]) => {
      const color = colorFor(id);
      if (!color) throw new Error('Référence Segmento inconnue : ' + id);
      return { series: 'Segmento', color: color.label, ref: color.ref, key: '15x15', label: '15 × 15 cm', share: count / composition.tiles.length * 100, pcs: data.packaging.pieces, boxM2: data.packaging.area, finish: 'R9 · 8,5 mm' };
    });
  }
  function imageFor(color) {
    const url = imageURL(color);
    if (!jobs.has(url)) jobs.set(url, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { loaded.set(url, image); resolve(image); };
      image.onerror = () => { jobs.delete(url); reject(new Error('Visuel indisponible : ' + color.label)); };
      image.src = url;
    }));
    return jobs.get(url);
  }
  function draw(canvas, composition, size) {
    const context = canvas.getContext('2d');
    canvas.width = canvas.height = size;
    context.fillStyle = '#e9e2d7'; context.fillRect(0, 0, size, size);
    const width = size / composition.columns, height = size / composition.rows;
    const gap = Math.max(.5, Math.min(width, height) * 2 / 150);
    for (const tile of composition.tiles) {
      const image = loaded.get(imageURL(colorFor(tile.color)));
      if (!image) return false;
      context.save();
      context.translate((tile.col + .5) * width, (tile.row + .5) * height);
      context.rotate((tile.rotation || 0) * Math.PI / 180);
      context.drawImage(image, -width / 2 + gap / 2, -height / 2 + gap / 2, width - gap, height - gap);
      context.restore();
    }
    return true;
  }
  function visual(composition, size) {
    if (composition.preview && composition.origin !== 'lrf') {
      const image = document.createElement('img');
      image.src = composition.preview; image.alt = composition.label || composition.id;
      image.loading = size >= 600 ? 'eager' : 'lazy'; image.decoding = 'async';
      image.className = 'ep-segmento-preview';
      image.onerror = () => image.replaceWith(visual({ ...composition, preview: null }, size));
      return image;
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', composition.label || composition.id);
    const paint = () => { if (canvas.isConnected) draw(canvas, composition, size); };
    if ([...new Set(composition.tiles.map(tile => tile.color))].every(id => loaded.has(imageURL(colorFor(id))))) draw(canvas, composition, size);
    else Promise.all([...new Set(composition.tiles.map(tile => tile.color))].map(id => imageFor(colorFor(id)))).then(paint).catch(error => {
      if (canvas.isConnected) canvas.replaceWith(Object.assign(document.createElement('p'), { textContent: error.message }));
    });
    return canvas;
  }
  function ready() { return renderReady; }
  function watchReady(selected, element) {
    const status = { state: 'loading', message: 'Chargement de l’aperçu…' }; previewStatus = status;
    let job;
    if (!selected.preview || selected.origin === 'lrf') {
      job = Promise.all([...new Set(selected.tiles.map(tile => tile.color))].map(id => imageFor(colorFor(id)))).then(() => {
        if (activeCanvas?.canvas?.isConnected && activeCanvas.composition.id === selected.id) draw(activeCanvas.canvas, selected, 720);
      });
    } else if (element?.tagName === 'IMG' && typeof element.complete === 'boolean' && !element.complete) {
      job = new Promise((resolve, reject) => {
        const clean = () => { element.removeEventListener('load', success); element.removeEventListener('error', failure); };
        const success = () => { clean(); resolve(); };
        const failure = () => { clean(); reject(new Error('L’aperçu officiel est indisponible.')); };
        element.addEventListener('load', success); element.addEventListener('error', failure);
      });
    } else job = element?.tagName === 'IMG' && element.complete && element.naturalWidth === 0 ? Promise.reject(new Error('L’aperçu officiel est indisponible.')) : Promise.resolve();
    renderReady = job.then(() => { status.state = 'ready'; status.message = 'Aperçu prêt à imprimer.'; return selected; }, error => { status.state = 'error'; status.message = error.message || 'L’aperçu est indisponible.'; throw error; });
    // The inline status and print action consume this rejection; it must also
    // remain handled when the user simply browses past a failed image.
    renderReady.catch(() => {});
  }
  function closeHover() { hover?.remove(); hover = null; }
  function preview(composition, opener) {
    modal?.close(); closeHover();
    const overlay = document.createElement('div'); overlay.className = 'ep-segmento-lightbox';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', composition.label);
    const panel = document.createElement('div'); panel.className = 'ep-segmento-lightbox-panel';
    const title = document.createElement('b'); title.textContent = composition.label;
    const close = document.createElement('button'); close.type = 'button'; close.className = 'ep-segmento-close'; close.textContent = 'Fermer';
    panel.append(close, title, visual(composition, 960)); overlay.append(panel);
    const overflow = document.body.style.overflow;
    const keydown = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(); } else if (event.key === 'Tab') { event.preventDefault(); close.focus(); } };
    const finish = () => { document.removeEventListener('keydown', keydown); overlay.remove(); document.body.style.overflow = overflow; modal = null; if (opener?.isConnected) opener.focus(); };
    close.onclick = finish; overlay.onclick = event => { if (event.target === overlay) finish(); };
    document.body.append(overlay); document.body.style.overflow = 'hidden'; document.addEventListener('keydown', keydown);
    modal = { close: finish }; close.focus();
  }
  function attachPreview(element, composition) {
    const show = () => {
      if (!window.matchMedia?.('(hover: hover)').matches || window.innerWidth < 760) return;
      closeHover(); hover = document.createElement('div'); hover.className = 'ep-segmento-hover'; hover.setAttribute('aria-hidden', 'true');
      hover.append(visual(composition, 420)); const label = document.createElement('b'); label.textContent = composition.label; hover.append(label);
      document.body.append(hover);
      const rect = element.getBoundingClientRect(), width = Math.min(300, window.innerWidth - 24);
      hover.style.width = width + 'px'; hover.style.left = Math.max(12, Math.min(rect.right + 12, window.innerWidth - width - 12)) + 'px';
      hover.style.top = Math.max(12, Math.min(rect.top, window.innerHeight - width - 76)) + 'px';
    };
    element.onmouseenter = show; element.onmouseleave = closeHover; element.onfocus = show; element.onblur = closeHover;
  }
  function button(text, action, className = '') {
    const element = document.createElement('button'); element.type = 'button'; element.className = className; element.textContent = text; element.dataset.segmentoFocus = className.split(' ')[0] + ':' + text; element.onclick = action; return element;
  }
  function card(composition, label, detail, selected, action, patternId) {
    const container = document.createElement('div');
    container.className = (patternId ? 'ep-pattern' : 'ep-segmento-composition') + (selected ? ' active' : '');
    if (patternId) container.dataset.pattern = patternId;
    container.dataset.origin = composition.origin || 'elios'; container.dataset.poseOrigin = container.dataset.origin; container.dataset.composition = composition.id;
    const picture = document.createElement('div'); picture.className = 'ep-official-ready ep-segmento-card-image';
    const enlarge = button('', () => preview(composition, enlarge), 'ep-segmento-card-photo');
    enlarge.dataset.segmentoFocus = 'photo:' + composition.id; enlarge.setAttribute('aria-label', 'Agrandir ' + label); enlarge.append(visual(composition, 220)); attachPreview(enlarge, composition); picture.append(enlarge);
    const choose = button('', action, 'ep-segmento-card-choice'); choose.dataset.segmentoFocus = 'choose:' + composition.id; choose.setAttribute('aria-pressed', String(selected));
    const name = document.createElement('b'); name.textContent = label; const note = document.createElement('small'); note.textContent = detail;
    choose.append(name, note); attachPreview(choose, composition); container.append(picture, choose); return container;
  }
  function matches(composition) {
    const ids = [...new Set(composition.tiles.map(tile => tile.color))];
    if (state.segmentoFilterColor && !ids.includes(state.segmentoFilterColor)) return false;
    const terms = normalized(state.segmentoQuery).split(/\s+/).filter(Boolean);
    const motif = composition.patternId?.match(/^S(\d+)$/)?.[1];
    const haystack = normalized([composition.id, composition.label, motif ? 'motif ' + motif + ' motif' + motif : '', ...ids.flatMap(id => { const color = colorFor(id); return [color.label, color.ref]; })].join(' '));
    return terms.every(term => haystack.includes(term));
  }
  function updateDraft(change) { Object.assign(draftFor(), change, { active: true, expanded: true }); render(); }
  function colorCard(color, selected, action) {
    const item = document.createElement('div'); item.className = 'ep-segmento-color' + (selected ? ' active' : ''); item.dataset.color = color.id;
    const photo = button('', () => preview({ id: color.id, label: color.label + ' · ' + color.ref, preview: imageURL(color), origin: 'elios' }, photo), 'ep-segmento-swatch-photo');
    const image = document.createElement('img'); image.src = imageURL(color); image.alt = color.label; image.loading = 'lazy'; image.decoding = 'async'; photo.append(image);
    const sample = { id: color.id, label: color.label + ' · ' + color.ref, preview: imageURL(color), origin: 'elios' }; attachPreview(photo, sample);
    const choose = button('', action, 'ep-segmento-swatch-choice'); choose.dataset.segmentoFocus = 'color:' + color.id; choose.setAttribute('aria-pressed', String(selected));
    const name = document.createElement('b'); name.textContent = color.label; const ref = document.createElement('small'); ref.textContent = color.ref; choose.append(name, ref);
    attachPreview(choose, sample); item.append(photo, choose); return item;
  }
  function customizer(parent, item) {
    if (!core()?.compose) return;
    const draft = draftFor(item), slots = roles(item), section = document.createElement('details');
    section.className = 'ep-segmento-customizer'; section.open = draft.expanded || draft.active;
    const summary = document.createElement('summary'); summary.textContent = 'Personnaliser les couleurs'; section.append(summary);
    section.ontoggle = () => { draft.expanded = section.open; };
    const help = document.createElement('p'); help.textContent = 'Choisissez un repère puis un carreau. Le dessin et les quantités suivent vos références.'; section.append(help);
    const tabs = document.createElement('div'); tabs.className = 'ep-segmento-roles';
    if (!slots.some(slot => slot.id === draft.role)) draft.role = slots[0].id;
    for (const [index, slot] of slots.entries()) {
      const color = colorFor(draft.mapping[slot.id] || slot.color || slot.id);
      const tab = button('', () => { draft.role = slot.id; draft.expanded = true; render(); }, 'ep-segmento-role' + (draft.role === slot.id ? ' active' : ''));
      tab.dataset.segmentoFocus = 'role:' + slot.id; tab.setAttribute('aria-pressed', String(draft.role === slot.id));
      const image = document.createElement('img'); image.src = imageURL(color); image.alt = ''; const text = document.createElement('span'); text.textContent = String.fromCharCode(65 + index) + ' · ' + color.label; tab.append(image, text); tabs.append(tab);
    }
    section.append(tabs);
    const options = document.createElement('div'); options.className = 'ep-segmento-colors';
    const active = slots.find(slot => slot.id === draft.role), chosen = draft.mapping[active.id] || active.color || active.id;
    for (const color of data.colors) options.append(colorCard(color, color.id === chosen, () => updateDraft({ mapping: { ...draft.mapping, [active.id]: color.id }, palette: null })));
    section.append(options);
    const paletteTitle = document.createElement('b'); paletteTitle.className = 'ep-segmento-subtitle'; paletteTitle.textContent = 'Essayer une harmonie'; section.append(paletteTitle);
    const palettes = document.createElement('div'); palettes.className = 'ep-segmento-palettes';
    for (const palette of core().palettes(data)) {
      const choose = button('', () => updateDraft({ mapping: Object.fromEntries(slots.map((slot, index) => [slot.id, palette.colors[index % palette.colors.length]])), palette: palette.id }), 'ep-segmento-palette-choice' + (draft.palette === palette.id ? ' active' : ''));
      choose.dataset.segmentoFocus = 'palette:' + palette.id; choose.setAttribute('aria-pressed', String(draft.palette === palette.id)); const strip = document.createElement('span');
      for (const id of palette.colors.slice(0, slots.length)) { const image = document.createElement('img'); image.src = imageURL(colorFor(id)); image.alt = ''; image.loading = 'lazy'; strip.append(image); }
      const label = document.createElement('b'); label.textContent = palette.label; choose.append(strip, label); palettes.append(choose);
    }
    section.append(palettes); parent.append(section);
  }
  function render() {
    if (!data) return;
    modal?.close(); closeHover();
    if (state.group !== 'segmento') {
      S.root.classList?.remove('ep-segmento-mode');
      $('#ep-composition-controls').classList.remove('ep-segmento-compositions');
      $('#ep-composition-section .ep-step b').textContent = 'Composition couleurs';
      $('#ep-composition-section .ep-step small').textContent = 'Choisissez la couleur affectée à chaque repère du schéma.';
      return previous.renderSelection();
    }
    S.root.classList?.add('ep-segmento-mode');
    if (!data.patterns.some(item => item.id === state.pattern)) state.pattern = data.patterns[0].id;
    const item = base(), selected = current(), draft = draftFor(item);
    const focused = document.activeElement?.id, focusedControl = document.activeElement?.dataset?.segmentoFocus, caret = document.activeElement?.selectionStart;
    const products = $('#ep-product-controls'); products.replaceChildren();
    const modes = document.createElement('div'); modes.className = 'ep-segmento-modes';
    for (const [value, label] of [['elios', 'Compositions Elios'], ['lrf', 'Créations LRF']]) {
      const choice = button(label, () => { state.segmentoMode = value; state.segmentoQuery = ''; state.segmentoFilterColor = ''; state.segmentoShowAll = false; render(); }, 'ep-segmento-mode-button' + (mode() === value ? ' active' : ''));
      choice.setAttribute('aria-pressed', String(mode() === value)); choice.disabled = value === 'lrf' && !templates.length; modes.append(choice);
    }
    products.append(modes);
    const description = document.createElement('p'); description.className = 'ep-segmento-description';
    description.textContent = mode() === 'elios' ? '48 compositions du fabricant · 12 motifs · 16 références' : 'Dessins créés par LRF avec les 16 carreaux Segmento. Personnalisez leurs harmonies.'; products.append(description);
    const filters = document.createElement('div'); filters.className = 'ep-segmento-filters';
    const searchLabel = document.createElement('label'); searchLabel.textContent = 'Rechercher'; const search = document.createElement('input'); search.id = 'ep-segmento-search'; search.type = 'search'; search.placeholder = 'Motif, couleur, référence…'; search.value = state.segmentoQuery || '';
    search.oninput = () => { state.segmentoQuery = search.value; state.segmentoShowAll = true; render(); }; searchLabel.append(search);
    const colorLabel = document.createElement('label'); colorLabel.textContent = 'Couleur présente'; const filter = document.createElement('select'); filter.id = 'ep-segmento-filter-color';
    filter.innerHTML = '<option value="">Toutes les couleurs</option>' + data.colors.map(color => '<option value="' + esc(color.id) + '">' + esc(color.label + ' · ' + color.ref) + '</option>').join('');
    filter.value = state.segmentoFilterColor || ''; filter.onchange = () => { state.segmentoFilterColor = filter.value; state.segmentoShowAll = true; render(); }; colorLabel.append(filter); filters.append(searchLabel, colorLabel); products.append(filters);
    if (state.segmentoQuery || state.segmentoFilterColor) products.append(button('Effacer les filtres', () => { state.segmentoQuery = ''; state.segmentoFilterColor = ''; state.segmentoShowAll = false; render(); }, 'ep-segmento-reset-filter'));
    const grid = $('#ep-pattern-grid'); grid.replaceChildren();
    const eligible = mode() === 'lrf' ? templates.filter(matches).map(template => ({ template })) : data.patterns.map(pattern => ({ pattern, variants: data.compositions.filter(composition => composition.patternId === pattern.id && matches(composition)) })).filter(entry => entry.variants.length);
    const mobileLimit = window.innerWidth <= 640 && !state.segmentoShowAll ? 6 : eligible.length;
    for (const entry of eligible.slice(0, mobileLimit)) {
      if (entry.template) {
        const template = entry.template;
        grid.append(card(template, template.label.replace(/^Création LRF\s*[·—-]?\s*/, ''), 'Création LRF · couleurs libres', item.id === template.id, () => { state.segmentoTemplate = template.id; render(); }, template.id));
      } else {
        const { pattern, variants } = entry, representative = variants.find(variant => variant.id === state.segmentoComposition) || variants[0];
        grid.append(card(representative, pattern.label.replace('Segmento Pattern ', 'Motif '), variants.length + ' composition' + (variants.length > 1 ? 's' : ''), pattern.id === state.pattern, () => { state.pattern = pattern.id; state.segmentoComposition = representative.id; render(); }, pattern.id));
      }
    }
    if (eligible.length > mobileLimit) grid.append(button('Voir les ' + eligible.length + ' dessins', () => { state.segmentoShowAll = true; render(); }, 'ep-segmento-show-all'));
    if (!eligible.length) { const empty = document.createElement('p'); empty.className = 'ep-segmento-empty'; empty.textContent = 'Aucun dessin ne correspond. Effacez un filtre pour élargir votre recherche.'; grid.append(empty); }
    $('#ep-compatible-note').textContent = eligible.length + (mode() === 'lrf' ? ' créations LRF' : ' motifs Elios') + ' · touchez une photo pour l’agrandir, son nom pour choisir.';
    $('#ep-preview-title').textContent = selected.label;
    $('#ep-preview-badge').textContent = selected.origin === 'lrf' ? 'CRÉATION LRF' : 'ELIOS · OFFICIEL';
    const large = $('#ep-preview'); large.classList.add('ep-official-ready'); large.dataset.origin = selected.origin || 'elios'; large.dataset.poseOrigin = large.dataset.origin; large.replaceChildren(visual(selected, 720));
    activeCanvas = selected.preview && selected.origin !== 'lrf' ? null : { canvas: large.firstElementChild, composition: selected };
    watchReady(selected, large.firstElementChild);
    const enlarge = button('Agrandir l’aperçu', () => preview(selected, enlarge), 'ep-segmento-enlarge'); large.append(enlarge);
    const shares = rows(); $('#ep-ratios').innerHTML = shares.map(row => '<span>' + esc(row.color) + ' <b>' + S.fr(row.share, 1) + ' %</b></span>').join('');
    $('#ep-composition-section').hidden = false; $('#ep-surface-step').textContent = '4';
    $('#ep-composition-section .ep-step b').textContent = mode() === 'elios' ? 'Composition et couleurs' : 'Votre création';
    $('#ep-composition-section .ep-step small').textContent = selected.origin === 'lrf' ? 'Création LRF · les références et les boîtes suivent votre dessin.' : 'Choisissez une composition Elios ou personnalisez ses couleurs.';
    const controls = $('#ep-composition-controls'); controls.classList.add('ep-segmento-compositions'); controls.replaceChildren();
    if (mode() === 'elios') {
      const variants = data.compositions.filter(composition => composition.patternId === state.pattern && matches(composition));
      const list = document.createElement('div'); list.className = 'ep-segmento-official-variants';
      for (const composition of variants) list.append(card(composition, 'Composition ' + composition.id.split('-').pop(), [...new Set(composition.tiles.map(tile => colorFor(tile.color).label))].join(' · '), composition.id === item.id && !draft.active, () => { state.segmentoComposition = composition.id; render(); }));
      if (!variants.length) { const note = document.createElement('p'); note.textContent = 'Le dessin choisi reste affiché. Choisissez un motif parmi les résultats pour changer de composition.'; list.append(note); }
      controls.append(list);
    }
    const actions = document.createElement('div'); actions.className = 'ep-segmento-edit-actions';
    actions.append(button('Tourner de 90°', () => updateDraft({ rotation: (draft.rotation + 90) % 360 }), 'ep-segmento-rotate'));
    if (draft.active) actions.append(button(mode() === 'elios' ? 'Revenir à la composition Elios' : 'Rétablir les couleurs du dessin', () => { drafts.delete(draftKey(item)); render(); }, 'ep-segmento-reset'));
    controls.append(actions); customizer(controls, item);
    const specification = document.createElement('details'); specification.className = 'ep-segmento-spec'; specification.innerHTML = '<summary>Carreau et conditionnement</summary><p>Segmento · 15 × 15 cm · grès cérame R9 · 8,5 mm<br>46 pièces / boîte · 1,04 m² · 18 kg · joint minimum 2 mm</p>'; controls.append(specification);
    if (focused === search.id) { search.focus(); if (typeof caret === 'number') search.setSelectionRange?.(caret, caret); }
    else if (focused === filter.id) filter.focus();
    else if (focusedControl) { const target = [...S.root.querySelectorAll('[data-segmento-focus]')].find(element => element.dataset.segmentoFocus === focusedControl); (target || enlarge).focus(); }
    S.calculate();
  }
  if (!document.getElementById?.('elios-pose-segmento-css')) { const link = document.createElement('link'); link.id = 'elios-pose-segmento-css'; link.rel = 'stylesheet'; link.href = 'assets/css/elios-pose-segmento.css?v=20261107-creations1'; document.head.append(link); }
  window.addEventListener?.('beforeprint', () => { modal?.close(); closeHover(); if (activeCanvas?.canvas?.isConnected) draw(activeCanvas.canvas, activeCanvas.composition, 720); });
  fetch('assets/data/elios-segmento.json?v=20261107-2').then(response => {
    if (!response.ok) throw new Error('Chargement Segmento impossible.'); return response.json();
  }).then(result => {
    if (!Array.isArray(result.colors) || result.colors.length !== 16 || !Array.isArray(result.compositions) || result.compositions.length !== 48) throw new Error('Données Segmento incomplètes.');
    data = result; templates = core()?.templates(data) || [];
    window.LRF_ELIOS_SEGMENTO = { data, render, current, rows, base, roles, preview, ready, status: () => ({ ...previewStatus }) };
    S.segmentoRows = rows; S.segmentoPreviewReady = ready;
    S.pattern = () => state.group === 'segmento' ? { ...previous.pattern(), id: current().id, label: current().label, origin: current().origin || 'elios', sourceComposition: base().id } : previous.pattern();
    S.renderSelection = render;
    S.renderPattern = () => state.group === 'segmento' ? render() : previous.renderPattern();
    S.segmentoReady = true;
    if (new URLSearchParams(location.search).get('collection') === 'segmento') { state.group = 'segmento'; state.pattern = data.patterns[0].id; }
    if (state.group === 'segmento') S.renderAll();
  }).catch(error => {
    S.segmentoReady = false; console.error(error);
    const notice = document.createElement('p'); notice.className = 'ep-segmento-error'; notice.textContent = 'Segmento n’a pas pu être chargé. Actualisez la page pour réessayer.'; S.root.prepend(notice); S.calculate?.();
  });
})();
