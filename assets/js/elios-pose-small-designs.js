/* Physical rectangular-tile studies. Manufacturer references and packs stay in
   ELIOS_POSE_V1; these additional arrangements are expressly LRF creations. */
(() => {
  'use strict';
  const LAYOUTS = [
    { id: 'aligned-h', label: 'Alignée horizontale', offset: 0, vertical: false, colors: 'columns' },
    { id: 'aligned-v', label: 'Alignée verticale', offset: 0, vertical: true, colors: 'columns' },
    { id: 'half-h', label: 'Décalée ½ horizontale', offset: .5, vertical: false, colors: 'rows' },
    { id: 'half-v', label: 'Décalée ½ verticale', offset: .5, vertical: true, colors: 'rows' },
    { id: 'third-h', label: 'Décalée ⅓ horizontale', offset: 1 / 3, vertical: false, colors: 'checker' },
    { id: 'third-v', label: 'Décalée ⅓ verticale', offset: 1 / 3, vertical: true, colors: 'checker' },
    { id: 'bands-h', label: 'Bandes horizontales', offset: 0, vertical: false, colors: 'rows' },
    { id: 'checker-v', label: 'Damier vertical', offset: 0, vertical: true, colors: 'checker' },
  ];
  const slug = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const parity = value => ((value % 2) + 2) % 2;
  function generateGeometry(format, layoutId) {
    const dimensions = String(format).split('x').map(Number), style = LAYOUTS.find(layout => layout.id === layoutId);
    if (dimensions.length !== 2 || dimensions.some(value => !Number.isFinite(value) || value <= 0) || !style) throw new Error('Pose ou format rectangulaire inconnu.');
    const short = Math.min(...dimensions), long = Math.max(...dimensions), columns = 2;
    // The manufacturer limits rectangular offsets to 10–15 cm. A half of
    // 45 cm would exceed that recommendation: use 10 cm (2/9) instead.
    // Its nine phases and the two colour roles close on an 18-row period.
    const offsetFraction = long === 45 && style.offset === .5 ? 2 / 9 : style.offset, periodRows = long === 45 && style.offset === .5 ? 18 : 6;
    const rows = Math.max(periodRows, Math.round((columns * long / short) / periodRows) * periodRows), width = columns * long, height = rows * short, tiles = [];
    for (let row = 0; row < rows; row++) {
      const offset = ((row * offsetFraction) % 1) * long;
      for (let col = -1; col < columns; col++) {
        const fullX = col * long + offset, left = Math.max(0, fullX), right = Math.min(width, fullX + long);
        if (right - left < 1e-8) continue;
        const role = style.colors === 'rows' ? parity(row) : style.colors === 'checker' ? parity(row + col) : parity(col);
        const tile = { x: left, y: row * short, width: right - left, height: short, fullX, fullY: row * short, fullWidth: long, fullHeight: short, role, rotation: 0 };
        if (style.vertical) {
          Object.assign(tile, { x: height - tile.y - tile.height, y: left, width: short, height: right - left, fullX: height - tile.fullY - short, fullY: fullX, fullWidth: short, fullHeight: long, rotation: 90 });
        }
        tiles.push(tile);
      }
    }
    return { width: style.vertical ? height : width, height: style.vertical ? width : height, tiles, format, layoutId, rows, columns, offsetFraction, offsetCm: long * offsetFraction, periodRows };
  }
  function labelForFormat(format, style) {
    const long = Math.max(...String(format).split('x').map(Number));
    return long === 45 && style.offset === .5 ? 'Décalée 10 cm ' + (style.vertical ? 'verticale' : 'horizontale') : style.label;
  }
  function shares(geometry) {
    const areas = [0, 0];
    for (const tile of geometry.tiles) areas[tile.role] += tile.width * tile.height;
    const sum = geometry.width * geometry.height;
    if (!(sum > 0) || Math.abs(areas[0] + areas[1] - sum) > sum * 1e-8) throw new Error('Le module de pose est incomplet.');
    return areas.map(area => area / sum * 100);
  }
  function rowsFor(family, config, layoutId) {
    if (!family?.colors?.length || !['single', 'duo'].includes(config?.mode)) throw new Error('Choisissez une palette de la collection.');
    const primary = family.colors.find(color => color.color === config.primary), secondary = config.mode === 'single' ? primary : family.colors.find(color => color.color === config.secondary);
    if (!primary?.ref || !secondary?.ref) throw new Error('Cette référence ne fait pas partie de la collection sélectionnée.');
    const proportions = shares(generateGeometry(family.format, layoutId)), grouped = new Map();
    [primary, secondary].forEach((color, index) => {
      const key = color.ref + '|' + family.format, existing = grouped.get(key);
      if (existing) existing.share += proportions[index];
      else grouped.set(key, { share: proportions[index], series: family.series, color: color.color, key: family.format, label: family.formatLabel, ref: color.ref, pcs: family.pcs, boxM2: family.boxM2, finish: family.finish || '' });
    });
    return [...grouped.values()];
  }
  function mediaFor(family, color) {
    const entries = window.ELIOS_COLOR_MEDIA?.variants?.[slug(family?.series)]?.[color] || [];
    // Tacca and native catalogue samples are actual named colour samples.
    // An ambience photograph must not be cropped and sold as another tile face.
    const source = entries.find(url => /catalogue-native|tacca|_zoom|_600\./i.test(url) && !/ambien|_amb\b/i.test(url));
    if (!source) return '';
    return window.ELIOS_COLOR_MEDIA?.assets?.[source]?.thumb || source;
  }
  const API = window.LRF_ELIOS_SMALL_DESIGNS = { layouts: LAYOUTS, generateGeometry, shares, rowsFor, mediaFor, labelForFormat };
  const S = window.LRF_ELIOS_POSE_V2;
  if (!S) return;
  const { D, $, $$, state } = S, images = new Map();
  let activeSeries = '', lastPreviewJob = Promise.resolve();
  state.smallDesigns ||= {};
  for (const format of [...new Set(S.smallFamilies.map(family => family.format))]) {
    for (const style of LAYOUTS) {
      const id = 'LRF-R-' + format + '-' + style.id;
      if (!D.patterns.some(pattern => pattern.id === id)) D.patterns.push({ id, group: 'small', parts: [[format, 100]], label: 'Création LRF · ' + labelForFormat(format, style), origin: 'lrf', smallLayout: style.id });
    }
  }
  const active = () => state.group === 'small' && S.pattern()?.origin === 'lrf' && !!S.pattern()?.smallLayout;
  function design() {
    const family = S.small(), saved = state.smallDesigns[family.series], switched = activeSeries !== family.series;
    if (!saved) state.smallDesigns[family.series] = { series: family.series, mode: 'duo', primary: family.colors.some(color => color.color === state.smallColor) ? state.smallColor : family.colors[0].color, secondary: family.colors[1]?.color || family.colors[0].color };
    const chosen = state.smallDesigns[family.series], valid = family.colors.some(color => color.color === state.smallColor);
    // The existing product gallery writes smallColor. Reconcile that entry
    // with our palette, while restoring a collection's saved palette on return.
    if (!switched && valid && state.smallColor !== chosen._mainColor) chosen.primary = state.smallColor;
    state.smallColor = chosen.primary;chosen._mainColor = chosen.primary;activeSeries = family.series;
    state.smallDesign = chosen;
    return chosen;
  }
  S.smallRows = () => active() ? rowsFor(S.small(), design(), S.pattern().smallLayout) : undefined;
  function imageFor(url) {
    if (!url) return Promise.resolve(null);
    if (!images.has(url)) images.set(url, new Promise(resolve => {
      const image = new Image();let finished = false, timer;
      const finish = value => { if (finished) return;finished = true;if (timer && typeof clearTimeout === 'function') clearTimeout(timer);resolve(value); };
      image.onload = () => finish(image);image.onerror = () => finish(null);
      if (typeof setTimeout === 'function') timer = setTimeout(() => finish(null), 15000);
      image.src = url;
    }));
    return images.get(url);
  }
  function drawCover(ctx, image, tile, gap) {
    ctx.save();ctx.beginPath();ctx.rect(tile.x, tile.y, tile.width, tile.height);ctx.clip();
    const w = tile.rotation ? tile.fullHeight : tile.fullWidth, h = tile.rotation ? tile.fullWidth : tile.fullHeight;
    ctx.translate(tile.fullX + tile.fullWidth / 2, tile.fullY + tile.fullHeight / 2);ctx.rotate(tile.rotation * Math.PI / 180);
    const ratio = w / h, sourceRatio = image.naturalWidth / image.naturalHeight;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
    if (sourceRatio > ratio) { sw = sh * ratio; sx = (image.naturalWidth - sw) / 2; }
    else { sh = sw / ratio; sy = (image.naturalHeight - sh) / 2; }
    ctx.drawImage(image, sx, sy, sw, sh, -w / 2 + gap / 2, -h / 2 + gap / 2, w - gap, h - gap);ctx.restore();
  }
  async function paint(canvas, family, config, pattern, size) {
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), gap = family.series === 'Tropical' ? .3 : .2, geometry = generateGeometry(family.format, pattern.smallLayout), chosen = [config.primary, config.mode === 'single' ? config.primary : config.secondary], sources = chosen.map(color => mediaFor(family, color));
    ctx.fillStyle = '#fffdf8';ctx.fillRect(0, 0, size, size);
    const loaded = await Promise.all(sources.map(imageFor));
    if (!canvas.isConnected) return;
    const scale = (size - 8) / Math.max(geometry.width, geometry.height);
    ctx.save();ctx.translate((size - geometry.width * scale) / 2, (size - geometry.height * scale) / 2);ctx.scale(scale, scale);
    ctx.fillStyle = '#ded8cd';ctx.fillRect(0, 0, geometry.width, geometry.height);
    for (const tile of geometry.tiles) {
      const image = loaded[tile.role];
      if (image) drawCover(ctx, image, tile, gap);
      else { ctx.fillStyle = '#f4f1eb';ctx.fillRect(tile.x + gap / 2, tile.y + gap / 2, Math.max(0, tile.width - gap), Math.max(0, tile.height - gap)); }
    }
    ctx.restore();
    if (loaded.some(image => !image)) { ctx.fillStyle = '#655b4c';ctx.font = Math.max(10, size / 28) + 'px Arial';ctx.textAlign = 'center';ctx.fillText('Échantillon indisponible · schéma de pose', size / 2, size - 8); }
  }
  function canvasFor(family, config, pattern, size) {
    const canvas = document.createElement('canvas');canvas.setAttribute('role', 'img');canvas.setAttribute('aria-label', pattern.label + ' · ' + config.primary + (config.mode === 'duo' ? ' et ' + config.secondary : ''));
    canvas.className = 'ep-small-design-canvas';const job = paint(canvas, family, { ...config }, pattern, size).catch(error => { console.error(error);canvas.setAttribute('aria-label', 'Aperçu indisponible : ' + error.message); });if (size >= 600) lastPreviewJob = job;return canvas;
  }
  function sampleButton(family, color, selected, slot) {
    const button = document.createElement('button');button.type = 'button';button.className = 'ep-small-swatch';button.dataset.smallDesignColor = color.color;button.dataset.smallDesignSlot = slot;button.setAttribute('aria-pressed', String(selected));
    const image = mediaFor(family, color.color), copy = document.createElement('span'), name = document.createElement('b'), reference = document.createElement('small');
    name.textContent = color.color;reference.textContent = color.ref;copy.append(name, reference);
    if (image) { const img = document.createElement('img');img.src = image;img.alt = '';img.loading = 'lazy';img.decoding = 'async';img.onerror = () => { img.remove();button.classList.add('ep-small-no-image'); };button.append(img); }
    else { const note = document.createElement('span');note.className = 'ep-small-unavailable';note.textContent = 'Sans visuel';button.append(note); }
    button.append(copy);button.onclick = () => { const selected = design();selected[slot] = color.color;if (slot === 'primary') state.smallColor = color.color;render();S.calculate(); };
    return button;
  }
  function render() {
    const controls = $('#ep-composition-controls'), preview = $('#ep-preview'), custom = active();
    if (!custom) {
      controls?.classList.remove('ep-small-design-controls');
      if (preview?.dataset.smallDesign === 'true') { delete preview.dataset.smallDesign;delete preview.dataset.poseOrigin; }
    }
    if (state.group !== 'small') return;
    const family = S.small();
    // Browsing an official drawing may preview the extra cards, but must never
    // restore a saved creative palette after the official calculator has run.
    // Only the active smallRows hook reconciles a creative palette before calc.
    const selected = custom ? design() : { ...(state.smallDesigns[family.series] || {}), series: family.series, mode: state.smallDesigns[family.series]?.mode || 'duo', primary: family.colors.some(color => color.color === state.smallColor) ? state.smallColor : family.colors[0].color, secondary: state.smallDesigns[family.series]?.secondary || family.colors[1]?.color || family.colors[0].color };
    if (!custom) activeSeries = '';
    for (const button of $$('.ep-pattern', $('#ep-pattern-grid'))) {
      const candidate = D.patterns.find(pattern => pattern.id === button.dataset.pattern);
      if (!candidate?.smallLayout) continue;
      const box = button.firstElementChild;if (!box) continue;box.dataset.poseOrigin = 'lrf';box.classList.add('ep-official-ready');box.replaceChildren(canvasFor(family, selected, candidate, 220));
    }
    if (!custom) return;
    const pattern = S.pattern();preview.dataset.poseOrigin = 'lrf';preview.dataset.smallDesign = 'true';preview.classList.add('ep-official-ready');
    preview.replaceChildren(canvasFor(family, selected, pattern, 650));$('#ep-preview-badge').textContent = 'CRÉATION LRF · ' + family.series.toUpperCase();
    const section = $('#ep-composition-section');section.hidden = false;controls.classList.remove('ep-segmento-compositions');controls.classList.add('ep-small-design-controls');controls.replaceChildren();
    const heading = section.querySelector('.ep-step b'), note = section.querySelector('.ep-step small');if (heading) heading.textContent = 'Essayez vos couleurs';if (note) note.textContent = 'Même collection, mêmes vrais carreaux. Les quantités suivent les couleurs de ce module.';
    $('#ep-surface-step').textContent = '4';
    const mode = document.createElement('div');mode.className = 'ep-small-mode';mode.setAttribute('role', 'group');mode.setAttribute('aria-label', 'Nombre de couleurs');
    for (const [value, label] of [['single', 'Une couleur'], ['duo', 'Deux couleurs']]) { const button = document.createElement('button');button.type = 'button';button.textContent = label;button.dataset.smallDesignMode = value;button.setAttribute('aria-pressed', String(selected.mode === value));button.onclick = () => { selected.mode = value;render();S.calculate(); };mode.append(button); }
    controls.append(mode);
    for (const [slot, label] of [['primary', 'Couleur A'], ...(selected.mode === 'duo' ? [['secondary', 'Couleur B']] : [])]) {
      const group = document.createElement('fieldset'), title = document.createElement('legend'), grid = document.createElement('div');title.textContent = label;grid.className = 'ep-small-swatch-grid';
      for (const color of family.colors) grid.append(sampleButton(family, color, selected[slot] === color.color, slot));group.append(title, grid);controls.append(group);
    }
    const explanation = document.createElement('p');explanation.className = 'ep-small-design-note';explanation.textContent = 'Création LRF avec échantillons de teinte Elios. ' + (selected.mode === 'duo' ? 'Le module périodique contient 50 % de chaque repère.' : 'Une seule référence compose le module.') + (family.series === 'Tropical' ? ' Joint illustré : 3 mm. Pour les mélanges de couleurs, associez le même calibre.' : ' Joint illustré : 2 mm.') + ' L’aperçu conserve les proportions des carreaux.';controls.append(explanation);
    $('#ep-ratios').innerHTML = rowsFor(family, selected, pattern.smallLayout).map(row => `<span>${S.esc(row.color)} <b>${S.fr(row.share, 1)} %</b></span>`).join('');
    const primary = $('#ep-small-color');
    if (primary) primary.value = selected.primary;
    if (primary && !primary.__lrfSmallDesign) {
      primary.__lrfSmallDesign = true;const previous = primary.onchange;
      primary.onchange = event => { previous?.call(primary, event);if (active()) { design().primary = primary.value;render();S.calculate(); } };
    }
  }
  const previousPattern = S.renderPattern, previousSelection = S.renderSelection;
  S.renderPattern = () => { previousPattern();render(); };
  S.renderSelection = () => { previousSelection(); };
  // Printing keeps the already-painted canvas; replacing it in beforeprint
  // would race the asynchronous image loads. The page's Print action may wait.
  API.whenRendered = () => lastPreviewJob;
  API.render = render;API.design = design;API.active = active;
  const style = document.createElement('style');style.id = 'ep-small-design-style';style.textContent = `
.ep-small-design-canvas{display:block;width:100%;height:100%;object-fit:contain}.ep-small-design-controls{grid-template-columns:1fr!important;min-width:0}.ep-small-design-controls fieldset{border:1px solid #d8cdb8;border-radius:9px;padding:9px;margin:0;min-width:0}.ep-small-design-controls legend{font-size:.8rem;font-weight:700;padding:0 5px}.ep-small-mode{display:flex;gap:7px;flex-wrap:wrap}.ep-small-mode button,.ep-small-swatch{min-height:44px;color:#302b21;background:#fffdf8;border:1px solid #d7cbb5;border-radius:8px;cursor:pointer}.ep-small-mode button{padding:9px 13px;font-size:.8rem}.ep-small-mode button[aria-pressed=true],.ep-small-swatch[aria-pressed=true]{border-color:#997326;box-shadow:inset 0 0 0 1px #997326;background:#fff7e7}.ep-small-swatch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.ep-small-swatch{display:grid;grid-template-rows:48px auto;gap:5px;padding:6px;min-width:0;text-align:left}.ep-small-swatch img{width:100%;height:48px;object-fit:cover;border-radius:4px}.ep-small-swatch b,.ep-small-swatch small{display:block;overflow-wrap:anywhere;font-size:.67rem}.ep-small-swatch small{color:#746b5d;font-size:.6rem;margin-top:3px}.ep-small-unavailable{display:grid;place-items:center;background:#f0ece2;color:#7e7463;font-size:.6rem}.ep-small-design-note{font-size:.72rem;line-height:1.5;color:#776b56;margin:4px 0}@media(max-width:420px){.ep-small-swatch-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{.ep-small-design-controls{display:none!important}}
  `;document.head.append(style);
})();
