// Shared and transferred projects never carry the internal purchase tariff.
const internalKeys=new Set(['purchaseHT','purchasePaletteHT','purchaseOverride','totalPurchaseHT','plinthTotalHT','totalHT','unitPriceHT']);
export function publicProject(value){
 if(Array.isArray(value))return value.map(publicProject);
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key,item])=>!internalKeys.has(key)||item===null).map(([key,item])=>[key,publicProject(item)]));
}
