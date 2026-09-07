(() => {
  'use strict';
  if (window.__LRF_VIEW_ELIOS_PARITY__) return;
  window.__LRF_VIEW_ELIOS_PARITY__ = true;

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const compact = value => norm(value).replace(/\s+/g, '');

  // VIEW : ne jamais afficher les anciennes gammes I LEGNI demandées comme exclues.
  if (Array.isArray(window.VIEW_CATALOGUE)) {
    window.VIEW_CATALOGUE = window.VIEW_CATALOGUE.filter(product => {
      const name = compact(product?.name);
      const collection = compact(product?.collection);
      const source = compact(product?.sourceLabel);
      if (name === 'lux' || name === 'rovereforte') return false;
      if (collection.includes('ilegni') || source.includes('catalogueilegni')) return false;
      return true;
    });
  }

  // Même logique visuelle que les cartes ELIOS : aucun prix ni disponibilité sur la vignette.
  // Ces informations restent accessibles uniquement après clic dans la fiche produit VIEW.
  const installStyle = () => {
    if (document.getElementById('lrf-view-elios-parity-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-view-elios-parity-style';
    style.textContent = `
      .view-product-card .view-card-note,
      .view-product-card .view-card-price { display:none !important; }
      .view-product-card { cursor:pointer; }
    `;
    (document.head || document.documentElement).appendChild(style);
  };
  installStyle();
})();
