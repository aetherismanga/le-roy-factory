'use strict';
const BASE='https://us-central1-le-roy-factory.cloudfunctions.net';
async function getResult(collection,ref,timeout=75000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(`${BASE}/eliosStock?collection=${encodeURIComponent(collection)}&ref=${encodeURIComponent(ref)}`,{signal:controller.signal});
    const text=await response.text();
    let data; try{data=JSON.parse(text)}catch{data={raw:text}}
    return {ok:response.ok,data,status:response.status};
  }finally{clearTimeout(timer)}
}
function assertStock(collection,ref,result){
  const product=result.data?.product||{};
  if(!result.ok||!result.data?.success||String(product.ref||'').toUpperCase()!==ref||product.stock==null)throw new Error(`Stock ${collection}/${ref} invalide HTTP=${result.status}: ${JSON.stringify(result.data)}`);
  console.log(`STOCK OK ${collection} ${ref} stock=${product.stock} ${product.stockUnit||''} production=${product.production} ${product.productionUnit||''}`);
}
(async()=>{
  let horizon=await getResult('horizon','0916A00');
  if(!horizon.ok){
    console.log(`HORIZON RETRY 0916A00 after HTTP ${horizon.status}`);
    await new Promise(r=>setTimeout(r,5000));
    horizon=await getResult('horizon','0916A00');
  }
  if(!horizon.ok){
    console.log(`HORIZON FALLBACK 0916000 after HTTP ${horizon.status}`);
    await new Promise(r=>setTimeout(r,5000));
    horizon=await getResult('horizon','0916000');
    assertStock('horizon','0916000',horizon);
  }else assertStock('horizon','0916A00',horizon);
  await new Promise(r=>setTimeout(r,3000));
  const mare=await getResult('marechiaro','03R4000');
  assertStock('marechiaro','03R4000',mare);
  await new Promise(r=>setTimeout(r,3000));
  const montreal=await getResult('montreal','00X6A00');
  assertStock('montreal','00X6A00',montreal);
})().catch(error=>{console.error(error);process.exit(1)});
