(() => {
  'use strict';
  if (window.__LRF_VIEW_ACCESSORIES__) return;
  window.__LRF_VIEW_ACCESSORIES__ = true;

  const piece = (kind, name, format, extra = {}) => ({ kind, name, format, unit:'pièce', ...extra });
  const plinth = format => piece('Plinthe', 'Plinthe', format);
  const special = (name, format) => piece('Pièce spéciale', name, format);
  const many = (name, formats) => formats.map(format => special(name, format));

  const MAP = {
    'view-blois': [
      plinth('7,5×60'),
      ...many('Marche antidérapante', ['30×60','30×90'])
    ],
    'view-ardenne': [
      plinth('6,5×120'), plinth('6,5×80'), plinth('7,5×60'),
      ...many('Marche antidérapante', ['30×60','30×80','30×120']),
      ...many('Marche linéaire', ['30×60','30×80','30×120']),
      ...many('Marche angulaire DX/SX', ['30×60','30×80','30×120'])
    ],
    'view-docks': [
      plinth('6,5×100'),
      special('Marche antidérapante','30×100'),
      special('Marche linéaire','30×100'),
      special('Marche angulaire DX/SX','30×100')
    ],
    'view-digione': [
      plinth('6,5×90'),
      special('Marche antidérapante','30×90'),
      special('Marche linéaire','30×90'),
      special('Marche angulaire DX/SX','30×90')
    ],
    'view-corso': [
      plinth('6,5×60'), plinth('6,5×120'),
      ...many('Marche antidérapante', ['30×60','30×90','30×120']),
      ...many('Marche linéaire', ['30×60','30×90','30×120']),
      ...many('Marche angulaire DX/SX', ['30×60','30×90','30×120'])
    ],
    'view-marais': [
      plinth('6,5×60'),
      ...many('Marche antidérapante', ['30×60','30×90']),
      ...many('Marche linéaire', ['30×60','30×90']),
      ...many('Marche angulaire DX/SX', ['30×60','30×90'])
    ],
    'view-tibur': [
      plinth('7,5×90'), plinth('7,5×60'),
      ...many('Marche antidérapante', ['30×60','30×90']),
      ...many('Marche linéaire', ['30×60','30×90']),
      ...many('Marche angulaire DX/SX', ['30×60','30×90'])
    ],
    'view-oikos': [
      plinth('6,5×120'),
      special('Marche antidérapante','30×120'),
      special('Marche linéaire','30×120'),
      special('Marche angulaire DX/SX','30×120')
    ],
    'view-marmi': [
      plinth('6,5×120'), plinth('7,5×60'),
      ...many('Marche antidérapante', ['30×60','30×120']),
      ...many('Marche linéaire', ['30×60','30×120']),
      ...many('Marche angulaire DX/SX', ['30×60','30×120'])
    ],
    'view-light': [
      plinth('6,5×100'), plinth('7,5×60'),
      ...many('Marche antidérapante', ['30×60','30×100','30×120']),
      ...many('Marche linéaire', ['30×60','30×100','30×120']),
      ...many('Marche angulaire DX/SX', ['30×60','30×100','30×120'])
    ],
    'view-dorset': [
      plinth('7,5×60'),
      ...many('Marche antidérapante', ['30×60','30×90']),
      ...many('Marche linéaire', ['30×60','30×90']),
      ...many('Marche angulaire DX/SX', ['30×60','30×90'])
    ],
    'view-baar-stone': [
      plinth('6,5×120'), plinth('6,5×60'),
      ...many('Marche antidérapante', ['30×60','30×120']),
      ...many('Marche linéaire', ['30×60','30×120']),
      ...many('Marche angulaire DX/SX', ['30×60','30×120'])
    ],
    'view-golden-stone': [
      plinth('6×120'), plinth('7,5×60'),
      ...many('Marche antidérapante', ['30×60','30×120']),
      ...many('Marche linéaire', ['30×60','30×120']),
      ...many('Marche angulaire DX/SX', ['30×60','30×120'])
    ],
    'view-new-wood': [
      special('Gradone Toro','20 mm'),
      special('Becco di Civetta Step','20 mm'),
      special('Gradone Costa Retta L','20 mm'),
      special('Gradone Angolare Costa Retta L DX/SX','20 mm')
    ],
    'view-quantum': [
      special('Gradone Toro','20 mm'),
      special('Becco di Civetta Step','20 mm'),
      special('Gradone Costa Retta L','20 mm'),
      special('Gradone Angolare Costa Retta L DX/SX','20 mm')
    ],
    'view-pietre-6090': [
      special('Gradone Toro','20 mm'),
      special('Becco di Civetta Step','20 mm'),
      special('Gradone Costa Retta L','20 mm'),
      special('Gradone Angolare Costa Retta L DX/SX','20 mm')
    ]
  };

  const apply = () => {
    if (!Array.isArray(window.VIEW_CATALOGUE)) return false;
    window.VIEW_CATALOGUE.forEach(product => {
      const rows = MAP[product.id];
      if (!rows?.length) return;
      product.accessories = rows.map((row, index) => ({
        key: `${product.id}-accessory-${index + 1}`,
        colors: Array.isArray(row.colors) && row.colors.length ? row.colors : [...(product.colors || [])],
        refs: row.refs || {},
        ...row
      }));
    });
    window.VIEW_ACCESSORIES = MAP;
    window.dispatchEvent(new CustomEvent('lrf-view-accessories-ready'));
    return true;
  };

  if (!apply()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (apply() || tries > 40) clearInterval(timer);
    }, 100);
  }
})();