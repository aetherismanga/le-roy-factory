# Jérôme — avatar de visite Ultra

This asset is a personalized, genuinely skinned 3D model. It is not the photorealistic reference image, and no 2D portrait is used as a billboard.

- Geometry/skeleton: Microsoft Rocketbox (MIT), recovered from the existing RANDAL Studio One shared avatar deployment; 80-bone rig, four existing facial morph targets. UV correspondence reauthored for the generated face atlas; articulated lower legs use dedicated matte charcoal materials. Small chin/beard volume and a short raised scalp silhouette preserve the original rig and facial morph targets. Legacy long hair alpha-card primitives are removed to prevent transparent holes. Original leg topology and vertex positions are preserved to avoid folded knee faces. Shirt triangles remain on their original material across the complete hem; original trouser UV islands and fully lower-leg triangles use independent clothing materials. Named `Jerome_pantalon` and `Jerome_chaussures` mesh primitives use independent matte materials so torso UV islands cannot leak onto clothing or footwear. Runtime preparation clears their albedo/normal maps.
- New head/body albedo maps: image-generated edits of the model UV maps, using the user-approved Jérôme appearance reference. Native output: 1254 × 1254 px. Converted to WebP without upscaling.
- Preserved normal maps: existing Rocketbox-derived 2048 × 2048 maps. The personalized mesh does not use the legacy long hair cards; their opacity map is excluded.
- Face appearance: mature olive skin, dark eyebrows/hair and moustache, dark beard with silver chin, brown eyes.
- Clothing appearance: purple shirt fabric, charcoal trousers fabric, dark shoes.
- This is an interpretation of the reference applied to the existing topology, not a facial scan. It does not establish photographic identity accuracy.
- Runtime animations and material handling are defined by the shared resident controller. Asset target height: 1.65 m.

The MIT notice in LICENSE.txt must accompany distribution. See provenance.json for reproducible file hashes.

Mesh preparation can be reproduced with `python scripts/personalize-jerome-avatar.py /path/to/original/resident-v1.glb`. The source GLB URL and hash are recorded in provenance.json.
