import { primaryPartnerEmail } from './partner-contacts.js';

export const PARTNER_OPENING_EMAILS = {
  'Elios Ceramica': 'glebreton@eliosceramica.it',
  'View Ceramica': 'alessio@viewceramiche.com',
  'La Fenice': '',
  'Reviglass': 'export@reviglass.es',
  'Biopietra': '',
  "Petracer's": '',
  'Pecchioli Firenze': '',
  'Bulbo': 'giovanni@bulbo.it',
  'Randal Pro': 'help.pro.fr@randal.group',
  'Neobath': 'g.bonci@neobathdesign.it',
  'Koibath': 'direccioncomercial@koibath.com',
  'Aquahome': 'direccioncomercial@aquahomebs.com',
  'Opal': 'direccioncomercial@koibath.com',
  'Bilt': ''
};

export function partnerOpeningEmail(name) {
  return PARTNER_OPENING_EMAILS[name] || primaryPartnerEmail(name) || '';
}
