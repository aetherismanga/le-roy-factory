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

const currentPage = window.location.pathname.toLowerCase();
import("./account-requests-nav.js?v=20260817-1845").catch(err => console.error("Erreur chargement navigation demandes clients :", err));
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
