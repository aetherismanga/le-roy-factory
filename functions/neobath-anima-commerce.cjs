const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const modules=()=>require('./neobath-anima/studio-dist/commerce-server.cjs');
exports.getClient=async req=>{
 const {clientFromSessionToken}=require('./pro-session');
 const session=await clientFromSessionToken(req.body?.sessionToken,{renew:false});
 const client=session?.client;
 return client&&Array.isArray(client.partenaires)&&client.partenaires.some(p=>String(p).trim().toLowerCase()==='neobath')?client:null;
};
exports.quoteClient=async(body,client)=>{
 const {quoteProject,validateProject}=modules();
 const project=validateProject(body.project),quote=quoteProject(project);
 // Standard Neobath reseller condition: public HT less 50%. Calculated only
 // here from the canonical project, never from client-submitted amounts.
 const proHT=quote.publicTTC===null?null:Math.round(quote.publicTTC/1.2*.5);
 return {client:{id:client.id,codeClient:client.codeClient,societe:client.societe||''},known:true,pending:false,animaAllowed:true,proHT,
  referenceAllowed:Number.isInteger(proHT),privateCode:Number.isInteger(proHT)?client.codeClient+'-'+(proHT/100).toFixed(2)+'.00':client.codeClient};
};
exports.publicCatalogue=async()=>{
 const catalogue=JSON.parse(readFileSync(join(__dirname,'neobath-anima/catalogue.json'),'utf8'));
 const visuals=JSON.parse(readFileSync(join(__dirname,'neobath-anima/studio-dist/visuals.json'),'utf8'));
 return {collection:'ANIMA',products:catalogue.products.map(p=>({id:p.id,ref:p.ref,label:p.label,category:p.category,subtype:p.subtype,width:p.width,height:p.height,depth:p.depth,unit:p.unit,
  image:visuals.products?.[p.id]?.image||visuals.products?.[p.ref]?.image||p.image||'',
  prices:(p.prices?.length?p.prices:[{label:'',price:p.pricePublicHT}]).map(v=>({key:v.key,label:String(v.label||'Prix de vente').replace(/\s*\bHT\b/gi,'').trim(),publicTTC:typeof v.price==='number'?Math.round(v.price*120):null}))}))};
};
