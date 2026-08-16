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

// Correctif éditeur des mails groupés : aperçu des images collées + curseur après l'image.
// La logique principale continue d'enregistrer l'image en CID pour l'e-mail ; ici on ne change
// que l'affichage dans le navigateur et le confort de saisie.
if (window.location.pathname.toLowerCase().includes("mails-groupes")) {
  const previewSources = new Map();

  function placeCaretAfter(node) {
    const editor = document.getElementById("email-body-editor");
    if (!editor || !node) return;

    let spacer = node.nextSibling;
    if (!spacer || spacer.nodeType !== Node.ELEMENT_NODE || !spacer.classList?.contains("inline-image-spacer")) {
      spacer = document.createElement("div");
      spacer.className = "inline-image-spacer";
      spacer.innerHTML = "<br>";
      node.after(spacer);
    }

    const range = document.createRange();
    range.selectNodeContents(spacer);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
  }

  function restorePreviewImages() {
    document.querySelectorAll('#email-body-editor img[data-email-cid]').forEach(img => {
      const cid = img.dataset.emailCid;
      const preview = previewSources.get(cid);
      if (preview) img.src = preview;
    });
  }

  function temporarilyUseCidSources() {
    document.querySelectorAll('#email-body-editor img[data-email-cid]').forEach(img => {
      const cid = img.dataset.emailCid;
      if (cid) img.src = `cid:${cid}`;
    });
    // Les gestionnaires existants lisent innerHTML immédiatement ; on remet ensuite l'aperçu.
    setTimeout(restorePreviewImages, 0);
  }

  document.addEventListener("paste", (event) => {
    const editor = event.target?.closest?.("#email-body-editor");
    if (!editor) return;

    const imageItem = Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith("image/"));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const previewDataUrl = reader.result;
      let attempts = 0;
      const findInsertedImage = () => {
        // Le gestionnaire principal insère d'abord une image src="cid:...".
        const candidates = Array.from(editor.querySelectorAll('img[src^="cid:"]')).filter(img => !img.dataset.emailCid);
        const img = candidates[candidates.length - 1];
        if (img) {
          const cid = img.getAttribute("src").slice(4);
          img.dataset.emailCid = cid;
          previewSources.set(cid, previewDataUrl);
          img.src = previewDataUrl;
          img.style.maxWidth = "100%";
          img.style.height = "auto";
          img.style.display = "block";
          img.style.margin = "12px 0";
          placeCaretAfter(img);
          return;
        }

        attempts += 1;
        if (attempts < 40) setTimeout(findInsertedImage, 50);
      };
      setTimeout(findInsertedImage, 0);
    };
    reader.readAsDataURL(file);
  }, true);

  // Avant la préparation ou l'envoi, remettre momentanément les src CID attendus par Nodemailer.
  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("#btn-open-confirm, #btn-confirm-send");
    if (target) temporarilyUseCidSources();
  }, true);
}
