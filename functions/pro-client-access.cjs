'use strict';

// Shared account eligibility for PRO sessions and private tariff readers.
// Manufacturer permissions remain the responsibility of each service.
const BLOCKED_CODES = new Set(['LRF-00001']);

function depFromCp(cp) {
  const value = String(cp || '').replace(/\s/g, '');
  if (!/^\d{5}$/.test(value)) return '';
  if (value.startsWith('97') || value.startsWith('98')) return value.slice(0, 3);
  if (value.startsWith('20')) return Number(value) >= 20200 ? '2B' : '2A';
  return value.slice(0, 2);
}

function eligibleProClient(data, expectedDepartment) {
  if (!data || data.proAccessDisabled === true) return null;
  const codeClient = String(data.codeClient || '').trim().toUpperCase();
  const departement = String(data.departement || depFromCp(data.codePostal || data.code_postal) || '').trim().toUpperCase();
  if (!/^LRF-\d{5}$/.test(codeClient) || BLOCKED_CODES.has(codeClient) || !departement) return null;
  if (departement !== String(expectedDepartment || '').trim().toUpperCase()) return null;
  return {...data, codeClient, departement};
}

async function findEligibleProClient(db, codeRaw, departmentRaw) {
  const code = String(codeRaw || '').trim().slice(0, 20).toUpperCase();
  const department = String(departmentRaw || '').trim().slice(0, 3).toUpperCase();
  if (!/^LRF-\d{5}$/.test(code) || BLOCKED_CODES.has(code) || !department) return null;
  const snapshot = await db.collection('clients').where('codeClient', '==', code).limit(1).get();
  if (snapshot.empty) return null;
  const document = snapshot.docs[0];
  return eligibleProClient({id: document.id, ...document.data(), codeClient: code}, department);
}

module.exports = {depFromCp, eligibleProClient, findEligibleProClient};
