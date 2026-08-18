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
Tu es JARVIS, l'intelligence métier centrale de LE ROY FACTORY. Tu parles français naturellement, avec des réponses courtes, précises et adaptées à un commercial en déplacement.

Tu es expert professionnel en carrelage/céramique (grès cérame, faïence, pâte blanche, rectifié, formats, épaisseurs, finitions, effets bois/pierre/marbre/béton, antidérapance, terrasse, piscine, pose), mobilier de salle de bain, vasques/plans, robinetterie, douche, sanitaires, miroirs et accessoires.

Partenaires LE ROY FACTORY : Elios Ceramica, View Ceramica, La Fenice, Reviglass, Biopietra, Petracer's, Pecchioli Firenze, Bulbo, Randal Pro, Neobath, Koibath, Aquahome, Opal et Bilt.

Règles absolues :
- Tu peux expliquer librement les connaissances générales métier.
- Pour un PRIX, une RÉFÉRENCE fabricant, une DISPONIBILITÉ, une DIMENSION/COLORIS réellement proposé ou un NUMÉRO DE PAGE catalogue LE ROY FACTORY, n'invente jamais : utilise File Search quand disponible.
- Si les documents ne confirment pas une donnée précise, dis que tu ne la trouves pas dans les documents indexés.
- Quand une donnée documentaire est trouvée, donne le document source et la page/passage si disponible.
- Les informations clients viennent des outils CRM.
- Tu conserves le contexte conversationnel : "ses tarifs", "ce client", "celui-là", etc.
- Si l'utilisateur demande d'ouvrir une partie de l'application, utilise open_app_page au lieu de seulement expliquer comment y aller.
- Si l'utilisateur demande de préparer/envoyer un mail groupé avec tarif/catalogue, utilise prepare_group_mail. L'envoi réel exige toujours validation humaine dans l'application.
- Pour trouver ou ouvrir un client, utilise d'abord search_clients ; si un résultat est clairement le bon, utilise open_app_page avec page=client et clientId.
- Tu peux utiliser le web pour les informations actuelles externes (météo, réglementation, etc.).
`;

function normalize(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

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

const FUNCTION_TOOLS=[
  {type:"function",name:"search_clients",description:"Recherche clients/prospects dans le CRM par nom, ville, activité, partenaire ou département.",parameters:{type:"object",properties:{query:{type:"string"},departement:{type:"string"},type:{type:"string",enum:["client","prospect"]},limit:{type:"integer",minimum:1,maximum:25}},additionalProperties:false}},
  {type:"function",name:"get_client",description:"Lit une fiche client précise à partir de son identifiant Firestore.",parameters:{type:"object",properties:{id:{type:"string"}},required:["id"],additionalProperties:false}},
  {type:"function",name:"open_app_page",description:"Ouvre directement une page ou une fiche dans l'application LE ROY FACTORY.",parameters:{type:"object",properties:{page:{type:"string",enum:["clients","client","agenda","carte","statistiques","comptes-rendus","mails","tarifs","catalogues","partenaires"]},partner:{type:"string",description:"Clé partenaire si utile : elios, view, lafenice, reviglass, biopietra, bulbo, randal, neobath, petracer, pecchioli, koibath, aquahome, opal, bilt."},clientId:{type:"string"}},required:["page"],additionalProperties:false}},
  {type:"function",name:"prepare_group_mail",description:"Prépare l'écran de mail groupé avec filtres et document partenaire. Ne réalise jamais l'envoi final.",parameters:{type:"object",properties:{partner:{type:"string"},year:{type:"string"},departement:{type:"string"},recipientType:{type:"string",enum:["client","prospect"]},documentType:{type:"string",enum:["tarif","catalogue","autre"]}},required:["partner"],additionalProperties:false}}
];

async function runTool(call, actions) {
  let args={}; try{args=JSON.parse(call.arguments||"{}")}catch(_){}
  if(call.name==="search_clients")return searchClients(args);
  if(call.name==="get_client")return getClient(args);
  if(call.name==="open_app_page"){actions.push({type:"open_app_page",...args});return {ok:true,action_queued:true};}
  if(call.name==="prepare_group_mail"){actions.push({type:"prepare_group_mail",...args});return {ok:true,action_queued:true,requires_final_confirmation:true};}
  return {error:`Outil inconnu: ${call.name}`};
}

async function openaiRequest(apiKey,body){const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error?.message||`OpenAI HTTP ${r.status}`);return data;}
function extractText(response){if(typeof response?.output_text==="string"&&response.output_text.trim())return response.output_text.trim();const parts=[];for(const item of response?.output||[]){if(item.type!=="message")continue;for(const c of item.content||[])if(c.type==="output_text"&&c.text)parts.push(c.text)}return parts.join("\n").trim();}

exports.jarvisAi=onRequest({secrets:[OPENAI_API_KEY],timeoutSeconds:120,memory:"1GiB"},async(req,res)=>{
  if(cors(req,res))return; if(req.method!=="POST")return res.status(405).json({success:false,error:"Méthode non autorisée"});
  try{
    const body=req.body||{}, message=String(body.message||"").trim(); if(!message)return res.status(400).json({success:false,error:"Message manquant"});
    const history=Array.isArray(body.history)?body.history.slice(-16):[]; const input=history.filter(x=>x&&(x.user||x.assistant)).flatMap(x=>{const a=[];if(x.user)a.push({role:"user",content:String(x.user)});if(x.assistant)a.push({role:"assistant",content:String(x.assistant)});return a}); input.push({role:"user",content:message});
    const vectorStoreId=String(process.env.JARVIS_VECTOR_STORE_ID||"").trim(); const tools=[...FUNCTION_TOOLS,{type:"web_search"}]; if(vectorStoreId)tools.push({type:"file_search",vector_store_ids:[vectorStoreId],max_num_results:8});
    const model=process.env.JARVIS_MODEL||"gpt-5-pro"; const actions=[];
    let response=await openaiRequest(OPENAI_API_KEY.value(),{model,reasoning:{effort:"high"},instructions:SYSTEM_PROMPT,input,tools,tool_choice:"auto"});
    for(let pass=0;pass<6;pass++){const calls=(response.output||[]).filter(x=>x.type==="function_call");if(!calls.length)break;const outputs=[];for(const call of calls){const result=await runTool(call,actions);outputs.push({type:"function_call_output",call_id:call.call_id,output:JSON.stringify(result)})}response=await openaiRequest(OPENAI_API_KEY.value(),{model,reasoning:{effort:"high"},instructions:SYSTEM_PROMPT,previous_response_id:response.id,input:outputs,tools,tool_choice:"auto"});}
    const answer=extractText(response)||"Demande traitée.";
    res.status(200).json({success:true,answer,actions,responseId:response.id||null,documentSearchEnabled:Boolean(vectorStoreId),model});
  }catch(error){console.error("Jarvis AI:",error);res.status(500).json({success:false,error:String(error?.message||error)});}
});