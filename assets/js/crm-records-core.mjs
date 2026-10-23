// Shared transactional operations for CRM history and document references.
// SDK methods are injected so the exact operations can be tested without real data.
export function historyField(data) {
  return Array.isArray(data.comptes_rendus) ? 'comptes_rendus'
    : Array.isArray(data.comptesRendus) ? 'comptesRendus' : 'comptes_rendus';
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const fingerprint = value => JSON.stringify(canonical(value));

export function reportIndex(list, original) {
  const matches = list.map((item, index) => ({item, index}))
    .filter(({item}) => fingerprint(item) === fingerprint(original));
  if (matches.length !== 1) throw new Error('Ce compte-rendu a changé ou est ambigu. Rouvrez-le avant de modifier.');
  return matches[0].index;
}

export async function saveReport({db, doc, runTransaction, editing, targetId, report}) {
  const targetRef = doc(db, 'clients', targetId);
  return runTransaction(db, async transaction => {
    const targetSnap = await transaction.get(targetRef);
    if (!targetSnap.exists()) throw new Error('Client cible introuvable.');
    const targetData = targetSnap.data();
    if (targetData.archived === true || targetData.archive === true) throw new Error('Cette fiche client est archivée.');
    if (!editing) {
      const field = historyField(targetData);
      transaction.update(targetRef, {[field]: [report, ...(targetData[field] || [])]});
      return;
    }
    const sourceRef = editing.clientId === targetId ? targetRef : doc(db, 'clients', editing.clientId);
    const sourceSnap = editing.clientId === targetId ? targetSnap : await transaction.get(sourceRef);
    if (!sourceSnap.exists()) throw new Error('Client source introuvable.');
    const sourceData = sourceSnap.data();
    const sourceField = editing.crField || historyField(sourceData);
    const sourceList = Array.isArray(sourceData[sourceField]) ? [...sourceData[sourceField]] : [];
    const index = reportIndex(sourceList, editing.raw);
    if (editing.clientId === targetId) {
      sourceList[index] = report;
      transaction.update(sourceRef, {[sourceField]: sourceList});
    } else {
      sourceList.splice(index, 1);
      const targetField = historyField(targetData);
      transaction.update(sourceRef, {[sourceField]: sourceList});
      transaction.update(targetRef, {[targetField]: [report, ...(targetData[targetField] || [])]});
    }
  });
}

export function embeddedDocument(metadata, id) {
  return {
    documentId: id, nom: metadata.name, name: metadata.name, url: metadata.url,
    type: metadata.type || '', size: metadata.size || 0, path: metadata.path || '',
    note: metadata.note || '', source: 'Documents clients',
    uploadedBy: metadata.uploadedBy || '', uploadedAt: metadata.uploadedAt,
    archived: false
  };
}
export function documentMatches(entry, metadata) {
  if (entry.documentId) return entry.documentId === metadata.id;
  if (entry.path && metadata.path) return entry.path === metadata.path;
  return !!entry.url && entry.url === metadata.url && (entry.nom || entry.name) === metadata.name;
}

export async function registerDocument({db, doc, runTransaction, documentId, metadata}) {
  const reference = doc(db, 'clientDocuments', documentId);
  const clientRef = doc(db, 'clients', metadata.clientId);
  return runTransaction(db, async transaction => {
    const clientSnap = await transaction.get(clientRef);
    const existing = await transaction.get(reference);
    if (!clientSnap.exists()) throw new Error('Client introuvable.');
    const client = clientSnap.data();
    if (client.archived === true || client.archive === true) throw new Error('Cette fiche client est archivée.');
    if (existing.exists()) {
      if (existing.data().clientId !== metadata.clientId || existing.data().path !== metadata.path) throw new Error('Référence de document déjà utilisée.');
      return;
    }
    const documents = Array.isArray(client.documents) ? [...client.documents] : [];
    documents.push(embeddedDocument(metadata, documentId));
    transaction.set(reference, metadata);
    transaction.update(clientRef, {documents});
  });
}

export async function setDocumentArchive({db, doc, runTransaction, documentId, archived, author, now}) {
  const reference = doc(db, 'clientDocuments', documentId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('Document introuvable.');
    const metadata = {...snapshot.data(), id: snapshot.id};
    const clientRef = doc(db, 'clients', metadata.clientId);
    const clientSnap = await transaction.get(clientRef);
    if (!clientSnap.exists()) throw new Error('Client introuvable.');
    const current = Array.isArray(clientSnap.data().documents) ? clientSnap.data().documents : [];
    let matched = false;
    const documents = current.map(entry => {
      if (!documentMatches(entry, metadata)) return entry;
      matched = true;
      return {...entry, documentId, archived};
    });
    if (!archived && !matched) documents.push(embeddedDocument({...metadata, uploadedAt: metadata.uploadedAt || now}, documentId));
    transaction.update(reference, {archived, archivedAt: archived ? now : null, archivedBy: archived ? author : null});
    transaction.update(clientRef, {documents});
  });
}
