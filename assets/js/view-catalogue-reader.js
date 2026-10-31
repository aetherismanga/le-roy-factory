(() => {
  'use strict';
  if (window.LRF_VIEW_CATALOGUE_READER) return;

  const scriptUrl = document.currentScript?.src || new URL('assets/js/view-catalogue-reader.js', document.baseURI).href;
  const vendorUrl = name => new URL('../vendor/lrf-plan-pose/' + name, scriptUrl).href;
  let runtimePromise;
  let activeClose;

  async function compressedModule(url) {
    const response = await fetch(url);
    if (!response.ok) throw Error('Le lecteur est momentanément indisponible.');
    let bytes = await response.arrayBuffer();
    const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
    // Some static hosts apply Content-Encoding to .gz and the browser already
    // decompresses the response. Decompress only when the gzip bytes remain.
    if (signature[0] === 0x1f && signature[1] === 0x8b) {
      if (!window.DecompressionStream) throw Error('Mettez votre navigateur à jour pour afficher les pages du catalogue.');
      bytes = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    if (!bytes.byteLength) throw Error('Le lecteur reçu est vide.');
    return new Blob([bytes], {type: 'text/javascript'});
  }

  function runtime() {
    if (!runtimePromise) {
      runtimePromise = (async () => {
        const [moduleBlob, workerBlob] = await Promise.all([
          compressedModule(vendorUrl('pdf.min.mjs.gz')),
          compressedModule(vendorUrl('pdf.worker.min.mjs.gz'))
        ]);
        const moduleUrl = URL.createObjectURL(moduleBlob);
        try { return {library: await import(moduleUrl), workerBlob}; }
        finally { URL.revokeObjectURL(moduleUrl); }
      })().catch(error => { runtimePromise = null; throw error; });
    }
    return runtimePromise;
  }

  /** Public manufacturer catalogues only; this reader does not grant tariff access.
   * Returns immediately so a pending download or render can be closed. The ready
   * promise resolves to true after the first page is rendered, false on failure.
   */
  function open({url, parts, originalUrl, title = 'Catalogue VIEW', trigger = document.activeElement} = {}) {
    const source = new URL(String(url || ''), document.baseURI);
    if (!url || !['https:', 'http:'].includes(source.protocol)) throw Error('Adresse du catalogue invalide.');
    const downloads = Array.isArray(parts) && parts.length ? parts.map(path=>new URL(path,document.baseURI)) : [source];
    if(downloads.some(part=>!['https:','http:'].includes(part.protocol))) throw Error('Adresse du catalogue invalide.');
    activeClose?.();

    const dialog = document.createElement('dialog');
    dialog.className = 'view-catalogue-reader';
    dialog.setAttribute('aria-labelledby', 'view-catalogue-reader-title');
    dialog.innerHTML = `
      <div class="view-catalogue-reader-layout">
        <div class="view-catalogue-reader-header">
          <div class="view-catalogue-reader-heading"><span>VIEW CERAMICHE</span><h2 id="view-catalogue-reader-title"></h2></div>
          <a class="view-catalogue-reader-original" target="_blank" rel="noopener noreferrer">Ouvrir le PDF</a>
          <button class="view-catalogue-reader-close" type="button" data-reader-close>Fermer</button>
        </div>
        <div class="view-catalogue-reader-toolbar" role="navigation" aria-label="Navigation du catalogue">
          <div class="view-catalogue-reader-pages">
            <button type="button" data-reader-prev aria-label="Page précédente" disabled>←</button>
            <label>Page <input type="number" inputmode="numeric" min="1" value="1" data-reader-page aria-label="Numéro de page" disabled></label>
            <span data-reader-total>/ —</span>
            <button type="button" data-reader-next aria-label="Page suivante" disabled>→</button>
          </div>
          <div class="view-catalogue-reader-zoom">
            <button type="button" data-reader-out aria-label="Réduire le zoom" disabled>−</button>
            <output data-reader-zoom aria-label="Zoom">100 %</output>
            <button type="button" data-reader-in aria-label="Agrandir le zoom" disabled>+</button>
            <button type="button" data-reader-fit disabled>Adapter</button>
          </div>
        </div>
        <div class="view-catalogue-reader-stage" tabindex="0" aria-label="Page du catalogue">
          <div class="view-catalogue-reader-message" role="status">
            <p data-reader-message>Chargement du catalogue…</p>
            <button type="button" data-reader-retry hidden>Réessayer</button>
            <p class="view-catalogue-reader-help" data-reader-help hidden>Vous pouvez aussi ouvrir le PDF original avec le bouton en haut.</p>
          </div>
          <div class="view-catalogue-reader-paper"><canvas hidden></canvas></div>
          <div class="view-catalogue-reader-text" data-reader-text></div>
        </div>
        <p class="view-catalogue-reader-status" role="status" aria-live="polite">Les pages s’affichent à la demande.</p>
      </div>`;
    const $ = selector => dialog.querySelector(selector);
    const canvas = $('canvas');
    const stage = $('.view-catalogue-reader-stage');
    const message = $('.view-catalogue-reader-message');
    const status = $('.view-catalogue-reader-status');
    $('#view-catalogue-reader-title').textContent = String(title);
    const original = originalUrl ? new URL(originalUrl, document.baseURI) : source;
    $('.view-catalogue-reader-original').href = ['https:','http:'].includes(original.protocol) ? original.href : source.href;
    document.body.appendChild(dialog);

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    let closed = false;
    let pdf, loadingTask, pdfWorker, nativeWorker, workerUrl, fetchController;
    let renderTask, renderChain = Promise.resolve(), renderSequence = 0, loadSequence = 0;
    let pageNumber = 1, zoom = 1, resizeTimer;
    let readyResolved = false;
    let resolveReady;
    const ready = new Promise(resolve => { resolveReady = resolve; });
    const finishReady = value => { if (!readyResolved) { readyResolved = true; resolveReady(value); } };

    function controls() {
      const unavailable = !pdf || closed;
      for (const key of ['page', 'out', 'in', 'fit']) $('[data-reader-' + key + ']').disabled = unavailable;
      $('[data-reader-prev]').disabled = unavailable || pageNumber <= 1;
      $('[data-reader-next]').disabled = unavailable || pageNumber >= pdf.numPages;
      $('[data-reader-out]').disabled = unavailable || zoom <= .5;
      $('[data-reader-in]').disabled = unavailable || zoom >= 3;
      $('[data-reader-page]').value = pageNumber;
      $('[data-reader-page]').max = pdf?.numPages || 1;
      $('[data-reader-total]').textContent = pdf ? '/ ' + pdf.numPages : '/ —';
      $('[data-reader-zoom]').textContent = Math.round(zoom * 100) + ' %';
    }

    function announce(text, error = false) {
      if (closed) return;
      message.hidden = false;
      $('[data-reader-message]').textContent = text;
      $('[data-reader-retry]').hidden = !error;
      $('[data-reader-help]').hidden = !error;
    }

    function destroyDocument() {
      fetchController?.abort(); fetchController = null;
      const task = loadingTask;
      loadingTask = null;
      pdf = null;
      try { Promise.resolve(task?.destroy()).catch(() => {}); } catch {}
      try { pdfWorker?.destroy(); } catch {}
      pdfWorker = null;
      nativeWorker?.terminate(); nativeWorker = null;
      if (workerUrl) URL.revokeObjectURL(workerUrl);
      workerUrl = null;
    }

    function close() {
      if (closed) return;
      closed = true;
      ++loadSequence; ++renderSequence;
      clearTimeout(resizeTimer);
      renderTask?.cancel();
      destroyDocument();
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      dialog.close();
      canvas.width = canvas.height = 0;
      dialog.remove();
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      if (trigger?.isConnected) trigger.focus({preventScroll: true});
      trigger = null;
      finishReady(false);
      if (activeClose === close) activeClose = null;
    }

    function requestRender() {
      const sequence = ++renderSequence;
      renderTask?.cancel();
      renderChain = renderChain.catch(() => {}).then(async () => {
        if (closed || !pdf || sequence !== renderSequence) return false;
        const currentPdf = pdf, currentNumber = pageNumber;
        controls(); announce('Affichage de la page ' + currentNumber + '…');
        canvas.hidden = true;
        canvas.width = canvas.height = 0;
        $('[data-reader-text]').textContent = '';
        let page;
        try {
          page = await currentPdf.getPage(currentNumber);
          if (closed || sequence !== renderSequence) return false;
          const natural = page.getViewport({scale: 1});
          const availableWidth = Math.max(240, stage.clientWidth - 32);
          const availableHeight = Math.max(240, stage.clientHeight - 32);
          const fit = Math.min(availableWidth / natural.width, availableHeight / natural.height);
          const viewport = page.getViewport({scale: fit * zoom});
          // Keep a single page and at most four megapixels, including at high
          // zoom on phones. CSS size controls panning independently of memory.
          const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / (viewport.width * viewport.height)), 4096 / Math.max(viewport.width, viewport.height));
          canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
          canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
          canvas.style.width = viewport.width + 'px';
          canvas.style.height = viewport.height + 'px';
          canvas.setAttribute('aria-label', String(title) + ' — page ' + currentNumber + ' sur ' + currentPdf.numPages);
          renderTask = page.render({
            canvasContext: canvas.getContext('2d'), viewport,
            transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0], background: '#ffffff'
          });
          await renderTask.promise;
          if (closed || sequence !== renderSequence) return false;
          canvas.hidden = false; message.hidden = true;
          stage.scrollTop = 0; stage.scrollLeft = 0;
          status.textContent = 'Page ' + currentNumber + ' sur ' + currentPdf.numPages + ' · Photos et détails du catalogue officiel VIEW';
          finishReady(true);
          try {
            const content = await page.getTextContent();
            if (!closed && sequence === renderSequence) $('[data-reader-text]').textContent = content.items.map(item => item.str || '').join(' ');
          } catch {}
          return true;
        } catch (error) {
          if (closed || sequence !== renderSequence || error?.name === 'RenderingCancelledException') return false;
          console.warn('LRF VIEW catalogue page', [error?.name, error?.message, error?.details].filter(Boolean).join(' | '));
          announce('Cette page n’a pas pu être affichée. Réessayez ou ouvrez le PDF original.', true);
          finishReady(false);
          return false;
        } finally {
          if (sequence === renderSequence) renderTask = null;
          try { page?.cleanup(); } catch {}
        }
      });
      return renderChain;
    }

    async function load() {
      const sequence = ++loadSequence;
      ++renderSequence; renderTask?.cancel();
      destroyDocument(); controls();
      announce('Chargement du catalogue…');
      try {
        fetchController = new AbortController();
        const signal = fetchController.signal;
        // Same-origin segments preserve the original PDF bytes while keeping
        // each source object below the repository upload limit. Fetch at most
        // two concurrently, only after the visitor opens the catalogue.
        const bytesPromise = (async () => {
          const buffers=[];
          for(let i=0;i<downloads.length;i+=2){
            const loaded=await Promise.all(downloads.slice(i,i+2).map(async part=>{
              const response=await fetch(part.href,{signal});
              if(!response.ok) throw Error('Le catalogue est momentanément indisponible (HTTP '+response.status+').');
              const buffer=await response.arrayBuffer();
              if(!buffer.byteLength) throw Error('Le document reçu est vide.');
              return new Uint8Array(buffer);
            }));
            buffers.push(...loaded);
            if(!closed && sequence===loadSequence) status.textContent='Chargement du catalogue : '+Math.round(buffers.length/downloads.length*100)+' %';
          }
          const bytes=new Uint8Array(buffers.reduce((size,part)=>size+part.length,0));
          let offset=0;
          buffers.forEach(part=>{bytes.set(part,offset);offset+=part.length;});
          const beginning = new TextDecoder('ascii').decode(bytes.subarray(0, Math.min(1024, bytes.length)));
          if (!beginning.includes('%PDF-')) {
            console.warn('LRF VIEW catalogue response', 'Octets: ' + bytes.length);
            throw Error('Le lien du catalogue ne renvoie pas un PDF valide.');
          }
          return bytes;
        })();
        const [{library, workerBlob}, data] = await Promise.all([runtime(), bytesPromise]);
        if (closed || sequence !== loadSequence) return;
        workerUrl = URL.createObjectURL(workerBlob);
        nativeWorker = new Worker(workerUrl, {type: 'module'});
        pdfWorker = new library.PDFWorker({port: nativeWorker});
        status.textContent = 'Préparation des pages du catalogue…';
        loadingTask = library.getDocument({data, worker: pdfWorker, isEvalSupported: false, useSystemFonts: true, isImageDecoderSupported: false});
        const loaded = await loadingTask.promise;
        if (closed || sequence !== loadSequence) { await loaded.destroy(); return; }
        pdf = loaded;
        pageNumber = Math.min(pageNumber, pdf.numPages);
        controls();
        await requestRender();
      } catch (error) {
        if (closed || sequence !== loadSequence) return;
        console.warn('LRF VIEW catalogue', [error?.name, error?.message, error?.details].filter(Boolean).join(' | '));
        destroyDocument(); controls();
        announce(error?.message?.startsWith('Mettez votre navigateur') ? error.message : 'Le catalogue ne peut pas être affiché ici. Réessayez ou ouvrez le PDF original.', true);
        status.textContent = 'Le PDF original reste accessible avec le bouton en haut.';
        finishReady(false);
      }
    }

    function go(number) {
      if (!pdf || closed) return;
      pageNumber = Math.max(1, Math.min(pdf.numPages, Math.round(Number(number) || 1)));
      requestRender();
    }
    function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(requestRender, 160); }
    function onKey(event) {
      if (closed) return;
      if (event.key === 'Escape') {
        // Existing product modals listen on document; stop Escape before it
        // reaches them so closing this reader preserves the collection sheet.
        event.preventDefault(); event.stopImmediatePropagation(); close(); return;
      }
      if (event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if (['ArrowLeft', 'PageUp', 'ArrowRight', 'PageDown'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        go(pageNumber + (['ArrowLeft', 'PageUp'].includes(event.key) ? -1 : 1));
      }
    }
    $('[data-reader-close]').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    $('[data-reader-prev]').addEventListener('click', () => go(pageNumber - 1));
    $('[data-reader-next]').addEventListener('click', () => go(pageNumber + 1));
    $('[data-reader-page]').addEventListener('change', event => go(event.target.value));
    $('[data-reader-page]').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); go(event.target.value); } });
    for (const [name, difference] of [['out', -.25], ['in', .25]]) {
      $('[data-reader-' + name + ']').addEventListener('click', () => { zoom = Math.max(.5, Math.min(3, zoom + difference)); requestRender(); });
    }
    $('[data-reader-fit]').addEventListener('click', () => { zoom = 1; requestRender(); });
    $('[data-reader-retry]').addEventListener('click', () => pdf ? requestRender() : load());
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    activeClose = close;
    dialog.showModal();
    $('[data-reader-close]').focus();
    load();
    return Object.freeze({ready, close});
  }

  window.LRF_VIEW_CATALOGUE_READER = Object.freeze({open});
})();
