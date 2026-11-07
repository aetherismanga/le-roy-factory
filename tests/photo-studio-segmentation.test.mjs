import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, disposeSegmentation, FLOOR_MODEL } from '../assets/js/lrf-photo-studio/segmentation.mjs';

class TestWorker {
  static instances = [];
  constructor(url, options) { this.url = url; this.options = options; TestWorker.instances.push(this); }
  postMessage(job, transferred) { this.job = job; this.transferred = transferred; }
  terminate() { this.terminated = true; }
  respond(data) { this.onmessage({ data: { id: this.job.id, ...data } }); }
}
const image = () => ({ width: 2, height: 2, data: new Uint8ClampedArray(16).fill(127) });

test('rejects corrupt inputs and already-aborted requests before starting a worker', async () => {
  globalThis.Worker = TestWorker;
  await assert.rejects(analyze({ width: 2, height: 2, data: new Uint8ClampedArray(2) }), /RGBA/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(analyze(image(), { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(TestWorker.instances.length, 0);
});

test('transfers a copy and returns the exact segmentation, including an empty floor mask', async () => {
  const input = image();
  const pending = analyze(input);
  const worker = TestWorker.instances.at(-1);
  assert.notEqual(worker.job.data, input.data.buffer);
  assert.equal(input.data.byteLength, 16);
  assert.equal(worker.options.type, 'module');
  worker.respond({ type: 'result', result: { width: 2, height: 2, mask: new Uint8ClampedArray(4).buffer, confidence: 0, coverage: 0 } });
  const result = await pending;
  assert.deepEqual([...result.mask], [0, 0, 0, 0]);
  assert.equal(result.model.revision, FLOOR_MODEL.revision);
  disposeSegmentation();
});

test('aborting terminates inference and a late message cannot replace the next result', async () => {
  const controller = new AbortController();
  const first = analyze(image(), { signal: controller.signal });
  const firstFailure = assert.rejects(first, { name: 'AbortError' });
  const obsolete = TestWorker.instances.at(-1);
  controller.abort();
  await firstFailure;
  assert.equal(obsolete.terminated, true);
  const next = analyze(image());
  const current = TestWorker.instances.at(-1);
  obsolete.respond({ type: 'result', result: { mask: new Uint8ClampedArray(4).fill(255).buffer } });
  current.respond({ type: 'result', result: { width: 2, height: 2, mask: new Uint8ClampedArray([0, 255, 0, 0]).buffer } });
  assert.deepEqual([...(await next).mask], [0, 255, 0, 0]);
  disposeSegmentation();
});

test('worker download failure exits loading with a usable manual-fallback error', async () => {
  const result = analyze(image());
  TestWorker.instances.at(-1).respond({ type: 'error', message: 'Chargement impossible : tracez le sol manuellement.' });
  await assert.rejects(result, /manuellement/);
  disposeSegmentation();
  delete globalThis.Worker;
});

test('an unresponsive worker times out and releases its inference resources', async () => {
  globalThis.Worker = TestWorker;
  const pending = analyze(image(), { timeoutMs: 1000 });
  const worker = TestWorker.instances.at(-1);
  await assert.rejects(pending, /trop de temps/);
  assert.equal(worker.terminated, true);
  disposeSegmentation();
  delete globalThis.Worker;
});

// A minimal FIFO Web Locks stand-in. The tests exercise separate module
// instances, as separate Photo Studio tabs would, rather than sharing `active`.
class FifoLocks {
  requests=[];
  waiting=[];
  held=false;
  request(name,options,callback){
    this.requests.push({name,signal:options.signal});
    return new Promise((resolve,reject)=>{
      const job={options,callback,resolve,reject};
      job.cancel=()=>{
        const index=this.waiting.indexOf(job);
        if(index<0)return;
        this.waiting.splice(index,1);reject(new DOMException('Lock request aborted.','AbortError'));
      };
      if(options.signal?.aborted){reject(new DOMException('Lock request aborted.','AbortError'));return;}
      options.signal?.addEventListener('abort',job.cancel,{once:true});
      this.waiting.push(job);this.drain();
    });
  }
  async drain(){
    if(this.held||!this.waiting.length)return;
    this.held=true;const job=this.waiting.shift();
    job.options.signal?.removeEventListener('abort',job.cancel);
    try{job.resolve(await job.callback());}catch(error){job.reject(error);}
    finally{this.held=false;this.drain();}
  }
}

test('cross-tab inference holds one FIFO memory lease and aborts a waiting photo without starting its worker',async()=>{
  const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator'),locks=new FifoLocks(),start=TestWorker.instances.length;
  globalThis.Worker=TestWorker;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks}});
  const firstTab=await import('../assets/js/lrf-photo-studio/segmentation.mjs?test-lock-first');
  const secondTab=await import('../assets/js/lrf-photo-studio/segmentation.mjs?test-lock-second');
  try{
    const first=firstTab.analyze(image());
    const queuedController=new AbortController();
    const queued=secondTab.analyze(image(),{signal:queuedController.signal});
    const queuedFailure=assert.rejects(queued,{name:'AbortError'});
    const third=secondTab.analyze(image());
    assert.equal(TestWorker.instances.length,start+1,'queued editors must not allocate an inference worker');
    assert.equal(locks.requests.length,3);
    assert.equal(new Set(locks.requests.map(request=>request.name)).size,1,'all editors coordinate through the same exclusive lease');
    assert.equal(locks.requests[1].signal,queuedController.signal);
    queuedController.abort();await queuedFailure;
    assert.equal(TestWorker.instances.length,start+1,'aborted waiters do not enter the model');
    TestWorker.instances[start].respond({type:'result',result:{width:2,height:2,mask:new Uint8ClampedArray([255,0,0,0]).buffer}});
    assert.deepEqual([...(await first).mask],[255,0,0,0]);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(TestWorker.instances.length,start+2,'the next live waiter starts after the prior result releases its lease');
    TestWorker.instances[start+1].respond({type:'result',result:{width:2,height:2,mask:new Uint8ClampedArray([0,0,255,0]).buffer}});
    assert.deepEqual([...(await third).mask],[0,0,255,0]);
  }finally{
    firstTab.disposeSegmentation();secondTab.disposeSegmentation();
    if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
    delete globalThis.Worker;
  }
});

test('an idle background editor releases its model worker while preserving its completed mask',async()=>{
  const documentDescriptor=Object.getOwnPropertyDescriptor(globalThis,'document'),listeners=new Map(),page={hidden:false,addEventListener:(name,callback)=>listeners.set(name,callback)};
  globalThis.Worker=TestWorker;
  Object.defineProperty(globalThis,'document',{configurable:true,value:page});
  const editor=await import('../assets/js/lrf-photo-studio/segmentation.mjs?test-background-release');
  try{
    const pending=editor.analyze(image()),worker=TestWorker.instances.at(-1);
    page.hidden=true;listeners.get('visibilitychange')();
    assert.notEqual(worker.terminated,true,'a background transition must not kill an analysis before its result');
    page.hidden=false;
    worker.respond({type:'result',result:{width:2,height:2,mask:new Uint8ClampedArray([0,255,255,0]).buffer}});
    const result=await pending;
    assert.notEqual(worker.terminated,true,'a visible editor keeps its warm model available');
    page.hidden=true;listeners.get('visibilitychange')();
    assert.equal(worker.terminated,true);
    assert.deepEqual([...result.mask],[0,255,255,0],'releasing inference memory must not erase the editor result');
  }finally{
    editor.disposeSegmentation();
    if(documentDescriptor)Object.defineProperty(globalThis,'document',documentDescriptor);else delete globalThis.document;
    delete globalThis.Worker;
  }
});
