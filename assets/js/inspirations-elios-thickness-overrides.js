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
  setFormats('bavaria-stone', [
    '100x100 · 20 mm R11',
    '50x100 · 20 mm R11',
    '60x120 · 8,5 mm',
    '60x60 · 8,5 mm',
    '30x60 · 8,5 mm',
    '30,5x61 · 8,5 mm',
    '30x30 · 8,5 mm'
  ], ['Outdoor R11 20 mm']);

  setFormats('quercia', [
    '24x120 · 8,5 mm',
    '23,4x119,5 · 8,5 mm',
    '20,3x90,6 · 8,5 mm',
    '40x120 · 20 mm R11'
  ], ['Outdoor R11 20 mm']);

  setFormats('grand-place', [
    '100x100 · 20 mm R11',
    '60x60 · 20 mm R11'
  ], ['Outdoor R11 20 mm']);

  setFormats('roma', [
    '60x120 · 20 mm R11',
    '61x61',
    '40,6x60,9',
    '40,6x40,6',
    '20,3x40,6',
    '20,3x20,3'
  ], ['Outdoor R11 20 mm']);

  // Slate existe dans les deux épaisseurs au même format 60x120.
  setFormats('slate', [
    '60x120 · 20 mm R11',
    '60x120 · 8,5 mm',
    '60x60 · 8,5 mm',
    '30x60 · 8,5 mm',
    '30,5x60,5 · 8,5 mm',
    '30x30 · 8,5 mm',
    '15x61 · 7,5–11 mm',
    '15x15 · 9 mm',
    '7,5x30 · 8,5 mm'
  ], ['Outdoor R11 20 mm']);

  // Brooklyn : 100x100 existe en standard et en dalle extérieure 20 mm.
  setFormats('brooklyn', [
    '100x100 · 8,5 mm',
    '100x100 · 20 mm R11',
    '60x120 · 8,5 mm',
    '60x60 · 8,5 mm',
    '30x60 · 8,5 mm',
    '20,3x40,6 · 8,5 mm R11',
    '20,3x20,3 · 8,5 mm R11',
    '15x61 · 7,5–11 mm'
  ], ['Outdoor R11 20 mm']);

  // Sedimenti : la dalle extérieure 60x120 est proposée en 20 mm en plus des versions standard.
  const sedimenti = bySlug('sedimenti');
  if (sedimenti) {
    const rest = (sedimenti.formats || []).filter(f => !/^60x120$/i.test(String(f).trim()));
    sedimenti.formats = ['60x120 · 20 mm R11', '60x120 · 8,5 mm', ...rest];
    sedimenti.finishes = [...new Set([...(sedimenti.finishes || []), 'Outdoor R11 20 mm'])];
  }

  window.ELIOS_THICKNESS_OVERRIDES = {
    source: 'ELIOS Catalogue Général 2026',
    updated: '2026-09-07'
  };

  // Disponibilités ELIOS : Roma + séries activées par lots.
  if (!document.querySelector('script[data-lrf-elios-stock-roma]')) {
    const stockScript = document.createElement('script');
    stockScript.src = 'assets/js/elios-stock-roma-test.js?v=20260907-lot3';
    stockScript.defer = true;
    stockScript.dataset.lrfEliosStockRoma = '1';
    document.head.appendChild(stockScript);
  }
})();
