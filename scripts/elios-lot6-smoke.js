'use strict';

const BASE='https://us-central1-le-roy-factory.cloudfunctions.net';
const tests=[
  ['dust','03E5080'],
  ['segmento','04I1500'],
  ['tropical','0992000'],
  ['twist','00T2030'],
  ['venere','04H3X05']
];

async function json(url){
  const r=await fetch(url,{headers:{'accept':'application/json'}});
  const text=await r.text();
  let data;
  try{data=JSON.parse(text)}catch{throw new Error(`${r.status} réponse non JSON: ${text.slice(0,240)}`)}
  if(!r.ok||data?.success===false) throw new Error(`${r.status} ${data?.error||data?.message||text.slice(0,240)}`);
  return data;
}

(async()=>{
  for(const [slug,ref] of tests){
    const c=await json(`${BASE}/eliosCatalog?collection=${encodeURIComponent(slug)}`);
    if(!c?.collection?.rows?.length) throw new Error(`Catalogue vide ${slug}`);
    if(!c.collection.rows.some(r=>String(r.ref||'').toUpperCase()===ref)) throw new Error(`Référence ${ref} absente du catalogue ${slug}`);
    console.log(`CATALOGUE OK ${slug} rows=${c.collection.rows.length}`);
  }
  for(const [slug,ref] of tests){
    const s=await json(`${BASE}/eliosStock?collection=${encodeURIComponent(slug)}&ref=${encodeURIComponent(ref)}`);
    const p=s.product||s.stock||s;
    const stock=p.stock ?? s.stock;
    const production=p.production ?? s.production;
    const unit=p.unit || s.unit || '';
    if(stock===undefined||stock===null) throw new Error(`Stock non retourné ${slug}/${ref}: ${JSON.stringify(s).slice(0,500)}`);
    console.log(`STOCK OK ${slug} ${ref} stock=${stock} ${unit} production=${production ?? 'n/a'} ${unit}`);
  }
})().catch(err=>{console.error(err);process.exit(1)});
