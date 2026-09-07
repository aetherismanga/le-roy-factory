(() => {
  const hero = document.querySelector('.hero-video-section');
  if (!hero) return;

  const overlay = hero.querySelector('.hero-overlay');
  const media = window.matchMedia('(max-width: 900px)');

  const IMAGES = {
    desktopNew: 'assets/img/acceuilclair1.png?v=20260907-home2',
    desktopOld: 'assets/brand-v2/accueil-desktop.png?v=20260901-hd2',
    mobile: 'assets/img/acceuilsmartphone.png?v=20260907-mobile1'
  };

  hero.classList.add('lrf-home-bg-controlled');

  if (!document.getElementById('lrf-home-bg-controller-style')) {
    const style = document.createElement('style');
    style.id = 'lrf-home-bg-controller-style';
    style.textContent = `
      body.lrf-premium-v2 .hero-video-section.lrf-home-bg-controlled{
        background-color:#eee8df!important;
      }
      body.lrf-premium-v2 .hero-video-section.lrf-home-bg-controlled::before,
      body.lrf-premium-v2 .hero-video-section.lrf-home-bg-controlled::after{
        display:none!important;
        animation:none!important;
        content:none!important;
      }
      .lrf-screen-test-button{
        position:absolute;
        left:18px;
        bottom:18px;
        z-index:40;
        appearance:none;
        border:1px solid #d4af37;
        border-radius:7px;
        background:rgba(5,5,5,.86);
        color:#ffd84f;
        padding:7px 11px;
        font:800 11px/1 Arial,sans-serif;
        letter-spacing:.06em;
        text-transform:uppercase;
        cursor:pointer;
        box-shadow:0 4px 16px rgba(0,0,0,.28),0 0 12px rgba(212,175,55,.14);
        backdrop-filter:blur(4px);
      }
      .lrf-screen-test-button:hover,
      .lrf-screen-test-button:focus-visible{
        background:#d4af37;
        color:#050505;
        outline:none;
      }
      @media(max-width:900px){
        .lrf-screen-test-button{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  let desktopMode = 'new';

  const applyBackground = () => {
    const mobile = media.matches;
    const image = mobile
      ? IMAGES.mobile
      : (desktopMode === 'new' ? IMAGES.desktopNew : IMAGES.desktopOld);

    hero.style.setProperty(
      'background',
      `#eee8df url("${image}") center center / cover no-repeat`,
      'important'
    );
    hero.style.setProperty('background-image', `url("${image}")`, 'important');
    hero.style.setProperty('background-size', 'cover', 'important');
    hero.style.setProperty('background-position', 'center center', 'important');
    hero.style.setProperty('background-repeat', 'no-repeat', 'important');

    if (overlay) {
      overlay.style.setProperty(
        'background',
        mobile
          ? 'linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.08))'
          : 'linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.07))',
        'important'
      );
    }
  };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lrf-screen-test-button';
  button.textContent = 'Test écran';
  button.setAttribute('aria-label', 'Tester ancien et nouveau fond d’écran');
  button.title = 'Basculer entre ancien et nouveau fond';
  button.addEventListener('click', () => {
    if (media.matches) return;
    desktopMode = desktopMode === 'new' ? 'old' : 'new';
    applyBackground();
  });
  hero.appendChild(button);

  applyBackground();

  const onMediaChange = () => applyBackground();
  if (media.addEventListener) media.addEventListener('change', onMediaChange);
  else if (media.addListener) media.addListener(onMediaChange);
})();
