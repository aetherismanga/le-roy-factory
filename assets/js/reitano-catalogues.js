(() => {
  const ROBINETTERIE_URL = 'assets/pdf/REITANO-Robinetterie-2026.pdf';
  const ACCESSOIRES_URL = 'assets/pdf/REITANO-Accessoire-2026-Catalogue.pdf';

  function install() {
    const grid = document.getElementById('grid-catalogues');
    if (!grid || grid.querySelector('[data-reitano-catalogue-card]')) return;

    const card = document.createElement('div');
    card.className = 'card-premium';
    card.dataset.reitanoCatalogueCard = '1';
    card.style.cssText = 'background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:4px;padding:2rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;box-shadow:0 4px 20px rgba(0,0,0,.03);min-height:260px;';
    card.innerHTML = `
      <div style="position:absolute;top:1.5rem;right:1.5rem;width:125px;height:58px;background-image:url('assets/img/reitano.svg');background-repeat:no-repeat;background-position:right top;background-size:contain;opacity:1;pointer-events:none;z-index:1;"></div>
      <div style="position:relative;z-index:2;padding-right:105px;">
        <span style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#708273;font-weight:600;">Italie</span>
        <h3 style="font-size:1.25rem;margin:.5rem 0 1rem;color:#1a2530;">Reitano Rubinetterie</h3>
        <p style="font-size:.9rem;color:#555;margin-bottom:1.5rem;">Robinetterie italienne et accessoires de salle de bain.</p>
      </div>
      <div style="position:relative;z-index:2;">
        <details class="catalogue-picker">
          <summary>☰ Voir les catalogues <span style="font-weight:600;color:#80611c;">2</span></summary>
          <div class="catalogue-menu">
            <div class="catalogue-row"><div><strong>Catalogue Robinetterie 2026</strong><span>Catalogue général Reitano Rubinetterie 2026.</span></div><a href="${ROBINETTERIE_URL}" target="_blank" rel="noopener" class="catalogue-link">PDF</a></div>
            <div class="catalogue-row"><div><strong>Catalogue Accessoires 2026</strong><span>Accessoires et compléments pour la salle de bain.</span></div><a href="${ACCESSOIRES_URL}" target="_blank" rel="noopener" class="catalogue-link">PDF</a></div>
          </div>
        </details>
      </div>`;
    grid.appendChild(card);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
