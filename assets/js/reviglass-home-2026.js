(() => {
  'use strict';
  const installHeaderPromo = () => {
    const nav = document.querySelector('header .nav-container');
    const view = nav?.querySelector('.viewlots26-header');
    const burger = nav?.querySelector('.burger-btn');
    if (!nav || !view || !burger) return;
    if (nav.querySelector('.revi-header-promo')) {nav.classList.add('revi-promos-ready');return;}
    const link = document.createElement('a');
    link.className = 'revi-header-promo';
    link.href = 'reviglass-lyon-2026.html';
    link.setAttribute('aria-label', 'Reviglass et LE ROY FACTORY : rendez-vous à Lyon, invitation gratuite');
    link.innerHTML = '<img src="assets/img/reviglass-2026/reviglass-white.png" alt="Reviglass" width="250" height="100"><span>RDV À LYON</span>';
    view.insertAdjacentElement('afterend', link);
    nav.classList.add('revi-promos-ready');
  };
  const installBannerMotion = () => {
    const banner = document.querySelector('.revi-home-invitation');
    const toggle = banner?.querySelector('.revi-banner-motion-toggle');
    if (!banner || !toggle) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = false;
    let inView = true;
    const update = () => {
      if (reducedMotion.matches) delete banner.dataset.reviMotion;
      else banner.dataset.reviMotion = paused ? 'paused' : 'running';
      banner.dataset.reviActive = String(inView && !document.hidden);
      toggle.hidden = reducedMotion.matches;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause');
      toggle.title = toggle.getAttribute('aria-label');
    };
    toggle.addEventListener('click', () => { paused = !paused; update(); });
    reducedMotion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        update();
      }).observe(banner);
    }
    update();
  };
  const install = () => { installHeaderPromo(); installBannerMotion(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
