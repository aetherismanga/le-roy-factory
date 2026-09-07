(() => {
  'use strict';
  if (window.__LRF_VIEW_V2_POLISH__) return;
  window.__LRF_VIEW_V2_POLISH__ = true;

  const modal = document.getElementById('product-modal-v2');
  const grid = document.getElementById('partner-products');
  if (!modal) return;

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function polishCards() {
    if (!grid || !Array.isArray(window.VIEW_CATALOGUE) || !window.VIEW_HD_GALLERIES) return;
    grid.querySelectorAll('[data-view-id]').forEach(card => {
      const product = window.VIEW_CATALOGUE.find(p => p.id === card.dataset.viewId);
      const hero = window.VIEW_HD_GALLERIES[norm(product?.name || product?.collection)]?.[0];
      const img = card.querySelector(':scope > img');
      if (img && hero && img.dataset.viewHdHero !== hero) {
        img.dataset.viewHdHero = hero;
        img.src = hero;
      }
    });
  }

  function polishModal() {
    const card = modal.querySelector('.view-modal-card[data-view-modal="1"]');
    if (!card) return;

    card.querySelectorAll('.elios-gallery-prev').forEach(el => el.classList.add('elios-gallery-nav','prev'));
    card.querySelectorAll('.elios-gallery-next').forEach(el => el.classList.add('elios-gallery-nav','next'));
    card.querySelectorAll('.elios-gallery-count').forEach(el => el.classList.add('elios-gallery-counter'));
    card.querySelectorAll('.elios-gallery-mobile-help').forEach(el => el.classList.add('elios-gallery-caption'));

    const gallery = card.querySelector('[data-view-gallery]');
    if (gallery && gallery.dataset.heroPolished !== '1') {
      gallery.dataset.heroPolished = '1';
      const buttons = [...gallery.querySelectorAll('[data-view-thumb]')];
      const preferred = buttons.find(b => /(?:2000x|2000-|amb|living|room|esterno|giardino)/i.test(b.querySelector('img')?.src || ''))
        || buttons.find(b => !/assets\/img\/view\.png/i.test(b.querySelector('img')?.src || ''));
      if (preferred && !preferred.classList.contains('active')) preferred.click();
    }
  }

  const polish = () => { polishCards(); polishModal(); };
  new MutationObserver(polishModal).observe(modal, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  if (grid) new MutationObserver(polishCards).observe(grid, {childList:true, subtree:true});
  document.addEventListener('click', () => setTimeout(polish, 0), true);
  polish();
})();
