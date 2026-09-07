(() => {
  'use strict';

  const hero = document.querySelector('.hero-video-section');
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  if (!hero || !header || !footer || document.getElementById('lrf-home-desktop-corners-style')) return;

  const CORNERS = [
    { cls: 'top-left', src: 'assets/img/anglehautgauche.png?v=20260908-corners2' },
    { cls: 'top-right', src: 'assets/img/anglehautdroit.png?v=20260908-corners2' },
    { cls: 'bottom-left', src: 'assets/img/anglebasgauche.png?v=20260908-corners2' },
    { cls: 'bottom-right', src: 'assets/img/anglebasdroit.png?v=20260908-corners2' }
  ];

  const style = document.createElement('style');
  style.id = 'lrf-home-desktop-corners-style';
  style.textContent = `
    .lrf-home-corner{
      display:none;
      position:absolute;
      z-index:1002;
      pointer-events:none;
      user-select:none;
      -webkit-user-select:none;
      opacity:.96;
      line-height:0;
      filter:drop-shadow(0 4px 10px rgba(69,39,20,.10));
    }
    .lrf-home-corner img{display:block;width:100%;height:auto;max-width:none}

    @media (min-width:901px){
      body.lrf-home-test-screen .lrf-home-corner{display:block}

      .lrf-home-corner.top-left{
        top:calc(var(--lrf-test-top-anchor,98px) - 42px);
        left:-2px;
        width:clamp(190px,14vw,285px);
      }
      .lrf-home-corner.top-right{
        top:calc(var(--lrf-test-top-anchor,98px) - 42px);
        right:-2px;
        width:clamp(190px,14vw,285px);
      }
      .lrf-home-corner.bottom-left{
        top:calc(var(--lrf-test-bottom-anchor,100vh) + 48px);
        left:-2px;
        width:clamp(215px,16vw,315px);
        transform:translateY(-100%);
      }
      .lrf-home-corner.bottom-right{
        top:calc(var(--lrf-test-bottom-anchor,100vh) + 48px);
        right:-2px;
        width:clamp(215px,16vw,315px);
        transform:translateY(-100%);
      }
    }

    @media (max-width:1100px) and (min-width:901px){
      .lrf-home-corner.top-left,.lrf-home-corner.top-right{width:180px}
      .lrf-home-corner.bottom-left,.lrf-home-corner.bottom-right{width:205px}
    }

    @media (max-width:900px){.lrf-home-corner{display:none!important}}
  `;
  document.head.appendChild(style);

  const holders = [];
  CORNERS.forEach(({ cls, src }) => {
    const holder = document.createElement('div');
    holder.className = `lrf-home-corner ${cls}`;
    holder.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;

    holder.appendChild(img);
    document.body.appendChild(holder);
    holders.push(holder);
  });

  let raf = 0;
  const syncAnchors = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const headerRect = header.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const topAnchor = Math.round(window.scrollY + headerRect.bottom);
      const bottomAnchor = Math.round(window.scrollY + footerRect.top);
      document.documentElement.style.setProperty('--lrf-test-top-anchor', `${topAnchor}px`);
      document.documentElement.style.setProperty('--lrf-test-bottom-anchor', `${bottomAnchor}px`);
      raf = 0;
    });
  };

  syncAnchors();
  window.addEventListener('resize', syncAnchors, { passive:true });
  window.addEventListener('scroll', syncAnchors, { passive:true });
  window.addEventListener('load', syncAnchors, { once:true });
  window.addEventListener('lrf-home-test-mode-change', syncAnchors);

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(syncAnchors);
    ro.observe(hero);
    ro.observe(header);
    ro.observe(footer);
  }
})();
