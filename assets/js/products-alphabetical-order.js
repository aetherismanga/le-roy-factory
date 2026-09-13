(() => {
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true, ignorePunctuation: true });
  const targets = [
    { selector: '#partner-products', card: '.product-card-v2' },
    { selector: '#products-grid', card: '.product-card' }
  ];

  function productName(card) {
    return (card.querySelector('h3')?.textContent || card.getAttribute('aria-label') || '').trim();
  }

  function install({ selector, card }) {
    const grid = document.querySelector(selector);
    if (!grid || grid.dataset.alphaSortInstalled === '1') return;
    grid.dataset.alphaSortInstalled = '1';

    let observer;
    let scheduled = false;

    const sort = () => {
      scheduled = false;
      const cards = Array.from(grid.querySelectorAll(`:scope > ${card}`));
      if (cards.length < 2) return;
      const sorted = [...cards].sort((a, b) => collator.compare(productName(a), productName(b)));
      const alreadySorted = cards.every((node, index) => node === sorted[index]);
      if (alreadySorted) return;

      observer.disconnect();
      const fragment = document.createDocumentFragment();
      sorted.forEach(node => fragment.appendChild(node));
      grid.appendChild(fragment);
      observer.observe(grid, { childList: true });
    };

    const scheduleSort = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(sort);
    };

    observer = new MutationObserver(scheduleSort);
    observer.observe(grid, { childList: true });
    scheduleSort();
  }

  function init() {
    targets.forEach(install);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
