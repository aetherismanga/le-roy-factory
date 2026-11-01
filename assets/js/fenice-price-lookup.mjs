// Match only the authorized rows supplied by the tariff service. No grid lives here.
const compact = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const words = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
export function normaliseFormat(value) {
  const matches = [...String(value || '').replaceAll(',', '.').replace(/[×*]/g, 'x').matchAll(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/gi)];
  if (!matches.length) return '';
  return matches.map(match => [Number(match[1]), Number(match[2])].sort((a,b) => a-b).join('x')).join('+');
}
function aliases(product) {
  const values = [product?.name, product?.slug, product?.id].filter(Boolean).map(words);
  const key = compact(product?.name || product?.slug);
  const extra = {
    antiqueaurea:['antiqua aurea'], hollywood:['holly wood'], primestone:['primestone','prime stone'],
    walkmaterials:['walk material'], suveyareactive3devo:['suveya']
  };
  // Catalogue names may include a technology qualifier omitted from the price list.
  if (key.startsWith('suveya')) values.push('suveya');
  if (key === 'lifestile') values.push('life style');
  values.push(...(extra[key] || []));
  return [...new Set(values)].filter(Boolean);
}
function collectionMatches(row, product, catalogue) {
  const wanted = aliases(product);
  if (!wanted.length) return false;
  if (row.collection) return wanted.some(alias => compact(alias) === compact(row.collection));
  const description = words(row.description);
  const candidates = [...catalogue, product].flatMap(p => aliases(p).map(alias => ({alias, key:compact(p.name || p.slug || p.id)}))).sort((a,b) => b.alias.length-a.alias.length);
  let remaining = ' ' + description + ' ';
  const found = new Set();
  // Longer catalogue names consume their phrase before short names such as Stone,
  // Touch and Oykos can claim it. This avoids cross-collection substring matches.
  for (const entry of candidates) {
    const phrase = ' ' + entry.alias + ' ';
    if (remaining.includes(phrase)) {
      found.add(entry.key);
      remaining = remaining.split(phrase).join(' | ');
    }
  }
  const productKey = compact(product.name || product.slug || product.id);
  return found.has(productKey);
}
function isSpecial(row) {
  return /\b(?:grip|strutt|struttura|dec|decoro|mosaico|muretto|intrecci|noblesse|piramide|visual|prestige|righe|ventaglio|rows|ovale|felce|fogli[ae]|window)\b/i.test(String(row.detail || '') + ' ' + String(row.description || ''));
}
const money = value => new Intl.NumberFormat('fr-FR', {minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
function specialForProduct(row,product) {
  if (isSpecial({detail:row.detail})) return true;
  const names=aliases(product),segments=String(row.description || '').split(/[-;]/).filter(segment => names.some(alias => (' '+words(segment)+' ').includes(' '+alias+' ')));
  return segments.length ? segments.every(segment => isSpecial({description:segment})) : isSpecial(row);
}
const priceText = (amount, unit) => money(amount) + ' € HT/' + unit;
export function validPriceRecords(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 20000) return false;
  return rows.every(row => row && typeof row === 'object' && !Array.isArray(row) && Number.isFinite(row.amount) && row.amount >= 0 && row.amount < 1000000 && typeof row.description === 'string' && row.description.length < 2000 && normaliseFormat(row.format) && ['m²','pièce','ml','m2','mq','pc','pz'].includes(row.unit));
}
export function lookupPrice(rows, product, format, catalogue = []) {
  const key = normaliseFormat(format);
  if (!key || !product) return {unavailable:true,label:'Sur demande'};
  let matches = rows.filter(row => normaliseFormat(row.format) === key && collectionMatches(row,product,catalogue));
  // A price stated for a decor or Grip cannot become the standard tile price.
  const standard = matches.filter(row => !specialForProduct(row,product));
  if (standard.length) matches = standard;
  else if (matches.some(row => specialForProduct(row,product)) && !isSpecial({description:product.name,detail:String(format)})) return {unavailable:true,label:'Sur demande'};
  if (!matches.length) return {unavailable:true,label:'Sur demande'};
  const explicit = matches.filter(row => row.collection);
  if (explicit.length) matches = explicit;
  const options = [...new Map(matches.map(row => {
    const unit = ['m2','mq'].includes(row.unit) ? 'm²' : ['pc','pz'].includes(row.unit) ? 'pièce' : row.unit;
    const option = {amount:row.amount,unit,detail:String(row.detail || ''),condition:String(row.condition || ''),source:String(row.source || ''),page:row.page};
    return [[option.amount,unit,option.detail,option.condition].join('|'), option];
  })).values()];
  const general = options.filter(row => !row.condition || /toutes\s+quantit/i.test(row.condition));
  const main = general.length ? general : options;
  const units = [...new Set(main.map(row => row.unit))];
  if (units.length !== 1) return {unavailable:true,label:'Sur demande — selon la référence'};
  const amounts = [...new Set(main.map(row => row.amount))].sort((a,b) => a-b), unit = units[0];
  let label = amounts.length === 1 ? priceText(amounts[0],unit) : money(amounts[0]) + ' à ' + money(amounts.at(-1)) + ' € HT/' + unit + ' selon coloris / finition';
  const conditions = [...new Set(main.map(row => row.condition).filter(Boolean))];
  if (!general.length && conditions.length) label += ' (' + conditions.join(', ') + ')';
  const bulk = options.filter(row => /stock.*5\s*pal/i.test(row.condition));
  if (general.length && bulk.length) {
    const prices = [...new Set(bulk.map(row => row.amount))].sort((a,b) => a-b);
    label += ' · Stock > 5 palettes : ' + (prices.length === 1 ? priceText(prices[0],unit) : money(prices[0]) + ' à ' + money(prices.at(-1)) + ' € HT/' + unit);
  }
  return {amount:amounts.length === 1 ? amounts[0] : null,unit,label,options};
}
