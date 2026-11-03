// Factual summaries from the existing analytics response. No CRM writes.
export const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const count = value => Math.max(0, Number(value) || 0);
export function interestFor(client) {
  if (client.topProduct?.name || client.topProduct?.ref) return client.topProduct.name || client.topProduct.ref;
  const page = String(client.topPage || '').trim();
  if (/studio.?one/i.test(page)) return 'Configurateur Studio One';
  if (/randal.*(catalogue|général|general)/i.test(page)) return 'Configurateur Randal';
  if (/neobath|anima/i.test(page)) return 'Configurateur Neobath Anima';
  if (/^(—|-|accueil|accès pro|acces pro|connexion|contact|partenaires|catalogues)$/i.test(page) || !page) return '';
  return page.replace(/\s*[|—]\s*LE ROY.*$/i, '').slice(0, 140);
}
export function nextActionFor(c) {
  if (count(c.orderViews)) return 'Vérifier le suivi des commandes signalées et les prochaines étapes avec le client.';
  if (count(c.cartAdds)) return 'Demander si le projet nécessite un devis ou une aide pour finaliser la sélection.';
  if (count(c.stockViews)) return 'Confirmer le besoin, les quantités et la disponibilité avant de proposer une offre.';
  if (count(c.tariffViews)) return 'Demander si le client souhaite un devis ou une précision sur les conditions.';
  const interest = interestFor(c);
  if (interest) return `Proposer un échange sur ${interest}, sans présumer d’un projet en cours.`;
  if (count(c.sessions)) return 'Identifier le besoin lors du prochain échange ; les consultations seules ne le précisent pas.';
  return 'Consulter les derniers échanges commerciaux avant de décider d’une relance.';
}
export function summaryFor(c) {
  const bits = [];
  const sessions = count(c.sessions);
  bits.push(sessions ? `${sessions} visite${sessions > 1 ? 's' : ''} du site` : 'Aucune visite du site relevée');
  for (const [key, singular, plural] of [['productViews','consultation produit','consultations produit'],['tariffViews','consultation de tarif','consultations de tarifs'],['stockViews','consultation de stock','consultations de stocks']]) {
    const n = count(c[key]); if (n) bits.push(`${n} ${n > 1 ? plural : singular}`);
  }
  return bits.join(' · ');
}
export function followScore(c) {
  return count(c.orderViews)*100 + count(c.cartAdds)*40 + count(c.stockViews)*20 + count(c.tariffViews)*10 + count(c.productViews)*3;
}
export function selectClients(clients, {query='', status='active', sort='recent'}={}) {
  const q = normalizeSearch(query);
  return clients.filter(c => c.codeClient !== 'LRF-00001')
    .filter(c => status === 'all' || (status === 'inactive' ? !c.lastSeenAt : status === 'online' ? c.isOnline : Boolean(c.lastSeenAt)))
    .filter(c => !q || [c.societe,c.codeClient,c.ville,c.departement,c.contact,c.topProduct?.name,c.topProduct?.ref,c.topPage].some(v => normalizeSearch(v).includes(q)))
    .sort((a,b) => (sort === 'name' ? 0 : sort === 'signals' ? followScore(b)-followScore(a) : count(b.lastSeenAt)-count(a.lastSeenAt)) || String(a.societe).localeCompare(String(b.societe),'fr'));
}
