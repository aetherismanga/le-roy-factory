(() => {
  // Safari/iOS refuse actuellement le certificat du sous-domaine www.biopietra.com.
  // On conserve intégralement les chemins (dont les PDF) et on utilise le domaine racine.
  const normalizeBiopietraLink = link => {
    if (!link) return;
    const raw = link.getAttribute('href');
    if (!raw || !/biopietra\.com/i.test(raw)) return;
    try {
      const url = new URL(raw, location.href);
      if (url.hostname.toLowerCase() === 'www.biopietra.com') {
        url.hostname = 'biopietra.com';
        link.setAttribute('href', url.toString());
      }
    } catch (_) {}
  };

  const normalizeBiopietraLinks = root => {
    if (root?.matches?.('a[href]')) normalizeBiopietraLink(root);
    root?.querySelectorAll?.('a[href]').forEach(normalizeBiopietraLink);
  };

  const startBiopietraGuard = () => {
    normalizeBiopietraLinks(document);
    if (!document.documentElement || window.__LRF_BIOPIETRA_LINK_GUARD__) return;
    window.__LRF_BIOPIETRA_LINK_GUARD__ = true;
    new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) normalizeBiopietraLinks(node);
      }));
    }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('click', event => normalizeBiopietraLink(event.target.closest?.('a[href]')), true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startBiopietraGuard, { once: true });
  else startBiopietraGuard();

  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const configuratorPages = new Set([
    'configurateurs.html',
    'configurateur-elios-pose.html',
    'configurateur-croisillons.html',
    'configurateur-plots.html'
  ]);
  const allowed = new Set([
    'index.html','partenaires.html','univers.html','realisations.html',
    'catalogues.html','configurateurs.html','configurateur-elios-pose.html',
    'configurateur-croisillons.html','configurateur-plots.html',
    'tarifs-pro.html','contact.html','agent.html','ouverture-compte.html','promo-cersaie.html'
  ]);
  if (!allowed.has(page)) return;

  const addStylesheet = (id, href) => {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  addStylesheet('lrf-premium-v2-css', 'assets/css/lrf-premium-v2.css?v=20260901-3');
  addStylesheet('lrf-soft-pages-v3-css', 'assets/css/lrf-soft-pages-v3.css?v=20260901-2');
  addStylesheet('lrf-final-v4-css', 'assets/css/lrf-final-v4.css?v=20260901-3');
  addStylesheet('lrf-hotfix-v5-css', 'assets/css/lrf-hotfix-v5.css?v=20260901-5');
  if (window.matchMedia('(max-width: 900px)').matches) {
    addStylesheet('lrf-mobile-public-v8-css', 'assets/css/mobile-public-v8.css?v=20260901-2');
  }
  addStylesheet('lrf-logo-scale-v9-css', 'assets/css/lrf-logo-scale-v9.css?v=20260918-pc-logo2');
  document.documentElement.classList.add('lrf-premium-ready');

  const pageClass = `lrf-page-${page.replace('.html','').replace(/[^a-z0-9-]/g,'-')}`;

  // Rubrique publique renommée : « Inspirations » devient « Sélections ».
  // On conserve univers.html pour ne casser aucun lien existant, mais tous les
  // libellés de navigation (y compris ceux créés dynamiquement sur mobile)
  // affichent désormais le nouveau nom.
  const applySelectionsLabel = root => {
    const links = [];
    if (root?.matches?.('a[href]')) links.push(root);
    root?.querySelectorAll?.('a[href]').forEach(link => links.push(link));

    links.forEach(link => {
      const rawHref = (link.getAttribute('href') || '').trim();
      let targetPage = '';
      try {
        targetPage = (new URL(rawHref, location.href).pathname.split('/').pop() || '').toLowerCase();
      } catch (_) {
        targetPage = rawHref.split('?')[0].split('#')[0].split('/').pop().toLowerCase();
      }
      if (targetPage !== 'univers.html') return;

      const current = (link.textContent || '').trim();
      if (/^inspirations?$/i.test(current) || /^sélections?$/i.test(current) || /^selections?$/i.test(current)) {
        link.textContent = 'Sélections';
      }
      link.setAttribute('aria-label', link.getAttribute('aria-label')?.replace(/inspirations?/gi, 'Sélections') || link.getAttribute('aria-label') || 'Sélections');
      if (link.getAttribute('title')) {
        link.setAttribute('title', link.getAttribute('title').replace(/inspirations?/gi, 'Sélections'));
      }
    });
  };

  const startSelectionsLabelGuard = () => {
    applySelectionsLabel(document);
    if (window.__LRF_SELECTIONS_LABEL_GUARD__ || !document.documentElement) return;
    window.__LRF_SELECTIONS_LABEL_GUARD__ = true;
    new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) applySelectionsLabel(node);
      }));
    }).observe(document.documentElement, { childList: true, subtree: true });
  };

  const installConfiguratorNoFloralTheme = () => {
    if (!configuratorPages.has(page) || document.getElementById('lrf-configurator-no-floral-theme')) return;
    const style = document.createElement('style');
    style.id = 'lrf-configurator-no-floral-theme';
    style.textContent = `
      body.lrf-configurator-page header,
      body.lrf-configurator-page footer{
        position:relative!important;
        overflow:hidden!important;
        background-image:none!important;
        background-color:#090909!important;
        background:
          linear-gradient(118deg,transparent 0 28%,rgba(212,175,55,.10) 28.15% 28.35%,transparent 28.5% 67%,rgba(212,175,55,.08) 67.15% 67.35%,transparent 67.5%),
          radial-gradient(circle at 18% 25%,rgba(212,175,55,.10),transparent 28%),
          linear-gradient(135deg,#050505 0%,#111 48%,#171717 100%)!important;
        color:#fff!important;
        border-color:#d4af37!important;
      }
      body.lrf-configurator-page header::before,
      body.lrf-configurator-page footer::before{
        content:"";
        position:absolute;
        inset:0;
        pointer-events:none;
        background:linear-gradient(90deg,transparent,rgba(255,216,92,.035),transparent);
      }
      body.lrf-configurator-page header .container,
      body.lrf-configurator-page footer .container{position:relative;z-index:1}
      body.lrf-configurator-page header .main-nav a:not(.agent-btn),
      body.lrf-configurator-page header .main-nav>li>a:not(.agent-btn){
        color:#f4f1e8!important;
        text-shadow:none!important;
      }
      body.lrf-configurator-page header .main-nav a:not(.agent-btn):hover,
      body.lrf-configurator-page header .main-nav>li>a:not(.agent-btn):hover{
        color:#f0c85c!important;
      }
      body.lrf-configurator-page header .agent-btn{
        background:#050505!important;
        color:#ffd84f!important;
        border:1px solid #d4af37!important;
        box-shadow:0 0 18px rgba(212,175,55,.12)!important;
      }
      body.lrf-configurator-page header .agent-btn:hover{
        background:#d4af37!important;
        color:#050505!important;
      }
      body.lrf-configurator-page footer p{color:#f3efe4!important;text-shadow:none!important}
    `;
    document.head.appendChild(style);
  };

  const installPromoCersaieNav = () => {
    const nav = document.querySelector('header nav ul');
    if (!nav || nav.querySelector('a[href="promo-cersaie.html"]')) return;

    if (!document.getElementById('lrf-promo-cersaie-nav-style')) {
      const style = document.createElement('style');
      style.id = 'lrf-promo-cersaie-nav-style';
      style.textContent = `
        .main-nav>li.lrf-promo-cersaie-li{margin-right:.35rem!important}
        .main-nav>li>a.lrf-promo-cersaie-nav{
          display:inline-flex!important;align-items:center!important;justify-content:center!important;
          gap:.35rem!important;padding:.62rem .95rem!important;border-radius:999px!important;
          background:linear-gradient(135deg,#dfe8dc,#c9d8c7)!important;
          color:#2f4135!important;border:1px solid #b5c8b4!important;
          box-shadow:0 0 0 2px rgba(255,255,255,.08),0 7px 18px rgba(72,101,77,.18)!important;
          text-shadow:none!important;font-weight:900!important;letter-spacing:.04em!important;
          white-space:nowrap!important;text-decoration:none!important;position:relative!important;
          animation:lrfPromoPulse 2.8s ease-in-out infinite!important;
        }
        .main-nav>li>a.lrf-promo-cersaie-nav::before{content:'✦';font-size:.78rem}
        .main-nav>li>a.lrf-promo-cersaie-nav:hover{
          transform:translateY(-1px)!important;background:linear-gradient(135deg,#e9f0e6,#d5e2d3)!important;
          color:#24352b!important;border-color:#9fb69f!important
        }
        @keyframes lrfPromoPulse{0%,100%{box-shadow:0 0 0 2px rgba(255,255,255,.06),0 7px 18px rgba(72,101,77,.14)}50%{box-shadow:0 0 0 4px rgba(185,201,182,.20),0 8px 24px rgba(72,101,77,.22)}}
        @media(max-width:900px){
          .main-nav>li.lrf-promo-cersaie-li{order:-20;width:100%;margin:0 0 .3rem!important}
          .main-nav>li>a.lrf-promo-cersaie-nav{width:100%!important;padding:.8rem 1rem!important}
        }
      `;
      document.head.appendChild(style);
    }

    const li = document.createElement('li');
    li.className = 'lrf-promo-cersaie-li';
    const link = document.createElement('a');
    link.href = 'promo-cersaie.html';
    link.className = 'lrf-promo-cersaie-nav';
    link.textContent = 'PROMO CERSAIE';
    if (page === 'promo-cersaie.html') link.setAttribute('aria-current','page');
    li.appendChild(link);
    nav.insertBefore(li, nav.firstElementChild);
  };

  const installConfigurateursNav = () => {
    const nav = document.querySelector('header nav ul');
    if (!nav || nav.querySelector('a[href="configurateurs.html"]')) return;
    const catalogues = nav.querySelector('a[href="catalogues.html"]');
    const pro = nav.querySelector('a[href="tarifs-pro.html"],a[href^="tarifs-pro.html?"]');
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = 'configurateurs.html';
    link.textContent = 'Configurateurs';
    li.appendChild(link);
    if (pro?.parentElement) nav.insertBefore(li, pro.parentElement);
    else if (catalogues?.parentElement?.nextSibling) nav.insertBefore(li, catalogues.parentElement.nextSibling);
    else nav.appendChild(li);
  };

  const installProContactsAccordion = () => {
    if (page !== 'tarifs-pro.html' || window.__LRF_PRO_CONTACTS_ACCORDION__) return;
    window.__LRF_PRO_CONTACTS_ACCORDION__ = true;

    if (!document.getElementById('lrf-pro-contacts-accordion-style')) {
      const style = document.createElement('style');
      style.id = 'lrf-pro-contacts-accordion-style';
      style.textContent = `
        .contact-row.lrf-contact-accordion{display:block!important;padding:0!important;border-left:0!important;background:transparent!important;overflow:hidden;border-radius:9px!important}
        .lrf-contact-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:.72rem .9rem;border:0;border-left:3px solid #047857;border-radius:7px;background:#f8f6f2;color:#1A2530;font-weight:800;font-size:.82rem;cursor:pointer;text-align:left;transition:background .2s ease,border-color .2s ease}
        .lrf-contact-toggle:hover{background:#f1eee8;border-left-color:#D4AF37}
        .lrf-contact-arrow{font-size:1rem;color:#9a6a10;transition:transform .2s ease;line-height:1}
        .lrf-contact-toggle[aria-expanded="true"] .lrf-contact-arrow{transform:rotate(180deg)}
        .lrf-contact-panel{margin-top:.45rem;padding:.8rem .9rem;background:#fbfaf7;border:1px solid #e7e0d5;border-radius:8px}
        .lrf-contact-panel[hidden]{display:none!important}
        .lrf-contact-panel>div>strong:first-child{display:none!important}
        @media(max-width:600px){.lrf-contact-toggle{padding:.78rem .85rem;font-size:.84rem}.lrf-contact-panel{padding:.75rem}}
      `;
      document.head.appendChild(style);
    }

    const closeOthers = current => {
      document.querySelectorAll('.lrf-contact-toggle[aria-expanded="true"]').forEach(btn => {
        if (btn === current) return;
        btn.setAttribute('aria-expanded','false');
        const panel = btn.parentElement?.querySelector('.lrf-contact-panel');
        if (panel) panel.hidden = true;
      });
    };

    const enhance = root => {
      root.querySelectorAll?.('.contact-row:not([data-lrf-contact-accordion])').forEach(row => {
        if (!row.innerHTML.trim()) return;
        row.dataset.lrfContactAccordion = '1';
        row.classList.add('lrf-contact-accordion');
        const original = row.innerHTML;
        row.innerHTML = `<button type="button" class="lrf-contact-toggle" aria-expanded="false"><span>Contacts usine</span><span class="lrf-contact-arrow" aria-hidden="true">⌄</span></button><div class="lrf-contact-panel" hidden>${original}</div>`;
        const button = row.querySelector('.lrf-contact-toggle');
        const panel = row.querySelector('.lrf-contact-panel');
        button?.addEventListener('click', () => {
          const opening = button.getAttribute('aria-expanded') !== 'true';
          closeOthers(button);
          button.setAttribute('aria-expanded', opening ? 'true' : 'false');
          if (panel) panel.hidden = !opening;
        });
      });
    };

    enhance(document);
    const target = document.getElementById('grid-tarifs') || document.body;
    new MutationObserver(mutations => {
      mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1) enhance(node);
      }));
      enhance(document);
    }).observe(target,{childList:true,subtree:true});
  };

  const installContactProfessionalCopy = () => {
    if (page !== 'contact.html' || window.__LRF_CONTACT_PRO_COPY__) return;
    window.__LRF_CONTACT_PRO_COPY__ = true;
    const guidance = document.getElementById('contact-guidance');
    if (!guidance) return;
    const apply = () => {
      const type = document.querySelector('input[name="contact-type"]:checked')?.value || 'professionnel';
      if (type === 'professionnel') {
        guidance.innerHTML = '<strong>Vous êtes professionnel ?</strong>Besoin d\'un catalogue, d\'un échantillon, d\'une disponibilité produit, d\'une prise de rendez-vous ou d\'un accompagnement sur un projet ? Expliquez-nous votre besoin, nous revenons vers vous rapidement.';
      }
    };
    document.querySelectorAll('input[name="contact-type"]').forEach(el => el.addEventListener('change', apply));
    apply();
  };

  const enforceHeaderLogo = () => {
    const logoLink = document.querySelector('header .logo');
    if (!logoLink) return;
    let img = logoLink.querySelector('img');
    if (!img || !img.classList.contains('lrf-monogram-header')) {
      logoLink.innerHTML = '<img class="lrf-monogram-header" src="assets/brand-v2/logoLRF.png?v=20260918-pc-logo2" alt="LRF">';
      img = logoLink.querySelector('img');
    }
    if (img && img.getAttribute('src') !== 'assets/brand-v2/logoLRF.png?v=20260918-pc-logo2') {
      img.setAttribute('src','assets/brand-v2/logoLRF.png?v=20260918-pc-logo2');
    }
    logoLink.removeAttribute('style');
  };

  const startHeaderLogoGuard = () => {
    enforceHeaderLogo();
    const header = document.querySelector('header');
    if (!header || window.__LRF_HEADER_LOGO_GUARD__) return;
    window.__LRF_HEADER_LOGO_GUARD__ = true;
    new MutationObserver(() => enforceHeaderLogo()).observe(header,{childList:true,subtree:true,attributes:true,attributeFilter:['src','class']});
  };

  const setBrand = () => {
    if (!document.body) return;
    document.body.classList.add('lrf-premium-v2', pageClass);
    if (page !== 'index.html') document.body.classList.add('lrf-light-page');
    if (page === 'agent.html') document.body.classList.add('lrf-agent-page');
    if (configuratorPages.has(page)) document.body.classList.add('lrf-configurator-page');

    startSelectionsLabelGuard();
    installConfiguratorNoFloralTheme();

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = 'assets/brand-v2/logoLRF.png?v=20260918-pc-logo2';
      favicon.type = 'image/png';
    }

    enforceHeaderLogo();
    startHeaderLogoGuard();
    document.querySelectorAll('.lrf-center-brand').forEach(el => el.remove());

    installPromoCersaieNav();
    installConfigurateursNav();

    document.querySelectorAll('a[href="tarifs-pro.html"],a[href^="tarifs-pro.html?"]').forEach(link => {
      link.setAttribute('href', 'tarifs-pro.html?v=20260901-pro2');
      link.style.pointerEvents = 'auto';
      link.style.position = 'relative';
      link.style.zIndex = '20';
    });

    const heroLogo = document.querySelector('.hero-logo');
    if (heroLogo) {
      heroLogo.src = 'assets/brand-v2/logo-le-roy-factory.svg';
      heroLogo.alt = 'LE ROY factory';
      heroLogo.removeAttribute('style');
    }

    const clientBrand = document.querySelector('.brand img');
    if (page === 'ouverture-compte.html' && clientBrand) {
      clientBrand.src = 'assets/brand-v2/logoLRF.png?v=20260918-pc-logo2';
      clientBrand.alt = 'LRF';
    }

    const footer = document.querySelector('footer');
    if (footer && !footer.querySelector('.lrf-footer-brand')) {
      const container = footer.querySelector('.container');
      if (container) {
        const mark = document.createElement('img');
        mark.className = 'lrf-footer-brand';
        mark.src = 'assets/brand-v2/logo-le-roy-factory.svg';
        mark.alt = 'LE ROY factory';
        mark.style.cssText = 'width:190px;max-width:62vw;height:auto;margin:0 auto 10px;display:block;';
        container.prepend(mark);
      }
    }

    if (page === 'index.html') {
      document.getElementById('premium-value-strip')?.remove();
      document.querySelectorAll('.premium-univers').forEach(el => el.remove());
    }

    if (page === 'tarifs-pro.html' && !document.getElementById('lrf-pro-access-direct')) {
      const module = document.createElement('script');
      module.id = 'lrf-pro-access-direct';
      module.type = 'module';
      module.src = 'assets/js/tarifs-pro-client-access.js?v=20260901-profix1';
      document.body.appendChild(module);
    }

    if (page === 'tarifs-pro.html' && !document.getElementById('lrf-secure-tariff-links')) {
      const secure = document.createElement('script');
      secure.id = 'lrf-secure-tariff-links';
      secure.src = 'assets/js/secure-tariff-links.js?v=20260901-1';
      secure.defer = true;
      document.body.appendChild(secure);
    }

    installProContactsAccordion();
    installContactProfessionalCopy();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setBrand, {once:true});
  else setBrand();
})();