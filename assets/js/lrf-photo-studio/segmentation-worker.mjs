import { conservativeFloorMask } from './segmentation-mask.mjs?v=20261107-detail-4';
import { detailPrompts, chooseDetailMask, chooseObjectMask, subtractObject } from './segmentation-detail.mjs';
// Runtime and model are versioned, same-origin assets. No image leaves this device.
self.postMessage({ type: 'boot', version: '20261107-detail-4', moduleUrl: import.meta.url });
const VENDOR = new URL('../../vendor/lrf-photo-studio/', import.meta.url);
const RUNTIME = new URL('runtime-3.8.1/transformers.min.js', VENDOR).href;
const MODEL_ID = 'detr-resnet-50-panoptic-ea24b2d-woq8-v1';
const REVISION = 'ea24b2d4e0bfae31f0a1299ba3fb892a2df064de';
const FLOOR_IDS = [118, 190];
let library;
let segmenter;
let currentId;
const THREADS=self.crossOriginIsolated&&typeof SharedArrayBuffer!=='undefined'?Math.min(2,Math.max(1,Math.floor((self.navigator?.hardwareConcurrency||2)/2))):1;
let detailModel, detailProcessor, detailImage, jobs=Promise.resolve();
const DETAIL_ID='slimsam-77-5850ab4-q8-v1';
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

async function load(needDetector=true) {
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
    // Use a bounded thread pool only in an isolated document; ordinary hosts and Safari retain one thread.
    // Weight-only compression retains float activations and original operators.
    // WASM is a consistent fallback across browsers; WebGPU is not required.
    library.env.backends.onnx.wasm.numThreads = THREADS;
    library.env.backends.onnx.wasm.proxy = false;
    library.env.backends.onnx.wasm.wasmPaths = new URL('runtime-3.8.1/', VENDOR).href;
  }
  if (needDetector&&!segmenter) {
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

function disposeTensors(value){for(const tensor of Object.values(value||{}))if(tensor?.dispose)tensor.dispose();}
function samePixels(a,b){if(a?.length!==b?.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
async function prepareDetail(data,width,height){
 if(detailImage?.width===width&&detailImage?.height===height&&samePixels(detailImage.source,data))return detailImage;
 disposeTensors(detailImage?.embeddings);detailImage=null;
 const started=performance.now();
 if(!detailModel){
  progress({stage:'download',message:'Chargement du détourage précis (13,8 Mo au premier usage)…',progress:null});
  // The official processor handles normalized zero padding and image coordinates.
  // The Apache-2.0 model is separate from the semantic floor detector.
  detailProcessor=await library.AutoProcessor.from_pretrained(DETAIL_ID);
  detailModel=await library.SamModel.from_pretrained(DETAIL_ID,{device:'wasm',dtype:'q8',progress_callback:event=>{if(event.status==='progress')progress({stage:'download',message:'Chargement du détourage précis (13,8 Mo au premier usage)…',progress:event.progress});}});
 }
 progress({stage:'detail',message:'Détourage précis des meubles et du tapis…',progress:null});
 const inputs=await detailProcessor(new library.RawImage(data,width,height,4));
 let embeddings;try{embeddings=await detailModel.get_image_embeddings(inputs);}finally{inputs.pixel_values?.dispose?.();}
 detailImage={source:data,width,height,embeddings,original_sizes:inputs.original_sizes,reshaped_input_sizes:inputs.reshaped_input_sizes,encodeMs:performance.now()-started};
 return detailImage;
}
async function predictDetail(context,points,labels){
 const [rh,rw]=context.reshaped_input_sizes[0],n=points.length;
 const coords=Float32Array.from(points.flatMap(p=>[p[0]*rw/context.width,p[1]*rh/context.height]));
 const input_points=new library.Tensor('float32',coords,[1,1,n,2]),input_labels=new library.Tensor('int64',BigInt64Array.from(labels,BigInt),[1,1,n]);
 let outputs;
 try{
  outputs=await detailModel({...context.embeddings,input_points,input_labels});
  const decoded=await detailProcessor.post_process_masks(outputs.pred_masks,context.original_sizes,context.reshaped_input_sizes,{binarize:false});
  const tensor=decoded[0],size=context.width*context.height;
  const result={data:new Float32Array(tensor.data),count:tensor.data.length/size,scores:Array.from(outputs.iou_scores.data)};
  tensor.dispose?.();return result;
 }finally{input_points.dispose?.();input_labels.dispose?.();outputs?.pred_masks?.dispose?.();outputs?.iou_scores?.dispose?.();}
}
async function processJob(job){
  if (!['analyze','protect-object'].includes(job.type)) return;
  currentId = job.id;
  try {
    const downloadMs = await load(job.type==='analyze');
    const source=new Uint8ClampedArray(job.data);
    if(job.type==='protect-object'){
      // Semantic inference is unnecessary for a user explicitly selecting an object.
      const context=await prepareDetail(source,job.width,job.height),point=[Math.max(0,Math.min(job.width-1,job.point.x)),Math.max(0,Math.min(job.height-1,job.point.y))];
      const result=await predictDetail(context,[point],[1]),chosen=chooseObjectMask({...result,width:job.width,height:job.height,point});
      if(!chosen)throw Error('Aucun objet isolé autour de ce point. Utilisez le pinceau Retirer.');
      const mask=chosen.mask;
      self.postMessage({type:'result',id:job.id,result:{mask:mask.buffer,width:job.width,height:job.height,quality:chosen.quality}},[mask.buffer]);return;
    }
    const small = smallImage(source, job.width, job.height);
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
    const { mask: smallMask, confidence, postprocess } = proposal;
    const labels = proposal.labelIds.map(id => segmenter.model.config.id2label[id]);
    disposeTensors(inputs);disposeTensors(outputs);
    // Release the detector before allocating the 1024 px refinement encoder.
    await segmenter.dispose();segmenter=undefined;
    let mask=upscaleMask(smallMask,small.width,small.height,job.width,job.height),detail={accepted:false,reason:'no-floor'},detailMs=0;
    if(proposal.coverage>=.005){
      const detailStart=performance.now();
      try{
        const prompts=detailPrompts(smallMask,small.width,small.height);
        if(prompts.points.length){
          const points=prompts.points.map(p=>[p[0]*job.width/small.width,p[1]*job.height/small.height]);
          const context=await prepareDetail(source,job.width,job.height),prediction=await predictDetail(context,points,prompts.labels);
          const refined=chooseDetailMask({...prediction,width:job.width,height:job.height,coarse:mask,points,labels:prompts.labels,protectedMask:upscaleMask(proposal.protectedMask,small.width,small.height,job.width,job.height)});
          mask=refined.mask;detail={...refined,mask:undefined,model:'Xenova/slimsam-77-uniform',points:points.length,encodeMs:Math.round(context.encodeMs),objectsRecognized:proposal.protectedObjects?.length||0,objectsProtected:0};
          // Independently segment recognized foreground objects. A floor mask
          // alone can leave false islands on a sofa arm or around a chair.
          for(const object of proposal.protectedObjects||[]){
            progress({stage:'detail',message:'Protection des meubles et des pieds de chaise…',progress:null});
            const point=[object.point[0]*job.width/small.width,object.point[1]*job.height/small.height];
            const bounds={minX:object.bounds.minX*job.width/small.width,maxX:object.bounds.maxX*job.width/small.width,minY:object.bounds.minY*job.height/small.height,maxY:object.bounds.maxY*job.height/small.height};
            const negatives=points.filter((p,i)=>prompts.labels[i]===1&&(p[0]<bounds.minX||p[0]>bounds.maxX||p[1]<bounds.minY||p[1]>bounds.maxY)).slice(0,3);
            try{
              const predicted=await predictDetail(context,[point,...negatives],[1,...negatives.map(()=>0)]);
              const protectedObject=chooseObjectMask({...predicted,width:job.width,height:job.height,point,bounds});
              if(protectedObject){mask=subtractObject(mask,protectedObject.mask);detail.objectsProtected++;}
            }catch{/* Retain the confirmed floor and other protected objects. */}
          }
        }
      }catch(error){detail={accepted:false,reason:'detail-unavailable',message:String(error?.message||error).slice(0,300)};}
      detailMs=performance.now()-detailStart;
    }
    const coverage=mask.reduce((sum,v)=>sum+(v>127?1:0),0)/mask.length;
    const warning = coverage < .005
      ? 'Aucun sol suffisamment visible n’a été reconnu. Tracez la zone manuellement.'
      : confidence < .75 || coverage < .025
        ? 'Le sol est peu visible ou incertain. Vérifiez et corrigez la zone proposée.'
        : detail.accepted?'Le sol et ses contours sont proposés. Vérifiez les pieds de chaise et le tapis avant de confirmer.':'La détection du sol est proposée. Le détourage précis reste à vérifier ; corrigez les meubles ou tapis au besoin.';
    const inferenceMs = performance.now() - started;
    self.postMessage({ type: 'result', id: job.id, result: {
      mask: mask.buffer, width: job.width, height: job.height, coverage, confidence, warning, labels, postprocess,detail,
      timings: { downloadMs: Math.round(downloadMs), inferenceMs: Math.round(inferenceMs), detailMs:Math.round(detailMs), workingWidth: small.width, workingHeight: small.height, backend: 'wasm', threads: library.env.backends.onnx.wasm.numThreads },
    } }, [mask.buffer]);
  } catch (error) {
    // Discard an interrupted/failed constructor so retry remains possible.
    if (!segmenter) segmenter = undefined;
    self.postMessage({ type: 'error', id: job.id, message: 'L’analyse locale n’a pas abouti. Vérifiez la connexion pour charger le modèle, puis réessayez ou tracez le sol manuellement.', detail: error?.message ?? String(error) });
  }
}
// Model sessions and cached embeddings have a single owner, including rapid taps.
self.onmessage=({data:job})=>{jobs=jobs.then(()=>processJob(job)).catch(error=>uncaughtFailure(error?.message||error));};
