/** Local, abortable panoptic floor segmentation. Photos never leave this device. */
export const FLOOR_MODEL = Object.freeze({
  id: 'Xenova/detr-resnet-50-panoptic',
  revision: 'ea24b2d4e0bfae31f0a1299ba3fb892a2df064de',
  license: 'Apache-2.0',
  bytes: 44483407,
  runtime: '@huggingface/transformers@3.8.1',
  floorLabels: ['floor-wood', 'floor-other-merged'],
});

let worker;
let active;
let sequence = 0;
// Version the worker entry independently from photo/project URLs. A cached 404
// during a preview rebuild must not pin subsequent analyses to a broken entry.
const WORKER_VERSION = '20261106-sameorigin-cachefix-2';
const abortError = () => new DOMException('Analyse annulée.', 'AbortError');
const diagnosticsEnabled = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('ps-diagnostic');
function analysisError(message, detail) {
  const suffix = diagnosticsEnabled() && detail ? ` [Diagnostic : ${String(detail).slice(0, 400)}]` : '';
  const error = new Error(message + suffix);
  error.cause = detail;
  return error;
}

function stopWorker() {
  worker?.terminate();
  worker = undefined;
}

/**
 * @param {ImageData|{data:Uint8ClampedArray,width:number,height:number}} imageData
 * @param {{signal?:AbortSignal,onProgress?:(event:object)=>void,timeoutMs?:number}} options
 * @returns {Promise<{mask:Uint8ClampedArray,width:number,height:number,confidence:number,coverage:number,warning:string|null,timings:object,model:object}>}
 */
export function analyze(imageData, { signal, onProgress, timeoutMs = 120000 } = {}) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (!imageData || !Number.isInteger(imageData.width) || !Number.isInteger(imageData.height)
    || imageData.width < 1 || imageData.height < 1 || imageData.width * imageData.height > 6000000
    || imageData.data?.length !== imageData.width * imageData.height * 4) {
    return Promise.reject(new Error('La photo de travail doit être une image RGBA de moins de 6 millions de pixels.'));
  }
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
    return Promise.reject(new Error('L’analyse locale est indisponible dans ce navigateur. Vous pouvez tracer le sol manuellement.'));
  }
  active?.cancel();
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (active?.id === id) active = undefined;
      if (error) reject(error); else resolve(result);
    };
    const cancel = () => { stopWorker(); finish(abortError()); };
    active = { id, cancel };
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      stopWorker();
      finish(new Error('L’analyse locale prend trop de temps. Réessayez ou tracez le sol manuellement.'));
    }, Math.max(1000, Math.min(timeoutMs, 180000)));
    try {
      const workerUrl = new URL('./segmentation-worker.mjs', import.meta.url);
      workerUrl.searchParams.set('v', WORKER_VERSION);
      worker ??= new Worker(workerUrl, { type: 'module', name: 'lrf-floor-local' });
      worker.onmessage = ({ data }) => {
        if (data.type === 'boot') {
          if (diagnosticsEnabled()) console.info('[LRF Photo Studio] Worker boot:', data.version, data.moduleUrl);
          return;
        }
        if (data.id !== id || settled) return;
        if (data.type === 'progress') onProgress?.(data.progress);
        else if (data.type === 'result') finish(null, { ...data.result, mask: new Uint8ClampedArray(data.result.mask), model: FLOOR_MODEL });
        else if (data.type === 'error') {
          console.error('[LRF Photo Studio] Local model failure:', data.detail ?? data.message);
          stopWorker();
          finish(analysisError(data.message, data.detail));
        }
      };
      worker.onerror = (event) => {
        event.preventDefault?.();
        const detail = `${event.message || 'Worker entry could not load'} (${event.filename || 'segmentation-worker.mjs'}:${event.lineno || 0}:${event.colno || 0})`;
        console.error('[LRF Photo Studio] Worker start failure:', detail);
        stopWorker();
        finish(analysisError('Le moteur d’analyse locale n’a pas pu démarrer. Vérifiez la connexion, puis réessayez ou tracez le sol.', detail));
      };
      // Transfer a copy: the original photo remains owned by the editor.
      const data = new Uint8ClampedArray(imageData.data);
      worker.postMessage({ type: 'analyze', id, width: imageData.width, height: imageData.height, data: data.buffer }, [data.buffer]);
    } catch (error) { stopWorker(); finish(error); }
  });
}

export const analyzeFloor = analyze;
export function disposeSegmentation() { active?.cancel(); stopWorker(); }
