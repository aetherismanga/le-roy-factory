(() => {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const allowed = new Set(['index.html','partenaires.html','univers.html','realisations.html','catalogues.html','tarifs-pro.html','contact.html']);
  if (!allowed.has(page)) return;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'assets/css/lrf-premium-v2.css?v=20260901-1';
  css.id = 'lrf-premium-v2-css';
  if (!document.getElementById(css.id)) document.head.appendChild(css);
  document.documentElement.classList.add('lrf-premium-ready');

  const setBrand = () => {
    if (!document.body) return;
    document.body.classList.add('lrf-premium-v2');

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) { favicon.href = 'assets/brand-v2/monogram-lr.svg'; favicon.type = 'image/svg+xml'; }

    const logoLink = document.querySelector('header .logo');
    if (logoLink && !logoLink.querySelector('.lrf-brand-header')) {
      logoLink.innerHTML = '<img class="lrf-brand-header" src="assets/brand-v2/logo-le-roy-factory.svg" alt="LE ROY factory">';
      logoLink.removeAttribute('style');
    }

    const heroLogo = document.querySelector('.hero-logo');
    if (heroLogo) {
      heroLogo.src = 'assets/brand-v2/logo-le-roy-factory.svg';
      heroLogo.alt = 'LE ROY factory';
      heroLogo.removeAttribute('style');
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

    if (page === 'index.html') installHomePremiumBlocks();
  };

  function installHomePremiumBlocks(){
    const hero = document.querySelector('.hero-video-section');
    if (!hero || document.getElementById('premium-value-strip')) return;

    const strip = document.createElement('section');
    strip.id = 'premium-value-strip';
    strip.className = 'premium-value-strip';
    strip.innerHTML = `<div class="premium-value-grid">
      <div class="premium-value"><div class="premium-value-icon">◆</div><div><strong>Sélection exigeante</strong><span>Fabricants choisis avec soin</span></div></div>
      <div class="premium-value"><div class="premium-value-icon">✦</div><div><strong>Qualité premium</strong><span>Carrelage & salle de bain</span></div></div>
      <div class="premium-value"><div class="premium-value-icon">◎</div><div><strong>Accompagnement</strong><span>Conseil professionnel personnalisé</span></div></div>
      <div class="premium-value"><div class="premium-value-icon">PRO</div><div><strong>Accès professionnel</strong><span>Catalogues & tarifs dédiés</span></div></div>
    </div>`;

    const univers = document.createElement('section');
    univers.className = 'premium-univers';
    univers.innerHTML = `<div class="premium-univers-inner"><h2 class="premium-section-title">Nos univers</h2><div class="premium-univers-grid">
      <a class="premium-universe-card" href="univers.html"><span class="premium-universe-icon">◫</span><strong>Carrelage / Céramique</strong></a>
      <a class="premium-universe-card" href="univers.html"><span class="premium-universe-icon">◡</span><strong>Salle de bain</strong></a>
      <a class="premium-universe-card" href="univers.html"><span class="premium-universe-icon">▦</span><strong>Mosaïque</strong></a>
      <a class="premium-universe-card" href="univers.html"><span class="premium-universe-icon">▰</span><strong>Meuble & Vasque</strong></a>
      <a class="premium-universe-card" href="univers.html"><span class="premium-universe-icon">⌁</span><strong>Robinetterie</strong></a>
      <a class="premium-universe-card" href="realisations.html"><span class="premium-universe-icon">✧</span><strong>Inspirations</strong></a>
    </div></div>`;

    hero.insertAdjacentElement('afterend', strip);
    strip.insertAdjacentElement('afterend', univers);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setBrand, {once:true});
  else setBrand();
})();
