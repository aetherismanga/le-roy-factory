// Pure validation and draft state shared by the CRM facade editor and its tests.
export const FACADE_MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const FACADE_MAX_BYTES = 600 * 1024;
export const FACADE_MAX_EDGE = 1600;
export const FACADE_MAX_PIXELS = 50 * 1000 * 1000;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']);
const EXTENSIONS = /\.(?:jpe?g|png|webp|avif|heic|heif)$/i;

export function safeFacadeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function facadeFromClient(client) {
  const photo = client?.photoFacade;
  if (typeof photo === 'string') return safeFacadeUrl(photo) ? { url: safeFacadeUrl(photo) } : null;
  return photo && safeFacadeUrl(photo.url) ? { ...photo, url: safeFacadeUrl(photo.url) } : null;
}

export function validateFacadeFile(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) throw new Error('La photo est vide.');
  if (file.size > FACADE_MAX_INPUT_BYTES) throw new Error('Choisissez une photo de moins de 25 Mo.');
  const type = String(file.type || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  if (!TYPES.has(type) && !(type === '' && EXTENSIONS.test(String(file.name || '')))) {
    throw new Error('Choisissez une photo JPEG, PNG, WebP, AVIF ou HEIC.');
  }
  return true;
}

export function facadeDimensions(width, height, maxEdge = FACADE_MAX_EDGE) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width * height > FACADE_MAX_PIXELS) {
    throw new Error('Les dimensions de cette photo ne sont pas prises en charge.');
  }
  const ratio = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export function createFacadeDraft(upload) {
  let epoch = 0;
  let clientId = '';
  let photo = null;
  let blob = null;
  let revision = 0;
  let cachedUpload = null;
  let pending = null;
  const stale = () => new Error('La fiche ou la photo a changé. Enregistrez de nouveau la fiche actuelle.');
  return {
    open(id, client) {
      epoch++;
      clientId = String(id || '');
      photo = facadeFromClient(client);
      blob = null;
      revision = 0;
      cachedUpload = null;
      pending = null;
      return photo;
    },
    close() { epoch++; clientId = ''; photo = null; blob = null; cachedUpload = null; pending = null; },
    token() { return { epoch, revision, clientId }; },
    isCurrent(token) { return token.epoch === epoch && token.revision === revision && token.clientId === clientId; },
    select(nextBlob, token) {
      if (token && !this.isCurrent(token)) return false;
      if (!nextBlob || nextBlob.type !== 'image/jpeg' || nextBlob.size <= 0 || nextBlob.size > FACADE_MAX_BYTES) {
        throw new Error('Impossible de préparer une photo assez légère.');
      }
      blob = nextBlob;
      revision++;
      cachedUpload = null;
      pending = null;
      return true;
    },
    hasChanges() { return !!blob; },
    async prepareSave(id = clientId) {
      if (!blob) return {};
      const destination = String(id || '');
      if (!destination || (clientId && destination !== clientId)) throw new Error('La fiche client doit être identifiée avant l’envoi de sa photo.');
      const token = this.token();
      const currentBlob = blob;
      if (!cachedUpload || cachedUpload.destination !== destination) {
        if (!pending || pending.destination !== destination) {
          pending = { destination, promise: Promise.resolve().then(() => upload(currentBlob, destination)) };
        }
        const currentPending = pending;
        let result;
        try { result = await currentPending.promise; }
        catch (error) {
          if (pending === currentPending) pending = null;
          throw error;
        }
        if (pending === currentPending) pending = null;
        if (!this.isCurrent(token)) throw stale();
        if (!safeFacadeUrl(result?.url)) throw new Error('Le stockage n’a pas renvoyé de lien de photo valide.');
        cachedUpload = { destination, photo: { ...result, url: safeFacadeUrl(result.url) } };
      }
      if (!this.isCurrent(token)) throw stale();
      return { photoFacade: cachedUpload.photo };
    },
    saved(id, patch) {
      if (clientId && String(id || '') !== clientId) return;
      if (!clientId && cachedUpload?.destination !== String(id || '')) return;
      if (blob && cachedUpload?.photo?.url !== patch?.photoFacade?.url) return;
      if (patch?.photoFacade && safeFacadeUrl(patch.photoFacade.url)) {
        photo = patch.photoFacade;
        blob = null;
        cachedUpload = null;
        pending = null;
      }
    }
  };
}
