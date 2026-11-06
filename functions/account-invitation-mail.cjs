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

async function sendClientMail(payload, config, transporter, archive = archiveSent) {
  const recipients = payload.bccRecipients;
  if (!Array.isArray(recipients) || !recipients.length ||
      recipients.some(email => typeof email !== 'string' || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email)) ||
      !payload.subject || !payload.htmlContent) throw new Error('Un e-mail client valide, un objet et un message sont obligatoires.');
  if (!config.smtpPass) throw new Error('Mot de passe SMTP indisponible pour cet expéditeur.');
  const compiled = new MailComposer({
    from: config.fromHeader, replyTo: config.replyToHeader,
    to: recipients, subject: payload.subject,
    text: payload.textContent || undefined, html: payload.htmlContent,
    attachments: (Array.isArray(payload.attachments) ? payload.attachments : []).filter(item=>item?.filename&&item?.content).map(item=>({
      filename:item.filename,content:Buffer.from(item.content,'base64'),contentType:item.contentType||undefined,
      cid:item.cid||undefined,contentDisposition:item.inline?'inline':'attachment'
    }))
  }).compile();
  const raw = await new Promise((resolve, reject) => compiled.build((error, message) => error ? reject(error) : resolve(message)));
  const info = await transporter.sendMail({ envelope: compiled.getEnvelope(), raw });
  const accepted = (info.accepted || []).map(email => String(email).trim().toLowerCase());
  if (!recipients.some(email => accepted.includes(email.trim().toLowerCase()))) {
    throw new Error('Le serveur mail n’a pas confirmé la prise en charge du destinataire.');
  }
  // A failed archive must never turn a successful send into a retryable failure.
  let sentCopy;
  try { sentCopy = await archive(raw, config); }
  catch (_) { sentCopy = { status: 'failed', mailbox: config.smtpUser }; }
  const rejected=recipients.filter(email=>!accepted.includes(email.trim().toLowerCase()));
  return { ...info, sentCopy, rejected, deliveryStatus: rejected.length?'partial':'smtp_accepted' };
}

async function sendAccountInvitation(payload, ...args) {
  if (!Array.isArray(payload.bccRecipients) || payload.bccRecipients.length!==1) throw new Error('Un seul e-mail client est obligatoire.');
  return sendClientMail(payload, ...args);
}
module.exports = { sendAccountInvitation, sendClientMail, archiveSent };
