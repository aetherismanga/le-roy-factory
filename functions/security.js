const admin = require("firebase-admin");

const ALLOWED_ORIGINS = new Set([
  "https://leroyfactory.fr",
  "https://www.leroyfactory.fr",
  "https://aetherismanga.github.io"
]);

const AGENT_EMAILS = new Set([
  "jerome@leroyfactory.fr",
  "coryne@leroyfactory.fr"
]);

const ADMIN_EMAILS = new Set([
  "jerome@leroyfactory.fr"
]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function setCors(req, res, { publicEndpoint = false } = {}) {
  const origin = String(req.headers.origin || "").trim();
  const isNativeOrServer = !origin;
  const allowed = isNativeOrServer || ALLOWED_ORIGINS.has(origin);

  if (!allowed) {
    res.status(403).json({ success: false, error: "Origine non autorisée." });
    return true;
  }

  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", publicEndpoint ? "POST, OPTIONS" : "POST, OPTIONS");
  res.set("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function requireAgent(req, res, { adminOnly = false } = {}) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: "Authentification requise." });
    return null;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    const email = normalizeEmail(decoded.email);
    const role = String(decoded.role || "").toLowerCase();
    const isAllowlistedAgent = AGENT_EMAILS.has(email);
    const isAgentRole = role === "agent" || role === "admin";

    if (!email || (!isAllowlistedAgent && !isAgentRole)) {
      res.status(403).json({ success: false, error: "Compte non autorisé pour le CRM." });
      return null;
    }

    const isAdmin = ADMIN_EMAILS.has(email) || role === "admin";
    if (adminOnly && !isAdmin) {
      res.status(403).json({ success: false, error: "Droits administrateur requis." });
      return null;
    }

    return { ...decoded, email, isAdmin };
  } catch (error) {
    console.warn("Jeton Firebase invalide:", error?.message || error);
    res.status(401).json({ success: false, error: "Session invalide ou expirée." });
    return null;
  }
}

function allowedSenderModesFor(user) {
  if (!user?.email) return [];
  if (user.isAdmin || user.email === "jerome@leroyfactory.fr") return ["jerome", "both"];
  if (user.email === "coryne@leroyfactory.fr") return ["coryne", "both"];
  return [];
}

function enforceSenderMode(user, requested) {
  const wanted = String(requested || "").toLowerCase();
  const allowed = allowedSenderModesFor(user);
  if (allowed.includes(wanted)) return wanted;
  return allowed[0] || "";
}

module.exports = {
  setCors,
  requireAgent,
  enforceSenderMode,
  normalizeEmail,
  AGENT_EMAILS,
  ADMIN_EMAILS
};
