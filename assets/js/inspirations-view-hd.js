(() => {
  'use strict';
  if (window.__LRF_VIEW_HD_GALLERIES__) return;
  window.__LRF_VIEW_HD_GALLERIES__ = true;

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const GALLERIES = {
    'blois': [
      'https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Gris-2000x-600x424.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Beige-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Beige-3-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Gris-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Antracite-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Antracite-2-700x-600x600.jpg'
    ],
    'docks': [
      'https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Grigio-700x-600x385.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Sabbia-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Sabbia-2-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Grigio-700x-1-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Antracite-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Antracite-2-700x-600x600.jpg'
    ],
    'digione': [
      'https://viewceramiche.com/wp-content/uploads/2023/11/Digione-Perla-2000x-600x424.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Digione-Perla-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Digione-Grigio-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Digione-Oro-700x-600x600.jpg'
    ],
    'corso': [
      'https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Beige-2000x-600x445.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Avorio-700x2-1-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Avorio-Modulo-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Beige-700x-4-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Beige-Vintage-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Beige-Burattato-700x-600x600.jpg'
    ],
    'marais': [
      'https://viewceramiche.com/wp-content/uploads/2024/08/Marais-Argento-2000x-600x654.jpg',
      'https://viewceramiche.com/wp-content/uploads/2024/08/Marais-Avana-2-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2024/08/Marais-Beige-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2024/08/Marais-Argento-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2024/08/Marais-Grafite-700x-600x600.jpg',
      'https://viewceramiche.com/wp-content/uploads/2024/08/Marais-Grafite-Vintage-700x-600x600.jpg'
    ],
    'oikos': [
      'https://viewceramiche.com/wp-content/uploads/2023/11/Oikos-Silver-2000x.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Oikos-White-700x-150x150.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Oikos-Silver-700x-150x150.jpg',
      'https://viewceramiche.com/wp-content/uploads/2023/11/Oikos-Grey-700x-150x150.jpg'
    ],
    'ardenne': [
      'https://viewceramiche.com/wp-content/uploads/2023/11/Ardenne-Sabbia-2000x-300x300.jpg'
    ]
  };

  const toUrl = image => typeof image === 'string' ? image : image?.url;
  const mergeImages = (product, urls) => {
    const current = Array.isArray(product.images) ? product.images.map(toUrl).filter(Boolean) : [];
    const hasRealOfficial = urls && urls.length;
    const all = [...(urls || []), ...current]
      .filter(url => !hasRealOfficial || !/assets\/img\/view\.png/i.test(url));
    const unique = [...new Set(all)];
    product.images = unique.map((url, i) => ({
      url,
      alt: `${product.name || product.collection || 'VIEW'} · visuel ${i + 1}`
    }));
  };

  const apply = () => {
    if (!Array.isArray(window.VIEW_CATALOGUE)) return;
    window.VIEW_CATALOGUE.forEach(product => {
      const key = norm(product.name || product.collection);
      mergeImages(product, GALLERIES[key]);
    });
  };

  window.VIEW_HD_GALLERIES = GALLERIES;
  apply();
})();
