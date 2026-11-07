/** Local, abortable panoptic floor segmentation. Photos never leave this device. */
export const FLOOR_MODEL = Object.freeze({
  id: 'Xenova/detr-resnet-50-panoptic',
  revision: 'ea24b2d4e0bfae31f0a1299ba3fb892a2df064de',
  license: 'Apache-2.0',
  bytes: 44270443,
  runtime: '@huggingface/transformers@3.8.1',
  compression: 'weight-only-q8-v1; floating-point activations',
  sha256: 'f37d9a5f5c9a3e3b98024ca8617d8435551afd8b7ab4ede935b525547d8f43f4',
  floorLabels: ['floor-wood', 'floor-other-merged'],
  refinement: Object.freeze({id:'Xenova/slimsam-77-uniform',revision:'5850ab45f587c112167512ffef949107115e26a0',bytes:13785975,license:'Apache-2.0'}),
});

let worker;
let active;
let sequence = 0;
let idleTimer,memoryChannel;
// Version the worker entry independently from photo/project URLs. A cached 404
// during a preview rebuild must not pin subsequent analyses to a broken entry.
const WORKER_VERSION = '20261107-detail-4';
const abortError = () => new DOMException('Analyse annulée.', 'AbortError');
const diagnosticsEnabled = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('ps-diagnostic');
function analysisError(message, detail) {
  const suffix = diagnosticsEnabled() && detail ? ` [Diagnostic : ${String(detail).slice(0, 400)}]` : '';
  const error = new Error(message + suffix);
  error.cause = detail;
  return error;
}

function stopWorker() {
  clearTimeout(idleTimer);
  worker?.terminate();
  worker = undefined;
}
function releaseWhenIdle(){
  clearTimeout(idleTimer);
  if(typeof document!=='undefined'&&document.hidden){stopWorker();return;}
  idleTimer=setTimeout(()=>{if(!active)stopWorker();},45000);
  idleTimer?.unref?.();
}
function announceMemoryLease(){
  if(typeof window==='undefined'||typeof BroadcastChannel==='undefined')return;
  memoryChannel??=new BroadcastChannel('lrf-photo-studio-model-memory');
  memoryChannel.onmessage=()=>{if(!active)stopWorker();};
  memoryChannel.postMessage('release-idle-model');
}
async function withMemoryLease(image,options){
  const execute=()=>{announceMemoryLease();return run(image,options);};
  // Serialize expensive analyses across tabs of the same origin as well as
  // within this editor. Other idle editors release their large WASM heaps.
  if(typeof navigator!=='undefined'&&navigator.locks?.request){
    options.onProgress?.({stage:'waiting',message:'Préparation de l’analyse de cette photo…',progress:null});
    return navigator.locks.request('lrf-photo-studio-inference',{signal:options.signal},execute);
  }
  return execute();
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden&&!active)stopWorker();});

/**
 * @param {ImageData|{data:Uint8ClampedArray,width:number,height:number}} imageData
 * @param {{signal?:AbortSignal,onProgress?:(event:object)=>void,timeoutMs?:number}} options
 * @returns {Promise<{mask:Uint8ClampedArray,width:number,height:number,confidence:number,coverage:number,warning:string|null,timings:object,model:object}>}
 */
function run(imageData, { signal, onProgress, timeoutMs = 180000, type='analyze',point } = {}) {
  clearTimeout(idleTimer);
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
      releaseWhenIdle();
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
        else if (data.type === 'result') {
          if(diagnosticsEnabled()&&data.result.detail)console.info('[LRF Photo Studio] Detail:',JSON.stringify({...data.result.detail,timings:data.result.timings}));
          finish(null, { ...data.result, mask: new Uint8ClampedArray(data.result.mask), model: FLOOR_MODEL });
        }
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
      worker.postMessage({ type, point, id, width: imageData.width, height: imageData.height, data: data.buffer }, [data.buffer]);
    } catch (error) { stopWorker(); finish(error); }
  });
}

export function analyze(imageData,options={}){return withMemoryLease(imageData,options);}
export const analyzeFloor = analyze;
export function protectObject(imageData,point,options={}){
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return Promise.reject(new Error('Touchez le meuble ou le tapis à préserver.'));
  return withMemoryLease(imageData,{...options,point,type:'protect-object'});
}
export function disposeSegmentation() { active?.cancel(); stopWorker(); }
