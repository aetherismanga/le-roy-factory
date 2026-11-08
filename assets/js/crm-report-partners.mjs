// One vocabulary for report filters, the editor and client history.
// Existing reports are read without rewriting their text or their identity.
const definitions = [
  ['Elios Ceramica', 'Elios', 'Helios', 'Elios Ceramiche', 'Elios Ceramic'],
  ['View Ceramica', 'View', 'View Ceramiche', 'View Ceramic'],
  ['La Fenice', 'Fenice'],
  ["Petracer's", 'Petracer', 'Petracers'],
  ['Pecchioli Firenze', 'Pecchioli', 'Pecchiolli', 'Pecchiolli Firenze'],
  ['Bulbo'], ['Reviglass', 'Revi Glass'], ['Biopietra', 'Bio Pietra', 'Bio Pietre'],
  ['Neobath', 'Neo Bath'],
  ['Randal', 'Randall', 'Randal Pro', 'Randall Pro', 'Randal Group', 'Randall Group'],
  ['Aquahome', 'Aqua Home'], ['OPAL', 'Opale'],
  ['Koibath', 'Koi Bath', 'Coibat', 'Koibat', 'Koibath Muebles'],
  ['BILT'], ['Uptrend', 'Up Trend'], ['Reitano Rubinetterie', 'Reitano']
];

export const REPORT_PARTNERS = Object.freeze(definitions.map(([name]) => name));
const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const words = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const key = value => words(value).replace(/ /g, '');
const aliases = new Map(definitions.flatMap(([name, ...variants]) => [name, ...variants].map(value => [key(value), name])));
const partnerFields = ['usine', 'factory', 'partenaire', 'partenaires', 'partners'];

// Accept a unique one-character typo in a known name, including transposition.
// Short names and ambiguous matches require an explicit alias.
function oneTypo(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

export function canonicalReportPartner(value) {
  const token = key(value);
  if (aliases.has(token)) return aliases.get(token);
  if (token.length < 5 || token.length > 24) return '';
  const candidates = new Set();
  for (const [alias, name] of aliases) {
    if (alias.length >= 5 && oneTypo(token, alias)) candidates.add(name);
  }
  return candidates.size === 1 ? [...candidates][0] : '';
}

function split(value) {
  if (Array.isArray(value)) return value.flatMap(split);
  if (typeof value !== 'string') return [];
  return value.split(/[,;|+\n]+/).flatMap(part => {
    const label = clean(part);
    if (!label) return [];
    if (canonicalReportPartner(label)) return [label];
    // Keep unfamiliar company names such as “Pierre et Bain” intact.
    const pieces = label.split(/\s*(?:\/|&)\s*|\s+et\s+/i).map(clean).filter(Boolean);
    return pieces.length > 1 && pieces.every(canonicalReportPartner) ? pieces : [label];
  });
}

export function normalizeReportPartners(value) {
  const names = new Map();
  for (const label of split(value)) {
    const name = canonicalReportPartner(label) || label;
    const id = key(name) || name.toLowerCase();
    if (!names.has(id)) names.set(id, name);
  }
  return [...names.values()];
}

export function reportPartners(report = {}) {
  for (const field of partnerFields) {
    const names = normalizeReportPartners(report[field]);
    if (names.length) return names;
  }
  // Legacy visits without a partner field: use complete words, not substrings
  // (“View” must not be detected inside “interview”). Retain every mentioned brand.
  const tokens = words(report.text || report.texte || report.notes || report.note).split(' ').filter(Boolean);
  const names = new Set();
  for (let i = 0; i < tokens.length; i++) {
    for (let size = 1; size <= 3 && i + size <= tokens.length; size++) {
      const name = aliases.get(tokens.slice(i, i + size).join(''));
      if (name) names.add(name);
    }
  }
  return [...names];
}

export const reportPartnerLabel = report => reportPartners(report).join(', ');

export function reportPartnerChoices(reports = [], defaults = REPORT_PARTNERS) {
  return normalizeReportPartners([defaults, reports.map(reportPartners)])
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export function reportMatchesPartner(report, selected) {
  const wanted = normalizeReportPartners(selected).map(key);
  return !wanted.length || reportPartners(report).some(name => wanted.includes(key(name)));
}

export function withReportPartners(report, value) {
  const names = normalizeReportPartners(value);
  const result = { ...report, usine: names.join(', ') };
  // A later edit/clear must not resurrect a stale legacy partner field.
  for (const field of partnerFields.slice(1)) {
    if (Object.hasOwn(report, field)) result[field] = Array.isArray(report[field]) ? [...names] : result.usine;
  }
  return result;
}
