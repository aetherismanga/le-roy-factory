import { conservativeFloorMask } from './segmentation-mask.mjs?v=20261106-precise-floor-4';
// Runtime and model are versioned, same-origin assets. No image leaves this device.
self.postMessage({ type: 'boot', version: '20261106-precise-floor-4', moduleUrl: import.meta.url });
const VENDOR = new URL('../../vendor/lrf-photo-studio/', import.meta.url);
const RUNTIME = new URL('runtime-3.8.1/transformers.min.js', VENDOR).href;
const MODEL_ID = 'detr-resnet-50-panoptic-ea24b2d-woq8-v1';
const REVISION = 'ea24b2d4e0bfae31f0a1299ba3fb892a2df064de';
const FLOOR_IDS = [118, 190];
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
    // Weight-only compression retains float activations and original operators.
    // WASM is a consistent fallback across browsers; WebGPU is not required.
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
        if (event.status === 'progress') progress({ stage: 'download', message: 'Téléchargement du modèle local (44,3 Mo au premier chargement)…', progress: event.progress, loaded: event.loaded, total: event.total });
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
    // One model inference. Preserve all-class panoptic competition, then reject
    // almost-zero floor probabilities and tiny isolated predictions.
    // Significant floor islands survive furniture gaps; users can still correct.
    const image = new library.RawImage(small.data, small.width, small.height, 4);
    const inputs = await segmenter.processor([image]);
    const outputs = await segmenter.model(inputs);
    const proposal = conservativeFloorMask({
      logits: outputs.logits,
      masks: outputs.pred_masks,
      width: small.width,
      height: small.height,
      floorIds: FLOOR_IDS,
    });
    const { mask: smallMask, coverage, confidence, postprocess } = proposal;
    const labels = proposal.labelIds.map(id => segmenter.model.config.id2label[id]);
    const warning = coverage < .005
      ? 'Aucun sol suffisamment visible n’a été reconnu. Tracez la zone manuellement.'
      : confidence < .75 || coverage < .025
        ? 'Le sol est peu visible ou incertain. Vérifiez et corrigez la zone proposée.'
        : 'La zone principale du sol est proposée. Ajoutez les parties manquantes et retirez les débordements sur les meubles ou tapis.';
    const mask = upscaleMask(smallMask, small.width, small.height, job.width, job.height);
    const inferenceMs = performance.now() - started;
    self.postMessage({ type: 'result', id: job.id, result: {
      mask: mask.buffer, width: job.width, height: job.height, coverage, confidence, warning, labels, postprocess,
      timings: { downloadMs: Math.round(downloadMs), inferenceMs: Math.round(inferenceMs), workingWidth: small.width, workingHeight: small.height, backend: 'wasm', threads: 1 },
    } }, [mask.buffer]);
  } catch (error) {
    // Discard an interrupted/failed constructor so retry remains possible.
    if (!segmenter) segmenter = undefined;
    self.postMessage({ type: 'error', id: job.id, message: 'L’analyse locale n’a pas abouti. Vérifiez la connexion pour charger le modèle, puis réessayez ou tracez le sol manuellement.', detail: error?.message ?? String(error) });
  }
};
