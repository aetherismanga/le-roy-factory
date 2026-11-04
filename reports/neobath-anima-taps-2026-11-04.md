# Anima — automatic basin mixers, 4 November 2026

Release: `20261104-neobath-anima-studio-one-taps-12`.

## Result

The scoped Studio One adapter exposes basin, XL and wall-mounted Aqua Home mixers before bath/shower choices. It groups models before exact finish/SKU selection and uses canonical manufacturer photographs. Deck mixers install onto a compatible selected or unique basin host, rather than becoming unsupported floating fixtures.

Adding a basin resolves an actual compatible mixer by its real aerator, reach, flange and rim geometry. Raised vessels prefer XL; low/integrated basins prefer standard. Explicit manual selection and no-mixer mode persist. Wall mixers are associated per bowl only when their real outlet reaches that bowl on the same wall at a feasible height. Their rosettes remain at the wall. Installing, moving or removing a wall mixer updates the corresponding deck mixer, custom drilling and MFR66HT quote operation. Mixed wall/deck double basins are supported. A fully equipped host cannot receive a duplicate wall mixer from the catalogue; the existing fixture can be selected to edit.

Custom bores close geometrically when omitted or replaced by a mural installation. Fixed factory-predrilled tops and an Eclisse basin's own pierced ledge retain their source manufacturing holes; the chooser explains that constraint. Bowl/drain/siphon geometry is preserved. Metric material mapping, exact stock furniture dimensions, continuous worktops, previous basin palettes and private project access are retained.

Updates across cabinet and independent worktop hosts use the existing atomic commit with rollback. Linked wall mixers cannot move, preview a move, change or be deleted while their basin host is position-locked. Serialization validates the new installation fields.

## Verification

- Full Anima suite: `node --test --test-concurrency=4 tests/neobath-anima*.test.mjs functions/test/neobath-anima*.test.cjs` — **325 passed, 0 failed**.
- 15 native runtime cases exercise actual model factories, Composition, transformed production handlers, actual aerators, rotated wall, continuous offset, mixed double basin, bore raycasts, MFR restoration, explicit modes, lock guard, atomic rollback, and duplicate prevention.
- Additional pure geometry, policy and native UI callback tests validate real source references and finite installation constraints.
- Browser: production chooser components with production atelier CSS at 300 and 360 px panel widths; automatic/none/mural actions, grouped model selection, finish change and installation callback; no horizontal overflow or overlapping cards. Source photographs load. This browser check is a DOM/menu check, not a claim of GPU visual verification of the full authenticated atelier.
- Private build: 8 decoded assets match release SHA-256; 171 original Studio One source modules recorded in provenance.
- Public site build: 6,538 files; functions/private bundles excluded.
- Original `studio-one`, `randal-general`, `shared/lrf-3d` files unchanged.

Deployment and anonymous endpoint checks are recorded in CI. Access remains Jérôme/Coryne only.
