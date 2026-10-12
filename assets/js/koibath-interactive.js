(() => {
  'use strict';

  const PDF_URL = 'assets/pdf/KOIBATH_Catalogue_Meubles_2025.pdf';
  const COLLECTIONS = [
    { name: 'Ko Tao', page: 7, printed: 12 },
    { name: 'Malta', page: 10, printed: 18 },
    { name: 'Madeira', page: 14, printed: 26 },
    { name: 'Elba', page: 17, printed: 32 },
    { name: 'Laos', page: 21, printed: 40 },
    { name: 'Java', page: 26, printed: 50 },
    { name: 'Bali', page: 31, printed: 60 },
    { name: 'Saona', page: 36, printed: 70 },
    { name: 'Bora Bora', page: 40, printed: 78 },
    { name: 'Tahití', page: 44, printed: 86 },
    { name: 'Tupai', page: 48, printed: 94 },
    { name: 'Corfú', page: 52, printed: 102 },
    { name: 'Mikonos', page: 59, printed: 116 },
    { name: 'Borneo', page: 69, printed: 136 },
    { name: 'Santorini', page: 72, printed: 142, thumbPage: 73, thumbSide: 'right' },
    { name: 'Ibiza', page: 75, printed: 148 }
  ];

  const $ = id => document.getElementById(id);
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const state = {
    pdf: null,
    mobile: mobileQuery.matches,
    views: [],
    currentView: 1,
    currentPdfPage: 1,
    zoom: 1,
    rendered: new Set(),
    observer: null,
    currentObserver: null
  };

  if (!window.pdfjsLib) {
    $('loading').innerHTML = '<strong>Le lecteur PDF est momentanément indisponible.</strong><span>Veuillez réessayer dans quelques instants.</span>';
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function buildLexicon() {
    if ($('series-grid').children.length) return;
    $('series-grid').innerHTML = COLLECTIONS.map((item, index) => `
      <button type="button" class="kb-series-card" data-pdf-page="${item.page}" title="Page catalogue ${item.printed}">
        <canvas class="kb-series-thumb" data-collection-index="${index}" role="img" aria-label="Aperçu de la collection ${escapeHtml(item.name)}"></canvas>
        <span><strong>${escapeHtml(item.name)}</strong><small>Voir la collection</small></span>
        <b aria-hidden="true">›</b>
      </button>`).join('');
  }

  async function renderLexiconThumbnails() {
    const canvases = [...document.querySelectorAll('.kb-series-thumb:not([data-rendered])')];
    await Promise.all(canvases.map(async canvas => {
      const item = COLLECTIONS[Number(canvas.dataset.collectionIndex)];
      if (!item) return;
      canvas.dataset.rendered = '1';
      try {
        const page = await state.pdf.getPage(item.thumbPage || item.page);
        const base = page.getViewport({ scale: 1 });
        const cssWidth = 208;
        const scale = cssWidth / (base.width / 2);
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width / 2);
        canvas.height = Math.ceil(canvas.width / 1.55);
        const options = { canvasContext: canvas.getContext('2d', { alpha: false }), viewport };
        if (item.thumbSide === 'right') options.transform = [1, 0, 0, 1, -viewport.width / 2, 0];
        await page.render(options).promise;
      } catch (error) {
        canvas.removeAttribute('data-rendered');
        console.error(error);
      }
    }));
  }

  function openLexicon() {
    buildLexicon();
    $('series-dialog').showModal();
    renderLexiconThumbnails();
  }

  function buildViews() {
    const views = [];
    for (let pdfPage = 1; pdfPage <= state.pdf.numPages; pdfPage += 1) {
      if (!state.mobile) {
        views.push({ pdfPage, side: null, label: String(pdfPage) });
        continue;
      }
      if (pdfPage === 1) {
        views.push({ pdfPage, side: 'left', label: 'Couverture' });
        continue;
      }
      const printedLeft = (pdfPage - 1) * 2;
      views.push({ pdfPage, side: 'left', label: String(printedLeft) });
      views.push({ pdfPage, side: 'right', label: String(printedLeft + 1) });
    }
    return views.map((view, index) => ({ ...view, index: index + 1 }));
  }

  async function createPages() {
    const firstPage = await state.pdf.getPage(1);
    const base = firstPage.getViewport({ scale: 1 });
    state.views = buildViews();
    const root = $('catalogue-pages');
    root.innerHTML = state.views.map(view => {
      const width = view.side ? base.width / 2 : base.width;
      const side = view.side ? ` data-side="${view.side}"` : '';
      return `<article class="kb-page" data-view="${view.index}" data-pdf-page="${view.pdfPage}"${side} style="aspect-ratio:${width}/${base.height}"><span class="kb-page-number">${escapeHtml(view.label)}</span></article>`;
    }).join('');

    $('page-total').textContent = `/ ${state.views.length}`;
    $('page-input').max = String(state.views.length);

    state.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? renderPage(entry.target) : unloadPage(entry.target));
    }, { rootMargin: state.mobile ? '650px 0px' : '900px 0px' });
    root.querySelectorAll('.kb-page').forEach(page => state.observer.observe(page));

    state.currentObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      state.currentView = Number(visible.target.dataset.view);
      state.currentPdfPage = Number(visible.target.dataset.pdfPage);
      $('page-input').value = String(state.currentView);
      updateActiveCollection();
    }, { rootMargin: '-24% 0px -60% 0px', threshold: [0, .2, .5] });
    root.querySelectorAll('.kb-page').forEach(page => state.currentObserver.observe(page));
  }

  function unloadPage(holder) {
    holder.dataset.renderToken = String((Number(holder.dataset.renderToken) || 0) + 1);
    delete holder.dataset.rendering;
    state.rendered.delete(Number(holder.dataset.view));
    holder.querySelectorAll('canvas,.kb-page-error').forEach(node => node.remove());
  }

  async function renderPage(holder) {
    const viewIndex = Number(holder.dataset.view);
    const view = state.views[viewIndex - 1];
    if (!view || state.rendered.has(viewIndex) || holder.dataset.rendering) return;
    holder.dataset.rendering = '1';
    const token = String((Number(holder.dataset.renderToken) || 0) + 1);
    holder.dataset.renderToken = token;
    let canvas;
    try {
      const page = await state.pdf.getPage(view.pdfPage);
      const base = page.getViewport({ scale: 1 });
      const sourceWidth = view.side ? base.width / 2 : base.width;
      const screenDpr = window.devicePixelRatio || 1;
      const dpr = state.mobile ? Math.min(Math.max(screenDpr, 2), 3) : Math.min(Math.max(screenDpr, 2), 2.5);
      const requestedScale = Math.max(.1, holder.clientWidth / sourceWidth) * dpr;
      const maxCanvasWidth = 5600;
      const scale = requestedScale * Math.min(1, maxCanvasWidth / (base.width * requestedScale));
      const viewport = page.getViewport({ scale });
      canvas = document.createElement('canvas');
      canvas.width = Math.ceil(view.side ? viewport.width / 2 : viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.aspectRatio = `${sourceWidth}/${base.height}`;
      holder.prepend(canvas);
      const options = { canvasContext: canvas.getContext('2d', { alpha: false }), viewport };
      if (view.side === 'right') options.transform = [1, 0, 0, 1, -viewport.width / 2, 0];
      await page.render(options).promise;
      if (holder.dataset.renderToken !== token) {
        canvas.remove();
        return;
      }
      state.rendered.add(viewIndex);
    } catch (error) {
      if (holder.dataset.renderToken === token) {
        holder.insertAdjacentHTML('beforeend', `<p class="kb-page-error">Page ${escapeHtml(view.label)} indisponible.</p>`);
        console.error(error);
      }
    } finally {
      if (holder.dataset.renderToken === token) delete holder.dataset.rendering;
    }
  }

  function viewForPdfPage(pdfPage) {
    const target = state.views.find(view => view.pdfPage === pdfPage && (!state.mobile || view.side === 'left'));
    return target ? target.index : 1;
  }

  function goView(value, behavior = 'instant') {
    const view = Math.max(1, Math.min(state.views.length, Number(value) || 1));
    const target = document.querySelector(`.kb-page[data-view="${view}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior, block: 'start' });
    renderPage(target);
  }

  function goPdfPage(pdfPage) {
    goView(viewForPdfPage(pdfPage));
  }

  function setZoom(value) {
    state.zoom = Math.max(state.mobile ? 1 : .7, Math.min(2.5, value));
    $('catalogue-pages').style.setProperty('--zoom', state.zoom);
    $('zoom-value').textContent = `${Math.round(state.zoom * 100)} %`;
    const current = state.currentView;
    document.querySelectorAll('.kb-page').forEach(unloadPage);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('.kb-page').forEach(page => {
        state.observer.unobserve(page);
        state.observer.observe(page);
      });
      goView(current, 'auto');
    }));
  }

  function updateActiveCollection() {
    const valid = COLLECTIONS.filter(item => item.page <= state.currentPdfPage);
    const active = valid.length ? valid[valid.length - 1] : null;
    document.querySelectorAll('.kb-series-card').forEach(button => {
      button.setAttribute('aria-current', active && Number(button.dataset.pdfPage) === active.page ? 'true' : 'false');
    });
  }

  function bind() {
    $('previous-page').onclick = () => goView(state.currentView - 1);
    $('next-page').onclick = () => goView(state.currentView + 1);
    $('page-input').onchange = event => goView(event.target.value);
    $('zoom-out').onclick = () => setZoom(state.zoom - .15);
    $('zoom-in').onclick = () => setZoom(state.zoom + .15);
    $('series-button').onclick = openLexicon;
    $('series-grid').onclick = event => {
      const button = event.target.closest('[data-pdf-page]');
      if (!button) return;
      $('series-dialog').close();
      goPdfPage(Number(button.dataset.pdfPage));
    };
    document.querySelectorAll('[data-close]').forEach(button => {
      button.onclick = () => $(button.dataset.close).close();
    });
    mobileQuery.addEventListener?.('change', () => window.location.reload());
  }

  async function init() {
    try {
      buildLexicon();
      bind();
      state.pdf = await pdfjsLib.getDocument({ url: PDF_URL }).promise;
      await createPages();
      $('loading').hidden = true;
      const requested = new URLSearchParams(window.location.search).get('collection');
      if (requested) {
        const normalized = requested.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const item = COLLECTIONS.find(entry => entry.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === normalized);
        if (item) setTimeout(() => goPdfPage(item.page), 180);
      }
    } catch (error) {
      $('loading').innerHTML = `<strong>Le catalogue interactif est momentanément indisponible.</strong><span>${escapeHtml(error.message)}</span>`;
      console.error(error);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once: true })
    : init();
})();
