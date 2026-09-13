(() => {
  'use strict';
  const galleries = {
    'Terrae': ['assets/img/elios/dust/terrae-01.jpg', 'assets/img/elios/dust/terrae-02.jpg', 'assets/img/elios/dust/terrae-03.jpg', 'assets/img/elios/dust/terrae-04.jpg'],
    'Blush': ['assets/img/elios/dust/blush-01.jpg', 'assets/img/elios/dust/blush-02.jpg', 'assets/img/elios/dust/blush-03.jpg', 'assets/img/elios/dust/blush-04.jpg', 'assets/img/elios/dust/blush-05.jpg'],
    'Dove': ['assets/img/elios/dust/dove-01.jpg', 'assets/img/elios/dust/dove-02.jpg', 'assets/img/elios/dust/dove-03.jpg', 'assets/img/elios/dust/dove-04.jpg'],
    'Ice': ['assets/img/elios/dust/ice-01.jpg', 'assets/img/elios/dust/ice-02.jpg', 'assets/img/elios/dust/ice-03.jpg', 'assets/img/elios/dust/ice-04.jpg'],
    'Sage': ['assets/img/elios/dust/sage-01.jpg', 'assets/img/elios/dust/sage-02.jpg', 'assets/img/elios/dust/sage-03.jpg', 'assets/img/elios/dust/sage-04.jpg'],
    'Pine': ['assets/img/elios/dust/pine-01.jpg', 'assets/img/elios/dust/pine-02.jpg', 'assets/img/elios/dust/pine-03.jpg', 'assets/img/elios/dust/pine-04.jpg'],
    'Niagara': ['assets/img/elios/dust/niagara-01.jpg', 'assets/img/elios/dust/niagara-02.jpg', 'assets/img/elios/dust/niagara-03.jpg', 'assets/img/elios/dust/niagara-04.jpg', 'assets/img/elios/dust/niagara-05.jpg'],
    'Ink': ['assets/img/elios/dust/ink-01.jpg', 'assets/img/elios/dust/ink-02.jpg', 'assets/img/elios/dust/ink-03.jpg', 'assets/img/elios/dust/ink-04.jpg'],
  };
  const allImages = Object.values(galleries).flat();
  window.ELIOS_OFFICIAL_GALLERIES = window.ELIOS_OFFICIAL_GALLERIES || {};
  window.ELIOS_OFFICIAL_GALLERIES.dust = allImages;
  window.ELIOS_VERIFIED_VARIANTS = window.ELIOS_VERIFIED_VARIANTS || {};
  window.ELIOS_VERIFIED_VARIANTS.dust = galleries;
  window.ELIOS_IMAGE_DATA = window.ELIOS_IMAGE_DATA || {};
  allImages.forEach((src, i) => { window.ELIOS_IMAGE_DATA[`dust-hd-${i + 1}`] = src; });
  const first = galleries.Terrae?.[0] || allImages[0];
  if (first) window.ELIOS_IMAGE_DATA['dust-1'] = first;
  const catalogue = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const product = catalogue.find(p => p && p.slug === 'dust');
  if (product) {
    product.colors = ['Terrae','Blush','Dove','Ice','Sage','Pine','Niagara','Ink'];
    product.gallery = allImages.map((_, i) => `dust-hd-${i + 1}`);
  }
})();
