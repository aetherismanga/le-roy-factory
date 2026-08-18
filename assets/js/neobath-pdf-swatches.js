(() => {
  'use strict';

  const DATA_URL = 'assets/data/neobath-config-data.json?v=20260818b';
  const PDF_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const docs = new Map();
  const renders = new Map();
  const metaByName = new Map();
  let dataReady = null;

  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  function ensurePdfJs() {
    if (!window.pdfjsLib) return null;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    return window.pdfjsLib;
  }

  async function loadData() {
    if (dataReady) return dataReady;
    dataReady = (async () => {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`NEOBATH swatches data HTTP ${response.status}`);
      const data = await response.json();
      const finishes = data.finishes || {};

      (finishes.ANIMA?.colors || []).forEach(entry => {
        if (entry?.name && entry?.visual?.pdf && entry?.visual?.page) metaByName.set(norm(entry.name), entry.visual);
      });
      Object.values(finishes.DNA?.finishGroups || {}).flat().forEach(entry => {
        if (entry?.name && entry?.visual?.pdf && entry?.visual?.page) metaByName.set(norm(entry.name), entry.visual);
      });
      return data;
    })();
    return dataReady;
  }

  async function getDoc(url) {
    const pdfjsLib = ensurePdfJs();
    if (!pdfjsLib) throw new Error('PDF.js indisponible');
    if (!docs.has(url)) docs.set(url, pdfjsLib.getDocument(url).promise);
    return docs.get(url);
  }

  function itemRect(item, viewport) {
    const pdfjsLib = ensurePdfJs();
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.max(10, Math.hypot(tx[2], tx[3]));
    const width = Math.max(8, Number(item.width || 0) * viewport.scale);
    return {
      x0: tx[4],
      y0: tx[5] - fontHeight,
      x1: tx[4] + width,
      y1: tx[5] + Math.max(3, fontHeight * 0.18)
    };
  }

  function unionRects(rects) {
    return rects.reduce((out, rect) => ({
      x0: Math.min(out.x0, rect.x0), y0: Math.min(out.y0, rect.y0),
      x1: Math.max(out.x1, rect.x1), y1: Math.max(out.y1, rect.y1)
    }));
  }

  function locateQuery(items, query, viewport) {
    const wanted = norm(query);
    if (!wanted) return null;

    const exact = items.filter(item => norm(item.str).includes(wanted));
    if (exact.length) return unionRects(exact.slice(0, 2).map(item => itemRect(item, viewport)));

    for (let size = 2; size <= 5; size += 1) {
      for (let i = 0; i <= items.length - size; i += 1) {
        const windowItems = items.slice(i, i + size);
        if (norm(windowItems.map(item => item.str).join(' ')).includes(wanted)) {
          return unionRects(windowItems.map(item => itemRect(item, viewport)));
        }
      }
    }

    const tokens = wanted.split(' ').filter(token => token.length >= 3);
    if (!tokens.length) return null;
    let best = null;
    let bestScore = 0;
    items.forEach(item => {
      const value = norm(item.str);
      const score = tokens.filter(token => value.includes(token)).length;
      if (score > bestScore) { best = item; bestScore = score; }
    });
    return best && bestScore >= Math.max(1, Math.ceil(tokens.length / 2)) ? itemRect(best, viewport) : null;
  }

  async function renderSwatch(meta, name) {
    const url = meta.pdf;
    const pageNumber = Number(meta.page);
    const query = String(meta.query || name || '').trim();
    const key = `${url}|${pageNumber}|${query}`;
    if (renders.has(key)) return renders.get(key);

    const job = (async () => {
      const doc = await getDoc(url);
      const page = await doc.getPage(pageNumber);
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      const text = await page.getTextContent();
      const rect = locateQuery(text.items || [], query, viewport);
      if (!rect) throw new Error(`Teinte introuvable dans le PDF : ${query}`);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = Math.ceil(viewport.width);
      pageCanvas.height = Math.ceil(viewport.height);
      const pageCtx = pageCanvas.getContext('2d', { alpha: false });
      pageCtx.fillStyle = '#fff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      await page.render({ canvasContext: pageCtx, viewport }).promise;

      // On garde volontairement une zone autour du nom de finition : le patch
      // matière/couleur du nuancier NEOBATH est placé juste à côté ou au-dessus
      // du libellé selon la collection.
      const centerX = (rect.x0 + rect.x1) / 2;
      const x0 = Math.max(0, Math.floor(centerX - 145));
      const x1 = Math.min(pageCanvas.width, Math.ceil(centerX + 145));
      const y0 = Math.max(0, Math.floor(rect.y0 - 150));
      const y1 = Math.min(pageCanvas.height, Math.ceil(rect.y1 + 55));
      const width = Math.max(1, x1 - x0);
      const height = Math.max(1, y1 - y0);

      const out = document.createElement('canvas');
      out.width = width;
      out.height = height;
      const ctx = out.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(pageCanvas, x0, y0, width, height, 0, 0, width, height);
      return out.toDataURL('image/jpeg', 0.9);
    })();

    renders.set(key, job);
    try { return await job; }
    catch (error) { renders.delete(key); throw error; }
  }

  async function hydrateCard(card) {
    if (!card || card.dataset.nbPdfSwatch) return;
    const name = card.querySelector('strong')?.textContent?.trim();
    if (!name) return;
    const meta = metaByName.get(norm(name));
    if (!meta?.pdf || !meta?.page) return;

    const visual = card.querySelector('.nb-color-visual');
    if (!visual) return;
    card.dataset.nbPdfSwatch = 'loading';
    visual.classList.add('nb-pdf-swatch-loading');
    const oldImg = visual.querySelector('img');
    if (oldImg) oldImg.style.visibility = 'hidden';

    try {
      const src = await renderSwatch(meta, name);
      if (!document.body.contains(card)) return;
      let img = visual.querySelector('img');
      if (!img) {
        visual.innerHTML = '<img alt="" loading="lazy">';
        img = visual.querySelector('img');
      }
      img.src = src;
      img.alt = `${name} · nuancier NEOBATH`;
      img.style.visibility = '';
      visual.classList.remove('nb-pdf-swatch-loading');
      visual.classList.add('nb-pdf-swatch-ready');
      card.dataset.nbPdfSwatch = '1';
    } catch (error) {
      console.warn('Patch couleur NEOBATH', name, error);
      if (!document.body.contains(card)) return;
      visual.innerHTML = `<div class="nb-pdf-swatch-fallback"><strong>${name}</strong><small>Nuancier PDF · p.${meta.page}</small></div>`;
      visual.classList.remove('nb-pdf-swatch-loading');
      card.dataset.nbPdfSwatch = 'error';
    }
  }

  function hydrate(root = document) {
    root.querySelectorAll?.('.nb-color-card:not(.nb-ral-card):not([data-nb-pdf-swatch])').forEach(card => hydrateCard(card));
  }

  async function init() {
    try {
      await loadData();
      hydrate();
      const observer = new MutationObserver(() => hydrate());
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.warn('Nuanciers PDF NEOBATH indisponibles', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
