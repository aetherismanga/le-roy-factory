(() => {
  if (!window.pdfjsLib) {
    console.warn('PDF.js indisponible : visuels NEOBATH non rendus.');
    return;
  }
  const pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  const animaPages = [7,11,15,18,21,26,28,30,33,36,38,40,44,46,48,50];
  const dnaPages = [5,9,13,16,19,22,25,29,33,35,38,41,45,49,52,55,59,62];
  const docs = new Map();
  const cache = new Map();
  let activeNeobathId = '';

  const infoForId = id => {
    const m = String(id || '').match(/^neobath-(anima|dna)-(\d{2})$/);
    if (!m) return null;
    const idx = Number(m[2]) - 1;
    if (idx < 0) return null;
    const anima = m[1] === 'anima';
    return {
      url: anima ? 'assets/pdf/neobathANIMA.pdf' : 'assets/pdf/neobathDNA.pdf',
      page: (anima ? animaPages : dnaPages)[idx],
      collection: anima ? 'ANIMA' : 'DNA'
    };
  };

  async function getDoc(url) {
    if (!docs.has(url)) docs.set(url, pdfjsLib.getDocument(url).promise);
    return docs.get(url);
  }

  async function render(url, pageNumber, scale = 1.1, quality = 0.86) {
    const key = `${url}|${pageNumber}|${scale}|${quality}`;
    if (cache.has(key)) return cache.get(key);
    const job = (async () => {
      const doc = await getDoc(url);
      const page = await doc.getPage(Number(pageNumber));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', quality);
    })();
    cache.set(key, job);
    try { return await job; } catch (e) { cache.delete(key); throw e; }
  }

  async function hydrateCard(card) {
    if (!card || card.dataset.neobathPdfReady) return;
    const info = infoForId(card.dataset.id);
    if (!info) return;
    card.dataset.neobathPdfReady = 'loading';
    const img = card.querySelector('.product-visual img');
    if (!img) return;
    try {
      const src = await render(info.url, info.page, 0.95, 0.84);
      img.src = src;
      img.removeAttribute('srcset');
      card.dataset.neobathPdfReady = '1';
    } catch (e) {
      console.warn('Aperçu NEOBATH', e);
      card.dataset.neobathPdfReady = 'error';
    }
  }

  function hydrateCards(root = document) {
    const cards = [...root.querySelectorAll('.product-card[data-id^="neobath-"]:not([data-neobath-pdf-ready])')];
    if (!cards.length) return;
    if (!('IntersectionObserver' in window)) {
      cards.forEach(hydrateCard);
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        hydrateCard(entry.target);
      });
    }, { rootMargin: '450px 0px' });
    cards.forEach(card => io.observe(card));
  }

  async function hydrateModal() {
    const dialog = document.getElementById('product-dialog');
    if (!dialog) return;
    const title = dialog.querySelector('.modal-info h2')?.textContent?.trim() || '';
    let id = activeNeobathId;
    if (!id && title) {
      const p = (window.NEOBATH_CATALOGUE || []).find(x => x.name === title);
      id = p?.id || '';
    }
    const info = infoForId(id);
    if (!info) return;

    const main = dialog.querySelector('#modal-main-image');
    if (!main) return;
    main.dataset.neobathHd = 'loading';
    try {
      const src = await render(info.url, info.page, 2.15, 0.92);
      if (!document.body.contains(main)) return;
      main.src = src;
      main.dataset.neobathHd = '1';
      main.dataset.neobathSrc = src;
      const note = dialog.querySelector('.gallery-note');
      if (note) note.textContent = `NEOBATH ${info.collection} · visuel HD du catalogue`;
      const counter = dialog.querySelector('#gallery-counter');
      if (counter) counter.textContent = '1 / 1';
    } catch (e) {
      console.warn('Visuel HD NEOBATH', e);
      main.dataset.neobathHd = 'error';
    }
  }

  function openNeobathLightbox(src, title) {
    document.getElementById('neobath-pdf-lightbox')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'neobath-pdf-lightbox';
    overlay.className = 'gallery-lightbox open';
    overlay.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Fermer">×</button>
      <div class="lightbox-stage"><img src="${src}" alt="${String(title || 'NEOBATH').replace(/"/g,'&quot;')}"></div>
      <div class="lightbox-counter">HD · catalogue NEOBATH</div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.lightbox-close')?.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key !== 'Escape') return;
      close();
      document.removeEventListener('keydown', esc);
    });
  }

  document.addEventListener('click', e => {
    const card = e.target.closest('.product-card[data-id^="neobath-"]');
    if (card) activeNeobathId = card.dataset.id || '';

    const dialog = document.getElementById('product-dialog');
    const main = dialog?.querySelector('#modal-main-image[data-neobath-src]');
    const isExpand = e.target.closest('#gallery-expand');
    const isMain = e.target.closest('#modal-main-image');
    if ((isExpand || isMain) && main?.dataset.neobathSrc) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const title = dialog.querySelector('.modal-info h2')?.textContent?.trim() || 'NEOBATH';
      openNeobathLightbox(main.dataset.neobathSrc, title);
    }
  }, true);

  const grid = document.getElementById('products-grid');
  if (grid) {
    const gridObserver = new MutationObserver(() => hydrateCards(grid));
    gridObserver.observe(grid, { childList: true, subtree: true });
    hydrateCards(grid);
  }

  const dialog = document.getElementById('product-dialog');
  if (dialog) {
    new MutationObserver(() => {
      const title = dialog.querySelector('.modal-info h2')?.textContent?.trim() || '';
      if (!title) return;
      const p = (window.NEOBATH_CATALOGUE || []).find(x => x.name === title);
      if (p) {
        activeNeobathId = p.id;
        hydrateModal();
      }
    }).observe(dialog, { childList: true, subtree: true });
  }

  window.LRF_PDF_IMAGES = { render, hydrate: hydrateCards };
})();
