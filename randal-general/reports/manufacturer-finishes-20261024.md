# RANDAL General — official finish samples, 24 October 2026

The exact manufacturer finish names now use the flat samples supplied by Juan Carlos Segura, matching Studio One's prepared sRGB texture files. Catalog photographs no longer override the new Roble Amazona or Nogal Valentina maps on Aruba. Parametric grooves and all hardware remain unchanged.

| Official sample | Exact General finish references | Source pixels | Mean sRGB |
| --- | ---: | --- | --- |
| Roble Amazona | 3 | 567 × 963 | `#af9374` |
| Nogal Valentina | 5 | 567 × 1229 | `#77513d` |
| Biscuit | 6 | 945 × 2048 | `#ebe2d9` |
| Azul Acero | 5 | 945 × 2048 | `#67757e` |
| Gris Tórtora | 2 | 567 × 1181 | `#807768` |

These 21 references share 20 new WebP files (three quality variants and one swatch per source), totalling 589,698 bytes. The manifest at `dist/assets/finishes/20261022/sources.json` records the actual source hashes, pixel dimensions, prepared files and exact catalogue IDs. It also references the nine existing approved Alba entries at their unchanged `materials/quality` asset paths. Every manifest asset exists locally.

White Bolero and Muted Green have no exact General reference. Other whites, greens and similarly named woods retain their own definitions. The nine Alba definitions and all 46 previously tracked General asset files remain byte-identical to the preceding release.

Embedded ICC profiles are converted to sRGB and EXIF orientation is applied before resizing. Roble's eciRGB v2 profile is respected. Files without an embedded profile are interpreted as sRGB. Textures keep their source aspect ratio and are never enlarged; the fluid, balanced and maximum budgets are 256, 1024 and 2048 pixels on the long side, capped by each original's dimensions. Existing roughness settings are retained because no measured gloss data was supplied.

Fluted Aruba's wood grain remains vertical along its modeled grooves, with an aspect-correct repeat. Other wood fronts use the horizontal orientation shared with Studio One. Side grain remains vertical. Preview and workshop use the same sample maps and color rendering.

## Verification

- All 21 exact mappings, variant precedence, real file sizes, byte hashes, color means, resolution budgets and existing roughness values pass the focused static audit.
- All other finish definitions, nine Alba entries and every non-finish catalogue field remain identical to the preceding release, including models, prices, references, dimensions, columns, basins, mirrors and hardware.
- `npm run check` passes: 292 cabinet combinations, manufacturer joinery and hardware, ceramic basin configurations, material selection, HD capture restoration and native ELIOS reference checks.
- `npm run build` passes.
- Focused Chromium verification passes on desktop (1440 × 900) and mobile (390 × 844): three guided preview changes per device, seven representative finish/model combinations at all three quality levels (42 workshop texture checks), no JavaScript page errors, and no horizontal overflow.
- Both devices export a 1920-pixel-wide image while working in fluid mode, then restore fluid quality and clear capture state.
- All 65 requested new finish assets return HTTP 200 in the two browser runs. Existing shared Studio preload assets were served from their identical local copies for this isolated QA run; unrelated external catalogue photography is outside this texture check.

ELIOS and VIEW source data, textures and selection logic were not modified.
