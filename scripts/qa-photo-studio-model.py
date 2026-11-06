"""Optional native CPU parity check for the pinned browser segmentation model.

Usage: python scripts/qa-photo-studio-model.py --model model_quantized.onnx
         --images /absolute/path/qa-photos --output /absolute/path/model-results
Requires Pillow, numpy and onnxruntime (tested 1.22.0). Does not upload images.
Browser/WASM and physical-device acceptance remain separate requirements.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

PINNED_SHA256 = '93abfec8b8abd77329f203726b231ee5e5d4c2d52c881a74ab1c1134d888c41d'
FLOOR_IDS = {118, 190}


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
    logits = logits[0]
    exponentials = np.exp(logits - logits.max(-1, keepdims=True))
    probabilities = exponentials / exponentials.sum(-1, keepdims=True)
    labels, scores = probabilities.argmax(-1), probabilities.max(-1)
    keep = (labels != 250) & (scores > .6)
    labels, scores = labels[keep], scores[keep]
    mask_probabilities = 1 / (1 + np.exp(-masks[0][keep]))
    resized = [np.asarray(Image.fromarray(mask).resize(working.size, Image.Resampling.BILINEAR)) * score
               for mask, score in zip(mask_probabilities, scores)]
    floor = np.zeros((working.height, working.width), np.uint8)
    floor_scores = []
    if resized:
        weighted = np.stack(resized)
        winner = weighted.argmax(0)
        for index, (label, score, mask) in enumerate(zip(labels, scores, weighted)):
            area = winner == index
            original_area = (mask >= .5).sum()
            if original_area and area.sum() / original_area > .5 and label in FLOOR_IDS:
                floor[area] = 255
                floor_scores.append({'id': int(label), 'score': round(float(score), 4), 'pixels': int(area.sum())})
    display = np.asarray(working).copy()
    display[floor > 0] = display[floor > 0] * .5 + np.array([12, 175, 110]) * .5
    return {'image': image.name, 'original': [width, height], 'working': list(working.size),
            'inferenceMs': compute_ms, 'coverage': round(float((floor > 0).mean()), 4),
            'floorSegments': floor_scores}, Image.fromarray(floor), Image.fromarray(display)


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
        if 'sheet' in path.name:
            continue
        result, mask, overlay = run(args.model, path, session)
        results.append(result)
        mask.save(args.output / (path.stem + '-mask.png'))
        overlay.save(args.output / (path.stem + '-review.jpg'), quality=90)
        print(json.dumps(result))
    report = {'modelSha256': digest, 'modelBytes': args.model.stat().st_size,
              'runtime': 'onnxruntime ' + ort.__version__, 'backend': 'native CPU, one thread (not browser WASM)',
              'inputNames': [i.name for i in session.get_inputs()], 'results': results}
    (args.output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
