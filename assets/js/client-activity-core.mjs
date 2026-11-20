export function commercialDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') value = value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  const fr = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  const date = fr ? new Date(Number(fr[3]) < 100 ? 2000 + Number(fr[3]) : Number(fr[3]), Number(fr[2]) - 1, Number(fr[1])) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function clientActivity(client = {}) {
  const seen = new Set(), entries = [];
  const add = (item, kind) => {
    const date = item && commercialDate(item.date || item.dateCreation || item.sentAt);
    if (!date) return;
    const key = `${kind}|${item.messageId || item.id || ''}|${date.getTime()}|${item.objet || item.text || item.texte || ''}`;
    if (seen.has(key)) return;
    seen.add(key); entries.push({ ...item, date, kind });
  };
  for (const reports of [client.comptes_rendus, client.comptesRendus]) {
    if (Array.isArray(reports)) reports.forEach(item => add(item, 'Compte-rendu'));
  }
  if (Array.isArray(client.historiqueMails)) client.historiqueMails.forEach(item => add(item, 'Mail'));
  for (const value of [client.moovagoDernierSuivi, client.dernierEchange, client.lastContact]) {
    if (value) add({ date: value }, 'Contact');
  }
  return entries.sort((a, b) => b.date - a.date);
}

export function portfolioType(client) {
  return String(client.type || '').trim().toLowerCase() === 'prospect' ? 'prospect' : 'client';
}

export function clientFollowup(client, now = Date.now()) {
  const date = clientActivity(client)[0]?.date;
  if (!date) return { date: null, key: 'never', label: 'Jamais contacté', cls: 'never' };

  const days = Math.max(0, Math.floor((now - date.getTime()) / 86400000));
  if (days <= 30) return { date, key: 'recent', label: `Récent · ${days} j`, cls: 'fresh' };
  if (days <= 60) return { date, key: 'suivre', label: `À suivre · ${days} j`, cls: 'watch' };
  if (days <= 90) return { date, key: 'relancer', label: `À relancer · ${days} j`, cls: 'late' };
  return { date, key: 'urgent', label: `Urgent · ${days} j`, cls: 'urgent' };
}

export function matchesFollowup(key, filter) {
  if (filter === 'over60') return key === 'relancer' || key === 'urgent';
  return !filter || key === filter;
}
