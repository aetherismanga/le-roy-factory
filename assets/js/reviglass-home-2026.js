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
    const controls = banner?.querySelector('.revi-banner-controls');
    const toggle = controls?.querySelector('.revi-banner-motion-toggle');
    const nextButton = controls?.querySelector('.revi-banner-next');
    const slides = [...(banner?.querySelectorAll('.revi-banner-slide') || [])];
    if (!banner || !controls || !toggle || !nextButton || slides.length !== 2) return;
    const photos = [
      {id:'st-04-sukabumi',label:'S-TONES · Sukabumi',width:700,height:451},
      {id:'midas',label:'MIDAS · Mosaïque dorée',width:700,height:525},
      {id:'st-01-carrara',label:'S-TONES · Carrara',width:700,height:539},
      {id:'st-02-taj-mahal',label:'S-TONES · Taj Mahal',width:700,height:525},
      {id:'st-03-coto',label:'S-TONES · Coto',width:700,height:525},
      {id:'st-05-sumatra',label:'S-TONES · Sumatra',width:700,height:525},
      {id:'st-06-vulcano',label:'S-TONES · Vulcano',width:700,height:445}
    ];
    const desktop = window.matchMedia('(min-width:901px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const failed = new Set();
    let paused = false;
    let inView = true;
    let loading = false;
    let current = 0;
    let visible = 0;
    let timer;
    const active = () => desktop.matches && inView && !document.hidden;
    const update = () => {
      clearTimeout(timer);
      const autoplay = active() && !paused && !reducedMotion.matches;
      banner.dataset.reviMotion = autoplay ? 'running' : 'paused';
      banner.dataset.reviActive = String(active());
      banner.dataset.reviCurrent = photos[current].id;
      controls.hidden = !desktop.matches;
      toggle.hidden = reducedMotion.matches;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Reprendre le diaporama' : 'Mettre le diaporama en pause');
      toggle.title = toggle.getAttribute('aria-label');
      if (autoplay && !loading && failed.size < photos.length - 1) timer = setTimeout(advance, 4000);
    };
    const advance = async () => {
      if (!desktop.matches || loading) return;
      clearTimeout(timer);
      let next = (current + 1) % photos.length;
      while (failed.has(next) && next !== current) next = (next + 1) % photos.length;
      if (next === current) return;
      loading = true;
      const target = slides[1 - visible];
      const photo = photos[next];
      const img = target.querySelector('img');
      try {
        target.querySelector('source').srcset = 'assets/img/reviglass-2026/home-originals/' + photo.id + '.jpg';
        await img.decode();
        if (!desktop.matches) return;
        if (!img.naturalWidth || img.naturalWidth < photo.width) throw new Error('Incomplete photo');
        img.alt = 'Piscine en mosaïque Reviglass ' + photo.label;
        img.width = photo.width;
        img.height = photo.height;
        target.classList.add('is-visible');
        target.removeAttribute('aria-hidden');
        slides[visible].classList.remove('is-visible');
        slides[visible].setAttribute('aria-hidden', 'true');
        visible = 1 - visible;
        current = next;
        banner.querySelector('.revi-banner-photo-name').textContent = photo.label;
        banner.querySelector('.revi-banner-photo-count').textContent = String(current + 1).padStart(2, '0') + ' / 07';
      } catch (_) {
        failed.add(next);
      } finally {
        loading = false;
        update();
      }
    };
    toggle.addEventListener('click', () => { paused = !paused; update(); });
    nextButton.addEventListener('click', advance);
    desktop.addEventListener('change', update);
    reducedMotion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); }).observe(banner);
    }
    update();
  };
  const install = () => { installHeaderPromo(); installBannerMotion(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
