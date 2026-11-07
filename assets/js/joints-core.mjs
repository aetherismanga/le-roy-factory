export const COUNTRIES=[{id:'fr',label:'France',flag:'🇫🇷'},{id:'es',label:'Espagne',flag:'🇪🇸'},{id:'it',label:'Italie',flag:'🇮🇹'}];
export function numberValue(value){
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  const text=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'');
  if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text))return null;
  const result=Number(text.replace(',','.'));return Number.isFinite(result)?result:null;
}
export const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const matchesSearch=(value,query)=>normalized(query).split(/\s+/).every(term=>normalized(value).includes(term));
export function resolveSelection(value,brands){
  if(!value||typeof value!=='object')return null;
  const brand=brands.find(item=>item.id===value.brand&&item.country===value.country);
  if(!brand)return null;
  return {brand,country:brand.country,product:brand.products.find(item=>item.id===value.productId)||null};
}
export function calculate(input,brands){
  const errors=[],blocks=[],warnings=[],selection=resolveSelection(input,brands);
  if(!selection?.product)return {valid:false,blocked:false,errors:['Choisissez une référence de joint.'],blocks,warnings};
  const {brand,product}=selection,values={};
  for(const key of ['area','length','width','thickness','joint','packageKg','margin'])values[key]=numberValue(input[key]);
  const labels={area:'la surface en m²',length:'la longueur du carreau en cm',width:'la largeur du carreau en cm',thickness:'l’épaisseur du carreau en mm',joint:'la largeur du joint en mm'};
  for(const [key,label]of Object.entries(labels))if(values[key]===null||values[key]<=0)errors.push(`Renseignez ${label} avec une valeur supérieure à zéro.`);
  if(values.margin===null||values.margin<0||values.margin>100)errors.push('La réserve doit être comprise entre 0 et 100 %.');
  if(!product.packages.includes(values.packageKg))errors.push('Choisissez un conditionnement proposé pour cette référence.');
  const manual=input.method==='manual',manualGrams=numberValue(input.manualGrams);
  if(manual&&(manualGrams===null||manualGrams<=0))errors.push('Indiquez la consommation mesurée ou fabricant en g/m².');
  if(!manual&&!(Number.isFinite(product.coefficient)&&product.coefficient>0))errors.push('Cette référence nécessite une consommation fabricant ou mesurée en g/m².');
  if(errors.length)return {valid:false,blocked:false,errors,blocks,warnings,product,brand};
  const {area,length,width,thickness,joint,packageKg,margin}=values;
  if(joint<product.jointMin||joint>product.jointMax)blocks.push(`La fiche de ${product.name} indique des joints de ${product.jointMin} à ${product.jointMax} mm. Votre saisie est de ${joint} mm : vérifiez la largeur ou choisissez une autre référence.`);
  if(product.applicabilityMin&&joint<product.applicabilityMin)warnings.push(`Le fabricant précise une largeur minimale de pose de ${product.applicabilityMin} mm dans les conditions de sa fiche. Vérifiez l’application à votre chantier.`);
  if(joint<1)warnings.push('Joint très fin : vérifiez la largeur réelle, le profil des bords et les prescriptions de pose.');
  if(product.consumptionIncludesWaste&&!manual)warnings.push('La méthode du fabricant intègre déjà une provision pour les déchets. La réserve choisie est complémentaire.');
  const a=length*10,b=width*10,kgM2=manual?manualGrams/1000:((a+b)/(a*b))*thickness*joint*product.coefficient;
  const netKg=kgM2*area,reserveKg=netKg*margin/100,totalKg=netKg+reserveKg,units=Math.max(1,Math.ceil(totalKg/packageKg-1e-10)),purchasedKg=units*packageKg;
  if(![kgM2,netKg,totalKg,purchasedKg].every(Number.isFinite)||purchasedKg>Number.MAX_SAFE_INTEGER)errors.push('Ces dimensions dépassent la plage de calcul. Vérifiez vos mesures et leurs unités.');
  return {...values,brand,product,valid:errors.length===0,blocked:blocks.length>0,errors,blocks,warnings,manual,kgM2,gramsM2:kgM2*1000,netKg,reserveKg,totalKg,units,purchasedKg,surplusKg:purchasedKg-totalKg,linearM2:100/length+100/width};
}
