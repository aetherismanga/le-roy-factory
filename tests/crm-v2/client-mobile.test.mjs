import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../../assets/js/crm-v2-client.js', import.meta.url), 'utf8');
const { clientContactLinks, clientAppointmentUrl } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('contact shortcuts normalize numbers and safely encode addresses and e-mail', () => {
  const links = clientContactLinks({ phone: '+33 (0)6 12-34.56.78', email: 'contact+achat@example.test', address: '4 rue A & B, 34000 Ville test' });
  assert.equal(links.phone, 'tel:+33612345678');
  assert.equal(links.email, 'mailto:contact%2Bachat@example.test');
  assert.equal(new URL(links.map).searchParams.get('destination'), '4 rue A & B, 34000 Ville test');
});

test('empty or unsafe contact values never create executable links', () => {
  assert.deepEqual(clientContactLinks(), { phone: '', email: '', map: '' });
  assert.equal(clientContactLinks({ phone: 'javascript:alert(1)' }).phone, '');
  assert.equal(clientContactLinks({ email: 'a@b.test\nBcc:other@example.test' }).email, '');
});

test('appointment context uses the exact encoded document ID and does not create a record', () => {
  const link = clientAppointmentUrl('firestore-id + 42', 'Entreprise test & Co');
  const url = new URL(link, 'https://preview.test/');
  assert.equal(url.pathname, '/agenda.html');
  assert.equal(url.searchParams.get('clientId'), 'firestore-id + 42');
  assert.equal(url.searchParams.get('clientName'), 'Entreprise test & Co');
  assert.equal(clientAppointmentUrl('', 'Unsaved company'), '');
});

test('presentation module never imports a database SDK or introduces a saving path', () => {
  assert.doesNotMatch(source, /\b(?:setDoc|updateDoc|deleteDoc|addDoc|runTransaction|fetch|XMLHttpRequest|setInterval)\s*\(/);
  assert.doesNotMatch(source, /from\s+['"][^'"]*(?:firebase|firestore)/);
});
