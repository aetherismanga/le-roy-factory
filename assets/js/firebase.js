import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import "./carte-mobile-enhancements.js?v=20260818-1425";
import "./carte-proximity.js?v=20260818-1448";
import "./jarvis-web.js?v=20260825-1200";

const firebaseConfig = {
  apiKey: "AIzaSyAiUk5Ua8kF" + "cCUrSqLihiLshHnhA4rm2Is",
  authDomain: "le-roy-factory.firebaseapp.com",
  projectId: "le-roy-factory",
  storageBucket: "le-roy-factory.appspot.com",
  messagingSenderId: "249878619253",
  appId: "1:249878619253:web:05f051710b6251dbfa843c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const AGENT_PROFILES = {
  "jerome@leroyfactory.fr": { name: "Jérôme Hugol", role: "admin" },
  "coryne@leroyfactory.fr": { name: "Coryne", role: "agent" }
};

const PROTECTED_CRM_PAGES = new Set([
  "dashboard.html",
  "clients.html",
  "agenda.html",
  "comptes-rendus.html",
  "nouveau-compte-rendu.html",
  "mails-groupes.html",
  "carte.html",
  "statistiques.html",
  "demandes-clients.html"
]);

const AGENT_ONLY_FUNCTIONS = new Set([
  "sendGroupEmail",
  "scheduleGroupEmail",
  "getAccountRequestAttachment",
  "sendAccountPartnerMail"
]);

const OPTIONAL_AUTH_FUNCTIONS = new Set(["jarvisAi"]);

function normalizedEmail(user) {
  return String(user?.email || "").trim().toLowerCase();
}

export function agentProfile(user = auth.currentUser) {
  return AGENT_PROFILES[normalizedEmail(user)] || null;
}

function syncLegacySession(user) {
  const profile = agentProfile(user);
  if (!user || !profile) {
    localStorage.removeItem("agentLoggedIn");
    localStorage.removeItem("agentName");
    localStorage.removeItem("agentEmail");
    localStorage.removeItem("agentRole");
    return;
  }
  localStorage.setItem("agentLoggedIn", "true");
  localStorage.setItem("agentName", profile.name);
  localStorage.setItem("agentEmail", normalizedEmail(user));
  localStorage.setItem("agentRole", profile.role);
}

export const authReady = new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(auth, user => {
    syncLegacySession(user);
    unsubscribe();
    resolve(user);
  });
});

export async function requireAgentSession({ redirect = true } = {}) {
  const user = auth.currentUser || await authReady;
  const profile = agentProfile(user);
  if (user && profile) return user;
  syncLegacySession(null);
  if (redirect) {
    const next = encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash);
    location.replace(`agent.html?next=${next}`);
  }
  return null;
}

export async function getAgentToken({ required = true } = {}) {
  const user = required ? await requireAgentSession({ redirect: false }) : (auth.currentUser || await authReady);
  if (!user) {
    if (required) throw new Error("Connexion agent requise.");
    return "";
  }
  if (required && !agentProfile(user)) throw new Error("Compte agent non autorisé.");
  return user.getIdToken();
}

export async function authFetch(url, options = {}, { required = true } = {}) {
  const token = await getAgentToken({ required });
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

function functionNameFromUrl(value) {
  try {
    const u = new URL(String(value), location.href);
    if (!/\.cloudfunctions\.net$/i.test(u.hostname)) return "";
    return u.pathname.split("/").filter(Boolean).pop() || "";
  } catch (_) {
    return "";
  }
}

const nativeFetch = window.fetch.bind(window);
window.fetch = async function securedFetch(input, init = {}) {
  const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : String(input?.url || "");
  const fn = functionNameFromUrl(rawUrl);
  const shouldRequireAuth = AGENT_ONLY_FUNCTIONS.has(fn);
  const shouldAttachIfAvailable = shouldRequireAuth || OPTIONAL_AUTH_FUNCTIONS.has(fn);

  if (!shouldAttachIfAvailable) return nativeFetch(input, init);

  const user = auth.currentUser || await authReady;
  const profile = agentProfile(user);
  if (shouldRequireAuth && (!user || !profile)) {
    syncLegacySession(null);
    throw new Error("Votre session a expiré. Reconnectez-vous à l’espace Agent.");
  }

  if (!user || !profile) return nativeFetch(input, init);
  const token = await user.getIdToken();
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
  headers.set("Authorization", `Bearer ${token}`);

  if (input instanceof Request) {
    const request = new Request(input, { ...init, headers });
    return nativeFetch(request);
  }
  return nativeFetch(input, { ...init, headers });
};

async function enforceCrmAuthentication() {
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!PROTECTED_CRM_PAGES.has(page) && !document.body?.classList.contains("crm-body")) return;
  await requireAgentSession({ redirect: true });
}

async function secureLogout(event) {
  const button = event.target.closest("#logout-btn, .btn-logout-sidebar, [data-lrf-logout]");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { await signOut(auth); } catch (error) { console.warn("Déconnexion Firebase:", error); }
  syncLegacySession(null);
  location.replace("agent.html?logout=1");
}

document.addEventListener("click", secureLogout, true);

function ensureMobileCss() {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  const old = document.getElementById("lrf-mobile-enhancements");
  if (old) old.remove();
  const link = document.createElement("link");
  link.id = "lrf-mobile-enhancements";
  link.rel = "stylesheet";
  link.href = "assets/css/mobile-enhancements.css?v=20260817-2008";
  document.head.appendChild(link);
}
ensureMobileCss();

document.addEventListener("click", e => {
  const link = e.target.closest(".sidebar-menu a");
  if (!link) return;
  const label = (link.textContent || "").toLowerCase();
  if (label.includes("statistiques")) {
    e.preventDefault();
    window.location.href = "statistiques.html";
  }
}, true);

const currentPage = window.location.pathname.toLowerCase();
import("./account-requests-nav.js?v=20260825-1200").catch(err => console.error("Erreur chargement navigation demandes clients :", err));
if (currentPage.endsWith("clients.html")) {
  import("./client-direct-email.js?v=20260825-1200").catch(err => console.error("Erreur chargement module e-mail client :", err));
  import("./crm-moovago.js?v=20260817-1845").catch(err => console.error("Erreur chargement module CRM Moovago :", err));
  import("./crm-client-enhancements.js?v=20260817-1845").catch(err => console.error("Erreur chargement améliorations Clients :", err));
  import("./crm-ui-modern.js?v=20260817-1845").catch(err => console.error("Erreur chargement interface moderne CRM :", err));
  import("./clients-operations.js?v=20260817-1845").catch(err => console.error("Erreur chargement outils opérationnels Clients :", err));
  import("./client-codes.js?v=20260817-1845").catch(err => console.error("Erreur chargement codes clients LRF :", err));
  import("./clients-export.js?v=20260817-1845").catch(err => console.error("Erreur chargement impression/export clients :", err));
  import("./account-form-send.js?v=20260825-1200").catch(err => console.error("Erreur chargement envoi formulaire ouverture/mise à jour :", err));
}
if (currentPage.endsWith("dashboard.html")) {
  import("./dashboard-commercial.js?v=20260817-1845").catch(err => console.error("Erreur chargement dashboard commercial :", err));
}
if (currentPage.endsWith("mails-groupes.html")) {
  import("./mails-groupes-programmation.js?v=20260825-1200").catch(err => console.error("Erreur chargement mails programmés :", err));
}

function initCrmMobile() {
  if (!window.matchMedia("(max-width: 900px)").matches || !document.body.classList.contains("crm-body")) return;
  const sidebar = document.querySelector(".crm-sidebar");
  if (!sidebar || document.getElementById("crm-mobile-menu-btn")) return;

  const menuBtn = document.createElement("button");
  menuBtn.id = "crm-mobile-menu-btn";
  menuBtn.type = "button";
  menuBtn.setAttribute("aria-label", "Ouvrir le menu CRM");
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.textContent = "☰";

  const backdrop = document.createElement("div");
  backdrop.className = "crm-mobile-backdrop";

  const closeMenu = () => {
    sidebar.classList.remove("mobile-open");
    document.body.classList.remove("crm-menu-open");
    menuBtn.textContent = "☰";
    menuBtn.setAttribute("aria-expanded", "false");
  };
  const openMenu = () => {
    sidebar.classList.add("mobile-open");
    document.body.classList.add("crm-menu-open");
    menuBtn.textContent = "✕";
    menuBtn.setAttribute("aria-expanded", "true");
  };

  menuBtn.addEventListener("click", () => sidebar.classList.contains("mobile-open") ? closeMenu() : openMenu());
  backdrop.addEventListener("click", closeMenu);
  sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  document.body.append(backdrop, menuBtn);

  const page = (location.pathname.split("/").pop() || "").toLowerCase();
  const isProspect = page === "clients.html" && new URLSearchParams(location.search).get("filter") === "prospect";
  const actions = [
    ["👥", "Clients", "clients.html", page === "clients.html" && !isProspect],
    ["🎯", "Prospects", "clients.html?filter=prospect", isProspect],
    ["✉️", "Mail", "mails-groupes.html", page === "mails-groupes.html"],
    ["📞", "CR", "comptes-rendus.html", page === "comptes-rendus.html"],
    ["📅", "Agenda", "agenda.html", page === "agenda.html"]
  ];
  const bar = document.createElement("nav");
  bar.className = "lrf-mobile-actions";
  bar.setAttribute("aria-label", "Raccourcis CRM");
  bar.innerHTML = actions.map(([icon, label, href, active]) => `<a class="${active ? "active" : ""}" href="${href}"><span>${icon}</span><span>${label}</span></a>`).join("");
  document.body.appendChild(bar);

  const fab = document.createElement("button");
  fab.id = "lrf-mobile-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Actions rapides");
  fab.textContent = "+";
  const sheet = document.createElement("div");
  sheet.className = "lrf-mobile-action-sheet";
  sheet.innerHTML = '<a href="clients.html#new-client">➕ Nouveau client</a><a href="clients.html#new-prospect">🎯 Nouveau prospect</a><a href="nouveau-compte-rendu.html">📞 Nouveau compte-rendu</a><a href="mails-groupes.html">✉️ Nouveau mail groupé</a>';
  fab.addEventListener("click", () => sheet.classList.toggle("open"));
  document.addEventListener("click", e => { if (e.target !== fab && !sheet.contains(e.target)) sheet.classList.remove("open"); });
  document.body.append(sheet, fab);

  const toolbar = document.querySelector(".crm-toolbar");
  if (toolbar && toolbar.querySelector(".select-filters")) {
    const filterBtn = document.createElement("button");
    filterBtn.id = "lrf-mobile-filter-toggle";
    filterBtn.type = "button";
    filterBtn.textContent = "⚙ Filtres";
    filterBtn.addEventListener("click", () => {
      const opened = toolbar.classList.toggle("mobile-filters-open");
      filterBtn.textContent = opened ? "✕ Fermer filtres" : "⚙ Filtres";
    });
    toolbar.appendChild(filterBtn);
  }

  if (page === "clients.html" && (location.hash === "#new-client" || location.hash === "#new-prospect")) {
    const prospect = location.hash === "#new-prospect";
    const openNew = () => {
      const add = document.getElementById("btn-add-client");
      if (!add) return false;
      add.click();
      setTimeout(() => {
        const type = document.getElementById("edit-type");
        if (type) {
          type.value = prospect ? "prospect" : "client";
          type.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, 80);
      history.replaceState(null, "", location.pathname + location.search);
      return true;
    };
    if (!openNew()) {
      let tries = 0;
      const timer = setInterval(() => { tries += 1; if (openNew() || tries > 30) clearInterval(timer); }, 100);
    }
  }
}

async function init() {
  await enforceCrmAuthentication();
  initCrmMobile();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
