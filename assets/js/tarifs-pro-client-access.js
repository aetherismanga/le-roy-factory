import { db } from "./firebase.js";
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PARTNER_NAMES={
  "elios-ceramica":"Elios Ceramica","view-ceramica":"View Ceramica","la-fenice":"La Fenice","reviglass":"Reviglass",
  "biopietra":"Biopietra","petracers":"Petracer's","pecchioli-firenze":"Pecchioli Firenze","bulbo":"Bulbo",
  "randal-pro":"Randal Pro","neobath":"Neobath","koibath":"Koibath","aquahome":"Aquahome","opal":"Opal","bilt":"Bilt"
};
const norm=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const depFromCp=cp=>{const s=String(cp||"").replace(/\s/g,"");if(!/^\d{5}$/.test(s))return"";if(s.startsWith("97")||s.startsWith("98"))return s.slice(0,3);if(s.startsWith("20"))return Number(s)>=20200?"2B":"2A";return s.slice(0,2)};
const clientDep=c=>String(c.departement||depFromCp(c.codePostal||c.code_postal)||"").trim().toUpperCase();

let currentClient=null;

function injectStyles(){
  if(document.getElementById("pro-client-access-style"))return;
  const s=document.createElement("style");s.id="pro-client-access-style";s.textContent=`
    .pro-login-grid{display:grid;grid-template-columns:1fr 140px;gap:.75rem;margin:1.4rem 0}.pro-login-grid input{padding:.8rem 1rem;border:1px solid #d5d0c7;border-radius:8px;font-size:1rem;outline:none}.pro-login-grid input:focus{border-color:#D4AF37;box-shadow:0 0 0 3px rgba(212,175,55,.12)}
    .pro-login-btn{width:100%;padding:.85rem 1rem;border:1px solid #D4AF37;border-radius:8px;background:#111;color:#FFD700;font-weight:800;cursor:pointer}.pro-login-btn:hover{background:#FFD700;color:#111}
    .pro-client-summary{margin-bottom:1.5rem;padding:1rem 1.2rem;background:#fff;border:1px solid #e5dfd2;border-left:4px solid #D4AF37;border-radius:10px;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap}.pro-client-name{font-weight:900;font-size:1.05rem;color:#1A2530}.pro-client-meta{font-size:.82rem;color:#666;margin-top:.2rem}.pro-logout{border:1px solid #ddd3bf;background:#fff;border-radius:8px;padding:.5rem .8rem;font-weight:700;cursor:pointer}.pro-access-note{font-size:.78rem;color:#777;line-height:1.45;margin-top:.7rem}.pro-empty{padding:2rem;text-align:center;background:#fff;border:1px solid #e8e2d5;border-radius:10px;color:#666}
    .pro-locked-card{opacity:.82}.pro-locked-card .pro-info-row:first-of-type{background:#f5f3ef!important}.pro-locked-btn{background:#f3f1ed!important;color:#7a7368!important;border-color:#cfc8bc!important;cursor:pointer!important}.pro-access-badge{display:inline-flex;margin-top:.45rem;padding:.25rem .55rem;border-radius:999px;font-size:.7rem;font-weight:800;background:#f2efe8;color:#70685c;border:1px solid #ddd5c7}.pro-access-badge.allowed{background:#e8f5ed;color:#17623a;border-color:#b8dec6}
    .pro-lock-overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:99999;display:none;align-items:center;justify-content:center;padding:1rem}.pro-lock-dialog{width:min(520px,94vw);background:#fff;border-radius:14px;padding:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,.3);border:1px solid rgba(212,175,55,.45)}.pro-lock-dialog h3{margin:0 0 .6rem;color:#1A2530}.pro-lock-dialog p{color:#555;line-height:1.55}.pro-agent-links{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin:1.1rem 0}.pro-agent-link{display:flex;align-items:center;justify-content:center;text-align:center;padding:.8rem;border-radius:9px;background:#111;color:#FFD700!important;text-decoration:none;font-weight:800;border:1px solid #D4AF37}.pro-agent-link:hover{background:#FFD700;color:#111!important}.pro-lock-close{width:100%;padding:.7rem;border-radius:8px;border:1px solid #d8d1c5;background:#fff;font-weight:700;cursor:pointer}
    @media(max-width:600px){.pro-login-grid{grid-template-columns:1fr}.pro-agent-links{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

function ensureLockModal(){
  if(document.getElementById("pro-lock-overlay"))return;
  const ov=document.createElement("div");ov.id="pro-lock-overlay";ov.className="pro-lock-overlay";ov.innerHTML=`<div class="pro-lock-dialog"><h3>🔒 Tarif non accessible</h3><p id="pro-lock-message">Pour accéder au tarif veuillez contacter votre agent.</p><div class="pro-agent-links"><a id="pro-mail-jerome" class="pro-agent-link" href="mailto:jerome@leroyfactory.fr">✉ Jérôme</a><a id="pro-mail-coryne" class="pro-agent-link" href="mailto:coryne@leroyfactory.fr">✉ Coryne</a></div><button type="button" id="pro-lock-close" class="pro-lock-close">Fermer</button></div>`;document.body.appendChild(ov);
  ov.querySelector("#pro-lock-close").onclick=()=>ov.style.display="none";
  ov.addEventListener("click",e=>{if(e.target===ov)ov.style.display="none"});
}

function showLockedPartner(partnerName){
  ensureLockModal();
  const ov=document.getElementById("pro-lock-overlay");
  const code=currentClient?.codeClient||"";
  const societe=currentClient?.societe||"Client professionnel";
  const subject=`Demande d'accès tarif ${partnerName} - ${code}`;
  const body=`Bonjour,\n\nJe souhaite accéder au tarif ${partnerName}.\nSociété : ${societe}\nIdentifiant client : ${code}\nDépartement : ${clientDep(currentClient||{})}\n\nMerci.`;
  const mail=`?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.getElementById("pro-lock-message").innerHTML=`Pour accéder au tarif <strong>${esc(partnerName)}</strong>, veuillez contacter votre agent.`;
  document.getElementById("pro-mail-jerome").href=`mailto:jerome@leroyfactory.fr${mail}`;
  document.getElementById("pro-mail-coryne").href=`mailto:coryne@leroyfactory.fr${mail}`;
  ov.style.display="flex";
}

function replaceLogin(){
  const box=document.getElementById("login-section");if(!box)return;
  box.innerHTML=`<h2 style="font-size:1.75rem;margin-bottom:.6rem;color:#1A2530">Accès professionnel</h2><p style="color:#666;font-size:.95rem">Saisissez votre identifiant client LRF et votre département.</p><div class="pro-login-grid"><input id="pro-lrf-code" type="text" inputmode="text" autocomplete="off" placeholder="LRF-00235"><input id="pro-dept" type="text" inputmode="text" autocomplete="off" placeholder="Département (ex. 34)"></div><button id="pro-client-login" class="pro-login-btn" type="button">Accéder à mes tarifs</button><p id="pro-client-error" style="display:none;color:#b42318;margin-top:1rem;font-size:.85rem;font-weight:700"></p><p class="pro-access-note">Les partenaires sont tous visibles. Les tarifs sont accessibles uniquement pour les partenaires associés à votre compte professionnel.</p>`;
  box.querySelector("#pro-lrf-code").addEventListener("input",e=>{let v=e.target.value.toUpperCase().replace(/\s/g,"");if(/^\d{1,5}$/.test(v))v=`LRF-${v.padStart(5,"0")}`;e.target.value=v});
  box.querySelector("#pro-client-login").addEventListener("click",authenticate);
  box.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter")authenticate()}));
}

async function authenticate(){
  const code=String(document.getElementById("pro-lrf-code")?.value||"").trim().toUpperCase();
  const dep=String(document.getElementById("pro-dept")?.value||"").trim().toUpperCase();
  const err=document.getElementById("pro-client-error");
  if(err){err.style.display="none";err.textContent=""}
  if(!/^LRF-\d{5}$/.test(code)||!dep){showError("Vérifiez l'identifiant LRF et le département.");return}
  try{
    const snap=await getDocs(query(collection(db,"clients"),where("codeClient","==",code),limit(2)));
    if(snap.empty){showError("Identifiant client inconnu.");return}
    const d=snap.docs[0];const client={id:d.id,...d.data()};
    if(String(client.type||"client").toLowerCase()==="prospect"){showError("Cet accès est réservé aux clients professionnels actifs.");return}
    if(clientDep(client)!==dep){showError("Le département ne correspond pas à ce compte client.");return}
    sessionStorage.setItem("lrfProSession",JSON.stringify({code,dep,id:client.id}));
    openForClient(client);
  }catch(e){console.error(e);showError("Impossible de vérifier le compte pour le moment.")}
}
function showError(msg){const e=document.getElementById("pro-client-error");if(e){e.textContent=msg;e.style.display="block"}}

function openForClient(client){
  currentClient=client;
  const partners=[...new Set(Array.isArray(client.partenaires)?client.partenaires:[])];
  const allowedNames=new Set(partners.map(p=>norm(PARTNER_NAMES[p]||p)));
  const login=document.getElementById("login-section"),content=document.getElementById("pro-content");if(login)login.style.display="none";if(content)content.style.display="block";
  if(typeof window.renderTarifs==="function")window.renderTarifs();
  const grid=document.getElementById("grid-tarifs");if(!grid)return;

  [...grid.children].forEach(card=>{
    card.style.display="flex";
    const partnerName=card.querySelector("h3")?.textContent?.trim()||"ce partenaire";
    const allowed=allowedNames.has(norm(partnerName));
    card.classList.toggle("pro-locked-card",!allowed);
    let badge=card.querySelector(".pro-access-badge");
    if(!badge){badge=document.createElement("span");badge.className="pro-access-badge";card.querySelector("h3")?.insertAdjacentElement("afterend",badge)}
    badge.className=`pro-access-badge${allowed?" allowed":""}`;
    badge.textContent=allowed?"✓ Tarif accessible":"🔒 Tarif sur demande";

    card.querySelectorAll('a[href]').forEach(a=>{
      const href=a.getAttribute('href')||"";
      const isTariff=a.textContent.trim().toLowerCase().includes("tarif")||/\.pdf($|\?)/i.test(href)||href.startsWith("mailto:");
      if(!isTariff)return;
      if(allowed){
        a.classList.remove("pro-locked-btn");
        a.onclick=null;
      }else{
        a.classList.add("pro-locked-btn");
        a.removeAttribute("target");
        a.onclick=e=>{e.preventDefault();e.stopPropagation();showLockedPartner(partnerName)};
      }
    });
  });

  let summary=document.getElementById("pro-client-summary");if(!summary){summary=document.createElement("div");summary.id="pro-client-summary";summary.className="pro-client-summary";content.insertBefore(summary,grid)}
  const activity=client.categorieActivite||client.sousCategorie||client.segmentation||"Professionnel";
  summary.innerHTML=`<div><div class="pro-client-name">${esc(client.societe||"Client professionnel")}</div><div class="pro-client-meta">${esc(client.codeClient||"")} · Département ${esc(clientDep(client))} · ${esc(activity)} · ${partners.length} partenaire(s) avec accès tarif</div></div><button type="button" class="pro-logout" id="pro-logout">Changer de compte</button>`;
  summary.querySelector("#pro-logout").onclick=()=>{sessionStorage.removeItem("lrfProSession");location.reload()};

  window.LRF_PRO_CONTEXT={codeClient:client.codeClient,clientId:client.id,departement:clientDep(client),activite:activity,partenaires:partners};
}

async function restore(){
  try{const s=JSON.parse(sessionStorage.getItem("lrfProSession")||"null");if(!s?.code)return;const snap=await getDocs(query(collection(db,"clients"),where("codeClient","==",s.code),limit(1)));if(!snap.empty){const d=snap.docs[0];const c={id:d.id,...d.data()};if(clientDep(c)===s.dep)openForClient(c)}}catch(e){console.warn("Session PRO non restaurée",e)}
}

function init(){injectStyles();ensureLockModal();replaceLogin();restore()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
