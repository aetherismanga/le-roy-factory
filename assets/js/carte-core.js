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
export function mapClient(id, data = {}) {
  if (data.archived === true || data.archive === true) return null;
  let cp = text(data.codePostal || data.code_postal), ville = text(data.ville);
  if (/^\d{5}$/.test(ville) && !/^\d{5}$/.test(cp)) [cp, ville] = [ville, cp];
  if (/^\d{4}$/.test(cp)) cp = cp.padStart(5, '0');
  const latitude = data.lat ?? data.latitude;
  const longitude = data.lon ?? data.lng ?? data.longitude;
  return {id: text(id), societe: text(data.societe) || 'Entreprise sans nom', adresse: text(data.adresse), cp, ville,
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
