'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const MailComposer = require('nodemailer/lib/mail-composer');
const { appendGroupMailReports, campaignKey, clientEmails } = require('../group-mail-history');
const { backfill } = require('../scripts/backfill-group-mail-reports.cjs');

function database(initial = {}) {
  const data = new Map(Object.entries(initial));
  let serial = 0;
  const snapshot = (name, id) => ({ id, exists: data.has(`${name}/${id}`), data: () => data.get(`${name}/${id}`), ref: reference(name, id) });
  function patch(ref, values) {
    const key = `${ref.collectionName}/${ref.id}`;
    const current = data.get(key);
    if (!current) throw new Error('Missing document');
    for (const [name, value] of Object.entries(values)) {
      if (value?._arrayUnion) current[name] = [...(current[name] || []), value._arrayUnion];
      else if (value?._increment) current[name] = (current[name] || 0) + value._increment;
      else current[name] = value;
    }
  }
  function reference(name, id) {
    return { id, collectionName: name,
      get: async () => snapshot(name, id),
      update: async values => patch({ id, collectionName: name }, values),
      set: async values => data.set(`${name}/${id}`, values)
    };
  }
  function query(name, filters = [], limit = Infinity) {
    return {
      doc: id => reference(name, id || `generated-${++serial}`),
      add: async values => { const ref = reference(name, `generated-${++serial}`); await ref.set(values); return ref; },
      where: (field, operator, value) => { assert.equal(operator, '=='); return query(name, [...filters, [field, value]], limit); },
      limit: count => query(name, filters, count),
      get: async () => ({ docs: [...data.keys()].filter(key => key.startsWith(name + '/')).map(key => snapshot(name, key.slice(name.length + 1)))
        .filter(row => filters.every(([field, value]) => row.data()[field] === value)).slice(0, limit) })
    };
  }
  return { data, collection: name => query(name),
    batch: () => { const changes = []; return { update: (ref, values) => changes.push([ref, values]), commit: async () => changes.forEach(([ref, values]) => patch(ref, values)) }; },
    runTransaction: async fn => {
      const changes = [];
      const result = await fn({ get: ref => ref.get(), update: (ref, values) => changes.push([ref, values]) });
      changes.forEach(([ref, values]) => patch(ref, values)); return result;
    }
  };
}

const subject = 'Comment configurer votre meuble STUDIO ONE en 4 étapes';
const payload = {
  senderMode: 'jerome', subject, htmlContent: '<h1>NOUVEAUTÉ RANDAL</h1><p>STUDIO ONE</p>',
  bccRecipients: ['one@client.example', 'two@client.example'], clientIds: ['client-a'],
  attachments: [{ filename: 'STUDIO_ONE.pdf', content: Buffer.from('PDF-FIXTURE').toString('base64'), contentType: 'application/pdf' }]
};

function harness({ senderMode = 'jerome', failSmtp = false } = {}) {
  const db = database({ 'clients/client-a': { email: 'one@client.example', emails: ['two@client.example'], comptes_rendus: [] } });
  const messages = [], files = new Map();
  const timestamp = date => ({ toMillis: () => date.getTime(), toDate: () => date });
  const firestore = () => db;
  firestore.FieldValue = {
    serverTimestamp: () => 'SERVER_TIME', arrayUnion: value => ({ _arrayUnion: value }),
    increment: value => ({ _increment: value }), delete: () => null
  };
  firestore.Timestamp = { now: () => timestamp(new Date(Date.now() + 120000)), fromDate: timestamp, fromMillis: value => timestamp(new Date(value)) };
  const admin = {
    initializeApp() {}, firestore,
    storage: () => ({ bucket: () => ({ file: name => ({
      save: async content => files.set(name, Buffer.from(content)),
      download: async () => [files.get(name)], delete: async () => files.delete(name)
    }) }) })
  };
  const smtp = { createTransport: () => ({ sendMail: async options => {
    if (failSmtp) throw new Error('Synthetic SMTP quota rejection');
    const compiled = new MailComposer(options).compile();
    const raw = await new Promise((resolve, reject) => compiled.build((error, body) => error ? reject(error) : resolve(body)));
    messages.push({ options, envelope: compiled.getEnvelope(), raw: raw.toString() });
    return { messageId: `synthetic-${messages.length}`, accepted: compiled.getEnvelope().to, rejected: [] };
  } }) };
  const exported = {};
  const requireMock = name => {
    if (name === 'firebase-functions/v2/https') return { onRequest: (_config, handler) => handler };
    if (name === 'firebase-functions/v2/scheduler') return { onSchedule: (_config, handler) => handler };
    if (name === 'firebase-admin') return admin;
    if (name === 'nodemailer') return smtp;
    if (name === './auth') return { requireAgent: async () => ({ email: 'agent@example.invalid' }) };
    if (name === './group-mail-history') return require('../group-mail-history');
    if (name === './account-requests' || name === './jarvis-ai') return {};
    throw new Error('Unexpected dependency: ' + name);
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), {
    require: requireMock, exports: exported, Buffer, Date, Set, Map, Promise,
    process: { env: { SMTP_PASSWORD_JEROME: 'SYNTHETIC_ONLY', SMTP_PASSWORD_CORYNE: 'SYNTHETIC_ONLY' } },
    console: { warn() {}, error() {}, log() {} }
  }, { filename: 'index.js' });
  const request = body => ({ method: 'POST', body: { ...payload, senderMode, ...body } });
  const response = () => ({ code: 200, set() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send() {} });
  return { db, messages, files, exported, request, response };
}

for (const senderMode of ['jerome', 'coryne', 'both']) {
  test(`real MIME envelope has only requested BCC recipients (${senderMode})`, async () => {
    const h = harness({ senderMode }), res = h.response();
    await h.exported.sendGroupEmail(h.request({}), res);
    assert.equal(res.code, 200);
    assert.deepEqual([...h.messages[0].envelope.to].sort(), [...payload.bccRecipients].sort());
    assert.equal(h.messages[0].options.to, undefined);
    assert.equal(h.messages[0].options.cc, undefined);
    assert.doesNotMatch(h.messages[0].raw, /^(?:To|Cc|Bcc):/mi);
    assert.ok(h.messages[0].options.replyTo.includes(senderMode === 'coryne' ? 'coryne@' : 'jerome@'));
    assert.equal(h.db.data.get('clients/client-a').comptes_rendus.length, 1);
  });
}

test('a planned payload is preserved and creates its report only after actual sending', async () => {
  const h = harness(), res = h.response();
  await h.exported.scheduleGroupEmail(h.request({ scheduledAt: new Date(Date.now() + 60000).toISOString() }), res);
  assert.equal(res.code, 200);
  assert.equal(h.messages.length, 0);
  assert.equal(h.db.data.get('clients/client-a').comptes_rendus.length, 0);
  const saved = JSON.parse([...h.files.values()][0].toString());
  assert.equal(saved.htmlContent, payload.htmlContent);
  assert.equal(saved.attachments[0].content, payload.attachments[0].content);
  await h.exported.processScheduledEmails();
  assert.equal(h.messages.length, 1);
  assert.deepEqual([...h.messages[0].envelope.to].sort(), [...payload.bccRecipients].sort());
  assert.equal(h.messages[0].options.attachments[0].content.toString(), 'PDF-FIXTURE');
  assert.equal(h.db.data.get('clients/client-a').comptes_rendus[0].mailScheduled, true);
  assert.equal([...h.db.data.entries()].find(([key]) => key.startsWith('scheduled_mails/'))[1].status, 'envoye');
});

test('an SMTP rejection never creates a sent commercial report', async () => {
  const h = harness({ failSmtp: true }), res = h.response();
  await h.exported.sendGroupEmail(h.request({}), res);
  assert.equal(res.code, 500);
  assert.equal(h.db.data.get('clients/client-a').comptes_rendus.length, 0);
});

test('separate lots merge once per client, preserve existing notes, and keep other clients private', async () => {
  const note = { date: '2026-10-20', author: 'Coryne', text: 'Note existante à conserver.' };
  const db = database({ 'clients/a': { email: 'one@client.example', contacts: [{ mail: 'two@client.example' }], comptesRendus: [note] } });
  const first = { ...payload, clientIds: ['a'], bccRecipients: ['one@client.example', 'unrelated@other.example'] };
  const later = { ...payload, clientIds: ['a'], bccRecipients: ['two@client.example'] };
  const earlyTime = new Date('2026-11-01T23:30:00Z'), laterTime = new Date('2026-11-02T07:00:00Z');
  assert.equal(campaignKey(first, earlyTime), campaignKey(later, laterTime));
  await appendGroupMailReports(db, first, { sentAt: earlyTime, messageId: 'first' });
  await appendGroupMailReports(db, later, { sentAt: laterTime, messageId: 'later', programmed: true });
  const replay = await appendGroupMailReports(db, later, { sentAt: laterTime, messageId: 'later', programmed: true });
  const client = db.data.get('clients/a');
  assert.equal(client.comptesRendus.length, 2);
  assert.deepEqual(client.comptesRendus[1], note);
  assert.deepEqual(client.comptesRendus[0].mailRecipients, ['one@client.example', 'two@client.example']);
  assert.equal(client.comptesRendus[0].createdAt, earlyTime.toISOString());
  assert.equal(replay.unchanged, 1);
  assert.equal(client.comptes_rendus, undefined);
});

test('historic backfill ignores error, pending and frontend-duplicate entries', async () => {
  const db = database({
    'clients/a': { societe: 'Client A', type: 'client', email: 'one@client.example', comptes_rendus: [] },
    'clients/excluded': { societe: 'LE COMPTOIR DE CERAM', type: 'client', email: 'excluded@example.invalid' },
    'historique_mails/sent': { source: 'serveur', messageId: 'first', statut: 'Succès', date: '2026-11-02T06:00:00Z', objet: subject, expediteur: 'jerome@leroyfactory.fr', destinataires: ['one@client.example'] },
    'historique_mails/duplicate': { statut: 'Succès', date: '2026-11-02T06:00:01Z', objet: subject, expediteur: 'jerome@leroyfactory.fr', destinataires: ['one@client.example'] },
    'historique_mails/failed': { source: 'serveur', statut: 'Erreur', date: '2026-11-02T06:01:00Z', objet: subject, expediteur: 'jerome@leroyfactory.fr', destinataires: ['failed@example.invalid'] },
    'historique_mails/planned': { source: 'serveur', statut: 'Programmé', date: '2026-11-02T06:02:00Z', objet: subject, expediteur: 'jerome@leroyfactory.fr', destinataires: ['pending@example.invalid'] }
  });
  const options = { date: '2026-11-02', subject, senderEmail: 'jerome@leroyfactory.fr', minRecipients: 1, maxRecipients: 1, attachment: 'STUDIO_ONE.pdf' };
  assert.equal((await backfill(db, options)).verifiedClients, 1);
  assert.equal((await backfill(db, options)).added, 0);
  assert.equal(db.data.get('clients/excluded').comptes_rendus, undefined);
  assert.deepEqual(clientEmails({ email: 'mailto:one@client.example', emails_contact: ['one@client.example'], contacts: [{ eMail: 'two@client.example' }] }), ['one@client.example', 'two@client.example']);
});
