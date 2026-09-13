(() => {
  const CATALOGUE_URL = 'assets/pdf/UPTREND_Catalogue_2026.pdf';
  const TECH_URL = 'https://artesinna.fr/wp-content/uploads/2023/09/UPTREND-Photo-Schema-Technique-2023.pdf';

  function install() {
    const grid = document.getElementById('grid-catalogues');
    if (!grid || grid.querySelector('[data-uptrend-catalogue-card]')) return;

    const card = document.createElement('div');
    card.className = 'card-premium';
    card.dataset.uptrendCatalogueCard = '1';
    card.style.cssText = 'background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:4px;padding:2rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;box-shadow:0 4px 20px rgba(0,0,0,.03);min-height:260px;';
    card.innerHTML = `
      <div style="position:absolute;top:1.5rem;right:1.5rem;width:110px;height:50px;background-image:url('assets/img/uptrend.svg');background-repeat:no-repeat;background-position:right top;background-size:contain;opacity:1;pointer-events:none;z-index:1;"></div>
      <div style="position:relative;z-index:2;padding-right:90px;">
        <span style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#708273;font-weight:600;">International</span>
        <h3 style="font-size:1.25rem;margin:.5rem 0 1rem;color:#1a2530;">UPTREND</h3>
        <p style="font-size:.9rem;color:#555;margin-bottom:1.5rem;">Céramique sanitaire : vasques, WC, bidets et solutions design pour la salle de bain.</p>
      </div>
      <div style="position:relative;z-index:2;">
        <details class="catalogue-picker">
          <summary>☰ Voir les catalogues <span style="font-weight:600;color:#80611c;">2</span></summary>
          <div class="catalogue-menu">
            <div class="catalogue-row"><div><strong>Catalogue sanitaire 2026</strong><span>Catalogue officiel UPTREND au format PDF.</span></div><a href="${CATALOGUE_URL}" target="_blank" rel="noopener" class="catalogue-link">PDF</a></div>
            <div class="catalogue-row"><div><strong>Fiches techniques &amp; schémas</strong><span>Dimensions et schémas techniques des produits sanitaires.</span></div><a href="${TECH_URL}" target="_blank" rel="noopener" class="catalogue-link">PDF</a></div>
          </div>
        </details>
      </div>`;
    grid.appendChild(card);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
