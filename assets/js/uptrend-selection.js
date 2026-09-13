(() => {
  const PARTNERS = {
    uptrend: {
      key: 'uptrend',
      name: 'UPTREND',
      country: 'International',
      subtitle: 'International · céramique sanitaire',
      logo: 'assets/img/uptrend.svg',
      description: 'Consultez le catalogue 2026 et les fiches techniques pour les vasques, WC, bidets et références sanitaires UPTREND.',
      docs: [
        ['Catalogue 2026', 'https://artesinna.fr/wp-content/uploads/2026/02/2026-Uptrend-France-Catalogue-Sanitaire-Ceramique.pdf'],
        ['Fiches techniques', 'https://artesinna.fr/wp-content/uploads/2023/09/UPTREND-Photo-Schema-Technique-2023.pdf']
      ],
      tariffLabel: 'Tarif PRO UPTREND'
    },
    reitano: {
      key: 'reitano',
      name: 'Reitano Rubinetterie',
      country: 'Italie',
      subtitle: 'Italie · robinetterie & accessoires',
      logo: 'assets/img/reitano.svg',
      description: 'Consultez les catalogues Reitano 2026 pour la robinetterie et les accessoires de salle de bain.',
      docs: [
        ['Catalogue Robinetterie 2026', 'assets/pdf/REITANO-Robinetterie-2026.pdf'],
        ['Catalogue Accessoires 2026', 'assets/pdf/REITANO-Accessoire-2026-Catalogue.pdf']
      ],
      tariffLabel: 'Tarifs PRO Reitano'
    }
  };

  let sanitaryActive = false;
  let activePartner = 'uptrend';
  const $ = selector => document.querySelector(selector);

  function hasProAccess() {
    try {
      const session = JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
      return !!session;
    } catch (_) {
      return false;
    }
  }

  function setFiltersDisabled(disabled) {
    document.querySelectorAll('#v2-filters input, #v2-filters select').forEach(el => {
      el.disabled = disabled;
    });
  }

  function decorateSanitaryCard() {
    const card = document.querySelector('#insp-categories [data-cat="sanitaire"]');
    if (!card) return;
    const meta = card.querySelector('.category-meta');
    if (meta && meta.textContent !== 'UPTREND · REITANO') meta.textContent = 'UPTREND · REITANO';
  }

  function renderPartnerCards(grid, allowed) {
    grid.innerHTML = Object.values(PARTNERS).map(partner => `
      <button class="partner-card ${partner.key === activePartner ? 'active' : ''}" type="button" data-sanitary-partner="${partner.key}">
        <img src="${partner.logo}" alt="${partner.name}">
        <span><strong>${partner.name}</strong><small>${partner.country}</small><span class="access ${allowed ? '' : 'locked'}">${allowed ? '✓ Tarif PRO autorisé' : '🔒 Accès PRO requis'}</span></span>
      </button>`).join('');

    grid.querySelectorAll('[data-sanitary-partner]').forEach(button => {
      button.addEventListener('click', () => {
        activePartner = button.dataset.sanitaryPartner || 'uptrend';
        renderSanitary();
      });
    });
  }

  function renderWorkspace(partner, allowed) {
    const workspace = $('#partner-workspace');
    if (!workspace) return;
    workspace.classList.add('open');

    const logo = $('#workspace-logo');
    if (logo) { logo.src = partner.logo; logo.alt = partner.name; }
    if ($('#workspace-title')) $('#workspace-title').textContent = partner.name;
    if ($('#workspace-sub')) $('#workspace-sub').textContent = partner.subtitle;

    const badge = $('#workspace-pro-badge');
    if (badge) {
      badge.textContent = allowed ? '✓ Tarif PRO accessible' : '🔒 Accès PRO requis';
      badge.className = `pro-badge${allowed ? ' allowed' : ''}`;
    }

    const proLink = $('#workspace-pro-link');
    if (proLink) {
      proLink.href = 'tarifs-pro.html';
      proLink.textContent = partner.tariffLabel;
      proLink.style.display = 'inline-flex';
    }

    const count = $('#partner-count');
    if (count) count.textContent = `Documentation ${partner.name}`;

    const products = $('#partner-products');
    if (products) {
      const docs = partner.docs.map(([label, href]) => `<a class="pro-link" href="${href}" target="_blank" rel="noopener">${label}</a>`).join('');
      products.innerHTML = `
        <div class="empty-partner">
          <img src="${partner.logo}" alt="${partner.name}">
          <strong>${partner.name} — sanitaire</strong>
          <p>${partner.description}</p>
          <div style="display:flex;flex-wrap:wrap;gap:.65rem;justify-content:center;">
            ${docs}
            <a class="pro-link" href="tarifs-pro.html">${partner.tariffLabel}</a>
          </div>
        </div>`;
    }
  }

  function renderSanitary() {
    sanitaryActive = true;
    setFiltersDisabled(true);

    document.querySelectorAll('#insp-categories [data-cat]').forEach(card => {
      card.classList.toggle('active', card.dataset.cat === 'sanitaire');
    });

    const panel = $('#partner-panel');
    const grid = $('#partner-grid');
    const workspace = $('#partner-workspace');
    if (!panel || !grid || !workspace) return;

    const panelTitle = $('#partner-panel-title');
    if (panelTitle) panelTitle.textContent = 'Sanitaire';
    const trigger = $('#mobile-partner-trigger');
    if (trigger) trigger.textContent = '☰ Choisir une usine — UPTREND / REITANO';

    const allowed = hasProAccess();
    if (!PARTNERS[activePartner]) activePartner = 'uptrend';
    renderPartnerCards(grid, allowed);
    renderWorkspace(PARTNERS[activePartner], allowed);
  }

  function install() {
    const categories = $('#insp-categories');
    const filters = $('#v2-filters');
    if (!categories) return;

    decorateSanitaryCard();
    new MutationObserver(() => {
      decorateSanitaryCard();
      if (sanitaryActive) renderSanitary();
    }).observe(categories, { childList: true, subtree: true });

    categories.addEventListener('click', event => {
      const button = event.target.closest('[data-cat]');
      if (!button) return;
      if (button.dataset.cat === 'sanitaire') {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderSanitary();
      } else if (sanitaryActive) {
        sanitaryActive = false;
        setFiltersDisabled(false);
      }
    }, true);

    if (filters) {
      ['input', 'change'].forEach(type => filters.addEventListener(type, event => {
        if (!sanitaryActive) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
