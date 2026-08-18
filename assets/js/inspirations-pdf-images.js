(() => {
  if (!window.pdfjsLib) {
    console.warn('PDF.js indisponible : les aperçus NEOBATH resteront sur le visuel de secours.');
    return;
  }
  const pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  const docs = new Map();
  const cache = new Map();

  async function getDoc(url) {
    if (!docs.has(url)) docs.set(url, pdfjsLib.getDocument(url).promise);
    return docs.get(url);
  }

  async function render(url, pageNumber, scale = 1.2, quality = 0.86) {
    const key = `${url}|${pageNumber}|${scale}`;
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

  function hydrate(root = document) {
    const imgs = [...root.querySelectorAll('img[data-pdf][data-pdf-page]:not([data-pdf-ready])')];
    if (!imgs.length) return;
    const load = async img => {
      if (img.dataset.pdfReady) return;
      img.dataset.pdfReady = 'loading';
      try {
        const src = await render(img.dataset.pdf, Number(img.dataset.pdfPage), 0.9, 0.82);
        img.src = src;
        img.dataset.pdfReady = '1';
      } catch (e) {
        console.warn('Aperçu PDF NEOBATH', e);
        img.dataset.pdfReady = 'error';
      }
    };
    if (!('IntersectionObserver' in window)) {
      imgs.forEach(load);
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        load(entry.target);
      });
    }, { rootMargin: '350px 0px' });
    imgs.forEach(img => io.observe(img));
  }

  window.LRF_PDF_IMAGES = { render, hydrate };
})();
