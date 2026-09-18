(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const catalogue = (params.get('catalogue') || 'cersaie').toLowerCase();
  const section = (params.get('section') || '').toLowerCase();
  const titleParam = params.get('title') || '';
  const GENERAL_SECTIONS = {
    marble:'assets/pdf/fenice-general/marble.pdf',
    stone:'assets/pdf/fenice-general/stone.pdf',
    metal:'assets/pdf/fenice-general/metal.pdf',
    wood:'assets/pdf/fenice-general/wood.pdf',
    decor:'assets/pdf/fenice-general/decor.pdf'
  };
  const OFFICIAL_GENERAL='https://lafenicegc.com/wp-content/uploads/pdf/Fenice_catalogo_Generale_2026-2027__AMERICA2_.pdf';
  const SOURCES = {
    cersaie: {
      label: 'Nouveautés Cersaie 2026',
      url: 'assets/pdf/LA_FENICE_CERSAIE_2026_INTERACTIF.pdf',
      native: 'assets/pdf/LA_FENICE_CERSAIE_2026_INTERACTIF.pdf'
    },
    general: {
      label: 'Catalogue Général 2026/2027',
      url: GENERAL_SECTIONS[section] || GENERAL_SECTIONS.marble,
      native: OFFICIAL_GENERAL
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
  const lexicon = document.getElementById('fpv-lexicon');
  const lexiconToggle = document.getElementById('fpv-lexicon-toggle');
  const lexiconClose = document.getElementById('fpv-lexicon-close');
  const lexiconScrim = document.getElementById('fpv-lexicon-scrim');
  const lexiconCatalogue = document.getElementById('fpv-lexicon-catalogue');
  const lexiconSearch = document.getElementById('fpv-lexicon-search');
  const lexiconList = document.getElementById('fpv-lexicon-list');
  const lexiconData = window.LRF_FENICE_LEXICON || {catalogues:[]};

  let pdf = null;
  let pageNo = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  let zoom = 1;
  let fitMode = true;
  let rendering = null;
  let renderToken = 0;

  const currentCatalogueId = catalogue === 'general' ? 'general-2026-2027' : 'cersaie-2026';

  function openLexicon() {
    document.body.classList.add('fpv-lexicon-open');
    lexiconToggle?.setAttribute('aria-expanded','true');
  }
  function closeLexicon() {
    document.body.classList.remove('fpv-lexicon-open');
    lexiconToggle?.setAttribute('aria-expanded','false');
  }
  lexiconToggle?.addEventListener('click', () => document.body.classList.contains('fpv-lexicon-open') ? closeLexicon() : openLexicon());
  lexiconClose?.addEventListener('click', closeLexicon);
  lexiconScrim?.addEventListener('click', closeLexicon);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeLexicon(); });

  function catalogueById(id) {
    return lexiconData.catalogues.find(c => c.id === id) || lexiconData.catalogues[0];
  }

  function entryTarget(entry, catalogueId) {
    const viewerCatalogue = catalogueId === 'general-2026-2027' ? 'general' : 'cersaie';
    const u = new URL('fenice-pdf.html', location.href);
    u.searchParams.set('catalogue', viewerCatalogue);
    if (entry.section) u.searchParams.set('section', entry.section);
    u.searchParams.set('page', String(entry.page || 1));
    u.searchParams.set('title', entry.name || 'La Fenice');
    return u.pathname.split('/').pop() + '?' + u.searchParams.toString();
  }

  function isActiveEntry(entry, catalogueId) {
    if (catalogueId !== currentCatalogueId) return false;
    if (catalogue === 'general') {
      return (entry.section || '') === section && Number(entry.page || 1) === pageNo;
    }
    return Number(entry.page || 1) === pageNo;
  }

  function renderLexicon(filter='') {
    if (!lexiconList || !lexiconCatalogue) return;
    const cat = catalogueById(lexiconCatalogue.value || currentCatalogueId);
    if (!cat) return;
    const q = String(filter || '').trim().toLowerCase();
    const entries = (cat.entries || []).filter(entry => {
      if (!q) return true;
      return [entry.name,entry.meta,entry.keywords].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
    lexiconList.innerHTML = '';
    if (!entries.length) {
      lexiconList.innerHTML = '<div class="fpv-lexicon-empty">Aucune collection trouvée.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    entries.forEach(entry => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fpv-lexicon-item' + (isActiveEntry(entry, cat.id) ? ' active' : '');
      btn.innerHTML = '<b></b><small></small>';
      btn.querySelector('b').textContent = entry.name || 'Collection';
      btn.querySelector('small').textContent = entry.meta || '';
      btn.addEventListener('click', () => {
        const target = entryTarget(entry, cat.id);
        if (target === location.pathname.split('/').pop() + location.search) {
          closeLexicon();
          return;
        }
        location.href = target;
      });
      frag.appendChild(btn);
    });
    lexiconList.appendChild(frag);
    const active = lexiconList.querySelector('.active');
    if (active && !q) requestAnimationFrame(() => active.scrollIntoView({block:'center'}));
  }

  if (lexiconCatalogue) {
    lexiconCatalogue.innerHTML = '';
    lexiconData.catalogues.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.label;
      if (cat.id === currentCatalogueId) opt.selected = true;
      lexiconCatalogue.appendChild(opt);
    });
    lexiconCatalogue.addEventListener('change', () => {
      lexiconSearch.value = '';
      renderLexicon('');
    });
  }
  lexiconSearch?.addEventListener('input', () => renderLexicon(lexiconSearch.value));
  renderLexicon('');

  title.textContent = titleParam ? titleParam : source.label;
  subtitle.textContent = source.label;
  nativeLink.href = source.native || source.url;
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
    renderLexicon(lexiconSearch?.value || '');

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