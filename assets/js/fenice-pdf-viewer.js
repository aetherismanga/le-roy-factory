(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const catalogue = (params.get('catalogue') || 'cersaie').toLowerCase();
  const titleParam = params.get('title') || '';
  const SOURCES = {
    cersaie: {
      label: 'Nouveautés Cersaie 2026',
      url: 'assets/pdf/LA_FENICE_CERSAIE_2026_INTERACTIF.pdf'
    },
    general: {
      label: 'Catalogue Général 2026/2027',
      url: 'assets/pdf/LA_FENICE_GENERAL_2026_2027_WEB.pdf'
    }
  };
  const source = SOURCES[catalogue] || SOURCES.cersaie;

  const canvas = document.getElementById('fpv-canvas');
  const stage = document.getElementById('fpv-stage');
  const status = document.getElementById('fpv-status');
  const title = document.getElementById('fpv-title');
  const subtitle = document.getElementById('fpv-subtitle');
  const pageInput = document.getElementById('fpv-page');
  const total = document.getElementById('fpv-total');
  const prev = document.getElementById('fpv-prev');
  const next = document.getElementById('fpv-next');
  const zoomOut = document.getElementById('fpv-zoom-out');
  const zoomIn = document.getElementById('fpv-zoom-in');
  const fit = document.getElementById('fpv-fit');
  const nativeLink = document.getElementById('fpv-native');

  let pdf = null;
  let pageNo = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  let zoom = 1;
  let fitMode = true;
  let rendering = null;
  let renderToken = 0;

  title.textContent = titleParam ? titleParam : source.label;
  subtitle.textContent = source.label;
  nativeLink.href = source.url;
  document.title = (titleParam ? titleParam + ' · ' : '') + source.label + ' | Le Roy Factory';

  if (!window.pdfjsLib) {
    fail('Le lecteur PDF ne peut pas se charger.');
    return;
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  function fail(message) {
    status.hidden = false;
    status.textContent = message;
    canvas.style.display = 'none';
  }

  function syncUrl() {
    const u = new URL(location.href);
    u.searchParams.set('catalogue', catalogue);
    u.searchParams.set('page', String(pageNo));
    if (titleParam) u.searchParams.set('title', titleParam);
    history.replaceState(null, '', u);
  }

  function updateControls() {
    pageInput.value = String(pageNo);
    total.textContent = pdf ? '/ ' + pdf.numPages : '/ —';
    prev.disabled = !pdf || pageNo <= 1;
    next.disabled = !pdf || pageNo >= pdf.numPages;
  }

  async function renderPage({preserveScroll=false}={}) {
    if (!pdf) return;
    pageNo = Math.min(Math.max(1, pageNo), pdf.numPages);
    updateControls();
    syncUrl();

    const myToken = ++renderToken;
    status.hidden = false;
    status.textContent = 'Chargement de la page ' + pageNo + '…';
    try {
      const page = await pdf.getPage(pageNo);
      if (myToken !== renderToken) return;
      const base = page.getViewport({scale: 1});
      const available = Math.max(280, stage.clientWidth - 8);
      const fitScale = available / base.width;
      const cssScale = fitMode ? fitScale : fitScale * zoom;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.4);
      const viewport = page.getViewport({scale: cssScale * dpr});

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
      canvas.style.height = Math.floor(viewport.height / dpr) + 'px';
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d', {alpha:false});
      rendering = page.render({canvasContext:ctx, viewport});
      await rendering.promise;
      if (myToken !== renderToken) return;
      status.hidden = true;
      if (!preserveScroll) window.scrollTo({top:0,behavior:'instant'});
    } catch (err) {
      console.error(err);
      fail('Impossible d’afficher cette page du catalogue.');
    }
  }

  function go(n) {
    if (!pdf) return;
    pageNo = Math.min(Math.max(1, n), pdf.numPages);
    renderPage();
  }

  prev.addEventListener('click', () => go(pageNo - 1));
  next.addEventListener('click', () => go(pageNo + 1));
  pageInput.addEventListener('change', () => go(Number.parseInt(pageInput.value,10) || pageNo));
  pageInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pageInput.blur(); go(Number.parseInt(pageInput.value,10) || pageNo); } });
  zoomIn.addEventListener('click', () => { fitMode=false; zoom=Math.min(3,zoom+0.25); renderPage({preserveScroll:true}); });
  zoomOut.addEventListener('click', () => { fitMode=false; zoom=Math.max(.65,zoom-0.25); renderPage({preserveScroll:true}); });
  fit.addEventListener('click', () => { fitMode=true; zoom=1; renderPage({preserveScroll:true}); });
  document.getElementById('fpv-back').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.href = 'univers.html';
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (fitMode) renderPage({preserveScroll:true}); }, 180);
  }, {passive:true});

  status.textContent = 'Ouverture de ' + source.label + '…';
  window.pdfjsLib.getDocument({
    url: source.url,
    rangeChunkSize: 262144,
    disableAutoFetch: true,
    disableStream: false
  }).promise.then(doc => {
    pdf = doc;
    pageNo = Math.min(pageNo, pdf.numPages);
    updateControls();
    return renderPage();
  }).catch(err => {
    console.error(err);
    fail('Le catalogue n’est pas disponible pour le moment.');
  });
})();