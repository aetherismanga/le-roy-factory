// Shared by the CRM report writers. Keep legacy fields and report metadata intact.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function reportField(data = {}, preferred = '') {
  if (preferred && Array.isArray(data[preferred])) return preferred;
  return Array.isArray(data.comptes_rendus) ? 'comptes_rendus' : Array.isArray(data.comptesRendus) ? 'comptesRendus' : 'comptes_rendus';
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

export const reportFingerprint = value => JSON.stringify(stable(value));

// An index from an earlier snapshot can point at another report after a new visit.
// Locate the unchanged original instead; reject concurrent edits and ambiguity.
export function unchangedReportIndex(list, original) {
  const fingerprint = reportFingerprint(original);
  const matches = list.map((value, index) => reportFingerprint(value) === fingerprint ? index : -1).filter(index => index >= 0);
  if (matches.length !== 1) throw new Error('Ce compte-rendu a changé. Fermez puis rouvrez sa fiche avant de réessayer.');
  return matches[0];
}
