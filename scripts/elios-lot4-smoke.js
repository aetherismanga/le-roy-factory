'use strict';
const BASE='https://us-central1-le-roy-factory.cloudfunctions.net';
const tests=[
  ['glow','04D4570'],
  ['golden-hour','04G4312'],
  ['hexagon','00ZES50'],
  ['horizon','0916A00'],
  ['marechiaro','03R4000'],
  ['montreal','00X6A00']
];
async function getJson(url,timeout=75000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{signal:controller.signal});
    const text=await response.text();
    let data; try{data=JSON.parse(text)}catch{throw new Error(`HTTP ${response.status}: ${text.slice(0,300)}`)}
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    return data;
  }finally{clearTimeout(timer)}
}
(async()=>{
  for(const [collection] of tests){
    const data=await getJson(`${BASE}/eliosCatalog?collection=${encodeURIComponent(collection)}`,30000);
    if(!data.success||!data.collection||!Array.isArray(data.collection.rows)||!data.collection.rows.length)throw new Error(`Catalogue ${collection} invalide`);
    console.log(`CATALOGUE OK ${collection} rows=${data.collection.rows.length}`);
  }
  for(const [collection,ref] of tests){
    const data=await getJson(`${BASE}/eliosStock?collection=${encodeURIComponent(collection)}&ref=${encodeURIComponent(ref)}`);
    const product=data.product||{};
    if(!data.success||String(product.ref||'').toUpperCase()!==ref||product.stock==null)throw new Error(`Stock ${collection}/${ref} invalide: ${JSON.stringify(data)}`);
    console.log(`STOCK OK ${collection} ${ref} stock=${product.stock} ${product.stockUnit||''} production=${product.production} ${product.productionUnit||''}`);
    await new Promise(r=>setTimeout(r,2000));
  }
})().catch(error=>{console.error(error);process.exit(1)});
