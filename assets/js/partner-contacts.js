export const PARTNER_CONTACTS = {
  'Elios Ceramica': {
    logo: 'assets/img/elios.png',
    contacts: [
      { name: 'Ghislaine Lebreton', role: 'Export Area Manager', email: 'glebreton@eliosceramica.it', phone: '+39 348 248 36 50' },
      { name: 'Caterina Toni', role: 'Back Office Specialist', email: 'ctoni@eliosceramica.it', phone: '+39 0536 842481' },
      { name: 'Giorgia Tisbo', role: 'Commandes / back-office', email: 'gtisbo@eliosceramica.it', phone: '' },
      { name: 'Paolo Belli', role: 'Contact usine / suivi', email: 'pbelli@eliosceramica.it', phone: '' }
    ]
  },
  'View Ceramica': {
    logo: 'assets/img/view.png',
    contacts: [
      { name: 'Alessio Garetti', role: 'Export Area Manager', email: 'alessio@viewceramiche.com', phone: '+39 345 384 5024' },
      { name: 'Maura', role: 'Commandes / administratif / proformas', email: 'maura@viewceramiche.com', phone: '+39 0536 80 80 29' },
      { name: 'Carlo', role: 'Administration / facturation', email: 'carlo@viewceramiche.com', phone: '+39 0536 80 80 29' }
    ]
  },
  'La Fenice': { logo: 'assets/img/lafenice.png', contacts: [] },
  'Reviglass': {
    logo: 'assets/img/reviglass.png',
    contacts: [
      { name: 'Service Export', role: 'Export', email: 'export@reviglass.es', phone: '' }
    ]
  },
  'Biopietra': { logo: 'assets/img/biopietra.png', contacts: [] },
  "Petracer's": { logo: 'assets/img/petracer.png', contacts: [] },
  'Pecchioli Firenze': { logo: 'assets/img/pecchioli.png', contacts: [] },
  'Bulbo': {
    logo: 'assets/img/bulbo.png',
    contacts: [
      { name: 'Giovanni Barbolini', role: 'Contact usine', email: 'giovanni@bulbo.it', phone: '+39 393 9170325' },
      { name: 'Matteo Coppelli', role: 'Contact usine / boîte générale', email: 'info@bulbo.it', phone: '+39 0536 792736' }
    ]
  },
  'Randal Pro': {
    logo: 'assets/img/randal.png',
    contacts: [
      { name: 'Zahra Terrar', role: 'Customer Care Specialist', email: 'help.pro.fr@randal.group', phone: '+34 961 539 000 poste 133' },
      { name: 'Karla Valdez', role: 'Logistics & Customer Care Specialist', email: 'logistics.benari@randal.group', phone: '+34 961 539 000' },
      { name: 'Juan Carlos Segura', role: 'Échantillons / disponibilités', email: 'juancarlos.segura@randal.group', phone: '' },
      { name: 'Service clients', role: 'Service clients', email: 'customerservice@randal.group', phone: '+34 961 539 000' }
    ]
  },
  'Neobath': {
    logo: 'assets/img/neobath.png',
    contacts: [
      { name: 'Deborah Ligi', role: 'Référence commerciale après-vente', email: 'deborah@neobathdesign.it', phone: '' },
      { name: 'Giulia Bonci', role: 'Contact commercial / ouverture compte', email: 'g.bonci@neobathdesign.it', phone: '' },
      { name: 'Said Chouhdi', role: 'Agent / intermédiaire', email: 'said@sachgroup.it', phone: '' }
    ]
  },
  'Koibath': {
    logo: 'assets/img/koibath.png',
    contacts: [
      { name: 'Houda El Azouan', role: 'Après-vente / SAV', email: 'postventa@koibath.com', phone: '+34 617 439 852' },
      { name: 'Ruth Ballano', role: 'Commandes', email: 'pedidos@koibath.com', phone: '' },
      { name: 'María Antonia', role: 'Direction commerciale', email: 'direccioncomercial@koibath.com', phone: '' }
    ]
  },
  'Aquahome': {
    logo: 'assets/img/aquahome.png',
    contacts: [
      { name: 'María Antonia Macías', role: 'Direction commerciale', email: 'direccioncomercial@aquahomebs.com', phone: '' },
      { name: 'Raquel Estage', role: 'Commercial / ventes', email: 'comercialventas@aquahomebs.com', phone: '+34 617 430 609' }
    ]
  },
  'Opal': {
    logo: 'assets/img/opal.png',
    contacts: [
      { name: 'Houda El Azouan', role: 'Après-vente / SAV', email: 'postventa@koibath.com', phone: '+34 617 439 852' },
      { name: 'Ruth Ballano', role: 'Commandes', email: 'pedidos@koibath.com', phone: '' },
      { name: 'María Antonia', role: 'Direction commerciale', email: 'direccioncomercial@koibath.com', phone: '' }
    ]
  },
  'Bilt': { logo: 'assets/img/bilt.png', contacts: [] }
};

export function partnerContacts(name) {
  return PARTNER_CONTACTS[name]?.contacts || [];
}

export function primaryPartnerEmail(name) {
  return partnerContacts(name).find(c => c.email)?.email || '';
}
