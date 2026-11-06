/** Conservative DETR floor proposal, independent of DOM and model runtime. */
export const FLOOR_POSTPROCESS = Object.freeze({
  objectThreshold: .6,
  maskThreshold: .5,
  overlapThreshold: .5,
  pixelProbabilityThreshold: .05,
  componentConnectivity: 4,
  componentSelection: 'significant-predicted-components',
  minimumComponentCoverage: .001,
  minimumCoverage: .005,
  protectedRugClassId: 200,
  rugConfidenceThreshold: .8,
  rugPixelProbabilityThreshold: .5,
});

/** Keep actual predicted pixels only; never bridge gaps or invent a floor plane. */
export function selectComponents(mask, width, height, { selection = 'significant-predicted-components', minimumPixels = 1 } = {}) {
  if (mask.length !== width * height) throw new Error('Invalid segmentation mask dimensions.');
  const labels = new Uint32Array(mask.length), queue = new Uint32Array(mask.length);
  let componentCount = 0, largestLabel = 0, largestSize = 0;
  const sizes = [0];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    const label = ++componentCount;
    let head = 0, tail = 1;
    queue[0] = start; labels[start] = label;
    const visit = neighbor => {
      if (mask[neighbor] && !labels[neighbor]) { labels[neighbor] = label; queue[tail++] = neighbor; }
    };
    while (head < tail) {
      const index = queue[head++], x = index % width;
      if (x > 0) visit(index - 1);
      if (x + 1 < width) visit(index + 1);
      if (index >= width) visit(index - width);
      if (index + width < mask.length) visit(index + width);
    }
    sizes[label] = tail;
    if (tail > largestSize) { largestSize = tail; largestLabel = label; }
  }
  const result = new Uint8ClampedArray(mask.length);
  const accepted = new Set();
  for (let label = 1; label <= componentCount; label++) if (sizes[label] >= minimumPixels
    && (selection !== 'largest-predicted-component' || label === largestLabel)) accepted.add(label);
  let pixels = 0;
  for (let i = 0; i < result.length; i++) if (accepted.has(labels[i])) { result[i] = 255; pixels++; }
  return { mask: result, componentCount, keptComponentCount: accepted.size, pixels };
}

export function largestComponent(mask, width, height) {
  return selectComponents(mask, width, height, { selection: 'largest-predicted-component' });
}

const sigmoid = value => value >= 0 ? 1 / (1 + Math.exp(-value)) : Math.exp(value) / (1 + Math.exp(value));

/**
 * Reproduce DETR panoptic class/mask competition, then stop low-probability
 * extrapolation and retain significant predicted floor components. Other classes
 * still compete for every pixel, preserving recognized furniture and rugs.
 * @param {{logits:{data:Float32Array,dims:number[]},masks:{data:Float32Array,dims:number[]},width:number,height:number,floorIds?:number[]}} input
 */
export function conservativeFloorMask({ logits, masks, width, height, floorIds = [118, 190], postprocess = {} }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 640 * 640
    || logits?.dims?.length !== 3 || masks?.dims?.length !== 4 || logits.dims[0] !== 1 || masks.dims[0] !== 1
    || ![...logits.dims, ...masks.dims].every(value => Number.isInteger(value) && value > 0 && value < 32768)
    || logits.dims[1] !== masks.dims[1] || logits.data?.length !== logits.dims.reduce((a, b) => a * b, 1)
    || masks.data?.length !== masks.dims.reduce((a, b) => a * b, 1)) throw new Error('Invalid DETR segmentation output.');
  const cfg = { ...FLOOR_POSTPROCESS, ...postprocess }, count = logits.dims[1], classes = logits.dims[2], sourceHeight = masks.dims[2], sourceWidth = masks.dims[3];
  const pixels = width * height, winners = new Int16Array(pixels).fill(-1), bestScores = new Float32Array(pixels), winningProbabilities = new Float32Array(pixels);
  const queries = [], floorSet = new Set(floorIds), protectedRugs = new Uint8Array(pixels);
  const x0 = new Uint16Array(width), x1 = new Uint16Array(width), dx = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const sx = Math.max(0, Math.min(sourceWidth - 1, (x + .5) * sourceWidth / width - .5));
    x0[x] = Math.floor(sx); x1[x] = Math.min(sourceWidth - 1, x0[x] + 1); dx[x] = sx - x0[x];
  }
  for (let query = 0; query < count; query++) {
    const offset = query * classes;
    let maxLogit = -Infinity, label = -1;
    for (let c = 0; c < classes; c++) if (logits.data[offset + c] > maxLogit) { maxLogit = logits.data[offset + c]; label = c; }
    if (label === classes - 1 || label < 0) continue;
    let denominator = 0;
    for (let c = 0; c < classes; c++) denominator += Math.exp(logits.data[offset + c] - maxLogit);
    const score = 1 / denominator;
    if (!(score > cfg.objectThreshold)) continue;
    const values = new Float32Array(sourceWidth * sourceHeight), maskOffset = query * values.length;
    for (let i = 0; i < values.length; i++) values[i] = sigmoid(masks.data[maskOffset + i]);
    const candidate = { query, label, score, originalArea: 0, winningArea: 0 };
    queries[query] = candidate;
    for (let y = 0; y < height; y++) {
      const sy = Math.max(0, Math.min(sourceHeight - 1, (y + .5) * sourceHeight / height - .5)), y0 = Math.floor(sy), y1 = Math.min(sourceHeight - 1, y0 + 1), dy = sy - y0;
      for (let x = 0; x < width; x++) {
        const p = Math.fround((values[y0 * sourceWidth + x0[x]] * (1 - dx[x]) + values[y0 * sourceWidth + x1[x]] * dx[x]) * (1 - dy)
          + (values[y1 * sourceWidth + x0[x]] * (1 - dx[x]) + values[y1 * sourceWidth + x1[x]] * dx[x]) * dy);
        const weighted = Math.fround(p * score), i = y * width + x;
        // A confidently recognized rug remains protected even when a floor
        // query wins overlapping pixels by a slightly higher panoptic score.
        if (label === cfg.protectedRugClassId && score >= cfg.rugConfidenceThreshold
          && p >= cfg.rugPixelProbabilityThreshold) protectedRugs[i] = 1;
        if (weighted >= cfg.maskThreshold) candidate.originalArea++;
        if (weighted > bestScores[i]) { bestScores[i] = weighted; winners[i] = query; winningProbabilities[i] = p; }
      }
    }
  }
  for (const query of winners) if (query >= 0) queries[query].winningArea++;
  const accepted = queries.filter(candidate => candidate && floorSet.has(candidate.label) && candidate.originalArea > 0
    && candidate.winningArea / candidate.originalArea > cfg.overlapThreshold);
  const acceptedIds = new Set(accepted.map(candidate => candidate.query)), proposed = new Uint8ClampedArray(pixels);
  let candidatePixels = 0, protectedRugPixels = 0;
  for (let i = 0; i < pixels; i++) if (acceptedIds.has(winners[i]) && winningProbabilities[i] >= cfg.pixelProbabilityThreshold) {
    if (protectedRugs[i]) { protectedRugPixels++; continue; }
    proposed[i] = 255; candidatePixels++;
  }
  const component = selectComponents(proposed, width, height, {
    selection: cfg.componentSelection, minimumPixels: Math.max(1, Math.ceil(pixels * cfg.minimumComponentCoverage)),
  });
  // A tiny isolated prediction cannot establish that a floor is visible.
  // Leave the mask empty and offer tracing rather than coloring a stray object.
  if (component.pixels / pixels < cfg.minimumCoverage) {
    component.mask.fill(0);
    component.pixels = 0;
    component.keptComponentCount = 0;
  }
  let scoreSum = 0;
  const labels = new Set();
  for (let i = 0; i < pixels; i++) if (component.mask[i]) { const candidate = queries[winners[i]]; scoreSum += candidate.score; labels.add(candidate.label); }
  return {
    mask: component.mask, width, height, coverage: component.pixels / pixels, confidence: component.pixels ? scoreSum / component.pixels : 0,
    labelIds: [...labels], postprocess: { ...cfg, protectedRugPixels, candidatePixels, keptPixels: component.pixels, componentCount: component.componentCount, keptComponentCount: component.keptComponentCount, discardedPixels: candidatePixels - component.pixels },
  };
}
