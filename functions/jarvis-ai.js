const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const db = admin.firestore();

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

const SYSTEM_PROMPT = `
Tu es JARVIS, l'intelligence métier centrale de LE ROY FACTORY.
Tu réponds en français, de façon naturelle, courte et utile à un commercial en déplacement.

EXPERTISE MÉTIER
Tu es expert professionnel en :
- carrelage et céramique : grès cérame, faïence, pâte blanche, rectifié, formats, épaisseurs, finitions, effets bois/pierre/marbre/béton, antidérapance, extérieur, terrasse, piscine, pose et usages ;
- mobilier de salle de bain : meubles, vasques, plans, dimensions, implantation, matériaux, finitions ;
- robinetterie, douche, sanitaires, miroirs et accessoires ;
- lecture de catalogues fabricants, tarifs, fiches techniques et argumentaires commerciaux.

PARTENAIRES LE ROY FACTORY
Elios Ceramica, View Ceramica, La Fenice, Reviglass, Biopietra, Petracer's, Pecchioli Firenze, Bulbo, Randal Pro, Neobath, Koibath, Aquahome, Opal et Bilt.

RÈGLES DE FIABILITÉ
1. Tu peux expliquer librement les connaissances générales métier.
2. Pour un PRIX, une RÉFÉRENCE fabricant, une DISPONIBILITÉ, une DIMENSION réellement proposée, un COLORIS réellement proposé ou un NUMÉRO DE PAGE de catalogue LE ROY FACTORY : n'invente jamais.
3. Pour ces données commerciales précises, utilise d'abord la documentation LE ROY FACTORY lorsqu'elle est disponible via File Search.
4. Si la documentation ne permet pas de confirmer, dis clairement : "Je ne trouve pas cette information dans les documents LE ROY FACTORY indexés."
5. Quand tu trouves une donnée documentaire, indique le nom du document et, si disponible, la page ou le passage utile.
6. Les informations CRM doivent venir des outils CRM et non être devinées.
7. Garde le contexte de la conversation : "ses tarifs", "ce client", "celui-là", etc. se réfèrent aux échanges précédents quand c'est logique.
8. Pour une action sensible (envoi réel d'un mail, suppression, modification irréversible), prépare l'action mais demande une confirmation explicite avant exécution.

Tu peux également répondre à des questions générales utiles au travail (météo, déplacements, réglementation technique, conseils), en utilisant le web lorsque nécessaire.
`;

function cleanClient(data, id) {
  const emails = [];
  const pushEmail = v => {
    const s = String(v || "").trim();
    if (s && !emails.includes(s)) emails.push(s);
  };
  pushEmail(data.email || data.mail || data.eMail);
  (Array.isArray(data.emails) ? data.emails : []).forEach(pushEmail);
  (Array.isArray(data.interlocuteurs) ? data.interlocuteurs : []).forEach(i => pushEmail(i?.email));
  return {
    id,
    societe: data.societe || data.nomSociete || data.enseigne || data.nom || "",
    ville: data.ville || "",
    codePostal: data.codePostal || data.cp || "",
    departement: data.departement || data.Dept || "",
    type: data.type || "client",
    agent: data.agent || data.secteur || "",
    telephone: data.telephone || data.tel || "",
    emails,
    partenaires: Array.isArray(data.partenaires) ? data.partenaires : [],
    activite: data.categorieActivite || data.sousCategorie || "",
    archived: data.archived === true || data.archive === true
  };
}

function normalize(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function searchClients(args = {}) {
  const query = normalize(args.query);
  const dept = String(args.departement || "").replace(/^FR-/i, "").trim().toUpperCase();
  const type = normalize(args.type);
  const limit = Math.min(Math.max(Number(args.limit || 10), 1), 25);
  const snap = await db.collection("clients").limit(1200).get();
  const rows = [];
  for (const docSnap of snap.docs) {
    const c = cleanClient(docSnap.data(), docSnap.id);
    if (c.archived) continue;
    if (type && normalize(c.type) !== type) continue;
    const cDept = String(c.departement || c.codePostal || "").replace(/\D/g, "").slice(0, 2);
    if (dept && cDept !== dept) continue;
    const hay = normalize([c.societe, c.ville, c.codePostal, c.telephone, c.emails.join(" "), c.activite, c.partenaires.join(" ")].join(" "));
    if (query && !query.split(/\s+/).every(w => hay.includes(w))) continue;
    rows.push(c);
    if (rows.length >= limit) break;
  }
  return rows;
}

async function getClient(args = {}) {
  const id = String(args.id || "").trim();
  if (!id) return null;
  const snap = await db.collection("clients").doc(id).get();
  if (!snap.exists) return null;
  return cleanClient(snap.data(), snap.id);
}

const FUNCTION_TOOLS = [
  {
    type: "function",
    name: "search_clients",
    description: "Recherche des clients ou prospects dans le CRM LE ROY FACTORY par nom, ville, activité, partenaire ou département.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texte de recherche libre, ex: DM Home, pisciniste, Elios, Montpellier." },
        departement: { type: "string", description: "Numéro de département français, ex: 34." },
        type: { type: "string", enum: ["client", "prospect"], description: "Filtre facultatif." },
        limit: { type: "integer", minimum: 1, maximum: 25 }
      },
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "get_client",
    description: "Lit une fiche client précise du CRM à partir de son identifiant Firestore.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false
    }
  }
];

async function runTool(call) {
  let args = {};
  try { args = JSON.parse(call.arguments || "{}"); } catch (_) {}
  if (call.name === "search_clients") return searchClients(args);
  if (call.name === "get_client") return getClient(args);
  return { error: `Outil inconnu: ${call.name}` };
}

async function openaiRequest(apiKey, body) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${r.status}`);
  return data;
}

function extractText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  const parts = [];
  for (const item of response?.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) if (c.type === "output_text" && c.text) parts.push(c.text);
  }
  return parts.join("\n").trim();
}

exports.jarvisAi = onRequest({
  secrets: [OPENAI_API_KEY],
  timeoutSeconds: 120,
  memory: "1GiB"
}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Méthode non autorisée" });

  try {
    const body = req.body || {};
    const message = String(body.message || "").trim();
    if (!message) return res.status(400).json({ success: false, error: "Message manquant" });

    const history = Array.isArray(body.history) ? body.history.slice(-16) : [];
    const input = history
      .filter(x => x && (x.user || x.assistant))
      .flatMap(x => {
        const turns = [];
        if (x.user) turns.push({ role: "user", content: String(x.user) });
        if (x.assistant) turns.push({ role: "assistant", content: String(x.assistant) });
        return turns;
      });
    input.push({ role: "user", content: message });

    const vectorStoreId = String(process.env.JARVIS_VECTOR_STORE_ID || "").trim();
    const tools = [...FUNCTION_TOOLS, { type: "web_search" }];
    if (vectorStoreId) tools.push({ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 });

    let response = await openaiRequest(OPENAI_API_KEY.value(), {
      model: process.env.JARVIS_MODEL || "gpt-5.1",
      reasoning: { effort: "high" },
      instructions: SYSTEM_PROMPT,
      input,
      tools,
      tool_choice: "auto"
    });

    for (let pass = 0; pass < 5; pass++) {
      const calls = (response.output || []).filter(x => x.type === "function_call");
      if (!calls.length) break;
      const outputs = [];
      for (const call of calls) {
        const result = await runTool(call);
        outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      }
      response = await openaiRequest(OPENAI_API_KEY.value(), {
        model: process.env.JARVIS_MODEL || "gpt-5.1",
        reasoning: { effort: "high" },
        instructions: SYSTEM_PROMPT,
        previous_response_id: response.id,
        input: outputs,
        tools,
        tool_choice: "auto"
      });
    }

    const answer = extractText(response) || "Je n'ai pas réussi à produire une réponse exploitable.";
    res.status(200).json({
      success: true,
      answer,
      responseId: response.id || null,
      documentSearchEnabled: Boolean(vectorStoreId),
      model: process.env.JARVIS_MODEL || "gpt-5.1"
    });
  } catch (error) {
    console.error("Jarvis AI:", error);
    res.status(500).json({ success: false, error: String(error?.message || error) });
  }
});
