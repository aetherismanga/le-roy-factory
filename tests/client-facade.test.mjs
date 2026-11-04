import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFacadeDraft, facadeDimensions, facadeFromClient, safeFacadeUrl,
  validateFacadeFile, FACADE_MAX_BYTES, FACADE_MAX_INPUT_BYTES
} from '../assets/js/client-facade-core.mjs';

const photo = { type: 'image/jpeg', size: 230000 };
const result = { url: 'https://firebasestorage.googleapis.com/v0/b/example/o/facade.jpg?alt=media&token=test', path: 'client-documents/a/facade.jpg' };

test('photo links reject script, data, relative links and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', '/local.jpg', 'http://example.com/photo.jpg', 'https://name:password@example.com/photo.jpg']) assert.equal(safeFacadeUrl(url), '');
  assert.equal(safeFacadeUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  assert.equal(facadeFromClient({ photoFacade: { url: 'javascript:bad' } }), null);
});

test('only supported raster inputs under 25 MB can be decoded', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']) assert.equal(validateFacadeFile({ type, size: 123, name: 'photo' }), true);
  assert.equal(validateFacadeFile({ type: '', name: 'PHOTO.JPG', size: 123 }), true);
  for (const file of [{ type: 'image/svg+xml', name: 'photo.svg', size: 123 }, { type: 'text/html', name: 'photo.jpg', size: 123 }, { type: 'image/jpeg', size: 0 }, { type: 'image/jpeg', size: FACADE_MAX_INPUT_BYTES + 1 }]) assert.throws(() => validateFacadeFile(file));
});

test('landscape, portrait and small images retain their aspect ratio', () => {
  assert.deepEqual(facadeDimensions(6000, 4000), { width: 1600, height: 1067 });
  assert.deepEqual(facadeDimensions(3000, 6000), { width: 800, height: 1600 });
  assert.deepEqual(facadeDimensions(320, 200), { width: 320, height: 200 });
  for (const [width, height] of [[0, 10], [-1, 5], [Infinity, 2], [10000, 10000]]) assert.throws(() => facadeDimensions(width, height));
});

test('opening, viewing or cancelling a client never uploads or changes its saved photo', async () => {
  let calls = 0;
  const draft = createFacadeDraft(() => { calls++; return result; });
  const saved = { photoFacade: result };
  assert.deepEqual(draft.open('a', saved), result);
  assert.deepEqual(await draft.prepareSave(), {});
  draft.select(photo);
  draft.close();
  draft.open('a', saved);
  assert.deepEqual(await draft.prepareSave(), {});
  assert.equal(calls, 0);
  assert.deepEqual(saved.photoFacade, result);
});

test('an upload is attached only to the exact client and reused after a failed form save', async () => {
  const calls = [];
  const draft = createFacadeDraft(async (blob, id) => { calls.push({ blob, id }); return result; });
  draft.open('a', {});
  draft.select(photo);
  await assert.rejects(draft.prepareSave('b'), /identifiée/);
  const patch = await draft.prepareSave('a');
  assert.deepEqual(patch, { photoFacade: result });
  assert.deepEqual(await draft.prepareSave('a'), patch);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, 'a');
  assert.equal(draft.hasChanges(), true);
  draft.saved('a', patch);
  assert.equal(draft.hasChanges(), false);
  assert.deepEqual(await draft.prepareSave('a'), {});
});

test('a new client requires its reserved ID before upload', async () => {
  const calls = [];
  const draft = createFacadeDraft(async (blob, id) => { calls.push(id); return result; });
  draft.open('', {}); draft.select(photo);
  await assert.rejects(draft.prepareSave(), /identifiée/);
  assert.deepEqual(await draft.prepareSave('reserved-id'), { photoFacade: result });
  assert.deepEqual(calls, ['reserved-id']);
});

test('a network failure retains the photo and a retry performs a fresh upload', async () => {
  let calls = 0;
  const draft = createFacadeDraft(async () => { if (++calls === 1) throw new Error('offline'); return result; });
  draft.open('a', {}); draft.select(photo);
  await assert.rejects(draft.prepareSave(), /offline/);
  assert.equal(draft.hasChanges(), true);
  assert.deepEqual(await draft.prepareSave(), { photoFacade: result });
  assert.equal(calls, 2);
});

test('changing clients while decoding discards the previous image', () => {
  const draft = createFacadeDraft(() => result);
  draft.open('a', {});
  const token = draft.token();
  draft.open('b', {});
  assert.equal(draft.select(photo, token), false);
  assert.equal(draft.hasChanges(), false);
});

test('changing clients while uploading cannot attach the old image to the new client', async () => {
  let finish;
  const draft = createFacadeDraft(() => new Promise(resolve => { finish = resolve; }));
  draft.open('a', {}); draft.select(photo);
  const first = draft.prepareSave();
  await Promise.resolve();
  draft.open('b', {});
  finish(result);
  await assert.rejects(first, /fiche ou la photo a changé/);
  assert.deepEqual(await draft.prepareSave(), {});
});

test('switching images while uploading rejects the stale response', async () => {
  let finish;
  const draft = createFacadeDraft(() => new Promise(resolve => { finish = resolve; }));
  draft.open('a', {}); draft.select(photo);
  const first = draft.prepareSave();
  await Promise.resolve();
  draft.select({ ...photo, size: 240000 });
  finish(result);
  await assert.rejects(first, /fiche ou la photo a changé/);
  assert.equal(draft.hasChanges(), true);
});

test('multiple pending saves share one upload, and another client cannot acknowledge it', async () => {
  let finish;
  let calls = 0;
  const draft = createFacadeDraft(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  draft.open('a', {}); draft.select(photo);
  const first = draft.prepareSave(); const second = draft.prepareSave();
  await Promise.resolve(); finish(result);
  assert.deepEqual(await first, await second);
  assert.equal(calls, 1);
  draft.saved('b', { photoFacade: result });
  assert.equal(draft.hasChanges(), true);
});

test('invalid upload responses and uncompressed images are never persisted', async () => {
  const draft = createFacadeDraft(() => ({ url: 'javascript:alert(1)' }));
  draft.open('a', {});
  for (const blob of [{ type: 'image/svg+xml', size: 123 }, { type: 'image/jpeg', size: FACADE_MAX_BYTES + 1 }, { type: 'image/jpeg', size: 0 }]) assert.throws(() => draft.select(blob));
  draft.select(photo);
  await assert.rejects(draft.prepareSave(), /lien de photo valide/);
});
