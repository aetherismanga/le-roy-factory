(() => {
  'use strict';

  const CATALOGUE_URL = 'uptrend-catalogue-interactif.html';
  const TECH_URL = 'https://artesinna.fr/wp-content/uploads/2023/09/UPTREND-Photo-Schema-Technique-2023.pdf';
  const PRO_URL = 'tarifs-pro.html?partner=UPTREND';
  const LOGO = 'assets/img/uptrend.svg';
  const COVER = 'assets/img/uptrend-catalogue-2026.jpg?v=20260913-ui2';
  const CART_URL = 'uptrend-commande.html';
  const CART_KEY = 'lrfUptrendCartV1';
  let sanitaryActive = false;

  const $ = selector => document.querySelector(selector);

  function hasProAccess() {
    try {
      return !!JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
    } catch (_) {
      return false;
    }
  }

  function ensureStyles() {
    if (document.getElementById('lrf-uptrend-premium-ui')) return;
    const style = document.createElement('style');
    style.id = 'lrf-uptrend-premium-ui';
    style.textContent = `
      body.lrf-uptrend-view #workspace-pro-link{display:none!important}
      body.lrf-uptrend-view #v2-filters{display:none!important}
      body.lrf-uptrend-view .workspace-results>.results-title{display:none!important}
      body.lrf-uptrend-view #partner-products{display:block!important;width:100%;max-width:none!important}
      body.lrf-uptrend-view #partner-workspace{overflow:visible}
      body.lrf-uptrend-view #mobile-partner-trigger{
        background:linear-gradient(180deg,#fffefb 0%,#faf5eb 100%)!important;
        color:#1d2730!important;border:1px solid rgba(190,151,55,.62)!important;
        box-shadow:0 8px 22px rgba(72,54,25,.08)!important;
        border-radius:18px!important;font-weight:850!important
      }
      body.lrf-uptrend-view #mobile-partner-trigger:hover,
      body.lrf-uptrend-view #mobile-partner-trigger:focus{background:#fff!important;border-color:#b88920!important;color:#111b24!important}
      body.lrf-uptrend-view #partner-grid .partner-card{
        background:rgba(255,255,255,.94)!important;color:#17232c!important;
        border-color:rgba(188,150,59,.35)!important;box-shadow:0 8px 24px rgba(69,54,30,.07)!important
      }
      body.lrf-uptrend-view #partner-grid .partner-card strong{color:#17232c!important}
      body.lrf-uptrend-view #partner-grid .partner-card small{color:#746d63!important}
      body.lrf-uptrend-view #partner-grid .partner-card .access{color:#24714d!important}
      body.lrf-uptrend-view #workspace-pro-badge{
        background:#eaf8ef!important;color:#24714d!important;border:1px solid #a8dcc0!important;
        box-shadow:none!important;font-weight:850!important
      }
      .uptrend-doc-shell{
        width:100%;box-sizing:border-box;background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(252,248,239,.96));
        border:1px solid rgba(190,151,55,.42);border-radius:28px;padding:clamp(18px,3vw,32px);
        box-shadow:0 16px 42px rgba(65,50,28,.10);overflow:hidden;position:relative
      }
      .uptrend-doc-shell:before{content:"";position:absolute;inset:0 auto auto 0;width:42%;height:4px;background:linear-gradient(90deg,#bd9130,#ead493,transparent)}
      .uptrend-doc-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:22px;margin-bottom:22px}
      .uptrend-doc-copy{min-width:0}.uptrend-kicker{display:inline-block;color:#9a721d;font-size:.72rem;font-weight:900;letter-spacing:.14em;margin-bottom:8px}
      .uptrend-doc-intro h3{margin:0;color:#17232c;font-size:clamp(1.45rem,3.2vw,2.25rem);line-height:1.08;letter-spacing:-.02em}
      .uptrend-doc-intro p{margin:10px 0 0;color:#716b62;font-size:clamp(.92rem,1.65vw,1.08rem);line-height:1.5;max-width:720px}
      .uptrend-doc-logo{width:min(190px,25vw);height:64px;object-fit:contain;object-position:right center;flex:0 0 auto}
      .uptrend-doc-layout{display:grid;grid-template-columns:minmax(220px,.78fr) minmax(310px,1.22fr);gap:22px;align-items:stretch}
      .uptrend-cover-card{position:relative;display:block;min-height:360px;border-radius:22px;overflow:hidden;background:#7f1227;border:1px solid rgba(154,114,29,.32);box-shadow:0 12px 28px rgba(71,49,27,.14);text-decoration:none}
      .uptrend-cover-card>img{width:100%;height:100%;min-height:360px;display:block;object-fit:cover;object-position:center top;transition:transform .28s ease}
      .uptrend-cover-card:hover>img{transform:scale(1.018)}
      .uptrend-cover-caption{position:absolute;left:12px;right:12px;bottom:12px;padding:11px 13px;border-radius:14px;background:rgba(255,255,255,.94);box-shadow:0 6px 18px rgba(0,0,0,.10);color:#17232c}
      .uptrend-cover-caption strong,.uptrend-cover-caption small{display:block}.uptrend-cover-caption strong{font-size:.96rem}.uptrend-cover-caption small{margin-top:2px;color:#746d63;font-size:.76rem}
      .uptrend-actions{display:grid;grid-template-rows:repeat(3,1fr);gap:12px}
      .uptrend-action{display:grid;grid-template-columns:54px 1fr 24px;align-items:center;gap:13px;min-height:94px;padding:16px 17px;border-radius:20px;background:rgba(255,255,255,.96);border:1px solid rgba(190,151,55,.30);box-shadow:0 7px 20px rgba(59,48,30,.06);color:#17232c;text-decoration:none;transition:transform .17s ease,border-color .17s ease,box-shadow .17s ease}
      .uptrend-action:hover,.uptrend-action:focus{transform:translateY(-2px);border-color:rgba(173,129,27,.65);box-shadow:0 10px 24px rgba(59,48,30,.10)}
      .uptrend-action-icon{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#fbf2dc;border:1px solid #ead6a2;color:#936c18;font-weight:950;font-size:1.2rem}
      .uptrend-action-copy{min-width:0}.uptrend-action-copy strong,.uptrend-action-copy small{display:block}.uptrend-action-copy strong{font-size:1rem;line-height:1.2;color:#17232c}.uptrend-action-copy small{margin-top:4px;color:#746d63;font-size:.78rem;line-height:1.3}
      .uptrend-action-arrow{font-size:2rem;line-height:1;color:#ad8223;text-align:right}
      .uptrend-action-pro.is-open{background:linear-gradient(135deg,#f1fbf5,#eaf8ef);border-color:#b6ddc5}
      .uptrend-action-pro.is-open .uptrend-action-icon{background:#e0f4e7;border-color:#b6ddc5;color:#24714d}
      .uptrend-cart-button{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px;padding:15px 18px;border-radius:16px;background:#651f2a;color:#fff;text-decoration:none;font-weight:850;box-shadow:0 8px 22px rgba(71,21,29,.18)}
      .uptrend-cart-button b{color:#f1d398}
      @media(max-width:700px){
        body.lrf-uptrend-view #partner-panel{background:rgba(255,255,255,.90)!important}
        body.lrf-uptrend-view #mobile-partner-trigger{min-height:62px!important;padding:13px 18px!important;font-size:1rem!important}
        body.lrf-uptrend-view .workspace-head{gap:14px!important}
        .uptrend-doc-shell{border-radius:22px;padding:16px 14px 18px}
        .uptrend-doc-intro{gap:10px;margin-bottom:15px}.uptrend-doc-logo{width:104px;height:46px}.uptrend-kicker{font-size:.64rem;margin-bottom:5px}
        .uptrend-doc-intro h3{font-size:1.35rem}.uptrend-doc-intro p{font-size:.88rem;line-height:1.4;margin-top:7px}
        .uptrend-doc-layout{grid-template-columns:minmax(116px,.62fr) minmax(0,1.38fr);gap:10px}
        .uptrend-cover-card,.uptrend-cover-card>img{min-height:285px}.uptrend-cover-card{border-radius:17px}.uptrend-cover-caption{left:7px;right:7px;bottom:7px;padding:8px 9px;border-radius:11px}.uptrend-cover-caption strong{font-size:.78rem}.uptrend-cover-caption small{font-size:.65rem}
        .uptrend-actions{gap:8px}.uptrend-action{grid-template-columns:40px 1fr 14px;gap:8px;min-height:84px;padding:10px 9px;border-radius:16px}.uptrend-action-icon{width:40px;height:40px;font-size:1rem}.uptrend-action-copy strong{font-size:.86rem}.uptrend-action-copy small{font-size:.68rem;line-height:1.2}.uptrend-action-arrow{font-size:1.45rem}
        .uptrend-cart-button{margin-top:15px;padding:13px 15px}
      }
      @media(max-width:375px){
        .uptrend-doc-intro{display:block}.uptrend-doc-logo{display:none}.uptrend-doc-layout{grid-template-columns:1fr}.uptrend-cover-card,.uptrend-cover-card>img{min-height:0;max-height:none}.uptrend-cover-card>img{aspect-ratio:3/4;object-fit:cover}.uptrend-action{min-height:76px}
      }
      @media(prefers-reduced-motion:reduce){.uptrend-cover-card>img,.uptrend-action{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function setFiltersDisabled(disabled) {
    document.querySelectorAll('#v2-filters input, #v2-filters select, #v2-filters button').forEach(el => {
      if (disabled) {
        if (!el.hasAttribute('data-uptrend-disabled')) el.setAttribute('data-uptrend-disabled', el.disabled ? '1' : '0');
        el.disabled = true;
        el.setAttribute('aria-disabled', 'true');
      } else {
        const previous = el.getAttribute('data-uptrend-disabled');
        if (previous === '0') el.disabled = false;
        el.removeAttribute('data-uptrend-disabled');
        el.removeAttribute('aria-disabled');
      }
    });
  }

  function decorateSanitaryCard() {
    const card = document.querySelector('#insp-categories [data-cat="sanitaire"]');
    if (!card) return;
    const meta = card.querySelector('.category-meta, .cat-meta');
    if (meta && meta.textContent !== 'UPTREND') meta.textContent = 'UPTREND';
  }

  function renderSanitary() {
    ensureStyles();
    sanitaryActive = true;
    document.body.classList.add('lrf-uptrend-view');
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
    if (trigger) trigger.innerHTML = '<span>Changer de fabricant</span><span aria-hidden="true">⌄</span>';

    const allowed = hasProAccess();
    grid.innerHTML = `
      <button class="partner-card active" type="button" data-uptrend-partner="1">
        <img src="${LOGO}" alt="UPTREND">
        <span><strong>UPTREND</strong><small>International · céramique sanitaire</small><span class="access ${allowed ? '' : 'locked'}">${allowed ? '✓ Tarif PRO autorisé' : '🔒 Accès PRO requis'}</span></span>
      </button>`;

    workspace.hidden = false;
    workspace.classList.add('open', 'active');
    const logo = $('#workspace-logo');
    if (logo) { logo.src = LOGO; logo.alt = 'UPTREND'; }
    if ($('#workspace-title')) $('#workspace-title').textContent = 'UPTREND';
    if ($('#workspace-sub')) $('#workspace-sub').textContent = 'International · céramique sanitaire';

    const badge = $('#workspace-pro-badge');
    if (badge) {
      badge.textContent = allowed ? '✓ Tarif PRO accessible' : '🔒 Accès PRO requis';
      badge.className = `pro-badge pro-access-badge${allowed ? ' allowed unlocked' : ' locked'}`;
      badge.style.display = 'inline-flex';
    }
    const proLink = $('#workspace-pro-link');
    if (proLink) {
      proLink.href = PRO_URL;
      proLink.textContent = 'Voir tarif PRO UPTREND';
    }

    const count = $('#partner-count');
    if (count) count.textContent = 'Documentation UPTREND';
    const products = $('#partner-products');
    if (products) {
      products.innerHTML = `
        <section class="uptrend-doc-shell" data-uptrend-doc>
          <div class="uptrend-doc-intro">
            <div class="uptrend-doc-copy">
              <span class="uptrend-kicker">DOCUMENTATION 2026</span>
              <h3>Catalogue & documentation UPTREND</h3>
              <p>Retrouvez le catalogue sanitaire 2026, les fiches techniques et votre accès tarifaire professionnel.</p>
            </div>
            <img src="${LOGO}" alt="UPTREND" class="uptrend-doc-logo">
          </div>

          <div class="uptrend-doc-layout">
            <a class="uptrend-cover-card" href="${CATALOGUE_URL}" aria-label="Ouvrir le catalogue interactif UPTREND 2026">
              <img src="${COVER}" alt="Couverture du catalogue UPTREND 2026" loading="lazy">
              <span class="uptrend-cover-caption"><strong>Catalogue 2026</strong><small>Collection sanitaire</small></span>
            </a>

            <div class="uptrend-actions">
              <a class="uptrend-action" href="${CATALOGUE_URL}">
                <span class="uptrend-action-icon" aria-hidden="true">▤</span>
                <span class="uptrend-action-copy"><strong>Catalogue interactif 2026</strong><small>Parcourir toute la collection UPTREND</small></span>
                <span class="uptrend-action-arrow" aria-hidden="true">›</span>
              </a>
              <a class="uptrend-action" href="${TECH_URL}" target="_blank" rel="noopener">
                <span class="uptrend-action-icon" aria-hidden="true">▧</span>
                <span class="uptrend-action-copy"><strong>Fiches techniques</strong><small>Schémas, dimensions et références</small></span>
                <span class="uptrend-action-arrow" aria-hidden="true">›</span>
              </a>
              <a class="uptrend-action uptrend-action-pro${allowed ? ' is-open' : ''}" href="${PRO_URL}">
                <span class="uptrend-action-icon" aria-hidden="true">€</span>
                <span class="uptrend-action-copy"><strong>Tarif PRO UPTREND</strong><small>${allowed ? 'Accéder à vos tarifs professionnels' : 'Connexion PRO requise'}</small></span>
                <span class="uptrend-action-arrow" aria-hidden="true">›</span>
              </a>
            </div>
          </div>

          <a class="uptrend-cart-button" href="${CART_URL}"><span>Voir le panier</span><b>${cartQuantity()} article${cartQuantity()>1?'s':''} ›</b></a>
        </section>`;
    }
  }

  function cartQuantity() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]').reduce((sum, item) => sum + (Number(item.quantite) || 0), 0); }
    catch (_) { return 0; }
  }

  function leaveSanitary() {
    if (!sanitaryActive) return;
    sanitaryActive = false;
    document.body.classList.remove('lrf-uptrend-view');
    setFiltersDisabled(false);
  }

  function install() {
    ensureStyles();
    const categories = $('#insp-categories');
    const filters = $('#v2-filters');
    if (!categories) return;

    decorateSanitaryCard();
    if (!window.__LRF_UPTREND_SANITARY_OBSERVER__) {
      window.__LRF_UPTREND_SANITARY_OBSERVER__ = new MutationObserver(() => {
        decorateSanitaryCard();
        if (sanitaryActive) renderSanitary();
      });
      window.__LRF_UPTREND_SANITARY_OBSERVER__.observe(categories, { childList: true, subtree: true });
    }

    categories.addEventListener('click', event => {
      const button = event.target.closest('[data-cat]');
      if (!button) return;
      if (button.dataset.cat === 'sanitaire') {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderSanitary();
      } else {
        leaveSanitary();
      }
    }, true);

    if (filters) {
      ['input', 'change', 'click'].forEach(type => filters.addEventListener(type, event => {
        if (!sanitaryActive) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true));
    }

    const requested = new URLSearchParams(location.search).get('partner');
    if (requested && requested.trim().toLowerCase() === 'uptrend') {
      setTimeout(renderSanitary, 0);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
