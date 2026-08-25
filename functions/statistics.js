const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const db = admin.firestore();
const { setCors, requireAgent } = require("./security");

const COLLECTION = "commercial_statistics";
const MAX_SOURCE_BYTES = 850000;
const SOURCES = {
  elios: "assets/js/statistiques-elios-data.js",
  view: "assets/js/statistiques-view-data.js",
  mi_juin_2025: "assets/js/statistiques-mi-juin-2025-data.js",
  fin_2025: "assets/js/statistiques-fin-2025-data.js",
  randal_fin_2025: "assets/js/statistiques-randal-fin-2025-data.js",
  periods: "assets/js/statistiques-periods.js"
};

function extractJsonExports(text) {
  const source = String(text || "");
  const result = {};
  const regex = /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*/g;
  let match;

  while ((match = regex.exec(source))) {
    const name = match[1];
    let index = regex.lastIndex;
    while (/\s/.test(source[index] || "")) index += 1;
    const first = source[index];
    if (first !== "{" && first !== "[") continue;

    const open = first;
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let i = index; i < source.length; i += 1) {
      const char = source[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === open) depth += 1;
      else if (char === close) {
        depth -= 1;
        if (depth === 0) { end = i + 1; break; }
      }
    }

    if (end < 0) throw new Error(`Export ${name} incomplet.`);
    const json = source.slice(index, end);
    result[name] = JSON.parse(json);
    regex.lastIndex = end;
  }

  if (!Object.keys(result).length) throw new Error("Aucune donnée statistique JSON reconnue.");
  return result;
}

async function writeSource(key, data, actorEmail, origin = "migration") {
  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized, "utf8") > MAX_SOURCE_BYTES) {
    throw new Error(`Le jeu de données ${key} dépasse la taille autorisée.`);
  }
  await db.collection(COLLECTION).doc(key).set({
    data,
    source: origin,
    updatedBy: actorEmail || "server",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

exports.getCommercialStatisticsSnapshot = onRequest({ timeoutSeconds: 60, memory: "512MiB" }, async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ success:false, error:"Méthode non autorisée" });
  const user = await requireAgent(req, res);
  if (!user) return;

  try {
    const snapshot = await db.collection(COLLECTION).get();
    const sources = {};
    snapshot.forEach(doc => { if (doc.data()?.data) sources[doc.id] = doc.data().data; });
    const missing = Object.keys(SOURCES).filter(key => !sources[key]);
    res.json({ success:true, sources, missing });
  } catch (error) {
    console.error("getCommercialStatisticsSnapshot", error);
    res.status(500).json({ success:false, error:"Impossible de charger les statistiques commerciales." });
  }
});

exports.migrateLegacyStatistics = onRequest({ timeoutSeconds: 300, memory: "1GiB" }, async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ success:false, error:"Méthode non autorisée" });
  const user = await requireAgent(req, res, { adminOnly:true });
  if (!user) return;

  const baseUrl = "https://leroyfactory.fr/";
  const results = [];
  for (const [key, path] of Object.entries(SOURCES)) {
    try {
      const response = await fetch(`${baseUrl}${path}?secure-migration=${Date.now()}`, {
        headers: { "User-Agent":"LeRoyFactory-Statistics-Migrator/1.0" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const data = extractJsonExports(text);
      await writeSource(key, data, user.email, `legacy:${path}`);
      results.push({ key, ok:true, exports:Object.keys(data), bytes:Buffer.byteLength(JSON.stringify(data), "utf8") });
    } catch (error) {
      console.error(`Migration statistiques ${key}`, error);
      results.push({ key, ok:false, error:String(error.message || error) });
    }
  }

  await db.collection("audit_logs").add({
    action:"legacy_statistics_migrated",
    actorEmail:user.email,
    actorUid:user.uid || null,
    results,
    createdAt:admin.firestore.FieldValue.serverTimestamp()
  }).catch(() => {});

  res.json({ success:results.every(item => item.ok), results });
});

exports.setCommercialStatisticsSource = onRequest({ timeoutSeconds: 60, memory: "512MiB" }, async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ success:false, error:"Méthode non autorisée" });
  const user = await requireAgent(req, res, { adminOnly:true });
  if (!user) return;

  try {
    const key = String(req.body?.source || "").trim();
    if (!Object.prototype.hasOwnProperty.call(SOURCES, key)) return res.status(400).json({ success:false, error:"Source statistique inconnue." });
    const data = req.body?.data;
    if (!data || typeof data !== "object") return res.status(400).json({ success:false, error:"Données statistiques invalides." });
    await writeSource(key, data, user.email, "admin-api");
    await db.collection("audit_logs").add({ action:"statistics_source_updated", actorEmail:user.email, actorUid:user.uid||null, source:key, createdAt:admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
    res.json({ success:true, source:key });
  } catch (error) {
    console.error("setCommercialStatisticsSource", error);
    res.status(400).json({ success:false, error:error.message || "Mise à jour impossible." });
  }
});
