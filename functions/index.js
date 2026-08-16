const { onRequest } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");

exports.sendGroupEmail = onRequest({
  secrets: ["SMTP_PASSWORD_JEROME", "SMTP_PASSWORD_CORYNE"]
}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  try {
    const { senderMode, bccRecipients, subject, htmlContent, attachments } = req.body;

    if (!bccRecipients || bccRecipients.length === 0 || !subject || !htmlContent) {
      res.status(400).json({ error: "Paramètres manquants." });
      return;
    }

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

    const transporter = nodemailer.createTransport({
      host: "ssl0.ovh.net",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
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

    const mailOptions = {
      from: fromHeader,
      to: smtpUser,
      replyTo: replyToHeader,
      bcc: bccRecipients,
      subject,
      html: htmlContent,
      attachments: safeAttachments
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur d'envoi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
