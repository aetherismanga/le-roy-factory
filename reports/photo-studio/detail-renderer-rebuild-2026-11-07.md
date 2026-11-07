# Photo Studio: boundary refinement and renderer rebuild

## Problem and implementation

The previous floor proposal could extend onto chair edges and sofa arms. A five-percent per-pixel probability floor was too permissive even when no other panoptic query competed. Rendering also allocated arrays, objects and closures for every floor pixel. Inspection of the original room crop showed that some apparent white protrusions were correctly detected floor in deep shadow: the old illumination clamp flattened these shadows and made the tile look pasted on.

- Require floor probability >= .5, with all-class competition and explicit rug protection retained.
- Follow semantic floor detection with a separately licensed, local SlimSAM-77 refinement. Positive points come from substantial floor interiors; negative points come from object holes. Reject predictions that contradict the semantic region or prompts.
- Independently refine recognized furniture, including chairs, sofas, counters and COCO panoptic cabinet/table classes. Subtract actual predicted object masks, with confidence and extent checks. Never subtract a bounding rectangle.
- Add “Protéger un meuble ou un tapis” for a reversible object selection by touch. Encode a photo once and reuse its embeddings for subsequent selections while the local worker remains available.
- Preserve the validated plane and exact product when recalculating the mask. Disable competing pose/calibration edits while an analysis runs. Recalculation is reversible with Undo and needs no extra confirmation dialog.
- Preserve stronger cast shadows using a finer, support-normalized smoothed luminance field and a wider illumination range, without multiplying by the original floor texture pixel-for-pixel.
- Replace per-pixel CPU allocations with scalar addressing, hashing and bilinear sampling. Preserve original output values, face order, source textures, layout and export definition.
- Add WebGL2 composition with CPU fallback. Before returning GPU output, compare up to 128 sampled pixels with a CPU reference; disable the GPU path after a failed check. Sampling does not prove equality of every pixel.
- Bound model memory: serialize inference across same-origin tabs with Web Locks where available; idle editors release their workers through BroadcastChannel; release workers when hidden and idle or after 45 seconds without inference. The thread pool is capped at two in isolated contexts. Analysis remains abortable.
- Use at most two WASM threads in an isolated document, one otherwise. Vercel isolation headers apply only to Photo Studio and its own modules/vendor assets. Pinned model/runtime paths get immutable caching.

## References and reuse

Inspected WebSAM, Virtual-Tile-Visualization-System, Predipta17/floor-tile-visualizer, ahmadramzan9295/Ai-Flooring-Visualizer, and the sanjaybora04 Hugging Face demo. The small Python visualizers either depend on a backend, derive perspective from a mask bounding shape, or lack an explicit code licence. No source code from these projects was copied.

WebSAM's image-embedding/prompt-decoder structure was a useful reference. LRF independently implements it using the official Transformers.js 3.8.1 processor and model API. SlimSAM weights are Apache-2.0, pinned to `5850ab45f587c112167512ffef949107115e26a0`; both ONNX files total 13,785,975 bytes. The complete local model/runtime distribution is 80,633,369 bytes, fetched and SHA-256 verified at build time. Photos never go to a model API.

Primary references:

- https://github.com/Xevion/WebSAM
- https://huggingface.co/Xenova/slimsam-77-uniform
- https://github.com/huggingface/transformers.js/tree/3.8.1/src/models/sam
- https://github.com/cocodataset/panopticapi/blob/master/panoptic_coco_categories.json
- https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html

## Recorded validation

- 96 automated tests pass with the final renderer, model API, prompt gates, memory lease and catalogue contracts. The dedicated public build succeeds and excludes private trees.

- Before the intentional lighting adjustment, the CPU allocation optimization matched the previous renderer byte-for-byte across 30 varied scenarios and 1,285,200 compared bytes. Node mock-canvas warm median at 900 x 1,200: 236 -> 127.1 ms; this is not a mobile measurement.
- In the browser, the captured living-room image with Slate Gold rendered in 49.7 ms after optimization versus 236.6 ms before it. These are individual observations on this cloud browser, not a physical Android benchmark.
- A real six-scene baseline used five existing manufacturer photographs and a wall-only negative crop. All five floor proposals completed; the negative returned zero floor. SlimSAM refinement was accepted in the five positive scenes. The baseline predates the final extension to cabinet/merged-table protection classes; it is not a pixel-accuracy score.
- Baseline single-thread wall times were 15.1–19.4 seconds for positive scenes and 3.7 seconds for the negative. Automatic perspective was established in one of five positive scenes; the others require the existing four-point guide.
- Visual inspection retained chairs, sofas, tables, plants and the terrace furniture. A small omitted floor patch in the contrasted bathroom remains a correction case; the masks are proposals, not ground-truth annotations.
- The living-room test uses the original room area cropped from the user's prior screenshot (416 x 741). No full-resolution camera original was available. Room photos and browser screenshots are not repository fixtures or deployment assets.
- A subsequent concurrent multi-tab stress run stalled the cloud renderer. Obsolete QA tabs were closed, inference serialization and idle worker release were added, and the final candidate is checked with isolated analyses. Do not classify the interrupted concurrent run as a pass.
- WebGL2 is unavailable in the cloud browser. Actual GPU execution and physical Android/iOS validation remain unexecuted; the CPU fallback and reference-comparison safeguards are tested.

## Final lighting check

The final illumination implementation uses a ~12 px grid, one smoothing pass and shadow ratios from .12 to 1.6. The default strength is .85; saved custom strengths remain unchanged. Empty cells containing no selected floor do not inject a bright median into neighboring shadows. The grid is anchored to the working mask dimensions so preview and export retain the same normalized shadow scale. Tests preserve a deep 40/140 cast-shadow contrast and reject pixel-wise transfer of an old checkerboard motif.

- Final browser reprise retained the exact Slate Gold reference, plane, mask and lighting .85. The rendered JPEG blob decoded at 416 x 741 pixels, matching the captured source. Cloud-browser download transfer failed; the in-page image fallback displayed correctly. Physical Android download remains unexecuted.

## Release scope

This change stays on the Photo Studio preview branch. Production, CRM, Facture and the three existing configurators are not published or modified by this release.
