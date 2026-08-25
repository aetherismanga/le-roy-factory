import { authFetch, requireAgentSession } from "./firebase.js";

const ENDPOINT = "https://us-central1-le-roy-factory.cloudfunctions.net/getCommercialStatisticsSnapshot";

let secureStats = {};
let loadError = null;

try {
  await requireAgentSession({ redirect: true });
  const response = await authFetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: "{}"
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || "Statistiques indisponibles.");
  secureStats = result.sources || {};
  if (Array.isArray(result.missing) && result.missing.length) {
    console.warn("Sources statistiques privées manquantes:", result.missing);
  }
} catch (error) {
  loadError = error;
  console.error("Chargement statistiques sécurisées:", error);
}

export const SECURE_STATS = secureStats;
export const SECURE_STATS_ERROR = loadError;
