(() => {
  const TARIF_URL = 'assets/pdf/UPTREND_2026_Tarif_PRO_HT_-50_CONDITIONS.pdf';

  function appendCard() {
    const grid = document.getElementById('grid-tarifs');
    if (!grid || grid.querySelector('[data-uptrend-pro-card]')) return;

    const card = document.createElement('div');
    card.className = 'card-premium';
    card.dataset.uptrendProCard = '1';
    card.style.cssText = 'padding:2rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,.03);';
    card.innerHTML = `
      <div style="position:absolute;top:1.5rem;right:1.5rem;width:110px;height:50px;background-image:url('assets/img/uptrend.svg');background-repeat:no-repeat;background-position:right top;background-size:contain;pointer-events:none;"></div>
      <div style="padding-right:90px;">
        <span style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#708273;font-weight:600;">International</span>
        <h3 style="font-size:1.25rem;margin:.5rem 0 1rem;color:#1A2530;">UPTREND</h3>
        <p style="font-size:.9rem;color:#555;margin-bottom:1.5rem;">Céramique sanitaire : vasques, WC, bidets et solutions design pour la salle de bain.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem;">
        <div class="pro-info-row"><div><strong style="display:block;font-size:.85rem;color:#1A2530;">Grille Tarifaire 2026</strong><span style="font-size:.75rem;color:#666;">Tarif PRO HT 2026 — conditions incluses.</span></div><a href="${TARIF_URL}" class="btn btn-outline" style="font-size:.75rem;padding:.4rem .8rem;white-space:nowrap;">Tarifs</a></div>
        <div class="pro-info-row condition-row"><div><strong style="display:block;font-size:.85rem;color:#1A2530;">Condition</strong><span style="font-size:.78rem;color:#444;"></span></div></div>
      </div>`;
    grid.appendChild(card);
  }

  function watch() {
    const grid = document.getElementById('grid-tarifs');
    if (!grid) return;
    appendCard();
    if (grid.dataset.uptrendObserver) return;
    grid.dataset.uptrendObserver = '1';
    new MutationObserver(appendCard).observe(grid, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
