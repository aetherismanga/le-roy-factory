(() => {
  'use strict';
  const isPool = product => String(product.slug || '').startsWith('pool-') && product.slug !== 'pool-surfaces';
  function groupPools(products) {
    const pools = products.filter(isPool);
    if (!pools.length) return products;
    return [...products.filter(product => !isPool(product)), {
      id: 'elios-pool-surfaces', slug: 'pool-surfaces', name: 'Pool Surfaces',
      collection: 'Pool Surfaces', category: 'Piscine', effect: 'Piscine',
      description: 'Toutes les collections piscine Elios réunies dans un même espace : ambiances, coloris, formats et références.',
      images: pools[0].images || [], colorFamilies: [], formats: ['15x15'],
      groupSize: pools.length
    }];
  }
  window.LRF_ELIOS_SELECTION_MODEL = Object.freeze({isPool, groupPools});
})();
