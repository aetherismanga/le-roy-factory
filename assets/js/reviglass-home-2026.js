(() => {
  'use strict';
  const install = () => {
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
