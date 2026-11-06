'use strict';

const MailComposer = require('nodemailer/lib/mail-composer');
const { ImapFlow } = require('imapflow');

// SMTP does not create a copy in Sent. Append the exact MIME message only
// after acceptance, using the same existing mailbox credentials over TLS.
async function archiveSent(raw, config, Client = ImapFlow) {
  const imap = new Client({
    host: 'ssl0.ovh.net', port: 993, secure: true,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    logger: false, connectionTimeout: 10000, greetingTimeout: 10000,
    socketTimeout: 15000, disableAutoIdle: true
  });
  imap.on('error', () => {}); // Connection errors are handled by awaited calls.
  try {
    await imap.connect();
    const folders = await imap.list();
    const sent = folders.find(folder => folder.specialUse === '\\Sent');
    if (!sent) throw new Error('Dossier des messages envoyés introuvable.');
    const result = await imap.append(sent.path, raw, ['\\Seen'], new Date());
    if (!result) throw new Error('Copie du message non confirmée par la messagerie.');
    return { status: 'saved', mailbox: config.smtpUser, folder: sent.path };
  } finally {
    await imap.logout().catch(() => imap.close());
  }
}

async function sendAccountInvitation(payload, config, transporter, archive = archiveSent) {
  const recipients = payload.bccRecipients;
  if (!Array.isArray(recipients) || recipients.length !== 1 ||
      typeof recipients[0] !== 'string' || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipients[0]) ||
      !payload.subject || !payload.htmlContent) throw new Error('Un seul e-mail client valide, un objet et un message sont obligatoires.');
  if (!config.smtpPass) throw new Error('Mot de passe SMTP indisponible pour cet expéditeur.');
  const compiled = new MailComposer({
    from: config.fromHeader, replyTo: config.replyToHeader,
    to: recipients[0], subject: payload.subject,
    text: payload.textContent || undefined, html: payload.htmlContent
  }).compile();
  const raw = await new Promise((resolve, reject) => compiled.build((error, message) => error ? reject(error) : resolve(message)));
  const info = await transporter.sendMail({ envelope: compiled.getEnvelope(), raw });
  const accepted = (info.accepted || []).map(email => String(email).trim().toLowerCase());
  if (!accepted.includes(recipients[0].trim().toLowerCase())) {
    throw new Error('Le serveur mail n’a pas confirmé la prise en charge du destinataire.');
  }
  // A failed archive must never turn a successful send into a retryable failure.
  let sentCopy;
  try { sentCopy = await archive(raw, config); }
  catch (_) { sentCopy = { status: 'failed', mailbox: config.smtpUser }; }
  return { ...info, sentCopy, deliveryStatus: 'smtp_accepted' };
}

module.exports = { sendAccountInvitation, archiveSent };
