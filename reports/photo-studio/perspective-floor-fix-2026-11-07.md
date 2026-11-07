# Photo Studio: floor perspective correction — 7 November 2026

## Problem

The mask silhouette was used to initialise the texture projection. An almost rectangular floor selection produced an almost front-facing texture, irrespective of the floor directions in the photo. Portrait photos also need pixel-space camera geometry when determining the aspect of a floor reference rectangle.

## Changes

- Separate floor segmentation from floor geometry. Analyse supported line families in the source photo; uncertain results require guided placement of four floor reference points.
- Show the original photo, a projected grid and large numbered handles during alignment. The initial manual rectangle must have all four points placed before acceptance. Preserve the validated plane when changing the tile or correcting a contour.
- Infer the reference rectangle aspect in photo pixels. Keep apparent size indicative until the user enters measured dimensions. A camera-height prior supplies initial scale; it is not a room measurement.
- Reject reference planes whose horizon cuts through the selected visible floor.
- Orient rectangular landscape product faces along the floor depth by default, retain their physical aspect, bilinearly sample faces and integrate thin grout lines to reduce distant aliasing.
- Refine mask edges using source-photo colours and retain finer regional illumination. Manual mask correction is still available for segmentation errors.
- Save perspective version 2 and its review state. Older projects retain their exact product but must review their floor alignment before rendering.

## Validation

- 66 automated tests pass: `node --test tests/photo-studio*.test.mjs tests/photo-studio/*.test.mjs`.
- Added tests for pixel-space metric geometry, finite camera vanishing points, patch-size-independent apparent scale, conservative fallback, supported line convergence, source-guided mask edges, horizon coverage and subpixel grout.
- Syntax checks and `git diff --check` pass. Public-site build succeeds (6,529 files); model and WASM integrity checks succeed.
- Browser test: imported the existing public terrace image, ran actual local segmentation, aligned a reference patch, applied Slate Flame, saved and resumed the same plane/product. Also checked a 390 px mobile viewport.
- Browser export: decoded the resulting JPEG at 2,000 × 1,333 px, 799,342 bytes.
- Browser test on the user's living room: cropped only the original room image from the previously supplied screenshot `1000062286.jpg` (416 × 741 px), ran actual local segmentation, manually placed the four reference points along the parquet directions, and applied Slate Flame 60 × 120. Confirmed convergence, full selected-floor coverage and retained furniture/rug. This validates the captured room image, not an unavailable full-resolution original.
- Room photos, cropped captures, screenshots, QA harnesses and generated exports are not included in the repository or deployment.

## Limits and release scope

Four-point alignment is required when line evidence is uncertain; automatic perspective is not guaranteed for every room. A single uncalibrated photo cannot establish exact tile size. Fine object contours and source texture resolution remain limits of the current local renderer.

Prepared on the Photo Studio preview branch only. No production publication is included in this change.
