export const clean = value => String(value ?? '').trim();
export const norm = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b(sarl|sasu?|eurl|ets)\b/g,'').replace(/[^a-z0-9]/g, '');
export function phone(value) {
  return clean(value).replace(/\D/g,'').replace(/^(?:0033|33)(?=\d{9}$)/,'0');
}
export function businessPhones(row) {
  return [...new Set([row.telephone,row.mobile,row.fixe,...(Array.isArray(row.telephones)?row.telephones:[]),...(Array.isArray(row.contacts)?row.contacts:[]).flatMap(c=>[c?.telephone,c?.mobile,c?.fixe])].map(phone).filter(v=>v.length>=9))];
}
export function active(row) { return row.archived!==true && row.archive!==true && (!row.duplicateOf||row.duplicateOf===row.id) && (!row.canonicalClientId||row.canonicalClientId===row.id); }
export function matchingBusinesses(candidate, rows) {
  const postal=v=>/^\d{4}$/.test(clean(v))?clean(v).padStart(5,'0'):clean(v);
  const townKey=v=>norm(clean(v).replace(/\bcedex\s*\d*\b/ig,'').replace(/\bst\b/ig,'saint').replace(/\bste\b/ig,'sainte'));
  const cp=postal(candidate.codePostal||candidate.code_postal), town=townKey(candidate.ville);
  const name=norm(candidate.societe), address=norm(candidate.adresse), numbers=businessPhones(candidate);
  return rows.filter(active).filter(row=>{
    const otherCp=postal(row.codePostal||row.code_postal), otherTown=townKey(row.ville);
    const locationConflict=(cp&&otherCp&&cp!==otherCp) || (town&&otherTown&&town!==otherTown);
    // A central switchboard is not evidence that two branches are one store.
    if(locationConflict)return false;
    if(businessPhones(row).some(p=>numbers.includes(p)))return true;
    const otherName=norm(row.societe);
    const sameName=name===otherName || (name.length>=8 && otherName.length>=8 && (name.includes(otherName)||otherName.includes(name)));
    const sameTown=(cp&&cp===otherCp)||(town&&town===otherTown);
    if(sameName&&sameTown)return true;
    // Different trading names at the same store are held for review, not imported twice.
    return address.length>=8&&address===norm(row.adresse)&&sameTown;
  });
}
export function unvisitedPayload(candidate, now) {
  const {verifiedLocation,geocodePending,geocodeError,...publicFields}=candidate;
  return {...publicFields,type:'prospect',visiteStatus:'non_visite',nonVisite:true,
    autoAssignLrfCode:false,codeClient:'',codeLRF:'',codeLrf:'',code_lrf:'',codesLRF:[],
    prospectionSource:'recherche-publique-2026-11-05',createdAt:now,createdBy:'crm-map-repair-20261105',
    comptes_rendus:[],documents:[]};
}
