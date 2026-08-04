const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

/**
 * Fonction Cloud pour l'envoi sécurisé de mails groupés
 * Seuls les utilisateurs authentifiés peuvent déclencher cette fonction.
 */
exports.sendGroupMail = functions.https.onCall(async (data, context) => {
  // 1. Contrôle de sécurité : Vérification de la session
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Accès refusé. Vous devez être connecté au CRM pour envoyer des e-mails."
    );
  }

  const { sender, subject, text, bccEmails, attachmentBase64, attachmentName } = data;

  // 2. Validation des données requises
  if (!bccEmails || !Array.isArray(bccEmails) || bccEmails.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "La liste des destinataires est vide."
    );
  }

  if (!subject || !text) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "L'objet et le corps du message sont obligatoires."
    );
  }

  // 3. Détermination de l'expéditeur officiel
  const senderEmail = sender === "coryne" ? "coryne@leroyfactory.fr" : "jerome@leroyfactory.fr";
  const senderName = sender === "coryne" ? "Coryne - LE ROY FACTORY" : "Jérôme Hugol - LE ROY FACTORY";

  // 4. Récupération du mot de passe SMTP sécurisé
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpPassword) {
    throw new functions.https.HttpsError(
      "internal",
      "Configuration serveur incomplète : mot de passe SMTP manquant."
    );
  }

  // Configuration SMTP OVH (ssl0.ovh.net)
  const transporter = nodemailer.createTransport({
    host: "ssl0.ovh.net",
    port: 465,
    secure: true,
    auth: {
      user: senderEmail,
      pass: smtpPassword
    }
  });

  // 5. Construction du mail en Cci (BCC)
  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: senderEmail,
    bcc: bccEmails,
    subject: subject,
    text: text
  };

  // 6. Prise en charge de la pièce jointe (si présente)
  if (attachmentBase64 && attachmentName) {
    mailOptions.attachments = [
      {
        filename: attachmentName,
        content: attachmentBase64,
        encoding: "base64"
      }
    ];
  }

  // 7. Envoi effectif
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Mail groupé envoyé avec succès (${bccEmails.length} destinataires) : ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      count: bccEmails.length
    };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi SMTP :", error);
    throw new functions.https.HttpsError("internal", `Échec de l'envoi : ${error.message}`);
  }
});
