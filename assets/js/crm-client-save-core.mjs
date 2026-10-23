// One owner for client form writes. Firebase is injected so identity and concurrency
// rules can be exercised against fictional records without accessing production.
const FIELDS = new Set([
  'type', 'societe', 'adresse', 'codePostal', 'ville', 'contact', 'email',
  'telephone', 'telephones', 'notes', 'documents', 'comptes_rendus', 'contacts',
  'partenaires', 'categorieActivite', 'sousCategorie', 'agent', 'departement',
  'emails', 'region', 'pays', 'site', 'segmentation', 'motsCles', 'moovagoId',
  'moovagoPseudo', 'moovagoDernierSuivi', 'moovagoCarte', 'source', 'tva'
]);
const clean = value => String(value ?? '').trim();
const name = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const postal = value => { const s = clean(value).replace(/\s/g, ''); return /^\d{1,5}$/.test(s) ? s.padStart(5, '0') : s.toUpperCase(); };
const phone = value => clean(value).replace(/\D/g, '').replace(/^0033(?=\d{9}$)/, '0').replace(/^33(?=\d{9}$)/, '0');
const email = value => clean(value).toLowerCase();
const array = value => Array.isArray(value) ? value : [];
const active = value => value.archived !== true && value.archive !== true && !value.duplicateOf;
const codeNumber = value => { const match = clean(value).match(/^LRF-(\d{5})$/i); return match ? Number(match[1]) : 0; };
const fail = (code, message, details = {}) => Object.assign(new Error(message), { code, ...details });

function copy(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(item => item === undefined ? null : copy(item));
  if (value && typeof value === 'object') {
    // Firebase value objects (Timestamp, GeoPoint, DocumentReference, …) have
    // SDK prototypes and are immutable. Rebuilding them as ordinary objects
    // silently changes their Firestore type when the form saves an old history.
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, copy(item)]));
  }
  return value;
}
function stable(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
const equal = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function prepare(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw fail('CRM_INVALID_DRAFT', 'La fiche client est invalide.');
  const patch = Object.fromEntries(Object.entries(draft).filter(([key, value]) => FIELDS.has(key) && value !== undefined).map(([key, value]) => [key, copy(value)]));
  patch.societe = clean(patch.societe);
  if (!patch.societe) throw fail('CRM_INVALID_DRAFT', 'Le nom de la société est obligatoire.');
  return patch;
}
function duplicate(rows, draft) {
  const company = name(draft.societe);
  const cp = postal(draft.codePostal);
  const emails = [draft.email, ...array(draft.emails)].map(email).filter(Boolean);
  const phones = [draft.telephone, ...array(draft.telephones)].map(phone).filter(Boolean);
  return rows.find(row => {
    if (!active(row)) return false;
    if (clean(draft.moovagoId) && clean(row.moovagoId) === clean(draft.moovagoId)) return true;
    if (name(row.societe || row.enseigne || row.nom) !== company) return false;
    return (cp && postal(row.codePostal || row.code_postal) === cp)
      || [row.email, row.mail, row.eMail, ...array(row.emails)].map(email).some(value => value && emails.includes(value))
      || [row.telephone, row.mobile, row.portable, ...array(row.telephones)].map(phone).some(value => value && phones.includes(value));
  });
}
function counterValue(snap) {
  const value = Number(snap.exists() ? (snap.data().lastNumber ?? 0) : 0);
  if (!Number.isSafeInteger(value) || value < 0) throw fail('CRM_COUNTER_INVALID', 'Le compteur des codes clients est invalide. Aucune fiche n’a été créée.');
  return value;
}

export function createClientSaver({ db, collection, doc, getDocs, runTransaction, now = () => new Date().toISOString() }) {
  return async function saveClient({ clientId = null, draft, original } = {}) {
    const patch = prepare(draft);
    const originalCopy = original ? copy(original) : null;
    const editing = clientId !== null && clientId !== undefined && clientId !== '';
    const id = editing ? clean(clientId) : null;
    if (editing && (!id || id.includes('/'))) throw fail('CRM_INVALID_ID', 'Identifiant client invalide.');

    if (editing) {
      const ref = doc(db, 'clients', id);
      return runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw fail('CRM_NOT_FOUND', 'Cette fiche n’existe plus. Rechargez la liste avant de continuer.');
        const current = snap.data();
        if (!active(current)) throw fail('CRM_ARCHIVED', 'Cette fiche est archivée. Aucune nouvelle fiche n’a été créée.');
        if (originalCopy) {
          // The form supports both historical spellings. Compare the history
          // actually shown to the user, including edits made by a legacy module.
          const value = (record, key) => key === 'comptes_rendus' ? (record.comptes_rendus ?? record.comptesRendus) : record[key];
          const conflicts = Object.keys(patch).filter(key => !equal(value(current, key), value(originalCopy, key)) && !equal(value(current, key), patch[key]));
          if (conflicts.length) throw fail('CRM_CONFLICT', 'Cette fiche a été modifiée ailleurs. Rechargez-la avant d’enregistrer.', { fields: conflicts });
        }
        tx.update(ref, { ...copy(patch), updatedAt: now() });
        return { id, created: false, codeClient: current.codeClient || '' };
      });
    }

    // Allocate once: retrying a transaction never generates another document ID.
    const newRef = doc(collection(db, 'clients'));
    const counterRef = doc(db, 'crm_meta', 'client_codes');
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // Every create through this saver increments the counter. A baseline taken
      // before scanning makes concurrent creates rescan for duplicates instead of
      // relying on a stale list after the SDK retries the final transaction.
      const baseline = await runTransaction(db, async tx => counterValue(await tx.get(counterRef)));
      const snapshot = await getDocs(collection(db, 'clients'));
      const rows = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
      const existing = duplicate(rows, patch);
      if (existing) throw fail('CRM_DUPLICATE', 'Cette entreprise possède déjà une fiche. Ouvrez la fiche existante pour la modifier.', { clientId: existing.id, codeClient: existing.codeClient || '' });
      const maxExisting = rows.reduce((max, row) => Math.max(max, codeNumber(row.codeClient), ...array(row.codesLRF).map(codeNumber)), 0);
      try {
        return await runTransaction(db, async tx => {
          const counter = await tx.get(counterRef);
          const target = await tx.get(newRef);
          if (counterValue(counter) !== baseline) throw fail('CRM_RESCAN', 'La base a changé pendant la création.');
          if (target.exists()) throw fail('CRM_ID_COLLISION', 'Identifiant déjà utilisé. Réessayez la création.');
          const next = Math.max(baseline, maxExisting) + 1;
          if (next > 99999) throw fail('CRM_CODE_LIMIT', 'La limite de 99 999 codes clients est atteinte.');
          const codeClient = `LRF-${String(next).padStart(5, '0')}`;
          const at = now();
          tx.set(counterRef, { lastNumber: next, updatedAt: at }, { merge: true });
          tx.set(newRef, { ...copy(patch), codeClient, createdAt: at, updatedAt: at });
          return { id: newRef.id, created: true, codeClient };
        });
      } catch (error) {
        if (error.code !== 'CRM_RESCAN') throw error;
      }
    }
    throw fail('CRM_BUSY', 'Plusieurs créations sont en cours. Réessayez dans quelques secondes.');
  };
}
