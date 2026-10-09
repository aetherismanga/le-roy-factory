/* Pure commercial calculations. Monetary values are integer euro cents. */
export const QUALITIES = ['1er choix','2e choix','MS','Autres déclassés','Non renseigné'];
export const UNITS = ['m²','pièces','ml'];
export const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function cents(value) {
  if (typeof value === 'number') value = String(value);
  let s = String(value ?? '').trim().replace(/[\s\u00a0€]/g,'');
  if (!s) return null;
  if (s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(s)) throw Error(`Montant invalide : ${value}`);
  const negative=s.startsWith('-'); const [a,b='']=s.replace('-','').split('.');
  const n=Number(a)*100+Number(b.padEnd(2,'0'));
  if (!Number.isSafeInteger(n) || n>1e12) throw Error('Montant hors limites');
  return negative?-n:n;
}
export const money = n => n == null ? 'Données non disponibles' : (n/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
export function change(now,before) {
  if(now==null || before==null) return {delta:null,percent:null,label:'Comparaison indisponible'};
  const delta=now-before;
  if(before===0) return {delta,percent:null,label:now>0?'Nouveau':now===0?'Stable':'Non calculable'};
  if(before<0) return {delta,percent:null,label:'Base négative — non comparable'};
  const percent=delta/before*100;
  return {delta,percent,label:`${percent>0?'+':''}${percent.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} %`};
}
export function validDate(s) { const d=new Date(s+'T12:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===s; }
export const rowKey = r => JSON.stringify([r.partner,r.kind,r.supplierCode,r.start,r.end,r.productCode||'',r.quality,r.unit||'',r.tax]);
export function validateBatch(batch) {
  if(!batch || !Array.isArray(batch.rows) || !batch.rows.length) throw Error('Aucune ligne à importer');
  if(batch.rows.length>1500) throw Error('Maximum 1 500 lignes par import ; scindez le fichier.');
  const seen=new Set(), intervals=new Map();
  const rows=batch.rows.map((r,i)=>{
    const fail=m=>{throw Error(`Ligne ${i+1} : ${m}`)};
    if(!['summary','detail'].includes(r.kind)) fail('type synthèse/détail requis');
    for(const key of ['partner','supplierCode','name','start','end']) if(typeof r[key]!=='string'||!r[key].trim())fail(`${key} manquant`);
    if(!validDate(r.start)||!validDate(r.end)||r.start>r.end)fail('période incorrecte');
    if(!Number.isSafeInteger(r.amount)||Math.abs(r.amount)>1e12)fail('montant en centimes requis');
    if(!['HT','TTC','Non précisé'].includes(r.tax))fail('base HT/TTC requise');
    if(!QUALITIES.includes(r.quality))fail('qualité non reconnue');
    if(r.kind==='detail'&&!r.productCode)fail('référence manquante');
    if(r.quantity!=null && (!Number.isFinite(r.quantity)||!UNITS.includes(r.unit)))fail('quantité/unité incorrecte');
    const key=rowKey(r); if(seen.has(key))fail('doublon de client/référence/période ; agrégez explicitement les lignes'); seen.add(key);
    const intervalKey=JSON.stringify([r.partner,r.kind,r.supplierCode,r.productCode||'',r.tax,r.quality,r.unit||'']);
    const prior=intervals.get(intervalKey)||[];if(prior.some(p=>p[0]<=r.end&&r.start<=p[1]))fail('périodes qui se chevauchent pour la même référence ou synthèse');prior.push([r.start,r.end]);intervals.set(intervalKey,prior);
    for(const v of Object.values(r))if(typeof v==='string'&&v.length>2000)fail('texte trop long');
    const out={}; for(const k of ['partner','kind','supplierCode','name','start','end','amount','tax','quality','productCode','description','series','format','family','quantity','unit','source','note']) if(r[k]!==undefined)out[k]=r[k];
    return out;
  });
  if(new TextEncoder().encode(JSON.stringify(rows)).length>750000)throw Error('Import trop volumineux ; scindez le fichier.');
  return rows;
}
export async function digest(value) {
  const b=await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value);
  return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
}
export const canonical = rows => JSON.stringify(rows.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['source','note'].includes(k)).sort())).sort((a,b)=>rowKey(a).localeCompare(rowKey(b))));
export function coverage(rows) {
  const groups=new Map();
  for(const r of rows){const key=JSON.stringify([r.partner,r.kind,r.supplierCode,r.productCode||'',r.tax,r.quality,r.unit||'']);if(!groups.has(key))groups.set(key,[]);groups.get(key).push([r.start,r.end]);}
  return [...groups].map(([key,ranges])=>({key,ranges}));
}
export function overlaps(a,b) {return a.some(x=>b.some(y=>x.key===y.key&&x.ranges.some(u=>y.ranges.some(v=>u[0]<=v[1]&&v[0]<=u[1]))));}
export function conflictIds(index,batch) {const c=coverage(batch.rows);return(index.active||[]).filter(id=>overlaps(index.imports[id].coverage,c));}
export function clientGroups(clients) {
  const map=new Map();
  for(const c of clients){const code=String(c.codeClient||'').trim().toUpperCase();const key=/^LRF-\d{5}$/.test(code)?code:`crm:${c.id}`;
    if(!map.has(key))map.set(key,{key,code:code||'',id:c.id,ids:[],name:c.societe||c.nom||'Client sans nom',city:c.ville||'',department:c.departement||'',records:[]});
    const g=map.get(key);g.ids.push(c.id);g.records.push(c);
  }return [...map.values()];
}
export function candidates(row,groups) {const n=norm(row.name);return groups.filter(g=>g.records.some(c=>[c.societe,c.nom,c.raisonSociale,c.nomCommercial,c.codeClient].some(v=>norm(v)===n || (v && String(v)===row.supplierCode)))).map(g=>g.key);}
export const mappingKey = r=>`${r.partner}::${r.supplierCode}`;
export function attachClients(rows,mappings,groups) {
  const valid=new Set(groups.map(g=>g.key));return rows.map(r=>({...r,clientKey:valid.has(mappings[mappingKey(r)]?.clientKey)?mappings[mappingKey(r)].clientKey:null}));
}
export function rangeFor(f,year=Number(f.year)) {
  if(f.period==='custom') { const shift=Number(f.year)-year; return [String(Number(f.start.slice(0,4))-shift)+f.start.slice(4),String(Number(f.end.slice(0,4))-shift)+f.end.slice(4)]; }
  let first=1,last=12;
  if(f.period==='month') first=last=Number(f.month);
  if(f.period==='quarter'){first=(Number(f.quarter)-1)*3+1;last=first+2;}
  return [`${year}-${String(first).padStart(2,'0')}-01`,`${year}-${String(last).padStart(2,'0')}-${new Date(Date.UTC(year,last,0)).getUTCDate()}`];
}
export function filterRows(rows,f,year=Number(f.year)) {
  const [start,end]=rangeFor(f,year);
  return rows.filter(r=>r.start>=start&&r.end<=end&&(!f.partner||r.partner===f.partner)&&(!f.client||r.clientKey===f.client)&&(!f.quality||r.quality===f.quality)&&(!f.tax||r.tax===f.tax));
}
export function measure(rows,f,clientKey,year=Number(f.year)) {
  const all=filterRows(rows,{...f,client:clientKey||f.client},year), groups=new Map();
  for(const r of all){const key=JSON.stringify([r.partner,r.supplierCode,r.tax]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  const chosen=[];let partial=false;
  for(const rs of groups.values()){
    const summary=f.quality?[]:rs.filter(r=>r.kind==='summary');
    const use=summary.length?summary:rs.filter(r=>r.kind==='detail');
    if(!summary.length && use.length)partial=true;
    chosen.push(...use);
  }
  const taxes=new Set(chosen.map(r=>r.tax));
  if(taxes.size>1)return {amount:null,partial:true,mixedTax:true,partners:[],coverage:[],rows:chosen};
  return {amount:chosen.length?chosen.reduce((a,r)=>a+r.amount,0):null,partial,mixedTax:false,tax:[...taxes][0],partners:[...new Set(chosen.map(r=>r.partner))],coverage:[...new Set(chosen.map(r=>`${r.start} → ${r.end}`))],rows:chosen};
}
export function comparable(now,before) {
  if(now.partial||before.partial||now.mixedTax||before.mixedTax||now.tax!==before.tax) return false;
  // Compare supplier and exact month/day coverage, including supplier accounts and quality.
  const shape=m=>[...new Set(m.rows.map(r=>JSON.stringify([r.partner,r.start.slice(4),r.end.slice(4),r.tax])))].sort().join('|');
  return now.amount!=null && before.amount!=null && shape(now)===shape(before);
}
export function productGroups(rows,f) {
  const map=new Map();for(const r of filterRows(rows,f).filter(r=>r.kind==='detail')){
    const key=JSON.stringify([r.partner,r.productCode,r.quality,r.unit||'',r.tax]);
    if(!map.has(key))map.set(key,{...r,key,amount:0,quantity:null,rows:[]});const p=map.get(key);p.amount+=r.amount;p.rows.push(r);
  }
  for(const p of map.values())p.quantity=p.rows.every(r=>r.quantity!=null)?p.rows.reduce((n,r)=>n+r.quantity,0):null;
  return [...map.values()];
}
