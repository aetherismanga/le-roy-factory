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
(async()=>{
  const horizonRefs=['0916A00','0916000','0913600','R911X00','0916A70','0916070'];
  let horizonOk=false;
  for(const ref of horizonRefs){
    const result=await getResult('horizon',ref);
    if(stockOk(ref,result)){logStock('horizon',ref,result);horizonOk=true;break;}
    console.log(`HORIZON REF FAIL ${ref} HTTP=${result.status}`);
    await new Promise(r=>setTimeout(r,5000));
  }
  await new Promise(r=>setTimeout(r,5000));
  const mare=await getResult('marechiaro','03R4000');
  if(stockOk('03R4000',mare))logStock('marechiaro','03R4000',mare);else console.log(`MARECHIARO FAIL HTTP=${mare.status} ${JSON.stringify(mare.data)}`);
  await new Promise(r=>setTimeout(r,5000));
  const montreal=await getResult('montreal','00X6A00');
  if(stockOk('00X6A00',montreal))logStock('montreal','00X6A00',montreal);else console.log(`MONTREAL FAIL HTTP=${montreal.status} ${JSON.stringify(montreal.data)}`);
  if(!horizonOk||!stockOk('03R4000',mare)||!stockOk('00X6A00',montreal))process.exit(2);
})().catch(error=>{console.error(error);process.exit(1)});
