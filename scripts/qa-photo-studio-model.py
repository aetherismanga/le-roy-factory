"""Optional native CPU parity check for the pinned browser segmentation model.

Usage: python scripts/qa-photo-studio-model.py --model model_quantized.onnx
         --images /absolute/path/qa-photos --output /absolute/path/model-results
Requires Node.js, Pillow, numpy and onnxruntime (tested 1.22.0). Does not upload images.
Browser/WASM and physical-device acceptance remain separate requirements.
"""
import argparse
import hashlib
import json
import time
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

PINNED_SHA256 = 'f37d9a5f5c9a3e3b98024ca8617d8435551afd8b7ab4ede935b525547d8f43f4'


def run(model, image, session):
    original = Image.open(image).convert('RGB')
    width, height = original.size
    scale = min(384 / min(width, height), 640 / max(width, height))
    working = original.resize((round(width * scale), round(height * scale)), Image.Resampling.BILINEAR)
    values = np.asarray(working, np.float32) / 255
    values = (values - np.array([.485, .456, .406], np.float32)) / np.array([.229, .224, .225], np.float32)
    started = time.perf_counter()
    logits, _, masks = session.run(None, {
        'pixel_values': values.transpose(2, 0, 1)[None],
        'pixel_mask': np.ones((1, 64, 64), np.int64),
    })
    compute_ms = round((time.perf_counter() - started) * 1000)
    # Run the exact pure postprocessor shipped to the browser, without a
    # second inference or a separately maintained Python mask algorithm.
    helper = Path(__file__).resolve().parents[1] / 'assets/js/lrf-photo-studio/segmentation-mask.mjs'
    started_postprocess = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix='lrf-floor-qa-') as temporary:
        directory = Path(temporary)
        logits.astype('float32').tofile(directory / 'logits.f32')
        masks.astype('float32').tofile(directory / 'masks.f32')
        metadata = {'logits': list(logits.shape), 'masks': list(masks.shape),
                    'width': working.width, 'height': working.height}
        (directory / 'metadata.json').write_text(json.dumps(metadata))
        script = r"""
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
const {conservativeFloorMask} = await import(process.argv[1]);
const directory = dirname(process.argv[2]), metadata = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const tensor = (name, dims) => {
  const bytes = readFileSync(join(directory, name + '.f32'));
  return {data: new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), dims};
};
const result = conservativeFloorMask({logits: tensor('logits', metadata.logits), masks: tensor('masks', metadata.masks), width: metadata.width, height: metadata.height});
writeFileSync(join(directory, 'mask.u8'), result.mask);
const {mask, ...metrics} = result;
process.stdout.write(JSON.stringify(metrics));
"""
        completed = subprocess.run(['node', '--input-type=module', '-e', script,
                                    helper.as_uri(), str(directory / 'metadata.json')],
                                   check=True, capture_output=True, text=True)
        proposal = json.loads(completed.stdout)
        floor = np.fromfile(directory / 'mask.u8', np.uint8).reshape(working.height, working.width)
    postprocess_ms = round((time.perf_counter() - started_postprocess) * 1000)
    display = np.asarray(working).copy()
    display[floor > 0] = display[floor > 0] * .5 + np.array([12, 175, 110]) * .5
    return {'image': image.name, 'original': [width, height], 'working': list(working.size),
            'inferenceMs': compute_ms, 'postprocessMs': postprocess_ms,
            'coverage': round(proposal['coverage'], 4), 'confidence': round(proposal['confidence'], 4),
            'floorLabelIds': proposal['labelIds'], 'postprocess': proposal['postprocess']}, Image.fromarray(floor), Image.fromarray(display)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--images', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    digest = hashlib.sha256(args.model.read_bytes()).hexdigest()
    if digest != PINNED_SHA256:
        raise SystemExit('Unexpected model digest; use the exact pinned ONNX weights.')
    options = ort.SessionOptions()
    options.log_severity_level = 3  # Export contains stale fixed output dimensions; actual output is dynamic.
    options.intra_op_num_threads = 1
    session = ort.InferenceSession(str(args.model), options, providers=['CPUExecutionProvider'])
    args.output.mkdir(parents=True, exist_ok=True)
    results = []
    for path in sorted(args.images.glob('*.jpg')):
        if 'sheet' in path.name or path.name == 'corrupt.jpg':
            continue
        result, mask, overlay = run(args.model, path, session)
        results.append(result)
        mask.save(args.output / (path.stem + '-mask.png'))
        overlay.save(args.output / (path.stem + '-review.jpg'), quality=90)
        print(json.dumps(result))
    report = {'modelSha256': digest, 'modelBytes': args.model.stat().st_size,
              'runtime': 'onnxruntime ' + ort.__version__, 'backend': 'native CPU, one thread (not browser WASM)',
              'inputNames': [i.name for i in session.get_inputs()], 'postprocessor': 'exact browser segmentation-mask.mjs through Node.js',
              'compression': 'weight-only-q8-v1; symmetric per-output-channel int8 weights, floating-point activations',
              'sourceModelSha256': 'f41a80cd659d1ae2e4981f2423955d983d28657d747e965ddc980b7768042de1',
              'limitations': 'Native CPU inference, not browser WASM or physical-device performance. Pixel coverage is not annotated accuracy; conservative selection can omit valid floor regions; rugs/fine furniture edges require visual confirmation.',
              'results': results}
    (args.output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
