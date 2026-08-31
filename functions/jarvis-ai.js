const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const db = admin.firestore();

function cors(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).send(""); return true; }
  return false;
}

const SYSTEM_PROMPT = `
Tu es JARVIS, l'intelligence métier centrale de LE ROY FACTORY.
Tu réponds en français naturel, clairement, sans jargon inutile, avec le niveau d'un technico-commercial et d'un spécialiste matériaux expérimenté.

DOMAINES D'EXPERTISE PRIORITAIRES
- matériaux de construction et second œuvre ;
- carrelage et céramique : grès cérame, faïence, pâte blanche, terre cuite, pierre, mosaïque, rectifié/non rectifié, formats, calibres, épaisseurs, finitions, effets bois/pierre/marbre/béton, antidérapance, terrasse, piscine, façades et usages ;
- préparation et pose : supports, ragréage, étanchéité, SPEC/SEL, colles, mortiers, joints, croisillons/nivellement, pentes, dilatation, découpes et pathologies ;
- mobilier de salle de bain : meubles, caissons, tiroirs, vasques, plans, solid surface/Corian, stratifié, bois, dimensions, implantation et fixations ;
- robinetterie : mitigeurs, thermostatiques, encastrés, colonnes de douche, débits, pression, cartouches et finitions ;
- sanitaires, receveurs, parois de douche, baignoires, miroirs et accessoires ;
- lecture et comparaison de catalogues, tarifs, fiches techniques et argumentaires commerciaux.

PARTENAIRES LE ROY FACTORY
Elios Ceramica, View Ceramica, La Fenice, Reviglass, Biopietra, Petracer's, Pecchioli Firenze, Bulbo, Randal Pro, Neobath, Koibath, Aquahome, Opal et Bilt.

RÈGLES ABSOLUES DE FIABILITÉ
- Pour les connaissances générales et conseils techniques, réponds directement comme un expert.
- Pour un PRIX, une RÉFÉRENCE fabricant, une DISPONIBILITÉ, une DIMENSION ou un COLORIS réellement proposé, ou un NUMÉRO DE PAGE catalogue LE ROY FACTORY : n'invente jamais. Utilise File Search lorsqu'il est disponible.
- Si les documents ne confirment pas une donnée commerciale précise, dis exactement que tu ne la trouves pas dans les documents LE ROY FACTORY indexés.
- Quand une donnée documentaire est trouvée, cite le document et la page/le passage quand disponible.
- Les informations clients doivent venir des outils CRM.
- Garde le contexte : "ses tarifs", "ce modèle", "celui-là", "ce client" se réfèrent aux échanges précédents quand c'est logique.
- Si l'utilisateur demande d'ouvrir une partie de l'application/site, utilise open_app_page.
- Si l'utilisateur demande de préparer un mail groupé, utilise prepare_group_mail. L'envoi réel nécessite toujours une validation humaine.
- Pour une information externe susceptible d'avoir changé, utilise le web si nécessaire.
- Ne réponds jamais "je n'ai pas compris" à une question métier normale : explique, demande une précision seulement si elle est indispensable.
`;

const PUBLIC_CATALOGUE_PROMPT = `
SURFACE PUBLIQUE / CATALOGUES
- Tu es sur une surface publique de LE ROY FACTORY.
- Les recherches File Search sont techniquement limitées aux documents marqués type=catalogue.
- Ne révèle jamais de prix, remises, coefficients, codes prix ou informations tarifaires internes.
- Pour une question sur une collection, un format, un coloris, une finition ou une caractéristique fabricant, utilise d'abord les catalogues indexés.
- Sur la page Catalogues, si l'information n'est pas confirmée par les documents indexés, dis-le clairement au lieu de compléter avec une supposition.
`;

function normalize(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

function chooseModel(message) {
  const t = normalize(message);
  const simpleAction = /^(ouvre|ouvrir|affiche|montre|va|vas|emmene|amene|cherche|trouve)\b/.test(t) && t.length < 120;
  const simpleUi = /\b(agenda|carte|clients|catalogue|catalogues|tarif|tarifs|statistiques|mails?)\b/.test(t) && t.length < 90 && !/[?]/.test(t);
  if (simpleAction || simpleUi) return { model: "gpt-5.6-luna", effort: "low", tier: "Luna" };

  const complex = /\b(compare|comparaison|analyse|diagnostic|dimensionne|dimensionnement|pathologie|expertise|norme|dtu|calcul|compatibilite|compatibilité|prescription|solution technique|avantages et inconvenients|avantages et inconvénients|plusieurs fabricants|multi[- ]?catalogue)\b/.test(t);
  if (complex || t.length > 650) return { model: "gpt-5.6-sol", effort: "high", tier: "Sol" };

  return { model: "gpt-5.6-terra", effort: "medium", tier: "Terra" };
}

function cleanClient(data, id) {
  const emails=[]; const add=v=>{const s=String(v||"").trim();if(s&&!emails.includes(s))emails.push(s)};
  add(data.email||data.mail||data.eMail); (Array.isArray(data.emails)?data.emails:[]).forEach(add); (Array.isArray(data.interlocuteurs)?data.interlocuteurs:[]).forEach(i=>add(i?.email));
  return { id, societe:data.societe||data.nomSociete||data.enseigne||data.nom||"", ville:data.ville||"", codePostal:data.codePostal||data.cp||"", departement:data.departement||data.Dept||"", type:data.type||"client", agent:data.agent||data.secteur||"", telephone:data.telephone||data.tel||"", emails, partenaires:Array.isArray(data.partenaires)?data.partenaires:[], activite:data.categorieActivite||data.sousCategorie||"", archived:data.archived===true||data.archive===true };
}

async function searchClients(args={}) {
  const query=normalize(args.query), dept=String(args.departement||"").replace(/^FR-/i,"").trim().toUpperCase(), type=normalize(args.type), limit=Math.min(Math.max(Number(args.limit||10),1),25);
  const snap=await db.collection("clients").limit(1200).get(); const rows=[];
  for(const ds of snap.docs){ const c=cleanClient(ds.data(),ds.id); if(c.archived)continue; if(type&&normalize(c.type)!==type)continue; const cDept=String(c.departement||c.codePostal||"").replace(/\D/g,"").slice(0,2); if(dept&&cDept!==dept)continue; const hay=normalize([c.societe,c.ville,c.codePostal,c.telephone,c.emails.join(" "),c.activite,c.partenaires.join(" ")].join(" ")); if(query&&!query.split(/\s+/).every(w=>hay.includes(w)))continue; rows.push(c); if(rows.length>=limit)break; }
  return rows;
}

async function getClient(args={}) { const id=String(args.id||"").trim(); if(!id)return null; const snap=await db.collection("clients").doc(id).get(); return snap.exists?cleanClient(snap.data(),snap.id):null; }

const CRM_TOOLS=[
  {type:"function",name:"search_clients",description:"Recherche clients/prospects dans le CRM par nom, ville, activité, partenaire ou département.",parameters:{type:"object",properties:{query:{type:"string"},departement:{type:"string"},type:{type:"string",enum:["client","prospect"]},limit:{type:"integer",minimum:1,maximum:25}},additionalProperties:false}},
  {type:"function",name:"get_client",description:"Lit une fiche client précise à partir de son identifiant Firestore.",parameters:{type:"object",properties:{id:{type:"string"}},required:["id"],additionalProperties:false}},
  {type:"function",name:"prepare_group_mail",description:"Prépare l'écran de mail groupé avec filtres et document partenaire. Ne réalise jamais l'envoi final.",parameters:{type:"object",properties:{partner:{type:"string"},year:{type:"string"},departement:{type:"string"},recipientType:{type:"string",enum:["client","prospect"]},documentType:{type:"string",enum:["tarif","catalogue","autre"]}},required:["partner"],additionalProperties:false}}
];

const OPEN_PAGE_TOOL={type:"function",name:"open_app_page",description:"Ouvre directement une page ou une fiche dans LE ROY FACTORY.",parameters:{type:"object",properties:{page:{type:"string",enum:["clients","client","agenda","carte","statistiques","comptes-rendus","mails","tarifs","catalogues","partenaires"]},partner:{type:"string"},clientId:{type:"string"}},required:["page"],additionalProperties:false}};

async function runTool(call, actions, allowCrm) {
  let args={}; try{args=JSON.parse(call.arguments||"{}")}catch(_){}
  if(call.name==="search_clients")return allowCrm?searchClients(args):{error:"CRM indisponible sur le site public"};
  if(call.name==="get_client")return allowCrm?getClient(args):{error:"CRM indisponible sur le site public"};
  if(call.name==="open_app_page"){actions.push({type:"open_app_page",...args});return {ok:true,action_queued:true};}
  if(call.name==="prepare_group_mail"){if(!allowCrm)return {error:"Mails CRM indisponibles sur le site public"};actions.push({type:"prepare_group_mail",...args});return {ok:true,action_queued:true,requires_final_confirmation:true};}
  return {error:`Outil inconnu: ${call.name}`};
}

async function openaiRequest(apiKey,body){const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error?.message||`OpenAI HTTP ${r.status}`);return data;}
function extractText(response){if(typeof response?.output_text==="string"&&response.output_text.trim())return response.output_text.trim();const parts=[];for(const item of response?.output||[]){if(item.type!=="message")continue;for(const c of item.content||[])if(c.type==="output_text"&&c.text)parts.push(c.text)}return parts.join("\n").trim();}

function extractSources(response) {
  const byKey = new Map();
  const add = (filename, attrs={}) => {
    const clean = String(filename || attrs.filename || "").trim();
    if (!clean) return;
    const key = `${clean}|${attrs.source_url || ""}`;
    if (byKey.has(key)) return;
    byKey.set(key, {
      filename: clean,
      title: attrs.title || clean.replace(/[_-]+/g, " ").replace(/\.pdf$/i, ""),
      manufacturer: attrs.manufacturer || "",
      year: attrs.year || null,
      sourceUrl: attrs.source_url || null
    });
  };

  for (const item of response?.output || []) {
    if (item.type === "file_search_call") {
      for (const result of item.results || []) add(result.filename, result.attributes || {});
    }
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        if (annotation.type === "file_citation") add(annotation.filename, {});
      }
    }
  }
  return [...byKey.values()].slice(0, 8);
}

function buildFileSearchTool(vectorStoreId, allowCrm) {
  const tool = {type:"file_search", vector_store_ids:[vectorStoreId], max_num_results:8};
  if (!allowCrm) tool.filters = {type:"eq", key:"type", value:"catalogue"};
  return tool;
}

exports.jarvisAi=onRequest({secrets:[OPENAI_API_KEY],timeoutSeconds:120,memory:"1GiB"},async(req,res)=>{
  if(cors(req,res))return; if(req.method!=="POST")return res.status(405).json({success:false,error:"Méthode non autorisée"});
  try{
    const body=req.body||{}, message=String(body.message||"").trim(); if(!message)return res.status(400).json({success:false,error:"Message manquant"});
    const surface=String(body.surface||"android");
    const page=String(body.page||"").toLowerCase();
    const allowCrm=surface!=="public_web";
    const cataloguePage=surface==="public_web" && page.includes("catalogues");
    const history=Array.isArray(body.history)?body.history.slice(-16):[];
    const input=history.filter(x=>x&&(x.user||x.assistant)).flatMap(x=>{const a=[];if(x.user)a.push({role:"user",content:String(x.user)});if(x.assistant)a.push({role:"assistant",content:String(x.assistant)});return a});
    input.push({role:"user",content:message});

    const route=chooseModel(message);
    const vectorStoreId=String(process.env.JARVIS_VECTOR_STORE_ID||"").trim();
    const tools=[OPEN_PAGE_TOOL,...(cataloguePage?[]:[{type:"web_search"}]),...(allowCrm?CRM_TOOLS:[])];
    if(vectorStoreId)tools.push(buildFileSearchTool(vectorStoreId, allowCrm));
    const actions=[];
    const instructions = SYSTEM_PROMPT + (allowCrm ? "" : PUBLIC_CATALOGUE_PROMPT);
    const include = vectorStoreId ? ["file_search_call.results"] : undefined;

    let response=await openaiRequest(OPENAI_API_KEY.value(),{model:route.model,reasoning:{effort:route.effort},instructions,input,tools,tool_choice:"auto",...(include?{include}:{})});
    for(let pass=0;pass<6;pass++){
      const calls=(response.output||[]).filter(x=>x.type==="function_call");if(!calls.length)break;
      const outputs=[];for(const call of calls){const result=await runTool(call,actions,allowCrm);outputs.push({type:"function_call_output",call_id:call.call_id,output:JSON.stringify(result)})}
      response=await openaiRequest(OPENAI_API_KEY.value(),{model:route.model,reasoning:{effort:route.effort},instructions,previous_response_id:response.id,input:outputs,tools,tool_choice:"auto",...(include?{include}:{})});
    }
    const answer=extractText(response)||"Demande traitée.";
    const sources=extractSources(response);
    res.status(200).json({success:true,answer,actions,sources,responseId:response.id||null,documentSearchEnabled:Boolean(vectorStoreId),publicCatalogueFilter:!allowCrm&&Boolean(vectorStoreId),model:route.model,modelTier:route.tier});
  }catch(error){console.error("Jarvis AI:",error);res.status(500).json({success:false,error:String(error?.message||error)});}
});
