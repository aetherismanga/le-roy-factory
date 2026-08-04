const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

exports.sendGroupEmail = onRequest(
  {
    cors: true,
    secrets: ["SMTP_PASSWORD_JEROME", "SMTP_PASSWORD_CORYNE"]
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    try {
      const { senderEmail, bccRecipients, subject, htmlContent, attachments } = req.body;

      if (!senderEmail || !bccRecipients || !subject || !htmlContent) {
        res.status(400).json({ success: false, error: "Champs requis manquants." });
        return;
      }

      // Sélection du bon mot de passe selon l'expéditeur
      let password = "";
      if (senderEmail.toLowerCase().includes("coryne")) {
        password = process.env.SMTP_PASSWORD_CORYNE;
      } else {
        password = process.env.SMTP_PASSWORD_JEROME;
      }

      const transporter = nodemailer.createTransport({
        host: "ssl0.ovh.net",
        port: 465,
        secure: true,
        auth: {
          user: senderEmail,
          pass: password
        }
      });

      const mailOptions = {
        from: senderEmail,
        to: senderEmail,
        bcc: bccRecipients,
        subject: subject,
        html: htmlContent,
        attachments: attachments || []
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true, count: bccRecipients.length });
    } catch (error) {
      logger.error("Erreur envoi mail:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
