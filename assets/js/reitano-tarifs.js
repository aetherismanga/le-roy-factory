(() => {
  const TARIF_GENERAL_URL = 'assets/pdf/Reitano%20tarif%20general%202026.pdf';
  const TARIF_ACCESSOIRES_URL = 'assets/pdf/REITANO-Accessoire-2026-Tarif.pdf';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  function hasAccess() {
    try {
      const s = JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
      if (!s) return false;
      if (s.isAdmin === true || s.admin === true) return true;
      const partners = Array.isArray(s.partenaires) ? s.partenaires : [];
      return partners.some(p => ['reitano','reitanorubinetteria'].includes(norm(p)));
    } catch (_) { return false; }
  }

  function appendCard() {
    const grid = document.getElementById('grid-tarifs');
    if (!grid || grid.querySelector('[data-reitano-pro-card]')) return;
    const allowed = hasAccess();

    const card = document.createElement('div');
    card.className = 'card-premium';
    card.dataset.reitanoProCard = '1';
    card.style.cssText = 'padding:2rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,.03);';
    card.innerHTML = `
      <div style="position:absolute;top:1.5rem;right:1.5rem;width:125px;height:58px;background-image:url('assets/img/reitano.svg');background-repeat:no-repeat;background-position:right top;background-size:contain;pointer-events:none;"></div>
      <div style="padding-right:105px;">
        <span style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#708273;font-weight:600;">Italie</span>
        <h3 style="font-size:1.25rem;margin:.5rem 0 1rem;color:#1A2530;">Reitano Rubinetterie</h3>
        <p style="font-size:.9rem;color:#555;margin-bottom:1.5rem;">Robinetterie italienne et accessoires de salle de bain.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem;">
        <div class="pro-info-row"><div><strong style="display:block;font-size:.85rem;color:#1A2530;">Tarif général 2026</strong><span style="font-size:.75rem;color:#666;">Tarif professionnel Reitano Rubinetterie 2026.</span></div>${allowed ? `<a href="${TARIF_GENERAL_URL}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:.75rem;padding:.4rem .8rem;white-space:nowrap;">Tarifs</a>` : '<span style="font-size:.75rem;font-weight:700;color:#8a6c27;">🔒 Accès PRO requis</span>'}</div>
        <div class="pro-info-row"><div><strong style="display:block;font-size:.85rem;color:#1A2530;">Tarif Accessoires 2026</strong><span style="font-size:.75rem;color:#666;">Tarif professionnel des accessoires Reitano.</span></div>${allowed ? `<a href="${TARIF_ACCESSOIRES_URL}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:.75rem;padding:.4rem .8rem;white-space:nowrap;">Tarifs</a>` : '<span style="font-size:.75rem;font-weight:700;color:#8a6c27;">🔒 Accès PRO requis</span>'}</div>
      </div>`;
    grid.appendChild(card);
  }

  function watch() {
    const grid = document.getElementById('grid-tarifs');
    if (!grid) return;
    appendCard();
    if (grid.dataset.reitanoObserver) return;
    grid.dataset.reitanoObserver = '1';
    new MutationObserver(appendCard).observe(grid, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
