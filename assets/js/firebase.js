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
if (currentPage.endsWith("clients.html")) {
  import("./client-direct-email.js?v=20260817-1121").catch(err => console.error("Erreur chargement module e-mail client :", err));
  import("./crm-moovago.js?v=20260817-1121").catch(err => console.error("Erreur chargement module CRM Moovago :", err));
  import("./crm-client-enhancements.js?v=20260817-1121").catch(err => console.error("Erreur chargement améliorations Clients :", err));
}
if (currentPage.endsWith("mails-groupes.html")) {
  import("./mails-groupes-programmation.js?v=20260817-1145").catch(err => console.error("Erreur chargement mails programmés :", err));
}
