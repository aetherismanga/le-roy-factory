(() => {
  const isHome = (location.pathname.split('/').pop() || 'index.html').toLowerCase() === 'index.html';
  if (!isHome) return;

  const mobile = window.matchMedia('(max-width: 900px)');
  if (!mobile.matches) return;

  const logoWrap = document.querySelector('.hero-logo-wrapper');
  if (!logoWrap || document.getElementById('bulbo-mobile-trigger')) return;

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
  overlay.innerHTML =
    '<section class="bulbo-video-panel" role="document">' +
      '<button type="button" class="bulbo-video-close" aria-label="Fermer">×</button>' +
      '<header class="bulbo-video-head">' +
        '<span class="bulbo-video-kicker">BULBO × LE ROY FACTORY</span>' +
        '<h2 class="bulbo-video-title" id="bulbo-video-title">Vidéos BULBO</h2>' +
        '<p class="bulbo-video-subtitle">Découvrez nos univers vidéo</p>' +
      '</header>' +
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
  const video = overlay.querySelector('video');
  let lastFocus = null;
  let closeTimer = 0;

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
    overlay.querySelector('.bulbo-video-title').textContent = 'Vidéos BULBO';
    overlay.querySelector('.bulbo-video-subtitle').textContent = 'Découvrez nos univers vidéo';
  };

  const openOverlay = () => {
    window.clearTimeout(closeTimer);
    lastFocus = document.activeElement;
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
    overlay.classList.remove('is-open');
    document.body.classList.remove('bulbo-video-open');
    closeTimer = window.setTimeout(() => {
      overlay.hidden = true;
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
      }
    }, 230);
  };

  const playCard = (card) => {
    if (!card || !video || !playerView || !choices) return;
    const src = card.getAttribute('data-video');
    const poster = card.getAttribute('data-poster');
    const title = card.getAttribute('data-title') || 'Vidéo BULBO';

    choices.hidden = true;
    playerView.hidden = false;
    if (playerTitle) playerTitle.textContent = title;
    if (poster) video.setAttribute('poster', poster);
    if (src) video.setAttribute('src', src);
    video.load();

    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  badge.addEventListener('click', openOverlay);
  closeButton && closeButton.addEventListener('click', closeOverlay);
  backButton && backButton.addEventListener('click', showChoices);

  overlay.querySelectorAll('.bulbo-video-card').forEach((card) => {
    card.addEventListener('click', () => playCard(card));
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay();
  });

  panel && panel.addEventListener('click', (event) => event.stopPropagation());

  document.addEventListener('keydown', (event) => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverlay();
    }
  });
})();