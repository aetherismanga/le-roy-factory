// Importation des SDK Firebase nécessaires depuis le CDN officiel
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuration Firebase de Le Roy Factory
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

console.log("🔥 Firebase est initialisé avec succès pour Le Roy Factory !");

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

// Lien Statistiques fiable sur toutes les pages CRM, même si une ancienne page contient encore href="#".
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
import("./account-requests-nav.js?v=20260817-2008").catch(err => console.error("Erreur chargement navigation demandes clients :", err));
if (currentPage.endsWith("clients.html")) {
  import("./client-direct-email.js?v=20260817-1845").catch(err => console.error("Erreur chargement module e-mail client :", err));
  import("./crm-moovago.js?v=20260817-1845").catch(err => console.error("Erreur chargement module CRM Moovago :", err));
  import("./crm-client-enhancements.js?v=20260817-1845").catch(err => console.error("Erreur chargement améliorations Clients :", err));
  import("./crm-ui-modern.js?v=20260817-1845").catch(err => console.error("Erreur chargement interface moderne CRM :", err));
  import("./clients-operations.js?v=20260817-1845").catch(err => console.error("Erreur chargement outils opérationnels Clients :", err));
  import("./client-codes.js?v=20260817-1845").catch(err => console.error("Erreur chargement codes clients LRF :", err));
  import("./clients-export.js?v=20260817-1845").catch(err => console.error("Erreur chargement impression/export clients :", err));
  import("./account-form-send.js?v=20260817-1845").catch(err => console.error("Erreur chargement envoi formulaire ouverture/mise à jour :", err));
}
if (currentPage.endsWith("dashboard.html")) {
  import("./dashboard-commercial.js?v=20260817-1845").catch(err => console.error("Erreur chargement dashboard commercial :", err));
}
if (currentPage.endsWith("mails-groupes.html")) {
  import("./mails-groupes-programmation.js?v=20260817-1145").catch(err => console.error("Erreur chargement mails programmés :", err));
}

// Ergonomie CRM sur smartphone uniquement. Aucune modification n'est injectée sur desktop.
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

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initCrmMobile, { once: true });
else initCrmMobile();
