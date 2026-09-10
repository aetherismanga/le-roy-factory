(() => {
  const catalogue = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const bySlug = slug => catalogue.find(p => p && p.slug === slug);

  const setFormats = (slug, formats, finishesExtra = []) => {
    const product = bySlug(slug);
    if (!product) return;
    product.formats = formats;
    product.finishes = [...new Set([...(product.finishes || []), ...finishesExtra])];
  };

  // Données contrôlées sur le Catalogue Général ELIOS 2026 / pages officielles.
  setFormats('bavaria-stone', ['100x100 · 20 mm R11','50x100 · 20 mm R11','60x120 · 8,5 mm','60x60 · 8,5 mm','30x60 · 8,5 mm','30,5x61 · 8,5 mm','30x30 · 8,5 mm'], ['Outdoor R11 20 mm']);
  setFormats('quercia', ['24x120 · 8,5 mm','23,4x119,5 · 8,5 mm','20,3x90,6 · 8,5 mm','40x120 · 20 mm R11'], ['Outdoor R11 20 mm']);
  setFormats('grand-place', ['100x100 · 20 mm R11','60x60 · 20 mm R11'], ['Outdoor R11 20 mm']);
  setFormats('roma', ['60x120 · 20 mm R11','61x61','40,6x60,9','40,6x40,6','20,3x40,6','20,3x20,3'], ['Outdoor R11 20 mm']);
  setFormats('slate', ['60x120 · 20 mm R11','60x120 · 8,5 mm','60x60 · 8,5 mm','30x60 · 8,5 mm','30,5x60,5 · 8,5 mm','30x30 · 8,5 mm','15x61 · 7,5–11 mm','15x15 · 9 mm','7,5x30 · 8,5 mm'], ['Outdoor R11 20 mm']);
  setFormats('brooklyn', ['100x100 · 8,5 mm','100x100 · 20 mm R11','60x120 · 8,5 mm','60x60 · 8,5 mm','30x60 · 8,5 mm','20,3x40,6 · 8,5 mm R11','20,3x20,3 · 8,5 mm R11','15x61 · 7,5–11 mm'], ['Outdoor R11 20 mm']);

  const sedimenti = bySlug('sedimenti');
  if (sedimenti) {
    const rest = (sedimenti.formats || []).filter(f => !/^60x120$/i.test(String(f).trim()));
    sedimenti.formats = ['60x120 · 20 mm R11', '60x120 · 8,5 mm', ...rest];
    sedimenti.finishes = [...new Set([...(sedimenti.finishes || []), 'Outdoor R11 20 mm'])];
  }

  // Lot 5.
  setFormats('love-decors', ['120x278 · 6,5 mm','60x120 · 10 mm']);
  setFormats('manhattan', ['120x278 · 6,5 mm']);
  setFormats('yosemite', ['23,4x148 · 8,5 mm','23,4x119,5 · 8,5 mm','23,4x95,7 · 8,5 mm','15x85 · 8,5 mm','7,5x40,7 · 8,5 mm']);
  setFormats('shell', ['60x120 · 8,5 mm R10/R11','60x60 · 8,5 mm R10/R11'], ['3D Matt','3D Saten','Outdoor R11']);
  setFormats('terre-etrusche', ['40,6x40,6 · 9 mm R10/R11','20,3x40,6 · 9 mm R10/R11','20,3x20,3 · 9 mm R10/R11','25x22 · 9 mm','35x38 mosaïque']);
  setFormats('allure', ['60x120 · 7 mm']);

  // Lot 6 — dernières séries du Catalogue Général ELIOS 2026.
  setFormats('dust', ['5x20 · 8/9/14 mm','17,5x20 · 9 mm'], ['Soft','Gloss','Dune','Line','Chevron','Exa']);
  setFormats('segmento', ['15x15 · 8,5 mm R9']);
  setFormats('tropical', ['20x20 · 10 mm','6x25 · 10 mm','25x22 · 9,5 mm R10 B'], ['Lucido','Exa']);
  setFormats('twist', ['20x20 · 8,5 mm R10'], ['Mix','Evo','Classic','Pop']);
  setFormats('venere', ['33,3x100 · 7 mm R9'], ['Materica','Dorica','Optica']);

  // AZULI MOOD — catalogue dédié 2026 déjà présent dans assets/pdf.
  // Références de base repérées pour la vérification stock : 04Q5500 (5×15) et 04Q1000 (10×10).
  if (!bySlug('azuli-mood')) {
    catalogue.push({
      name: 'Azuli Mood',
      slug: 'azuli-mood',
      category: 'Ciments / céramiques',
      page: 'Catalogue dédié 2026',
      colors: ['Chalk','Sand','Bone','Thyme Green','Burgundy','Coffee Bean','Blue','Bottle Green','Turquoise','Dusk','Dawn'],
      formats: ['5x15','10x10'],
      finishes: ['Brillant'],
      uses: ['Intérieur','Sol','Mur'],
      description: "L’harmonie de l’authentique imperfection. Un grès cérame effet zellige brillant, décliné en 11 teintes et deux petits formats.",
      gallery: ['azuli-mood-1'],
      catalogueLabel: 'Azuli Mood',
      detailed: true,
      stockCollection: 'azuli-mood',
      stockRefs: [
        { format: '5x15', ref: '04Q5500', pcsBox: 66, sqmBox: 0.50 },
        { format: '10x10', ref: '04Q1000', pcsBox: 60, sqmBox: 0.60 }
      ],
      pdf: 'assets/pdf/AZULI-MOOD_new.pdf'
    });
  }
  window.ELIOS_IMAGE_DATA = window.ELIOS_IMAGE_DATA || {};
  window.ELIOS_IMAGE_DATA['azuli-mood-1'] = window.ELIOS_IMAGE_DATA['azuli-mood-1'] || 'assets/img/03.png';

  // Tarif demandé pour Azuli Mood : 23 € HT/m² sur les deux formats.
  // Le tarif reste masqué pour les comptes qui n'ont pas l'accès Elios.
  function normalise(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function canSeeEliosPrice() {
    try {
      const session = JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
      if (!session || !Array.isArray(session.partenaires)) return false;
      return session.partenaires.some(p => ['elios','eliosceramica'].includes(normalise(p)));
    } catch (_) { return false; }
  }
  function patchAzuliPricing() {
    const api = window.LRF_INSPIRATIONS_PRICING;
    if (!api || api.__azuliMoodPatched || typeof api.getPrice !== 'function') return false;
    const original = api.getPrice.bind(api);
    api.getPrice = function(partner, product, format) {
      const slug = normalise(product?.slug);
      const f = String(format || '').replace(',', '.').match(/\d+(?:\.\d+)?x\d+(?:\.\d+)?/i)?.[0]?.toLowerCase() || normalise(format);
      if (slug === 'azulimood' && (f === '5x15' || f === '10x10')) {
        if (!canSeeEliosPrice()) return { locked: true };
        return { amount: 23, unit: 'net/m²', label: '23,00 € HT/m²', note: 'Tarif Azuli Mood' };
      }
      return original(partner, product, format);
    };
    api.__azuliMoodPatched = true;
    return true;
  }
  let pricingChecks = 0;
  const pricingTimer = setInterval(() => {
    pricingChecks += 1;
    if (patchAzuliPricing() || pricingChecks > 120) clearInterval(pricingTimer);
  }, 100);
  window.addEventListener('lrf-selections-elios-ready', patchAzuliPricing);

  // Visuel Azuli Mood : rendu directement depuis le PDF local afin de ne pas dupliquer les photos.
  const AZULI_PDF = 'assets/pdf/AZULI-MOOD_new.pdf';
  let azuliPdfDoc = null;
  let azuliVisualPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('lrf-azuli-pdfjs');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.pdfjsLib), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = 'lrf-azuli-pdfjs';
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.onload = () => resolve(window.pdfjsLib);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  async function azuliVisual() {
    if (azuliVisualPromise) return azuliVisualPromise;
    azuliVisualPromise = (async () => {
      const pdfjs = await loadPdfJs();
      if (!pdfjs) throw new Error('PDF.js indisponible');
      if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      azuliPdfDoc = azuliPdfDoc || await pdfjs.getDocument(AZULI_PDF).promise;
      const pageNo = Math.min(3, azuliPdfDoc.numPages || 1);
      const page = await azuliPdfDoc.getPage(pageNo);
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.90);
    })();
    return azuliVisualPromise;
  }
  function hydrateAzuliCard() {
    const card = document.querySelector('.product-card-v2[data-id="elios-azuli-mood"]');
    if (!card || card.dataset.azuliPdfVisual === '1' || card.dataset.azuliPdfVisual === 'loading') return;
    const img = card.querySelector('img');
    if (!img) return;
    card.dataset.azuliPdfVisual = 'loading';
    azuliVisual().then(src => {
      if (!document.body.contains(card)) return;
      img.src = src;
      img.removeAttribute('srcset');
      card.dataset.azuliPdfVisual = '1';
    }).catch(() => { card.dataset.azuliPdfVisual = 'error'; });
  }
  function enhanceAzuliModal() {
    const box = document.getElementById('product-modal-v2-card');
    if (!box || normalise(box.querySelector('h2')?.textContent) !== 'azulimood') return;
    const info = box.querySelector('.modal-v2-info');
    const img = box.querySelector('.modal-v2-main > img, img');
    if (img && img.dataset.azuliPdfVisual !== '1') {
      img.dataset.azuliPdfVisual = 'loading';
      azuliVisual().then(src => {
        if (!document.body.contains(img)) return;
        img.src = src;
        img.removeAttribute('srcset');
        img.dataset.azuliPdfVisual = '1';
      }).catch(() => { img.dataset.azuliPdfVisual = 'error'; });
    }
    if (!info) return;

    // Garantit l'affichage du tarif dès la première ouverture, même si le module tarif est encore en chargement.
    if (canSeeEliosPrice()) {
      info.querySelectorAll('.formats-table tbody tr').forEach(row => {
        const f = normalise(row.cells?.[0]?.textContent);
        if (f === '5x15' || f === '10x10') row.cells[1].innerHTML = '<span class="price-ok">23,00 € HT/m²</span>';
      });
    }

    if (!info.querySelector('[data-azuli-stock-block]')) {
      const stock = document.createElement('div');
      stock.dataset.azuliStockBlock = '1';
      stock.style.cssText = 'margin-top:1rem;padding:12px;border:1px solid #e5e2da;border-radius:12px;background:#fffdf9';
      stock.innerHTML = `
        <h4 style="margin:.05rem 0 .55rem">Références catalogue / stock</h4>
        <div class="chips" style="margin-bottom:.7rem"><span>5x15 · 04Q5500</span><span>10x10 · 04Q1000</span></div>
        <p style="margin:0 0 .65rem;font-size:.82rem;color:#6c746f">Conditionnement : 5x15 = 66 pièces / 0,50 m² · 10x10 = 60 pièces / 0,60 m².</p>
        <div style="display:flex;gap:.55rem;flex-wrap:wrap">
          <a class="pro-link" href="disponibilites-elios-lot1.html?collection=azuli-mood">Vérifier le stock</a>
          <a class="pro-link" href="${AZULI_PDF}" target="_blank" rel="noopener">Ouvrir le catalogue Azuli Mood</a>
        </div>`;
      info.appendChild(stock);
    }
  }
  function installAzuliUi() {
    const grid = document.getElementById('partner-products');
    if (grid) {
      new MutationObserver(hydrateAzuliCard).observe(grid, { childList: true, subtree: true });
      hydrateAzuliCard();
    }
    const modalBox = document.getElementById('product-modal-v2-card');
    if (modalBox) new MutationObserver(() => setTimeout(enhanceAzuliModal, 0)).observe(modalBox, { childList: true, subtree: true });
    document.addEventListener('click', event => {
      if (event.target.closest?.('.product-card-v2[data-id="elios-azuli-mood"]')) setTimeout(enhanceAzuliModal, 0);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installAzuliUi, { once: true });
  else installAzuliUi();

  window.ELIOS_THICKNESS_OVERRIDES = { source: 'ELIOS Catalogue Général 2026 + Azuli Mood 2026', updated: '2026-09-11' };

  if (!document.querySelector('script[data-lrf-elios-stock-roma]')) {
    const stockScript = document.createElement('script');
    stockScript.src = 'assets/js/elios-stock-roma-test.js?v=20260907-lot6';
    stockScript.defer = true;
    stockScript.dataset.lrfEliosStockRoma = '1';
    document.head.appendChild(stockScript);
  }
})();