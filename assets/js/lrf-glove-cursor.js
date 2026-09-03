(() => {
  if (window.__LRF_GLOVE_CURSOR__) return;
  window.__LRF_GLOVE_CURSOR__ = true;

  const finePointer = window.matchMedia('(pointer: fine) and (min-width: 901px)').matches;
  if (!finePointer) return;

  const interactiveSelector = [
    'a[href]',
    'button:not(:disabled)',
    '[role="button"]',
    'summary',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    '.btn',
    '.hero-btn',
    '.agent-btn',
    '.config-open',
    '.calc-btn',
    '.reset-btn'
  ].join(',');

  const init = () => {
    if (!document.body || document.body.classList.contains('crm-body')) return;
    if (document.getElementById('lrf-glove-cursor')) return;

    const style = document.createElement('style');
    style.id = 'lrf-glove-cursor-style';
    style.textContent = `
      @media (pointer: fine) and (min-width: 901px) {
        html.lrf-glove-cursor-ready body:not(.crm-body) :is(${interactiveSelector}),
        html.lrf-glove-cursor-ready body:not(.crm-body) :is(${interactiveSelector}) * {
          cursor: none !important;
        }

        #lrf-glove-cursor {
          position: fixed;
          left: 0;
          top: 0;
          width: 66px;
          height: 66px;
          z-index: 2147483647;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transform: translate(-31%, -4%) scale(.96) rotate(-2deg);
          transform-origin: 31% 4%;
          transition: opacity .08s ease, transform .075s ease, filter .12s ease;
          will-change: left, top, transform, opacity;
          filter: drop-shadow(0 4px 5px rgba(0,0,0,.22)) drop-shadow(0 0 5px rgba(212,175,55,.28));
        }

        #lrf-glove-cursor img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
        }

        #lrf-glove-cursor.is-visible {
          opacity: 1;
          visibility: visible;
        }

        #lrf-glove-cursor.is-hovering {
          transform: translate(-31%, -4%) scale(1) rotate(0deg);
          filter: drop-shadow(0 4px 5px rgba(0,0,0,.22)) drop-shadow(0 0 8px rgba(255,205,55,.42));
        }

        #lrf-glove-cursor.is-clicking {
          transform: translate(-31%, -4%) scale(.84) rotate(-5deg);
          filter: drop-shadow(0 2px 3px rgba(0,0,0,.2)) drop-shadow(0 0 11px rgba(255,205,55,.62));
        }

        #lrf-glove-cursor::after {
          content: '';
          position: absolute;
          left: 31%;
          top: 4%;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(.3);
          background: radial-gradient(circle, rgba(255,244,180,.95) 0%, rgba(255,208,64,.66) 35%, rgba(255,208,64,0) 72%);
          pointer-events: none;
        }

        #lrf-glove-cursor.is-clicking::after {
          animation: lrfGloveImpact .22s ease-out forwards;
        }

        @keyframes lrfGloveImpact {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(.28); }
          65% { opacity: .95; transform: translate(-50%, -50%) scale(1.65); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #lrf-glove-cursor { transition: none !important; }
        #lrf-glove-cursor.is-clicking::after { animation: none !important; }
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = 'lrf-glove-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    const glove = document.createElement('img');
    glove.alt = '';
    glove.decoding = 'async';
    glove.fetchPriority = 'low';
    glove.src = 'assets/img/gantlrf.png?v=20260902-glove1';
    cursor.appendChild(glove);
    document.body.appendChild(cursor);

    let activeTarget = null;

    const getInteractive = target => target instanceof Element ? target.closest(interactiveSelector) : null;

    const move = event => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      activeTarget = getInteractive(event.target);
      const visible = !!activeTarget;
      cursor.classList.toggle('is-visible', visible);
      cursor.classList.toggle('is-hovering', visible);
      if (!visible) cursor.classList.remove('is-clicking');
    };

    document.addEventListener('pointermove', move, { passive: true });

    document.addEventListener('pointerdown', event => {
      activeTarget = getInteractive(event.target);
      if (!activeTarget) return;
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.classList.remove('is-clicking');
      void cursor.offsetWidth;
      cursor.classList.add('is-visible', 'is-hovering', 'is-clicking');
    }, { passive: true });

    const release = () => cursor.classList.remove('is-clicking');
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });

    document.addEventListener('pointerleave', () => {
      cursor.classList.remove('is-visible', 'is-hovering', 'is-clicking');
    }, { passive: true });

    window.addEventListener('blur', () => {
      cursor.classList.remove('is-visible', 'is-hovering', 'is-clicking');
    });

    glove.addEventListener('load', () => {
      document.documentElement.classList.add('lrf-glove-cursor-ready');
    }, { once: true });

    glove.addEventListener('error', () => {
      cursor.remove();
      style.remove();
      document.documentElement.classList.remove('lrf-glove-cursor-ready');
      console.warn('Curseur gant LRF indisponible : assets/img/gantlrf.png');
    }, { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
