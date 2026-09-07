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
function stockOk(ref,result){const p=result.data?.product||{};return result.ok&&result.data?.success&&String(p.ref||'').toUpperCase()===ref&&p.stock!=null}
function logStock(collection,ref,result){const p=result.data.product;console.log(`STOCK OK ${collection} ${ref} stock=${p.stock} ${p.stockUnit||''} production=${p.production} ${p.productionUnit||''}`)}
async function probe(collection,refs){
  for(const ref of refs){
    const result=await getResult(collection,ref);
    if(stockOk(ref,result)){logStock(collection,ref,result);return true;}
    console.log(`${collection.toUpperCase()} REF FAIL ${ref} HTTP=${result.status}`);
    await new Promise(r=>setTimeout(r,5000));
  }
  return false;
}
(async()=>{
  const horizonOk=await probe('horizon',['0913602','091BA00','091BX00']);
  await new Promise(r=>setTimeout(r,5000));
  const montrealOk=await probe('montreal',['00X6A00','00X6000','00X1X00','00X6A80','00X6080','00XH180']);
  if(!horizonOk||!montrealOk)process.exit(2);
})().catch(error=>{console.error(error);process.exit(1)});
