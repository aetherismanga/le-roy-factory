(() => {
  'use strict';
  if (window.__LRF_VIEW_V2_POLISH__) return;
  window.__LRF_VIEW_V2_POLISH__ = true;

  const modal = document.getElementById('product-modal-v2');
  if (!modal) return;

  function polish() {
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

  new MutationObserver(polish).observe(modal, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  document.addEventListener('click', () => setTimeout(polish, 0), true);
  polish();
})();
