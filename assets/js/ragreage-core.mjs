/**
 * LE ROY FACTORY — moteur de ragréage multimarques.
 * Les produits, consommations et domaines d’emploi sont fournis par le
 * catalogue sourcé. Aucune marque ou compatibilité n’est substituée ici.
 * Ce calcul concerne une couche continue, hors création de pente et reprise
 * structurelle. Les données d’un sac ne sont jamais remplacées par la saisie.
 */

export function matchesBrandSearch(brand, query) {
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const needle = normalize(query);
  return [brand.name, ...(brand.aliases || [])].some(name => normalize(name).includes(needle));
}

export const SUPPORTS = Object.freeze([
  { id: 'tile', label: 'Ancien carrelage', short: 'Carrelage', description: 'Carreaux sains, adhérents et dégraissés.' },
  { id: 'cement', label: 'Chape ciment', short: 'Chape ciment', description: 'Support ciment sec, cohésif et préparé.' },
  { id: 'concrete', label: 'Dalle béton', short: 'Béton', description: 'Béton sain, propre, sans laitance ni produit de cure.' },
  { id: 'wood', label: 'Bois / OSB', short: 'Bois / OSB', description: 'Préciser panneaux ou lames ; contrôler fixation, rigidité et ventilation.' },
  { id: 'anhydrite', label: 'Chape anhydrite', short: 'Anhydrite', description: 'Sulfate de calcium : humidité contrôlée et laitance éliminée.' },
  { id: 'paint', label: 'Ancienne peinture', short: 'Peinture', description: 'Peinture de sol : adhérence et préparation à contrôler.' },
  { id: 'unknown', label: 'Support à identifier', short: 'À identifier', description: 'Identifier le support avant de choisir le système.' },
]);

const SUPPORT_NAMES = Object.fromEntries(SUPPORTS.map(item => [item.id, item.label.toLowerCase()]));
const FINISH_NAMES = { tile: 'carrelage', soft: 'sol souple', parquet: 'parquet', bare: 'finition nue' };
const HEATING_NAMES = { none: 'sans chauffage', water: 'chauffage à eau', electric: 'plancher rayonnant électrique' };
const has = (items, value) => Array.isArray(items) && items.includes(value);
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

function number(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !value.trim()) return NaN;
  return Number(value.trim().replace(',', '.'));
}
function optionalNumber(value) {
  return value == null || value === '' ? null : number(value);
}
function noPrimary(label = 'Primaire à confirmer avec le fabricant', detail = 'Aucun primaire n’est prescrit automatiquement sans système documenté pour ce support et ce produit.') {
  return { label, detail, rateMin: null, rateMax: null, unit: 'kg', url: null };
}
function conditionMatches(when, input) {
  if (!when || typeof when !== 'object') return false;
  return Object.entries(when).every(([key, value]) => Array.isArray(value) ? value.includes(input[key]) : value === input[key]);
}
function validConsumptionPoints(points) {
  return Array.isArray(points) && points.length > 0
    && points.every(point => positive(point?.thickness) && positive(point?.kgM2))
    && new Set(points.map(point => point.thickness)).size === points.length;
}
function documentedProduct(product) {
  return product && typeof product.id === 'string' && (product.name || product.label)
    && positive(product.rate) && positive(product.bag)
    && Number.isFinite(product.min) && product.min >= 0
    && positive(product.max) && product.max >= product.min
    && ['locations', 'supports', 'heating', 'finishes'].every(key => Array.isArray(product[key]) && product[key].length)
    && (product.consumptionPoints === undefined || validConsumptionPoints(product.consumptionPoints))
    && /^https?:\/\//.test(product.sourceUrl || product.url || product.technicalUrl || '');
}
function productConsumption(product, thickness) {
  if (!product || !positive(thickness)) return { consumptionPerM2: null, rate: product?.rate ?? null, consumptionDescription: '', consumptionMode: 'unavailable' };
  if (!product.consumptionPoints) return { consumptionPerM2: thickness * product.rate, rate: product.rate, consumptionDescription: '', consumptionMode: 'constant' };
  const points = [...product.consumptionPoints].sort((a, b) => a.thickness - b.thickness);
  const exact = points.find(point => point.thickness === thickness);
  const fmt = value => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  if (exact) return { consumptionPerM2: exact.kgM2, rate: exact.kgM2 / thickness,
    consumptionDescription: `Valeur du tableau fabricant : ${fmt(exact.kgM2)} kg/m² à ${fmt(thickness)} mm.`, consumptionMode: 'table-exact' };
  for (let index = 1; index < points.length; index++) {
    const low = points[index - 1], high = points[index];
    if (thickness > low.thickness && thickness < high.thickness) {
      const kgM2 = low.kgM2 + (thickness - low.thickness) / (high.thickness - low.thickness) * (high.kgM2 - low.kgM2);
      return { consumptionPerM2: kgM2, rate: kgM2 / thickness,
        consumptionDescription: `Estimation par interpolation linéaire entre les valeurs du tableau fabricant à ${fmt(low.thickness)} et ${fmt(high.thickness)} mm.`, consumptionMode: 'table-interpolated' };
    }
  }
  const rate = Math.max(...points.map(point => point.kgM2 / point.thickness));
  return { consumptionPerM2: thickness * rate, rate,
    consumptionDescription: 'Extrapolation prudente à partir du tableau fabricant, avec le coefficient kg/m²/mm le plus élevé observé dans ce tableau. À confirmer sur chantier.', consumptionMode: 'table-extrapolated' };
}
function normalizedProduct(product, input) {
  let min = product.min, max = product.max, invalidLimits = false;
  for (const limit of [
    product.supportLimits?.[input.support], product.locationLimits?.[input.location],
    product.finishLimits?.[input.finish], product.heatingLimits?.[input.heating],
  ]) {
    if (!limit || typeof limit !== 'object') continue;
    if (Object.hasOwn(limit, 'min') && (!Number.isFinite(limit.min) || limit.min < 0)) invalidLimits = true;
    if (Object.hasOwn(limit, 'max') && (!Number.isFinite(limit.max) || limit.max <= 0)) invalidLimits = true;
    if (Number.isFinite(limit.min)) min = Math.max(min, limit.min);
    if (Number.isFinite(limit.max)) max = Math.min(max, limit.max);
  }
  for (const rule of product.conditionalLimits || []) {
    if (!conditionMatches(rule.when, input)) continue;
    if (Object.hasOwn(rule, 'min') && (!Number.isFinite(rule.min) || rule.min < 0)) invalidLimits = true;
    if (Object.hasOwn(rule, 'max') && (!Number.isFinite(rule.max) || rule.max <= 0)) invalidLimits = true;
    if (Number.isFinite(rule.min)) min = Math.max(min, rule.min);
    if (Number.isFinite(rule.max)) max = Math.min(max, rule.max);
  }
  return { ...product, label: product.name || product.label, min, max,
    invalidLimits,
    catalogueMin: product.min, catalogueMax: product.max,
    url: product.sourceUrl || product.url || product.technicalUrl || null };
}
function incompatibilities(product, input, low, high) {
  const reasons = [];
  if (product.invalidLimits) reasons.push(`${product.label} : les limites techniques de cette configuration doivent être confirmées.`);
  if (!has(product.locations, input.location)) reasons.push(`${product.label} ne couvre pas cet usage ${input.location === 'outside' ? 'extérieur' : 'intérieur'}.`);
  if (!has(product.supports, input.support)) reasons.push(`${product.label} ne couvre pas le support « ${SUPPORT_NAMES[input.support] || input.support} » dans les fiches vérifiées.`);
  if (product.locationSupports?.[input.location] && !has(product.locationSupports[input.location], input.support)) reasons.push(`${product.label} ne couvre pas ce support pour cet usage ${input.location === 'outside' ? 'extérieur' : 'intérieur'}.`);
  if (!has(product.heating, input.heating)) reasons.push(`${product.label} : compatibilité avec le ${HEATING_NAMES[input.heating] || 'chauffage choisi'} à faire valider.`);
  if (!has(product.finishes, input.finish) || (product.locationFinishes?.[input.location] && !has(product.locationFinishes[input.location], input.finish))) reasons.push(`${product.label} ne couvre pas le ${FINISH_NAMES[input.finish] || 'revêtement choisi'} dans cet usage.`);
  if (input.support === 'wood' && product.woodPanelsOnly && input.woodType !== 'panels') reasons.push(`${product.label} est documenté sur panneaux bois uniquement, pas sur lames de plancher.`);
  for (const rule of product.exclusions || []) if (conditionMatches(rule.when, input)) reasons.push(rule.message || `${product.label} : configuration hors du domaine vérifié.`);
  if (product.min > product.max) reasons.push(`${product.label} : cette combinaison de support, de chauffage et de revêtement ne possède pas de plage d’épaisseur commune vérifiée.`);
  else if (Number.isFinite(low) && Number.isFinite(high) && (low < product.min || high > product.max)) reasons.push(`${product.label} : respecter ${product.min === product.max ? `${product.min} mm` : `${product.min} à ${product.max} mm`} pour ce support, ce chauffage et ce revêtement.`);
  return reasons;
}
function selectPrimary(product, input) {
  if (['concrete', 'cement'].includes(input.support) && input.porosity === 'unknown') return noPrimary('À choisir après contrôle de la porosité', 'Sur béton ou ciment, vérifier l’absorption et la préparation avant de choisir le primaire du fabricant.');
  let primaries = product.primaries || {};
  for (const rule of product.primaryThicknessRanges || []) {
    if (input.thickness >= rule.min && input.thickness <= rule.max) primaries = rule.primaries || {};
  }
  for (const rule of product.primaryOverrides || []) if (conditionMatches(rule.when, input)) primaries = rule.primaries || {};
  const key = ['concrete', 'cement'].includes(input.support)
    ? input.support + (input.porosity === 'closed' ? 'Closed' : 'Absorbent') : input.support;
  const item = primaries[key];
  if (!item || !item.name && !item.label) return noPrimary();
  const unit = item.unit || 'kg';
  // Litres must not be converted to kg without an actual product density.
  const ratesKnown = unit === 'kg' && Number.isFinite(item.rateMin) && item.rateMin >= 0
    && Number.isFinite(item.rateMax) && item.rateMax >= item.rateMin;
  return { ...item, label: item.name || item.label,
    detail: item.detail || 'Suivre la fiche du primaire et du ragréage pour préparer ce support.',
    rateMin: ratesKnown ? item.rateMin : null, rateMax: ratesKnown ? item.rateMax : null,
    unit, url: item.url || null };
}


/** One estimation path shared by the selected product and every alternative. */
function estimateProduct(product, state, measurements, inputErrors = [], inputBlocks = []) {
  const { area, thickness, margin } = measurements;
  const errors = [...inputErrors], blocks = [...inputBlocks], requirements = [];
  if (product?.requiredWaterproofingOutside && state.location === 'outside') {
    requirements.push('Prévoir et faire valider le système d’étanchéité extérieur prescrit.');
    if (state.waterproofing !== 'yes') blocks.push(`${product.label} exige un système d’étanchéité en extérieur : faites valider et prévoir ce système avant de retenir ce ragréage.`);
  }
  const primary = blocks.length || errors.length || !product
    ? noPrimary('Primaire à confirmer après validation', 'Résoudre les points signalés avant de choisir le primaire et de commander le système.') : selectPrimary(product, { ...state, thickness: measurements.high });
  const { rate, consumptionPerM2, consumptionDescription, consumptionMode } = productConsumption(product, thickness);
  const bag = product?.bag ?? null;
  let netKg = null, totalKg = null, bags = null, purchasedKg = null, surplusKg = null, loadKgM2 = null;
  if (!errors.length && !blocks.length && product) {
    netKg = area * consumptionPerM2;
    totalKg = netKg * (1 + margin / 100);
    loadKgM2 = consumptionPerM2;
    if (![netKg, totalKg, loadKgM2, totalKg / bag].every(Number.isFinite) || totalKg / bag > Number.MAX_SAFE_INTEGER) errors.push('Les valeurs dépassent la plage de calcul. Vérifiez la surface ou les quantités.');
    else {
      const quotient = totalKg / bag;
      const nearest = Math.round(quotient);
      const atBoundary = Math.abs(quotient - nearest) <= Number.EPSILON * Math.max(1, quotient) * 4;
      bags = Math.max(1, Math.ceil(atBoundary ? nearest : quotient));
      purchasedKg = bags * bag;
      surplusKg = Math.max(0, purchasedKg - totalKg);
      if (![purchasedKg, surplusKg].every(Number.isFinite)) errors.push('Les quantités à commander dépassent la plage de calcul. Vérifiez les valeurs saisies.');
    }
  }
  if (errors.length) netKg = totalKg = bags = purchasedKg = surplusKg = loadKgM2 = null;
  let primaryMin = !errors.length && !blocks.length && primary.rateMin !== null ? area * primary.rateMin : null;
  let primaryMax = !errors.length && !blocks.length && primary.rateMax !== null ? area * primary.rateMax : null;
  if (![primaryMin, primaryMax].every(value => value === null || Number.isFinite(value))) primaryMin = primaryMax = null;
  return { valid: errors.length === 0, errors, blocked: blocks.length > 0, blocks, requirements,
    primary, area, thickness, rate, bag, margin, netKg, totalKg, bags, purchasedKg, surplusKg, loadKgM2,
    consumptionPerM2, consumptionDescription, consumptionMode, primaryMin, primaryMax };
}

/**
 * Input: brand (ID exact du catalogue), support, location, finish, heating,
 * condition, area, thickness, margin, minThickness, maxThickness, slope,
 * porosity, woodType ('panels', 'planks', 'unknown') et productId optionnel.
 * productId ne peut choisir qu’une référence compatible de la marque courante.
 * alternatives expose ces profils avec leurs propres estimations et conditions.
 * brands: liste aplatie de fabricants et de leurs profils sourcés.
 * valid = saisies valides ; blocked = préconisation non possible.
 * En cas de blocage, aucun nombre de sacs n’est émis.
 */
export function calculate(input = {}, brands = []) {
  if (!input || typeof input !== 'object') input = {};
  const errors = [], blocks = [], warnings = [], tips = [];
  const state = {
    support: input.support ?? 'tile', location: input.location ?? 'inside', finish: input.finish ?? 'tile',
    heating: input.heating ?? 'none', condition: input.condition ?? 'sound', slope: input.slope ?? 'unknown',
    porosity: input.porosity ?? 'unknown', woodType: input.woodType ?? 'unknown', waterproofing: input.waterproofing ?? 'unknown',
  };
  const { support, location, finish, heating, condition, slope, porosity, woodType, waterproofing } = state;
  const area = number(input.area), thickness = number(input.thickness), margin = number(input.margin ?? 5);
  const localMin = optionalNumber(input.minThickness), localMax = optionalNumber(input.maxThickness);
  const matches = Array.isArray(brands) ? brands.filter(item => item?.id === input.brand) : [];
  const brand = matches.length === 1 ? matches[0] : null;
  if (!brand) errors.push(matches.length > 1 ? 'Cette marque possède plusieurs catalogues : précisez le pays du fournisseur.' : 'Choisissez d’abord la marque avec laquelle vous travaillez.');
  if (!SUPPORTS.some(item => item.id === support)) errors.push('Choisissez un support proposé.');
  if (!['inside', 'outside'].includes(location)) errors.push('Choisissez intérieur ou extérieur.');
  if (!Object.hasOwn(FINISH_NAMES, finish)) errors.push('Choisissez le revêtement final.');
  if (!Object.hasOwn(HEATING_NAMES, heating)) errors.push('Précisez le type de chauffage au sol.');
  if (!['sound', 'damp', 'cracks', 'unstable'].includes(condition)) errors.push('Précisez l’état du support.');
  if (!['unknown', 'absorbent', 'closed'].includes(porosity)) errors.push('Précisez la porosité du support.');
  if (support === 'wood' && !['unknown', 'panels', 'planks'].includes(woodType)) errors.push('Précisez s’il s’agit de panneaux bois ou de lames de plancher.');
  if (!Number.isFinite(area) || area <= 0) errors.push('Indiquez une surface supérieure à 0 m².');
  if (!Number.isFinite(thickness) || thickness <= 0) errors.push('Indiquez une épaisseur moyenne supérieure à 0 mm.');
  if (![0, 5, 10].includes(margin)) errors.push('Choisissez une marge de 0, 5 ou 10 %.');
  if (localMin !== null && (!Number.isFinite(localMin) || localMin < 0)) errors.push('L’épaisseur locale minimale doit être supérieure ou égale à 0 mm.');
  if (localMax !== null && (!Number.isFinite(localMax) || localMax <= 0)) errors.push('L’épaisseur locale maximale doit être supérieure à 0 mm.');
  if (localMin !== null && localMax !== null && localMin > localMax) errors.push('Le minimum local ne peut pas dépasser le maximum local.');
  if (localMin !== null && Number.isFinite(localMin) && thickness < localMin) errors.push('L’épaisseur moyenne ne peut pas être inférieure au minimum local.');
  if (localMax !== null && Number.isFinite(localMax) && thickness > localMax) errors.push('L’épaisseur moyenne ne peut pas dépasser le maximum local.');
  if (location === 'outside' && !['ready', 'create', 'unknown'].includes(slope)) errors.push('Précisez l’état de la pente extérieure.');
  if (location === 'outside' && !['yes', 'no', 'unknown'].includes(waterproofing)) errors.push('Précisez la validation de l’étanchéité extérieure.');

  if (support === 'unknown') blocks.push('Identifiez la nature du support avant de choisir le ragréage et son primaire.');
  if (condition === 'damp') blocks.push('Humidité ou remontées capillaires : diagnostic et traitement adaptés avant tout ragréage. Un primaire d’accrochage ordinaire ne fait pas barrière à l’humidité.');
  if (condition === 'cracks') blocks.push('Fissures : faire établir leur cause et leur stabilité, puis définir le traitement avant de ragréer. Les fibres ne réparent pas une fissure active.');
  if (condition === 'unstable') blocks.push('Support friable ou mobile : remettre le support en état avant de ragréer. Un primaire ne remplace pas une structure stable et cohésive.');
  if (support === 'wood' && woodType === 'unknown') blocks.push('Précisez la nature du bois : les panneaux OSB / CTBH / CTBX et les lames de plancher ne sont pas admis par les mêmes systèmes.');
  if (location === 'outside') {
    if (slope === 'create') blocks.push('Création ou correction de pente : ce calcul à épaisseur constante ne convient pas. Définir un mortier de pente et ses dosages spécifiques.');
    if (slope === 'unknown') blocks.push('Vérifiez la pente et l’évacuation des eaux avant de commander, selon la fiche du système retenu.');
    if (finish === 'soft' || finish === 'parquet') blocks.push('Sol souple ou parquet en extérieur : cet usage nécessite un système complet spécifiquement validé.');
    warnings.push('Conserver l’écoulement des eaux et la pente minimale prescrite par le fabricant. Un ragréage autonivelant seul ne crée pas une pente.');
    if (support === 'paint') warnings.push('Peinture en extérieur : faire valider sa conservation et sa préparation. Une élimination mécanique complète peut être nécessaire.');
  }

  const validProfiles = (Array.isArray(brand?.products) ? brand.products : []).filter(documentedProduct).map(product => normalizedProduct(product, state));
  const low = localMin ?? thickness, high = localMax ?? thickness;
  const ranked = validProfiles.map((product, index) => ({ product, index, reasons: incompatibilities(product, state, low, high) }));
  const compatible = ranked.filter(item => item.reasons.length === 0).sort((a, b) => (a.product.priority ?? a.index) - (b.product.priority ?? b.index));
  const requestedProductId = typeof input.productId === 'string' ? input.productId.trim() : null;
  const hasRequestedProduct = input.productId != null && input.productId !== '' && requestedProductId !== '';
  const product = compatible.find(item => item.product.id === requestedProductId)?.product ?? compatible[0]?.product ?? null;
  const selectionChanged = hasRequestedProduct && (!product || product.id !== requestedProductId);
  const selectionMessage = selectionChanged
    ? product ? `La référence demandée n’est plus compatible avec vos choix ou n’appartient pas à ${brand.name}. L’estimation a été actualisée avec ${product.label}.`
      : 'La référence demandée n’est plus compatible avec vos choix. Aucune autre référence vérifiée de cette marque ne convient à cette configuration.'
    : '';
  if (product?.requiredWaterproofingOutside && location === 'outside' && waterproofing === 'yes') warnings.push('Réaliser le système d’étanchéité prescrit avec ses produits, ses délais et son ordre de mise en œuvre.');
  if (brand && !validProfiles.length) blocks.push(brand.unverifiedNote || `Les fiches de ragréage de ${brand.name} ne sont pas encore qualifiées dans le calculateur. Demandez au fabricant une référence et sa fiche avant de commander.`);
  else if (brand && !product) {
    blocks.push(`Aucune référence vérifiée de ${brand.name} ne correspond à l’ensemble de vos choix. Le calculateur ne remplace pas votre fournisseur par une autre marque.`);
    // Show the closest documented profile's precise limitation rather than a
    // long catalogue of irrelevant warnings or an arbitrary product formula.
    const nearest = ranked.sort((a, b) => a.reasons.length - b.reasons.length || a.index - b.index)[0];
    if (nearest) blocks.push(...nearest.reasons.slice(0, 2));
  }

  if (localMin === null || localMax === null) warnings.push('Vérifiez aussi l’épaisseur aux points hauts et dans les creux : la plage du produit doit être respectée en tout point.');
  if (product?.notes?.length) warnings.push(...product.notes.filter(note => typeof note === 'string'));
  if (product && finish === 'bare' && location === 'inside' && product.bareInsideAnnexOnly) warnings.push('Finition nue réservée aux annexes prévues par la fiche. Dans une pièce de vie, prévoir un revêtement.');
  if (support === 'wood') {
    warnings.push('Contrôler rigidité, fixation, ventilation et capacité portante. La masse annoncée concerne la poudre sèche et ne valide pas la structure.');
    tips.push('Fixer les lames ou panneaux pour supprimer tout mouvement ; traiter les joints et la périphérie selon le système retenu.');
  }
  if (support === 'anhydrite') {
    warnings.push('Contrôler l’humidité résiduelle à cœur selon la chape et le revêtement final ; une surface sèche en apparence ne suffit pas.');
    tips.push('Poncer la laitance si la prescription de la chape l’exige, puis aspirer soigneusement.');
  }
  if (support === 'tile') tips.push('Sonder le carrelage, déposer les carreaux non adhérents, reboucher, dégraisser et préparer mécaniquement selon la fiche, puis aspirer.');
  if (support === 'paint') tips.push('Contrôler l’adhérence et la nature de la peinture ; éliminer les parties non résistantes et suivre la préparation prescrite.');
  if (['cement', 'concrete'].includes(support)) tips.push('Éliminer laitance, produits de cure et contaminants ; aspirer puis vérifier la porosité réelle.');
  if (heating !== 'none') warnings.push('Suivre le protocole d’arrêt et de remise en chauffe du ragréage, du plancher et du revêtement ; les délais ne sont pas identiques pour toutes les marques.');
  if (finish === 'tile') tips.push('En salle de bains, le ragréage et le primaire ne remplacent pas la protection à l’eau ou l’étanchéité requise.');
  if (finish === 'soft' || finish === 'parquet') tips.push('Avant collage, contrôler le délai de recouvrement et l’humidité admissible du système complet ; une surface circulable n’est pas forcément prête à recouvrir.');
  tips.push('Respecter les joints existants et la désolidarisation périphérique ; préparer un support propre, sec, dur et stable.');
  tips.push('Respecter l’eau de gâchage du sac et le temps de malaxage ; ne jamais ajouter d’eau pour prolonger le temps de travail.');
  tips.push('Protéger le produit frais selon sa fiche : gel, soleil direct, pluie, courants d’air et température d’application.');

  const measurements = { area, thickness, margin, high };
  const estimate = estimateProduct(product, state, measurements, errors, blocks);
  const alternatives = compatible.map(({ product: alternative }) => ({
    ...alternative,
    product: alternative,
    ...estimateProduct(alternative, state, measurements, errors, blocks),
    selected: alternative.id === product?.id,
  }));
  const excludedProducts = ranked.filter(item => item.reasons.length > 0).map(({ product, reasons }) => ({ product, reasons }));
  return { ...estimate, warnings: [...new Set(warnings)], brand, product, alternatives, excludedProducts,
    selectionChanged, selectionMessage, tips };
}
