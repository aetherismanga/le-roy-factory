(() => {
  const SESSION_KEY = 'lrfProSession';
  const PARTNER = 'elios-ceramica';

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/,/g, '.').replace(/\s+/g, '').trim();

  const money = amount => Number(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.partenaires)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function hasPartner(session, partner) {
    const wanted = norm(partner);
    return !!session && session.partenaires.some(p => {
      const current = norm(p);
      return current === wanted || (wanted === PARTNER && (current === 'elios' || current === 'eliosceramica'));
    });
  }

  const result = (amount, options = {}) => ({
    amount,
    unit: options.unit || 'net/m²',
    label: options.label || `${money(amount)} € ${options.unit || 'net/m²'}`,
    note: options.note || '',
    variants: options.variants || []
  });

  const generic = {
    '30x60': 12,
    '60x60': 12,
    '30.5x61': 12,
    '30.5x60.5': 12,
    '40.5x40.5': 12,
    '40.6x40.6': 12,
    '40.5x61': 12,
    '40.6x60.9': 12,
    '61x61': 12,
    '20x20': 14,
    '20.3x20.3': 14,
    '20x40': 14,
    '20.3x40.6': 14,
    '60x120': 15,
    '100x100': 17.5,
    '50x100': 17.5,
    '120x120': 22,
    '20.3x90.6': 11.5,
    '24x120': 13.5,
    '24x150': 15.9,
    '23x119': 14.5,
    '23.4x119.5': 14.5,
    '5x20': 22,
    '6x25': 22,
    '4.8x45': 22,
    '17.5x20': 23,
    '22x25': 23,
    '25x22': 23
  };

  function isPolished(product) {
    return (product.finishes || []).some(f => /poli/i.test(f));
  }

  function has20mm(product) {
    return (product.finishes || []).some(f => /20\s*mm|2\s*cm/i.test(f));
  }

  function specialPrice(product, format) {
    const slug = norm(product.slug);
    const f = norm(format);

    // ROMA: le 60x120 du catalogue 2026 est la version extérieure R11 en 20 mm.
    // Ne jamais lui appliquer le tarif générique du 60x120 standard.
    if (slug === 'roma' && f === '60x120') {
      return result(24, { note: 'ROMA 60×120 — épaisseur 20 mm, version R11. Tarif spécifique 20 mm.' });
    }

    if (slug === 'venere' && (f === '33.3x100' || f === '33x100')) {
      return result(17, { note: 'Finition Matt. Décor : 19,00 € net/m².' });
    }

    if (slug === 'loveanddecors' && f === '120x278') {
      return result(29, {
        note: 'MAGNUS Matt. Version polie : 38,00 € net/m². Décor : 43,00 € net/m². Emballage caisse bois selon quantité.'
      });
    }

    if (slug === 'yosemite') {
      if (f === '7.5x40' || f === '7.5x40.7') return result(19);
      if (f === '15x85') return result(17.5);
      if (f === '23.4x95.7') return result(32);
      if (f === '23.4x148') return result(17.5);
    }

    if (slug === 'allure' && f === '60x120') return result(24);
    if (slug === 'segmento' && f === '15x15') return result(25);

    if (slug === 'clay' && f === '10x10') {
      return result(23, { note: 'Uni. Décor PAT : +5,00 € net/pièce ; décor FLO : +7,00 € net/pièce.' });
    }

    if (slug === 'd-esign-evo' && f === '20x20') {
      return result(20, { note: 'Uni. Décor : 23,00 € net/m².' });
    }

    if (slug === 'loveanddecors-creative' && f === '60x120') {
      return result(179, { unit: 'net / 2 pièces', label: '179,00 € net / 2 pièces' });
    }

    if (slug === 'creta' && f === '60x120') {
      return result(15, { note: 'Version décor CRETA indiquée au tarif : 22,00 € net/m².' });
    }

    return null;
  }

  function genericPrice(product, format) {
    const f = norm(format);
    if (f === '40x120' && has20mm(product)) return result(24, { note: 'Version 20 mm.' });
    const price = generic[f];
    if (price === undefined) return null;

    if (f === '60x120' && isPolished(product)) {
      return result(23, { note: 'Finition polie rectifiée.' });
    }

    if (has20mm(product)) {
      if (f === '60x60') return result(price, { note: 'Version standard. Version 20 mm : 21,00 € net/m².' });
      if (f === '60x120' || f === '40x120') return result(price, { note: 'Version standard. Version 20 mm : 24,00 € net/m².' });
      if (f === '100x100' || f === '50x100') return result(price, { note: 'Version standard. Version 20 mm : 28,00 € net/m².' });
    }

    if (f === '60x60') return result(price, { note: 'Lisse / R11 selon série. Version 20 mm : 21,00 € net/m².' });
    if (f === '60x120') return result(price, { note: 'Lisse / R11. Version 20 mm : 24,00 € net/m².' });
    if (f === '100x100' || f === '50x100') return result(price, { note: 'Lisse / R11. Version 20 mm : 28,00 € net/m².' });

    return result(price);
  }

  function lookup(product, format) {
    return specialPrice(product, format) || genericPrice(product, format);
  }

  window.LRF_INSPIRATIONS_PRICING = {
    source: 'ELIOS TARIF NET - 2026 V01',
    sessionKey: SESSION_KEY,
    getSession: readSession,
    canAccess(partner = PARTNER) {
      return hasPartner(readSession(), partner);
    },
    getPrice(partner, product, format) {
      if (norm(partner) !== PARTNER && norm(partner) !== 'elios' && norm(partner) !== 'eliosceramica') return null;
      if (!hasPartner(readSession(), PARTNER)) return { locked: true };
      const price = lookup(product || {}, format);
      return price || { unavailable: true };
    }
  };
})();
