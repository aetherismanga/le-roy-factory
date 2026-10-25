// Server only: identity comes from a live session check, never request fields.
export function privateReference(code,cents,authorized=false){
 if(!/^LRF-\d{5}$/.test(code||''))return '';
 if(authorized!==true||!Number.isSafeInteger(cents)||cents<0)return code;
 return code+'-'+Math.floor(cents/100)+'.'+String(cents%100).padStart(2,'0')+'.00';
}

export function purchaseRows(quote,grid){
 const prices=grid?.prices||Object.create(null);
 const rows=quote.rows.map(row=>({...row,proHT:row.publicTTC!==null&&Object.hasOwn(prices,row.ref)&&Number.isSafeInteger(prices[row.ref])&&prices[row.ref]>=0?prices[row.ref]:null}));
 const total=rows.length&&rows.every(row=>row.proHT!==null)?rows.reduce((sum,row)=>sum+row.proHT,0):null;
 return {rows,proHT:Number.isSafeInteger(total)?total:null,pricingUnavailable:!grid};
}

export function commercialReference(identity,quote){
 const authorized=identity.randalAllowed===true;
 const code=identity.client?.codeClient;
 const privateCode=privateReference(code,quote?.proHT,authorized);
 return {
  // Customers receive only their own composition reference, never the grid,
  // individual purchase rows, agent provenance or a separate purchase total.
  proHT:authorized&&identity.isAdmin===true?quote?.proHT??null:null,
  proRows:authorized&&identity.isAdmin===true?quote?.rows.map(row=>({ref:row.ref,itemId:row.itemId,proHT:row.proHT}))||[]:[],
  privateCode,
  referenceAllowed:authorized&&privateCode!==code&&!!privateCode,
  proStatus:!authorized?'partner-not-authorized':quote?.pricingUnavailable||quote&&quote.proHT===null?'purchase-unavailable':quote?'verified-composition':'authenticated',
  priceSource:authorized&&identity.isAdmin===true?quote?.source||'':''
 };
}
