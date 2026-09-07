(() => {
  'use strict';

  const hero = document.querySelector('.hero-video-section');
  if (!hero || document.getElementById('lrf-home-desktop-corners-style')) return;

  const CORNERS = [
    { cls: 'top-left', src: 'assets/img/anglehautgauche.png?v=20260907-corners1' },
    { cls: 'top-right', src: 'assets/img/anglehautdroit.png?v=20260907-corners1' },
    { cls: 'bottom-left', src: 'assets/img/anglebasgauche.png?v=20260907-corners1' },
    { cls: 'bottom-right', src: 'assets/img/anglebasdroit.png?v=20260907-corners1' }
  ];

  const style = document.createElement('style');
  style.id = 'lrf-home-desktop-corners-style';
  style.textContent = `
    .lrf-home-corner{
      display:none;
      position:absolute;
      z-index:2;
      pointer-events:none;
      user-select:none;
      -webkit-user-select:none;
      opacity:.94;
      line-height:0;
      filter:drop-shadow(0 4px 10px rgba(69,39,20,.08));
    }
    .lrf-home-corner img{
      display:block;
      width:100%;
      height:auto;
      max-width:none;
    }

    @media (min-width:901px){
      .hero-video-section.lrf-home-light-mode .lrf-home-corner{display:block}
      .hero-video-section.lrf-home-dark-mode .lrf-home-corner{display:none!important}

      .lrf-home-corner.top-left{
        top:-2px;
        left:-2px;
        width:clamp(170px,13vw,255px);
      }
      .lrf-home-corner.top-right{
        top:-2px;
        right:-2px;
        width:clamp(170px,13vw,255px);
      }
      .lrf-home-corner.bottom-left{
        bottom:-2px;
        left:-2px;
        width:clamp(190px,15vw,285px);
      }
      .lrf-home-corner.bottom-right{
        bottom:-2px;
        right:-2px;
        width:clamp(190px,15vw,285px);
      }
    }

    @media (max-width:1100px) and (min-width:901px){
      .lrf-home-corner.top-left,
      .lrf-home-corner.top-right{width:165px}
      .lrf-home-corner.bottom-left,
      .lrf-home-corner.bottom-right{width:185px}
    }

    @media (max-width:900px){
      .lrf-home-corner{display:none!important}
    }
  `;
  document.head.appendChild(style);

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
    hero.appendChild(holder);
  });
})();
