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
      body.lrf-premium-v2 .hero-video-section.lrf-home-bg-controlled{background-color:#eee8df!important}
      body.lrf-premium-v2 .hero-video-section.lrf-home-bg-controlled::before,
      body.lrf-premium-v2 .hero-video-section.lrf-home-bg-controlled::after{display:none!important;animation:none!important;content:none!important}

      #lrf-open-search{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:.55rem!important}
      #lrf-open-search .lrf-search-trigger-icon{width:15px;height:15px;display:block;flex:0 0 auto}
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode #lrf-open-search,
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-test-mode #lrf-open-search{
        background:linear-gradient(180deg,rgba(255,253,250,.96),rgba(245,232,228,.92))!important;
        color:#681532!important;
        border:1px solid rgba(104,21,50,.72)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 7px 18px rgba(74,12,35,.15),0 0 0 1px rgba(104,21,50,.04)!important;
        text-shadow:none!important;
      }
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode #lrf-open-search:hover,
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode #lrf-open-search:focus-visible,
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-test-mode #lrf-open-search:hover,
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-test-mode #lrf-open-search:focus-visible{
        background:linear-gradient(135deg,#521026,#821f42 58%,#64142f)!important;
        color:#fff8f4!important;
        border-color:#9e3f61!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 9px 24px rgba(74,12,35,.22)!important;
        transform:translateY(-1px)!important;
        outline:none!important;
      }

      .lrf-screen-test-button{position:absolute;left:10px;bottom:10px;z-index:40;appearance:none;border:1px solid rgba(255,255,255,.26);border-radius:999px;background:rgba(15,15,15,.36);color:rgba(255,255,255,.68);padding:5px 8px;font:700 9px/1 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;opacity:.55;box-shadow:none;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);transition:opacity .18s ease,background .18s ease,border-color .18s ease,color .18s ease}
      .lrf-screen-test-button:hover,.lrf-screen-test-button:focus-visible{opacity:1;background:rgba(35,8,20,.72);border-color:rgba(185,85,120,.72);color:#fff;outline:none}
      .lrf-screen-test-button[aria-pressed="true"]{opacity:.95;background:rgba(104,21,50,.88)!important;border-color:rgba(246,219,227,.74)!important;color:#fff8f4!important;box-shadow:0 4px 12px rgba(74,12,35,.18)}

      .hero-buttons{position:relative!important}
      .lrf-home-mode-toggle{position:absolute;right:0;top:calc(100% + 7px);display:inline-flex;align-items:center;gap:6px;border:0;padding:0;background:transparent;cursor:pointer;color:rgba(255,255,255,.76);font:700 9px/1 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;z-index:35}
      .lrf-home-mode-toggle .lrf-toggle-track{position:relative;width:28px;height:14px;border-radius:999px;background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.42);box-sizing:border-box;transition:.2s ease}
      .lrf-home-mode-toggle .lrf-toggle-dot{position:absolute;top:2px;left:2px;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.35);transition:transform .2s ease,background .2s ease}
      .lrf-home-mode-toggle[aria-pressed="true"] .lrf-toggle-track{background:linear-gradient(135deg,#4a0a21,#8b294b);border-color:#b95b7a}
      .lrf-home-mode-toggle[aria-pressed="true"] .lrf-toggle-dot{transform:translateX(14px);background:#f6dbe3}
      .lrf-home-mode-toggle .lrf-toggle-state{min-width:18px;text-align:left}

      .lrf-home-bg-controlled.lrf-home-light-mode .hero-logo-wrapper,
      .lrf-home-bg-controlled.lrf-home-test-mode .hero-logo-wrapper{filter:drop-shadow(0 7px 12px rgba(55,4,24,.22))!important}
      .lrf-home-bg-controlled.lrf-home-light-mode .hero-logo-wrapper::after,
      .lrf-home-bg-controlled.lrf-home-test-mode .hero-logo-wrapper::after{display:none!important}
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode .hero-content h2,
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-test-mode .hero-content h2{color:#681532!important;text-shadow:0 1px 0 #f7dfe6,0 2px 0 rgba(69,7,29,.20),0 4px 9px rgba(57,4,23,.18)!important}
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode .hero-content p,
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-test-mode .hero-content p{color:#57132d!important;text-shadow:0 1px 0 rgba(255,255,255,.75),0 2px 5px rgba(63,6,27,.14)!important;font-weight:600!important}
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode .btn-outline-white,
      body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-test-mode .btn-outline-white{color:#681532!important;border-color:#7e2444!important;background:rgba(255,248,245,.58)!important;text-shadow:none!important}
      .lrf-home-bg-controlled.lrf-home-light-mode .lrf-home-mode-toggle,
      .lrf-home-bg-controlled.lrf-home-test-mode .lrf-home-mode-toggle{color:#681532;text-shadow:0 1px 0 rgba(255,255,255,.65)}
      .lrf-home-bg-controlled.lrf-home-light-mode .lrf-screen-test-button,
      .lrf-home-bg-controlled.lrf-home-test-mode .lrf-screen-test-button{background:rgba(255,250,247,.46);border-color:rgba(104,21,50,.28);color:rgba(104,21,50,.72)}

      @media(max-width:900px){
        body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-light-mode #lrf-open-search,
        body.lrf-premium-v2 .lrf-home-bg-controlled.lrf-home-test-mode #lrf-open-search{padding:.78rem 1.35rem!important;font-size:.82rem!important}
        #lrf-open-search .lrf-search-trigger-icon{width:14px;height:14px}
        .lrf-screen-test-button{left:6px;bottom:7px;padding:4px 6px;font-size:8px;opacity:.42;border-color:rgba(255,255,255,.20);background:rgba(0,0,0,.25)}
        .lrf-home-mode-toggle{right:0;top:calc(100% + 8px);transform:none;font-size:8px}
      }
    `;
    document.head.appendChild(style);
  }

  let mode = 'light';
  let testMode = false;
  try {
    const saved = localStorage.getItem('lrf-home-screen-mode');
    if (saved === 'dark' || saved === 'light') mode = saved;
  } catch (_) {}

  const testButton = document.createElement('button');
  testButton.type = 'button';
  testButton.className = 'lrf-screen-test-button';
  testButton.textContent = 'Test écran';
  testButton.setAttribute('aria-label', 'Activer la nouvelle configuration test');
  testButton.setAttribute('aria-pressed', 'false');
  testButton.title = 'Afficher la nouvelle configuration test';
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

  const isVisualLight = () => testMode || mode === 'light';

  const syncLogo = () => {
    if (!heroLogo) return;
    const expected = isVisualLight() ? LOGOS.light : LOGOS.dark;
    if (heroLogo.getAttribute('src') !== expected) heroLogo.setAttribute('src', expected);
    heroLogo.alt = 'LE ROY factory';
  };

  const applyBackground = () => {
    const mobile = media.matches;
    const visualLight = isVisualLight();
    const image = mobile
      ? (visualLight ? IMAGES.mobileLight : IMAGES.mobileDark)
      : (visualLight ? IMAGES.desktopLight : IMAGES.desktopDark);

    hero.classList.toggle('lrf-home-light-mode', visualLight && !testMode);
    hero.classList.toggle('lrf-home-dark-mode', !visualLight);
    hero.classList.toggle('lrf-home-test-mode', testMode);
    document.body.classList.toggle('lrf-home-test-screen', testMode);

    hero.style.setProperty('background',`${visualLight ? '#eee8df' : '#050505'} url("${image}") center center / cover no-repeat`,'important');
    hero.style.setProperty('background-image', `url("${image}")`, 'important');
    hero.style.setProperty('background-size', 'cover', 'important');
    hero.style.setProperty('background-position', 'center center', 'important');
    hero.style.setProperty('background-repeat', 'no-repeat', 'important');

    if (overlay) {
      overlay.style.setProperty('background',visualLight
        ? (mobile ? 'linear-gradient(180deg,rgba(255,255,255,.01),rgba(50,8,25,.04))' : 'linear-gradient(180deg,rgba(255,255,255,0),rgba(64,8,28,.035))')
        : (mobile ? 'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.14))' : 'linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.08))'),'important');
    }

    syncLogo();

    if (modeToggle) {
      const baseLight = mode === 'light';
      modeToggle.setAttribute('aria-pressed', baseLight ? 'true' : 'false');
      const state = modeToggle.querySelector('.lrf-toggle-state');
      if (state) state.textContent = baseLight ? 'ON' : 'OFF';
    }

    testButton.setAttribute('aria-pressed', testMode ? 'true' : 'false');
    testButton.title = testMode ? 'Quitter la nouvelle configuration test' : 'Afficher la nouvelle configuration test';

    window.dispatchEvent(new CustomEvent('lrf-home-test-mode-change',{detail:{active:testMode}}));
  };

  const toggleBaseMode = () => {
    testMode = false;
    mode = mode === 'light' ? 'dark' : 'light';
    saveMode();
    applyBackground();
  };

  const toggleTestMode = () => {
    testMode = !testMode;
    applyBackground();
  };

  testButton.addEventListener('click', toggleTestMode);
  modeToggle?.addEventListener('click', toggleBaseMode);

  if (heroLogo) {
    new MutationObserver(() => syncLogo()).observe(heroLogo,{attributes:true,attributeFilter:['src']});
  }

  applyBackground();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(applyBackground,0),{once:true});
  window.addEventListener('load',()=>setTimeout(applyBackground,0),{once:true});
  setTimeout(applyBackground,120);
  setTimeout(applyBackground,650);

  const onMediaChange = () => applyBackground();
  if (media.addEventListener) media.addEventListener('change', onMediaChange);
  else if (media.addListener) media.addListener(onMediaChange);
})();
