// Runtime and model are versioned, same-origin assets. No image leaves this device.
self.postMessage({ type: 'boot', version: '20261106-sameorigin-cachefix-2', moduleUrl: import.meta.url });
const VENDOR = new URL('../../vendor/lrf-photo-studio/', import.meta.url);
const RUNTIME = new URL('runtime-3.8.1/transformers.min.js', VENDOR).href;
const MODEL_ID = 'detr-resnet-50-panoptic-ea24b2d';
const REVISION = 'ea24b2d4e0bfae31f0a1299ba3fb892a2df064de';
const FLOOR_IDS = [118, 190];
const FLOOR_LABELS = new Set(['floor-wood', 'floor-other-merged']);
let library;
let segmenter;
let currentId;
const progress = (value) => self.postMessage({ type: 'progress', id: currentId, progress: value });

function uncaughtFailure(message) {
  self.postMessage({ type: 'error', id: currentId, message: 'Le moteur local a rencontré une erreur. Réessayez ou tracez le sol manuellement.', detail: String(message).slice(0, 500) });
}
self.addEventListener('error', (event) => {
  event.preventDefault();
  uncaughtFailure(`${event.message || 'Worker runtime error'} (${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0})`);
});
self.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  uncaughtFailure(event.reason?.message ?? event.reason ?? 'Unhandled worker promise rejection');
});

async function load() {
  const started = performance.now();
  if (!library) {
    progress({ stage: 'download', message: 'Chargement du moteur local…', progress: 0 });
    library = await import(RUNTIME);
    library.env.allowLocalModels = true;
    library.env.allowRemoteModels = false;
    library.env.localModelPath = new URL('models/', VENDOR).href;
    // CacheStorage needs a secure context and can also be denied in private
    // browsing/storage-restricted profiles. Never make inference depend on it:
    // ordinary HTTP caching and the in-memory pipeline still avoid repeat work.
    library.env.useBrowserCache = false;
    // A single WASM thread works without cross-origin isolation, including Safari.
    // DETR's quantized ConvInteger operators use WASM; WebGPU is not required.
    library.env.backends.onnx.wasm.numThreads = 1;
    library.env.backends.onnx.wasm.proxy = false;
    library.env.backends.onnx.wasm.wasmPaths = new URL('runtime-3.8.1/', VENDOR).href;
  }
  if (!segmenter) {
    segmenter = await library.pipeline('image-segmentation', MODEL_ID, {
      revision: REVISION,
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (event) => {
        if (event.status === 'progress') progress({ stage: 'download', message: 'Téléchargement du modèle local (44,5 Mo, une seule fois)…', progress: event.progress, loaded: event.loaded, total: event.total });
      },
    });
    // The conversion's config uses an obsolete COCO-Stuff label table and leaves
    // merged COCO panoptic classes as LABEL_190 etc. Use the actual training IDs:
    // cocodataset/panopticapi/panoptic_coco_categories.json, 118 and 190.
    segmenter.model.config.id2label[190] = 'floor-other-merged';
    segmenter.model.config.id2label[200] = 'rug-merged';
    // Preserve aspect ratio. Limit inference, separately from full-size photo/export.
    segmenter.processor.image_processor.size = { shortest_edge: 384, longest_edge: 640 };
  }
  return performance.now() - started;
}

function smallImage(data, width, height) {
  const scale = Math.min(1, 640 / Math.max(width, height));
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));
  if (scale === 1) return { data, width, height };
  // Explicit resampling also works in browsers without OffscreenCanvas.
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
    const from = (Math.min(height - 1, Math.floor((y + .5) / scale)) * width + Math.min(width - 1, Math.floor((x + .5) / scale))) * 4;
    const to = (y * outWidth + x) * 4;
    out[to] = data[from]; out[to + 1] = data[from + 1]; out[to + 2] = data[from + 2]; out[to + 3] = 255;
  }
  return { data: out, width: outWidth, height: outHeight };
}

function upscaleMask(mask, sourceWidth, sourceHeight, width, height) {
  const out = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(sourceWidth - 1, Math.floor((x + .5) * sourceWidth / width));
    const sy = Math.min(sourceHeight - 1, Math.floor((y + .5) * sourceHeight / height));
    out[y * width + x] = mask[sy * sourceWidth + sx];
  }
  return out;
}

self.onmessage = async ({ data: job }) => {
  if (job.type !== 'analyze') return;
  currentId = job.id;
  try {
    const downloadMs = await load();
    const small = smallImage(new Uint8ClampedArray(job.data), job.width, job.height);
    progress({ stage: 'inference', message: 'Analyse du sol sur cet appareil…', progress: null });
    const started = performance.now();
    // Panoptic post-processing assigns each pixel to a single class/instance.
    // Recognized furniture/rugs/walls are excluded. Semantic mistakes still need
    // the editor's confirmation and correction tools.
    const image = new library.RawImage(small.data, small.width, small.height, 4);
    const segments = await segmenter(image, {
      threshold: .6,
      mask_threshold: .5,
      overlap_mask_area_threshold: .5,
      label_ids_to_fuse: FLOOR_IDS,
      target_sizes: [[small.height, small.width]],
    });
    const smallMask = new Uint8ClampedArray(small.width * small.height);
    let scoreSum = 0;
    let floorPixels = 0;
    const labels = [];
    for (const segment of segments) {
      if (!FLOOR_LABELS.has(segment.label)) continue;
      labels.push(segment.label);
      const values = segment.mask.data;
      for (let i = 0; i < values.length; i++) if (values[i] && !smallMask[i]) {
        smallMask[i] = 255;
        scoreSum += segment.score ?? 0;
        floorPixels++;
      }
    }
    const coverage = floorPixels / smallMask.length;
    const confidence = floorPixels ? scoreSum / floorPixels : 0;
    const warning = coverage < .005
      ? 'Aucun sol suffisamment visible n’a été reconnu. Tracez la zone manuellement.'
      : confidence < .75 || coverage < .025
        ? 'Le sol est peu visible ou incertain. Vérifiez et corrigez la zone proposée.'
        : 'Vérifiez la zone proposée, notamment autour des pieds de meubles et des tapis.';
    const mask = upscaleMask(smallMask, small.width, small.height, job.width, job.height);
    const inferenceMs = performance.now() - started;
    self.postMessage({ type: 'result', id: job.id, result: {
      mask: mask.buffer, width: job.width, height: job.height, coverage, confidence, warning, labels,
      timings: { downloadMs: Math.round(downloadMs), inferenceMs: Math.round(inferenceMs), workingWidth: small.width, workingHeight: small.height, backend: 'wasm', threads: 1 },
    } }, [mask.buffer]);
  } catch (error) {
    // Discard an interrupted/failed constructor so retry remains possible.
    if (!segmenter) segmenter = undefined;
    self.postMessage({ type: 'error', id: job.id, message: 'L’analyse locale n’a pas abouti. Vérifiez la connexion pour charger le modèle, puis réessayez ou tracez le sol manuellement.', detail: error?.message ?? String(error) });
  }
};
