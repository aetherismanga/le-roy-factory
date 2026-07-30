// Importation des SDK Firebase nécessaires depuis le CDN officiel
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuration Firebase de Le Roy Factory
const firebaseConfig = {
  apiKey: "AIzaSyAiUk5Ua8kFcCUrSqLihiLshHnhA4rm2Is",
  authDomain: "le-roy-factory.firebaseapp.com",
  projectId: "le-roy-factory",
  storageBucket: "le-roy-factory.appspot.com",
  messagingSenderId: "249878619253",
  appId: "1:249878619253:web:05f051710b6251dbfa843c"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("🔥 Firebase est initialisé avec succès pour Le Roy Factory !");
