import catalogue from '../lrf-3d/commercial-surfaces.json' with {type:'json'};
import {privateReference} from './commercial-reference.mjs';
import {normaliseTariffSlug,tariffKey} from './agent-tariffs.mjs';
const ENDPOINT='https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs';
const PURCHASE_ENDPOINT='https://us-central1-le-roy-factory.cloudfunctions.net/getConfiguratorPurchasePrices';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<1000000;
const fail=message=>Object.assign(Error(message),{status:400});
export const TILE_COMMERCIAL_POLICY=Object.freeze({version:'20261113-standard-tiles-v1',saleHTMultiplier:2.5,vat:20,energyHTPerM2:.70,exhibitionDiscount:false});
export function checkedTileRequests(input,products=catalogue.products){
 if(!Array.isArray(input)||input.length>200)throw fail('Le relevé doit contenir au plus 200 références.');
 const byKey=new Map(products.map(p=>[p.key,p])),seen=new Set();
 return input.map(row=>{
  if(!row||typeof row.catalogueKey!=='string'||!byKey.has(row.catalogueKey)||seen.has(row.catalogueKey))throw fail('Une référence du relevé est inconnue ou dupliquée.');
  if(!Number.isFinite(row.needed)||row.needed<0||row.needed>10000)throw fail('Une quantité du relevé est invalide.');
  seen.add(row.catalogueKey);return {product:byKey.get(row.catalogueKey),needed:row.needed};
 });
}
export function tariffForTile(product,rates,exact={}){
 const partner=product.brand==='ELIOS'?'elios-ceramica':product.brand==='VIEW'?'view-ceramica':'';
 if(!partner||!rates?.allowedPartners?.includes(partner))return null;
 if(product.brand==='ELIOS'){
  const sku=rates.eliosExact?.[product.reference];if(amount(sku))return sku;
  // Exact manufacturer references outrank collection-format defaults. Decor
  // and special units never inherit the price of an ordinary field tile.
  const exactAmount=exact[product.key]?.purchaseHT;
  if(normaliseTariffSlug(product.collection)==='dynasty'||/décor|decor|fenix|rebel|palm|prestige|intars|duplex/i.test(product.color+' '+product.finish))return amount(exactAmount)?exactAmount:null;
  const rate=rates.elios?.[tariffKey(product.collection,product.format+' '+product.finish)];
  if(rate&&!rate.unavailable&&!rate.locked&&amount(rate.amount)&&!/pièce|piece|pce|\/pz|\/ml/i.test(rate.label||''))return rate.amount;
  return amount(exactAmount)?exactAmount:null;
 }
 const variantKey=product.key.split('|').at(-1),collection=normaliseTariffSlug(product.collection);
 const row=(rates.view||[]).find(row=>row.variantKey===variantKey&&[collection,'view'+collection].includes(normaliseTariffSlug(row.productId||row.collection)));
 return amount(row?.proDetail)?row.proDetail:amount(row?.proPrice)?row.proPrice:null;
}
export function quoteTiles(requests,{rates=null,exact={},identity={}}={}){
 let purchaseCents=0;
 const rows=requests.map(({product:p,needed})=>{
  const packVerified=p.packVerified===true&&p.packArea>0&&Number.isInteger(p.packPieces)&&p.packPieces>0;
  const boxes=packVerified?Math.ceil((needed-1e-8)/p.packArea):null,orderArea=packVerified?Number((boxes*p.packArea).toFixed(4)):null;
  const purchase=tariffForTile(p,rates,exact),unitPublicTTC=amount(p.priceTTC)?p.priceTTC:purchase!==null?round(purchase*TILE_COMMERCIAL_POLICY.saleHTMultiplier*1.2):null;
  const publicTTC=orderArea!==null&&unitPublicTTC!==null?round(orderArea*unitPublicTTC):null;
  const proHT=orderArea!==null&&purchase!==null?Math.round(orderArea*purchase*100):null;
  if(proHT!==null)purchaseCents+=proHT;
  return {catalogueKey:p.key,reference:p.reference,packVerified,boxes,m2Box:packVerified?p.packArea:null,pcsBox:packVerified?p.packPieces:null,orderArea,orderPieces:packVerified?boxes*p.packPieces:null,unitPublicTTC,publicTTC,_proHT:proHT};
 });
 const orderArea=Number(rows.reduce((n,r)=>n+(r.orderArea||0),0).toFixed(4));
 const energyTax={area:orderArea,rateHT:.70,rateTTC:.84,amountTTC:round(orderArea*.84)};
 const subtotal=round(rows.reduce((sum,r)=>sum+(r.publicTTC??0),0)),missing=rows.some(r=>r.publicTTC===null||!r.packVerified);
 const purchaseComplete=rows.length>0&&rows.every(r=>r._proHT!==null&&r.packVerified);
 // Same complete-box and energy policy as functions/elios-samples-options.cjs.
 // Exhibition -50% is restricted to sample/box requests; standard bathroom
 // selling prices use the established purchase x2.5 HT then 20% VAT policy.
 const privateCode=purchaseComplete?privateReference(identity.client?.codeClient,purchaseCents+Math.round(orderArea*.70*100),true):'';
 return {success:true,policy:TILE_COMMERCIAL_POLICY.version,rows:rows.map(({_proHT,...row})=>row),totals:{orderArea,orderPieces:rows.reduce((n,r)=>n+(r.orderPieces||0),0),boxes:rows.reduce((n,r)=>n+(r.boxes||0),0),subtotal,energyTax,publicTTC:missing?null:round(subtotal+energyTax.amountTTC)},privateCode,pricingStatus:missing?'prices-to-confirm':'verified'};
}
function cookies(req,variant){
 const prefix=variant==='studio-one'?'studio_one':'randal_general';
 const read=name=>{const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));try{return value?decodeURIComponent(value.slice(name.length+1)):'';}catch{return '';}};
 const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 return bearer?{admin:bearer.includes('.')?bearer:'',session:bearer.includes('.')?'':bearer}:{admin:read(prefix+'_admin'),session:read(prefix+'_pro')};
}
export function createTileQuoteHandler({commercial,variant,request=fetch}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Méthode non autorisée.'});
  const origin=req.headers.origin;if(origin&&origin!=='https://'+req.headers.host&&!(!process.env.VERCEL&&origin==='http://'+req.headers.host))return res.status(403).json({success:false,error:'Origine non autorisée.'});
  try{
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   if(JSON.stringify(body).length>40000)throw fail('Relevé trop volumineux.');
   const requests=checkedTileRequests(body.rows);
   // Reuse the exact live account/revocation authority of the furniture quote.
   let status=200,identity;
   const capture={setHeader(){},status(code){status=code;return this;},json(value){identity=value;return value;}};
   await commercial({...req,body:{action:'session'}},capture);
   if(status!==200||!identity?.client)return res.status(status===200?401:status).json({success:false,error:identity?.error||'Connectez votre compte LRF pour chiffrer le carrelage.'});
   const auth=cookies(req,variant);
   const [tariffsResult,exactResult]=await Promise.allSettled([
    (async()=>{const response=await request(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',...(auth.admin?{Authorization:'Bearer '+auth.admin}:{})},body:JSON.stringify({action:'bootstrap',...(auth.session?{sessionToken:auth.session}:{})}),signal:AbortSignal.timeout(15000)});const value=await response.json();return response.ok&&value.success===true&&value.expiresAt>Date.now()?value:null;})(),
    identity.isAdmin===true&&auth.admin?(async()=>{const response=await request(PURCHASE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.admin},body:JSON.stringify({variant}),signal:AbortSignal.timeout(15000)}),value=await response.json();return response.ok&&value.success===true&&value.variant===variant?value.products||{}:{};})():Promise.resolve({})
   ]);
   const rates=tariffsResult.status==='fulfilled'?tariffsResult.value:null,exact=exactResult.status==='fulfilled'?exactResult.value:{};
   return res.status(200).json(quoteTiles(requests,{rates,exact,identity}));
  }catch(error){return res.status(error.status||400).json({success:false,error:error.status?error.message:'Le relevé de carrelage est invalide.'});}
 };
}
