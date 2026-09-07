(() => {
  const hero = document.querySelector('.hero-video-section');
  if (!hero) return;

  const overlay = hero.querySelector('.hero-overlay');
  const heroLogo = hero.querySelector('.hero-logo');
  const heroButtons = hero.querySelector('.hero-buttons');
  const media = window.matchMedia('(max-width: 900px)');

  const IMAGES = {
    desktopLight: 'assets/img/acceuilclair1.png?v=20260907-home3',
    desktopDark: 'assets/brand-v2/accueil-desktop.png?v=20260901-hd2',
    mobileLight: 'assets/img/acceuilsmartphone.png?v=20260907-mobile2',
    mobileDark: 'assets/brand-v2/accueil-mobile.png?v=20260901-hd2'
  };

  const LOGOS = {
    light: 'assets/brand-v2/logo-le-roy-factory-wine.svg?v=20260907-wine1',
    dark: 'assets/brand-v2/logo-le-roy-factory.svg?v=20260901-gold1'
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
        left:10px;
        bottom:10px;
        z-index:40;
        appearance:none;
        border:1px solid rgba(255,255,255,.26);
        border-radius:999px;
        background:rgba(15,15,15,.36);
        color:rgba(255,255,255,.68);
        padding:5px 8px;
        font:700 9px/1 Arial,sans-serif;
        letter-spacing:.04em;
        text-transform:uppercase;
        cursor:pointer;
        opacity:.55;
        box-shadow:none;
        backdrop-filter:blur(5px);
        -webkit-backdrop-filter:blur(5px);
        transition:opacity .18s ease,background .18s ease,border-color .18s ease;
      }
      .lrf-screen-test-button:hover,
      .lrf-screen-test-button:focus-visible{
        opacity:1;
        background:rgba(35,8,20,.72);
        border-color:rgba(185,85,120,.72);
        color:#fff;
        outline:none;
      }
      .hero-buttons{position:relative!important}
      .lrf-home-mode-toggle{
        position:absolute;
        right:0;
        top:calc(100% + 7px);
        display:inline-flex;
        align-items:center;
        gap:6px;
        border:0;
        padding:0;
        background:transparent;
        cursor:pointer;
        color:rgba(255,255,255,.76);
        font:700 9px/1 Arial,sans-serif;
        letter-spacing:.04em;
        text-transform:uppercase;
        z-index:35;
      }
      .lrf-home-mode-toggle .lrf-toggle-track{
        position:relative;
        width:28px;
        height:14px;
        border-radius:999px;
        background:rgba(0,0,0,.38);
        border:1px solid rgba(255,255,255,.42);
        box-sizing:border-box;
        transition:.2s ease;
      }
      .lrf-home-mode-toggle .lrf-toggle-dot{
        position:absolute;
        top:2px;
        left:2px;
        width:8px;
        height:8px;
        border-radius:50%;
        background:#fff;
        box-shadow:0 1px 4px rgba(0,0,0,.35);
        transition:transform .2s ease,background .2s ease;
      }
      .lrf-home-mode-toggle[aria-pressed="true"] .lrf-toggle-track{
        background:linear-gradient(135deg,#4a0a21,#8b294b);
        border-color:#b95b7a;
      }
      .lrf-home-mode-toggle[aria-pressed="true"] .lrf-toggle-dot{
        transform:translateX(14px);
        background:#f6dbe3;
      }
      .lrf-home-mode-toggle .lrf-toggle-state{min-width:18px;text-align:left}

      .lrf-home-bg-controlled.lrf-home-light-mode .hero-logo-wrapper{
        filter:drop-shadow(0 7px 12px rgba(55,4,24,.22))!important;
      }
      .lrf-home-bg-controlled.lrf-home-light-mode .hero-logo-wrapper::after{display:none!important}
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode .hero-content h2{
        color:#681532!important;
        text-shadow:0 1px 0 #f7dfe6,0 2px 0 rgba(69,7,29,.20),0 4px 9px rgba(57,4,23,.18)!important;
      }
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode .hero-content p{
        color:#57132d!important;
        text-shadow:0 1px 0 rgba(255,255,255,.75),0 2px 5px rgba(63,6,27,.14)!important;
        font-weight:600!important;
      }
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode .btn-outline-white{
        color:#681532!important;
        border-color:#7e2444!important;
        background:rgba(255,248,245,.58)!important;
        text-shadow:none!important;
      }
      .lrf-home-bg-controlled.lrf-home-light-mode .lrf-home-mode-toggle{
        color:#681532;
        text-shadow:0 1px 0 rgba(255,255,255,.65);
      }
      .lrf-home-bg-controlled.lrf-home-light-mode .lrf-screen-test-button{
        background:rgba(255,250,247,.46);
        border-color:rgba(104,21,50,.28);
        color:rgba(104,21,50,.72);
      }

      @media(max-width:900px){
        .lrf-screen-test-button{
          left:6px;
          bottom:7px;
          padding:4px 6px;
          font-size:8px;
          opacity:.42;
          border-color:rgba(255,255,255,.20);
          background:rgba(0,0,0,.25);
        }
        .lrf-home-mode-toggle{
          right:0;
          top:calc(100% + 8px);
          transform:none;
          font-size:8px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  let mode = 'light';
  try {
    const saved = localStorage.getItem('lrf-home-screen-mode');
    if (saved === 'dark' || saved === 'light') mode = saved;
  } catch (_) {}

  const testButton = document.createElement('button');
  testButton.type = 'button';
  testButton.className = 'lrf-screen-test-button';
  testButton.textContent = 'Test écran';
  testButton.setAttribute('aria-label', 'Tester le fond clair et le fond sombre');
  testButton.title = 'Basculer entre fond clair et fond sombre';
  hero.appendChild(testButton);

  let modeToggle = null;
  if (heroButtons) {
    modeToggle = document.createElement('button');
    modeToggle.type = 'button';
    modeToggle.className = 'lrf-home-mode-toggle';
    modeToggle.innerHTML = '<span>Écran clair</span><span class="lrf-toggle-track" aria-hidden="true"><span class="lrf-toggle-dot"></span></span><span class="lrf-toggle-state">ON</span>';
    modeToggle.setAttribute('aria-label', 'Activer ou désactiver l’écran clair');
    heroButtons.appendChild(modeToggle);
  }

  const saveMode = () => {
    try { localStorage.setItem('lrf-home-screen-mode', mode); } catch (_) {}
  };

  const applyBackground = () => {
    const mobile = media.matches;
    const light = mode === 'light';
    const image = mobile
      ? (light ? IMAGES.mobileLight : IMAGES.mobileDark)
      : (light ? IMAGES.desktopLight : IMAGES.desktopDark);

    hero.classList.toggle('lrf-home-light-mode', light);
    hero.classList.toggle('lrf-home-dark-mode', !light);

    hero.style.setProperty(
      'background',
      `${light ? '#eee8df' : '#050505'} url("${image}") center center / cover no-repeat`,
      'important'
    );
    hero.style.setProperty('background-image', `url("${image}")`, 'important');
    hero.style.setProperty('background-size', 'cover', 'important');
    hero.style.setProperty('background-position', 'center center', 'important');
    hero.style.setProperty('background-repeat', 'no-repeat', 'important');

    if (overlay) {
      overlay.style.setProperty(
        'background',
        light
          ? (mobile ? 'linear-gradient(180deg,rgba(255,255,255,.01),rgba(50,8,25,.04))' : 'linear-gradient(180deg,rgba(255,255,255,0),rgba(64,8,28,.035))')
          : (mobile ? 'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.14))' : 'linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.08))'),
        'important'
      );
    }

    if (heroLogo) {
      heroLogo.src = light ? LOGOS.light : LOGOS.dark;
      heroLogo.alt = 'LE ROY factory';
    }

    if (modeToggle) {
      modeToggle.setAttribute('aria-pressed', light ? 'true' : 'false');
      const state = modeToggle.querySelector('.lrf-toggle-state');
      if (state) state.textContent = light ? 'ON' : 'OFF';
    }
  };

  const toggleMode = () => {
    mode = mode === 'light' ? 'dark' : 'light';
    saveMode();
    applyBackground();
  };

  testButton.addEventListener('click', toggleMode);
  modeToggle?.addEventListener('click', toggleMode);

  applyBackground();

  const onMediaChange = () => applyBackground();
  if (media.addEventListener) media.addEventListener('change', onMediaChange);
  else if (media.addListener) media.addListener(onMediaChange);
})();
