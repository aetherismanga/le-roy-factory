# Elios decorative materials review — 4 November 2026

The shared canonical catalogue now offers 17 exact Deco decorative references and 19 D_esign Evo references (16 individual subjects and three stock mixes). Existing saved color IDs and unsupported legacy commercial rows are retained. D_esign Evo base colors are limited to the manufacturer's 20×20 format; the separate Outdoor references remain unchanged. The source technical tables specify 30 pieces / 1.20 m² for these 20×20 products. No selling price was invented.

| Material | Public source reviewed | Implemented native preview |
| --- | --- | --- |
| Deco decorations | Individual manufacturer images, 250×250 px | One authentic pattern per exact reference, 250×250 px |
| D_esign Evo individual decorations | Individual manufacturer images, 250×250 px | One authentic subject per exact reference, 250×250 px |
| Palazzo Ducale Mix | Manufacturer composition, 1500×427 px | 14 individual physical tiles, approximately 210×209 px; printed seams excluded |
| Evo Senape / Ciano mixes | Manufacturer compositions, 856×856 px | 16 individual physical tiles each, 210×210 px; printed seams excluded |
| D_esign Evo base colors | Material swatches, 1200×700 px | Centered square crops, 700×700 px |
| Azuli Mood, 11 colors | Material swatches, 1200×700 px | 700×700 px for 10×10; 1200×400 px for 5×15 |
| Glow, 9 usable colors | Material swatches, 1400×700 px | 1400×149 px for 4.8×45 |
| Glow Washington | White public image with black borders | Excluded from new selection and export; original commercial reference preserved |

The 250 px decorative images are limited-definition manufacturer previews, not HD tile stamps. Embedded decoration samples in the public PDFs were also inspected (approximately 105–168 px), and provide no higher native detail. PRO authentication was unsuccessful, so no PRO HD downloads are claimed. Azuli Mood remains visibly soft in some source colors; its exact source pixels and color are retained. Glow and Azuli crops avoid stretching a broad swatch into the physical tile ratio, but are explicitly labeled material-swatch crops rather than original manufacturer tile stamps.

Each of the 31 usable Azuli Mood / Glow references resolves through the existing `textureVariantsByReference` path, preserving exact color, format and SKU. Small decorative faces are accepted by a scoped quality guard only with reviewed official image provenance, source hash, 20×20 reference assignment and validated native crop metadata. The Washington exclusion remains enforced. No global definition threshold was relaxed.

The 179 working WebP derivatives total approximately 10.9 MB. Individual small patterns remain lossless; larger swatch derivatives use quality 95. Profiles are capped at 512 px / 1024 px / native size and never enlarge an image. Obsolete first-pass broad derivatives have been removed. No source was recolored, sharpened, synthesized or upscaled. Source URL, SHA-256, original dimensions, crop bounds, encoding and output dimensions are recorded in `assets/img/lrf-plan-pose/faces/elios-20261104/decor-source-provenance.json`.

Official collection and technical sources:

- https://eliosceramica.com/collezione/deco/
- https://eliosceramica.com/collezione/design-evo/
- https://eliosceramica.com/collezione/azuli-mood/
- https://eliosceramica.com/collezione/glow/
- https://eliosceramica.com/wp-content/uploads/2021/03/Deco.pdf
- https://eliosceramica.com/wp-content/uploads/2021/03/DEsigEvo.pdf
- https://eliosceramica.com/wp-content/uploads/2026/07/ELIOS_CATALOGO_AZULI-MOOD_new.pdf
- https://eliosceramica.com/wp-content/uploads/2024/10/Elios_catalogo_GLOW-1.pdf

Reproduction: `python tools/import-elios-decorative-textures-20261104.py --sources <downloaded-originals-directory>`; the adjacent `*-tiles.json` files provide observed official download URLs. Verification: `node --test tests/elios-decorative-materials-20261104.test.mjs` after the shared contract sync. Tests cover exact references, physical mix faces, source bounds, native dimensions, profile resolution, selection availability and canonical export identity, including negative cases and Washington exclusion.
