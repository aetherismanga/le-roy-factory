'use strict';

const partner = 'elios-ceramica';
const mappingCollection = 'statistiques_lrf_mappings';
const companyFields = ['societe', 'nomSociete', 'raisonSociale', 'raison_sociale', 'enseigne',
  'nomCommercial', 'nom_commercial', 'entreprise', 'nom'];
const clientFields = [...companyFields, 'archived', 'archive', 'duplicateOf', 'codeClient', 'codesLRF',
  'codeElios', 'numeroClientElios', 'eliosCode', 'codesPartenaires', 'numerosPartenaires', 'codesPartenairesMulti'];

class VerificationError extends Error {}

const isText = (value, length) => typeof value === 'string' && value.trim().length > 0 && value.length <= length;
const isFactoryCode = value => typeof value === 'string' && /^\d{8}$/.test(value);
const isLrfCode = value => typeof value === 'string' && /^LRF-\d{5}$/.test(value);

function validateRequest(request) {
  if (request?.schema !== 1 || typeof request.snapshotSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(request.snapshotSha256)
    || !Array.isArray(request.links) || request.links.length < 1 || request.links.length > 50) {
    throw new VerificationError('Le manifeste de rapprochement Elios est invalide.');
  }
  const factories = new Set();
  const links = request.links.map(link => {
    if (!isFactoryCode(link?.factory) || factories.has(link.factory) || !isText(link.sourceName, 320)
      || !isText(link.clientId, 250) || link.clientId.trim() !== link.clientId || link.clientId.includes('/')
      || !isLrfCode(link.codeLRF) || !isText(link.company, 500)) {
      throw new VerificationError('Une ligne du manifeste de rapprochement Elios est invalide ou en double.');
    }
    factories.add(link.factory);
    const {factory, sourceName, clientId, codeLRF, company} = link;
    return {factory, sourceName, clientId, codeLRF, company};
  });
  return {snapshotSha256: request.snapshotSha256, links};
}

function verifiedRows(snapshot, request) {
  const data = snapshot.exists ? snapshot.data() : null;
  if (data?.snapshotSha256 !== request.snapshotSha256) {
    throw new VerificationError('Le relevé Elios enregistré diffère du relevé validé.');
  }
  const {schema, rows} = data;
  if (schema !== 1 || !Array.isArray(rows) || !rows.length || rows.length > 1000) {
    throw new VerificationError('Le relevé Elios enregistré est invalide.');
  }
  const namesByFactory = new Map();
  for (const row of rows) {
    if (!isFactoryCode(row?.elios) || !isText(row.name, 320) || namesByFactory.has(row.elios)) {
      throw new VerificationError('Le relevé Elios contient une ligne invalide ou en double.');
    }
    namesByFactory.set(row.elios, row.name);
  }
  if (request.links.some(link => namesByFactory.get(link.factory) !== link.sourceName)) {
    throw new VerificationError('Une désignation source ne correspond plus au relevé Elios validé.');
  }
  return rows;
}

function verifyCrmTargets(links, clients, active) {
  const eligible = new Map(clients.filter(active).map(client => [client.id, client]));
  const owners = new Map(links.map(({codeLRF}) => [codeLRF, new Set()]));
  for (const client of eligible.values()) {
    for (const code of [client.codeClient, client.codesLRF].flat(Infinity)) {
      if (typeof code === 'string') owners.get(code.trim().toUpperCase())?.add(client.id);
    }
  }
  for (const {clientId, codeLRF, company} of links) {
    const client = eligible.get(clientId);
    const currentName = client && companyFields.map(field => client[field]).find(name => isText(name, 500));
    if (currentName?.trim() !== company || owners.get(codeLRF).size !== 1 || !owners.get(codeLRF).has(clientId)) {
      throw new VerificationError('Une fiche CRM de destination a changé ou son code LRF est partagé.');
    }
  }
}

function mappingData(link, updatedAt) {
  return {partner, factory: link.factory, clientId: link.clientId, codeLRF: link.codeLRF, updatedAt};
}

function verifySupplierOwnership(rows, links, clients, existing, proposed, reconcile) {
  const direct = reconcile(rows, clients);
  const directConflicts = new Set(direct.unmatched.filter(item => item.reason === 'conflict').map(item => item.row.elios));
  const directOwners = new Map();
  for (const [id, {accounts}] of direct.byClientId) {
    for (const account of accounts) {
      if (account.method === 'code') directOwners.set(account.code, id);
    }
  }
  const projected = reconcile(rows, clients, [...existing, ...proposed]);
  for (const {factory, clientId} of links) {
    const owner = directOwners.get(factory);
    const resolved = projected.byClientId.get(clientId)?.accounts.some(account => account.code === factory && account.method === 'mapping');
    if (directConflicts.has(factory) || (owner && owner !== clientId) || !resolved) {
      throw new VerificationError('Un compte Elios possède déjà une attribution incompatible.');
    }
  }
}

async function applyVerifiedEliosLinks(db, manifest) {
  try {
    const request = validateRequest(manifest);
    const {active} = await import('../../assets/js/crm-client-integrity-core.mjs');
    const {reconcileEliosCrmSales} = await import('../../assets/js/elios-crm-reconciliation.mjs');
    const salesRef = db.doc('parametres/statistiques-elios');
    const clientsQuery = db.collection('clients').select(...clientFields);
    const mappingsQuery = db.collection(mappingCollection).where('partner', '==', partner);
    const refs = request.links.map(({factory}) => db.doc(`${mappingCollection}/${partner}__${factory}`));
    const updatedAt = new Date().toISOString();
    return await db.runTransaction(async transaction => {
      const rows = verifiedRows(await transaction.get(salesRef), request);
      const [clientsSnapshot, mappingsSnapshot, standardDocuments] = await Promise.all([
        transaction.get(clientsQuery), transaction.get(mappingsQuery), transaction.getAll(...refs),
      ]);
      const clients = clientsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
      const existing = mappingsSnapshot.docs.map(doc => doc.data());
      const standardByPath = new Map(standardDocuments.map(doc => [doc.ref.path, doc]));
      verifyCrmTargets(request.links, clients, active);

      const additions = [];
      for (const [index, link] of request.links.entries()) {
        const expected = mappingData(link, updatedAt);
        const ref = refs[index];
        const stored = standardByPath.get(ref.path);
        if (!stored.exists) {
          additions.push({ref, data: expected});
          continue;
        }
        const current = stored.data();
        if (current?.partner !== partner || current.factory !== expected.factory
          || current.clientId !== expected.clientId || current.codeLRF !== expected.codeLRF) {
          throw new VerificationError('Un document de rapprochement Elios existe déjà avec une attribution incompatible.');
        }
      }
      verifySupplierOwnership(rows, request.links, clients, existing, additions.map(({data}) => data), reconcileEliosCrmSales);
      for (const {ref, data} of additions) transaction.create(ref, data);
      return {requested: request.links.length, created: additions.length, alreadyLinked: request.links.length - additions.length};
    });
  } catch (error) {
    if (error instanceof VerificationError) throw error;
    throw new Error('L’enregistrement groupé des rapprochements Elios a échoué.');
  }
}

module.exports = {applyVerifiedEliosLinks};
