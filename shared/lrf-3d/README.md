# LE ROY FACTORY · Shared 3D core

Studio One and Catalogue Général keep their own furniture, prices, configuration flows and room adapters. Their `src/` compatibility modules re-export this shared implementation so existing imports and saved-project entry points stay valid.

The first extraction recorded 30 previously byte-identical modules. `extraction-provenance.json` preserves their original source hashes and baseline commits; the polygon-clipping licence remains alongside its implementation. Modules that imported different room/furniture/catalogue adapters were excluded from that mechanical extraction. Any later harmonisation has its own tests rather than an unchanged-source claim. Of those 30 extracted modules, 29 remain byte-identical. `integrated-basins.js` has a documented comment-only confidentiality cleanup: its original hash is retained, while `current` records the sanitized source hash, reason, and equal original/current executable hashes. Public TTC prices and catalogue references are unchanged.

`performance.js` uses the existing Studio policy for both applications: automatic phone rendering stops at the mobile Standard budget, while manual Ultra and final HD capture remain available. `texture-budget.js` gives working textures common 512/1024/4096 limits, bounded by the GPU. These are in-memory derivatives; manufacturer originals, native dimensions and saved material references are preserved.

Room interaction is also shared. The plan editor combines Studio's draggable wall edges and consecutive partition drawing with the same dimensions, opening controls and cancellation rules in both applications. Renovation combines General's collision-aware tile-band placement and position controls with Studio's initialized lock icon and lock styles. Furniture disposal and decorative-surface adapters remain injected by each application.

`room.js` owns geometry, openings, partition footprints, niches and plinth-range validation. The small General adapter retains its existing daylight shadow reception; Studio retains its existing anti-acne policy. These rendering flags do not alter shapes, dimensions or quantities. The General occlusion ceiling remains hidden outside its explicit shadow capture, and transparent window panes do not cast opaque shadows in either application.

Run `npm run check:core` from the suite root after installing dependencies. The checks prove that both compatibility paths expose the same implementation identities, validate the 29 unchanged extraction hashes and the documented sanitized-source/executable hashes, exercise mobile/desktop quality transitions and compare the two actual esbuild dependency graphs. The room checks compare floor, partition, niche and opening geometry and exercise cold-start locking through both renovation adapters. The original room acceptance cases also run against each application's actual adapter and HTML. These checks complement the geometry, quantity, interaction and HD-capture suites; they do not certify WebGL output on real devices.

Shared implementation changes affect both 3D builds. Build and validate both applications before releasing a shared-core change. Keep project-schema and catalogue versions compatible during rollback; do not restore a historical public artifact containing private purchase prices.

### Quercia mobile texture policy (25 October 2026)

Verified reference-specific native faces use existing manufacturer derivatives:
four distinct faces in fluid, six in balanced, and eight in mobile manual max.
The subset is deterministic and spread across the exact SKU's native face list.
VIEW, legacy colour previews and continuous Allure drawings keep their existing
selection. Explicit HD capture loads the complete max list for the exact reference
and restores the bounded working set afterwards. The 118 Quercia faces, 354 URLs,
original files, ICC conversion, commercial references and catalogue manifests are
unchanged; no new texture or format fallback was introduced.

The shared queue owns download, decode and proportional resampling, with at most
three tasks active. A superseded room source removes its queued tasks, aborts its
in-flight fetches, and disposes partially decoded or stale results. A timeout also
aborts the underlying request. Sources still used by another wall, niche, tile
colour or apron remain active. This prevents rapid colour selection from keeping
many obsolete complete native sets alive on a phone.

Regression coverage: `tests/lrf-texture-memory.test.mjs`,
`studio-one/qa/surface-texture-reference-check.mjs`, both applications' existing
reference/capture checks, and `tests/lrf-quercia-mobile.browser.mjs`. The shared
files changed for this correction were added after the original extraction and
are not entries in `extraction-provenance.json`; the historical extracted-module
hashes and existing functional-change entries remain untouched.
