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
  addStylesheet('lrf-final-v4-css', 'assets/css/lrf-final-v4.css?v=20260901-2');
  addStylesheet('lrf-hotfix-v5-css', 'assets/css/lrf-hotfix-v5.css?v=20260901-2');
  document.documentElement.classList.add('lrf-premium-ready');

  const pageClass = `lrf-page-${page.replace('.html','').replace(/[^a-z0-9-]/g,'-')}`;

  const setBrand = () => {
    if (!document.body) return;
    document.body.classList.add('lrf-premium-v2', pageClass);
    if (page !== 'index.html') document.body.classList.add('lrf-light-page');
    if (page === 'agent.html') document.body.classList.add('lrf-agent-page');

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = 'assets/brand-v2/monogram-lrf.svg';
      favicon.type = 'image/svg+xml';
    }

    const logoLink = document.querySelector('header .logo');
    if (logoLink) {
      logoLink.innerHTML = '<img class="lrf-monogram-header" src="assets/brand-v2/monogram-lrf.svg" alt="LRF">';
      logoLink.removeAttribute('style');
    }
    document.querySelectorAll('.lrf-center-brand').forEach(el => el.remove());

    // Accès PRO : lien explicite et cache-busté pour éviter une ancienne page/script en cache.
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
      clientBrand.src = 'assets/brand-v2/monogram-lrf.svg';
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

    // La page PRO charge elle-même le module code LRF + département.
    // La même URL est utilisée par app.js : le navigateur ne l'exécute qu'une fois.
    if (page === 'tarifs-pro.html' && !document.getElementById('lrf-pro-access-direct')) {
      const module = document.createElement('script');
      module.id = 'lrf-pro-access-direct';
      module.type = 'module';
      module.src = 'assets/js/tarifs-pro-client-access.js?v=20260901-profix1';
      document.body.appendChild(module);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setBrand, {once:true});
  else setBrand();
})();
