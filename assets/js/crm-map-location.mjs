// Shared by the map and the authenticated Firestore repair job.
const clean=value=>String(value??'').trim().replace(/\s+/g,' ');
const textKey=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bcedex\s*\d*\b/g,'').replace(/\bst\b/g,'saint').replace(/\bste\b/g,'sainte').replace(/[^a-z0-9]/g,'');
export function normalizeAddress(client={}) {
  let cp=clean(client.codePostal||client.code_postal||client.cp);
  let ville=clean(client.ville||client.city);
  if(/^\d{5}$/.test(ville)&&!/^\d{5}$/.test(cp))[cp,ville]=[ville,cp];
  if(/^\d{4}$/.test(cp))cp=cp.padStart(5,'0');
  return {adresse:clean(client.adresse||client.address),cp,ville};
}
export function addressKey(client) {
  const {adresse,cp,ville}=normalizeAddress(client);
  return [textKey(adresse),cp,textKey(ville)].join('|');
}
export function department(cp,ville='') {
  const postal=clean(cp);
  if(/^98\d{3}$/.test(postal)||textKey(ville)==='monaco')return '98';
  if(!/^\d{5}$/.test(postal))return '';
  if(postal.startsWith('20'))return Number(postal)<20200?'2A':'2B';
  return postal.startsWith('97')?postal.slice(0,3):postal.slice(0,2);
}
export function coordsFinite(client={}) {
  const rawLat=client.lat??client.latitude,rawLon=client.lon??client.lng??client.longitude;
  if(rawLat===null||rawLat===undefined||rawLat===''||rawLon===null||rawLon===undefined||rawLon==='')return null;
  const lat=Number(rawLat),lon=Number(rawLon);
  return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180?{lat,lon}:null;
}
// Loose outer guards only: an IGN result must additionally match the actual
// postcode and commune. These guards never substitute a department centroid.
const bounds={
 '04':[43.60,44.71,5.48,6.99],'05':[44.15,45.15,5.41,7.11],
 '06':[43.45,44.39,6.62,7.73],'11':[42.60,43.52,1.66,3.27],
 '13':[43.12,43.94,4.21,5.84],'30':[43.45,44.48,3.25,4.87],
 '34':[43.20,43.99,2.52,4.22],'48':[44.10,44.99,2.97,3.99],
 '66':[42.30,42.95,1.71,3.19],'83':[42.94,43.86,5.64,6.98],
 '84':[43.65,44.46,4.60,5.78],'2A':[41.32,42.41,8.48,9.43],
 '2B':[41.80,43.04,8.50,9.65],'98':[43.71,43.77,7.39,7.45]
};
function insideDepartment(coords,code) {
 const b=bounds[code];
 if(b)return coords.lat>=b[0]&&coords.lat<=b[1]&&coords.lon>=b[2]&&coords.lon<=b[3];
 return coords.lat>=41&&coords.lat<=51.2&&coords.lon>=-5.2&&coords.lon<=10;
}
export function geocodeCandidate(feature,client) {
  const a=normalizeAddress(client),p=feature?.properties||{},xy=feature?.geometry?.coordinates;
  if(!/^\d{5}$/.test(a.cp)||!textKey(a.ville)||!Array.isArray(xy))return null;
  const coords=coordsFinite({lat:xy[1],lon:xy[0]});
  if(!coords||String(p.postcode||'')!==a.cp||textKey(p.city)!==textKey(a.ville))return null;
  const precision=String(p.type||''),score=Number(p.score);
  if(!['housenumber','street','municipality'].includes(precision)||!Number.isFinite(score)||score<(precision==='municipality'?.6:.7))return null;
  const expected=department(a.cp,a.ville);
  const code=String(p.depcode||(/^2[AB]/.test(String(p.citycode||''))?String(p.citycode).slice(0,2):expected));
  if(code!==expected||!insideDepartment(coords,code))return null;
  return {...coords,department:code,precision,label:clean(p.label),source:'IGN'};
}
export function communeCandidate(commune,client) {
  const a=normalizeAddress(client),xy=commune?.centre?.coordinates;
  if(!/^\d{5}$/.test(a.cp)||!textKey(a.ville)||!Array.isArray(xy)||
    !Array.isArray(commune?.codesPostaux)||!commune.codesPostaux.map(String).includes(a.cp)||
    textKey(commune.nom)!==textKey(a.ville))return null;
  const coords=coordsFinite({lat:xy[1],lon:xy[0]}),expected=department(a.cp,a.ville);
  const code=String(commune.codeDepartement||'');
  if(!coords||!expected||code!==expected||!insideDepartment(coords,code))return null;
  return {...coords,department:code,precision:'municipality',label:clean(commune.nom),source:'geo.api.gouv.fr'};
}
export function validateStoredLocation(client) {
  const coords=coordsFinite(client),a=normalizeAddress(client),v=client.geoValidation;
  if(!coords||client.geoStatus==='needs_review'||v?.version!==2||v.addressKey!==addressKey(client)||!['IGN','geo.api.gouv.fr'].includes(v.source))return null;
  const proof=coordsFinite(v);
  if(!proof||coords.lat!==proof.lat||coords.lon!==proof.lon)return null;
  const expected=department(a.cp,a.ville);
  if(!expected||v.department!==expected||!['housenumber','street','municipality'].includes(v.precision)||!insideDepartment(coords,expected))return null;
  return coords;
}
export function isUnvisitedProspect(client={}) {
  return String(client.type||'').toLowerCase()==='prospect'&&(client.visiteStatus==='non_visite'||client.nonVisite===true)
    &&![client.codeClient,client.codeLRF,client.codeLrf,client.code_lrf,...(Array.isArray(client.codesLRF)?client.codesLRF:[])].some(value=>clean(value));
}
