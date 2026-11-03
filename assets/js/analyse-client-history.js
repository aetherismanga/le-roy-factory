// Read the same client-owned reports used by comptes-rendus.html.
// No company-name matching and no writes: opening a report must not create a CRM action.

const ALLOWED_AGENTS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);

export function historyDateMillis(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value?.toMillis === 'function') {
    const result = value.toMillis();
    return Number.isFinite(result) ? result : 0;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof value === 'object' && Number.isFinite(value.seconds)) {
    return value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const french = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (iso || french) {
    const year = Number(iso ? iso[1] : french[3]);
    const month = Number(iso ? iso[2] : french[2]);
    const day = Number(iso ? iso[3] : french[1]);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? parsed.getTime() : 0;
  }
  // Only unambiguous ISO timestamps are accepted after the explicit date formats.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw)) return 0;
  const at = Date.parse(raw);
  return Number.isFinite(at) ? at : 0;
}

const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

export function normalizeClientHistory(clientId, clientData = {}) {
  // Match the existing editor's canonical-field precedence; never duplicate both arrays.
  const sourceField = Array.isArray(clientData.comptes_rendus) ? 'comptes_rendus' : Array.isArray(clientData.comptesRendus) ? 'comptesRendus' : 'comptes_rendus';
  const reports = Array.isArray(clientData[sourceField]) ? clientData[sourceField] : [];
  const items = reports.flatMap((raw, sourceIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const date = text(raw.date);
    const createdAt = historyDateMillis(raw.createdAt || raw.created_at);
    return [{
      id: `${clientId}:${sourceField}:${sourceIndex}`,
      clientId,
      sourceField,
      sourceIndex,
      date,
      at: historyDateMillis(raw.date) || createdAt,
      createdAt,
      author: text(raw.author || raw.auteur) || 'Auteur non renseigné',
      text: text(raw.text || raw.texte || raw.notes),
      usine: text(raw.usine || raw.factory || raw.partenaire)
    }];
  });
  items.sort((a, b) => b.at - a.at || b.createdAt - a.createdAt || a.sourceIndex - b.sourceIndex);
  const encoded = encodeURIComponent(clientId);
  return {
    clientId,
    source: `clients/${clientId}`,
    sourceField,
    items,
    latest: items[0] || null,
    count: items.length,
    createUrl: `comptes-rendus.html?new=1&client=${encoded}`,
    historyUrl: `comptes-rendus.html?client=${encoded}`
  };
}

export async function loadClientHistory(clientId) {
  // A Firestore document ID is a single nonempty path segment, not a company or LRF code.
  if (typeof clientId !== 'string' || !clientId.trim() || clientId.includes('/') || clientId === '.' || clientId === '..') {
    throw new TypeError('Identifiant de la fiche client invalide.');
  }
  const [{ db, auth }, { doc, getDoc }] = await Promise.all([
    import('./firebase.js'),
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')
  ]);
  if (!ALLOWED_AGENTS.has(String(auth.currentUser?.email || '').toLowerCase())) {
    throw new Error('La lecture des comptes rendus nécessite une session agent autorisée.');
  }
  const snapshot = await getDoc(doc(db, 'clients', clientId));
  return { ...normalizeClientHistory(clientId, snapshot.exists() ? snapshot.data() : {}), found: snapshot.exists() };
}
