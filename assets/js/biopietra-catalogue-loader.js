(() => {
  'use strict';
  let pending;
  window.LRF_BIOPIETRA_LOAD = () => pending ||= fetch('assets/data/biopietra-catalogue.json?v=20261101-biopietra1')
    .then(response => { if (!response.ok) throw Error('Catalogue indisponible'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data.collections) || !data.collections.length) throw Error('Catalogue indisponible');
      window.BIOPIETRA_CATALOGUE = data.collections;
      window.dispatchEvent(new CustomEvent('lrf-biopietra-data-ready'));
      return data;
    }).catch(error => { pending = null; window.dispatchEvent(new CustomEvent('lrf-biopietra-data-error')); throw error; });
})();
