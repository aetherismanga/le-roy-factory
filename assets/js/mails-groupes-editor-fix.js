// Correctif isolé pour l'éditeur des mails groupés :
// - affiche réellement les images collées dans le navigateur ;
// - place le curseur juste après l'image pour continuer à écrire ;
// - remet temporairement les sources CID au moment de préparer/envoyer l'e-mail.

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

document.addEventListener("click", (event) => {
  const target = event.target?.closest?.("#btn-open-confirm, #btn-confirm-send");
  if (target) temporarilyUseCidSources();
}, true);
