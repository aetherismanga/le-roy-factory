// Only catalogue-verified Elios tile faces are used; room imports cannot add URLs.
export const TEXTURE_QUALITIES = ['fluid', 'balanced', 'max'];
const MAX_FACES = 8;
const MAX_BYTES = 16 * 1024 * 1024;
const PIXEL_BUDGET = 16 * 1024 * 1024;
const MAX_ENTRIES = 512; // 60 rooms × at most 8 faces, including mixed references.
const allowedImage = /^image\/(jpeg|png|webp|avif)$/i;

export function textureProduct(tile, catalogue) {
  if (!['ELIOS','VIEW','LA FENICE'].includes(tile?.brand)) return null;
  return catalogue?.products?.find(p => p.brand === tile.brand && p.key === tile.key &&
    p.collection === tile.collection && p.colorId === tile.colorId &&
    p.width === tile.width && p.height === tile.height &&
    (!tile.reference || p.reference === tile.reference)) || null;
}

function imageURL(value) {
  if (typeof value !== 'string' || value.length > 3000) return '';
  try {
    const url = new URL(value, globalThis.location?.href || 'https://leroyfactory.fr/');
    return (url.protocol === 'https:'||/^\/assets\/img\/lrf-plan-pose\/faces\//.test(value)&&url.origin===globalThis.location?.origin) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function textureSources(product, quality = 'balanced') {
  if (!product) return [];
  const variants = product.textureVariants;
  const requested = TEXTURE_QUALITIES.includes(quality) ? quality : 'balanced';
  // A missing HD tier must never silently export the low-resolution tier.
  const tiers = requested === 'max' ? ['max'] : requested === 'fluid' ? ['fluid', 'balanced', 'max'] : ['balanced', 'max'];
  let list = tiers.map(k => variants?.[k]).find(v => Array.isArray(v) && v.length);
  if (!list && !variants && product.nativeFaces === true) list = product.faces;
  if(!list && !variants && product.preview) list=[product.preview];
  return [...new Set((list || []).map(imageURL).filter(Boolean))].slice(0, MAX_FACES);
}

// Stable placement: changing quality or clipping a tile does not change its face.
export function textureFace(cell, count) {
  if (!count) return 0;
  const row = Math.round(cell.y / cell.h), column = Math.round(cell.x / cell.w * 2);
  return Math.abs(Math.imul(row, 73856093) ^ Math.imul(column, 19349663)) % count;
}

export function textureMatrix(layout, rotation = 0) {
  const world = ([x, y]) => layout.transform.from(rotation === 90 ?
    [layout.origin.x - y, layout.origin.y + x] : [layout.origin.x + x, layout.origin.y + y]);
  const p = world([0, 0]), x = world([1, 0]), y = world([0, 1]);
  return [x[0] - p[0], x[1] - p[1], y[0] - p[0], y[1] - p[1], p[0], p[1]];
}

export function textureImageRotation(product, image) {
  if ([0, 90, 180, 270].includes(product?.textureRotation)) return product.textureRotation;
  const tileRatio = product.width / product.height, imageRatio = image.width / image.height;
  return Math.abs(Math.log(imageRatio / tileRatio)) > Math.abs(Math.log(1 / imageRatio / tileRatio)) ? 90 : 0;
}

export class TextureCache {
  constructor(onChange = () => {}, {fetcher = globalThis.fetch?.bind(globalThis), maxEntries = 32, strictResolution = false} = {}) {
    this.entries = new Map(); this.queue = []; this.running = 0;
    this.onChange = onChange; this.fetcher = fetcher; this.maxEntries = maxEntries; this.active = new Set(); this.pixels = 0; this.strictResolution = strictResolution; this.disposed = false;
  }
  begin() { this.active.clear(); }
  dispose() {
    this.disposed = true;
    for (const entry of this.entries.values()) {
      entry.abort?.abort();
      if (entry.objectURL) URL.revokeObjectURL(entry.objectURL);
      if (entry.pending) entry.reject(Error('Préparation des textures interrompue.'));
    }
    this.queue.length = 0;
    this.entries.clear(); this.active.clear(); this.pixels = 0;
  }
  get(url, {retry = false, maxDimension = 1024} = {}) {
    maxDimension = Math.max(64, Math.min(4096, Math.ceil(maxDimension / 64) * 64));
    const key = url + '#' + maxDimension;
    this.active.add(key);
    let entry = this.entries.get(key);
    if (retry && entry?.error) { this.entries.delete(key); entry = null; }
    if (!entry) {
      if (this.entries.size >= MAX_ENTRIES) { this.prune(); if (this.entries.size >= MAX_ENTRIES) return {error: Error('Trop de textures visibles. Rapprochez la vue.'), promise: Promise.reject(Error('Trop de textures visibles. Rapprochez la vue.')).catch(() => null)}; }
      entry = {url, key, maxDimension, pending: true, touched: Date.now()};
      entry.promise = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject; });
      // Interactive preview reports failure through state instead of unhandled rejections.
      entry.promise.catch(() => {});
      this.entries.set(key, entry); this.queue.push(entry); this.drain();
    }
    entry.touched = Date.now();
    return entry;
  }
  prune() {
    const idle = [...this.entries.values()].filter(e => !e.pending && !this.active.has(e.key)).sort((a, b) => a.touched - b.touched);
    while (this.entries.size > this.maxEntries && idle.length) {
      const entry = idle.shift(); if (entry.objectURL) URL.revokeObjectURL(entry.objectURL);
      this.pixels = Math.max(0, this.pixels - (entry.pixels || 0)); this.entries.delete(entry.key);
    }
  }
  drain() {
    while (!this.disposed && this.running < 3 && this.queue.length) {
      const entry = this.queue.shift(); this.running++;
      this.load(entry).then(value => { Object.assign(entry, value, {pending: false}); entry.resolve(entry); }, error => {
        entry.pending = false; entry.error = error; entry.reject(error);
      }).finally(() => { this.running--; this.drain(); this.prune(); this.onChange(); });
    }
  }
  async load(entry) {
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 15000); entry.abort = abort;
    let objectURL, reserved = 0;
    try {
      const response = await this.fetcher(entry.url, {mode: 'cors', credentials: 'omit', signal: abort.signal});
      if (!response.ok) throw Error('Texture Elios indisponible (' + response.status + ').');
      if (Number(response.headers.get('content-length')) > MAX_BYTES) throw Error('Texture trop volumineuse pour le plan.');
      const blob = await response.blob();
      if (!allowedImage.test(blob.type) || !blob.size || blob.size > MAX_BYTES) throw Error('Fichier de texture invalide ou trop volumineux.');
      objectURL = URL.createObjectURL(blob);
      const image = new Image(); image.src = objectURL;
      if (abort.signal.aborted) throw Error('Chargement de la texture interrompu.');
      await Promise.race([image.decode(), new Promise((_, reject) => abort.signal.addEventListener('abort', () => reject(Error('Chargement de la texture interrompu.')), {once: true}))]);
      if (!image.naturalWidth || !image.naturalHeight) throw Error('Texture vide.');
      // The official HD source is sampled to the pixels actually used by the
      // current view/export. A shared decoded-pixel budget also covers active faces.
      const naturalPixels = image.naturalWidth * image.naturalHeight;
      const available = Math.max(0, PIXEL_BUDGET - this.pixels);
      const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
      const wantedFactor = Math.min(1, entry.maxDimension / maxSide);
      if (this.strictResolution && naturalPixels * wantedFactor ** 2 > available) throw Error('Ce plan dépasse la mémoire disponible pour ses textures HD. Exportez une partie du projet.');
      const factor = Math.min(1, entry.maxDimension / maxSide, Math.max(64 / maxSide, Math.sqrt(available / naturalPixels)));
      const width = Math.max(1, Math.floor(image.naturalWidth * factor)), height = Math.max(1, Math.floor(image.naturalHeight * factor));
      reserved = width * height; this.pixels += reserved;
      let displayBlob = blob;
      if (width !== image.naturalWidth || height !== image.naturalHeight) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d'); if (!context) throw Error('Mémoire insuffisante pour afficher la texture.');
        context.drawImage(image, 0, 0, width, height);
        displayBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .96));
        if (!displayBlob) throw Error('La texture n’a pas pu être préparée.');
        URL.revokeObjectURL(objectURL); objectURL = URL.createObjectURL(displayBlob);
      }
      image.src = '';
      if (this.disposed) throw Error('Préparation des textures interrompue.');
      return {blob: displayBlob, objectURL, width, height, pixels: reserved, adapted: factor + 1e-8 < wantedFactor};
    } catch (error) {
      if (objectURL) URL.revokeObjectURL(objectURL);
      this.pixels = Math.max(0, this.pixels - reserved);
      throw error;
    } finally { clearTimeout(timer); }
  }
  async prepareHD(products) {
    const urls = new Map();
    for (const product of products) {
      if (!textureSources(product, 'balanced').length && !textureSources(product, 'fluid').length) continue;
      const hd = textureSources(product, 'max');
      if (!hd.length) throw Error('Les textures HD de ' + product.collection + ' ne sont pas disponibles.');
      hd.forEach((url, index) => {
        if (Array.isArray(product.textureFaces) && !product.textureFaces.includes(index)) return;
        urls.set(url, Math.max(urls.get(url) || 0, product.textureExportSize || 4096));
      });
    }
    const result = new Map();
    // Bounded batches prevent large concurrent image decodes on mobile devices.
    const list = [...urls.keys()];
    for (let i = 0; i < list.length; i += 3) {
      await Promise.all(list.slice(i, i + 3).map(async url => {
        const entry = await this.get(url, {retry: true, maxDimension: urls.get(url)}).promise;
        if (!entry) throw Error('Trop de textures pour cet export. Fermez le projet puis relancez-le.');
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(Error('La texture HD n’a pas pu être intégrée à l’export.'));
          reader.readAsDataURL(entry.blob);
        });
        result.set(url, {href: data, width: entry.width, height: entry.height});
      }));
    }
    return result;
  }
}
