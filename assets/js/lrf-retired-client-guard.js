(() => {
  'use strict';
  if (window.__LRF_RETIRED_CLIENT_GUARD__) return;
  window.__LRF_RETIRED_CLIENT_GUARD__ = true;

  const CODE = 'LRF-00001';
  const NAME = '4 Rue Berlioz';
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function isRetired(text) {
    const t = String(text || '');
    return t.includes(CODE) || norm(t).includes(norm(NAME));
  }

  function clean() {
    document.querySelectorAll('#clients-table-body tr,.client-card,.crm-client-card,[data-client-id]').forEach(el => {
      if (isRetired(el.textContent)) el.remove();
    });
    document.querySelectorAll('option').forEach(o => {
      if (isRetired(o.textContent)) o.remove();
    });
    const modal = document.querySelector('#client-modal');
    if (modal && isRetired(modal.textContent)) {
      modal.style.display = 'none';
      modal.classList.remove('open','show');
    }
  }

  const observer = new MutationObserver(() => requestAnimationFrame(clean));
  const start = () => {
    observer.observe(document.body, { childList:true, subtree:true });
    clean();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
