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
