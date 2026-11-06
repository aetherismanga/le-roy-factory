import test from 'node:test';
import assert from 'node:assert/strict';
import { conservativeFloorMask, largestComponent, selectComponents, FLOOR_POSTPROCESS } from '../../assets/js/lrf-photo-studio/segmentation-mask.mjs';

const logit = p => Math.log(p / (1 - p));
function tensorFixture(probabilities, { width, height, floorClass = 1 } = {}) {
  const logits = new Float32Array(probabilities.length * 4).fill(-6);
  probabilities.forEach((_, i) => { logits[i * 4 + (i === 0 ? floorClass : 0)] = 6; });
  return {
    logits: { data: logits, dims: [1, probabilities.length, 4] },
    masks: { data: Float32Array.from(probabilities.flatMap(values => values.map(logit))), dims: [1, probabilities.length, height, width] },
    width, height, floorIds: [1],
  };
}

test('floor competition excludes furniture and low-probability extrapolation; components never bridge gaps', () => {
  const floor = [...Array(6).fill(.01), ...Array(12).fill(.8)];
  const furniture = Array(18).fill(.001); furniture[8] = furniture[14] = .99;
  const result = conservativeFloorMask(tensorFixture([floor, furniture], { width: 6, height: 3 }));
  assert.deepEqual([...result.mask], [0, 0, 0, 0, 0, 0, 255, 255, 0, 255, 255, 255, 255, 255, 0, 255, 255, 255]);
  assert.equal(result.postprocess.candidatePixels, 10);
  assert.equal(result.postprocess.keptPixels, 10);
  assert.equal(result.postprocess.componentCount, 2);
  assert.equal(result.postprocess.discardedPixels, 0);
  assert.equal(result.postprocess.keptComponentCount, 2);
  assert.equal(result.coverage, 10 / 18);
  assert.ok(result.confidence > .99);
  assert.equal(result.postprocess.pixelProbabilityThreshold, .05);
});

test('no floor label, rejected confidence and no-object results stay empty', () => {
  const input = tensorFixture([Array(6).fill(.9)], { width: 3, height: 2, floorClass: 0 });
  assert.equal(conservativeFloorMask(input).coverage, 0);
  input.logits.data.fill(0);
  assert.equal(conservativeFloorMask(input).coverage, 0);
  input.logits.data[3] = 20;
  assert.equal(conservativeFloorMask(input).coverage, 0);
});

test('mask resizing preserves pixel alignment and dimensions without a guessed floor polygon', () => {
  const input = tensorFixture([[.01, .99]], { width: 2, height: 1 });
  input.width = 4;
  const result = conservativeFloorMask(input);
  assert.deepEqual([...result.mask], [0, 255, 255, 255]);
  assert.equal(result.width, 4);
  assert.equal(result.height, 1);
});

test('largest components use four-neighbor adjacency and stable ties', () => {
  const input = Uint8ClampedArray.from([255, 0, 0, 255]);
  const result = largestComponent(input, 2, 2);
  assert.deepEqual([...result.mask], [255, 0, 0, 0]);
  assert.equal(result.componentCount, 2);
  assert.deepEqual([...input], [255, 0, 0, 255]);
});

test('significant components keep floor islands around furniture and discard small detached noise', () => {
  const input = Uint8ClampedArray.from([255, 255, 0, 255, 0, 0, 0, 0, 255, 255, 255, 0]);
  const result = selectComponents(input, 4, 3, { minimumPixels: 2 });
  assert.deepEqual([...result.mask], [255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0]);
  assert.equal(result.pixels, 5);
  assert.equal(result.componentCount, 3);
  assert.equal(result.keptComponentCount, 2);
});

test('a tiny isolated floor prediction leaves an empty mask for guided manual tracing', () => {
  const probabilities = Array(400).fill(.001);
  probabilities[250] = .9;
  const result = conservativeFloorMask(tensorFixture([probabilities], { width: 20, height: 20 }));
  assert.equal(result.coverage, 0);
  assert.equal(result.confidence, 0);
  assert.equal(result.mask.some(Boolean), false);
  assert.equal(result.postprocess.candidatePixels, 1);
  assert.equal(result.postprocess.keptPixels, 0);
});

test('high-confidence rug masks override overlapping floor; low-confidence rugs do not erase floor', () => {
  function rugFixture(confidence) {
    const classes = 202, logits = new Float32Array(2 * classes).fill(-20);
    logits[118] = 20;
    logits[classes + 200] = Math.log(confidence / (1 - confidence));
    logits[classes + 201] = 0;
    const input = tensorFixture([Array(6).fill(.95), [.01, .9, .01, .01, .9, .01]], { width: 3, height: 2 });
    input.logits = { data: logits, dims: [1, 2, classes] };
    input.floorIds = [118, 190];
    return input;
  }
  const protectedResult = conservativeFloorMask(rugFixture(.9));
  assert.deepEqual([...protectedResult.mask], [255, 0, 255, 255, 0, 255]);
  assert.equal(protectedResult.postprocess.protectedRugPixels, 2);
  assert.equal(protectedResult.postprocess.keptComponentCount, 2);
  const uncertain = conservativeFloorMask(rugFixture(.7));
  assert.deepEqual([...uncertain.mask], Array(6).fill(255));
  assert.equal(uncertain.postprocess.protectedRugPixels, 0);
});

test('corrupt model outputs reject before processing and thresholds are immutable', () => {
  assert.throws(() => conservativeFloorMask({}), /Invalid DETR/);
  const input = tensorFixture([[.9]], { width: 1, height: 1 });
  input.masks.dims[1] = 2;
  assert.throws(() => conservativeFloorMask(input), /Invalid DETR/);
  assert.equal(Object.isFrozen(FLOOR_POSTPROCESS), true);
});
