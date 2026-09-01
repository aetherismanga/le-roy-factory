const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { requireAgent } = require("./auth");

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

function cors(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

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

  const info = await transporter.sendMail({
    from: fromHeader,
    to: smtpUser,
    replyTo: replyToHeader,
    bcc: bccRecipients,
    subject,
    html: htmlContent,
    attachments: safeAttachments
  });
  return info;
}

exports.sendGroupEmail = onRequest({
  secrets: ["SMTP_PASSWORD_JEROME", "SMTP_PASSWORD_CORYNE"],
  timeoutSeconds: 180,
  memory: "512MiB"
}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const agent = await requireAgent(req, res);
  if (!agent) return;

  const payload = req.body || {};
  try {
    const info = await sendPayload(payload);
    const historyRef = await writeMailHistory(payload, {
      statut: "Succès",
      messageId: info?.messageId || null,
      typeEnvoi: "immediat",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      authenticatedAgent: agent.email
    });
    await appendClientHistory(payload.clientIds, payload.senderMode, payload.subject, { programme:false }).catch(err => {
      console.warn("Historique client non bloquant:", err);
    });
    res.status(200).json({ success: true, historyId: historyRef.id, messageId: info?.messageId || null });
  } catch (error) {
    console.error("Erreur d'envoi:", error);
    await writeMailHistory(payload, {
      statut: "Erreur",
      typeEnvoi: "immediat",
      erreur: String(error.message || error),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      authenticatedAgent: agent.email
    }).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

exports.scheduleGroupEmail = onRequest({
  timeoutSeconds: 120,
  memory: "512MiB"
}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const agent = await requireAgent(req, res);
  if (!agent) return;

  try {
    const payload = req.body || {};
    const { senderMode, bccRecipients, subject, htmlContent, attachments, scheduledAt, clientIds } = payload;
    const date = new Date(scheduledAt);

    if (!Array.isArray(bccRecipients) || !bccRecipients.length || !subject || !htmlContent || Number.isNaN(date.getTime())) {
      return res.status(400).json({ success:false, error:"Paramètres de programmation manquants." });
    }
    if (date.getTime() <= Date.now()) {
      return res.status(400).json({ success:false, error:"La date d'envoi doit être dans le futur." });
    }

    const ref = db.collection("scheduled_mails").doc();
    const storagePath = `scheduled-mails/${ref.id}.json`;
    const cleanPayload = {
      senderMode: senderMode || "jerome",
      bccRecipients,
      subject,
      htmlContent,
      attachments: Array.isArray(attachments) ? attachments : [],
      clientIds: Array.isArray(clientIds) ? clientIds : []
    };

    await bucket.file(storagePath).save(JSON.stringify(cleanPayload), {
      resumable: false,
      contentType: "application/json",
      metadata: { cacheControl: "no-store" }
    });

    const historyRef = await writeMailHistory(cleanPayload, {
      statut: "Programmé",
      typeEnvoi: "programme",
      scheduledMailId: ref.id,
      scheduledAt: admin.firestore.Timestamp.fromDate(date),
      authenticatedAgent: agent.email
    });

    await ref.set({
      scheduledAt: admin.firestore.Timestamp.fromDate(date),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "programme",
      senderMode: cleanPayload.senderMode,
      subject,
      nbDestinataires: bccRecipients.length,
      destinataires: bccRecipients,
      clientIds: cleanPayload.clientIds,
      storagePath,
      historyId: historyRef.id,
      attempts: 0,
      authenticatedAgent: agent.email
    });

    res.status(200).json({ success:true, id:ref.id, historyId:historyRef.id, scheduledAt:date.toISOString() });
  } catch (error) {
    console.error("Erreur programmation mail:", error);
    res.status(500).json({ success:false, error:error.message });
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
