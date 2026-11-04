// Pure, deliberately conservative rules shared by the CRM duplicate audit.
export const clean = value => String(value ?? '').trim();
export const array = value => Array.isArray(value) ? value : [];
export const norm = value => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
export const active = client => !!client && client.archived !== true && client.archive !== true && !clean(client.duplicateOf);
export const postal = value => { const text = clean(value).replace(/\s/g, ''); return /^\d{5}$/.test(text) ? text : ''; };
export const normEmail = value => clean(value).toLowerCase();
export function normPhone(value) {
  let text = clean(value).replace(/[^+\d]/g, '');
  if (text.startsWith('0033')) text = '+33' + text.slice(4);
  if (/^0\d{9}$/.test(text)) text = '+33' + text.slice(1);
  if (/^33\d{9}$/.test(text)) text = '+' + text;
  return text.replace(/\D/g, '').length >= 7 ? text : '';
}
export function unique(values, key = value => clean(value)) {
  const found = new Set();
  return values.filter(value => { const id = key(value); if (!id || found.has(id)) return false; found.add(id); return true; });
}
// Equality includes every property: sharing an e-mail, phone, date or subject does
// not justify dropping a different contact or a different commercial report.
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    if (typeof value.toMillis === 'function') return { firestoreTimestamp: value.toMillis() };
    if (value.type === 'document' && typeof value.path === 'string') return { firestoreDocument: value.path };
    if (typeof value.latitude === 'number' && typeof value.longitude === 'number') return { latitude: value.latitude, longitude: value.longitude };
    if (value instanceof Date) return { date: value.toISOString() };
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}
export const exactKey = value => JSON.stringify(stable(value));
export const uniqueRecords = values => unique(values.filter(value => value && typeof value === 'object'), exactKey);
export const phones = client => unique([...array(client?.telephones), client?.telephone, client?.mobile, client?.portable].map(normPhone).filter(Boolean));
export const emails = client => unique([...array(client?.emails), client?.email, client?.mail, client?.eMail].map(normEmail).filter(value => value.includes('@')));
const address = client => norm(client?.adresse || client?.address);
const intersect = (left, right) => left.some(value => right.includes(value));

export function safeDuplicate(left, right) {
  if (!active(left) || !active(right) || !left.id || !right.id || left.id === right.id) return false;
  if (!norm(left.societe) || norm(left.societe) !== norm(right.societe)) return false;
  const leftPostal = postal(left.codePostal || left.code_postal), rightPostal = postal(right.codePostal || right.code_postal);
  const leftCity = norm(left.ville), rightCity = norm(right.ville);
  if (leftPostal && rightPostal && leftPostal !== rightPostal) return false;
  if (leftCity && rightCity && leftCity !== rightCity) return false;
  if (address(left) && address(right) && address(left) !== address(right)) return false;
  const leftMoovago = clean(left.moovagoId), rightMoovago = clean(right.moovagoId);
  if (leftMoovago && rightMoovago) return leftMoovago === rightMoovago;
  // Shared LRF codes can themselves be an error. Chain-store contact details
  // and a company name alone must never merge different establishments.
  return !!(leftPostal && leftPostal === rightPostal && leftCity && leftCity === rightCity &&
    address(left) && address(left) === address(right) &&
    (intersect(phones(left), phones(right)) || intersect(emails(left), emails(right))));
}
export function duplicateGroups(rows) {
  const groups = [];
  for (const client of rows.filter(active)) {
    const group = groups.find(items => items.every(item => safeDuplicate(item, client)));
    if (group) group.push(client); else groups.push([client]);
  }
  return groups.filter(group => group.length > 1);
}
const lrfNumber = value => { const match = clean(value).match(/^LRF-(\d{5})$/i); return match ? Number(match[1]) : Infinity; };
export function chooseCanonical(rows) {
  return [...rows].sort((left, right) => lrfNumber(left.codeClient) - lrfNumber(right.codeClient) || clean(left.id).localeCompare(clean(right.id)))[0];
}
const hasValue = value => value !== undefined && value !== null && (typeof value !== 'string' || clean(value) !== '');
export function mergedPayload(rows, canonical, now = new Date().toISOString()) {
  const merged = {};
  // Fill missing scalar fields only; retain unknown fields (including photos).
  // Existing aliases retain all original conflicting values unchanged.
  for (const row of [canonical, ...rows.filter(item => item.id !== canonical.id)]) {
    for (const [key, value] of Object.entries(row)) {
      if (key === 'id' || key === 'duplicateOf' || key === 'canonicalClientId' || key === 'archived' || key === 'archive') continue;
      if (Array.isArray(value)) merged[key] = unique([...(Array.isArray(merged[key]) ? merged[key] : []), ...value], exactKey);
      else if (!hasValue(merged[key]) && hasValue(value)) merged[key] = value;
    }
  }
  merged.telephones = unique(rows.flatMap(phones));
  merged.emails = unique(rows.flatMap(emails));
  merged.telephone = normPhone(canonical.telephone) || merged.telephones[0] || clean(canonical.telephone);
  merged.email = clean(canonical.email) || merged.emails[0] || '';
  merged.notes = unique(rows.map(row => clean(row.notes)).filter(Boolean)).join('\n\n---\n');
  merged.contacts = uniqueRecords(rows.flatMap(row => array(row.contacts)));
  merged.comptes_rendus = uniqueRecords(rows.flatMap(row => [...array(row.comptes_rendus), ...array(row.comptesRendus)]));
  merged.historiqueMails = uniqueRecords(rows.flatMap(row => array(row.historiqueMails)));
  merged.documents = uniqueRecords(rows.flatMap(row => array(row.documents)));
  merged.codeClient = clean(canonical.codeClient) || clean(rows.find(row => clean(row.codeClient))?.codeClient);
  merged.codesLRF = unique(rows.flatMap(row => [row.codeClient, ...array(row.codesLRF)]).filter(Boolean), value => clean(value).toUpperCase());
  merged.duplicateAliasIds = unique(rows.flatMap(row => [...array(row.duplicateAliasIds), ...(row.id === canonical.id ? [] : [row.id])]));
  merged.integrityMergedAt = now;
  merged.archived = false;
  merged.archive = false;
  merged.canonicalClientId = canonical.id;
  return merged;
}
export function resolveCanonical(id, aliases) {
  let current = clean(id);
  const seen = new Set();
  while (current && aliases.has(current)) {
    if (seen.has(current)) return null;
    seen.add(current);
    current = clean(aliases.get(current));
  }
  return current || null;
}
