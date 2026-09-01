import { db, auth, getAgentProfile } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const BILT_CLIENTS = [
  {
    type: "client",
    societe: "MOS 06",
    adresse: "682 Boulevard du Mercantour",
    codePostal: "06200",
    ville: "Nice",
    departement: "06",
    pays: "FR",
    contact: "",
    email: "",
    telephone: "",
    telephones: [],
    partenaires: ["bilt"],
    notes: "Client mentionné à l'Annexe 1 JM Plastalkon. TVA : FR30832636948. Partenaire : BILT.",
    source: "Annexe 1 JM Plastalkon",
    tva: "FR30832636948"
  },
  {
    type: "client",
    societe: "EIRL GREEN FIVE",
    adresse: "CD 2 Camp Major - L'Aumône Vieille",
    codePostal: "13400",
    ville: "Aubagne",
    departement: "13",
    pays: "FR",
    contact: "",
    email: "",
    telephone: "",
    telephones: [],
    partenaires: ["bilt"],
    notes: "Client mentionné à l'Annexe 1 JM Plastalkon. Enseigne : GREEN FIVE. TVA : FR74444760961. Partenaire : BILT.",
    source: "Annexe 1 JM Plastalkon",
    tva: "FR74444760961"
  },
  {
    type: "client",
    societe: "KM PRESTIGE CARRELAGE",
    adresse: "428 Chemin des Broutières",
    codePostal: "84130",
    ville: "Le Pontet",
    departement: "84",
    pays: "FR",
    contact: "Mohamed Issati",
    email: "",
    telephone: "",
    telephones: [],
    partenaires: ["bilt"],
    notes: "Client mentionné à l'Annexe 1 JM Plastalkon. Enseigne / sigle : KMPC. TVA : FR56920610557. Partenaire : BILT.",
    source: "Annexe 1 JM Plastalkon",
    tva: "FR56920610557"
  }
];

let seeded = false;

async function upsertBiltAnnexeClients() {
  if (seeded) return;
  seeded = true;

  for (const client of BILT_CLIENTS) {
    const q = query(collection(db, "clients"), where("societe", "==", client.societe));
    const snap = await getDocs(q);

    if (snap.empty) {
      await addDoc(collection(db, "clients"), client);
      continue;
    }

    const existing = snap.docs[0];
    const data = existing.data() || {};
    const partenaires = Array.isArray(data.partenaires) ? [...data.partenaires] : [];
    if (!partenaires.includes("bilt")) partenaires.push("bilt");

    await updateDoc(doc(db, "clients", existing.id), {
      partenaires,
      tva: data.tva || client.tva,
      source: data.source || client.source,
      notes: data.notes || client.notes
    });
  }

  console.info("[LRF] Clients Annexe 1 BILT synchronisés.");
}

onAuthStateChanged(auth, user => {
  if (!getAgentProfile(user)) return;
  upsertBiltAnnexeClients().catch(err => {
    seeded = false;
    console.error("[LRF] Erreur synchronisation clients Annexe 1 BILT", err);
  });
});
