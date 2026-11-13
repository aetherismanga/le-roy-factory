import {esc,money,norm,sampleReviewTable} from './elios-samples-core.mjs?v=20261113-8';
export const PRICING_VERSION='20261113-energy-pose-v1';
const area=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:4});
export function sampleTileMatches(product,filters={},omit=''){
 if(product.legacy||!(filters.mode==='box'||product.vrac))return false;
 for(const key of ['collection','format','color','finish'])if(key!==omit&&filters[key]&&product[key]!==filters[key])return false;
 const query=norm(filters.query||'');
 return !query||norm([product.reference,product.collection,product.color,product.description,product.format,product.finish].join(' ')).includes(query);
}
export function sampleFacetValues(products,filters,key){
 if(!['format','color','finish'].includes(key))return [];
 return [...new Set(products.filter(p=>sampleTileMatches(p,filters,key)).map(p=>p[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
}
export function sampleChargesSummary(q){
 if(!q.rows.some(row=>row.type==='box'))return '';
 const tax=q.energyTax,pose=q.installation;
 return `<section class="es-charge-summary" aria-label="Détail du chiffrage HT"><dl><div><dt>Carrelage après remise expo</dt><dd>${money(q.tilesSubtotalHT??q.subtotalHT)}</dd></div>${tax?`<div data-energy-tax><dt>Taxe énergétique <small>${area(tax.area)} m² × ${money(tax.rateHT)}/m²</small></dt><dd>${money(tax.amountHT)} HT</dd></div>`:''}<div><dt>Fourniture + taxe${q.incomplete?' (montant connu)':''}</dt><dd>${money(q.supplierSubtotalHT??q.subtotalHT)} HT</dd></div>${pose?.requested?`<div data-installation-charge><dt>Pose LE ROY FACTORY <small>${area(pose.area)} m² · ${pose.mode==='forfait'?'forfait jusqu’à 8 m² inclus':money(pose.rateHT)+' HT/m²'}</small></dt><dd>${money(pose.amountHT)} HT</dd></div>`:''}</dl><p class="es-recap-total">${q.incomplete?'Sous-total HT connu':pose?.requested?'Total HT avec pose':'Total à payer HT'} <strong>${money(q.subtotalHT)}</strong></p>${pose?.requested?`<p class="es-installation-terms">${esc(pose.terms)}</p>`:''}<p class="es-charge-basis">Calcul sur le total des m² de carrelage commandés pour les box, boîtes complètes et pertes incluses. Transport et profilés non compris.${q.incomplete?' Certains prix restent à confirmer.':''}</p></section>`;
}
export function samplePrintDocument({customer={},details={},quote,visual='',title='Votre récapitulatif Elios'}){
 const boxVisual=/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(visual)?`<figure><img class="box-visual" src="${esc(visual)}" alt="Visuel du box exposition"></figure>`:'';
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>@page{size:A4;margin:14mm}body{font:11px/1.5 Arial,sans-serif;color:#18251e;margin:0}header{border-bottom:2px solid #28372e;padding-bottom:12px;margin-bottom:16px}h1{font-size:22px;margin:4px 0}h2,h3{break-after:avoid}p{white-space:pre-line}table{width:100%;border-collapse:collapse;font-size:10px}thead{display:table-header-group}tr,figure{break-inside:avoid}td,th{padding:8px 5px;border-bottom:1px solid #ddd;text-align:left}img{max-width:100%;max-height:95px;object-fit:contain}.box-visual{display:block;max-height:240px;margin:auto}.es-review-scroll{overflow:visible}.es-charge-summary{break-inside:avoid;margin-top:16px}.es-charge-summary dl>div{display:flex;justify-content:space-between;gap:15px;padding:6px 0;border-bottom:1px solid #ddd}dt small{display:block;font-size:10px}dd{margin:0;text-align:right;white-space:nowrap}.es-recap-total{font-size:16px;display:flex;justify-content:space-between;font-weight:bold}.es-installation-terms{font-weight:bold}.es-charge-basis,footer{font-size:9px;color:#555}footer{margin-top:20px;border-top:1px solid #ddd;padding-top:10px}</style></head><body><header><strong>LE ROY FACTORY · ELIOS</strong><h1>'+esc(title)+'</h1><p>'+esc(customer.societe||'')+(customer.codeClient?' · '+esc(customer.codeClient):'')+'</p></header><section><h2>Contact et livraison</h2><p>'+esc([details.name,details.email,details.telephone,details.address].filter(Boolean).join('\n'))+'</p></section>'+boxVisual+sampleReviewTable(quote)+sampleChargesSummary(quote)+(details.note?'<h3>Observations</h3><p>'+esc(details.note)+'</p>':'')+'<footer>Demande soumise à validation Elios. Échantillons en vrac : 1 ou 2 pièces avec étiquette par référence éligible. Merchandising hors montant à payer, sous réserve d’attribution usine.</footer></body></html>';
}
export async function printSampleRecap(data){
 const frame=document.createElement('iframe');frame.title='Récapitulatif Elios à imprimer';frame.setAttribute('sandbox','allow-same-origin allow-modals');frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0';
 try{
  const loaded=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('Le récapitulatif ne peut pas être préparé pour l’impression.'));});
  frame.srcdoc=samplePrintDocument(data);document.body.append(frame);await loaded;
  await Promise.race([Promise.all([...frame.contentDocument.images].map(img=>img.decode?.().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,2500))]);
  frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});
  frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);
 }catch(error){frame.remove();throw error;}
}
