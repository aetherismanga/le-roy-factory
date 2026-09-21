(() => {
  const isHome = (location.pathname.split('/').pop() || 'index.html').toLowerCase() === 'index.html';
  if (!isHome) return;

  const mobile = window.matchMedia('(max-width: 900px)');
  if (!mobile.matches) return;

  const logoWrap = document.querySelector('.hero-logo-wrapper');
  if (!logoWrap || document.getElementById('bulbo-mobile-trigger')) return;

  const SLIDES = [
    'assets/img/bulbo/diapo-01.webp?v=20260921-2',
    'assets/img/bulbo/diapo-02.webp?v=20260921-2',
    'assets/img/bulbo/diapo-03.webp?v=20260921-2',
    'assets/img/bulbo/diapo-04.webp?v=20260921-2'
  ];

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.id = 'bulbo-mobile-trigger';
  badge.setAttribute('aria-label', 'Voir les vidéos BULBO');
  badge.setAttribute('aria-haspopup', 'dialog');
  badge.innerHTML =
    '<span class="bulbo-trigger-shell">' +
      '<img src="assets/img/bulbo-videos-badge.webp?v=20260920-bulbo2" alt="" width="256" height="256" decoding="async">' +
    '</span>';

  const badgeImg = badge.querySelector('img');
  if (badgeImg) {
    badgeImg.addEventListener('error', () => {
      if (!badgeImg.src.includes('bulbo-videos-badge.png')) {
        badgeImg.src = 'assets/img/bulbo-videos-badge.png?v=20260920-bulbo1';
      }
    }, { once: true });
  }

  logoWrap.classList.add('bulbo-ready');
  logoWrap.appendChild(badge);

  const overlay = document.createElement('div');
  overlay.id = 'bulbo-video-overlay';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'bulbo-video-title');

  const slidesMarkup = SLIDES.map((src, index) =>
    '<div class="bulbo-bg-slide' + (index === 0 ? ' is-active' : '') + '" data-bg="' + src + '"></div>'
  ).join('');

  overlay.innerHTML =
    '<div class="bulbo-bg-slideshow" aria-hidden="true">' + slidesMarkup + '</div>' +
    '<button type="button" class="bulbo-video-close" aria-label="Fermer">×</button>' +
    '<section class="bulbo-video-panel" role="document">' +
      '<div class="bulbo-video-head">' +
        '<span class="bulbo-video-kicker">BULBO × LE ROY FACTORY</span>' +
        '<h2 class="bulbo-video-title" id="bulbo-video-title">Vidéos BULBO</h2>' +
        '<p class="bulbo-video-subtitle">Découvrez nos univers vidéo</p>' +
      '</div>' +
      '<div class="bulbo-video-choices">' +
        '<button type="button" class="bulbo-video-card" data-video="/assets/videos/bulbo-serpent.mp4" data-poster="/assets/img/bulbo-serpent-poster.jpg" data-title="Le serpent">' +
          '<span class="bulbo-video-thumb"><img src="assets/img/bulbo-serpent-poster.jpg?v=20260920-bulbo2" alt="Aperçu de la vidéo Le serpent" loading="lazy" decoding="async"></span>' +
          '<span class="bulbo-video-card-copy"><strong>Le serpent</strong><span>Ouvrir la vidéo BULBO</span></span>' +
          '<span class="bulbo-video-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' +
        '</button>' +
        '<button type="button" class="bulbo-video-card" data-video="/assets/videos/bulbo-cameleon.mp4" data-poster="/assets/img/bulbo-cameleon-poster.jpg" data-title="Le caméléon">' +
          '<span class="bulbo-video-thumb"><img src="assets/img/bulbo-cameleon-poster.jpg?v=20260920-bulbo2" alt="Aperçu de la vidéo Le caméléon" loading="lazy" decoding="async"></span>' +
          '<span class="bulbo-video-card-copy"><strong>Le caméléon</strong><span>Ouvrir la vidéo BULBO</span></span>' +
          '<span class="bulbo-video-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' +
        '</button>' +
      '</div>' +
      '<div class="bulbo-video-player-view" hidden>' +
        '<button type="button" class="bulbo-video-back" aria-label="Revenir au choix des vidéos">← Les vidéos</button>' +
        '<h3 class="bulbo-player-title"></h3>' +
        '<div class="bulbo-player-shell"><video controls playsinline webkit-playsinline preload="metadata" controlslist="nodownload" disablepictureinpicture></video></div>' +
      '</div>' +
      '<p class="bulbo-video-foot">BULBO · sélection LE ROY FACTORY</p>' +
    '</section>';

  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.bulbo-video-panel');
  const closeButton = overlay.querySelector('.bulbo-video-close');
  const choices = overlay.querySelector('.bulbo-video-choices');
  const playerView = overlay.querySelector('.bulbo-video-player-view');
  const backButton = overlay.querySelector('.bulbo-video-back');
  const playerTitle = overlay.querySelector('.bulbo-player-title');
  const title = overlay.querySelector('.bulbo-video-title');
  const subtitle = overlay.querySelector('.bulbo-video-subtitle');
  const video = overlay.querySelector('video');
  const slides = Array.from(overlay.querySelectorAll('.bulbo-bg-slide'));

  let lastFocus = null;
  let closeTimer = 0;
  let slideIndex = 0;
  let slideshowTimer = 0;
  let slidesHydrated = false;

  const hydrateSlides = () => {
    if (slidesHydrated) return;
    slidesHydrated = true;
    slides.forEach((slide, index) => {
      const src = slide.getAttribute('data-bg');
      if (!src) return;
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        slide.style.backgroundImage = 'url("' + src + '")';
        slide.classList.add('is-loaded');
        if (index === slideIndex) slide.classList.add('is-active');
      };
      image.onerror = () => {
        slide.classList.add('is-error');
      };
      image.src = src;
    });
  };

  const setSlide = (index) => {
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  };

  const startSlideshow = () => {
    window.clearInterval(slideshowTimer);
    if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    slideshowTimer = window.setInterval(() => {
      slideIndex = (slideIndex + 1) % slides.length;
      setSlide(slideIndex);
    }, 4300);
  };

  const stopSlideshow = () => {
    window.clearInterval(slideshowTimer);
    slideshowTimer = 0;
  };

  const stopVideo = () => {
    if (!video) return;
    try { video.pause(); } catch (_) {}
    video.removeAttribute('src');
    video.removeAttribute('poster');
    try { video.load(); } catch (_) {}
  };

  const showChoices = () => {
    stopVideo();
    if (playerView) playerView.hidden = true;
    if (choices) choices.hidden = false;
    if (title) title.textContent = 'Vidéos BULBO';
    if (subtitle) subtitle.textContent = 'Découvrez nos univers vidéo';
  };

  const openOverlay = () => {
    window.clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    hydrateSlides();
    setSlide(slideIndex);
    startSlideshow();
    showChoices();
    overlay.hidden = false;
    document.body.classList.add('bulbo-video-open');
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      closeButton && closeButton.focus({ preventScroll: true });
    });
  };

  const closeOverlay = () => {
    stopVideo();
    stopSlideshow();
    overlay.classList.remove('is-open');
    document.body.classList.remove('bulbo-video-open');
    closeTimer = window.setTimeout(() => {
      overlay.hidden = true;
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
      }
    }, 280);
  };

  const playCard = (card) => {
    if (!card || !video || !playerView || !choices) return;
    const src = card.getAttribute('data-video');
    const poster = card.getAttribute('data-poster');
    const label = card.getAttribute('data-title') || 'Vidéo BULBO';

    choices.hidden = true;
    playerView.hidden = false;
    if (playerTitle) playerTitle.textContent = label;
    if (title) title.textContent = label;
    if (subtitle) subtitle.textContent = 'Lecture vidéo';
    if (poster) video.setAttribute('poster', poster);
    if (src) video.setAttribute('src', src);
    video.load();

    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  badge.addEventListener('click', openOverlay);
  closeButton && closeButton.addEventListener('click', closeOverlay);
  backButton && backButton.addEventListener('click', showChoices);

  overlay.querySelectorAll('.bulbo-video-card').forEach(card => {
    card.addEventListener('click', () => playCard(card));
  });

  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.classList.contains('bulbo-bg-slideshow') || event.target.classList.contains('bulbo-bg-slide')) {
      closeOverlay();
    }
  });

  panel && panel.addEventListener('click', event => event.stopPropagation());

  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverlay();
    }
  });
})();