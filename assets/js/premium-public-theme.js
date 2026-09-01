(() => {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const allowed = new Set([
    'index.html','partenaires.html','univers.html','realisations.html',
    'catalogues.html','tarifs-pro.html','contact.html','agent.html','ouverture-compte.html'
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
  addStylesheet('lrf-logo-scale-v9-css', 'assets/css/lrf-logo-scale-v9.css?v=20260901-2');
  document.documentElement.classList.add('lrf-premium-ready');

  const pageClass = `lrf-page-${page.replace('.html','').replace(/[^a-z0-9-]/g,'-')}`;

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

  const setBrand = () => {
    if (!document.body) return;
    document.body.classList.add('lrf-premium-v2', pageClass);
    if (page !== 'index.html') document.body.classList.add('lrf-light-page');
    if (page === 'agent.html') document.body.classList.add('lrf-agent-page');

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = 'assets/brand-v2/assetlogorond.png';
      favicon.type = 'image/png';
    }

    const logoLink = document.querySelector('header .logo');
    if (logoLink) {
      logoLink.innerHTML = '<img class="lrf-monogram-header" src="assets/brand-v2/assetlogorond.png?v=20260901-logo2" alt="LRF">';
      logoLink.removeAttribute('style');
    }
    document.querySelectorAll('.lrf-center-brand').forEach(el => el.remove());

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
      clientBrand.src = 'assets/brand-v2/assetlogorond.png?v=20260901-logo2';
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
