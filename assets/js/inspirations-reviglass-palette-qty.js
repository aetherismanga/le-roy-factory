(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_PALETTE_QTY__) return;
  window.__LRF_REVIGLASS_PALETTE_QTY__ = true;

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

      paletteCell.querySelector('.reviglass-palette-qty')?.remove();
      if (!qty) return;

      const badge = document.createElement('span');
      badge.className = 'reviglass-palette-qty';
      badge.textContent = qty;
      paletteCell.appendChild(badge);
    });
  }

  function install() {
    ensureStyle();
    const observer = new MutationObserver(() => requestAnimationFrame(apply));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', () => setTimeout(apply, 0), true);
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
