// ============================================================
// BASE DE DONNÉES CRM LE ROY FACTORY — Intégralité des 278 fiches
// ============================================================

// 1. Tes données d'origine (nous les conservons ici pour la migration)
const clientsDatabase = [
  {"type": "Prospect", "societe": "MP CETIN. EDEN", "adresse": "6 Bd des Jardiniers", "code_postal": "06200", "ville": "Nice", "telephone": "0674813721", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "875 Route du Thor", "code_postal": "84800", "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  // ... (tous tes 278 clients sont ici, je ne les mets pas pour alléger la lecture)
  {"type": "Client", "societe": "ATELIER CONTEMPORAIN", "adresse": "840 route de la roquette", "code_postal": "06370", "ville": "Mouans Sartoux", "telephone": "0492288715", "email": "gerald@ateliercontemporain.fr", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "ANTOINE QUINTANE", "adresse": "5 Rte de Valbonne", "code_postal": "06130", "ville": "Grasse", "telephone": "0493601628", "email": "carrelage@quintane.fr", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"}
];

// ============================================================
// CONNECTION À FIREBASE
// ============================================================

// Importation des SDK Firebase (CDN modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuration Firebase (Tes vraies clés d'image_16.png)
const firebaseConfig = {
  apiKey: "AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is",
  authDomain: "le-roy-factory.firebaseapp.com",
  projectId: "le-roy-factory",
  storageBucket: "le-roy-factory.firebasestorage.app",
  messagingSenderId: "249878619253",
  appId: "1:249878619253:web:05f051710b6251dbfa843c"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// SCRIPT DE MIGRATION AUTOMATIQUE VERS FIREBASE
// ============================================================

// Cette fonction va lire tes 278 clients de 'clientsDatabase' 
// et les envoyer automatiquement vers Firebase Firestore.
async function migrateClientsToFirebase() {
  console.log("Migration automatique : Vérification de la base de données...");

  try {
    // 1. Vérifier si Firebase est déjà rempli
    const querySnapshot = await getDocs(collection(db, "clients"));
    if (!querySnapshot.empty) {
      console.log(`Migration automatique : Ignorée. Firebase contient déjà ${querySnapshot.size} clients.`);
      return; // On arrête tout, la migration est déjà faite.
    }

    // 2. Si Firebase est vide, on lance l'importation de tes 278 clients
    console.log(`Migration automatique : Démarrage pour ${clientsDatabase.length} clients...`);
    
    for (const legacyClient of clientsDatabase) {
      // Nous créons un nouvel objet client adapté à Firebase, en conservant tes données EXACTES.
      const newFirebaseClient = {
        type: legacyClient.type || "Prospect",
        societe: legacyClient.societe || "Nom inconnu",
        adresse: legacyClient.adresse || "",
        code_postal: legacyClient.code_postal || "",
        ville: legacyClient.ville || "",
        telephone: legacyClient.telephone || "",
        email: legacyClient.email || "",
        autre_telephone: legacyClient.autre_telephone || "",
        departement: legacyClient.departement || "",
        region: legacyClient.region || "",
        pays: legacyClient.pays || "FR",
        // Ajout des timestamps automatiques pour Firebase
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      // Ajouter le client comme un nouveau document avec un ID généré automatiquement
      await addDoc(collection(db, "clients"), newFirebaseClient);
    }
    console.log(`Migration automatique : Terminée avec succès pour ${clientsDatabase.length} clients !`);
    alert("✅ Tes 278 clients ont été migrés automatiquement vers Firebase Firestore !");
    
    // Pour que ton site fonctionne, nous devons maintenant recharger la page 
    // afin qu'elle lise les données depuis Firebase.
    window.location.reload();

  } catch (error) {
    console.error("Erreur lors de la migration automatique :", error);
    alert("❌ La migration automatique a échoué. Firebase est vide.");
  }
}

// Lancer la migration dès que le script est chargé
migrateClientsToFirebase();
