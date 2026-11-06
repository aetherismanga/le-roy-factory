export function commercialDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  const fr = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  const date = fr ? new Date(Number(fr[3]) < 100 ? 2000 + Number(fr[3]) : Number(fr[3]), Number(fr[2]) - 1, Number(fr[1])) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function clientActivity(client = {}) {
  const seen = new Set(), entries = [];
  const add = (item, kind) => {
    const date = commercialDate(item.date || item.dateCreation || item.sentAt);
    if (!date) return;
    const key = `${kind}|${item.messageId || item.id || ''}|${date.getTime()}|${item.objet || item.text || item.texte || ''}`;
    if (seen.has(key)) return;
    seen.add(key); entries.push({ ...item, date, kind });
  };
  [...(client.comptes_rendus || []), ...(client.comptesRendus || [])].forEach(item => add(item, 'Compte-rendu'));
  (client.historiqueMails || []).forEach(item => add(item, 'Mail'));
  for (const value of [client.moovagoDernierSuivi, client.dernierEchange, client.lastContact]) {
    if (value) add({ date: value }, 'Contact');
  }
  return entries.sort((a, b) => b.date - a.date);
}
