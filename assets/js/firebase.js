// Firebase central — LE ROY FACTORY
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import "./carte-mobile-enhancements.js?v=20260818-1425";
import "./carte-proximity.js?v=20260818-1448";
import "./jarvis-web.js?v=20260819-0230";

const firebaseConfig = {
  apiKey: "AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is",
  authDomain: "le-roy-factory.firebaseapp.com",
  projectId: "le-roy-factory",
  storageBucket: "le-roy-factory.firebasestorage.app",
  messagingSenderId: "249878619253",
  appId: "1:249878619253:web:05f051710b6251dbfa843c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const AGENTS = new Map([
  ["jerome@leroyfactory.fr", "Jérôme Hugol"],
  ["coryne@leroyfactory.fr", "Coryne"]
]);

export function getAgentProfile(user = auth.currentUser) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email || !AGENTS.has(email)) return null;
  return { email, name: AGENTS.get(email), uid: user.uid };
}

const CRM_PAGES = new Set([
  "dashboard.html", "clients.html", "agenda.html", "comptes-rendus.html",
  "mails-groupes.html", "carte.html", "statistiques.html", "demandes-clients.html",
  "nouveau-compte-rendu.html"
]);
const currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();
const isCrmPage = CRM_PAGES.has(currentPage);

// Empêche d'afficher brièvement des données CRM avant la vérification Firebase Auth.
if (isCrmPage) document.documentElement.style.visibility = "hidden";

onAuthStateChanged(auth, async user => {
  const profile = getAgentProfile(user);
  if (profile) {
    localStorage.setItem("agentLoggedIn", "true");
    localStorage.setItem("agentEmail", profile.email);
    localStorage.setItem("agentName", profile.name);
    localStorage.setItem("agentUid", profile.uid);
    if (isCrmPage) document.documentElement.style.visibility = "visible";
    window.dispatchEvent(new CustomEvent("lrf-agent-auth-ready", { detail: profile }));
    return;
  }

  localStorage.removeItem("agentLoggedIn");
  localStorage.removeItem("agentEmail");
  localStorage.removeItem("agentName");
  localStorage.removeItem("agentUid");

  // Un utilisateur Firebase qui n'est pas dans l'équipe ne doit pas conserver une session.
  if (user) {
    try { await signOut(auth); } catch (_) {}
  }

  if (isCrmPage) {
    const returnTo = encodeURIComponent(currentPage + location.search + location.hash);
    location.replace(`agent.html?return=${returnTo}`);
  }
});

// Intercepte toutes les déconnexions CRM existantes pour fermer aussi la session Firebase.
document.addEventListener("click", async event => {
  const btn = event.target.closest("#logout-btn, .btn-logout-sidebar");
  if (!btn) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { await signOut(auth); } catch (err) { console.warn("Déconnexion Firebase", err); }
  localStorage.removeItem("agentLoggedIn");
  localStorage.removeItem("agentEmail");
  localStorage.removeItem("agentName");
  localStorage.removeItem("agentUid");
  location.href = "agent.html";
}, true);

function ensureMobileCss() {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  const old = document.getElementById("lrf-mobile-enhancements");
  if (old) old.remove();
  const link = document.createElement("link");
  link.id = "lrf-mobile-enhancements";
  link.rel = "stylesheet";
  link.href = "assets/css/mobile-enhancements.css?v=20260901-auth";
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

import("./account-requests-nav.js?v=20260817-2008").catch(err => console.error("Erreur chargement navigation demandes clients :", err));
if (currentPage === "clients.html") {
  import("./client-direct-email.js?v=20260817-1845").catch(err => console.error("Erreur chargement module e-mail client :", err));
  import("./crm-moovago.js?v=20260817-1845").catch(err => console.error("Erreur chargement module CRM Moovago :", err));
  import("./crm-client-enhancements.js?v=20260817-1845").catch(err => console.error("Erreur chargement améliorations Clients :", err));
  import("./crm-ui-modern.js?v=20260817-1845").catch(err => console.error("Erreur chargement interface moderne CRM :", err));
  import("./clients-operations.js?v=20260817-1845").catch(err => console.error("Erreur chargement outils opérationnels Clients :", err));
  import("./client-codes.js?v=20260817-1845").catch(err => console.error("Erreur chargement codes clients LRF :", err));
  import("./clients-export.js?v=20260817-1845").catch(err => console.error("Erreur chargement impression/export clients :", err));
  import("./account-form-send.js?v=20260817-1845").catch(err => console.error("Erreur chargement envoi formulaire ouverture/mise à jour :", err));
}
if (currentPage === "dashboard.html") {
  import("./dashboard-commercial.js?v=20260817-1845").catch(err => console.error("Erreur chargement dashboard commercial :", err));
}
if (currentPage === "mails-groupes.html") {
  import("./mails-groupes-programmation.js?v=20260817-1145").catch(err => console.error("Erreur chargement mails programmés :", err));
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

  const page = currentPage;
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

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initCrmMobile, { once: true });
else initCrmMobile();
