(() => {
  'use strict';

  const DATA_URL = 'assets/data/neobath-config-data.json?v=20260818b';
  const STATE_KEY = 'lrfNeobathConfiguratorV2';
  const PRO_KEY = 'lrfProSession';
  const PRO_LEGACY_CODE = '2026';
  const PRO_MAX_AGE = 12 * 60 * 60 * 1000;
  const STEPS = [
    ['collection', 'Collection'],
    ['modules', 'Meuble'],
    ['facade', 'Façade'],
    ['color', 'Couleur'],
    ['basin', 'Vasque'],
    ['worktop', 'Plan'],
    ['mirror', 'Miroir'],
    ['options', 'Options'],
    ['summary', 'Récapitulatif']
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const euro = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  let DATA = null;
  let ITEMS = [];
  let ITEM_MAP = new Map();
  let overlay = null;
  let galleryOverlay = null;
  let galleryState = { collection: 'TOUS', index: 0 };
  let state = loadState();

  function defaultState() {
    return {
      step: 0,
      collection: null,
      modules: [],
      facade: null,
      color: null,
      customRal: false,
      customRalCode: '',
      basinMode: 'none',
      basinChoice: null,
      worktopChoice: null,
      worktopLengthCm: null,
      mirrorChoice: null,
      options: [],
      updatedAt: Date.now()
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? { ...defaultState(), ...parsed } : defaultState();
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() {
    state.updatedAt = Date.now();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
    updateLaunchers();
  }

  function resetState() {
    state = defaultState();
    saveState();
    renderConfigurator();
  }

  function readProSession() {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const raw = store.getItem(PRO_KEY);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') continue;
        if (parsed.unlockedAt && Date.now() - Number(parsed.unlockedAt) > PRO_MAX_AGE) {
          store.removeItem(PRO_KEY);
          continue;
        }
        return parsed;
      } catch (_) {}
    }
    return null;
  }

  function isProUnlocked() { return !!readProSession(); }

  function unlockLegacy(code) {
    if (String(code || '').trim() !== PRO_LEGACY_CODE) return false;
    const session = {
      legacyPro: true,
      societe: 'Accès PRO LE ROY FACTORY',
      partenaires: ['*'],
      unlockedAt: Date.now()
    };
    const raw = JSON.stringify(session);
    try { sessionStorage.setItem(PRO_KEY, raw); } catch (_) {}
    try { localStorage.setItem(PRO_KEY, raw); } catch (_) {}
    window.dispatchEvent(new CustomEvent('lrf-pro-session-changed', { detail: session }));
    return true;
  }

  function activeCollection() {
    if (state.collection && state.collection !== 'LIBRE') return state.collection;
    return state.modules[0]?.collection || null;
  }

  function collectionItems(category) {
    const active = activeCollection();
    return ITEMS.filter(item => item.category === category && (!active || item.collection === active));
  }

  function dimensionsOf(item) {
    const d = { ...(item?.dimensions || {}) };
    const ref = String(item?.ref || '');
    if (!d.width) {
      const match = ref.match(/(?:PL|BA)(\d{2,3})(26|52)(?:DV)?$/i);
      if (match) d.width = Number(match[1]);
    }
    if (!d.height) {
      const h = ref.match(/(26|52)(?:DV)?$/);
      if (h) d.height = Number(h[1]);
    }
    if (!d.depth && (item?.category === 'module' || item?.category === 'finishing_top')) d.depth = 46;
    return d;
  }

  function visualHtml(itemOrVisual, alt = '', className = '') {
    const visual = itemOrVisual?.visual || itemOrVisual;
    const image = visual?.image;
    if (image) return `<div class="nb-visual ${className}"><img src="${esc(image)}" alt="${esc(alt)}" loading="lazy"></div>`;
    const page = visual?.page ? ` · p.${visual.page}` : '';
    return `<div class="nb-visual nb-visual-placeholder ${className}"><span>NEOBATH</span><small>Visuel source PDF${page}</small></div>`;
  }

  function moduleGroups() {
    let source = ITEMS.filter(item => item.category === 'module');
    const effective = activeCollection();
    if (!(state.collection === 'LIBRE' && !effective) && effective) source = source.filter(item => item.collection === effective);
    const groups = new Map();
    source.forEach(item => {
      const d = dimensionsOf(item);
      if (!d.width) return;
      const subtype = item.subtype || (String(item.ref).includes('-PL') ? 'portalavabo' : 'base');
      const height = d.height || (String(item.ref).match(/26/) ? 26 : 52);
      const key = `${item.collection}|${subtype}|${d.width}|${height}`;
      if (!groups.has(key)) groups.set(key, { key, collection: item.collection, subtype, width: d.width, height, depth: d.depth || 46, items: [] });
      groups.get(key).items.push(item);
    });
    return [...groups.values()].sort((a, b) => a.collection.localeCompare(b.collection) || a.subtype.localeCompare(b.subtype) || a.width - b.width || a.height - b.height);
  }

  function facadeDefinition() {
    const collection = activeCollection();
    if (!collection || !state.facade) return null;
    return (DATA.finishes?.[collection]?.facades || []).find(f => f.id === state.facade) || null;
  }

  function resolveModuleItem(group) {
    if (!group) return null;
    if (group.collection === 'ANIMA' && state.facade) {
      const exact = group.items.find(item => item.facade === state.facade);
      if (exact) return exact;
    }
    return group.items[0] || null;
  }

  function priceVariantFor(item, forcedKey = null) {
    const variants = item?.prices || [];
    if (!variants.length) return null;
    if (forcedKey) return variants.find(v => v.key === forcedKey) || variants[0];
    if (item.collection === 'DNA' && ['module', 'storage', 'finishing_top'].includes(item.category)) {
      const key = facadeDefinition()?.priceKey;
      if (key) return variants.find(v => v.key === key) || variants[0];
    }
    return variants[0];
  }

  function isRalSurchargeApplicable(item) {
    return activeCollection() === 'DNA' && state.customRal && state.facade?.startsWith('LACCATO') && ['module', 'storage', 'finishing_top'].includes(item.category);
  }

  function itemUnitPrice(item, forcedKey = null) {
    const variant = priceVariantFor(item, forcedKey);
    if (!variant) return 0;
    let value = Number(variant.price || 0);
    if (isRalSurchargeApplicable(item)) value *= 1 + Number(DATA.finishes?.DNA?.ralSurcharge || 0.20);
    return value;
  }

  function choiceId(item, variant) { return `${item.id}::${variant?.key || 'standard'}`; }

  function parseChoice(id) {
    if (!id) return null;
    const [itemId, priceKey = 'standard'] = String(id).split('::');
    const item = ITEM_MAP.get(itemId);
    if (!item) return null;
    const variant = (item.prices || []).find(v => v.key === priceKey) || item.prices?.[0] || null;
    return { item, variant, id: choiceId(item, variant) };
  }

  function flattenChoices(items) {
    const rows = [];
    items.forEach(item => {
      const variants = item.prices?.length ? item.prices : [{ key: 'standard', label: 'Tarif', price: 0 }];
      variants.forEach(variant => rows.push({ item, variant, id: choiceId(item, variant) }));
    });
    return rows;
  }

  function targetWidth() {
    const groups = new Map(moduleGroups().map(group => [group.key, group]));
    return state.modules.reduce((sum, row) => sum + (groups.get(row.key)?.width || 0) * Number(row.qty || 0), 0);
  }

  function worktopCompatible(item) {
    const width = Number(dimensionsOf(item).width || 0);
    const target = targetWidth();
    if (!target || item.unit === 'cm' || !width) return true;
    return Math.abs(width - target) <= 4 || (width >= target && width <= target + 21);
  }

  function provisionalOrResolvedModulePrice(group) {
    const resolved = resolveModuleItem(group);
    if (state.facade && resolved) return itemUnitPrice(resolved);
    const candidates = [];
    group.items.forEach(item => (item.prices || []).forEach(v => candidates.push(Number(v.price || 0))));
    return candidates.length ? Math.min(...candidates) : 0;
  }

  function lineItems() {
    const lines = [];
    const groups = new Map(moduleGroups().map(group => [group.key, group]));
    state.modules.forEach(row => {
      const group = groups.get(row.key);
      if (!group) return;
      const item = resolveModuleItem(group);
      if (!item) return;
      const qty = Number(row.qty || 1);
      const unitPrice = provisionalOrResolvedModulePrice(group);
      lines.push({ type: 'module', item, qty, unitPrice, total: unitPrice * qty, label: `${group.subtype === 'portalavabo' ? 'Meuble sous-vasque' : 'Meuble bas'} ${group.width} cm · H.${group.height}` });
    });

    if (state.basinChoice) {
      const chosen = parseChoice(state.basinChoice);
      if (chosen) {
        const unitPrice = itemUnitPrice(chosen.item, chosen.variant?.key);
        lines.push({ type: 'basin', item: chosen.item, qty: 1, unitPrice, total: unitPrice, label: chosen.item.label || chosen.item.ref });
      }
    }

    if (state.worktopChoice && state.basinMode !== 'integrated') {
      const chosen = parseChoice(state.worktopChoice);
      if (chosen) {
        const qty = chosen.item.unit === 'cm' ? Number(state.worktopLengthCm || targetWidth() || 0) : 1;
        const unitPrice = itemUnitPrice(chosen.item, chosen.variant?.key);
        lines.push({ type: 'worktop', item: chosen.item, qty, unitPrice, total: unitPrice * qty, label: chosen.item.label || chosen.item.ref, unit: chosen.item.unit });
      }
    }

    if (state.mirrorChoice) {
      const chosen = parseChoice(state.mirrorChoice);
      if (chosen) {
        const unitPrice = itemUnitPrice(chosen.item, chosen.variant?.key);
        lines.push({ type: 'mirror', item: chosen.item, qty: 1, unitPrice, total: unitPrice, label: chosen.item.label || chosen.item.ref });
      }
    }

    state.options.forEach(row => {
      const item = ITEM_MAP.get(row.itemId);
      if (!item) return;
      const qty = Number(row.qty || 1);
      const unitPrice = itemUnitPrice(item, row.priceKey);
      lines.push({ type: 'option', item, qty, unitPrice, total: unitPrice * qty, label: item.label || item.ref });
    });
    return lines;
  }

  function publicTotal() { return lineItems().reduce((sum, line) => sum + Number(line.total || 0), 0); }
  function priceText(value, prefix = '') { return isProUnlocked() ? `${prefix}${euro(value)}` : '<span class="nb-locked-price">🔒 Tarif masqué</span>'; }

  function livePriceBar() {
    const unlocked = isProUnlocked();
    const total = publicTotal();
    const session = readProSession();
    return `<aside class="nb-live-price ${unlocked ? 'unlocked' : 'locked'}"><div><small>Total catalogue</small><strong>${unlocked ? euro(total) : '🔒'}</strong></div><div class="nb-pro-total"><small>Tarif PRO · -50% puis -10%</small><strong>${unlocked ? euro(total * 0.45) : 'Tarifs masqués'}</strong></div>${unlocked ? `<span class="nb-session-ok">✓ Accès PRO${session?.societe ? ` · ${esc(session.societe)}` : ''}</span>` : '<button type="button" data-nb-action="show-unlock">Déverrouiller les tarifs</button>'}</aside>`;
  }

  function progressHtml() {
    return `<nav class="nb-progress" aria-label="Étapes du configurateur">${STEPS.map(([key, label], index) => `<button type="button" class="${state.step === index ? 'active' : ''} ${state.step > index ? 'done' : ''}" data-nb-action="step" data-step="${index}"><span>${state.step > index ? '✓' : index + 1}</span><small>${esc(label)}</small></button>`).join('')}</nav>`;
  }

  function stepHeader(title, subtitle) { return `<div class="nb-step-title"><h3>${esc(title)}</h3><p>${subtitle}</p></div>`; }
  function emptyNotice(text) { return `<div class="nb-empty"><strong>${esc(text)}</strong><p>Vous pouvez revenir à l’étape précédente sans perdre vos choix.</p></div>`; }
  function searchField() { return `<div class="nb-search"><input type="search" data-search-items placeholder="Rechercher une référence, un format…"><span>⌕</span></div>`; }

  function renderCollectionStep() {
    const cards = [
      ['ANIMA', 'ANIMA', 'Façades Pura / Ribelle, couleurs et tarifs ANIMA.', 'assets/img/neobath/anima-01.webp'],
      ['DNA', 'DNA', 'Dune, bois et laqués avec le tarif DNA.', 'assets/img/neobath/dna-zerouno.webp'],
      ['LIBRE', 'Sans collection', 'Choisissez d’abord un format : la famille technique sera fixée au premier module.', 'assets/img/02.png']
    ];
    return `${stepHeader('1. Choisissez la collection', 'Les compositions visibles dans la galerie ne pilotent jamais le configurateur. Ici, seules les références tarifaires sont utilisées.')}<div class="nb-choice-grid nb-collection-grid">${cards.map(([id, name, desc, image]) => `<button type="button" class="nb-choice-card ${state.collection === id ? 'selected' : ''}" data-nb-action="collection" data-value="${id}"><div class="nb-card-image"><img src="${image}" alt="${esc(name)}"></div><div><strong>${esc(name)}</strong><p>${esc(desc)}</p></div><span class="nb-check">${state.collection === id ? '✓' : ''}</span></button>`).join('')}</div>`;
  }

  function renderModulesStep() {
    const groups = moduleGroups();
    const selected = new Map(state.modules.map(row => [row.key, row]));
    return `${stepHeader('2. Composez la largeur du meuble', 'Ajoutez un ou plusieurs modules. Exemple : deux modules de 60 cm donnent une composition de 120 cm.')}<div class="nb-module-summary"><strong>Largeur totale : ${targetWidth() || 0} cm</strong><span>${state.modules.reduce((s, x) => s + Number(x.qty || 0), 0)} module(s)</span></div><div class="nb-choice-grid nb-modules-grid">${groups.map(group => {
      const row = selected.get(group.key);
      const representative = resolveModuleItem(group) || group.items[0];
      return `<article class="nb-choice-card nb-module-card ${row ? 'selected' : ''}" data-search-card="${esc(`${group.collection} ${group.subtype} ${group.width} ${group.height}`)}">${visualHtml(representative, `${group.width} cm`)}<div class="nb-card-body"><div class="nb-badges"><span>${esc(group.collection)}</span><span>${group.subtype === 'portalavabo' ? 'Sous-vasque' : 'Meuble bas'}</span></div><strong>${group.width} cm · H.${group.height}</strong><small>P.${group.depth || 46} cm</small><div class="nb-card-price">${priceText(provisionalOrResolvedModulePrice(group), state.facade ? '' : 'à partir de ')}</div></div><div class="nb-qty-control"><button type="button" data-nb-action="module-minus" data-key="${esc(group.key)}">−</button><b>${Number(row?.qty || 0)}</b><button type="button" data-nb-action="module-plus" data-key="${esc(group.key)}">+</button></div></article>`;
    }).join('')}</div>`;
  }

  function renderFacadeStep() {
    const collection = activeCollection();
    if (!collection) return `${stepHeader('3. Choisissez la façade / finition', 'Ajoutez d’abord au moins un module afin de déterminer la famille technique.')}${emptyNotice('Aucun module sélectionné.')}`;
    const defs = DATA.finishes?.[collection]?.facades || [];
    return `${stepHeader('3. Choisissez la façade / finition', collection === 'ANIMA' ? 'ANIMA propose Pura (lisse) et Ribelle (cannelée).' : 'DNA applique le niveau tarifaire Dune / Legno ou laqué mat / brillant.')}<div class="nb-choice-grid nb-facade-grid">${defs.map(def => `<button type="button" class="nb-choice-card ${state.facade === def.id ? 'selected' : ''}" data-nb-action="facade" data-value="${esc(def.id)}">${visualHtml(def.visual || DATA.finishes?.DNA?.finishPageVisual, def.name)}<div class="nb-card-body"><strong>${esc(def.name)}</strong>${def.priceKey ? `<small>${esc(def.priceKey === 'dune_legno' ? 'Tarif Dune / Legno' : def.priceKey === 'lacquer_matte' ? 'Tarif laqué mat' : 'Tarif laqué brillant')}</small>` : ''}</div><span class="nb-check">${state.facade === def.id ? '✓' : ''}</span></button>`).join('')}</div>`;
  }

  function colorEntries() {
    const collection = activeCollection();
    if (collection === 'ANIMA') return DATA.finishes?.ANIMA?.colors || [];
    if (collection !== 'DNA' || !state.facade) return [];
    const group = state.facade === 'DUNE' ? 'DUNE' : state.facade === 'LEGNO' ? 'LEGNO' : 'LACCATO';
    return DATA.finishes?.DNA?.finishGroups?.[group] || [];
  }

  function renderColorStep() {
    const collection = activeCollection();
    if (!collection || !state.facade) return `${stepHeader('4. Choisissez la couleur', 'Sélectionnez d’abord une façade / finition.')}${emptyNotice('Façade non sélectionnée.')}`;
    const entries = colorEntries();
    const allowRal = collection === 'DNA' && state.facade.startsWith('LACCATO');
    return `${stepHeader('4. Choisissez la couleur', allowRal ? 'Une couleur RAL personnalisée applique la majoration tarifaire DNA de +20 %.' : 'Les patchs et visuels proviennent des pages finitions NEOBATH.')}<div class="nb-color-grid">${entries.map(entry => `<button type="button" class="nb-color-card ${!state.customRal && state.color === entry.name ? 'selected' : ''}" data-nb-action="color" data-value="${esc(entry.name)}">${visualHtml(entry.visual, entry.name, 'nb-color-visual')}<strong>${esc(entry.name)}</strong><span class="nb-check">${!state.customRal && state.color === entry.name ? '✓' : ''}</span></button>`).join('')}${allowRal ? `<button type="button" class="nb-color-card nb-ral-card ${state.customRal ? 'selected' : ''}" data-nb-action="ral"><div class="nb-ral-patch">RAL</div><strong>Couleur RAL personnalisée</strong><small>+20 % sur les éléments laqués concernés</small></button>` : ''}</div>${state.customRal ? `<label class="nb-inline-field">Code RAL souhaité <input id="nb-ral-code" type="text" value="${esc(state.customRalCode || '')}" placeholder="Ex. RAL 7016"></label>` : ''}`;
  }

  function cleanLabel(label, category) {
    const raw = String(label || '').trim();
    if (!raw || raw.length > 100 || /^DNA \/ Collection/i.test(raw) || /^ANIMA Collection/i.test(raw)) {
      const map = { basin: 'Vasque / lavabo', countertop_basin: 'Vasque à poser', worktop: 'Plan de travail', mirror: 'Miroir', lighting: 'Éclairage', accessory: 'Accessoire', storage: 'Rangement', finishing_top: 'Plan de finition' };
      return map[category] || 'Élément NEOBATH';
    }
    return raw;
  }

  function choiceCard(choice, selectedId, target) {
    const item = choice.item;
    const d = dimensionsOf(item);
    return `<button type="button" class="nb-choice-card nb-product-choice ${selectedId === choice.id ? 'selected' : ''}" data-nb-action="select-choice" data-target="${target}" data-choice="${esc(choice.id)}" data-search-card="${esc(`${item.ref} ${cleanLabel(item.label, item.category)} ${d.label || ''}`)}">${visualHtml(item, item.ref)}<div class="nb-card-body"><div class="nb-badges"><span>${esc(item.collection)}</span><span>${esc(item.ref)}</span></div><strong>${esc(cleanLabel(item.label, item.category))}</strong>${d.label ? `<small>${esc(d.label)} cm</small>` : ''}${choice.variant?.label ? `<small>${esc(choice.variant.label)}</small>` : ''}<div class="nb-card-price">${priceText(itemUnitPrice(item, choice.variant?.key))}${item.unit === 'cm' ? ' / cm' : ''}</div></div><span class="nb-check">${selectedId === choice.id ? '✓' : ''}</span></button>`;
  }

  function filterByTargetWidth(items, loose = false) {
    const target = targetWidth();
    if (!target) return items;
    const filtered = items.filter(item => {
      const width = Number(dimensionsOf(item).width || 0);
      if (!width || item.unit === 'cm') return true;
      return loose ? Math.abs(width - target) <= 45 : Math.abs(width - target) <= 5;
    });
    return filtered.length ? filtered : items;
  }

  function renderBasinStep() {
    const modes = [
      ['none', 'Sans vasque', 'Meuble seul / plan sans vasque'],
      ['integrated', 'Vasque intégrée', 'Plan-vasque avec vasque intégrée'],
      ['countertop', 'Vasque à poser', 'Vasque posée sur un plan'],
      ['basin', 'Vasque séparée', 'Vasque choisie puis intégrée au plan']
    ];
    let choices = [];
    if (state.basinMode === 'integrated') choices = flattenChoices(filterByTargetWidth(collectionItems('worktop').filter(i => i.unit !== 'cm'), true));
    if (state.basinMode === 'countertop') choices = flattenChoices(collectionItems('countertop_basin'));
    if (state.basinMode === 'basin') choices = flattenChoices(collectionItems('basin'));
    return `${stepHeader('5. Choisissez la vasque', 'Choisissez le principe puis la référence avec son visuel extrait des PDF.')}<div class="nb-mode-tabs">${modes.map(([id, label, desc]) => `<button type="button" class="${state.basinMode === id ? 'active' : ''}" data-nb-action="basin-mode" data-value="${id}"><strong>${label}</strong><small>${desc}</small></button>`).join('')}</div>${state.basinMode === 'none' ? '<div class="nb-info-box">Aucune vasque ajoutée. Un plan de travail peut quand même être choisi à l’étape suivante.</div>' : `${searchField()}<div class="nb-choice-grid nb-products-grid">${choices.slice(0, 140).map(choice => choiceCard(choice, state.basinChoice, 'basin')).join('')}</div>`}`;
  }

  function renderWorktopStep() {
    if (state.basinMode === 'integrated' && state.basinChoice) {
      const chosen = parseChoice(state.basinChoice);
      return `${stepHeader('6. Plan de travail', 'La vasque intégrée sélectionnée comprend déjà son plan / top.')}${chosen ? `<div class="nb-selected-single">${choiceCard(chosen, chosen.id, 'basin')}</div>` : emptyNotice('Sélection intégrée introuvable.')}`;
    }
    const items = collectionItems('worktop').filter(worktopCompatible).concat(collectionItems('finishing_top').filter(worktopCompatible));
    const choices = flattenChoices(items).slice(0, 180);
    const selected = parseChoice(state.worktopChoice);
    const custom = selected?.item?.unit === 'cm';
    if (custom && !state.worktopLengthCm) state.worktopLengthCm = Math.max(1, Math.round(targetWidth() || 60));
    return `${stepHeader('6. Choisissez le plan de travail', 'Les références « / cm » sont calculées exactement à la longueur saisie. Le plan peut donc être réalisé sur mesure au centimètre.')}${searchField()}<div class="nb-choice-grid nb-products-grid">${choices.map(choice => choiceCard(choice, state.worktopChoice, 'worktop')).join('')}</div>${custom ? `<div class="nb-custom-length"><div><strong>Longueur sur mesure</strong><p>Tarif calculé au centimètre linéaire.</p></div><label><input id="nb-worktop-length" type="number" min="20" max="400" step="1" value="${Number(state.worktopLengthCm || targetWidth() || 60)}"><span>cm</span></label><div class="nb-custom-calc">${isProUnlocked() ? `${euro(itemUnitPrice(selected.item, selected.variant?.key))} / cm × ${Number(state.worktopLengthCm || 0)} = <strong>${euro(itemUnitPrice(selected.item, selected.variant?.key) * Number(state.worktopLengthCm || 0))}</strong>` : '🔒 Calcul tarifaire masqué'}</div></div>` : ''}`;
  }

  function renderMirrorStep() {
    let choices = flattenChoices(filterByTargetWidth(collectionItems('mirror'), true));
    choices.sort((a, b) => Math.abs((dimensionsOf(a.item).width || 0) - targetWidth()) - Math.abs((dimensionsOf(b.item).width || 0) - targetWidth()));
    return `${stepHeader('7. Choisissez le miroir', 'Format, référence, visuel source et tarif sont présentés ensemble.')}<button type="button" class="nb-skip-choice ${!state.mirrorChoice ? 'selected' : ''}" data-nb-action="mirror-none">Sans miroir</button>${searchField()}<div class="nb-choice-grid nb-products-grid">${choices.slice(0, 140).map(choice => choiceCard(choice, state.mirrorChoice, 'mirror')).join('')}</div>`;
  }

  function renderOptionsStep() {
    const active = activeCollection();
    const items = ITEMS.filter(item => (!active || item.collection === active) && ['lighting', 'accessory', 'storage'].includes(item.category)).slice(0, 180);
    const selected = new Map(state.options.map(row => [row.itemId, row]));
    return `${stepHeader('8. Ajoutez les options', 'Pieds, porte-serviettes, éclairages, rangements et accessoires sont ajoutables avec quantité.')}${searchField()}<div class="nb-choice-grid nb-products-grid">${items.map(item => {
      const row = selected.get(item.id);
      const variant = priceVariantFor(item);
      return `<article class="nb-choice-card nb-product-choice ${row ? 'selected' : ''}" data-search-card="${esc(`${item.ref} ${cleanLabel(item.label, item.category)}`)}">${visualHtml(item, item.ref)}<div class="nb-card-body"><div class="nb-badges"><span>${item.category === 'lighting' ? 'Éclairage' : item.category === 'storage' ? 'Rangement' : 'Accessoire'}</span><span>${esc(item.ref)}</span></div><strong>${esc(cleanLabel(item.label, item.category))}</strong>${dimensionsOf(item).label ? `<small>${esc(dimensionsOf(item).label)} cm</small>` : ''}<div class="nb-card-price">${priceText(itemUnitPrice(item, variant?.key))}</div></div><div class="nb-qty-control"><button type="button" data-nb-action="option-minus" data-item="${esc(item.id)}">−</button><b>${Number(row?.qty || 0)}</b><button type="button" data-nb-action="option-plus" data-item="${esc(item.id)}">+</button></div></article>`;
    }).join('')}</div>`;
  }

  function unlockPanel() {
    return `<div class="nb-unlock-panel" id="nb-unlock-panel"><div><strong>🔒 Tarifs réservés à l’accès PRO</strong><p>Si le code a déjà été saisi sur le site, les prix sont automatiquement déverrouillés. Sinon, saisissez-le ici.</p></div><div class="nb-unlock-form"><input id="nb-pro-code" type="password" inputmode="numeric" placeholder="Code PRO"><button type="button" data-nb-action="unlock">Déverrouiller</button></div><span id="nb-unlock-error"></span></div>`;
  }

  function renderSummaryStep() {
    const lines = lineItems();
    const unlocked = isProUnlocked();
    const total = publicTotal();
    return `${stepHeader('9. Récapitulatif du meuble', 'Chaque ligne reprend la référence, le visuel source, le prix catalogue et le prix PRO. Les compositions d’ambiance n’interviennent jamais dans ce calcul.')}<div class="nb-summary-head"><div><span>Collection</span><strong>${esc(activeCollection() || state.collection || '—')}</strong></div><div><span>Largeur meubles</span><strong>${targetWidth()} cm</strong></div><div><span>Façade</span><strong>${esc(facadeDefinition()?.name || '—')}</strong></div><div><span>Couleur</span><strong>${esc(state.customRal ? state.customRalCode || 'RAL personnalisé' : state.color || '—')}</strong></div></div><div class="nb-summary-lines">${lines.length ? lines.map(line => `<article class="nb-summary-line">${visualHtml(line.item, line.item?.ref || line.label, 'nb-summary-visual')}<div class="nb-summary-info"><strong>${esc(line.label)}</strong><span>${esc(line.item?.ref || '')}${line.item?.unit === 'cm' ? ` · ${Number(line.qty)} cm` : line.qty > 1 ? ` · Qté ${line.qty}` : ''}</span></div><div class="nb-summary-prices"><small>Catalogue</small><b>${unlocked ? euro(line.total) : '🔒'}</b><small>PRO</small><strong>${unlocked ? euro(line.total * 0.45) : '🔒'}</strong></div></article>`).join('') : emptyNotice('Aucun élément chiffrable sélectionné.')}</div><div class="nb-grand-total"><div><span>Total catalogue</span><strong>${unlocked ? euro(total) : '🔒'}</strong></div><div class="pro"><span>Total PRO · -50% puis -10%</span><strong>${unlocked ? euro(total * 0.45) : 'Tarif masqué'}</strong></div></div>${!unlocked ? unlockPanel() : `<div class="nb-discount-note">Calcul PRO : ${esc(DATA.proDiscount?.label || '-50% puis -10%')} = ${Math.round((1 - Number(DATA.proDiscount?.factor || .45)) * 100)} % de remise cumulée.</div>`}`;
  }

  function currentStepHtml() {
    switch (STEPS[state.step]?.[0]) {
      case 'collection': return renderCollectionStep();
      case 'modules': return renderModulesStep();
      case 'facade': return renderFacadeStep();
      case 'color': return renderColorStep();
      case 'basin': return renderBasinStep();
      case 'worktop': return renderWorktopStep();
      case 'mirror': return renderMirrorStep();
      case 'options': return renderOptionsStep();
      case 'summary': return renderSummaryStep();
      default: return renderCollectionStep();
    }
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'furniture-configurator';
    overlay.className = 'furniture-configurator';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="furniture-config-shell" role="dialog" aria-modal="true" aria-label="Configurateur de meuble NEOBATH"><div id="furniture-config-content"></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', handleClick);
    overlay.addEventListener('input', handleInput);
  }

  function renderConfigurator() {
    if (!overlay) return;
    $('#furniture-config-content', overlay).innerHTML = `<header class="nb-config-header"><div><span>NEOBATH · CONFIGURATEUR TARIFAIRE</span><h2>Configurez votre meuble</h2><p>Références et prix issus des tarifs ANIMA / DNA. Les compositions restent des inspirations visuelles uniquement.</p></div><div class="nb-header-actions"><button type="button" data-nb-action="gallery">Galerie</button><button type="button" data-nb-action="reset">Recommencer</button><button type="button" class="nb-close" data-nb-action="close" aria-label="Fermer">×</button></div></header>${progressHtml()}${livePriceBar()}<main class="nb-step-body">${currentStepHtml()}</main><footer class="nb-config-footer"><button type="button" data-nb-action="close">Quitter</button><div>${state.step > 0 ? '<button type="button" data-nb-action="previous">← Précédent</button>' : ''}${state.step < STEPS.length - 1 ? '<button type="button" class="primary" data-nb-action="next">Suivant →</button>' : '<button type="button" class="primary" data-nb-action="close">Terminer</button>'}</div></footer>`;
  }

  function openConfigurator() { ensureOverlay(); overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.classList.add('furniture-config-open'); renderConfigurator(); }
  function closeConfigurator() { overlay?.classList.remove('open'); overlay?.setAttribute('aria-hidden', 'true'); document.body.classList.remove('furniture-config-open'); }

  function handleClick(event) {
    const el = event.target.closest('[data-nb-action]');
    if (!el) return;
    event.preventDefault();
    event.stopPropagation();
    const action = el.dataset.nbAction;
    if (action === 'close') return closeConfigurator();
    if (action === 'reset') return resetState();
    if (action === 'gallery') return openGallery();
    if (action === 'show-unlock') { state.step = STEPS.length - 1; saveState(); return renderConfigurator(); }
    if (action === 'unlock') {
      const ok = unlockLegacy($('#nb-pro-code', overlay)?.value);
      if (ok) renderConfigurator();
      else { const err = $('#nb-unlock-error', overlay); if (err) err.textContent = 'Code incorrect.'; }
      return;
    }
    if (action === 'step') { state.step = clamp(Number(el.dataset.step || 0), 0, STEPS.length - 1); saveState(); return renderConfigurator(); }
    if (action === 'previous') { state.step = Math.max(0, state.step - 1); saveState(); return renderConfigurator(); }
    if (action === 'next') { state.step = Math.min(STEPS.length - 1, state.step + 1); saveState(); return renderConfigurator(); }
    if (action === 'collection') {
      const value = el.dataset.value;
      if (state.collection !== value) state = { ...defaultState(), collection: value, step: state.step };
      saveState(); return renderConfigurator();
    }
    if (action === 'module-plus' || action === 'module-minus') {
      const key = el.dataset.key;
      const group = moduleGroups().find(g => g.key === key);
      if (!group) return;
      const existing = state.modules.find(row => row.key === key);
      const delta = action === 'module-plus' ? 1 : -1;
      if (!existing && delta > 0) state.modules.push({ key, collection: group.collection, qty: 1 });
      else if (existing) { existing.qty = Math.max(0, Number(existing.qty || 0) + delta); if (!existing.qty) state.modules = state.modules.filter(row => row.key !== key); }
      if (state.collection === 'LIBRE' && state.modules.length) { const family = state.modules[0].collection; state.modules = state.modules.filter(row => row.collection === family); }
      state.worktopLengthCm = targetWidth() || state.worktopLengthCm;
      saveState(); return renderConfigurator();
    }
    if (action === 'facade') { state.facade = el.dataset.value; state.color = null; state.customRal = false; saveState(); return renderConfigurator(); }
    if (action === 'color') { state.color = el.dataset.value; state.customRal = false; state.customRalCode = ''; saveState(); return renderConfigurator(); }
    if (action === 'ral') { state.customRal = true; state.color = 'RAL'; saveState(); return renderConfigurator(); }
    if (action === 'basin-mode') { state.basinMode = el.dataset.value; state.basinChoice = null; if (state.basinMode === 'integrated') state.worktopChoice = null; saveState(); return renderConfigurator(); }
    if (action === 'select-choice') {
      const target = el.dataset.target;
      const choice = el.dataset.choice;
      if (target === 'basin') state.basinChoice = state.basinChoice === choice ? null : choice;
      if (target === 'worktop') { state.worktopChoice = state.worktopChoice === choice ? null : choice; const c = parseChoice(state.worktopChoice); if (c?.item?.unit === 'cm' && !state.worktopLengthCm) state.worktopLengthCm = targetWidth() || 60; }
      if (target === 'mirror') state.mirrorChoice = state.mirrorChoice === choice ? null : choice;
      saveState(); return renderConfigurator();
    }
    if (action === 'mirror-none') { state.mirrorChoice = null; saveState(); return renderConfigurator(); }
    if (action === 'option-plus' || action === 'option-minus') {
      const itemId = el.dataset.item;
      const item = ITEM_MAP.get(itemId);
      if (!item) return;
      let row = state.options.find(x => x.itemId === itemId);
      const delta = action === 'option-plus' ? 1 : -1;
      if (!row && delta > 0) { row = { itemId, qty: 1, priceKey: priceVariantFor(item)?.key || 'standard' }; state.options.push(row); }
      else if (row) { row.qty = Math.max(0, Number(row.qty || 0) + delta); if (!row.qty) state.options = state.options.filter(x => x.itemId !== itemId); }
      saveState(); return renderConfigurator();
    }
  }

  function handleInput(event) {
    if (event.target.id === 'nb-worktop-length') {
      state.worktopLengthCm = clamp(Number(event.target.value || 0), 20, 400);
      saveState(); renderConfigurator();
    }
    if (event.target.id === 'nb-ral-code') { state.customRalCode = event.target.value; saveState(); }
    if (event.target.matches('[data-search-items]')) {
      const q = norm(event.target.value);
      $$('[data-search-card]', overlay).forEach(card => { card.style.display = !q || norm(card.dataset.searchCard).includes(q) ? '' : 'none'; });
    }
  }

  function galleryProducts() { return (Array.isArray(window.NEOBATH_CATALOGUE) ? window.NEOBATH_CATALOGUE : []).filter(p => p && (p.images || []).length); }
  function filteredGalleryProducts() { const all = galleryProducts(); return galleryState.collection === 'TOUS' ? all : all.filter(p => p.collection === galleryState.collection); }

  function ensureGallery() {
    if (galleryOverlay) return;
    galleryOverlay = document.createElement('div');
    galleryOverlay.id = 'nb-gallery';
    galleryOverlay.className = 'nb-gallery';
    galleryOverlay.innerHTML = '<div class="nb-gallery-shell"><div id="nb-gallery-content"></div></div>';
    document.body.appendChild(galleryOverlay);
    galleryOverlay.addEventListener('click', event => {
      const el = event.target.closest('[data-gallery-action]');
      if (!el) { if (event.target === galleryOverlay) closeGallery(); return; }
      const action = el.dataset.galleryAction;
      if (action === 'close') closeGallery();
      if (action === 'prev') { galleryState.index -= 1; renderGallery(); }
      if (action === 'next') { galleryState.index += 1; renderGallery(); }
      if (action === 'thumb') { galleryState.index = Number(el.dataset.index || 0); renderGallery(); }
      if (action === 'filter') { galleryState.collection = el.dataset.value; galleryState.index = 0; renderGallery(); }
      if (action === 'fullscreen') { const shell = $('.nb-gallery-shell', galleryOverlay); if (!document.fullscreenElement) shell?.requestFullscreen?.(); else document.exitFullscreen?.(); }
      if (action === 'config') { closeGallery(); openConfigurator(); }
    });
  }

  function renderGallery() {
    ensureGallery();
    const products = filteredGalleryProducts();
    if (!products.length) return;
    galleryState.index = (galleryState.index + products.length) % products.length;
    const product = products[galleryState.index];
    $('#nb-gallery-content', galleryOverlay).innerHTML = `<header><div><span>GALERIE D’INSPIRATION NEOBATH</span><h2>${esc(product.name)}</h2><p>${esc(product.collection)} · Ces compositions servent uniquement de visuels.</p></div><div><button data-gallery-action="config">Configurer mon meuble</button><button data-gallery-action="fullscreen">⛶ Plein écran</button><button class="nb-close" data-gallery-action="close">×</button></div></header><main><button class="nb-gallery-nav prev" data-gallery-action="prev">‹</button><div class="nb-gallery-stage"><img src="${esc(product.images?.[0])}" alt="${esc(product.name)}"><span>${galleryState.index + 1} / ${products.length}</span></div><button class="nb-gallery-nav next" data-gallery-action="next">›</button></main><footer><div class="nb-gallery-filters">${['TOUS','ANIMA','DNA'].map(c => `<button data-gallery-action="filter" data-value="${c}" class="${galleryState.collection === c ? 'active' : ''}">${c === 'TOUS' ? 'Toutes' : c}</button>`).join('')}</div><div class="nb-gallery-thumbs">${products.map((p, i) => `<button data-gallery-action="thumb" data-index="${i}" class="${i === galleryState.index ? 'active' : ''}"><img src="${esc(p.images?.[0])}" alt=""><span>${esc(p.name)}</span></button>`).join('')}</div></footer>`;
  }

  function openGallery() { ensureGallery(); galleryOverlay.classList.add('open'); document.body.classList.add('furniture-config-open'); renderGallery(); }
  function closeGallery() { galleryOverlay?.classList.remove('open'); if (!overlay?.classList.contains('open')) document.body.classList.remove('furniture-config-open'); }

  function injectLaunchers() {
    if ($('#nb-furniture-tools')) return;
    const panel = $('.inspiration-search-panel') || $('.inspiration-intro');
    if (!panel) return;
    const tools = document.createElement('div');
    tools.id = 'nb-furniture-tools';
    tools.className = 'nb-furniture-tools';
    tools.innerHTML = `<button type="button" id="nb-open-gallery" class="nb-tool-card gallery"><span class="icon">▣</span><span><strong>Voir toutes les compositions NEOBATH</strong><small>Galerie plein écran · inspiration uniquement</small></span><span>→</span></button><button type="button" id="furniture-config-launcher" class="nb-tool-card config"><span class="icon">▦</span><span><strong>Configurer son meuble</strong><small>Modules, façades, vasques, plans, miroirs, options et chiffrage</small></span><span>→</span></button>`;
    panel.insertAdjacentElement('afterend', tools);
    $('#nb-open-gallery', tools)?.addEventListener('click', openGallery);
    $('#furniture-config-launcher', tools)?.addEventListener('click', openConfigurator);
    updateLaunchers();
  }

  function updateLaunchers() {
    const button = $('#furniture-config-launcher');
    if (!button) return;
    const strong = $('strong', button);
    const hasState = state.modules?.length || state.facade || state.basinChoice || state.worktopChoice || state.mirrorChoice || state.options?.length;
    if (strong) strong.textContent = hasState ? 'Reprendre la configuration du meuble' : 'Configurer son meuble';
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      DATA = await response.json();
      ITEMS = Array.isArray(DATA.items) ? DATA.items : [];
      ITEM_MAP = new Map(ITEMS.map(item => [item.id, item]));
      injectLaunchers();
      window.addEventListener('storage', event => { if (event.key === PRO_KEY && overlay?.classList.contains('open')) renderConfigurator(); });
      window.addEventListener('lrf-pro-session-changed', () => { if (overlay?.classList.contains('open')) renderConfigurator(); });
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (galleryOverlay?.classList.contains('open')) closeGallery();
        else if (overlay?.classList.contains('open')) closeConfigurator();
      });
    } catch (error) {
      console.error('NEOBATH configurator data load failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
