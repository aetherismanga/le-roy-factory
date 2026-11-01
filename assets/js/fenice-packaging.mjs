// Public manufacturer packaging only. No commercial price is stored here.
const norm = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const finitePositive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const round = value => Math.round((value + Number.EPSILON) * 1e8) / 1e8;
export function formatDimensions(value) {
  const text = String(value ?? '').replaceAll(',', '.').replace(/[×*]/g, 'x').trim();
  if (/[+;/]/.test(text)) return null;
  const match = text.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*(?:cm|rett\.?|rect\.?))*$/i);
  if (!match) return null;
  const dimensions = match.slice(1).map(Number);
  return dimensions.every(n => n > 0 && n <= 1000) ? dimensions : null;
}
export function normalisePackagingFormat(value) {
  const dimensions = formatDimensions(value);
  return dimensions ? dimensions.sort((a,b) => a-b).join('x') : '';
}
const allRows = data => Array.isArray(data?.entries) ? data.entries : Array.isArray(data) ? data : [];
function validPackaging(row) {
  if (!row || !['tile','plinth'].includes(row.kind) || !Number.isSafeInteger(row.piecesPerBox) || row.piecesPerBox < 1 || row.piecesPerBox > 10000 || !formatDimensions(row.format) || row.confirmationRequired === true) return false;
  if (!row.source || typeof row.source.url !== 'string' || !/^https:\/\/lafenicegc\.com\//.test(row.source.url) || !Number.isSafeInteger(row.source.page) || row.source.page < 1) return false;
  if (row.kind === 'plinth') return finitePositive(row.linearMetresPerBox);
  return finitePositive(row.areaPerBox);
}
export function packagingOptions(data, collectionSlug, kind = 'tile', format = '') {
  const key = normalisePackagingFormat(format);
  return allRows(data).filter(row => norm(row.collectionSlug) === norm(collectionSlug) && row.kind === kind && (!format || key && normalisePackagingFormat(row.format) === key));
}
export function formatsForKind(data, collectionSlug, kind = 'tile') {
  return [...new Set(packagingOptions(data,collectionSlug,kind).map(row => row.format))];
}
const factorKey = row => [row.kind,row.piecesPerBox,row.kind === 'tile' ? row.areaPerBox : row.linearMetresPerBox].join('|');
export function packagingLookup(data, {collectionSlug,kind = 'tile',format,color = '',finish = '',reference = '',thicknessMm,packagingId = ''} = {}) {
  if (!collectionSlug || !normalisePackagingFormat(format) || !['tile','plinth'].includes(kind)) return {status:'unknown',message:'Conditionnement à confirmer avec le fabricant.'};
  let candidates = packagingOptions(data,collectionSlug,kind,format);
  if (packagingId) candidates = candidates.filter(row => row.id === packagingId);
  if (color) candidates = candidates.filter(row => row.color ? norm(row.color) === norm(color) : Array.isArray(row.colors) && row.colors.length ? row.colors.some(value => norm(value) === norm(color)) : true);
  if (reference) {
    const exact = candidates.filter(row => row.reference && norm(row.reference) === norm(reference));
    if (exact.length) candidates = exact;
    else if (candidates.some(row => row.reference)) candidates = candidates.filter(row => !row.reference);
  }
  if (finish) {
    const wanted = norm(finish);
    const exact = candidates.filter(row => row.finish && norm(row.finish) === wanted);
    if (exact.length) candidates = exact;
    else if (candidates.some(row => row.finish)) candidates = candidates.filter(row => !row.finish);
  }
  if (thicknessMm !== undefined && thicknessMm !== '') candidates = candidates.filter(row => row.thicknessMm === undefined || Number(row.thicknessMm) === Number(thicknessMm));
  if (!candidates.length) return {status:'unknown',message:'Conditionnement non documenté pour cette référence.'};
  if (candidates.some(row => !validPackaging(row))) return {status:'unknown',message:'Conditionnement fabricant à confirmer.',options:candidates};
  const factors = new Set(candidates.map(factorKey));
  if (factors.size !== 1) return {status:'ambiguous',message:'Choisissez la finition ou l’épaisseur pour calculer les boîtes.',options:candidates};
  return {status:'known',packaging:candidates[0],options:candidates};
}
function numericQuantity(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !value.trim() || !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return NaN;
  return Number(value.trim().replace(',','.'));
}
function unitKey(value) {
  return ({m2:'m²',mq:'m²',ml:'ml',metrelineaire:'ml',metreslineaires:'ml',piece:'pièces',pieces:'pièces',pcs:'pièces',pc:'pièces',pz:'pièces',boite:'boîtes',boites:'boîtes',box:'boîtes',boxes:'boîtes',carton:'boîtes',cartons:'boîtes'})[norm(value)] || '';
}
export function convertQuantity(packaging, quantity, unit) {
  if (!validPackaging(packaging)) return {status:'unknown',message:'Conditionnement fabricant à confirmer.'};
  const requestedQuantity = numericQuantity(quantity), requestedUnit = unitKey(unit);
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0 || requestedQuantity > 100000000) return {status:'invalid',message:'Saisissez une quantité positive.'};
  if (!requestedUnit || requestedUnit === 'm²' && packaging.kind !== 'tile' || requestedUnit === 'ml' && packaging.kind !== 'plinth') return {status:'unsupported',message:'Unité incompatible avec ce produit.'};
  if (['pièces','boîtes'].includes(requestedUnit) && !Number.isSafeInteger(requestedQuantity)) return {status:'invalid',message:'Le nombre de pièces ou de boîtes doit être entier.'};
  const unitPerBox = requestedUnit === 'boîtes' ? 1 : requestedUnit === 'pièces' ? packaging.piecesPerBox : packaging.kind === 'tile' ? packaging.areaPerBox : packaging.linearMetresPerBox;
  const ratio = requestedQuantity / unitPerBox;
  const boxes = Math.max(1,Math.ceil(ratio - Math.min(1e-7,Math.max(1,Math.abs(ratio)) * Number.EPSILON * 16)));
  const pieces = boxes * packaging.piecesPerBox;
  const finalUnit = packaging.kind === 'tile' ? 'm²' : 'ml';
  const finalQuantity = round(boxes * (packaging.kind === 'tile' ? packaging.areaPerBox : packaging.linearMetresPerBox));
  const fulfilledInRequestedUnit = requestedUnit === 'boîtes' ? boxes : requestedUnit === 'pièces' ? pieces : finalQuantity;
  return {status:'known',boxes,pieces,quantity:finalQuantity,unit:finalUnit,requestedQuantity,requestedUnit,excess:round(Math.max(0,fulfilledInRequestedUnit-requestedQuantity)),excessUnit:requestedUnit,packagingId:packaging.id || ''};
}
