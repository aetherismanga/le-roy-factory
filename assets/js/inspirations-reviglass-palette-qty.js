(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_PALETTE_QTY_STABLE_20260914__) return;
  window.__LRF_REVIGLASS_PALETTE_QTY_STABLE_20260914__ = true;

  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  function paletteQty(formatText, supportText) {
    const format = norm(formatText);
    const support = norm(supportText);

    if (format.includes('2525')) {
      if (support.includes('pvc')) return '123 m²/pal.';
      if (support.includes('cordonpolyurethane') || support.includes('papier')) return '108 m²/pal.';
    }

    if (format.includes('55') && support.includes('cordonpolyurethane')) {
      return '81 m²/pal.';
    }

    return '';
  }

  function ensureStyle() {
    if (document.getElementById('lrf-reviglass-palette-qty-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-reviglass-palette-qty-style';
    style.textContent = `
      .reviglass-palette-qty{
        display:inline-flex;
        align-items:center;
        margin-left:7px;
        padding:3px 6px;
        border-radius:999px;
        background:#f3eee3;
        color:#665b4c;
        font-size:.66rem;
        line-height:1;
        font-weight:900;
        white-space:nowrap;
        vertical-align:middle;
      }
      @media(max-width:700px){
        .reviglass-palette-qty{margin-left:5px;font-size:.62rem;padding:3px 5px}
      }
    `;
    document.head.appendChild(style);
  }

  let scheduled = false;
  let modalObserver = null;
  let discoveryObserver = null;

  function apply() {
    const modal = document.getElementById('reviglass-pool-modal');
    if (!modal || !modal.classList.contains('open')) return;

    ensureStyle();
    const formatText = document.getElementById('reviglass-modal-sub')?.textContent || '';

    modal.querySelectorAll('.reviglass-table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return;

      const support = cells[0]?.textContent || '';
      const qty = paletteQty(formatText, support);
      const paletteCell = cells[1];
      if (!paletteCell) return;

      const existing = paletteCell.querySelector('.reviglass-palette-qty');
      if (!qty) {
        if (existing) existing.remove();
        return;
      }

      // IMPORTANT : ne jamais supprimer/recréer le badge s'il est déjà correct.
      // L'ancienne version provoquait ainsi une boucle MutationObserver infinie.
      if (existing) {
        if (existing.textContent !== qty) existing.textContent = qty;
        return;
      }

      const badge = document.createElement('span');
      badge.className = 'reviglass-palette-qty';
      badge.textContent = qty;
      paletteCell.appendChild(badge);
    });
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  function observeModal() {
    const modal = document.getElementById('reviglass-pool-modal');
    if (!modal) return false;
    if (modal.dataset.lrfPaletteObserver === '1') {
      scheduleApply();
      return true;
    }

    modal.dataset.lrfPaletteObserver = '1';
    modalObserver = new MutationObserver(scheduleApply);
    modalObserver.observe(modal, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    scheduleApply();
    return true;
  }

  function install() {
    ensureStyle();

    if (!observeModal()) {
      discoveryObserver = new MutationObserver(() => {
        if (observeModal()) {
          discoveryObserver.disconnect();
          discoveryObserver = null;
        }
      });
      discoveryObserver.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('click', event => {
      if (event.target.closest('[data-reviglass-id], .reviglass-ref-list span')) {
        setTimeout(() => {
          observeModal();
          scheduleApply();
        }, 0);
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();