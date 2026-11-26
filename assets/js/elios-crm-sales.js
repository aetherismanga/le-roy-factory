import {auth, db, verifiedAgentProfile} from './firebase.js';
import {doc, getDocFromServer} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const TOTAL_FIELDS = ['ca', 'prev', 'budget', 'm2', 'm2Prev', 'pm', 'pmPrev'];
const ROW_FIELDS = ['ca2026', 'ca2025', 'm22026', 'm22025', 'pm2026', 'pm2025'];
let cachedUser = null;
let pending = null;

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function amounts(value, fields, required) {
  if (!value || typeof value !== 'object') return null;
  const result = {};
  for (const key of fields) {
    const amount = value[key];
    if (Number.isFinite(amount)) result[key] = amount;
    else if (amount == null && !required.includes(key)) result[key] = null;
    else return null;
  }
  return result;
}

export function checkedEliosCrmSales(data) {
  if (data?.schema !== 1 || data.dateFrom !== '2026-01-01' || !isDate(data.dateTo)
    || !isDate(data.previousDateTo) || data.dateTo <= '2026-08-31' || data.dateTo > '2026-12-31'
    || data.previousDateTo !== '2025' + data.dateTo.slice(4)
    || !Array.isArray(data.rows) || !data.rows.length || data.rows.length > 1000) return null;
  const totals = amounts(data.totals, TOTAL_FIELDS, ['ca', 'prev']);
  if (!totals) return null;
  const seen = new Set(), rows = [];
  for (const row of data.rows) {
    const elios = typeof row?.elios === 'string' ? row.elios.trim() : '';
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    const values = amounts(row, ROW_FIELDS, ['ca2026', 'ca2025']);
    if (!/^\d{1,16}$/.test(elios) || seen.has(elios) || !name || name.length > 300 || !values) return null;
    seen.add(elios);
    rows.push({elios, name, ...values});
  }
  return {schema: 1, dateFrom: data.dateFrom, dateTo: data.dateTo, previousDateTo: data.previousDateTo, totals, rows};
}

export async function loadEliosCrmSales() {
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    const profile = await verifiedAgentProfile(user);
    if (auth.currentUser !== user) return null;
    if (!profile) {
      cachedUser = pending = null;
      return null;
    }
    if (cachedUser !== user) {
      cachedUser = user;
      pending = null;
    }
    if (!pending) {
      const request = getDocFromServer(doc(db, 'parametres', 'statistiques-elios'))
        .then(snapshot => snapshot.exists() ? checkedEliosCrmSales(snapshot.data()) : null)
        .catch(() => null);
      pending = request;
      request.then(sales => {
        if (!sales && pending === request) pending = null;
      });
    }
    const sales = await pending;
    return auth.currentUser === user ? sales : null;
  } catch {
    return null;
  }
}
