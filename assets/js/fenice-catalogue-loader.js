(() => {
  'use strict';
  let pending;
  window.LRF_FENICE_LOAD = () => pending ||= fetch('assets/data/fenice-catalogue.json?v=20261101-fenice1')
    .then(response => { if (!response.ok) throw Error('Catalogue indisponible'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data.collections) || !data.collections.length) throw Error('Catalogue incomplet');
      window.FENICE_CATALOGUE = data.collections;
      window.FENICE_CATALOGUES = data.catalogues || [];
      window.dispatchEvent(new CustomEvent('lrf-fenice-data-ready'));
      return data;
    }).catch(error => {
      pending = null;
      window.dispatchEvent(new CustomEvent('lrf-fenice-data-error',{detail:{message:error.message}}));
      return null;
    });
  document.addEventListener('click', e => {
    if (/fenice/i.test(e.target.closest?.('[data-partner]')?.dataset.partner || '')) window.LRF_FENICE_LOAD();
    if (e.target.closest?.('[data-fenice-retry]')) window.LRF_FENICE_LOAD();
  },true);
  if (/fenice/i.test(new URLSearchParams(location.search).get('partner') || '')) window.LRF_FENICE_LOAD();
})();
