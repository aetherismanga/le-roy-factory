import { active, clean } from './crm-client-integrity-core.mjs';

const PARTNER = 'elios-ceramica';
const LEGAL = new Set(['sa','sas','sasu','sarl','eurl','sci','sc','ets','etablissement','etablissements','societe','ste','cod','fatt']);
const GENERIC = new Set(['carrelage','carrelages','materiaux','ceramique','design','concept']);
const flatten = value => Array.isArray(value) ? value.flatMap(flatten) : [value];
const lrfCode = value => /^LRF-\d{5}$/i.test(clean(value)) ? clean(value).toUpperCase() : '';
const knownAmount = amount => typeof amount === 'number' && Number.isFinite(amount) ? amount : null;

export function eliosCode(value) {
  const code = clean(value).toUpperCase();
  return /^\d+$/.test(code) ? code.replace(/^0+(?=\d)/, '') : code;
}

function companyKey(value) {
  const words = clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' et ').split(/[^a-z0-9]+/)
    .filter(word => word && !LEGAL.has(word));
  return words.some(word => word.length >= 4 && !GENERIC.has(word)) ? words.join('') : '';
}

function company(client) {
  return client.societe || client.nomSociete || client.nom;
}

function factoryCodes(client) {
  return [client.codeElios, client.numeroClientElios, client.eliosCode,
    client.codesPartenaires?.[PARTNER], client.numerosPartenaires?.[PARTNER],
    client.codesPartenairesMulti?.[PARTNER]].flatMap(flatten).map(eliosCode).filter(Boolean);
}

function indexBy(rows, keys) {
  const index = new Map();
  for (const row of rows) {
    for (const key of keys(row)) {
      if (!key) continue;
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(row);
    }
  }
  return index;
}

function canonicalClient(clients, id) {
  const visited = new Set();
  let client = clients.get(id);
  while (client?.duplicateOf && !visited.has(client.id)) {
    visited.add(client.id);
    client = clients.get(clean(client.duplicateOf));
  }
  return active(client) ? client : null;
}

function manualOwners(mappings, clients, clientCodes) {
  const perCode = new Map();
  for (const mapping of mappings) {
    if (mapping?.partner !== PARTNER) continue;
    const code = eliosCode(mapping.factory);
    if (!code) continue;
    const recordedId = clean(mapping.clientId);
    const byId = canonicalClient(clients,recordedId);
    const linkCode = lrfCode(mapping.codeLRF);
    const byLrf = clientCodes.get(linkCode);
    if (!perCode.has(code)) perCode.set(code, { owners:new Set(), conflict:false });
    const entry = perCode.get(code);
    if (byId && (!linkCode || byLrf?.has(byId))) entry.owners.add(byId);
    else if (!recordedId && byLrf?.size === 1) entry.owners.add([...byLrf][0]);
    else entry.conflict = true;
  }
  return perCode;
}

function selectClient(row, indexes) {
  const { byFactory, manual, byName, salesNames } = indexes;
  const code = eliosCode(row.elios);
  const direct = byFactory.get(code) || new Set();
  const link = manual.get(code);
  if (link?.owners.size === 1 && !link.conflict) {
    const client = [...link.owners][0];
    return !direct.size || direct.has(client) ? {client, method:'mapping'} : {reason:'conflict'};
  }
  if (link) return {reason:'conflict'};
  if (direct.size === 1) return {client:[...direct][0], method:'code'};
  if (direct.size > 1) return {reason:'conflict'};
  const name = companyKey(row.name);
  const names = byName.get(name);
  if (names?.size === 1 && salesNames.get(name)?.size === 1) return {client:[...names][0], method:'name'};
  return {reason:names?.size ? 'ambiguous-name' : 'no-match'};
}

function sumKnown(values) {
  const known = values.filter(value => value !== null);
  if (!known.length) return null;
  return Number(known.reduce((total, amount) => total + amount, 0).toFixed(2));
}

export function reconcileEliosCrmSales(rows, clients, mappings = []) {
  const eligible = clients.filter(client => active(client) && client.id);
  const clientIds = new Map(clients.filter(client => client?.id).map(client => [client.id,client]));
  const clientCodes = indexBy(eligible, client => [client.codeClient, ...flatten(client.codesLRF)].map(lrfCode));
  const byFactory = indexBy(eligible, factoryCodes);
  for (const prior of clients.filter(client => client?.duplicateOf)) {
    const current = canonicalClient(clientIds,prior.id);
    if (!current) continue;
    for (const code of factoryCodes(prior)) {
      if (!byFactory.has(code)) byFactory.set(code,new Set());
      byFactory.get(code).add(current);
    }
  }
  const manual = manualOwners(mappings, clientIds, clientCodes);
  const byName = indexBy(eligible, client => [companyKey(company(client))]);
  const salesNames = indexBy(rows, row => [companyKey(row?.name)]);
  const salesCodes = new Map();
  for (const row of rows) {
    const code = eliosCode(row?.elios);
    salesCodes.set(code,(salesCodes.get(code) || 0) + 1);
  }
  const grouped = new Map();
  const unmatched = [];
  for (const row of rows) {
    const code = eliosCode(row?.elios);
    if (!code || salesCodes.get(code) !== 1) {
      unmatched.push({row,reason:code ? 'duplicate-source-code' : 'missing-source-code'});
      continue;
    }
    const match = selectClient(row, {byFactory, manual, byName, salesNames});
    if (!match.client) {
      unmatched.push({row,reason:match.reason});
      continue;
    }
    const id = match.client.id;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push({code:clean(row.elios),name:clean(row.name),method:match.method,ca2026:knownAmount(row.ca2026),ca2025:knownAmount(row.ca2025)});
  }
  const byClientId = new Map();
  for (const [id, accounts] of grouped) {
    byClientId.set(id, {
      accounts,ca2026:sumKnown(accounts.map(row => row.ca2026)),ca2025:sumKnown(accounts.map(row => row.ca2025)),
      complete:accounts.every(row => row.ca2026 !== null),previousComplete:accounts.every(row => row.ca2025 !== null)
    });
  }
  return {byClientId,unmatched};
}

export function salesDate(value) {
  const iso = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '';
}

export function salesPeriod(from, to) {
  const start = salesDate(from), end = salesDate(to);
  return start && end ? `${start} au ${end}` : end;
}

const currency = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2});
export const salesEuro = value => knownAmount(value) === null ? 'Non disponible' : currency.format(value);
