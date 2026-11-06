// Verified prices live only in memory and are discarded on identity change.
export function createOpalPriceState({request, now = Date.now, changed = () => {}}) {
  let epoch=0, key='', context=null, pro=false, pending=null;
  const valid=()=>!!context && context.expiresAt>now();
  const snapshot=()=>({eligible:valid(),pro:valid()&&pro,expiresAt:context?.expiresAt||0});
  function clear(){++epoch;key='';context=null;pro=false;pending=null;changed(snapshot());}
  async function refresh(identity){
    if(!identity?.key){clear();return false;}
    if(key===identity.key&&valid())return true;
    if(key===identity.key&&pending)return pending;
    clear();key=identity.key;const ticket=epoch;
    const job=(async()=>{
      try{
        const data=await request(identity);
        if(ticket!==epoch)return false;
        if(data?.success!==true||data.partner!=='opal'||data.tax!=='HT'||!Number.isFinite(data.expiresAt)||data.expiresAt<=now()||data.expiresAt>now()+310000||!data.prices||Array.isArray(data.prices)||Object.entries(data.prices).some(([ref,amount])=>!(/^[A-Z0-9-]{1,40}$/.test(ref)&&Number.isFinite(amount)&&amount>0)))throw Error('Invalid tariff response');
        context={expiresAt:data.expiresAt,prices:{...data.prices}};changed(snapshot());return true;
      }catch{if(ticket===epoch){context=null;pro=false;changed(snapshot());}return false;}
      finally{if(ticket===epoch)pending=null;}
    })();pending=job;return job;
  }
  function toggle(){if(!valid()){clear();return false;}pro=!pro;changed(snapshot());return pro;}
  function value(product){return valid()&&pro?(context.prices[product.code]??null):(Number.isFinite(product.priceTtc)&&product.priceTtc>0?product.priceTtc:null);}
  return {clear,refresh,toggle,value,snapshot};
}
