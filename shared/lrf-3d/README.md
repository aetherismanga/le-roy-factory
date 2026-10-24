# LE ROY FACTORY · Shared 3D core

Studio One and Catalogue Général keep their own furniture, prices, configuration flows and room adapters. Their `src/` compatibility modules re-export this shared implementation so existing imports and saved-project entry points stay valid.

The first extraction moves 30 previously byte-identical modules without changing their implementations. `extraction-provenance.json` records the exact source hashes and baseline commits; the polygon-clipping licence remains alongside its implementation. Modules that imported different room/furniture/catalogue adapters were excluded from that mechanical extraction. Any later harmonisation has its own tests rather than an unchanged-source claim.

`performance.js` uses the existing Studio policy for both applications: automatic phone rendering stops at the mobile Standard budget, while manual Ultra and final HD capture remain available. `texture-budget.js` gives working textures common 512/1024/4096 limits, bounded by the GPU. These are in-memory derivatives; manufacturer originals, native dimensions and saved material references are preserved.

Room interaction is also shared. The plan editor combines Studio's draggable wall edges and consecutive partition drawing with the same dimensions, opening controls and cancellation rules in both applications. Renovation combines General's collision-aware tile-band placement and position controls with Studio's initialized lock icon and lock styles. Furniture disposal and decorative-surface adapters remain injected by each application.

`room.js` owns geometry, openings, partition footprints, niches and plinth-range validation. The small General adapter retains its existing daylight shadow reception; Studio retains its existing anti-acne policy. These rendering flags do not alter shapes, dimensions or quantities. The General occlusion ceiling remains hidden outside its explicit shadow capture, and transparent window panes do not cast opaque shadows in either application.

Run `npm run check:core` from the suite root after installing dependencies. The checks prove that both compatibility paths expose the same implementation identities, validate the unchanged extraction hashes, exercise mobile/desktop quality transitions and compare the two actual esbuild dependency graphs. The room checks compare floor, partition, niche and opening geometry and exercise cold-start locking through both renovation adapters. The original room acceptance cases also run against each application's actual adapter and HTML. These checks complement the geometry, quantity, interaction and HD-capture suites; they do not certify WebGL output on real devices.

Shared implementation changes affect both 3D builds. Build and validate both applications before releasing a shared-core change. Keep project-schema and catalogue versions compatible during rollback; do not restore a historical public artifact containing private purchase prices.
