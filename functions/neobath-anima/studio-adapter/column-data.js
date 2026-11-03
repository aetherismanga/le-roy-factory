import {PRODUCTS} from './anima-data.js';

// Anima's H70 wall unit is the demi-colonne: the same PA4070 reference,
// one reversible door and one glass shelf. It is not a resized CO40140.
export const COLUMN_MODEL_IDS=Object.freeze(['pura-column','ribelle-column','pura-half-column','ribelle-half-column']);
export const columnModelId=product=>product.facade.toLowerCase()+(product.subtype==='wall'?'-half-column':'-column');
export function columnProduct(settings={},products=PRODUCTS){
 const id=settings.columnModel||(settings.facade==='RIBELLE'?'ribelle-column':'pura-column');
 if(!COLUMN_MODEL_IDS.includes(id))throw Error('Colonne Anima inconnue.');
 const product=products.find(p=>p.category==='module'&&['wall','column'].includes(p.subtype)&&columnModelId(p)===id);
 if(!product)throw Error('Colonne Anima absente du catalogue.');
 return product;
}
export const columnName=product=>(product.subtype==='wall'?'Demi-colonne':'Colonne')+' '+(product.facade==='RIBELLE'?'Ribelle':'Pura');
