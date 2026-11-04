// Pure save rules: edit only changed fields, reject stale edits, retain new history.
export function fingerprint(value) {
  if (Array.isArray(value)) return '[' + value.map(fingerprint).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+fingerprint(value[k])).join(',') + '}';
  return JSON.stringify(value ?? null);
}
export const sameValue = (a,b) => fingerprint(a) === fingerprint(b);
export function changedFields(baseline, draft) {
  return Object.fromEntries(Object.entries(draft).filter(([key,value]) => !sameValue(baseline[key],value)));
}
export function assertUnchanged(current, baseline, patch) {
  const conflicts = Object.keys(patch).filter(key => !sameValue(current[key],baseline[key]) && !sameValue(current[key],patch[key]));
  if (conflicts.length) throw new Error('Cette fiche a été modifiée ailleurs. Fermez puis rouvrez la fiche avant de réessayer. Votre saisie est conservée.');
}
export function reconcileList(current=[], baseline=[], draft=[]) {
  const base = new Set(baseline.map(fingerprint));
  const wanted = new Set(draft.map(fingerprint));
  const removed = new Set([...base].filter(key => !wanted.has(key)));
  const result = current.filter(value => !removed.has(fingerprint(value)));
  const present = new Set(result.map(fingerprint));
  for (const value of draft) {
    const key=fingerprint(value);
    // A concurrent deletion/edit of an old item must not be undone by a stale form.
    if (!base.has(key) && !present.has(key)) { result.push(value); present.add(key); }
  }
  return result;
}
export function safeDocumentUrl(value) {
  try { const url = new URL(String(value || '')); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function localDate(date=new Date()) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
export const searchKey = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function matchesClientSearch(client, query) {
  const key=searchKey(query); if(!key)return true;
  const values=[client.societe,client.ville,client.codePostal,client.code_postal,client.contact,client.email,client.telephone,client.codeClient,client.codeLRF,
    ...(Array.isArray(client.telephones)?client.telephones:[]),...(Array.isArray(client.emails)?client.emails:[]),...(Array.isArray(client.codesLRF)?client.codesLRF:[])];
  for(const contact of (Array.isArray(client.contacts)?client.contacts:[])) if(contact&&typeof contact==='object') values.push(contact.nom,contact.prenom,[contact.prenom,contact.nom].filter(Boolean).join(' '),contact.email,contact.mobile,contact.fixe,contact.telephone);
  return values.some(value=>searchKey(typeof value==='object'?value?.email:value).includes(key));
}
