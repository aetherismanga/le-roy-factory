const FUNCTION_BASE = "https://us-central1-le-roy-factory.cloudfunctions.net";
const SESSION_KEY = "lrfProSecureSession";

const PARTNERS = [
  {slug:"elios-ceramica",name:"Elios Ceramica",country:"Italie",logo:"elios.png",description:"Céramique italienne décorative et solutions pour les projets professionnels.",files:[{key:"tarif-2026",title:"Grille Tarifaire 2026",description:"Tarif professionnel officiel."}]},
  {slug:"view-ceramica",name:"View Ceramica",country:"Italie",logo:"view.png",description:"Collections céramiques contemporaines pour l'aménagement intérieur et extérieur.",files:[{key:"tarif-2026",title:"Grille Tarifaire 2026",description:"Tarif professionnel officiel."}]},
  {slug:"la-fenice",name:"La Fenice",country:"Italie",logo:"lafenice.png",description:"Solutions céramiques italiennes pour les projets résidentiels et professionnels.",files:[{key:"tarif-2026",title:"Grille Tarifaire 2026",description:"Tarif professionnel officiel."}]},
  {slug:"reviglass",name:"Reviglass",country:"Espagne",logo:"reviglass.png",description:"Mosaïque en verre recyclé pour piscine, salle de bain et décoration.",files:[{key:"tarif-2026",title:"Grille Tarifaire 2026",description:"Tarif professionnel officiel."}]},
  {slug:"biopietra",name:"Biopietra",country:"Italie",logo:"biopietra.png",description:"Parements et solutions décoratives en pierre reconstituée.",files:[{key:"tarif-2026",title:"Catalogue & Tarifs 2026",description:"Documentation et tarifs professionnels."},{key:"codes-prix",title:"Codes prix",description:"Grille des codes prix Biopietra."}]},
  {slug:"petracers",name:"Petracer's",country:"Italie",logo:"petracer.png",description:"Céramique décorative haut de gamme et collections de caractère.",files:[{key:"tarif",title:"Grille Tarifaire",description:"Tarif professionnel."}]},
  {slug:"pecchioli-firenze",name:"Pecchioli Firenze",country:"Italie",logo:"pecchioli.png",description:"Céramique artisanale et décorative issue de la tradition florentine.",files:[{key:"tarif",title:"Grille Tarifaire",description:"Tarif professionnel."}]},
  {slug:"bulbo",name:"Bulbo",country:"Italie",logo:"bulbo.png",description:"Créations céramiques décoratives et design contemporain.",files:[{key:"tarif-2026",title:"Grille Tarifaire 2026",description:"Tarif professionnel officiel."}]},
  {slug:"randal-pro",name:"Randal Pro",country:"Espagne",logo:"randal.png",description:"Mobilier de salle de bain et solutions de configuration sur mesure.",files:[{key:"tarif",title:"Grille Tarifaire",description:"Tarif mobilier professionnel."}]},
  {slug:"neobath",name:"Neobath",country:"Salle de bain",logo:"neobath.png",description:"Mobilier et collections pour l'univers de la salle de bain.",files:[{key:"anima",title:"Collection Anima",description:"Tarifs de la collection Anima."},{key:"dna",title:"Collection DNA",description:"Tarifs de la collection DNA."}]},
  {slug:"koibath",name:"Koibath",country:"Espagne",logo:"koibath.png",description:"Solutions et équipements contemporains pour la salle de bain.",files:[]},
  {slug:"aquahome",name:"Aquahome",country:"Robinetterie",logo:"aquahome.png",description:"Robinetterie et équipements pour les projets salle de bain.",files:[{key:"tarif",title:"Grille Tarifaire",description:"Tarif professionnel."}]},
  {slug:"opal",name:"Opal",country:"Miroirs",logo:"opal.png",description:"Miroirs décoratifs et lumineux pour l'univers de la salle de bain.",files:[]},
  {slug:"bilt",name:"Bilt",country:"Espagne",logo:"bilt.png",description:"Systèmes de nivellement et accessoires professionnels pour la pose.",files:[{key:"tarif",title:"Grille Tarifaire",description:"Tarif systèmes de nivellement et accessoires."}]}
];

let challengeId = "";
let pendingIdentity = "";
let maskedEmail = "";

const esc = value => String(value || "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;");

function canonicalPartner(value) {
  const raw = String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  for (const partner of PARTNERS) {
    const slug = partner.slug.replace(/[^a-z0-9]/g,"");
    const name = partner.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
    if (raw === slug || raw === name) return partner.slug;
  }
  return String(value || "").trim();
}

function readSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!value?.sessionToken || !value?.expiresAt || !value?.client) return null;
    if (new Date(value.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return value;
  } catch (_) {
    return null;
  }
}

function saveSession(result) {
  const session = { sessionToken: result.sessionToken, expiresAt: result.expiresAt, client: result.client };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  window.LRF_PRO_CONTEXT = null;
}

async function api(functionName, payload) {
  const response = await fetch(`${FUNCTION_BASE}/${functionName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    const error = new Error(result.error || "Service momentanément indisponible.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function injectStyles() {
  if (document.getElementById("pro-secure-access-style")) return;
  const style = document.createElement("style");
  style.id = "pro-secure-access-style";
  style.textContent = `
    .pro-login-grid{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:.75rem;margin:1.4rem 0}.pro-login-grid input,.pro-otp-input{padding:.85rem 1rem;border:1px solid #d5d0c7;border-radius:9px;font-size:1rem;outline:none;background:#fff;box-sizing:border-box}.pro-login-grid input:focus,.pro-otp-input:focus{border-color:#D4AF37;box-shadow:0 0 0 3px rgba(212,175,55,.13)}
    .pro-login-btn{width:100%;padding:.9rem 1rem;border:1px solid #D4AF37;border-radius:9px;background:#111;color:#FFD700;font-weight:850;cursor:pointer;transition:.2s}.pro-login-btn:hover:not(:disabled){background:#FFD700;color:#111}.pro-login-btn:disabled{opacity:.6;cursor:wait}.pro-secondary-btn{border:1px solid #d8d1c5;background:#fff;color:#1A2530;border-radius:8px;padding:.68rem .8rem;font-weight:800;cursor:pointer}.pro-secondary-btn:disabled{opacity:.55;cursor:wait}
    .pro-access-note{font-size:.8rem;color:#777;line-height:1.5;margin-top:.8rem}.pro-error{display:none;color:#b42318;margin-top:1rem;font-size:.86rem;font-weight:750;background:#fff2f0;border:1px solid #f5c2bd;padding:.7rem .85rem;border-radius:8px}.pro-success{display:none;color:#17623a;margin-top:1rem;font-size:.85rem;font-weight:750;background:#eaf7ef;border:1px solid #b8dec6;padding:.7rem .85rem;border-radius:8px}
    .pro-otp-box{display:none;margin-top:1rem;padding:1rem;border:1px solid #e2d9c5;border-radius:10px;background:#fffdf7;text-align:left}.pro-otp-box.active{display:block}.pro-otp-box p{margin:0 0 .7rem;color:#5d574e;font-size:.84rem;line-height:1.5}.pro-otp-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem}.pro-otp-input{text-align:center;letter-spacing:.25em;font-size:1.15rem;font-weight:900}.pro-resend-row{display:flex;justify-content:space-between;gap:.6rem;align-items:center;margin-top:.65rem;flex-wrap:wrap}.pro-resend-row small{color:#777}
    .pro-client-summary{margin-bottom:1.5rem;padding:1rem 1.2rem;background:#fff;border:1px solid #e5dfd2;border-left:4px solid #D4AF37;border-radius:12px;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;box-shadow:0 5px 18px rgba(0,0,0,.035)}.pro-client-name{font-weight:900;font-size:1.08rem;color:#1A2530}.pro-client-meta{font-size:.8rem;color:#666;margin-top:.25rem}.pro-logout{border:1px solid #d8d1c5;background:#fff;border-radius:8px;padding:.55rem .85rem;font-weight:750;cursor:pointer}
    .pro-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1.35rem}.pro-card{position:relative;background:#fff;border:1px solid #e8e3d9;border-radius:13px;padding:1.35rem;box-shadow:0 5px 18px rgba(0,0,0,.035);display:flex;flex-direction:column;min-height:265px}.pro-card.locked{opacity:.82}.pro-logo{position:absolute;right:1.2rem;top:1.15rem;width:92px;height:44px;object-fit:contain;object-position:right center}.pro-country{font-size:.69rem;text-transform:uppercase;letter-spacing:.1em;color:#708273;font-weight:800}.pro-card h3{font-size:1.12rem;color:#1A2530;margin:.42rem 105px .65rem 0}.pro-description{font-size:.84rem;color:#5b5b5b;line-height:1.5;margin:0 0 1rem}.pro-badge{display:inline-flex;align-self:flex-start;border-radius:999px;padding:.3rem .58rem;font-size:.68rem;font-weight:850;margin-bottom:.85rem;background:#f2efe8;color:#6e675d;border:1px solid #ddd5c7}.pro-badge.allowed{background:#e8f5ed;color:#17623a;border-color:#b8dec6}
    .pro-files{display:flex;flex-direction:column;gap:.62rem;margin-top:auto}.pro-file-row{display:flex;justify-content:space-between;gap:.75rem;align-items:center;padding:.7rem .75rem;background:#F8F6F2;border-radius:8px;border-left:3px solid #1A2530}.pro-file-title{font-size:.82rem;font-weight:800;color:#1A2530}.pro-file-desc{font-size:.7rem;color:#777;margin-top:2px}.pro-file-btn{border:1px solid #D4AF37;background:#111;color:#FFD700;border-radius:7px;padding:.48rem .65rem;font-size:.72rem;font-weight:800;cursor:pointer;white-space:nowrap}.pro-file-btn:hover:not(:disabled){background:#D4AF37;color:#111}.pro-file-btn:disabled{opacity:.55;cursor:wait}.pro-request-btn{display:inline-flex;justify-content:center;align-items:center;text-decoration:none;border:1px solid #d8d1c5;background:#fff;color:#1A2530;border-radius:8px;padding:.65rem .8rem;font-size:.78rem;font-weight:800}.pro-security-strip{display:flex;align-items:center;justify-content:center;gap:.45rem;font-size:.74rem;color:#667085;margin-top:1rem}
    @media(max-width:600px){.pro-login-grid,.pro-otp-row{grid-template-columns:1fr}.pro-grid{grid-template-columns:1fr}.pro-card h3{margin-right:90px}}
  `;
  document.head.appendChild(style);
}

function loginMarkup() {
  return `
    <h2 style="font-size:1.75rem;margin-bottom:.55rem;color:#1A2530">Accès professionnel</h2>
    <p style="color:#666;font-size:.95rem;line-height:1.55">Saisissez votre identifiant client LRF et votre département. Un code de sécurité sera envoyé à l’e-mail déjà enregistré sur votre compte.</p>
    <div class="pro-login-grid">
      <input id="pro-lrf-code" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" placeholder="LRF-00235" aria-label="Identifiant client LRF">
      <input id="pro-dept" type="text" inputmode="text" autocomplete="off" maxlength="3" placeholder="Département (34)" aria-label="Département">
    </div>
    <button id="pro-client-login" class="pro-login-btn" type="button">Recevoir mon code sécurisé</button>
    <div id="pro-client-error" class="pro-error" role="alert"></div>
    <div id="pro-client-success" class="pro-success" role="status"></div>
    <div id="pro-otp-box" class="pro-otp-box">
      <p id="pro-otp-text"></p>
      <div class="pro-otp-row">
        <input id="pro-otp-code" class="pro-otp-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="Code de vérification à 6 chiffres">
        <button id="pro-verify-code" class="pro-login-btn" type="button">Vérifier</button>
      </div>
      <div class="pro-resend-row"><small>Le code expire après quelques minutes.</small><button id="pro-resend-code" class="pro-secondary-btn" type="button">Renvoyer le code</button></div>
    </div>
    <p class="pro-access-note">Après vérification, seuls les partenaires rattachés à votre compte donnent accès à un tarif. Les liens de consultation expirent automatiquement.</p>
    <div class="pro-security-strip">🔒 Double vérification + accès contrôlé côté serveur</div>`;
}

function currentIdentity() {
  const code = String(document.getElementById("pro-lrf-code")?.value || "").trim().toUpperCase();
  const departement = String(document.getElementById("pro-dept")?.value || "").trim().toUpperCase();
  return { code, departement, key:`${code}|${departement}` };
}

function resetChallenge() {
  challengeId = "";
  pendingIdentity = "";
  maskedEmail = "";
  const otpBox = document.getElementById("pro-otp-box");
  otpBox?.classList.remove("active");
  const otp = document.getElementById("pro-otp-code");
  if (otp) otp.value = "";
  hideMessage("pro-client-success");
}

function showLogin() {
  const login = document.getElementById("login-section");
  const content = document.getElementById("pro-content");
  if (!login) return;
  login.style.display = "block";
  if (content) content.style.display = "none";
  login.innerHTML = loginMarkup();
  challengeId = "";
  pendingIdentity = "";
  maskedEmail = "";

  const code = login.querySelector("#pro-lrf-code");
  code?.addEventListener("input", event => {
    let value = event.target.value.toUpperCase().replace(/\s/g, "");
    if (/^\d{1,5}$/.test(value)) value = `LRF-${value.padStart(5,"0")}`;
    event.target.value = value;
    resetChallenge();
  });
  login.querySelector("#pro-dept")?.addEventListener("input", event => {
    event.target.value = String(event.target.value || "").toUpperCase().replace(/\s/g, "").slice(0,3);
    resetChallenge();
  });
  login.querySelector("#pro-client-login")?.addEventListener("click", requestVerification);
  login.querySelector("#pro-resend-code")?.addEventListener("click", requestVerification);
  login.querySelector("#pro-verify-code")?.addEventListener("click", verifyAndLogin);
  login.querySelector("#pro-otp-code")?.addEventListener("input", event => { event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0,6); });
  login.querySelectorAll("input").forEach(input => input.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    if (input.id === "pro-otp-code" && challengeId) verifyAndLogin();
    else requestVerification();
  }));
}

function hideMessage(id) {
  const box = document.getElementById(id);
  if (box) box.style.display = "none";
}

function showError(message) {
  const box = document.getElementById("pro-client-error");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
  hideMessage("pro-client-success");
}

function showSuccess(message) {
  const box = document.getElementById("pro-client-success");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
  hideMessage("pro-client-error");
}

function validateIdentity() {
  const identity = currentIdentity();
  if (!/^LRF-\d{5}$/.test(identity.code) || !/^(?:\d{2,3}|2A|2B)$/i.test(identity.departement)) {
    showError("Vérifiez l’identifiant LRF et le département.");
    return null;
  }
  return identity;
}

async function requestVerification() {
  const identity = validateIdentity();
  if (!identity) return;
  const sendButton = document.getElementById("pro-client-login");
  const resendButton = document.getElementById("pro-resend-code");
  hideMessage("pro-client-error");
  try {
    [sendButton,resendButton].forEach(button => { if (button) button.disabled = true; });
    if (sendButton) sendButton.textContent = "Envoi du code…";
    const result = await api("requestClientVerification", {
      purpose: "pro_access",
      codeClient: identity.code,
      departement: identity.departement
    });
    challengeId = result.challengeId;
    pendingIdentity = identity.key;
    maskedEmail = result.maskedEmail || "votre adresse enregistrée";
    const otpText = document.getElementById("pro-otp-text");
    if (otpText) otpText.innerHTML = `Un code à 6 chiffres a été envoyé à <strong>${esc(maskedEmail)}</strong>.`;
    document.getElementById("pro-otp-box")?.classList.add("active");
    showSuccess(`Code envoyé à ${maskedEmail}.`);
    const otp = document.getElementById("pro-otp-code");
    if (otp) { otp.value = ""; otp.focus(); }
  } catch (err) {
    resetChallenge();
    showError(err.message || "Impossible d’envoyer le code de sécurité.");
  } finally {
    [sendButton,resendButton].forEach(button => { if (button) button.disabled = false; });
    if (sendButton) sendButton.textContent = "Recevoir mon code sécurisé";
  }
}

async function verifyAndLogin() {
  const identity = validateIdentity();
  if (!identity) return;
  if (!challengeId || identity.key !== pendingIdentity) {
    showError("Demandez d’abord un nouveau code de sécurité.");
    return;
  }
  const code = String(document.getElementById("pro-otp-code")?.value || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) {
    showError("Saisissez le code à 6 chiffres reçu par e-mail.");
    return;
  }
  const button = document.getElementById("pro-verify-code");
  try {
    if (button) { button.disabled = true; button.textContent = "Vérification…"; }
    const verified = await api("verifyClientVerification", { challengeId, code });
    if (verified.purpose !== "pro_access") throw new Error("Vérification invalide.");
    const result = await api("getProAccessProfile", { verificationToken: verified.verificationToken });
    challengeId = "";
    pendingIdentity = "";
    openForSession(saveSession(result));
  } catch (err) {
    showError(err.message || "Code de vérification incorrect ou expiré.");
  } finally {
    if (button?.isConnected) { button.disabled = false; button.textContent = "Vérifier"; }
  }
}

function requestMail(partner, session) {
  const client = session?.client || {};
  const subject = `Demande d'accès tarif ${partner.name} - ${client.codeClient || ""}`;
  const body = `Bonjour,\n\nJe souhaite accéder au tarif ${partner.name}.\nSociété : ${client.societe || ""}\nIdentifiant client : ${client.codeClient || ""}\nDépartement : ${client.departement || ""}\n\nMerci.`;
  return `mailto:jerome@leroyfactory.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function openTariff(session, partnerSlug, fileKey, button) {
  const old = button?.textContent;
  try {
    if (button) { button.disabled = true; button.textContent = "Ouverture…"; }
    const result = await api("issueProTariffLink", { sessionToken: session.sessionToken, partner: partnerSlug, fileKey });
    const popup = window.open(result.url, "_blank", "noopener,noreferrer");
    if (!popup) location.href = result.url;
  } catch (err) {
    if (err.status === 401) {
      clearSession();
      showLogin();
      showError("Votre session professionnelle a expiré. Reconnectez-vous.");
      return;
    }
    alert(`Impossible d’ouvrir le tarif : ${err.message}`);
  } finally {
    if (button?.isConnected) { button.disabled = false; button.textContent = old || "Consulter"; }
  }
}

function cardMarkup(partner, allowed, session) {
  const files = allowed && partner.files.length
    ? partner.files.map(file => `
      <div class="pro-file-row">
        <div><div class="pro-file-title">${esc(file.title)}</div><div class="pro-file-desc">${esc(file.description)}</div></div>
        <button type="button" class="pro-file-btn" data-partner="${esc(partner.slug)}" data-file="${esc(file.key)}">Consulter</button>
      </div>`).join("")
    : `<a class="pro-request-btn" href="${requestMail(partner, session)}">✉ Demander l’accès à votre agent</a>`;

  return `<article class="pro-card${allowed ? "" : " locked"}">
    <img class="pro-logo" src="assets/img/${esc(partner.logo)}" alt="" loading="lazy" onerror="this.style.display='none'">
    <span class="pro-country">${esc(partner.country)}</span>
    <h3>${esc(partner.name)}</h3>
    <p class="pro-description">${esc(partner.description)}</p>
    <span class="pro-badge${allowed ? " allowed" : ""}">${allowed ? "✓ Accès autorisé" : "🔒 Tarif sur demande"}</span>
    <div class="pro-files">${files}</div>
  </article>`;
}

function openForSession(session) {
  const login = document.getElementById("login-section");
  const content = document.getElementById("pro-content");
  const grid = document.getElementById("grid-tarifs");
  if (!content || !grid) return;

  const client = session.client || {};
  const allowed = new Set((client.partenaires || []).map(canonicalPartner));
  window.LRF_PRO_CONTEXT = { ...client, expiresAt: session.expiresAt };
  if (login) login.style.display = "none";
  content.style.display = "block";

  let summary = document.getElementById("pro-client-summary");
  if (!summary) {
    summary = document.createElement("div");
    summary.id = "pro-client-summary";
    summary.className = "pro-client-summary";
    content.insertBefore(summary, grid);
  }
  summary.innerHTML = `<div><div class="pro-client-name">${esc(client.societe || "Client professionnel")}</div><div class="pro-client-meta">${esc(client.codeClient || "")} · Département ${esc(client.departement || "")} · ${esc(client.activite || "Professionnel")} · ${allowed.size} partenaire(s) autorisé(s)</div></div><button type="button" class="pro-logout" id="pro-logout">Se déconnecter</button>`;
  summary.querySelector("#pro-logout")?.addEventListener("click", () => { clearSession(); summary.remove(); showLogin(); });

  grid.className = "pro-grid";
  grid.innerHTML = PARTNERS.map(partner => cardMarkup(partner, allowed.has(partner.slug), session)).join("");
  grid.querySelectorAll(".pro-file-btn").forEach(button => {
    button.addEventListener("click", () => openTariff(session, button.dataset.partner, button.dataset.file, button));
  });
}

function init() {
  injectStyles();
  const session = readSession();
  if (session) openForSession(session);
  else showLogin();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
