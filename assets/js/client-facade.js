import { auth } from './firebase.js';
import { verifiedFacade } from './client-facade-sources.mjs?v=20261105-audit1';
import {
  FACADE_MAX_BYTES, facadeDimensions, validateFacadeFile, safeFacadeUrl, createFacadeDraft
} from './client-facade-core.mjs';

const UPLOAD_URL = 'https://us-central1-le-roy-factory.cloudfunctions.net/crmFilesUpload';
let section;
let previewUrl = '';
let selectionId = 0;
let preparing = false;
let imageBusy = false;
const draft = createFacadeDraft(uploadPhoto);

function status(text, error = false) {
  const target = section?.querySelector('[data-facade-status]');
  if (target) { target.textContent = text; target.dataset.error = String(error); }
}

function releasePreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}

function showPhoto(url, clientName = '') {
  if (!section) return;
  const img = section.querySelector('img');
  const visible = !!url;
  if (visible) { img.src = url; img.alt = `Façade du magasin${clientName ? ` ${clientName}` : ''}`; }
  else { img.removeAttribute('src'); img.alt = ''; }
  img.hidden = !visible;
  section.querySelector('[data-facade-icon]').hidden = visible;
  section.querySelector('[data-facade-placeholder]').hidden = visible;
  section.querySelector('[data-facade-preview]').setAttribute('aria-label', visible ? 'Remplacer la photo de façade du magasin' : 'Prendre une photo de la façade du magasin');
}

function setBusy() {
  section?.querySelectorAll('button').forEach(button => { button.disabled = preparing || imageBusy; });
}

function ensureUI() {
  if (section?.isConnected) return section;
  const grid = document.querySelector('#client-form .modal-grid-edit');
  if (!grid) return null;
  section = document.createElement('div');
  section.className = 'form-field full-width lrf-client-facade';
  section.id = 'lrf-client-facade';
  section.innerHTML = `<span class="lrf-facade-label">Façade du magasin</span>
    <button type="button" class="lrf-facade-preview" data-facade-preview aria-label="Prendre une photo de la façade du magasin">
      <img hidden alt=""><span aria-hidden="true" data-facade-icon>📷</span><span data-facade-placeholder>Ajouter la photo du magasin</span>
    </button>
    <div class="lrf-facade-actions"><button type="button" class="filter-btn" data-facade-camera>📷 Prendre une photo</button><button type="button" class="filter-btn" data-facade-gallery>Choisir une photo</button></div>
    <input type="file" accept="image/*" capture="environment" data-facade-capture tabindex="-1" aria-label="Appareil photo">
    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" data-facade-file tabindex="-1" aria-label="Galerie de photos">
    <p class="lrf-facade-status" role="status" aria-live="polite" data-facade-status></p>
    <a class="lrf-facade-source" target="_blank" rel="noopener noreferrer" hidden data-facade-source>Source de la photo</a>`;
  grid.prepend(section);
  const camera = section.querySelector('[data-facade-capture]');
  const gallery = section.querySelector('[data-facade-file]');
  section.querySelector('[data-facade-preview]').addEventListener('click', () => camera.click());
  section.querySelector('[data-facade-camera]').addEventListener('click', () => camera.click());
  section.querySelector('[data-facade-gallery]').addEventListener('click', () => gallery.click());
  for (const input of [camera, gallery]) input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) selectPhoto(file);
  });
  section.querySelector('img').addEventListener('error', () => {
    showPhoto('');
    status('Cette photo n’est pas disponible. Vous pouvez en prendre une nouvelle.', true);
  });
  return section;
}

async function decodePhoto(file) {
  // Browsers apply EXIF orientation while decoding. Re-encoding also removes GPS metadata.
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* iOS HEIC falls back to Image */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Ce format ne peut pas être ouvert sur cet appareil. Essayez une photo JPEG.'));
      image.src = url;
    });
    return image;
  } finally { URL.revokeObjectURL(url); }
}

async function compressPhoto(file) {
  validateFacadeFile(file);
  const image = await decodePhoto(file);
  try {
    let size = facadeDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const canvas = document.createElement('canvas');
    let result;
    for (let round = 0; round < 4; round++) {
      canvas.width = size.width; canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Impossible de préparer cette photo sur cet appareil.');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size.width, size.height);
      ctx.drawImage(image, 0, 0, size.width, size.height);
      result = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .84 - round * .1));
      if (result?.size && result.size <= FACADE_MAX_BYTES) return result;
      size = { width: Math.max(1, Math.round(size.width * .8)), height: Math.max(1, Math.round(size.height * .8)) };
    }
    throw new Error('Impossible d’alléger cette photo. Choisissez une autre image.');
  } finally { image.close?.(); }
}

async function selectPhoto(file) {
  const currentSelection = ++selectionId;
  const token = draft.token();
  imageBusy = true; setBusy();
  status('Préparation de la photo…');
  try {
    const blob = await compressPhoto(file);
    if (currentSelection !== selectionId || !draft.isCurrent(token)) return;
    if (!draft.select(blob, token)) return;
    releasePreview(); previewUrl = URL.createObjectURL(blob);
    showPhoto(previewUrl, document.getElementById('edit-societe')?.value || '');
    section.querySelector('[data-facade-source]').hidden = true;
    status('Photo prête. Enregistrez la fiche pour la conserver.');
  } catch (error) {
    if (currentSelection === selectionId && draft.isCurrent(token)) status(error.message || 'Impossible d’ouvrir cette photo.', true);
  } finally {
    if (currentSelection === selectionId) { imageBusy = false; setBusy(); }
  }
}

async function uploadPhoto(blob, clientId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Reconnectez-vous pour enregistrer la photo.');
  const token = await user.getIdToken();
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Impossible de lire la photo.'));
    reader.readAsDataURL(blob);
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scope: 'client-documents', parentId: clientId, fileName: 'facade-magasin.jpg', contentType: 'image/jpeg', base64 }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !safeFacadeUrl(data.file?.url)) throw new Error(data.error || 'La photo n’a pas pu être envoyée. Réessayez l’enregistrement.');
    return { ...data.file, source: 'photo-agent', updatedAt: new Date().toISOString() };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('L’envoi de la photo a pris trop de temps. Votre photo reste prête, réessayez.');
    throw error;
  } finally { clearTimeout(timer); }
}

function open({ clientId, client } = {}) {
  ensureUI(); selectionId++; preparing = false; imageBusy = false;
  releasePreview();
  const verified = client?.photoFacade ? null : verifiedFacade(client);
  const photo = draft.open(clientId, verified ? {...client,photoFacade:verified} : client);
  showPhoto(photo?.url || '', client?.societe || '');
  const source = section?.querySelector('[data-facade-source]');
  if (source) {
    const url = safeFacadeUrl(photo?.sourceUrl);
    source.hidden = !url;
    if (url) source.href = url; else source.removeAttribute('href');
  }
  status(photo ? (verified ? 'Façade vérifiée sur le site officiel du magasin.' : 'Photo de façade enregistrée.') : 'Touchez l’appareil photo pour photographier le magasin, ou choisissez une image.');
  setBusy();
}

window.LRFClientFacade = {
  async prepareSave({ clientId } = {}) {
    if (imageBusy) throw new Error('La photo est encore en préparation. Patientez quelques secondes.');
    if (preparing) throw new Error('La photo est déjà en cours d’enregistrement.');
    preparing = true; setBusy();
    const token = draft.token();
    try {
      if (draft.hasChanges()) status('Envoi de la photo…');
      return await draft.prepareSave(clientId);
    } catch (error) {
      if (draft.isCurrent(token)) status(error.message || 'Impossible d’enregistrer la photo.', true);
      throw error;
    } finally { if (draft.isCurrent(token)) { preparing = false; setBusy(); } }
  },
  hasChanges: () => draft.hasChanges(),
  open
};

window.addEventListener('lrf-client-opened', event => open(event.detail));
window.addEventListener('lrf-client-closed', () => {
  selectionId++; preparing = false; imageBusy = false; releasePreview(); draft.close(); setBusy();
});
window.addEventListener('lrf-client-saved', event => {
  const { clientId, patch } = event.detail || {};
  draft.saved(clientId, patch);
});

function init() {
  ensureUI();
  const modal = document.getElementById('client-modal');
  if (modal?.dataset.clientId && getComputedStyle(modal).display !== 'none') {
    // Root dispatches the client-opened event for normal opens; this covers a late module load.
    const client = window.__LRF_CLIENTS__?.find?.(item => item.id === modal.dataset.clientId);
    if (client) open({ clientId: modal.dataset.clientId, client });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
