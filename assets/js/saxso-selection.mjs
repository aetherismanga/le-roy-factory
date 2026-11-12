export const MINIMUM_PALLETS = 4;
export const STORAGE_KEY = 'lrf-saxso-selection-v1';
export function normalizeCatalogueSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/(\d)\s*[x×✕]\s*(?=\d)/g, '$1x');
}
export function quantity(value) {
  const n = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 1000000 ? n : null;
}
export function restoreSelection(saved, catalogue) {
  const byId = new Map(catalogue.collections.flatMap(c => c.variants.map(v => [v.id, {collection:c, variant:v}])));
  if (!Array.isArray(saved)) return [];
  return saved.flatMap(item => {
    const found = byId.get(item?.id), amount = quantity(item?.quantity);
    return found && amount ? [{id:found.variant.id, quantity:amount}] : [];
  });
}
export function palletEstimate(selection, catalogue) {
  const variants = new Map(catalogue.collections.flatMap(c => c.variants.map(v => [v.id, v])));
  let known = 0, unknown = 0;
  for (const item of selection) {
    const v = variants.get(item.id);
    if (v?.perPallet > 0) known += item.quantity / v.perPallet;
    else unknown++;
  }
  return {known, unknown};
}
export function buildQuote({catalogue, selection, customer}) {
  if (!selection.length) throw Error('Ajoutez au moins un article à votre sélection.');
  const pallets = Number(customer.pallets);
  if (!Number.isInteger(pallets) || pallets < MINIMUM_PALLETS) throw Error('Le minimum de commande est de 4 palettes.');
  const clean = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();
  const variants = new Map(catalogue.collections.flatMap(c => c.variants.map(v => [v.id, {c, v}])));
  const lines = selection.map((item, i) => {
    const entry = variants.get(item.id);
    if (!entry || !quantity(item.quantity)) throw Error('Vérifiez les articles et les quantités de votre sélection.');
    const {c, v} = entry;
    return `${i + 1}. ${c.name} · ${c.category}\nRéférence catalogue : ${v.reference}\nChoix : ${v.label}\nQuantité souhaitée : ${item.quantity.toLocaleString('fr-FR')} ${v.unit}\nCatalogue français 2026, page ${v.page}${v.note ? '\n' + v.note : ''}`;
  });
  const body = `Bonjour Dora,\n\nMerci de nous transmettre un chiffrage pour la sélection SAXSO ci-dessous.\n\nCLIENT\nSociété : ${clean(customer.company)}\nNom : ${clean(customer.name)}\nE-mail : ${clean(customer.email)}\nTéléphone : ${clean(customer.phone)}\nLivraison : ${clean(customer.delivery)}\n\nSÉLECTION\n${lines.join('\n\n')}\n\nMinimum de commande : 4 palettes.\nVolume de commande envisagé : ${pallets} palettes (à confirmer selon les conditionnements et les quantités ci-dessus).\nMerci de confirmer les conditionnements, la disponibilité, le délai et les conditions de livraison.\n\nPrécisions :\n${String(customer.notes || '').trim() || 'Aucune précision complémentaire.'}\n\nMerci,\n${clean(customer.name)}\n\nDemande préparée depuis le catalogue SAXSO de LE ROY FACTORY.\nhttps://leroyfactory.fr/saxso-catalogue-interactif.html`;
  const subject = `Demande de chiffrage SAXSO · ${clean(customer.company || customer.name)}`;
  return {to:catalogue.contact.email, cc:'jerome@leroyfactory.fr', subject, body};
}
