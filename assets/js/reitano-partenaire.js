(() => {
  function patch() {
    const grid = document.getElementById('grid-partenaires');
    if (!grid) return false;
    const card = [...grid.querySelectorAll('.partner-card')].find(item => /reitano/i.test(item.querySelector('h3')?.textContent || ''));
    if (!card) return false;
    const logo = card.querySelector('div[style*="position:absolute"]');
    if (logo) {
      logo.style.backgroundImage = "url('assets/img/reitano.svg')";
      logo.style.backgroundRepeat = 'no-repeat';
      logo.style.backgroundPosition = 'right top';
      logo.style.backgroundSize = 'contain';
    }
    return true;
  }

  function install() {
    if (patch()) return;
    const grid = document.getElementById('grid-partenaires');
    if (!grid) {
      let tries = 0;
      const timer = setInterval(() => {
        if (patch() || ++tries > 40) clearInterval(timer);
      }, 100);
      return;
    }
    const observer = new MutationObserver(() => {
      if (patch()) observer.disconnect();
    });
    observer.observe(grid, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
