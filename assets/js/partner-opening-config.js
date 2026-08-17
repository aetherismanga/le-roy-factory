export const PARTNER_OPENING_EMAILS={
  'Elios Ceramica':'ouverture.elios@example.com',
  'View Ceramica':'ouverture.view@example.com',
  'La Fenice':'ouverture.lafenice@example.com',
  'Reviglass':'ouverture.reviglass@example.com',
  'Biopietra':'ouverture.biopietra@example.com',
  "Petracer's":'ouverture.petracers@example.com',
  'Pecchioli Firenze':'ouverture.pecchioli@example.com',
  'Bulbo':'ouverture.bulbo@example.com',
  'Randal Pro':'ouverture.randal@example.com',
  'Neobath':'ouverture.neobath@example.com',
  'Koibath':'ouverture.koibath@example.com',
  'Aquahome':'ouverture.aquahome@example.com',
  'Opal':'ouverture.opal@example.com',
  'Bilt':'ouverture.bilt@example.com'
};

export function partnerOpeningEmail(name){return PARTNER_OPENING_EMAILS[name]||'ouverture.partenaire@example.com'}