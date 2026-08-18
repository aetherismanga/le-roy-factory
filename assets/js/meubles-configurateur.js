(() => {
  const STORAGE_KEY = 'lrfFurnitureConfiguratorStateV1';
  const STEP_KEYS = ['collection', 'dimension', 'color', 'finish'];
  const STEP_META = [
    { key: 'collection', title: 'Choisissez une collection', subtitle: 'ANIMA ou DNA : vous pourrez revenir en arrière à tout moment.' },
    { key: 'dimension', title: 'Choisissez les dimensions', subtitle: 'Seules les dimensions compatibles avec la collection choisie sont proposées.' },
    { key: 'color', title: 'Choisissez une couleur', subtitle: 'La liste s’adapte automatiquement aux choix précédents.' },
    { key: 'finish', title: 'Choisissez une finition', subtitle: 'Impossible de sélectionner une finition qui ne correspond à aucune composition.' },
    { key: 'summary', title: 'Votre sélection', subtitle: 'Voici les compositions compatibles avec vos critères.' }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const unique = values => [...new Set(values.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }));

  const products = (Array.isArray(window.NEOBATH_CATALOGUE) ? window.NEOBATH_CATALOGUE : [])
    .filter(product => product && product.productType === 'Meuble salle de bain');

  if (!products.length) return;

  let state = loadState();
  let lastFurnitureProductId = null;
  let overlay = null;

  function emptyState() {
    return {
      step: 0,
      collection: null,
      dimension: null,
      color: null,
      finish: null,
      originProductId: null
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? { ...emptyState(), ...parsed } : emptyState();
    } catch (_) {
      return emptyState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    updateLauncherLabel();
  }

  function resetState() {
    state = emptyState();
    saveState();
    renderWizard();
  }

  function matchesSelection(product, uptoKey = null) {
    const checks = [
      ['collection', value => norm(product.collection) === norm(value)],
      ['dimension', value => (product.dimensions || []).some(item => norm(item) === norm(value))],
      ['color', value => (product.colors || []).some(item => norm(item) === norm(value))],
      ['finish', value => (product.finishes || []).some(item => norm(item) === norm(value))]
    ];

    for (const [key, test] of checks) {
      if (state[key] && !test(state[key])) return false;
      if (uptoKey === key) break;
    }
    return true;
  }

  function candidatesBefore(stepKey) {
    const index = STEP_KEYS.indexOf(stepKey);
    return products.filter(product => {
      for (let i = 0; i < index; i += 1) {
        const key = STEP_KEYS[i];
        const value = state[key];
        if (!value) continue;
        if (key === 'collection' && norm(product.collection) !== norm(value)) return false;
        if (key === 'dimension' && !(product.dimensions || []).some(item => norm(item) === norm(value))) return false;
        if (key === 'color' && !(product.colors || []).some(item => norm(item) === norm(value))) return false;
        if (key === 'finish' && !(product.finishes || []).some(item => norm(item) === norm(value))) return false;
      }
      return true;
    });
  }

  function optionsFor(stepKey) {
    const source = candidatesBefore(stepKey);
    if (stepKey === 'collection') return unique(source.map(product => product.collection));
    if (stepKey === 'dimension') return unique(source.flatMap(product => product.dimensions || []));
    if (stepKey === 'color') return unique(source.flatMap(product => product.colors || []));
    if (stepKey === 'finish') return unique(source.flatMap(product => product.finishes || []));
    return [];
  }

  function matchingProducts() {
    return products.filter(product => matchesSelection(product));
  }

  function clearAfter(stepKey) {
    const index = STEP_KEYS.indexOf(stepKey);
    STEP_KEYS.slice(index + 1).forEach(key => { state[key] = null; });
  }

  function validateDownstream() {
    STEP_KEYS.forEach((key, index) => {
      if (!state[key]) return;
      const options = optionsFor(key);
      if (!options.some(option => norm(option) === norm(state[key]))) {
        state[key] = null;
        STEP_KEYS.slice(index + 1).forEach(next => { state[next] = null; });
      }
    });
  }

  function setChoice(stepKey, value) {
    const normalizedValue = value || null;
    if (state[stepKey] === normalizedValue) state[stepKey] = null;
    else state[stepKey] = normalizedValue;
    clearAfter(stepKey);
    validateDownstream();
    saveState();
    renderWizard();
  }

  function startWizard(originId = null) {
    const origin = products.find(product => product.id === originId);
    if (originId) {
      state.originProductId = originId;
      if (!state.collection && origin?.collection) state.collection = origin.collection;
      validateDownstream();
      saveState();
    }
    ensureOverlay();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('furniture-config-open');
    renderWizard();
  }

  function closeWizard() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('furniture-config-open');
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'furniture-configurator';
    overlay.className = 'furniture-configurator';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="furniture-config-shell" role="dialog" aria-modal="true" aria-labelledby="furniture-config-title"><div id="furniture-config-content"></div></div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeWizard();
      const choice = event.target.closest('[data-config-choice]');
      if (choice) setChoice(choice.dataset.key, choice.dataset.value || '');
      const action = event.target.closest('[data-config-action]');
      if (!action) return;
      const type = action.dataset.configAction;
      if (type === 'close') closeWizard();
      if (type === 'reset') resetState();
      if (type === 'previous') {
        state.step = Math.max(0, state.step - 1);
        saveState();
        renderWizard();
      }
      if (type === 'next') {
        state.step = Math.min(STEP_META.length - 1, state.step + 1);
        saveState();
        renderWizard();
      }
      if (type === 'edit-step') {
        state.step = Math.max(0, Math.min(STEP_META.length - 1, Number(action.dataset.step || 0)));
        saveState();
        renderWizard();
      }
      if (type === 'view-product') viewProduct(action.dataset.productId);
    });
  }

  function progressHtml() {
    return `<div class="furniture-progress" aria-label="Progression du configurateur">
      ${STEP_META.map((item, index) => `<button type="button" data-config-action="edit-step" data-step="${index}" class="furniture-progress-step ${index === state.step ? 'active' : ''} ${index < state.step ? 'done' : ''}" aria-label="Étape ${index + 1} : ${esc(item.title)}"><span>${index < state.step ? '✓' : index + 1}</span><small>${index === 4 ? 'Récap' : ['Collection','Dimensions','Couleur','Finition'][index]}</small></button>`).join('')}
    </div>`;
  }

  function currentSelectionChips() {
    const labels = [
      ['Collection', state.collection, 0],
      ['Dimensions', state.dimension, 1],
      ['Couleur', state.color, 2],
      ['Finition', state.finish, 3]
    ].filter(([, value]) => value);
    if (!labels.length) return '<span class="furniture-no-selection">Aucun critère imposé pour le moment.</span>';
    return labels.map(([label, value, step]) => `<button type="button" class="furniture-selection-chip" data-config-action="edit-step" data-step="${step}"><strong>${esc(label)}</strong> ${esc(value)} <span>✎</span></button>`).join('');
  }

  function optionCards(stepKey) {
    const options = optionsFor(stepKey);
    const selected = state[stepKey];
    const compatibleCount = matchingProducts().length;
    if (!options.length) {
      return `<div class="furniture-empty-step"><strong>Aucune option spécifique disponible à cette étape.</strong><p>Vous pouvez continuer : les compositions compatibles restent affichées.</p></div>`;
    }

    return `<div class="furniture-options">
      <button type="button" class="furniture-option ${!selected ? 'selected' : ''}" data-config-choice data-key="${esc(stepKey)}" data-value=""><span class="furniture-option-check">${!selected ? '✓' : ''}</span><strong>Sans préférence</strong><small>Afficher toutes les possibilités compatibles</small></button>
      ${options.map(value => {
        const fakeState = { ...state, [stepKey]: value };
        const count = products.filter(product => {
          if (fakeState.collection && norm(product.collection) !== norm(fakeState.collection)) return false;
          if (fakeState.dimension && !(product.dimensions || []).some(item => norm(item) === norm(fakeState.dimension))) return false;
          if (fakeState.color && !(product.colors || []).some(item => norm(item) === norm(fakeState.color))) return false;
          if (fakeState.finish && !(product.finishes || []).some(item => norm(item) === norm(fakeState.finish))) return false;
          return true;
        }).length;
        const isSelected = selected && norm(selected) === norm(value);
        return `<button type="button" class="furniture-option ${isSelected ? 'selected' : ''}" data-config-choice data-key="${esc(stepKey)}" data-value="${esc(value)}"><span class="furniture-option-check">${isSelected ? '✓' : ''}</span><strong>${esc(value)}</strong><small>${count} composition${count > 1 ? 's' : ''} compatible${count > 1 ? 's' : ''}</small></button>`;
      }).join('')}
    </div><div class="furniture-compatible-note">${compatibleCount} composition${compatibleCount > 1 ? 's' : ''} compatible${compatibleCount > 1 ? 's' : ''} avec votre sélection actuelle.</div>`;
  }

  function summaryHtml() {
    const matches = matchingProducts();
    return `<div class="furniture-summary">
      <div class="furniture-summary-selections">${currentSelectionChips()}</div>
      <div class="furniture-result-heading"><div><strong>${matches.length}</strong> composition${matches.length > 1 ? 's' : ''} compatible${matches.length > 1 ? 's' : ''}</div><span>Vous pouvez modifier n’importe quelle étape sans perdre les autres choix compatibles.</span></div>
      <div class="furniture-results">
        ${matches.length ? matches.map(product => resultCard(product)).join('') : '<div class="furniture-no-result"><strong>Aucune composition exacte.</strong><p>Revenez à une étape précédente et choisissez « Sans préférence » sur un critère.</p></div>'}
      </div>
    </div>`;
  }

  function resultCard(product) {
    const image = (product.images || [])[0] || 'assets/img/02.png';
    return `<article class="furniture-result-card">
      <div class="furniture-result-image"><img src="${esc(image)}" alt="${esc(product.name)}" loading="lazy"></div>
      <div class="furniture-result-body"><span class="furniture-result-brand">NEOBATH · ${esc(product.collection || '')}</span><h4>${esc(product.name)}</h4><p>${esc(product.description || '')}</p>
        <div class="furniture-result-tags">${[...(product.dimensions || []).slice(0, 1), ...(product.colors || []).slice(0, 2), ...(product.finishes || []).slice(0, 2)].map(item => `<span>${esc(item)}</span>`).join('')}</div>
        <button type="button" class="furniture-view-product" data-config-action="view-product" data-product-id="${esc(product.id)}">Voir cette composition dans Inspirations →</button>
      </div>
    </article>`;
  }

  function renderWizard() {
    if (!overlay) return;
    const content = $('#furniture-config-content', overlay);
    const meta = STEP_META[state.step];
    const stepKey = STEP_KEYS[state.step];
    const body = state.step === 4 ? summaryHtml() : optionCards(stepKey);
    const canGoBack = state.step > 0;
    const isLast = state.step === 4;

    content.innerHTML = `<div class="furniture-config-header">
      <div><span class="furniture-config-kicker">CONFIGURATEUR MEUBLES · NEOBATH</span><h2 id="furniture-config-title">${esc(meta.title)}</h2><p>${esc(meta.subtitle)}</p></div>
      <div class="furniture-header-actions"><button type="button" class="furniture-reset" data-config-action="reset">Recommencer</button><button type="button" class="furniture-close" data-config-action="close" aria-label="Fermer le configurateur">×</button></div>
    </div>
    ${progressHtml()}
    <div class="furniture-current-selection">${currentSelectionChips()}</div>
    <div class="furniture-config-body">${body}</div>
    <div class="furniture-config-footer">
      <button type="button" class="furniture-secondary" data-config-action="close">Quitter</button>
      <div class="furniture-nav-actions">${canGoBack ? '<button type="button" class="furniture-secondary" data-config-action="previous">← Précédent</button>' : ''}${!isLast ? '<button type="button" class="furniture-primary" data-config-action="next">Suivant →</button>' : '<button type="button" class="furniture-primary" data-config-action="close">Terminer</button>'}</div>
    </div>`;
  }

  function viewProduct(productId) {
    if (!productId) return;
    closeWizard();
    $('#modal-close')?.click();
    $('#reset-filters')?.click();
    window.setTimeout(() => {
      const card = document.querySelector(`.product-card[data-id="${CSS.escape(productId)}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => card.click(), 250);
      }
    }, 120);
  }

  function injectGlobalLauncher() {
    if ($('#furniture-config-launcher')) return;
    const panel = $('.inspiration-search-panel');
    if (!panel) return;
    const wrap = document.createElement('div');
    wrap.className = 'furniture-launch-wrap';
    wrap.innerHTML = `<button id="furniture-config-launcher" type="button" class="furniture-launcher"><span class="furniture-launch-icon">▦</span><span><strong>Configurer un meuble de salle de bain</strong><small>Choisissez collection, dimensions, couleur et finition sans risque d’impasse.</small></span><span class="furniture-launch-arrow">→</span></button>`;
    panel.insertAdjacentElement('afterend', wrap);
    $('#furniture-config-launcher')?.addEventListener('click', () => startWizard());
    updateLauncherLabel();
  }

  function updateLauncherLabel() {
    const button = $('#furniture-config-launcher');
    if (!button) return;
    const strong = $('strong', button);
    const hasSelection = STEP_KEYS.some(key => !!state[key]);
    if (strong) strong.textContent = hasSelection ? 'Reprendre mon configurateur meuble' : 'Configurer un meuble de salle de bain';
  }

  function rememberFurnitureCard(event) {
    const card = event.target?.closest?.('.product-card[data-id^="neobath-"]');
    if (card) lastFurnitureProductId = card.dataset.id;
  }

  function injectModalLauncher() {
    const dialog = $('#product-dialog');
    if (!dialog || $('#modal-furniture-configure', dialog)) return;
    const brand = $('.modal-brand', dialog)?.textContent || '';
    const title = $('h2', dialog)?.textContent || '';
    if (!norm(brand).includes('neobath')) return;
    const product = products.find(item => item.id === lastFurnitureProductId) || products.find(item => norm(item.name) === norm(title));
    if (!product) return;

    const info = $('.modal-info', dialog);
    if (!info) return;
    const button = document.createElement('button');
    button.id = 'modal-furniture-configure';
    button.type = 'button';
    button.className = 'modal-furniture-configure';
    button.innerHTML = '<span>▦</span><span><strong>Configurer mon meuble</strong><small>Partir de cette composition et explorer uniquement les options compatibles.</small></span><span>→</span>';
    button.addEventListener('click', () => startWizard(product.id));
    info.appendChild(button);
  }

  document.addEventListener('click', rememberFurnitureCard, true);
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target?.closest?.('.product-card[data-id^="neobath-"]')) rememberFurnitureCard(event);
    if (event.key === 'Escape' && overlay?.classList.contains('open')) {
      event.stopPropagation();
      closeWizard();
    }
  }, true);

  const observer = new MutationObserver(() => injectModalLauncher());
  const dialog = $('#product-dialog');
  if (dialog) observer.observe(dialog, { childList: true, subtree: true });

  injectGlobalLauncher();
  injectModalLauncher();
})();
