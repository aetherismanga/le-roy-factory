(() => {
  'use strict';
  if (window.__LRF_VIEW_TARIFF_20261015__) return;
  window.__LRF_VIEW_TARIFF_20261015__ = true;

  // Nouveau tarif officiel VIEW fourni par l'agence.
  // Application automatique à partir du 15 octobre 2026 (heure France).
  // IMPORTANT : ce module ne touche jamais à la page des lots promotionnels VIEW.
  const EFFECTIVE_AT = Date.parse('2026-10-15T00:00:00+02:00');
  if (Date.now() < EFFECTIVE_AT) return;
  if (!Array.isArray(window.VIEW_CATALOGUE)) return;

  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const fmt = v => String(v || '').replace(/[xX*]/g,'×').replace(/\s/g,'');
  const is20 = v => /20\s*mm/i.test(String(v?.thickness || ''));
  const isMarmi = p => norm(p?.id).includes('marmi') || norm(p?.collection).includes('marmi');
  const isBurattato = v => /burattato/i.test(String(v?.finish || ''));
  const isVintage = v => /vintage|lappato/i.test(String(v?.finish || ''));
  const isLevigato = v => /levigato|poli/i.test(String(v?.finish || ''));
  const isMatt = v => /matt/i.test(String(v?.finish || ''));

  const tenMm = {
    '30×60':[13,15], '60×60':[13,15],
    '40×60':[12,14],
    '80×80':[16,18],
    '60×90':[16,18],
    '90×90':[16.5,18.5],
    '100×100':[18,20],
    '20×120':[14,16], '30×120':[14,16],
    '60×120':[15.5,17.5],
    '120×120':[20,22]
  };
  const twentyMm = {
    '60×60':[22,24], '61×61':[22,24],
    '80×80':[27.5,29.5],
    '45×90':[25,27],
    '60×90':[25,27],
    '90×90':[27.5,29.5],
    '100×100':[29.5,31.5],
    '40×122':[27,29],
    '60×120':[26,28],
    '120×120':[41.5,43.5],
    '80×180':[49,51]
  };

  function setPair(v, pair) {
    if (!pair) return false;
    v.proPrice = null;
    v.proPalette = pair[0];
    v.proDetail = pair[1];
    v.tariffEffective = '2026-10-15';
    return true;
  }

  for (const p of window.VIEW_CATALOGUE) {
    for (const v of (p?.variants || [])) {
      const f = fmt(v.format);

      // Golden Stone : trois petits formats ont un net unique dans la grille.
      if (f === '7,5×7,5') { v.proPrice = 37; delete v.proPalette; delete v.proDetail; v.tariffEffective='2026-10-15'; continue; }
      if (f === '7,5×30') { v.proPrice = 21; delete v.proPalette; delete v.proDetail; v.tariffEffective='2026-10-15'; continue; }
      if (f === '30×30') { v.proPrice = 18.5; delete v.proPalette; delete v.proDetail; v.tariffEffective='2026-10-15'; continue; }

      // I Marmi di View dispose de sa propre grille.
      if (isMarmi(p)) {
        if (f === '60×120' && isMatt(v)) { setPair(v,[19.5,21.5]); continue; }
        if (f === '60×120' && isLevigato(v)) { setPair(v,[26,28]); continue; }
        if (f === '120×120' && isMatt(v)) { setPair(v,[22,24]); continue; }
        if (f === '120×120' && isLevigato(v)) { setPair(v,[30,32]); continue; }
      }

      if (is20(v)) {
        setPair(v, twentyMm[f]);
        continue;
      }

      // Corso Burattato et Modulo A ont des lignes spécifiques.
      if (isBurattato(v) && /modulo/i.test(String(v.format || ''))) { setPair(v,[33,35]); continue; }
      if (isBurattato(v) && f === '60×90') { setPair(v,[34,36]); continue; }
      if (/modulo/i.test(String(v.format || ''))) { setPair(v,[14.5,16.5]); continue; }

      const base = tenMm[f];
      if (!base) continue;
      const add = isVintage(v) ? 5 : 0;
      setPair(v,[base[0] + add, base[1] + add]);
    }
    if (p?.sourceLabel) p.sourceLabel = 'VIEW · Tarif net FR CL 0126 · applicable au 15/10/2026';
  }

  window.dispatchEvent(new CustomEvent('lrf-view-tariff-updated',{detail:{effective:'2026-10-15'}}));
})();