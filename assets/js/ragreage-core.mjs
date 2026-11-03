/**
 * LE ROY FACTORY — calcul et aide au choix du ragréage.
 * Sources fabricants consultées le 03/11/2026, France :
 * https://www.fr.weber/preparation-et-finition-des-sols/les-ragreages-et-mortiers-de-lissage/weberniv
 * https://www.fr.weber/preparation-et-finition-des-sols/les-ragreages-et-mortiers-de-lissage/weberniv-dur
 * https://www.fr.weber/preparation-et-finition-des-sols/les-ragreages-et-mortiers-de-lissage/weberniv-lex-2
 * https://www.fr.weber/preparation-et-finition-des-sols/les-primaires-et-produits-de-service-pour-sols/weberprim-rp
 * https://www.fr.weber/preparation-et-finition-des-sols/les-primaires-et-produits-de-service-pour-sols/weberprim-universel
 * Fiches techniques for 05/05/2026, dur+ 16/06/2026, lex2 01/06/2026.
 * Les consommations restent théoriques. Le mode constant ne calcule pas une
 * forme de pente, qui demande un système et un dosage différents.
 */

const ROOT = 'https://www.fr.weber/preparation-et-finition-des-sols/';
const RAG = `${ROOT}les-ragreages-et-mortiers-de-lissage/`;
const PRIM = `${ROOT}les-primaires-et-produits-de-service-pour-sols/`;

export const SUPPORTS = Object.freeze([
  { id: 'tile', label: 'Ancien carrelage', short: 'Carrelage', description: 'Carreaux sains, adhérents et dégraissés.' },
  { id: 'cement', label: 'Chape ciment', short: 'Chape ciment', description: 'Support ciment sec, cohésif et préparé.' },
  { id: 'concrete', label: 'Dalle béton', short: 'Béton', description: 'Béton sain, propre, sans laitance ni produit de cure.' },
  { id: 'wood', label: 'Bois / OSB', short: 'Bois / OSB', description: 'Panneaux OSB, CTBH, CTBX ou lames rigides, stables et fixés.' },
  { id: 'anhydrite', label: 'Chape anhydrite', short: 'Anhydrite', description: 'Sulfate de calcium : humidité contrôlée et laitance éliminée.' },
  { id: 'paint', label: 'Ancienne peinture', short: 'Peinture', description: 'Peinture de sol : adhérence et préparation à contrôler.' },
  { id: 'unknown', label: 'Support à identifier', short: 'À identifier', description: 'Identifier le support avant de choisir le système.' },
]);

export const PRODUCTS = Object.freeze({
  for: Object.freeze({ id: 'for', label: 'weberniv for', type: 'Ragréage autolissant fibré P3 — intérieur', rate: 1.6, bag: 25, min: 3, max: 30, url: `${RAG}weberniv` }),
  dur: Object.freeze({ id: 'dur', label: 'weberniv dur +', type: 'Ragréage fibré P4SR — intérieur / extérieur', rate: 1.7, bag: 25, min: 3, max: 50, url: `${RAG}weberniv-dur` }),
  lex: Object.freeze({ id: 'lex', label: 'weberniv lex 2', type: 'Ragréage fibré de finition — extérieur / annexes', rate: 1.7, bag: 25, min: 3, max: 10, url: `${RAG}weberniv-lex-2` }),
  custom: Object.freeze({ id: 'custom', label: 'Mon produit', type: 'Estimation avec les données de votre fiche technique', rate: 1.7, bag: 25, min: null, max: null, url: null }),
});

const RP = Object.freeze({
  label: 'Primaire bouche-pores — weberprim RP',
  detail: 'Pour support minéral absorbant ; sur anhydrite, respecter la fiche du ragréage. Produit prêt à l’emploi. Séchage indicatif 1 à 4 h, sec avant recouvrement. Plusieurs passes peuvent être nécessaires selon la porosité.',
  rateMin: 0.15, rateMax: 0.25, unit: 'kg', url: `${PRIM}weberprim-rp`,
});
const UNIVERSAL = Object.freeze({
  label: 'Primaire d’adhérence sablé — weberprim universel',
  detail: 'Pour support fermé préparé, ancien carrelage ou bois admis par la fiche du ragréage. Une couche régulière, sans dilution. Attendre le séchage complet ; environ 45 min dans les conditions de la fiche.',
  rateMin: 0.1, rateMax: 0.2, unit: 'kg', url: `${PRIM}weberprim-universel`,
});

function number(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !value.trim()) return NaN;
  return Number(value.trim().replace(',', '.'));
}

function optionalNumber(value) {
  return value == null || value === '' ? null : number(value);
}

function noPrimary(label, detail) {
  return { label, detail, rateMin: null, rateMax: null, unit: 'kg', url: null };
}

/**
 * Input: support, location, finish, heating, condition, area, thickness, margin,
 * product, rate, bag, minThickness, maxThickness, slope.
 * minThickness / maxThickness sont les épaisseurs LOCALES relevées sur le sol.
 * valid décrit les saisies ; blocked décrit l'impossibilité d'une prescription.
 * En cas de blocage, les quantités théoriques ne constituent pas une commande.
 */
export function calculate(input = {}) {
  const errors = [], blocks = [], warnings = [], tips = [];
  const support = input.support ?? 'tile';
  const location = input.location ?? 'inside';
  const finish = input.finish ?? 'tile';
  const heating = input.heating ?? 'none';
  const condition = input.condition ?? 'sound';
  const selected = input.product ?? 'auto';
  const slope = input.slope ?? 'unknown';
  const porosity = input.porosity ?? 'unknown';
  const area = number(input.area), thickness = number(input.thickness);
  const margin = number(input.margin ?? 5);
  const localMin = optionalNumber(input.minThickness);
  const localMax = optionalNumber(input.maxThickness);

  if (!SUPPORTS.some(item => item.id === support)) errors.push('Choisissez un support proposé.');
  if (!['inside', 'outside'].includes(location)) errors.push('Choisissez intérieur ou extérieur.');
  if (!['tile', 'soft', 'parquet', 'bare'].includes(finish)) errors.push('Choisissez le revêtement final.');
  if (!['none', 'water', 'electric'].includes(heating)) errors.push('Précisez le type de chauffage au sol.');
  if (!['sound', 'damp', 'cracks', 'unstable'].includes(condition)) errors.push('Précisez l’état du support.');
  if (!['auto', ...Object.keys(PRODUCTS)].includes(selected)) errors.push('Choisissez un profil de produit valide.');
  if (!['unknown', 'absorbent', 'closed'].includes(porosity)) errors.push('Précisez la porosité du support.');
  if (!Number.isFinite(area) || area <= 0) errors.push('Indiquez une surface supérieure à 0 m².');
  if (!Number.isFinite(thickness) || thickness <= 0) errors.push('Indiquez une épaisseur moyenne supérieure à 0 mm.');
  if (![0, 5, 10].includes(margin)) errors.push('Choisissez une marge de 0, 5 ou 10 %.');
  if (localMin !== null && (!Number.isFinite(localMin) || localMin <= 0)) errors.push('L’épaisseur locale minimale doit être supérieure à 0 mm.');
  if (localMax !== null && (!Number.isFinite(localMax) || localMax <= 0)) errors.push('L’épaisseur locale maximale doit être supérieure à 0 mm.');
  if (localMin !== null && localMax !== null && localMin > localMax) errors.push('Le minimum local ne peut pas dépasser le maximum local.');
  if (localMin !== null && Number.isFinite(localMin) && thickness < localMin) errors.push('L’épaisseur moyenne ne peut pas être inférieure au minimum local.');
  if (localMax !== null && Number.isFinite(localMax) && thickness > localMax) errors.push('L’épaisseur moyenne ne peut pas dépasser le maximum local.');
  if (location === 'outside' && !['ready', 'create', 'unknown'].includes(slope)) errors.push('Précisez l’état de la pente extérieure.');

  let productId = selected;
  if (selected === 'auto') {
    if (location === 'outside') productId = finish === 'bare' ? 'lex' : 'dur';
    else if (finish === 'bare') productId = 'dur';
    else productId = support === 'paint' || thickness > 30 || (localMax !== null && localMax > 30) ? 'dur' : 'for';
  }
  const product = PRODUCTS[productId] ?? PRODUCTS.for;
  const custom = product.id === 'custom';
  const rate = custom ? number(input.rate === undefined ? product.rate : input.rate) : product.rate;
  const bag = custom ? number(input.bag === undefined ? product.bag : input.bag) : product.bag;
  if (!Number.isFinite(rate) || rate <= 0) errors.push('Indiquez une consommation supérieure à 0 kg/m²/mm.');
  if (!Number.isFinite(bag) || bag <= 0) errors.push('Indiquez un poids de sac supérieur à 0 kg.');

  if (support === 'unknown') blocks.push('Identifiez la nature du support avant de choisir le ragréage et son primaire.');
  if (condition === 'damp') blocks.push('Humidité ou remontées capillaires : diagnostic et traitement adaptés avant tout ragréage. Un primaire d’accrochage ordinaire ne fait pas barrière à l’humidité.');
  if (condition === 'cracks') blocks.push('Fissures : faire établir leur cause et leur stabilité, puis définir le traitement avant de ragréer. Les fibres ne réparent pas une fissure active.');
  if (condition === 'unstable') blocks.push('Support friable ou mobile : remettre le support en état avant de ragréer. Un primaire ne remplace pas une structure stable et cohésive.');

  if (location === 'outside') {
    if (slope === 'create') blocks.push('Création ou correction de pente : ce calcul à épaisseur constante ne convient pas. Définir un mortier de pente et ses dosages spécifiques.');
    if (slope === 'unknown') blocks.push('Vérifiez la pente et l’évacuation des eaux avant de commander. Pour les profils Weber proposés, le support extérieur doit présenter au moins 1,5 % de pente.');
    if (finish === 'soft' || finish === 'parquet') blocks.push('Sol souple ou parquet en extérieur : usage non couvert par les systèmes proposés. Faire valider un système complet adapté.');
    if (!custom && ['wood', 'anhydrite'].includes(support)) blocks.push('Le bois et la chape anhydrite en extérieur ne sont pas couverts par les profils proposés.');
    if (support === 'paint') warnings.push('Peinture en extérieur : faire valider sa conservation et sa préparation par le fabricant. Une élimination mécanique complète peut être nécessaire avant le primaire.');
    if (!custom && product.id === 'for') blocks.push('weberniv for est réservé à l’intérieur. Choisissez un produit explicitement admis à l’extérieur.');
    warnings.push(custom ? 'Extérieur : vérifier dans la fiche de votre produit la pente minimale, l’écoulement des eaux et le revêtement admis.' : 'Conserver la pente existante d’au moins 1,5 % et l’écoulement des eaux. Un ragréage autonivelant seul ne crée pas une pente.');
  }

  if (!custom) {
    const checkedMin = localMin ?? thickness;
    const checkedMax = localMax ?? thickness;
    if (checkedMin < product.min || checkedMax > product.max) blocks.push(`${product.label} s’applique de ${product.min} à ${product.max} mm en couche continue : les épaisseurs saisies sortent de cette plage.`);
    if (product.id === 'for' && support === 'paint') blocks.push('L’ancienne peinture n’est pas un support explicitement visé par le profil weberniv for. Préparer le support ou choisir un système documenté.');
    if (product.id === 'for' && finish === 'bare') blocks.push('Ce profil weberniv for est prévu pour recevoir un revêtement. Choisissez un profil de finition pour une annexe ou un extérieur.');
    if (product.id === 'lex' && ['wood', 'anhydrite', 'paint'].includes(support)) blocks.push('weberniv lex 2 ne couvre pas ce support. Il vise les chapes ciment, dalles béton et anciens carrelages préparés.');
    if (product.id === 'lex' && heating !== 'none') blocks.push('Le profil weberniv lex 2 ne documente pas ici cet usage sur plancher chauffant. Faire valider le système ou choisir un produit explicitement compatible.');
    if (product.id === 'lex' && finish === 'bare' && support === 'tile') blocks.push('Finition nue sur ancien carrelage : faire valider la préparation et le primaire weberfloor 4716. weberprim RP ne convient pas au carrelage fermé et le primaire universel n’est pas celui prescrit pour lex 2 laissé nu.');
    if (product.id === 'dur' && location === 'outside' && finish === 'bare') blocks.push('weberniv dur + doit être recouvert en extérieur. Pour une finition nue, choisir un système extérieur autorisé.');
    if (product.id === 'lex' && finish !== 'bare' && !['tile'].includes(finish)) blocks.push('Ce profil lex 2 ne documente pas la pose du sol souple ou du parquet. Faire valider le revêtement associé.');
  } else {
    warnings.push('Produit libre : calcul de quantité uniquement. La compatibilité support, extérieur, chauffage, revêtement et les épaisseurs admissibles doivent être vérifiées dans sa fiche technique.');
  }

  if (localMin === null || localMax === null) warnings.push('L’épaisseur moyenne sert au volume. Vérifiez aussi le minimum aux points hauts et le maximum dans les creux : la plage du produit doit être respectée en tout point.');
  if (finish === 'bare' && location === 'inside') warnings.push('Finition nue réservée aux pièces annexes adaptées, comme caves et buanderies. Dans une pièce de vie, prévoir un revêtement.');
  if (support === 'wood') {
    warnings.push('Vérifier rigidité, fixation des panneaux ou lames, ventilation en sous-face et capacité portante. La charge calculée ci-dessous concerne la poudre sèche et ne valide pas la structure.');
    tips.push('Fixer les lames ou panneaux pour supprimer tout mouvement ; boucher les passages de produit et conserver une désolidarisation périphérique adaptée.');
  }
  if (support === 'anhydrite') {
    warnings.push('Contrôler l’humidité résiduelle à cœur selon le DTA de la chape et le revêtement final ; ne pas se fier à une surface sèche en apparence.');
    tips.push('Poncer la laitance si la prescription de la chape l’exige, puis aspirer soigneusement. Pour les profils for et dur +, utiliser weberprim RP sur anhydrite.');
  }
  if (support === 'tile') tips.push('Sonder l’ancien carrelage, déposer les carreaux non adhérents, reboucher et dégraisser soigneusement. Dépolir les traitements de surface incompatibles puis aspirer.');
  if (support === 'paint') tips.push('Contrôler l’adhérence de la peinture de sol ; éliminer les parties non résistantes et suivre la préparation prescrite. Une peinture écaillée ne peut pas être conservée.');
  if (['cement', 'concrete'].includes(support)) tips.push('Éliminer laitance, produit de cure et salissures ; aspirer puis adapter le primaire à la porosité réelle du support.');
  if (heating !== 'none') {
    warnings.push(custom ? 'Plancher chauffant : vérifier la compatibilité exacte et le protocole d’arrêt / remise en chauffe de votre produit.' : 'Sur les profils for et dur +, arrêter le chauffage au moins 48 h avant et ne le remettre en service que 48 h après les travaux, en respectant également le protocole du plancher et du revêtement.');
    if (heating === 'electric') tips.push('PRE : la compatibilité du ragréage ne remplace pas les prescriptions du système chauffant, de son enrobage et du revêtement final.');
  }
  if (finish === 'tile') tips.push('En salle de bains, le ragréage et le primaire ne remplacent pas la protection à l’eau ou l’étanchéité requise par l’ouvrage.');
  if (finish === 'soft' || finish === 'parquet') tips.push('Avant collage, respecter le délai de recouvrement et l’humidité admissible du ragréage, de la colle et du revêtement ; une surface circulable n’est pas forcément prête à recouvrir.');
  tips.push('Respecter les joints existants et la désolidarisation périphérique ; préparer un support propre, sec, dur et stable.');
  tips.push('Mesurer l’eau de gâchage indiquée sur le sac, malaxer correctement et ne jamais rajouter d’eau pour prolonger le temps de travail.');
  tips.push('Protéger le produit frais du gel, du soleil direct, de la pluie et des courants d’air ; consulter les conditions d’application du fabricant.');

  let primary;
  if (custom) primary = noPrimary('Primaire à définir avec votre produit', 'Choisir un primaire compatible avec le support et le ragréage dans le même système documenté. Quantité non estimée sans fiche technique.');
  else if (blocks.length) primary = noPrimary('Primaire à confirmer après validation', 'Résoudre les points bloquants avant de prescrire le primaire ou de commander le système.');
  else if (['concrete', 'cement'].includes(support) && porosity === 'unknown') primary = noPrimary('À choisir après contrôle de la porosité', 'Sur béton ou ciment absorbant : primaire bouche-pores du système. Sur support fermé : primaire d’adhérence explicitement admis. Vérifier la porosité et la préparation avant de choisir le primaire.');
  else if (['concrete', 'cement'].includes(support) && porosity === 'closed' && product.id === 'lex' && finish === 'bare') primary = noPrimary('Préparation et primaire à valider', 'lex 2 laissé nu prescrit RP ou weberfloor 4716. Sur béton fermé, faire valider la préparation mécanique et le primaire par le fabricant ; ne pas remplacer automatiquement par un primaire universel.');
  else primary = { ...(['tile', 'wood', 'paint'].includes(support) || porosity === 'closed' && ['concrete', 'cement'].includes(support) ? UNIVERSAL : RP) };

  let netKg = null, totalKg = null, bags = null, purchasedKg = null, surplusKg = null, loadKgM2 = null;
  if (!errors.length) {
    netKg = area * thickness * rate;
    totalKg = netKg * (1 + margin / 100);
    loadKgM2 = thickness * rate;
    if (![netKg, totalKg, loadKgM2, totalKg / bag].every(Number.isFinite) || totalKg / bag > Number.MAX_SAFE_INTEGER) errors.push('Les valeurs dépassent la plage de calcul. Réduisez la surface ou les quantités.');
    else {
      // Avoid a spurious extra bag at an exact boundary after float arithmetic.
      bags = Math.ceil(totalKg / bag - 1e-9);
      if (bags < 1) bags = 1;
      purchasedKg = bags * bag;
      surplusKg = Math.max(0, purchasedKg - totalKg);
      if (![purchasedKg, surplusKg].every(Number.isFinite)) errors.push('Les quantités à commander dépassent la plage de calcul. Vérifiez les valeurs saisies.');
    }
  }
  if (errors.length) netKg = totalKg = bags = purchasedKg = surplusKg = loadKgM2 = null;
  const primaryMin = !errors.length && primary.rateMin !== null ? area * primary.rateMin : null;
  const primaryMax = !errors.length && primary.rateMax !== null ? area * primary.rateMax : null;

  return { valid: errors.length === 0, errors, blocked: blocks.length > 0, blocks, warnings, product, primary,
    area, thickness, rate, bag, margin, netKg, totalKg, bags, purchasedKg, surplusKg, loadKgM2,
    primaryMin, primaryMax, tips };
}
