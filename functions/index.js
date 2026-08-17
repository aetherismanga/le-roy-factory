const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

function cors(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
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

async function sendPayload(payload) {
  const { senderMode, bccRecipients, subject, htmlContent, attachments } = payload;
  if (!Array.isArray(bccRecipients) || bccRecipients.length === 0 || !subject || !htmlContent) {
    throw new Error("Paramètres manquants.");
  }

  const { smtpUser, smtpPass, fromHeader, replyToHeader } = smtpConfig(senderMode);
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

  await transporter.sendMail({
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
  secrets: ["SMTP_PASSWORD_JEROME", "SMTP_PASSWORD_CORYNE"]
}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    await sendPayload(req.body || {});
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur d'envoi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

exports.scheduleGroupEmail = onRequest({
  timeoutSeconds: 120,
  memory: "512MiB"
}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

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

    await ref.set({
      scheduledAt: admin.firestore.Timestamp.fromDate(date),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "programme",
      senderMode: cleanPayload.senderMode,
      subject,
      nbDestinataires: bccRecipients.length,
      destinataires: bccRecipients,
      clientIds: cleanPayload.clientIds,
      storagePath
    });

    res.status(200).json({ success:true, id:ref.id, scheduledAt:date.toISOString() });
  } catch (error) {
    console.error("Erreur programmation mail:", error);
    res.status(500).json({ success:false, error:error.message });
  }
});

exports.processScheduledEmails = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "Europe/Paris",
  secrets: ["SMTP_PASSWORD_JEROME", "SMTP_PASSWORD_CORYNE"],
  timeoutSeconds: 300,
  memory: "512MiB"
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const snap = await db.collection("scheduled_mails")
    .where("scheduledAt", "<=", now)
    .limit(20)
    .get();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.status !== "programme") continue;

    const ref = docSnap.ref;
    try {
      await ref.update({ status:"en_cours", startedAt:admin.firestore.FieldValue.serverTimestamp() });

      const file = bucket.file(data.storagePath);
      const [buffer] = await file.download();
      const payload = JSON.parse(buffer.toString("utf8"));
      await sendPayload(payload);

      const sentAt = new Date();
      const agentLabel = payload.senderMode === "coryne" ? "Coryne" : payload.senderMode === "both" ? "Jérôme & Coryne" : "Jérôme";
      const senderEmail = payload.senderMode === "coryne" ? "coryne@leroyfactory.fr" : payload.senderMode === "both" ? "jerome@leroyfactory.fr & coryne@leroyfactory.fr" : "jerome@leroyfactory.fr";

      await db.collection("historique_mails").add({
        date: sentAt.toISOString(),
        expediteur: senderEmail,
        objet: payload.subject,
        nbDestinataires: payload.bccRecipients.length,
        destinataires: payload.bccRecipients,
        statut: "Succès — programmé",
        scheduledMailId: docSnap.id
      });

      const dateFr = sentAt.toLocaleDateString("fr-FR", { timeZone:"Europe/Paris" });
      const batch = db.batch();
      for (const clientId of new Set(payload.clientIds || [])) {
        const clientRef = db.collection("clients").doc(clientId);
        batch.update(clientRef, {
          historiqueMails: admin.firestore.FieldValue.arrayUnion({
            date: dateFr,
            expediteur: agentLabel,
            objet: payload.subject,
            programme: true
          })
        });
      }
      if ((payload.clientIds || []).length) await batch.commit();

      await ref.update({
        status:"envoye",
        sentAt:admin.firestore.FieldValue.serverTimestamp()
      });
      await file.delete().catch(() => {});
    } catch (error) {
      console.error(`Erreur mail programmé ${docSnap.id}:`, error);
      await ref.update({
        status:"erreur",
        error:String(error.message || error),
        failedAt:admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
  }
});
