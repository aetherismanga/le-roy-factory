// Group the existing, individually authorized cards. Moving DOM nodes retains
// their PDF guards, contact links and manufacturer-specific access badges.
const BRANDS = ['Aquahome', 'Opal', 'Koibath'];

export function groupBathroomPartners(grid) {
  if (!grid || grid.querySelector('#pro-bathroom-group')) return;
  const cards = BRANDS.map(name => [...grid.children].find(card =>
    card.querySelector('h3')?.textContent?.trim() === name));
  if (cards.some(card => !card)) return;

  const group = document.createElement('details');
  group.id = 'pro-bathroom-group';
  group.className = 'pro-bathroom-group';
  group.innerHTML = `
    <summary class="pro-bathroom-summary">
      <span class="pro-bathroom-eyebrow">Un même groupe · Espagne</span>
      <span class="pro-bathroom-title">Aquahome · Opal · Koibath</span>
      <span class="pro-bathroom-brands">
        <span><strong>Aquahome</strong><small>Robinetterie</small></span>
        <span><strong>Opal</strong><small>Miroirs</small></span>
        <span><strong>Koibath</strong><small>Meubles</small></span>
      </span>
      <span class="pro-bathroom-intro">Regroupez les trois marques dans un même envoi pour atteindre le franco de port applicable.</span>
      <span class="pro-bathroom-action"><span class="pro-bathroom-open">Voir les tarifs, conditions et contacts</span><span class="pro-bathroom-close">Refermer le groupe</span><span class="pro-bathroom-chevron" aria-hidden="true">⌄</span></span>
    </summary>
    <div class="pro-bathroom-content">
      <div class="pro-bathroom-shipping">
        <strong>Commandes et livraison groupées</strong>
        <p>Les montants Aquahome, Opal et Koibath peuvent être cumulés pour atteindre le minimum de franco. Signalez le regroupement à Raquel pour la robinetterie et à Houda pour les meubles et miroirs, en précisant le même magasin et la même adresse de livraison.</p>
        <p>Franco de référence : 400 € pour Aquahome ou Opal ; 500 € pour Koibath. Faites préciser sur la proforma le franco retenu pour l’envoi mixte, les éventuels frais de port et la date de départ selon les disponibilités.</p>
        <small>Conditions reprises des échanges du 18 mai 2026. Franco Opal à 400 € confirmé le 30 juillet 2026. Les offres ponctuelles de déstockage ont leurs propres conditions.</small>
      </div>
      <div class="pro-bathroom-cards"></div>
    </div>`;
  const first = [...grid.children].find(card => cards.includes(card));
  grid.insertBefore(group, first);
  const container = group.querySelector('.pro-bathroom-cards');
  cards.forEach(card => container.appendChild(card));
  const requested = new URLSearchParams(window.location.search).get('partner')?.trim().toLowerCase();
  if (BRANDS.some(name => name.toLowerCase() === requested)) group.open = true;
}
