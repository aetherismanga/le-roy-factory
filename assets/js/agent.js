// Importation des SDK Firebase v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is",
  authDomain: "le-roy-factory.firebaseapp.com",
  projectId: "le-roy-factory",
  storageBucket: "le-roy-factory.firebasestorage.app",
  messagingSenderId: "249878619253",
  appId: "1:249878619253:web:05f051710b6251dbfa843c"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Éléments du DOM
const loginWrapper = document.querySelector('.login-wrapper');
const loginForm = document.getElementById('login-form');
const errorNotification = document.getElementById('error-notification');

document.addEventListener('DOMContentLoaded', () => {
  // Surveillance de la connexion Agent
  onAuthStateChanged(auth, (user) => {
    if (user) {
      renderDashboard(user);
    } else {
      if (loginWrapper) loginWrapper.style.display = 'block';
      const dashboard = document.getElementById('agent-dashboard');
      if (dashboard) dashboard.remove();
    }
  });

  // Connexion E-mail / Mot de passe
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        if (errorNotification) errorNotification.style.display = 'none';
      } catch (error) {
        if (errorNotification) {
          errorNotification.textContent = "Identifiants incorrects ou compte introuvable.";
          errorNotification.style.display = 'block';
        }
      }
    });
  }
});

// --- DASHBOARD DE GESTION DES CLIENTS ---
function renderDashboard(user) {
  if (loginWrapper) loginWrapper.style.display = 'none';

  let dashboard = document.getElementById('agent-dashboard');
  if (!dashboard) {
    dashboard = document.createElement('div');
    dashboard.id = 'agent-dashboard';
    dashboard.className = 'container';
    dashboard.style.cssText = "max-width: 900px; margin: 0 auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); color: #1A2530;";
    document.querySelector('main').appendChild(dashboard);
  }

  dashboard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid #FFD700; padding-bottom: 1rem;">
      <div>
        <h1 style="font-size: 1.8rem; margin: 0; color: #1A2530;">ESPACE AGENT — GESTION CLIENTS</h1>
        <small style="color: #666;">Connecté : ${user.email}</small>
      </div>
      <button id="logout-btn" style="background: #111; color: #FFD700; border: 1px solid #FFD700; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;">Déconnexion</button>
    </div>

    <!-- Formulaire d'ajout / modification client -->
    <div style="background: #FAFAFA; border: 1px solid #ddd; padding: 1.5rem; border-radius: 6px; margin-bottom: 2rem;">
      <h2 id="form-title" style="font-size: 1.2rem; margin-top: 0; color: #1A2530;">Ajouter un nouveau client</h2>
      <form id="client-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <input type="hidden" id="client-id">
        <div>
          <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Société / Nom client</label>
          <input type="text" id="client-nom" required style="width:100%; padding:0.6rem; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Contact (Nom & Prénom)</label>
          <input type="text" id="client-contact" style="width:100%; padding:0.6rem; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Email</label>
          <input type="email" id="client-email" style="width:100%; padding:0.6rem; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Téléphone</label>
          <input type="tel" id="client-tel" style="width:100%; padding:0.6rem; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
        </div>
        <div style="grid-column: span 2;">
          <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Notes / Projets en cours</label>
          <textarea id="client-notes" rows="2" style="width:100%; padding:0.6rem; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;"></textarea>
        </div>
        <div style="grid-column: span 2; display: flex; gap: 1rem;">
          <button type="submit" id="save-client-btn" style="background:#111; color:#FFD700; border:1px solid #FFD700; padding:0.75rem 1.5rem; border-radius:4px; font-weight:700; cursor:pointer;">Enregistrer le client</button>
          <button type="button" id="cancel-edit-btn" style="display:none; background:#ccc; color:#333; border:none; padding:0.75rem 1.5rem; border-radius:4px; font-weight:600; cursor:pointer;">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Liste dynamique des clients -->
    <h2 style="font-size: 1.3rem; color: #1A2530;">Base de données Clients</h2>
    <div id="clients-list" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
      <p style="color:#666;">Chargement des données clients...</p>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
  document.getElementById('client-form').addEventListener('submit', handleSaveClient);
  document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

  loadClients();
}

// --- FONCTIONS BASE DE DONNÉES CLIENTS ---

async function loadClients() {
  const clientsList = document.getElementById('clients-list');
  if (!clientsList) return;

  try {
    const querySnapshot = await getDocs(collection(db, "clients"));
    if (querySnapshot.empty) {
      clientsList.innerHTML = `<p style="color:#666; font-style:italic;">Aucun client enregistré pour le moment.</p>`;
      return;
    }

    let html = '';
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      html += `
        <div style="border: 1px solid #e0e0e0; padding: 1rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
          <div>
            <strong style="font-size: 1.1rem; color: #1A2530;">${data.nom || 'Sans nom'}</strong>
            <div style="font-size: 0.85rem; color: #555; margin-top: 0.3rem;">
              <span>👤 ${data.contact || 'N/A'}</span> | 
              <span>📧 ${data.email || 'N/A'}</span> | 
              <span>📞 ${data.tel || 'N/A'}</span>
            </div>
            ${data.notes ? `<p style="font-size: 0.85rem; color: #666; margin: 0.5rem 0 0; font-style: italic;">"${data.notes}"</p>` : ''}
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="editClient('${id}', '${escapeHtml(data.nom)}', '${escapeHtml(data.contact)}', '${escapeHtml(data.email)}', '${escapeHtml(data.tel)}', '${escapeHtml(data.notes)}')" style="background: #1A2530; color: #fff; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">Éditer</button>
            <button onclick="deleteClient('${id}')" style="background: #d9534f; color: #fff; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">Supprimer</button>
          </div>
        </div>
      `;
    });
    clientsList.innerHTML = html;
  } catch (error) {
    console.error("Erreur Firestore :", error);
    clientsList.innerHTML = `<p style="color:#d9534f;">Erreur lors du chargement des clients.</p>`;
  }
}

async function handleSaveClient(e) {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const clientData = {
    nom: document.getElementById('client-nom').value.trim(),
    contact: document.getElementById('client-contact').value.trim(),
    email: document.getElementById('client-email').value.trim(),
    tel: document.getElementById('client-tel').value.trim(),
    notes: document.getElementById('client-notes').value.trim(),
    updatedAt: serverTimestamp()
  };

  try {
    if (id) {
      await updateDoc(doc(db, "clients", id), clientData);
    } else {
      clientData.createdAt = serverTimestamp();
      await addDoc(collection(db, "clients"), clientData);
    }
    resetForm();
    loadClients();
  } catch (error) {
    console.error("Erreur enregistrement :", error);
    alert("Erreur lors de l'enregistrement du client.");
  }
}

window.editClient = function(id, nom, contact, email, tel, notes) {
  document.getElementById('client-id').value = id;
  document.getElementById('client-nom').value = nom;
  document.getElementById('client-contact').value = contact;
  document.getElementById('client-email').value = email;
  document.getElementById('client-tel').value = tel;
  document.getElementById('client-notes').value = notes;

  document.getElementById('form-title').textContent = "Modifier la fiche client";
  document.getElementById('save-client-btn').textContent = "Mettre à jour";
  document.getElementById('cancel-edit-btn').style.display = "inline-block";
};

window.deleteClient = function(id) {
  if (confirm("Voulez-vous vraiment supprimer ce client de la base ?")) {
    deleteDoc(doc(db, "clients", id))
      .then(() => loadClients())
      .catch((err) => console.error(err));
  }
};

function resetForm() {
  document.getElementById('client-id').value = '';
  document.getElementById('client-form').reset();
  document.getElementById('form-title').textContent = "Ajouter un nouveau client";
  document.getElementById('save-client-btn').textContent = "Enregistrer le client";
  document.getElementById('cancel-edit-btn').style.display = "none";
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
