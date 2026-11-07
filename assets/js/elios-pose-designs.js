((global) => {
  'use strict';

  const quarter = value => ((value % 360) + 360) % 360;
  const modulo = (value, period) => ((value % period) + period) % period;
  const copy = value => Array.isArray(value) ? value.map(copy) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) : value;

  function references(data) {
    if (!Array.isArray(data?.colors) || !data.colors.length) throw new Error('Le catalogue Segmento est indisponible.');
    const map = new Map();
    for (const color of data.colors) {
      if (!color?.id || !(color.ref || color.reference) || map.has(color.id)) throw new Error('Le catalogue contient une référence Segmento invalide.');
      map.set(color.id, color);
    }
    return map;
  }

  function validate(data, composition) {
    const colors = references(data), columns = composition?.columns, rows = composition?.rows;
    if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || columns > 64 || rows > 64
      || !Array.isArray(composition.tiles) || composition.tiles.length !== columns * rows) {
      throw new Error('Le dessin doit contenir une grille complète de carreaux carrés.');
    }
    const positions = new Set();
    for (const tile of composition.tiles) {
      const key = tile?.col + ':' + tile?.row;
      if (!Number.isInteger(tile?.col) || !Number.isInteger(tile?.row) || tile.col < 0 || tile.col >= columns || tile.row < 0 || tile.row >= rows || positions.has(key)) {
        throw new Error('Chaque case du dessin doit contenir exactement un carreau.');
      }
      if (!colors.has(tile.color)) throw new Error('Ce coloris ne correspond pas à un vrai carreau Segmento.');
      if (![0, 90, 180, 270].includes(tile.rotation ?? 0)) throw new Error('Les carreaux doivent être tournés par quarts de tour.');
      positions.add(key);
    }
    return true;
  }

  function roles(data, composition) {
    validate(data, composition);
    const colors = references(data), counts = new Map();
    // Preserve the source's first-appearance order, also used by the palette UI.
    for (const tile of composition.tiles) counts.set(tile.color, (counts.get(tile.color) || 0) + 1);
    return [...counts].map(([id, count]) => {
      const color = colors.get(id);
      return { id, color: id, label: color.label || color.name || id, ref: color.ref || color.reference, count };
    });
  }

  function rows(data, composition) {
    const pcs = Number(data?.packaging?.pieces ?? data?.format?.pcsBox), boxM2 = Number(data?.packaging?.area ?? data?.format?.m2Box);
    if (!Number.isInteger(pcs) || pcs <= 0 || !Number.isFinite(boxM2) || boxM2 <= 0) throw new Error('Le conditionnement Segmento est invalide.');
    return roles(data, composition).map(role => ({
      series: 'Segmento', color: role.label, ref: role.ref, colorId: role.id,
      key: '15x15', label: '15 × 15 cm', count: role.count, share: role.count / composition.tiles.length * 100,
      pcs, boxM2, finish: (data.technical?.slipRating || 'R9') + ' · ' + String(data.technical?.thicknessMm || 8.5).replace('.', ',') + ' mm',
    }));
  }

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
    return (result >>> 0).toString(16).padStart(8, '0');
  }

  function compose(data, base, options = {}) {
    validate(data, base);
    if (options.mirror || options.flipX || options.flipY) throw new Error('Une photo de carreau ne peut pas être retournée en miroir.');
    const rotation = options.rotation ?? 0;
    if (!Number.isFinite(rotation) || rotation % 90 !== 0) throw new Error('Le dessin ne peut tourner que par quarts de tour.');
    const turn = quarter(rotation), mapping = options.mapping || {}, colors = references(data), sourceColors = new Set(base.tiles.map(tile => tile.color));
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) throw new Error('L’association des carreaux est invalide.');
    for (const [source, target] of Object.entries(mapping)) {
      if (!sourceColors.has(source)) throw new Error('La référence de départ ne fait pas partie de ce dessin.');
      if (!colors.has(target)) throw new Error('Choisissez une des vraies références Segmento.');
    }
    const steps = turn / 90;
    const tiles = base.tiles.map(tile => {
      let col = tile.col, row = tile.row, columns = base.columns, rows = base.rows;
      for (let i = 0; i < steps; i++) {
        [col, row] = [rows - 1 - row, col];
        [columns, rows] = [rows, columns];
      }
      return { ...copy(tile), col, row, color: mapping[tile.color] ?? tile.color, rotation: quarter((tile.rotation || 0) + turn) };
    }).sort((a, b) => a.row - b.row || a.col - b.col);
    const columns = steps % 2 ? base.rows : base.columns, rowCount = steps % 2 ? base.columns : base.rows;
    const source = base.sourceComposition || base.id || 'dessin', title = String(base.label || base.name || source).replace(/^Création LRF\s*·\s*/, '');
    const signature = JSON.stringify([columns, rowCount, tiles.map(tile => [tile.col, tile.row, tile.color, tile.rotation])]);
    const result = {
      ...copy(base), id: 'LRF-' + String(source).replace(/^LRF-/, '') + '-' + hash(signature),
      columns, rows: rowCount, tiles, label: 'Création LRF · ' + title,
      origin: 'lrf', preview: null, sourceComposition: source,
      provenance: { kind: 'lrf-composition', sourceComposition: source, sourcePatternId: base.sourcePatternId || base.patternId || null, sourceDataVersion: data.version || null, rotation: turn, mapping: copy(mapping) },
    };
    validate(data, result);
    result.description = rows(data, result).map(row => row.color + ' ' + Math.round(row.share) + ' %').join(' · ');
    return result;
  }

  const paletteDefinitions = [
    ['graphite-craie', 'Graphite & craie', ['duplex-a', 'albus', 'nigrum', 'duplex-f']],
    ['bleus-ceramiques', 'Bleus céramiques', ['duplex-c', 'coelestis', 'caeruleus', 'albus']],
    ['terre-cuite', 'Terre cuite', ['duplex-b', 'amaryllis', 'rubens', 'albus']],
    ['vert-ocre', 'Vert & ocre', ['duplex-d', 'flavus', 'viridis', 'albus']],
    ['lagune', 'Lagune', ['duplex-e', 'lapis', 'nox', 'albus']],
    ['nuit-minerale', 'Nuit minérale', ['duplex-f', 'nigrum', 'nox', 'coelestis']],
    ['pastels-poudres', 'Pastels poudrés', ['amaryllis', 'albus', 'coelestis', 'flavus']],
    ['soleil-azur', 'Soleil & azur', ['flavus', 'coelestis', 'caeruleus', 'albus']],
    ['jardin-terre', 'Jardin de terre', ['viridis', 'amaryllis', 'rubens', 'albus']],
    ['bleu-sable', 'Bleu & sable', ['caeruleus', 'amaryllis', 'coelestis', 'albus']],
    ['rose-graphite', 'Rose & graphite', ['amaryllis', 'nigrum', 'albus', 'rubens']],
    ['foret-nocturne', 'Forêt nocturne', ['nox', 'lapis', 'viridis', 'flavus']],
  ];

  function palettes(data) {
    const colors = references(data);
    return paletteDefinitions.map(([id, label, values]) => {
      if (values.some(value => !colors.has(value))) throw new Error('Une palette utilise une référence Segmento inconnue.');
      return { id, label, colors: [...values], origin: 'lrf' };
    });
  }

  function templates(data) {
    const defaults = ['duplex-a', 'albus', 'nigrum', 'duplex-f'];
    const quarterAt = (col, row) => row < 3 ? (col < 3 ? 0 : 90) : (col < 3 ? 270 : 180);
    const pinwheel = (col, row) => [[0, 90], [270, 180]][row % 2][col % 2];
    const definitions = [
      ['rubans-croises', 'Rubans croisés', 2, (c, r) => [c % 3 === 1 || r % 3 === 1 ? 0 : 1, (c + r) % 2 * 90]],
      ['damier-pointes', 'Damier à pointes', 2, (c, r) => [(Math.floor(c / 2) + Math.floor(r / 2)) % 2, pinwheel(c, r)]],
      ['etoile-centrale', 'Étoile centrale', 3, (c, r) => [Math.abs(c - 2.5) + Math.abs(r - 2.5) < 2 ? 0 : Math.abs(c - 2.5) + Math.abs(r - 2.5) < 4 ? 1 : 2, quarterAt(c, r)]],
      ['vagues-diagonales', 'Vagues diagonales', 3, (c, r) => [(c + r) % 3, r % 2 ? 90 : 270]],
      ['tissage-trois-tons', 'Tissage trois tons', 3, (c, r) => [c % 3 === 1 ? 0 : r % 3 === 1 ? 1 : 2, c % 3 === 1 ? 90 : 0]],
      ['escalier-graphique', 'Escalier graphique', 3, (c, r) => [modulo(c - r, 3), Math.floor((c + r) / 2) % 2 * 90]],
      ['couronnes', 'Mosaïque en couronnes', 4, (c, r) => [(c === 0 || c === 5) && (r === 0 || r === 5) ? 3 : Math.min(c, r, 5 - c, 5 - r), quarterAt(c, r)]],
      ['eclats-quadrants', 'Éclats en quadrants', 4, (c, r) => [(c < 3 ? 0 : 1) + (r < 3 ? 0 : 2), quarter(quarterAt(c, r) + (c % 3 + r % 3) % 2 * 90)]],
      ['arlequin-epis', 'Arlequin en épis', 2, (c, r) => [(Math.floor(c / 2) + r) % 2, (c + r) % 4 * 90]],
      ['fleches-alternees', 'Flèches alternées', 2, (c, r) => [r % 3 === 0 ? 1 : 0, quarter([0, 90, 0][c % 3] + (Math.floor(r / 3) % 2) * 180)]],
      ['tartan-diagonal', 'Tartan diagonal', 4, (c, r) => [(c % 3 === 0 ? 1 : 0) + (r % 3 === 0 ? 2 : 0), quarter(modulo(c - r, 2) * 90 + (c % 3 === 0 && r % 3 === 0 ? 180 : 0))]],
      ['medaillons-decales', 'Médaillons décalés', 3, (c, r) => [Math.floor(modulo(c + 2 * Math.floor(r / 2), 6) / 2), pinwheel(c, r)]],
    ];
    return definitions.map(([slug, name, roleCount, tileFor], index) => {
      const id = 'LRF-G' + String(index + 1).padStart(2, '0');
      const composition = { id, patternId: id, name, label: 'Création LRF · ' + name, origin: 'lrf', preview: null, columns: 6, rows: 6, tiles: [] };
      for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
        const [role, rotation] = tileFor(col, row);
        if (!Number.isInteger(role) || role < 0 || role >= roleCount) throw new Error('Le rôle du carreau est invalide.');
        composition.tiles.push({ col, row, color: defaults[role], rotation });
      }
      validate(data, composition);
      if (roles(data, composition).length !== roleCount) throw new Error('Un dessin doit utiliser tous ses repères.');
      composition.description = rows(data, composition).map(row => row.color + ' ' + Math.round(row.share) + ' %').join(' · ');
      composition.slug = slug;
      return composition;
    });
  }

  global.LRF_ELIOS_POSE_DESIGNS = Object.freeze({ templates, palettes, compose, roles, rows, validate });
})(window);
