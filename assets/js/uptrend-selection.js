(() => {
  const CATALOGUE_URL = 'https://artesinna.fr/wp-content/uploads/2026/02/2026-Uptrend-France-Catalogue-Sanitaire-Ceramique.pdf';
  const TECH_URL = 'https://artesinna.fr/wp-content/uploads/2023/09/UPTREND-Photo-Schema-Technique-2023.pdf';
  const LOGO = 'assets/img/uptrend.svg';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let sanitaryActive = false;

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
    if (meta && meta.textContent !== 'UPTREND') meta.textContent = 'UPTREND';
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
    if (trigger) trigger.textContent = '☰ Choisir une usine — UPTREND';

    const allowed = hasProAccess();
    grid.innerHTML = `
      <button class="partner-card active" type="button" data-uptrend-partner="1">
        <img src="${LOGO}" alt="UPTREND">
        <span><strong>UPTREND</strong><small>International</small><span class="access ${allowed ? '' : 'locked'}">${allowed ? '✓ Tarif PRO autorisé' : '🔒 Accès PRO requis'}</span></span>
      </button>`;

    workspace.classList.add('open');
    const logo = $('#workspace-logo');
    if (logo) { logo.src = LOGO; logo.alt = 'UPTREND'; }
    if ($('#workspace-title')) $('#workspace-title').textContent = 'UPTREND';
    if ($('#workspace-sub')) $('#workspace-sub').textContent = 'International · céramique sanitaire';

    const badge = $('#workspace-pro-badge');
    if (badge) {
      badge.textContent = allowed ? '✓ Tarif PRO accessible' : '🔒 Accès PRO requis';
      badge.className = `pro-badge${allowed ? ' allowed' : ''}`;
    }
    const proLink = $('#workspace-pro-link');
    if (proLink) {
      proLink.href = 'tarifs-pro.html';
      proLink.textContent = 'Voir tarif PRO UPTREND';
      proLink.style.display = 'inline-flex';
    }

    const count = $('#partner-count');
    if (count) count.textContent = 'Documentation UPTREND';
    const products = $('#partner-products');
    if (products) {
      products.innerHTML = `
        <div class="empty-partner">
          <img src="${LOGO}" alt="UPTREND">
          <strong>UPTREND — sanitaire céramique</strong>
          <p>Consultez le catalogue 2026 et les fiches techniques pour les vasques, WC, bidets et références sanitaires UPTREND.</p>
          <div style="display:flex;flex-wrap:wrap;gap:.65rem;justify-content:center;">
            <a class="pro-link" href="${CATALOGUE_URL}" target="_blank" rel="noopener">Catalogue 2026</a>
            <a class="pro-link" href="${TECH_URL}" target="_blank" rel="noopener">Fiches techniques</a>
            <a class="pro-link" href="tarifs-pro.html">Tarif PRO UPTREND</a>
          </div>
        </div>`;
    }
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
