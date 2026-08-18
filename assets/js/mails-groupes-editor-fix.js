// Renfort d'interface pour les mails groupés :
// - garantit la sélection de plusieurs pièces jointes ;
// - rend explicite la sélection de plusieurs départements ;
// - affiche réellement les images collées dans le corps du message ;
// - conserve les sources CID au moment de préparer/envoyer l'e-mail.

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
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
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
  setTimeout(restorePreviewImages, 0);
}

function enhanceAttachmentInput() {
  const input = document.getElementById("file-attachment");
  if (!input) return false;

  input.multiple = true;
  input.setAttribute("multiple", "multiple");

  const block = input.parentElement;
  const label = block?.querySelector("label");
  if (label) {
    label.textContent = "📎 Pièces jointes — plusieurs fichiers possibles (10 Mo max par fichier)";
  }

  if (block && !block.querySelector(".multi-files-help")) {
    const help = document.createElement("div");
    help.className = "multi-files-help";
    help.style.cssText = "font-size:.78rem;color:#666;margin-top:.4rem";
    help.textContent = "Vous pouvez sélectionner plusieurs PDF, images ou documents en une seule fois, puis en ajouter d'autres ensuite.";
    input.insertAdjacentElement("afterend", help);
  }

  return true;
}

function enhanceDepartmentPicker() {
  const box = document.getElementById("filter-dept-multi");
  if (!box) return false;

  const parent = box.parentElement;
  if (parent && !parent.querySelector(".multi-dept-help")) {
    const help = document.createElement("div");
    help.className = "multi-dept-help";
    help.style.cssText = "font-size:.75rem;color:#666;margin-top:.35rem";
    help.textContent = "Cochez autant de départements que nécessaire.";
    box.insertAdjacentElement("afterend", help);
  }

  const button = document.getElementById("filter-dept-button");
  if (button) button.setAttribute("aria-label", "Sélectionner un ou plusieurs départements");

  return true;
}

function retryEnhancements() {
  let tries = 0;
  const timer = setInterval(() => {
    const attachmentsReady = enhanceAttachmentInput();
    const departmentsReady = enhanceDepartmentPicker();
    tries += 1;
    if ((attachmentsReady && departmentsReady) || tries >= 40) clearInterval(timer);
  }, 250);
}

document.addEventListener("paste", (event) => {
  const editor = event.target?.closest?.("#email-body-editor");
  if (!editor) return;

  const imageItems = Array.from(event.clipboardData?.items || []).filter(item => item.type.startsWith("image/"));
  if (!imageItems.length) return;

  const previewPromises = imageItems.map(item => new Promise(resolve => {
    const file = item.getAsFile();
    if (!file) return resolve(null);

    if (file.size > 10 * 1024 * 1024) {
      alert(`L'image « ${file.name || "collée"} » dépasse 10 Mo et ne peut pas être intégrée.`);
      return resolve(null);
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  }));

  Promise.all(previewPromises).then(previews => {
    const validPreviews = previews.filter(Boolean);
    if (!validPreviews.length) return;

    let attempts = 0;
    const findInsertedImages = () => {
      const candidates = Array.from(editor.querySelectorAll('img[src^="cid:"]')).filter(img => !img.dataset.emailCid);

      if (candidates.length) {
        candidates.forEach((img, index) => {
          const cid = img.getAttribute("src")?.slice(4);
          if (!cid) return;

          const preview = validPreviews[Math.min(index, validPreviews.length - 1)];
          img.dataset.emailCid = cid;
          previewSources.set(cid, preview);
          img.src = preview;
          img.style.maxWidth = "100%";
          img.style.height = "auto";
          img.style.display = "block";
          img.style.margin = "12px 0";
        });

        placeCaretAfter(candidates[candidates.length - 1]);
        return;
      }

      attempts += 1;
      if (attempts < 40) setTimeout(findInsertedImages, 50);
    };

    setTimeout(findInsertedImages, 0);
  });
}, true);

document.addEventListener("click", (event) => {
  const target = event.target?.closest?.("#btn-open-confirm, #btn-confirm-send");
  if (target) temporarilyUseCidSources();
}, true);

document.addEventListener("DOMContentLoaded", () => {
  enhanceAttachmentInput();
  retryEnhancements();
});

if (document.readyState !== "loading") {
  enhanceAttachmentInput();
  retryEnhancements();
}
