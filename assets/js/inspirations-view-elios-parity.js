(() => {
  'use strict';
  if (window.__LRF_VIEW_ELIOS_PARITY__) return;
  window.__LRF_VIEW_ELIOS_PARITY__ = true;

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const compact = value => norm(value).replace(/\s+/g, '');

  const filterCatalogue = value => {
    if (!Array.isArray(value)) return value;
    return value.filter(product => {
      const name = compact(product?.name);
      const collection = compact(product?.collection);
      const source = compact(product?.sourceLabel);
      if (name === 'lux' || name === 'rovereforte') return false;
      if (collection.includes('ilegni') || source.includes('catalogueilegni')) return false;
      return true;
    });
  };

  // Le filtre fonctionne même si ce correctif est chargé avant le fichier de données VIEW.
  if (Array.isArray(window.VIEW_CATALOGUE)) {
    window.VIEW_CATALOGUE = filterCatalogue(window.VIEW_CATALOGUE);
  } else {
    const d = Object.getOwnPropertyDescriptor(window, 'VIEW_CATALOGUE');
    if (!d || d.configurable) {
      let catalogue = window.VIEW_CATALOGUE;
      Object.defineProperty(window, 'VIEW_CATALOGUE', {
        configurable: true,
        enumerable: true,
        get(){ return catalogue; },
        set(value){ catalogue = filterCatalogue(value); }
      });
    }
  }

  // Même logique visuelle que ELIOS : vignette simple, puis détails/tarifs/actions après clic.
  const installStyle = () => {
    if (document.getElementById('lrf-view-elios-parity-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-view-elios-parity-style';
    style.textContent = `
      .view-product-card .view-card-note,
      .view-product-card .view-card-price { display:none !important; }
      .view-product-card { cursor:pointer; }

      .view-actions{
        display:grid !important;
        grid-template-columns:1fr 1fr;
        gap:.55rem !important;
        margin-top:1rem !important;
        padding:.9rem !important;
        border:1px solid #a9d4b9 !important;
        border-radius:12px !important;
        background:#effaf3 !important;
      }
      .view-actions::before{
        content:'Disponibilités & commande VIEW\A Aucun stock VIEW n’est affiché : disponibilité à confirmer auprès de l’usine.';
        white-space:pre-line;
        grid-column:1/-1;
        color:#17653d;
        font-size:.76rem;
        line-height:1.45;
        font-weight:700;
        margin-bottom:.1rem;
      }
      .view-actions::first-line{font-size:.9rem;font-weight:900;}
      .view-actions .view-action.primary,
      .view-actions .view-action.secondary{
        display:flex !important;
        align-items:center;
        justify-content:center;
        min-height:40px;
        border-radius:8px !important;
        font-weight:900 !important;
      }
      .view-actions .view-action.primary{background:#176c40 !important;color:#fff !important;}
      .view-actions .view-action.secondary{background:#fff !important;color:#176c40 !important;border:1px solid #7fb497 !important;}
      .view-actions .view-action.source{grid-column:1/-1;text-align:center;background:transparent !important;color:#625c52 !important;padding:.4rem !important;}
      @media(max-width:620px){
        .view-actions{grid-template-columns:1fr;}
        .view-actions::before,.view-actions .view-action.source{grid-column:auto;}
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };
  installStyle();
})();
