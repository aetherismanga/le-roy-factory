(() => {
  'use strict';
  const S = window.LRF_ELIOS_POSE_V2;
  if (!S) return;
  const { $, $$, state } = S;
  const previous = { renderSelection: S.renderSelection, renderPattern: S.renderPattern, pattern: S.pattern };
  const imageJobs = new Map();
  let data;
  const escape = S.esc;
  const imageFor = color => {
    const url = color.preview || color.faces?.[0];
    if (!imageJobs.has(url)) imageJobs.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Visuel indisponible : ${color.label || color.id}`));
      img.src = url;
    }));
    return imageJobs.get(url);
  };
  const colorFor = id => data.colors.find(color => color.id === id);
  function current() {
    let composition = data.compositions.find(item => item.id === state.segmentoComposition && item.patternId === state.pattern);
    if (!composition) composition = data.compositions.find(item => item.patternId === state.pattern);
    if (!composition) throw new Error('Composition Segmento inconnue.');
    state.segmentoComposition = composition.id;
    return composition;
  }
  function rows() {
    const composition = current();
    const counts = new Map();
    for (const tile of composition.tiles) counts.set(tile.color, (counts.get(tile.color) || 0) + 1);
    return [...counts].map(([id, count]) => {
      const color = colorFor(id);
      if (!color) throw new Error(`Référence Segmento inconnue : ${id}`);
      return {
        series: 'Segmento', color: color.label, ref: color.ref,
        key: '15x15', label: '15 × 15 cm', share: count / composition.tiles.length * 100,
        pcs: data.packaging.pieces, boxM2: data.packaging.area,
        finish: 'R9 · 8,5 mm',
      };
    });
  }
  async function paint(canvas, composition, size) {
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e9e2d7'; ctx.fillRect(0, 0, size, size);
    const images = new Map(await Promise.all([...new Set(composition.tiles.map(tile => tile.color))].map(async id => [id, await imageFor(colorFor(id))])));
    if (!canvas.isConnected) return;
    const width = size / composition.columns, height = size / composition.rows;
    const gap = Math.max(.5, Math.min(width, height) * 2 / 150);
    for (const tile of composition.tiles) {
      ctx.save();
      ctx.translate((tile.col + .5) * width, (tile.row + .5) * height);
      ctx.rotate((tile.rotation || 0) * Math.PI / 180);
      ctx.drawImage(images.get(tile.color), -width / 2 + gap / 2, -height / 2 + gap / 2, width - gap, height - gap);
      ctx.restore();
    }
  }
  function canvasFor(composition, size) {
    // The manufacturer crop is the visual source of truth; the cells below
    // remain the shared source for 3D placement and quantities.
    if (composition.preview) {
      const img = document.createElement('img');
      img.src = composition.preview;
      img.alt = composition.label || composition.id;
      img.loading = size >= 600 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.className = 'ep-segmento-preview';
      img.onerror = () => {
        img.replaceWith(canvasFor({ ...composition, preview: null }, size));
      };
      return img;
    }
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', composition.label || composition.id);
    paint(canvas, composition, size).catch(error => {
      canvas.replaceWith(Object.assign(document.createElement('p'), { textContent: error.message }));
      console.error(error);
    });
    return canvas;
  }
  function render() {
    const stepNote = document.querySelector('.ep-left .ep-step small');
    if (stepNote) stepNote.textContent = state.group === 'segmento'
      ? 'Carreaux Segmento R9 · choisissez un motif puis sa composition.'
      : 'Collection, finition R10/R11, modèle / couleur puis conditionnement.';
    if (!data || state.group !== 'segmento') {
      $('#ep-composition-controls').classList.remove('ep-segmento-compositions');
      $('#ep-composition-section .ep-step b').textContent = 'Composition couleurs';
      $('#ep-composition-section .ep-step small').textContent = 'Choisissez la couleur affectée à chaque repère du schéma.';
      return previous.renderSelection();
    }
    if (!data.patterns.some(item => item.id === state.pattern)) state.pattern = data.patterns[0].id;
    const selected = current();
    const products = $('#ep-product-controls');
    products.innerHTML = `<div class="ep-segmento-spec"><b>Segmento · 15 × 15 cm</b><p>48 compositions officielles · 12 motifs · 16 références</p><small>46 pièces / boîte · 1,04 m² · 18 kg<br>Grès cérame · R9 · épaisseur 8,5 mm · joint minimum 2 mm</small></div><details class="ep-segmento-palette"><summary>Voir les 16 carreaux et leurs références</summary><div>${data.colors.map(color => `<figure><img src="${escape(color.preview || color.faces?.[0])}" alt="${escape(color.label)}" loading="lazy" width="100" height="100"><figcaption>${escape(color.label)}<small>${escape(color.ref)}</small></figcaption></figure>`).join('')}</div></details>`;
    const grid = $('#ep-pattern-grid');
    grid.replaceChildren();
    for (const pattern of data.patterns) {
      const composition = data.compositions.find(item => item.patternId === pattern.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ep-pattern${pattern.id === state.pattern ? ' active' : ''}`;
      button.dataset.pattern = pattern.id;
      button.setAttribute('aria-pressed', String(pattern.id === state.pattern));
      button.innerHTML = `<div class="ep-official-ready"></div><b>${escape(pattern.label)}</b><small>${data.compositions.filter(item => item.patternId === pattern.id).length} compositions</small>`;
      button.firstElementChild.append(canvasFor(composition, 200));
      button.onclick = () => { state.pattern = pattern.id; state.segmentoComposition = null; render(); };
      grid.append(button);
    }
    $('#ep-compatible-note').textContent = 'Choisissez un motif, puis une de ses compositions officielles.';
    $('#ep-preview-title').textContent = selected.label;
    $('#ep-preview-badge').textContent = 'SEGMENTO · ELIOS';
    const preview = $('#ep-preview');
    preview.classList.add('ep-official-ready');
    preview.replaceChildren(canvasFor(selected, 600));
    const shares = rows();
    $('#ep-ratios').innerHTML = shares.map(row => `<span>${escape(row.color)} <b>${S.fr(row.share, 1)} %</b></span>`).join('');
    $('#ep-composition-section').hidden = false;
    $('#ep-composition-section .ep-step b').textContent = 'Choisissez une composition';
    $('#ep-composition-section .ep-step small').textContent = 'Compositions officielles Elios : les quantités suivent les couleurs du visuel sélectionné.';
    $('#ep-surface-step').textContent = '4';
    const controls = $('#ep-composition-controls');
    controls.classList.add('ep-segmento-compositions');
    controls.innerHTML = '';
    for (const composition of data.compositions.filter(item => item.patternId === state.pattern)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ep-segmento-composition${composition.id === selected.id ? ' active' : ''}`;
      button.dataset.composition = composition.id;
      button.setAttribute('aria-pressed', String(composition.id === selected.id));
      button.innerHTML = `<b>${escape(composition.label)}</b><small>${[...new Set(composition.tiles.map(tile => colorFor(tile.color).label))].map(escape).join(' · ')}</small>`;
      button.prepend(canvasFor(composition, 220));
      button.onclick = () => { state.segmentoComposition = composition.id; render(); };
      controls.append(button);
    }
    S.calculate();
  }
  const style = document.createElement('style');
  style.textContent = `.ep-segmento-spec{grid-column:1/-1}.ep-segmento-spec p{font-size:.8rem;margin:6px 0}.ep-segmento-spec small{line-height:1.6;color:#716653}.ep-segmento-palette{grid-column:1/-1}.ep-segmento-palette summary{cursor:pointer;font-size:.8rem;font-weight:700;padding:10px 0}.ep-segmento-palette>div{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ep-segmento-palette figure{margin:0;min-width:0}.ep-segmento-palette img{display:block;width:100%;height:auto}.ep-segmento-palette figcaption{font-size:.65rem;padding:4px 0}.ep-segmento-palette small{display:block;font-size:.6rem}.ep-pattern canvas,#ep-preview canvas,.ep-segmento-preview{display:block;width:100%;height:auto}.ep-segmento-compositions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px}.ep-segmento-composition{min-width:0;padding:8px;background:#fff;border:1px solid #d7cbb5;border-radius:10px;cursor:pointer;text-align:left;color:#2a241b}.ep-segmento-composition.active{border:2px solid #a87b20;background:#fff9eb;padding:7px}.ep-segmento-composition canvas,.ep-segmento-composition .ep-segmento-preview{width:100%;height:auto;display:block;border-radius:5px;margin-bottom:8px}.ep-segmento-composition b{font-size:.75rem;display:block}.ep-segmento-composition small{font-size:.65rem;display:block;line-height:1.4;margin-top:4px}@media print{.ep-segmento-palette,.ep-segmento-compositions{display:none!important}}`;
  document.head.append(style);
  fetch('assets/data/elios-segmento.json?v=20261107-2').then(response => {
    if (!response.ok) throw new Error('Chargement Segmento impossible.');
    return response.json();
  }).then(result => {
    data = result;
    window.LRF_ELIOS_SEGMENTO = { data, render, current, rows };
    S.segmentoRows = rows;
    S.pattern = () => state.group === 'segmento' ? { ...previous.pattern(), label: current().label } : previous.pattern();
    S.renderSelection = render;
    S.renderPattern = () => state.group === 'segmento' ? render() : previous.renderPattern();
    if (new URLSearchParams(location.search).get('collection') === 'segmento') {
      state.group = 'segmento'; state.pattern = data.patterns[0].id;
    }
    if (state.group === 'segmento') S.renderAll();
  }).catch(error => {
    console.error(error);
    const notice = document.createElement('p');
    notice.className = 'ep-segmento-error';
    notice.textContent = 'Segmento n’a pas pu être chargé. Actualisez la page pour réessayer.';
    S.root.prepend(notice);
  });
})();
