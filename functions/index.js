const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();
const { setCors, requireAgent, enforceSenderMode } = require("./security");

const MAX_RECIPIENTS = 100;
const MAX_SUBJECT_LENGTH = 200;
const MAX_HTML_LENGTH = 2 * 1024 * 1024;
const MAX_ATTACHMENT_TOTAL = 18 * 1024 * 1024;

function smtpConfig(senderMode) {
  let smtpUser = "jerome@leroyfactory.fr";
  let smtpPass = process.env.SMTP_PASSWORD_JEROME;
  let fromHeader = '"Jérôme Hugol - Le Roy Factory" <jerome@leroyfactory.fr>';
  let replyToHeader = "jerome@leroyfactory.fr";

  if (senderMode === "coryne") {
    smtpUser = "coryne@leroyfactory.fr";
    smtpPass = process.env.SMTP_PASSWORD_CORYNE;
    fromHeader = '"Coryne - Le Roy Factory" <coryne@leroyfactory.fr>';
    replyToHeader = "coryne@leroyfactory.fr";
  } else if (senderMode === "both") {
    smtpUser = "jerome@leroyfactory.fr";
    smtpPass = process.env.SMTP_PASSWORD_JEROME;
    fromHeader = '"Jérôme & Coryne - Le Roy Factory" <jerome@leroyfactory.fr>';
    replyToHeader = "jerome@leroyfactory.fr, coryne@leroyfactory.fr";
  }

  return { smtpUser, smtpPass, fromHeader, replyToHeader };
}

function senderLabels(senderMode) {
  return {
    agentLabel: senderMode === "coryne" ? "Coryne" : senderMode === "both" ? "Jérôme & Coryne" : "Jérôme",
    senderEmail: senderMode === "coryne" ? "coryne@leroyfactory.fr" : senderMode === "both" ? "jerome@leroyfactory.fr & coryne@leroyfactory.fr" : "jerome@leroyfactory.fr"
  };
}

function cleanEmailPayload(raw = {}, user) {
  const senderMode = enforceSenderMode(user, raw.senderMode);
  if (!senderMode) throw new Error("Expéditeur non autorisé.");

  const bccRecipients = [...new Set((Array.isArray(raw.bccRecipients) ? raw.bccRecipients : [])
    .map(v => String(v || "").trim())
    .filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))]
    .slice(0, MAX_RECIPIENTS);

  const subject = String(raw.subject || "").trim().slice(0, MAX_SUBJECT_LENGTH);
  const htmlContent = String(raw.htmlContent || "").slice(0, MAX_HTML_LENGTH);
  const clientIds = [...new Set((Array.isArray(raw.clientIds) ? raw.clientIds : [])
    .map(v => String(v || "").trim())
    .filter(Boolean))].slice(0, MAX_RECIPIENTS);

  const attachments = [];
  let attachmentBytes = 0;
  for (const att of Array.isArray(raw.attachments) ? raw.attachments : []) {
    if (!att?.filename || !att?.content) continue;
    const base64 = String(att.content || "");
    const estimatedBytes = Math.floor(base64.length * 0.75);
    attachmentBytes += estimatedBytes;
    if (attachmentBytes > MAX_ATTACHMENT_TOTAL) throw new Error("Pièces jointes trop volumineuses.");
    attachments.push({
      filename: String(att.filename).replace(/[\r\n]/g, " ").slice(0, 150),
      content: base64,
      contentType: att.contentType ? String(att.contentType).slice(0, 120) : undefined,
      cid: att.cid ? String(att.cid).slice(0, 180) : undefined,
      inline: Boolean(att.inline)
    });
  }

  if (!bccRecipients.length || !subject || !htmlContent) throw new Error("Paramètres manquants.");
  return { senderMode, bccRecipients, subject, htmlContent, attachments, clientIds };
}

async function enforceHourlyLimit(user, key, max = 30) {
  const hour = new Date().toISOString().slice(0, 13).replace(/[^0-9]/g, "");
  const uid = String(user.uid || user.email || "agent").replace(/[^a-zA-Z0-9_-]/g, "_");
  const ref = db.collection("rate_limits").doc(`${key}_${uid}_${hour}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count || 0);
    if (count >= max) throw new Error("Limite temporaire atteinte. Réessayez plus tard.");
    tx.set(ref, {
      count: count + 1,
      user: user.email,
      key,
      hour,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

async function audit(user, action, details = {}) {
  return db.collection("audit_logs").add({
    action,
    actorUid: user?.uid || null,
    actorEmail: user?.email || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...details
  }).catch(err => console.warn("Audit non bloquant:", err?.message || err));
}

async function appendClientHistory(clientIds, senderMode, subject, extra = {}) {
  const ids = [...new Set(Array.isArray(clientIds) ? clientIds.filter(Boolean) : [])];
  if (!ids.length) return;
  const { agentLabel } = senderLabels(senderMode);
  const dateFr = new Date().toLocaleDateString("fr-FR", { timeZone:"Europe/Paris" });
  const batch = db.batch();
  ids.forEach(clientId => {
    batch.update(db.collection("clients").doc(clientId), {
      historiqueMails: admin.firestore.FieldValue.arrayUnion({
        date: dateFr,
        expediteur: agentLabel,
        objet: subject,
        ...extra
      })
    });
  });
  await batch.commit();
}

async function writeMailHistory(payload, fields = {}) {
  const { senderMode = "jerome", bccRecipients = [], subject = "" } = payload || {};
  const { senderEmail } = senderLabels(senderMode);
  return db.collection("historique_mails").add({
    date: new Date().toISOString(),
    expediteur: senderEmail,
    objet: subject,
    nbDestinataires: Array.isArray(bccRecipients) ? bccRecipients.length : 0,
    destinataires: Array.isArray(bccRecipients) ? bccRecipients : [],
    statut: "Succès",
    source: "serveur",
    ...fields
  });
}

async function sendPayload(payload) {
  const { senderMode, bccRecipients, subject, htmlContent, attachments } = payload;
  if (!Array.isArray(bccRecipients) || bccRecipients.length === 0 || !subject || !htmlContent) {
    throw new Error("Paramètres manquants.");
  }

  const { smtpUser, smtpPass, fromHeader, replyToHeader } = smtpConfig(senderMode);
  if (!smtpPass) throw new Error("Mot de passe SMTP indisponible pour cet expéditeur.");

  const transporter = nodemailer.createTransport({
    host: "ssl0.ovh.net",
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const safeAttachments = Array.isArray(attachments)
    ? attachments
        .filter(att => att && att.filename && att.content)
        .map(att => ({
          filename: att.filename,
          content: Buffer.from(att.content, "base64"),
          contentType: att.contentType || undefined,
          cid: att.cid || undefined,
          contentDisposition: att.inline ? "inline" : "attachment"
        }))
    : [];

  return transporter.sendMail({
    from: fromHeader,
    to: smtpUser,
    replyTo: replyToHeader,
    bcc: bccRecipients,
    subject,
    html: htmlContent,
    attachments: safeAttachments
  });
}

exports.sendGroupEmail = onRequest({
  secrets: ["SMTP_PASSWORD_JEROME", "SMTP_PASSWORD_CORYNE"],
  timeoutSeconds: 180,
  memory: "512MiB"
}, async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const user = await requireAgent(req, res);
  if (!user) return;

  let payload;
  try {
    await enforceHourlyLimit(user, "group_mail", 30);
    payload = cleanEmailPayload(req.body || {}, user);
    const info = await sendPayload(payload);
    const historyRef = await writeMailHistory(payload, {
      statut: "Succès",
      messageId: info?.messageId || null,
      typeEnvoi: "immediat",
      actorEmail: user.email,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await appendClientHistory(payload.clientIds, payload.senderMode, payload.subject, { programme:false }).catch(err => {
      console.warn("Historique client non bloquant:", err);
    });
    await audit(user, "group_email_sent", { historyId: historyRef.id, recipientCount: payload.bccRecipients.length });
    res.status(200).json({ success: true, historyId: historyRef.id, messageId: info?.messageId || null });
  } catch (error) {
    console.error("Erreur d'envoi:", error);
    if (payload) {
      await writeMailHistory(payload, {
        statut: "Erreur",
        typeEnvoi: "immediat",
        actorEmail: user.email,
        erreur: String(error.message || error),
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
    res.status(400).json({ success: false, error: error.message });
  }
});

exports.scheduleGroupEmail = onRequest({
  timeoutSeconds: 120,
  memory: "512MiB"
}, async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const user = await requireAgent(req, res);
  if (!user) return;

  try {
    await enforceHourlyLimit(user, "schedule_mail", 30);
    const payload = cleanEmailPayload(req.body || {}, user);
    const date = new Date(req.body?.scheduledAt);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ success:false, error:"Date de programmation invalide." });
    if (date.getTime() <= Date.now()) return res.status(400).json({ success:false, error:"La date d'envoi doit être dans le futur." });

    const ref = db.collection("scheduled_mails").doc();
    const storagePath = `scheduled-mails/${ref.id}.json`;

    await bucket.file(storagePath).save(JSON.stringify(payload), {
      resumable: false,
      contentType: "application/json",
      metadata: { cacheControl: "no-store" }
    });

    const historyRef = await writeMailHistory(payload, {
      statut: "Programmé",
      typeEnvoi: "programme",
      actorEmail: user.email,
      scheduledMailId: ref.id,
      scheduledAt: admin.firestore.Timestamp.fromDate(date)
    });

    await ref.set({
      scheduledAt: admin.firestore.Timestamp.fromDate(date),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: user.email,
      status: "programme",
      senderMode: payload.senderMode,
      subject: payload.subject,
      nbDestinataires: payload.bccRecipients.length,
      destinataires: payload.bccRecipients,
      clientIds: payload.clientIds,
      storagePath,
      historyId: historyRef.id,
      attempts: 0
    });

    await audit(user, "group_email_scheduled", { scheduledMailId: ref.id, recipientCount: payload.bccRecipients.length });
    res.status(200).json({ success:true, id:ref.id, historyId:historyRef.id, scheduledAt:date.toISOString() });
  } catch (error) {
    console.error("Erreur programmation mail:", error);
    res.status(400).json({ success:false, error:error.message });
  }
});

async function processScheduledDoc(docSnap, now) {
  const data = docSnap.data();
  if (!data.scheduledAt || data.scheduledAt.toMillis() > now.toMillis()) return;

  const ref = docSnap.ref;
  const historyRef = data.historyId ? db.collection("historique_mails").doc(data.historyId) : null;
  try {
    await ref.update({
      status:"en_cours",
      startedAt:admin.firestore.FieldValue.serverTimestamp(),
      attempts:admin.firestore.FieldValue.increment(1)
    });
    if (historyRef) await historyRef.update({ statut:"Envoi en cours" }).catch(() => {});

    const file = bucket.file(data.storagePath);
    const [buffer] = await file.download();
    const payload = JSON.parse(buffer.toString("utf8"));
    const info = await sendPayload(payload);
    const sentAt = new Date();

    if (historyRef) {
      await historyRef.update({
        date: sentAt.toISOString(),
        statut:"Succès — programmé",
        sentAt:admin.firestore.FieldValue.serverTimestamp(),
        messageId:info?.messageId || null
      });
    } else {
      await writeMailHistory(payload, {
        statut:"Succès — programmé",
        typeEnvoi:"programme",
        scheduledMailId:docSnap.id,
        messageId:info?.messageId || null,
        sentAt:admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await appendClientHistory(payload.clientIds, payload.senderMode, payload.subject, { programme:true }).catch(err => {
      console.warn("Historique client programmé non bloquant:", err);
    });

    await ref.update({ status:"envoye", sentAt:admin.firestore.FieldValue.serverTimestamp(), lastError:admin.firestore.FieldValue.delete() });
    await file.delete().catch(() => {});
  } catch (error) {
    console.error(`Erreur mail programmé ${docSnap.id}:`, error);
    const attempts = Number(data.attempts || 0) + 1;
    const retry = attempts < 3;
    await ref.update({
      status: retry ? "programme" : "erreur",
      error:String(error.message || error),
      lastError:String(error.message || error),
      failedAt:admin.firestore.FieldValue.serverTimestamp(),
      scheduledAt: retry ? admin.firestore.Timestamp.fromMillis(Date.now() + 2 * 60000) : data.scheduledAt
    }).catch(() => {});
    if (historyRef) {
      await historyRef.update({
        statut: retry ? `Nouvelle tentative (${attempts}/3)` : "Erreur — programmé",
        erreur:String(error.message || error)
      }).catch(() => {});
    }
  }
}

exports.processScheduledEmails = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "Europe/Paris",
  secrets: ["SMTP_PASSWORD_JEROME", "SMTP_PASSWORD_CORYNE"],
  timeoutSeconds: 300,
  memory: "512MiB"
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const programmed = await db.collection("scheduled_mails").where("status", "==", "programme").limit(100).get();
  for (const docSnap of programmed.docs) await processScheduledDoc(docSnap, now);

  const running = await db.collection("scheduled_mails").where("status", "==", "en_cours").limit(50).get();
  const staleBefore = Date.now() - 10 * 60000;
  for (const docSnap of running.docs) {
    const data = docSnap.data();
    const started = data.startedAt?.toMillis?.() || 0;
    if (started && started < staleBefore) {
      await docSnap.ref.update({ status:"programme", scheduledAt:admin.firestore.Timestamp.now() }).catch(() => {});
    }
  }
});

Object.assign(exports, require("./account-requests"));
Object.assign(exports, require("./jarvis-ai"));
