const clean = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];

export function toContactDraft({ displayName, prenom, nom, fonction, phones = [], emails = [] }) {
  const [firstName = '', ...lastNames] = clean(displayName).split(/\s+/);
  const hasStructuredName = clean(prenom) || clean(nom);
  const numbers = phones.map(({ value, type }) => {
    const number = clean(value).replace(/^tel:/i, '');
    const digits = number.replace(/\D/g, '');
    const frenchMobile = /^(?:0|(?:00)?33)[67]\d{8}$/.test(digits);
    const frenchFixed = /^(?:0|(?:00)?33)[1-589]\d{8}$/.test(digits);
    const kind = type === 'mobile' || frenchMobile ? 'mobile' : type === 'fixed' || frenchFixed ? 'fixed' : '';
    return { number, kind };
  }).filter(({ number }) => number);
  const mobile = (numbers.find(({ kind }) => kind === 'mobile') || numbers.find(({ kind }) => !kind))?.number || '';
  const others = numbers.filter(({ number }) => number !== mobile);
  const fixe = (others.find(({ kind }) => kind === 'fixed') || others.find(({ kind }) => !kind))?.number || '';
  return {
    prenom: hasStructuredName ? clean(prenom) : firstName,
    nom: hasStructuredName ? clean(nom) : lastNames.join(' '),
    fonction: clean(fonction),
    mobile,
    fixe,
    email: emails.map(value => clean(value).replace(/^mailto:/i, '')).find(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) || ''
  };
}

export async function pickDeviceContact() {
  const capacitor = globalThis.Capacitor;
  if (capacitor?.isNativePlatform?.() && typeof capacitor.Plugins?.ClientContacts?.pickContact === 'function') {
    const { contact } = await capacitor.Plugins.ClientContacts.pickContact({});
    return contact ? toContactDraft(contact) : null;
  }
  const picker = navigator.contacts;
  if (typeof picker?.select !== 'function') return undefined;
  const [contact] = await picker.select(['name', 'tel', 'email'], { multiple: false });
  return contact ? toContactDraft({
    displayName: list(contact.name).find(value => clean(value)),
    phones: list(contact.tel).map(value => ({ value })),
    emails: list(contact.email)
  }) : null;
}

function unfoldLines(source) {
  const lines = [];
  for (const line of source.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)) {
    const previous = lines.at(-1);
    if (previous?.endsWith('=') && /;ENCODING=QUOTED-PRINTABLE[;:]/i.test(previous)) {
      lines[lines.length - 1] = previous.slice(0, -1) + line.replace(/^[ \t]/, '');
    } else if (previous && /^[ \t]/.test(line)) {
      lines[lines.length - 1] = previous + line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function readProperty(line) {
  const separator = line.indexOf(':');
  if (separator < 1) return null;
  const [name, ...params] = line.slice(0, separator).toUpperCase().split(';');
  const [group, property] = name.includes('.') ? name.split('.', 2) : ['', name];
  if (!['N', 'FN', 'ORG', 'TITLE', 'ROLE', 'TEL', 'EMAIL', 'X-ABLABEL'].includes(property)) return null;
  let value = line.slice(separator + 1);
  if (params.includes('ENCODING=QUOTED-PRINTABLE')) {
    let decoder;
    const charset = params.find(param => param.startsWith('CHARSET='))?.slice(8);
    try { decoder = new TextDecoder(charset || 'utf-8'); }
    catch { decoder = new TextDecoder(); }
    value = value.replace(/(?:=[\dA-F]{2})+/gi, sequence => decoder.decode(Uint8Array.from(sequence.match(/[\dA-F]{2}/gi), hex => parseInt(hex, 16))));
  }
  const types = params.flatMap(param => param.replace(/^TYPE=/, '').replace(/"/g, '').split(','));
  return { group, property, value, types, preferred: types.includes('PREF') || params.includes('PREF=1') };
}

const unescapeValue = value => clean(value?.replace(/\\([nN\\,;])/g, (_, char) => /n/i.test(char) ? ' ' : char));

function readCard(lines) {
  const entries = lines.map(readProperty).filter(Boolean);
  const get = property => entries.find(entry => entry.property === property)?.value;
  const [nom, prenom] = Array.from((get('N') || '').matchAll(/((?:\\.|[^;\\])*)(?:;|$)/g), match => unescapeValue(match[1]));
  const ordered = property => entries.filter(entry => entry.property === property).sort((a, b) => Number(b.preferred) - Number(a.preferred));
  const phones = ordered('TEL').map(({ group, types, value }) => {
    const label = group && entries.find(entry => entry.group === group && entry.property === 'X-ABLABEL')?.value;
    const type = types.some(item => /^(CELL|MOBILE|IPHONE)$/.test(item)) || /mobile|iphone/i.test(label || '') ? 'mobile' :
      types.some(item => /^(HOME|WORK|FAX)$/.test(item)) || /home|work/i.test(label || '') ? 'fixed' : '';
    return { value: unescapeValue(value), type };
  });
  return toContactDraft({
    displayName: unescapeValue(get('FN')) || unescapeValue(get('ORG')?.split(';', 1)[0]), prenom, nom,
    fonction: unescapeValue(get('TITLE')) || unescapeValue(get('ROLE')),
    phones, emails: ordered('EMAIL').map(({ value }) => unescapeValue(value))
  });
}

export function parseContactCards(source) {
  const contacts = [];
  let card = null;
  for (const line of unfoldLines(source)) {
    const marker = clean(line).toUpperCase();
    if (marker === 'BEGIN:VCARD') {
      card = [];
    } else if (marker === 'END:VCARD' && card) {
      const contact = readCard(card);
      if (Object.values(contact).some(Boolean)) contacts.push(contact);
      card = null;
    } else {
      card?.push(line);
    }
  }
  return contacts;
}
