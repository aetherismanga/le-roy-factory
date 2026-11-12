(() => {
  'use strict';
  const root = document.querySelector('[data-home-promotions]');
  if (!root) return;
  const viewport = root.querySelector('.home-promos-viewport');
  const slides = [...root.querySelectorAll('.home-promo-slide')];
  const controls = root.querySelector('.home-promos-controls');
  const dots = [...controls.querySelectorAll('[data-home-promo]')];
  const pause = controls.querySelector('[data-home-promo-pause]');
  const next = controls.querySelector('[data-home-promo-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = document.querySelector('#elios-black-friday-details');
  let current = 0, paused = false, hovered = false, focused = false, inView = true, changing = false;
  let timer;
  controls.hidden = false;
  const sync = () => {
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.inert = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
    root.dataset.homePromo = current === 0 ? 'reviglass' : 'elios';
    root.dispatchEvent(new Event('lrf:home-promo-change'));
    pause.innerHTML = paused ? '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="m6 3 11 7-11 7z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M7 4v12M13 4v12" stroke="currentColor" stroke-width="2.5"/></svg>';
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Reprendre le défilement des bannières' : 'Mettre les bannières en pause');
  };
  const schedule = () => {
    clearTimeout(timer);
    const running = !paused && !hovered && !focused && !document.hidden && inView && !reduced.matches && !dialog?.open;
    root.dataset.homePromoMotion = running ? 'running' : 'paused';
    if (running && !changing) timer = setTimeout(() => show((current + 1) % slides.length), 7000);
  };
  const show = (index) => {
    if (changing || index === current) return;
    clearTimeout(timer);
    const old = slides[current], target = slides[index];
    current = index;
    sync();
    if (reduced.matches) {
      old.classList.remove('is-current');
      target.classList.add('is-current');
      schedule();
      return;
    }
    changing = true;
    old.classList.add('is-leaving');
    target.classList.add('is-entering');
    setTimeout(() => {
      old.classList.remove('is-current', 'is-leaving');
      target.classList.remove('is-entering');
      target.classList.add('is-current');
      changing = false;
      schedule();
    }, 860);
  };
  dots.forEach((button, index) => button.addEventListener('click', () => show(index)));
  next.addEventListener('click', () => show((current + 1) % slides.length));
  pause.addEventListener('click', () => { paused = !paused; sync(); schedule(); });
  viewport.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  viewport.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  root.addEventListener('focusin', () => { focused = true; schedule(); });
  root.addEventListener('focusout', event => { focused = root.contains(event.relatedTarget); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; schedule(); }).observe(root);
  // Direct image link remains useful when JavaScript or <dialog> is unavailable.
  root.querySelector('.elios-bf-banner').addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || !dialog?.showModal) return;
    event.preventDefault(); dialog.showModal(); schedule();
  });
  dialog?.querySelector('button').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', schedule);
  sync(); schedule();
})();
