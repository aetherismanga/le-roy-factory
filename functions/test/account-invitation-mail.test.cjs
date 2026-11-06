'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sendAccountInvitation, sendClientMail, archiveSent } = require('../account-invitation-mail.cjs');
const config = { smtpUser: 'jerome@example.test', smtpPass: 'synthetic-only', fromHeader: 'Jérôme <jerome@example.test>', replyToHeader: 'jerome@example.test' };
const payload = { bccRecipients: ['client@example.test'], subject: 'Ouverture de compte', textContent: 'Bonjour, voici votre formulaire.', htmlContent: '<p>Bonjour, voici votre formulaire.</p>' };

test('one visible recipient and identical MIME in SMTP and Sent', async () => {
  let sent, archived;
  const result = await sendAccountInvitation(payload, config, { sendMail: async message => {
    sent = message; return { messageId: 'test-message', accepted: ['client@example.test'], rejected: [] };
  } }, async raw => { archived = raw; return { status: 'saved', mailbox: config.smtpUser, folder: 'Sent' }; });
  assert.deepEqual(sent.envelope.to, ['client@example.test']);
  assert.match(sent.raw.toString(), /^To: client@example.test$/m);
  assert.doesNotMatch(sent.raw.toString(), /^Bcc:/m);
  assert.match(sent.raw.toString(), /multipart\/alternative/);
  assert.equal(archived, sent.raw);
  assert.equal(result.deliveryStatus, 'smtp_accepted');
  assert.equal(result.sentCopy.status, 'saved');
});

test('archive failure leaves the accepted send successful without retrying SMTP', async () => {
  let calls = 0;
  const result = await sendAccountInvitation(payload, config, { sendMail: async () => {
    calls++; return { accepted: ['client@example.test'], messageId: 'kept' };
  } }, async () => { throw new Error('Mailbox unavailable'); });
  assert.equal(calls, 1);
  assert.equal(result.messageId, 'kept');
  assert.equal(result.sentCopy.status, 'failed');
});

test('SMTP rejection or missing recipient acceptance never archives a sent message', async () => {
  for (const sendMail of [async () => { throw new Error('SMTP refused'); }, async () => ({ accepted: [], rejected: ['client@example.test'] })]) {
    let archived = false;
    await assert.rejects(sendAccountInvitation(payload, config, { sendMail }, async () => { archived = true; }));
    assert.equal(archived, false);
  }
});

test('invalid or multiple recipients fail before contacting SMTP', async () => {
  for (const bccRecipients of [[], ['a@example.test', 'b@example.test'], ['bad'], ['a@example.test\r\nBcc: other@example.test']]) {
    let called = false;
    await assert.rejects(sendAccountInvitation({ ...payload, bccRecipients }, config, { sendMail: async () => { called = true; } }));
    assert.equal(called, false);
  }
});

test('Sent folder is discovered, APPEND is confirmed, TLS and private logging preserved', async () => {
  let options, append, closed = false;
  class FakeImap {
    constructor(value) { options = value; }
    on() {}
    async connect() {}
    async list() { return [{ path: 'INBOX' }, { path: 'INBOX.Envoyés', specialUse: '\\Sent' }]; }
    async append(...args) { append = args; return { uid: 17 }; }
    async logout() { closed = true; }
    close() {}
  }
  const raw = Buffer.from('synthetic MIME');
  const result = await archiveSent(raw, config, FakeImap);
  assert.equal(options.host, 'ssl0.ovh.net'); assert.equal(options.port, 993);
  assert.equal(options.secure, true); assert.equal(options.logger, false);
  assert.deepEqual(append.slice(0, 3), ['INBOX.Envoyés', raw, ['\\Seen']]);
  assert.equal(result.folder, 'INBOX.Envoyés'); assert.equal(closed, true);
  FakeImap.prototype.append = async () => false;
  await assert.rejects(archiveSent(raw, config, FakeImap), /non confirmée/);
});

test('direct client mail preserves its PDF and records partial recipient acceptance without resending',async()=>{
  let calls=0,raw;
  const result=await sendClientMail({...payload,bccRecipients:['client@example.test','refused@example.test'],attachments:[{filename:'devis.pdf',content:Buffer.from('PDF-test').toString('base64'),contentType:'application/pdf'}]},config,{sendMail:async message=>{
    calls++;raw=message.raw.toString();return{messageId:'partial-message',accepted:['client@example.test'],rejected:['refused@example.test']};
  }},async()=>({status:'saved',mailbox:config.smtpUser}));
  assert.equal(calls,1);assert.match(raw,/filename=devis.pdf/);assert.match(raw,/application\/pdf/);
  assert.equal(result.deliveryStatus,'partial');assert.deepEqual(result.rejected,['refused@example.test']);
  assert.equal(result.sentCopy.status,'saved');
});
