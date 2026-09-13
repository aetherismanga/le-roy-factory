(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_ORDER_COLOR_IMAGES__) return;
  window.__LRF_BIOPIETRA_ORDER_COLOR_IMAGES__ = true;

  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const EXACT = {
    acropoli: {
      'b81': 'https://biopietra.com/wp-content/uploads/2024/07/Acropoli-B81_min-964x640.jpg',
      'b82': 'https://biopietra.com/wp-content/uploads/2023/09/Acropoli-B82-964x640.jpg',
      'beige credaro': 'https://biopietra.com/wp-content/uploads/2016/08/Acropoli-Beige-Credaro-964x640.jpg',
      'd0': 'https://biopietra.com/wp-content/uploads/2024/03/Acropoli-D0-F1-S-L-GS-964x640.jpg',
      'g85': 'https://biopietra.com/wp-content/uploads/2023/01/Acropoli-G85-GS-964x640.jpg',
      'g87': 'https://biopietra.com/wp-content/uploads/2023/12/Acropoli-G87-F0-964x640.jpeg',
      'm92': 'https://biopietra.com/wp-content/uploads/2024/04/Acropoli-M92-F1-S-L-T-964x640.jpg',
      'm94': 'https://biopietra.com/wp-content/uploads/2023/01/Acropoli-M94-964x640.jpg',
      'm95': 'https://biopietra.com/wp-content/uploads/2023/01/Acropoli-M95-GS-964x640.jpg',
      'm96': 'https://biopietra.com/wp-content/uploads/2019/09/Acropoli-M96-Minimale-964x640.jpg',
      'mix acr 01': 'https://biopietra.com/wp-content/uploads/2025/06/Mix-Acr-01-Acropoli-B82_50G85_50-F0-964x640.jpg',
      'terra': 'https://biopietra.com/wp-content/uploads/2016/08/Acropoli-Terra-F2-S-L-964x640.jpg',
      'zolfo': 'https://biopietra.com/wp-content/uploads/2016/08/acropoli_zolfo_min0003-964x640.jpg'
    }
  };

  const api = window.BIOPIETRA_PRODUCT_OPTIONS;
  if (!api || typeof api.imageFor !== 'function') return;

  const originalImageFor = api.imageFor.bind(api);

  function exactFor(product, color) {
    const productMap = EXACT[norm(product)];
    const url = productMap?.[norm(color)];
    return url ? { url, title: `${product} · ${color}`, exact: true } : null;
  }

  function matchesProduct(item, product, entry) {
    const hay = norm(`${item?.title || ''} ${item?.url || ''}`);
    const names = [product, entry?.q].filter(Boolean).map(norm).filter(Boolean);
    return names.some(name => hay.includes(name));
  }

  function matchesColor(item, color) {
    const hay = norm(`${item?.title || ''} ${item?.url || ''}`);
    const c = norm(color);
    if (!c) return false;
    if (hay.includes(c)) return true;
    const compactHay = hay.replace(/\s+/g, '');
    const compactColor = c.replace(/\s+/g, '');
    return compactColor.length >= 2 && compactHay.includes(compactColor);
  }

  api.imageFor = async function(product, color) {
    const exact = exactFor(product, color);
    if (exact) return exact;

    try {
      const normal = await originalImageFor(product, color);
      if (normal && matchesColor(normal, color)) return normal;
    } catch (_) {}

    // Recherche de secours : la médiathèque WordPress répond souvent mieux
    // sur la teinte seule que sur "produit + teinte".
    try {
      const entry = api.entry?.(product);
      const byColor = await api.mediaSearch?.(color) || [];
      const hit = byColor.find(item => matchesProduct(item, product, entry) && matchesColor(item, color));
      if (hit) return hit;
    } catch (_) {}

    return null;
  };

  window.LRF_BIOPIETRA_ORDER_EXACT_COLOR_IMAGES = EXACT;
})();
