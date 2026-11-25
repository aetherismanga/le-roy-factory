import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseContactCards, toContactDraft } from '../assets/js/crm-contact-import.mjs';
import { isAppleMobile } from '../assets/js/crm-apple-contact.mjs';

test('Apple AutoFill is offered on iPhone and iPad, including iPad desktop mode', () => {
  assert.equal(isAppleMobile({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)' }), true);
  assert.equal(isAppleMobile({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(isAppleMobile({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 }), false);
  assert.equal(isAppleMobile({ userAgent: 'Mozilla/5.0 (Linux; Android 17)' }), false);
});

test('Apple vCard keeps structured names, labels, folded values and preferred email', () => {
  const result = parseContactCards([
    'BEGIN:VCARD', 'VERSION:3.0', 'FN:Élodie Marie de Saint\\;Clair',
    'N:de Saint\\;Clair;Élodie Marie;;;', 'TITLE:Responsable', '  achats',
    'item1.TEL;TYPE=VOICE:+33 6 32 00 00 00', 'item1.X-ABLabel:_$!<iPhone>!$_',
    'TEL;TYPE=WORK,VOICE:04 67 00 00 00', 'EMAIL:perso@example.test',
    'EMAIL;TYPE=INTERNET,PREF:pro@example.test', 'END:VCARD'
  ].join('\r\n'));

  assert.deepEqual(result, [{
    prenom: 'Élodie Marie', nom: 'de Saint;Clair', fonction: 'Responsable achats',
    mobile: '+33 6 32 00 00 00', fixe: '04 67 00 00 00', email: 'pro@example.test'
  }]);
});

test('legacy and modern exports handle accented names and preserve each nonempty card', () => {
  const result = parseContactCards([
    '\uFEFFBEGIN:VCARD', 'VERSION:2.1', 'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:G=C3=A9rard;=',
    'J=C3=A9r=C3=B4me;;;', 'TEL;CELL:0610000000', 'END:VCARD',
    'BEGIN:VCARD', 'VERSION:4.0', 'TEL;TYPE=work:tel:+33467000000', 'END:VCARD',
    'BEGIN:VCARD', 'VERSION:4.0', 'PHOTO:http://example.test/photo', 'END:VCARD',
    'BEGIN:VCARD', 'FN:Incomplete'
  ].join('\n'));

  assert.equal(result.length, 2);
  assert.equal(result[0].prenom, 'Jérôme');
  assert.equal(result[0].nom, 'Gérard');
  assert.equal(result[0].mobile, '0610000000');
  assert.equal(result[1].fixe, '+33467000000');
  assert.equal(result[1].mobile, '');
  assert.deepEqual(parseContactCards('No contact'), []);
});

test('browser picker distinguishes French mobile and landline numbers without labels', () => {
  assert.deepEqual(toContactDraft({
    displayName: 'Anne Le Gall',
    phones: [{ value: '+33 4 67 00 00 00' }, { value: '0033 7 66 00 00 00' }],
    emails: ['incorrect', 'anne@example.test']
  }), {
    prenom: 'Anne', nom: 'Le Gall', fonction: '', mobile: '0033 7 66 00 00 00',
    fixe: '+33 4 67 00 00 00', email: 'anne@example.test'
  });
});
