(() => {
  'use strict';
  if (!window.ELIOS_MANUAL_STOCK) return;

  const LABEL = 'Consulter l’usine';
  const STYLE_ID = 'lrf-elios-manual-stock-style';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '.manual-stock-label{display:inline-flex;align-items:center;border-radius:999px;padding:7px 10px;background:#fff3d9;color:#7d5a14;font-size:.74rem;font-weight:950;border:1px solid #ead8a4;white-space:nowrap}';
    document.head.appendChild(style);
  }

  function labelCell(cell) {
    if (!cell) return;
    cell.querySelectorAll('.stock-btn,.stock-value,.production,.stock-note,.stock-error,.order-badge').forEach(el => el.remove());
    const actions = cell.querySelector('.stock-actions');
    if (actions) {
      if (!actions.querySelector('.manual-stock-label')) actions.insertAdjacentHTML('afterbegin', `<span class="manual-stock-label">${LABEL}</span>`);
    } else if (!cell.querySelector('.manual-stock-label')) {
      cell.insertAdjacentHTML('afterbegin', `<span class="manual-stock-label">${LABEL}</span>`);
    }
  }

  function apply() {
    document.querySelectorAll('.stock-cell').forEach(labelCell);
  }

  document.addEventListener('click', event => {
    if (!event.target.closest?.('.stock-btn[data-stock-key],.stock-btn.retry,.stock-btn.refresh-one')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    apply();
  }, true);

  installStyle();
  const observer = new MutationObserver(() => queueMicrotask(apply));
  const start = () => {
    const body = document.getElementById('stock-body');
    if (body) observer.observe(body, { childList:true, subtree:true });
    apply();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
