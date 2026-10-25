// Fonctions partagées de la carte CRM, sans accès réseau ni écriture de données.
const text = value => String(value ?? '').trim();
export const escapeMapHtml = value => text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function mapCoordinate(value, max) {
  if (value === null || value === undefined || text(value) === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : null;
}
export function mapDepartment(postal, city = '', explicit = '') {
  const cp = text(postal);
  const dept = text(explicit).toUpperCase();
  if (/^(?:2[AB]|0[1-9]|[1-8][0-9]|9[0-5]|97[1-6]|98)$/.test(dept)) return dept;
  if (/^20\d{3}$/.test(cp)) return Number(cp) < 20200 ? '2A' : '2B';
  if (/^97\d{3}$/.test(cp)) return cp.slice(0, 3);
  if (/^\d{5}$/.test(cp)) return cp.slice(0, 2);
  return /monaco/i.test(text(city)) ? '98' : '';
}
// Normalize only the associations actually present in a client record. Never modify them.
export const mapPartnerKey = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function mapClientPartners(data = {}) {
  const values = ['partenaires','fabricants','partners','manufacturers','partenaire','fabricant'].flatMap(key => Array.isArray(data[key]) ? data[key] : data[key] ? [data[key]] : []);
  const result = [];
  for (const value of values) {
    const object = value && typeof value === 'object' ? value : null;
    const named = object ? ['nom','name','label','libelle','raisonSociale'].map(key => object[key]).find(v => typeof v === 'string' && text(v)) : '';
    const identifiers = object ? ['id','slug','code','partnerId','partenaireId','manufacturerId','fabricantId'].map(key => object[key]).filter(v => typeof v === 'string' && text(v)) : [];
    const label = text(named || identifiers[0] || (typeof value === 'string' ? value : ''));
    const aliases = [...new Set([label,...identifiers].map(mapPartnerKey).filter(Boolean))];
    if (!aliases.length) continue;
    const humanLabel = label.replace(/[-_]+/g, ' ');
    result.push({label:humanLabel.charAt(0).toUpperCase()+humanLabel.slice(1),aliases,named:!!named || !/[-_]/.test(label)});
  }
  return result;
}
export function mapPartnerOptions(items = []) {
  const parent = new Map(), records = items.flatMap(item => item.partners || []);
  const find = key => { if (!parent.has(key)) parent.set(key,key); const p = parent.get(key); if (p !== key) parent.set(key,find(p)); return parent.get(key); };
  for (const record of records) { const first = record.aliases[0]; for (const alias of record.aliases) { const root=find(alias), target=find(first); if(root!==target)parent.set(root,target); } }
  const groups = new Map();
  for (const alias of parent.keys()) { const key=find(alias); if(!groups.has(key))groups.set(key,{aliases:[],labels:[]});groups.get(key).aliases.push(alias); }
  for (const record of records) groups.get(find(record.aliases[0]))?.labels.push(record);
  return [...groups.values()].map(group => {
    group.aliases.sort();group.labels.sort((a,b)=>Number(b.named)-Number(a.named)||a.label.localeCompare(b.label,'fr'));
    return {key:group.aliases[0],label:group.labels[0].label,aliases:group.aliases};
  }).sort((a,b)=>a.label.localeCompare(b.label,'fr'));
}
export function matchesMapPartner(item, selected = '', options = []) {
  const key = mapPartnerKey(selected);if(!key)return true;
  const aliases = options.find(option => option.key === key || option.aliases.includes(key))?.aliases || [key];
  return (item.partners || []).some(partner => partner.aliases.some(alias => aliases.includes(alias)));
}
export function mapClient(id, data = {}) {
  if (data.archived === true || data.archive === true) return null;
  let cp = text(data.codePostal || data.code_postal), ville = text(data.ville);
  if (/^\d{5}$/.test(ville) && !/^\d{5}$/.test(cp)) [cp, ville] = [ville, cp];
  if (/^\d{4}$/.test(cp)) cp = cp.padStart(5, '0');
  const latitude = data.lat ?? data.latitude;
  const longitude = data.lon ?? data.lng ?? data.longitude;
  return {id: text(id), partners: mapClientPartners(data), societe: text(data.societe) || 'Entreprise sans nom', adresse: text(data.adresse), cp, ville,
    type: text(data.type).toLowerCase() === 'prospect' ? 'prospect' : 'client', telephone: text(data.telephone),
    lat: mapCoordinate(latitude, 90), lon: mapCoordinate(longitude, 180), dept: mapDepartment(cp, ville, data.departement)};
}
export const mapClientKey = item => JSON.stringify(item);
export function matchesMapFilter(item, filter, department = '') {
  if (filter === 'jerome') return ['30', '34', '11', '66'].includes(item.dept);
  if (filter === 'coryne') return ['13', '83', '84', '04', '06', '05', '2A', '2B', '98'].includes(item.dept);
  return filter !== 'dept' || !department || item.dept === department;
}
export function mapPopup(item) {
  const esc = escapeMapHtml;
  const phone = item.telephone.replace(/[^+\d]/g, '');
  const id = encodeURIComponent(item.id);
  return `<div style="font-family:Inter,sans-serif;padding:2px;min-width:200px">
    <span class="popup-badge ${item.type === 'prospect' ? 'badge-prospect' : 'badge-client'}">${item.type === 'prospect' ? 'Prospect' : 'Client'} · ${esc(item.dept || 'Département inconnu')}</span>
    <div class="popup-title">${esc(item.societe)}</div>
    <div class="popup-address">📍 ${item.adresse ? esc(item.adresse) + '<br>' : ''}${esc(item.cp)} ${esc(item.ville)}${phone ? `<br>📞 <a href="tel:${esc(phone)}">${esc(item.telephone)}</a>` : ''}</div>
    <div class="popup-actions">
      <a href="clients.html?edit=${id}" class="popup-btn btn-fiche">✏️ Fiche client</a>
      <button type="button" class="popup-btn btn-fiche lrf-add-tour-map" data-client-id="${id}">➕ Tournée</button>
      <a href="https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}" target="_blank" rel="noopener" class="popup-btn btn-gps">🧭 Google Maps</a>
      <a href="https://waze.com/ul?ll=${item.lat},${item.lon}&navigate=yes" target="_blank" rel="noopener" class="popup-btn btn-waze">🚗 Waze</a>
    </div></div>`;
}

