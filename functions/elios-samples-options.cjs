'use strict';
// Commercial rules explicitly requested by LRF. This is not a supplier price grid.
const PRICING_VERSION='20261113-energy-pose-v1';
const INSTALLATION_TERMS='Règlement de la pose à voir avec LE ROY FACTORY. Hors fournitures et sur support prêt à carreler.';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À confirmer';
const area=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:4});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function withSampleCharges(base,requested=false){
 if(typeof requested!=='boolean')throw Object.assign(Error('Le choix de la pose doit être coché ou décoché.'),{status:400});
 const boxArea=Number(base.rows.filter(row=>row.type==='box').reduce((sum,row)=>sum+row.quantity,0).toFixed(4));
 const tilesSubtotalHT=round(base.rows.reduce((sum,row)=>sum+(row.totalHT??0),0));
 const energyTax={area:boxArea,rateHT:0.70,amountHT:round(boxArea*0.70)};
 const installation={requested:requested&&boxArea>0,area:boxArea,mode:boxArea<=8?'forfait':'surface',rateHT:16,amountHT:requested&&boxArea>0?(boxArea<=8?160:round(boxArea*16)):0,terms:INSTALLATION_TERMS};
 const supplierSubtotalHT=round(tilesSubtotalHT+energyTax.amountHT);
 const subtotalHT=round(supplierSubtotalHT+installation.amountHT);
 return {...base,pricingVersion:PRICING_VERSION,boxArea,tilesSubtotalHT,energyTax,installation,supplierSubtotalHT,supplierTotalHT:base.incomplete?null:supplierSubtotalHT,subtotalHT,totalHT:base.incomplete?null:subtotalHT,
  notice:'Demande soumise à validation Elios. Taxe énergétique sur les m² de carrelage des box commandés, après arrondi aux boîtes complètes. Pose optionnelle calculée sur ces mêmes m² : forfait 160 € HT jusqu’à 8 m² inclus, puis 16 € HT/m² au-delà. '+INSTALLATION_TERMS+' Transport et profilés non compris. Vrac : 1 ou 2 pièces avec étiquette par référence éligible. Le merchandising reste hors montant à payer, sous réserve d’attribution Elios.'};
}
function sampleChargesHTML(q){
 if(!q.rows.some(row=>row.type==='box'))return '';
 const tax=q.energyTax,installation=q.installation;
 return `<section><h3>Chiffrage HT</h3><p>Carrelage après remise exposition : <strong>${money(q.tilesSubtotalHT??q.subtotalHT)}</strong></p>${tax?`<p>Taxe énergétique : ${area(tax.area)} m² × ${money(tax.rateHT)}/m² = <strong>${money(tax.amountHT)} HT</strong></p>`:''}<p>Sous-total fourniture${q.incomplete?' connu':''}, taxe énergétique incluse : <strong>${money(q.supplierSubtotalHT??q.subtotalHT)} HT</strong></p>${installation?.requested?`<p>Je veux la pose : ${area(installation.area)} m² · ${installation.mode==='forfait'?'forfait jusqu’à 8 m² inclus':money(installation.rateHT)+' HT/m²'} = <strong>${money(installation.amountHT)} HT</strong></p><p>${esc(installation.terms)}</p>`:''}<p><b>${q.incomplete?'Sous-total à payer HT renseigné':'Montant à payer HT'}${installation?.requested?' (dont pose à régler séparément à LRF)':''} : ${money(q.subtotalHT)}</b></p>${q.profiles?`<p>Profilés : ${area(q.profiles)} ml — prix à confirmer, hors sous-total.</p>`:''}<p>Surfaces commandées après arrondi aux boîtes complètes. Transport non compris. Demande soumise à validation Elios.</p></section>`;
}
function sampleChargesText(q){
 if(!q.rows.some(row=>row.type==='box'))return '';
 const tax=q.energyTax,installation=q.installation;
 return ['Carrelage après remise exposition : '+money(q.tilesSubtotalHT??q.subtotalHT)+' HT',tax?'Taxe énergétique : '+area(tax.area)+' m² × '+money(tax.rateHT)+'/m² = '+money(tax.amountHT)+' HT':'','Sous-total fourniture'+(q.incomplete?' connu':'')+', taxe incluse : '+money(q.supplierSubtotalHT??q.subtotalHT)+' HT',installation?.requested?'Je veux la pose : '+area(installation.area)+' m² · '+(installation.mode==='forfait'?'forfait jusqu’à 8 m² inclus':money(installation.rateHT)+' HT/m²')+' = '+money(installation.amountHT)+' HT':'',installation?.requested?installation.terms:'',(q.incomplete?'Sous-total HT connu':'Total HT')+(installation?.requested?' (dont pose à régler séparément à LRF)':'')+' : '+money(q.subtotalHT),q.profiles?'Profilés : '+area(q.profiles)+' ml, prix à confirmer':'','Transport non compris. Demande soumise à validation Elios.'].filter(Boolean).join('\n');
}
module.exports={PRICING_VERSION,INSTALLATION_TERMS,withSampleCharges,sampleChargesHTML,sampleChargesText};
